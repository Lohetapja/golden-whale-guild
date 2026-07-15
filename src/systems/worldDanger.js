export const MONSTER_STATES = Object.freeze({
  SPAWNING: 'SPAWNING',
  IDLE: 'IDLE',
  ROAMING: 'ROAMING',
  PATROLLING_LAIR: 'PATROLLING_LAIR',
  INVESTIGATING: 'INVESTIGATING',
  CHASING: 'CHASING',
  ATTACKING: 'ATTACKING',
  FLEEING: 'FLEEING',
  RETURNING_TO_LAIR: 'RETURNING_TO_LAIR',
  INJURED: 'INJURED',
  DYING: 'DYING',
  DEAD: 'DEAD',
});

export const WORLD_DANGER_LIMITS = Object.freeze({
  maxActiveMonsters: 28,
  maxVisibleCombats: 8,
  aiStepMs: 260,
  corpseDays: 5,
  attackHistoryLimit: 36,
});

const LAIR_BLUEPRINTS = Object.freeze({
  poi_goblin_camp: { type: 'Goblin Camp', family: ['goblin_raider', 'bandit'], level: 1, cap: 3, interval: [1, 3], loot: 'coins and stolen cargo' },
  poi_skeleton_ruins: { type: 'Skeleton Ruins', family: ['skeleton_attacker'], level: 2, cap: 3, interval: [1, 3], loot: 'bones and old equipment' },
  poi_slime_pit: { type: 'Slime Pit', family: ['slime', 'grump_mushroom'], level: 1, cap: 3, interval: [1, 3], loot: 'slime residue and herbs' },
  suspicious_cave: { type: 'Spider Nest', family: ['cave_spider', 'giant_rat'], level: 2, cap: 3, interval: [1, 2], loot: 'webbed loot' },
  poi_dungeon_mouth: { type: 'Dungeon Mouth', family: ['cave_spider', 'skeleton_attacker', 'dungeon_bat'], level: 3, cap: 5, interval: [1, 2], loot: 'dungeon salvage' },
  poi_loot_cave: { type: 'Loot Cave', family: ['loot_mimic', 'bandit'], level: 2, cap: 3, interval: [1, 3], loot: 'loot of disputed ownership' },
  poi_premium_ruin: { type: 'Premium Ruin', family: ['premium_goblin', 'audit_imp', 'coin_golem'], level: 3, cap: 4, interval: [1, 2], loot: 'questionable premium components' },
  old_balance_ruin: { type: 'Cursed Grove', family: ['debt_wraith', 'refund_ghost'], level: 2, cap: 3, interval: [2, 3], loot: 'cursed records and remedies' },
  resource_old_ruins_far: { type: 'Abandoned Mine', family: ['giant_rat', 'cave_spider', 'skeleton_attacker'], level: 2, cap: 4, interval: [1, 3], loot: 'ore and abandoned liability' },
  broken_watch_post: { type: 'Bandit Camp', family: ['bandit', 'goblin_raider', 'wolf'], level: 2, cap: 4, interval: [1, 2], loot: 'stolen cargo and road tolls' },
});

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function seededDayOffset(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = ((hash * 31) + id.charCodeAt(i)) >>> 0;
  return hash % 3;
}

export function getLairBlueprint(poiId) {
  return LAIR_BLUEPRINTS[poiId] || null;
}

export function createDefaultLairs(points = [], day = 1) {
  return Object.fromEntries(points
    .map((point) => {
      const blueprint = getLairBlueprint(point.id);
      if (!blueprint) return null;
      return [point.id, {
        id: point.id,
        poiId: point.id,
        name: point.name || blueprint.type,
        type: blueprint.type,
        level: blueprint.level,
        danger: clamp(blueprint.level * 22, 10, 100),
        monsterFamily: [...blueprint.family],
        spawnInterval: [...blueprint.interval],
        activeMonsterCap: blueprint.cap,
        threatBudget: blueprint.level * 4,
        pressure: blueprint.level * 4,
        pressureState: 'dormant',
        lastRaidDay: 0,
        raidCooldownUntilDay: 0,
        suppressionProgress: 0,
        operation: null,
        activeMonsterIds: [],
        cleared: false,
        suppressedUntilDay: 0,
        recoveryDay: 0,
        discovered: false,
        scouted: false,
        recentAttacks: [],
        lootTable: blueprint.loot,
        revealRadius: 2 + blueprint.level,
        nextSpawnDay: day + 1 + seededDayOffset(point.id),
      }];
    })
    .filter(Boolean));
}

