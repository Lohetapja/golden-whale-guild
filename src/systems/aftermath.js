export const AFTERMATH_LIMITS = Object.freeze({
  maxRemains: 36,
  maxLoot: 28,
  maxPerArea: 8,
  lootInterestCooldownMs: 2200,
});

const PROFILES = Object.freeze({
  goblin: { ids: ['goblin_raider'], type: 'goblin', name: 'Goblin Remains', assetKey: 'corpse_goblin_remains', fallbackKey: 'loot_bag_small', decayDays: 5, danger: 2, evidence: 3 },
  skeleton: { ids: ['skeleton_attacker'], type: 'skeleton', name: 'Bone Pile', assetKey: 'corpse_skeleton_bones', fallbackKey: 'poi_skeleton_ruins', decayDays: 9, danger: 2, evidence: 2 },
  slime: { ids: ['slime', 'grump_mushroom'], type: 'slime', name: 'Toxic Slime Residue', assetKey: 'corpse_slime_puddle', fallbackKey: 'decal_mud_puddle', decayDays: 4, danger: 5, evidence: 3 },
  spider: { ids: ['cave_spider'], type: 'spider', name: 'Curled Spider Carcass', assetKey: 'decal_leaf_litter', fallbackKey: 'decal_mud_puddle', decayDays: 5, danger: 4, evidence: 4 },
  animal: { ids: ['wolf', 'giant_rat', 'dungeon_bat'], type: 'animal', name: 'Animal Carcass', assetKey: 'decal_dirt_mound', fallbackKey: 'object_rock_mossy', decayDays: 5, danger: 3, evidence: 3 },
  bandit: { ids: ['bandit'], type: 'humanoid', name: 'Bandit Remains', assetKey: 'corpse_goblin_remains', fallbackKey: 'loot_bag_small', decayDays: 6, danger: 4, evidence: 4 },
  premium: { ids: ['premium_goblin', 'debt_wraith', 'refund_ghost', 'loot_mimic', 'queue_demon', 'audit_imp'], type: 'premium_residue', name: 'Corrupted Premium Residue', assetKey: 'resource_premium_wreckage', fallbackKey: 'object_contract_pile', decayDays: 7, danger: 6, corruption: 2, evidence: 5 },
  large: { ids: ['coin_golem'], type: 'large_debris', name: 'Coin Golem Debris', assetKey: 'resource_premium_wreckage', fallbackKey: 'object_rock_02', decayDays: 10, danger: 7, corruption: 1, evidence: 4, large: true },
});

const DEATH_LINES = Object.freeze({
  goblin: ['The goblin dropped its sack and several unsupported revenue projections.', 'Stolen cargo rights remain disputed by everyone who arrived late.'],
  skeleton: ['Minimum viable staffing became a bone pile.', 'The skeleton finally met a policy it could not outlive.'],
  slime: ['Compliance dried slowly and remained slippery.', 'The slime dissolved into a puddle of enforceable ambiguity.'],
  spider: ['Its subscription web has been cancelled with force.', 'Eight legs, no refund, one awkward cleanup rota.'],
  animal: ['It attempted to negotiate with civilization. Civilization brought armour.', 'The wilderness left a strongly worded carcass.'],
  humanoid: ['The stolen-goods warranty did not cover heroes.', 'Management classified the bandit as an unscheduled career transition.'],
  premium_residue: ['The premium resurrection trial expired six minutes earlier.', 'Luxury corruption now available in residue form.'],
  large_debris: ['The large monster stopped moving. Its maintenance footprint did not.', 'Municipal confidence survived beneath several tonnes of evidence.'],
  hero: ['Died while proving that armour was an optional purchase.', 'The resurrection package expired six minutes earlier.', 'The town mourned, then checked the loot table.'],
  carrier: ['Carried three crates, one route plan, and no survival instinct.', 'The cargo survived long enough to become somebody else\'s objective.'],
  worker: ['Management classified the incident as an unscheduled career transition.', 'The service radius did not include resurrection.'],
});

const pick = (items, random = Math.random) => items[Math.floor(random() * items.length)];
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function getRemainsProfile(monsterId = '') {
  return Object.values(PROFILES).find((profile) => profile.ids.includes(monsterId)) || PROFILES.goblin;
}

export function getAftermathFlavor(type, random = Math.random) {
  return pick(DEATH_LINES[type] || DEATH_LINES.goblin, random);
}

