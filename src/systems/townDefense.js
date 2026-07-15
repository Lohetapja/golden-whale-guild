export const DEFENCE_PRIORITIES = Object.freeze({
  balanced: { id: 'balanced', name: 'Balanced Response', chaseMultiplier: 1, civilian: 24, storage: 20, premium: 8, aggression: 0 },
  civilians: { id: 'civilians', name: 'Protect Civilians', chaseMultiplier: 0.9, civilian: 70, storage: 8, premium: 0, aggression: -4 },
  storage: { id: 'storage', name: 'Protect Storage and Production', chaseMultiplier: 0.9, civilian: 16, storage: 72, premium: 0, aggression: -2 },
  premium: { id: 'premium', name: 'Protect Premium District', chaseMultiplier: 1, civilian: 4, storage: 8, premium: 90, aggression: 2 },
  aggressive: { id: 'aggressive', name: 'Hunt Monsters Aggressively', chaseMultiplier: 1.45, civilian: 18, storage: 14, premium: 8, aggression: 36 },
  hold: { id: 'hold', name: 'Hold Defensive Positions', chaseMultiplier: 0.62, civilian: 28, storage: 30, premium: 12, aggression: -28 },
});

export const ALERT_LEVELS = Object.freeze({
  sighting: { id: 'sighting', name: 'Sighting', severity: 1 },
  confirmed: { id: 'confirmed', name: 'Confirmed Threat', severity: 2 },
  attack: { id: 'attack', name: 'Attack in Progress', severity: 3 },
  building: { id: 'building', name: 'Building Under Attack', severity: 4 },
  civilian: { id: 'civilian', name: 'Civilian Down', severity: 5 },
  pressure: { id: 'pressure', name: 'Lair Pressure Rising', severity: 2 },
});

export const DETECTOR_PROFILES = Object.freeze({
  civilian: { radius: 86, reactionMs: 560, reliability: 0.72 },
  worker: { radius: 102, reactionMs: 470, reliability: 0.82 },
  hero: { radius: 150, reactionMs: 260, reliability: 0.96 },
  guard: { radius: 230, reactionMs: 120, reliability: 1 },
  watchtower: { radius: 430, reactionMs: 80, reliability: 1 },
  guard_post: { radius: 270, reactionMs: 110, reliability: 1 },
  frontier_outpost: { radius: 330, reactionMs: 150, reliability: 0.96 },
  scout_post: { radius: 370, reactionMs: 120, reliability: 0.98 },
});

export const DEFENCE_LIMITS = Object.freeze({
  maxAlerts: 8,
  maxPatrols: 6,
  maxActiveRaids: 2,
  alertCooldownMs: 7000,
  incidentGraceDays: 1,
});

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function normalizeDefenceState(raw = {}) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const priority = DEFENCE_PRIORITIES[source.priority] ? source.priority : 'balanced';
  return {
    priority,
    alerts: (Array.isArray(source.alerts) ? source.alerts : [])
      .filter((alert) => alert?.id && (alert?.actorId || alert?.lairId) && !alert.dismissed)
      .slice(-DEFENCE_LIMITS.maxAlerts),
    patrolAssignments: source.patrolAssignments && typeof source.patrolAssignments === 'object' && !Array.isArray(source.patrolAssignments)
      ? { ...source.patrolAssignments }
      : {},
    activeRaids: (Array.isArray(source.activeRaids) ? source.activeRaids : [])
      .filter((raid) => raid?.id && raid?.lairId && raid.status !== 'complete')
      .slice(-DEFENCE_LIMITS.maxActiveRaids),
    lastSevereIncidentDay: Math.max(0, Math.floor(finite(source.lastSevereIncidentDay))),
    summarizedIncidents: {
      sightings: Math.max(0, Math.floor(finite(source.summarizedIncidents?.sightings))),
      raids: Math.max(0, Math.floor(finite(source.summarizedIncidents?.raids))),
      civiliansSaved: Math.max(0, Math.floor(finite(source.summarizedIncidents?.civiliansSaved))),
      cargoDropped: Math.max(0, Math.floor(finite(source.summarizedIncidents?.cargoDropped))),
    },
  };
}

export function getLairPressureState(lair, day = 1) {
  if (lair?.cleared) return { id: 'cleared', name: 'Cleared', spawnMultiplier: 0 };
  if (finite(lair?.suppressedUntilDay) > day) return { id: 'suppressed', name: 'Suppressed', spawnMultiplier: 0.18 };
  const pressure = clamp(finite(lair?.pressure, lair?.threatBudget), 0, 100);
  if (pressure >= 70) return { id: 'raiding', name: 'Raiding', spawnMultiplier: 1.5 };
  if (pressure >= 42) return { id: 'active', name: 'Active', spawnMultiplier: 1 };
  if (pressure >= 18) return { id: 'stirring', name: 'Stirring', spawnMultiplier: 0.65 };
  return { id: 'dormant', name: 'Dormant', spawnMultiplier: 0.35 };
}

export function estimateDangerLabel(value) {
  const danger = clamp(finite(value), 0, 100);
  if (danger >= 80) return 'Severe';
  if (danger >= 55) return 'Dangerous';
  if (danger >= 28) return 'Moderate';
  return 'Low';
}

export function normalizeAlert(raw = {}) {
  const level = ALERT_LEVELS[raw.level] ? raw.level : 'sighting';
  return {
    ...raw,
    id: String(raw.id || `alert-${raw.actorId || 'unknown'}`),
    actorId: String(raw.actorId || ''),
    lairId: raw.lairId ? String(raw.lairId) : null,
    level,
    severity: ALERT_LEVELS[level].severity,
    detectedAtMs: Math.max(0, finite(raw.detectedAtMs)),
    detectedDay: Math.max(1, Math.floor(finite(raw.detectedDay, 1))),
    updatedAtMs: Math.max(0, finite(raw.updatedAtMs, raw.detectedAtMs)),
    ignored: Boolean(raw.ignored),
    dismissed: Boolean(raw.dismissed),
  };
}

export function upsertAlert(alerts, incoming) {
  const next = normalizeAlert(incoming);
  const list = (Array.isArray(alerts) ? alerts : []).map(normalizeAlert);
  const index = list.findIndex((alert) => (
    (next.actorId && alert.actorId === next.actorId)
    || (next.lairId && alert.lairId === next.lairId && alert.level === 'pressure')
  ) && !alert.dismissed);
  if (index < 0) return [...list, next].slice(-DEFENCE_LIMITS.maxAlerts);
  const current = list[index];
  list[index] = {
    ...current,
    ...next,
    detectedAtMs: current.detectedAtMs || next.detectedAtMs,
    detectedDay: current.detectedDay || next.detectedDay,
    level: next.severity >= current.severity ? next.level : current.level,
    severity: Math.max(current.severity, next.severity),
  };
  return list.slice(-DEFENCE_LIMITS.maxAlerts);
}

export function getNextDefencePriority(current) {
  const ids = Object.keys(DEFENCE_PRIORITIES);
  return ids[(ids.indexOf(current) + 1) % ids.length] || 'balanced';
}