export function normalizeLairs(saved, points = [], day = 1) {
  const defaults = createDefaultLairs(points, day);
  const source = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  for (const [id, base] of Object.entries(defaults)) {
    const raw = source[id] && typeof source[id] === 'object' ? source[id] : {};
    const family = Array.isArray(raw.monsterFamily) && raw.monsterFamily.length
      ? raw.monsterFamily.filter((entry) => typeof entry === 'string').slice(0, 5)
      : base.monsterFamily;
    defaults[id] = {
      ...base,
      ...raw,
      id,
      poiId: id,
      level: clamp(Math.floor(finite(raw.level, base.level)), 1, 5),
      danger: clamp(finite(raw.danger, base.danger), 0, 100),
      monsterFamily: family,
      spawnInterval: base.spawnInterval,
      activeMonsterCap: clamp(Math.floor(finite(raw.activeMonsterCap, base.activeMonsterCap)), 1, 8),
      threatBudget: clamp(finite(raw.threatBudget, base.threatBudget), 0, 100),
      pressure: clamp(finite(raw.pressure, raw.threatBudget ?? base.pressure), 0, 100),
      pressureState: typeof raw.pressureState === 'string' ? raw.pressureState : base.pressureState,
      lastRaidDay: Math.max(0, Math.floor(finite(raw.lastRaidDay))),
      raidCooldownUntilDay: Math.max(0, Math.floor(finite(raw.raidCooldownUntilDay))),
      suppressionProgress: clamp(finite(raw.suppressionProgress), 0, 100),
      operation: raw.operation && typeof raw.operation === 'object' && !Array.isArray(raw.operation) ? { ...raw.operation } : null,
      activeMonsterIds: Array.isArray(raw.activeMonsterIds) ? raw.activeMonsterIds.filter((entry) => typeof entry === 'string').slice(0, 8) : [],
      recentAttacks: Array.isArray(raw.recentAttacks) ? raw.recentAttacks.filter(Boolean).slice(-8) : [],
      cleared: Boolean(raw.cleared),
      discovered: Boolean(raw.discovered),
      scouted: Boolean(raw.scouted),
      suppressedUntilDay: Math.max(0, Math.floor(finite(raw.suppressedUntilDay))),
      recoveryDay: Math.max(0, Math.floor(finite(raw.recoveryDay))),
      nextSpawnDay: Math.max(day, Math.floor(finite(raw.nextSpawnDay, base.nextSpawnDay))),
    };
  }
  return defaults;
}

export function getMonsterRuntimeStats(monster, lairLevel = 1) {
  const threat = Math.max(1, finite(monster?.threat, 1));
  const power = Math.max(3, finite(monster?.power, threat * 4));
  const large = threat >= 5;
  return {
    maxHealth: Math.round(28 + power * 4 + Math.max(0, lairLevel - 1) * 9),
    damage: Math.round(3 + threat * 2.1),
    armour: Math.max(0, Math.floor((threat + lairLevel - 2) / 3)),
    detectionRadius: 145 + threat * 18,
    chaseRadius: 320 + threat * 34,
    leashDistance: large ? 720 : 480 + lairLevel * 55,
    attackRange: large ? 48 : 34,
    attackCooldownMs: Math.max(720, 1500 - threat * 80),
    reactionMs: Math.max(240, 760 - threat * 55),
    fleeHealthRatio: ['wolf', 'goblin_raider', 'bandit'].includes(monster?.id) ? 0.24 : 0,
    speedPx: 48 * clamp(finite(monster?.speed, 0.9), 0.5, 1.5),
  };
}

export function normalizeMonsterRecord(record = {}) {
  const state = Object.values(MONSTER_STATES).includes(record.state) ? record.state : MONSTER_STATES.IDLE;
  return {
    ...record,
    state,
    health: Math.max(1, finite(record.health, record.maxHealth || 40)),
    maxHealth: Math.max(1, finite(record.maxHealth, 40)),
    homeLairId: typeof record.homeLairId === 'string' ? record.homeLairId : null,
    targetRef: record.targetRef && typeof record.targetRef === 'object' ? { ...record.targetRef } : null,
    priority: Boolean(record.priority),
    kills: Math.max(0, Math.floor(finite(record.kills))),
    stolenCargo: Math.max(0, Math.floor(finite(record.stolenCargo))),
  };
}

export function scoreAggroTarget(monsterId, candidate, distance) {
  const kind = candidate?.kind || 'hero';
  let score = Math.max(0, 300 - distance);
  if (kind === 'service') score += 48;
  if (kind === 'carrier') score += ['goblin_raider', 'bandit', 'loot_mimic'].includes(monsterId) ? 130 : 56;
  if (kind === 'hero') {
    score += candidate.injured ? 85 : 35;
    score -= candidate.power > 12 ? 24 : 0;
  }
  if (kind === 'guard') score -= ['skeleton_attacker', 'coin_golem'].includes(monsterId) ? 0 : 35;
  if (kind === 'building') {
    score += 8;
    const id = candidate?.buildingId || '';
    const preferred = {
      goblin_raider: ['market', 'storehouse', 'warehouse', 'lootbox_kiosk'],
      bandit: ['market', 'storehouse', 'warehouse'],
      loot_mimic: ['market', 'warehouse', 'lootbox_kiosk'],
      skeleton_attacker: ['tavern', 'inn', 'guildhall'],
      debt_wraith: ['bank_debt_office', 'guildhall', 'tavern'],
      premium_goblin: ['whale', 'premium_temple', 'premium_fabricator'],
      audit_imp: ['whale', 'premium_temple', 'premium_fabricator'],
      coin_golem: ['whale', 'premium_temple', 'premium_fabricator'],
    }[monsterId] || [];
    if (preferred.includes(id)) score += 90;
  }
  return score;
}

export function getSpawnIntervalDays(lair, random = Math.random) {
  const range = Array.isArray(lair?.spawnInterval) ? lair.spawnInterval : [1, 3];
  const min = Math.max(1, Math.floor(finite(range[0], 1)));
  const max = Math.max(min, Math.floor(finite(range[1], min)));
  return min + Math.floor(random() * (max - min + 1));
}
