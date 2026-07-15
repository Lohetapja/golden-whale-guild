// Centralized save migration + validation pipeline.
//
// The scene owns runtime state; this module owns the rules for turning an
// arbitrary parsed JSON blob into a shape TownScene.create() can consume without
// crashing. Every step here must be deterministic, null-safe, and additive: a
// migration may fill in defaults or repair a container, but it must never throw
// and must never silently drop unknown fields (forward compatibility).
//
// Design note: field-level normalizers in TownScene/production.js/townEconomy.js
// already tolerate `undefined` (default params) and wrong-typed arrays
// (Array.isArray checks). The gap that produced the black-screen bug was an
// explicit `null` reaching a `normalize(raw = {})` default. This pipeline closes
// that class up front by sanitizing containers before the scene ever touches them.

export const SAVE_VERSION = 13;

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Top-level payload fields that must be plain objects (never null) for the
// loader to spread them safely.
const OBJECT_FIELDS = ['resources', 'upgradeLevels', 'stats', 'heroStats', 'crises', 'areaReputation', 'tutorial'];

// Fields the loader intentionally keeps nullable (null carries meaning, e.g. "no
// pending policy"). Wrong-typed values collapse to null so downstream
// normalizers apply their own defaults; valid null/object pass through.
const NULLABLE_OBJECT_FIELDS = ['pendingPolicy', 'poiCooldowns', 'townInventory', 'tradeSettings',
  'weeklyReport', 'weekTracker', 'monsterState', 'cityBuilder', 'resourceNodes'];

// Fields that must be arrays. A wrong-typed value becomes an empty array.
const ARRAY_FIELDS = ['availableQuests', 'postedQuests', 'unlockedLocations', 'completedObjectives',
  'townLog', 'achievements', 'discoveredPois', 'productionIncidents', 'harvestedForest', 'resourceDeliveries'];

// Repair container types without discarding unknown fields. Idempotent.
function sanitizeContainers(save) {
  const out = { ...save };
  for (const field of OBJECT_FIELDS) {
    if (!isPlainObject(out[field])) out[field] = {};
  }
  for (const field of NULLABLE_OBJECT_FIELDS) {
    if (out[field] !== null && out[field] !== undefined && !isPlainObject(out[field])) {
      out[field] = null;
    }
  }
  for (const field of ARRAY_FIELDS) {
    if (out[field] !== undefined && !Array.isArray(out[field])) out[field] = [];
  }
  return out;
}

// Version-keyed transforms. Key N upgrades a vN save to v(N+1). Historical
// shapes (v1..v9) are already tolerated by field-level normalizers, so no
// destructive rewrites are registered; the sanitize pass below is the effective
// migration. Register real transforms here when a breaking change lands — each
// receives the whole save and returns the upgraded save.
const MIGRATIONS = {
  10: (save) => ({
    ...save,
    resourceDeliveries: Array.isArray(save.resourceDeliveries) ? save.resourceDeliveries : [],
    stats: {
      ...(isPlainObject(save.stats) ? save.stats : {}),
      resourceNodesDiscovered: Number(save.stats?.resourceNodesDiscovered) || 0,
      resourceNodesSurveyed: Number(save.stats?.resourceNodesSurveyed) || 0,
      extractionCampsBuilt: Number(save.stats?.extractionCampsBuilt) || 0,
      extractionWorkersAssigned: Number(save.stats?.extractionWorkersAssigned) || 0,
      resourceDeliveries: Number(save.stats?.resourceDeliveries) || 0,
      resourcesSpent: Number(save.stats?.resourcesSpent) || 0,
    },
  }),
  11: (save) => ({
    ...save,
    monsterState: {
      ...(isPlainObject(save.monsterState) ? save.monsterState : {}),
      activeAttacks: Array.isArray(save.monsterState?.activeAttacks) ? save.monsterState.activeAttacks : [],
      lairs: isPlainObject(save.monsterState?.lairs) ? save.monsterState.lairs : {},
      attackHistory: Array.isArray(save.monsterState?.attackHistory) ? save.monsterState.attackHistory : [],
    },
    heroStats: Object.fromEntries(Object.entries(isPlainObject(save.heroStats) ? save.heroStats : {}).map(([id, stats]) => {
      const safe = isPlainObject(stats) ? stats : {};
      const maxHealth = Math.max(1, Number(safe.maxHealth) || 100);
      return [id, {
        ...safe,
        maxHealth,
        health: Math.max(0, Math.min(maxHealth, Number.isFinite(Number(safe.health)) ? Number(safe.health) : maxHealth)),
      }];
    })),
  }),
  12: (save) => ({
    ...save,
    monsterState: {
      ...(isPlainObject(save.monsterState) ? save.monsterState : {}),
      aftermathDrops: Array.isArray(save.monsterState?.aftermathDrops) ? save.monsterState.aftermathDrops : [],
      aftermathQuests: Array.isArray(save.monsterState?.aftermathQuests) ? save.monsterState.aftermathQuests : [],
    },
  }),
};

// Turn an arbitrary parsed value into a validated, current-version save.
// Returns { ok, data, version, warnings, reason }. `ok:false` means the blob is
// unusable and the caller should route to recovery rather than feed the scene.
export function migrateAndValidate(candidate) {
  if (!isPlainObject(candidate)) {
    return { ok: false, reason: candidate === null ? 'null-save' : `not-an-object:${typeof candidate}` };
  }

  const originalVersion = Number.isFinite(candidate.saveVersion) ? Math.floor(candidate.saveVersion) : 1;
  let data = sanitizeContainers(candidate);
  let version = originalVersion;
  const warnings = [];

  let guard = 0;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (typeof step === 'function') {
      try {
        data = step(data) || data;
      } catch (err) {
        warnings.push(`migration ${version}->${version + 1} failed: ${err?.message || err}`);
      }
    }
    version += 1;
    if (++guard > 100) {
      warnings.push('migration guard tripped; stopping');
      break;
    }
  }

  // Never downgrade a future save; just re-stamp forward migrations.
  data.saveVersion = Math.max(originalVersion, SAVE_VERSION);
  data = sanitizeContainers(data);

  if (originalVersion > SAVE_VERSION) {
    warnings.push(`save is newer (v${originalVersion}) than this build (v${SAVE_VERSION}); loading best-effort`);
  }

  return { ok: true, data, version: data.saveVersion, warnings };
}

// Compact human-readable summary for backup metadata, import previews, and the
// recovery UI. Never throws.
export function summarizeSave(data) {
  const safe = isPlainObject(data) ? data : {};
  const cityBuilder = isPlainObject(safe.cityBuilder) ? safe.cityBuilder : {};
  const buildings = Array.isArray(cityBuilder.placedBuildings) ? cityBuilder.placedBuildings.length : 0;
  const heroes = isPlainObject(safe.heroStats) ? Object.keys(safe.heroStats).length : 0;
  const revealed = Array.isArray(cityBuilder.revealed) ? cityBuilder.revealed.length : 0;
  return {
    saveVersion: Number(safe.saveVersion) || 1,
    day: Number(safe.day) || 1,
    rank: typeof safe.townRankId === 'string' ? safe.townRankId : 'camp',
    stage: typeof safe.townStageId === 'string' ? safe.townStageId : null,
    buildings,
    heroes,
    revealed,
  };
}