export function getDecayState(record, day) {
  const age = Math.max(0, day - finite(record.deathDay, record.createdDay || day));
  const duration = Math.max(2, finite(record.decayDuration, 5));
  const make = (id, label, alpha, expired = false) => ({
    id,
    state: id,
    label,
    age,
    alpha,
    expired,
    remaining: Math.max(0, duration - age),
  });
  if (age <= 1) return make('fresh', 'Fresh', 1);
  if (age < Math.ceil(duration * 0.65)) return make('decaying', 'Decaying', 0.88);
  if (age < duration) return make('old', 'Old Remains', 0.68);
  return make('gone', 'Gone', 0, true);
}

export function rollMonsterLoot(monster, lairLevel = 1, stolenCargo = 0, random = Math.random) {
  const id = monster?.id || '';
  const threat = Math.max(1, finite(monster?.threat, 1));
  const contents = {};
  const gold = Math.max(0, Math.floor((finite(monster?.reward, threat * 16)) * (0.18 + random() * 0.32)));
  if (gold > 0) contents.gold = gold;
  if (['goblin_raider', 'bandit'].includes(id)) contents.loot = Math.max(1, Math.ceil(stolenCargo / 2) || (random() < 0.65 ? 1 : 0));
  if (id === 'skeleton_attacker' && random() < 0.65) contents.gear = 1;
  if (id === 'cave_spider') contents.herbs = random() < 0.8 ? 1 : 0;
  if (['slime', 'grump_mushroom'].includes(id) && random() < 0.55) contents.herbs = 1;
  if (['premium_goblin', 'debt_wraith', 'refund_ghost', 'loot_mimic', 'queue_demon', 'audit_imp', 'coin_golem'].includes(id)) {
    contents.premiumSalvage = Math.max(1, Math.floor((threat + lairLevel) / 4));
  }
  return Object.fromEntries(Object.entries(contents).filter(([, amount]) => amount > 0));
}

export function normalizeAftermathRecord(raw = {}, day = 1) {
  const kind = raw.kind === 'corpse' ? 'remains' : ['remains', 'loot', 'grave'].includes(raw.kind) ? raw.kind : 'loot';
  const deathDay = Math.max(1, Math.floor(finite(raw.deathDay, raw.createdDay || day)));
  const decayDuration = Math.max(2, Math.floor(finite(raw.decayDuration, Math.max(2, finite(raw.expiresDay, deathDay + 5) - deathDay))));
  return {
    ...raw,
    id: String(raw.id || `aftermath-${day}-${Math.floor(Math.random() * 1000000)}`),
    kind,
    monsterId: raw.monsterId || null,
    monsterName: raw.monsterName || 'Unknown Monster',
    homeLairId: raw.homeLairId || null,
    killerId: raw.killerId || null,
    killerName: raw.killerName || raw.killer || null,
    deathDay,
    createdDay: deathDay,
    causeOfDeath: raw.causeOfDeath || 'Visible world combat',
    remainsType: raw.remainsType || (kind === 'grave' ? 'hero' : 'unknown'),
    decayDuration,
    expiresDay: deathDay + decayDuration,
    searched: Boolean(raw.searched),
    lootContents: raw.lootContents && typeof raw.lootContents === 'object' && !Array.isArray(raw.lootContents)
      ? Object.fromEntries(Object.entries(raw.lootContents).map(([id, amount]) => [id, Math.max(0, finite(amount))]).filter(([, amount]) => amount > 0))
      : raw.gold > 0 ? { gold: finite(raw.gold) } : {},
    dangerEffect: Math.max(0, finite(raw.dangerEffect)),
    corruptionEffect: Math.max(0, finite(raw.corruptionEffect)),
    evidenceValue: Math.max(0, finite(raw.evidenceValue)),
    evidenceState: raw.evidenceState || 'unread',
    claimedByHeroId: raw.claimedByHeroId || null,
    claimedByHeroName: raw.claimedByHeroName || null,
    relatedQuestId: raw.relatedQuestId || null,
    cleared: Boolean(raw.cleared || raw.collected),
  };
}

export function formatLootContents(contents = {}) {
  const labels = { gold: 'g', premiumSalvage: 'premium salvage', tradeGoods: 'trade goods' };
  const entries = Object.entries(contents).filter(([, amount]) => amount > 0);
  return entries.length ? entries.map(([id, amount]) => `${amount}${id === 'gold' ? '' : ' '} ${labels[id] || id}`.trim()).join(', ') : 'Nothing valuable';
}
