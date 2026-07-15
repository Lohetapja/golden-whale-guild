const clamp = (value, min = -100, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));
const safeArray = (value, max = 24) => (Array.isArray(value) ? value.slice(-max) : []);
const safeObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const CAREER_STAGES = [
  { id: 'recruit', name: 'Recruit', minScore: 0, contractTier: 1 },
  { id: 'adventurer', name: 'Adventurer', minScore: 12, contractTier: 1 },
  { id: 'proven', name: 'Proven Hero', minScore: 30, contractTier: 2 },
  { id: 'veteran', name: 'Veteran', minScore: 60, contractTier: 3 },
  { id: 'champion', name: 'Champion', minScore: 105, contractTier: 4 },
  { id: 'legend', name: 'Guild Legend', minScore: 165, contractTier: 5 },
];

export const LOOT_POLICIES = [
  { id: 'equal', name: 'Equal Shares', cohesion: 6, trust: 4 },
  { id: 'killer', name: 'Killer Claims First', cohesion: -2, rivalry: 4 },
  { id: 'leader', name: 'Leader Decides', cohesion: 0, honestyWeighted: true },
  { id: 'need', name: 'Need Before Greed', cohesion: 4, greedPenalty: 5 },
  { id: 'guild', name: 'Guild Takes a Cut', cohesion: -3, townShare: 0.25 },
  { id: 'premium', name: 'Premium Auction', cohesion: -8, corruption: 2 },
  { id: 'finders', name: 'Finders Keepers', cohesion: -6, rivalry: 6 },
];

export const RISK_POLICIES = [
  { id: 'cautious', name: 'Cautious', modifier: -8 },
  { id: 'balanced', name: 'Balanced', modifier: 0 },
  { id: 'bold', name: 'Bold', modifier: 6 },
];

export const RELATIONSHIP_EVENTS = {
  quest_success: { deltas: { respect: 8, trust: 6, friendship: 4, loyalty: 3 }, severity: 2, reciprocal: true, text: 'Completed a difficult assignment together.' },
  quest_failure: { deltas: { trust: -3, resentment: 2, fear: 2 }, severity: 1, reciprocal: true, text: 'Survived a failed assignment together.' },
  rescue: { deltas: { trust: 18, friendship: 12, debt: 22, loyalty: 10, respect: 12 }, severity: 4, text: 'Was rescued from immediate danger.' },
  defended_together: { deltas: { respect: 7, trust: 5, friendship: 3 }, severity: 2, reciprocal: true, text: 'Defended the town together.' },
  mentorship: { deltas: { respect: 10, trust: 6, friendship: 3 }, severity: 2, text: 'Shared a useful training session.' },
  humiliation: { deltas: { trust: -10, resentment: 14, rivalry: 8 }, severity: 3, text: 'Turned training into a public humiliation.' },
  loot_shared: { deltas: { trust: 10, friendship: 7, debt: 4 }, severity: 2, text: 'Shared contested loot fairly.' },
  loot_stolen: { deltas: { trust: -24, rivalry: 18, resentment: 28, envy: 10 }, severity: 5, text: 'Stole or destroyed claimed equipment.' },
  premium_favoritism: { deltas: { respect: -5, envy: 14, resentment: 12, premiumOpinion: -10 }, severity: 2, text: 'Received a visible premium advantage.' },
  abandonment: { deltas: { trust: -28, resentment: 30, fear: 8, loyalty: -14 }, severity: 5, text: 'Abandoned a companion in danger.' },
  grave_honoured: { deltas: { respect: 10, friendship: 6, debt: -4 }, severity: 3, text: 'Honoured a fallen companion.' },
  policy_support: { deltas: { trust: 5, loyalty: 5 }, severity: 1, text: 'Supported the same guild policy.' },
  party_removed: { deltas: { trust: -7, rivalry: 5, resentment: 8 }, severity: 2, text: 'Was removed from a preferred party.' },
};

const DIMENSIONS = ['respect', 'trust', 'friendship', 'rivalry', 'envy', 'resentment', 'fear', 'debt', 'loyalty', 'sharedValues', 'premiumOpinion'];

function hashSeed(text = '') {
  return [...String(text)].reduce((value, char) => ((value * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
}

function trait(seed, offset, min = 25, max = 80) {
  return min + ((seed >>> offset) % (max - min + 1));
}

export function deriveCareerScore(profile = {}) {
  const career = safeObject(profile.career);
  return (career.quests || 0) * 5
    + (career.kills || 0) * 3
    + (career.rescues || 0) * 7
    + (career.lairsCleared || 0) * 12
    + (career.buildingsDefended || 0) * 4
    + (career.mentorships || 0) * 3
    + (career.victories || 0) * 2
    - (career.failures || 0) * 2;
}

export function getCareerStage(profile = {}) {
  if (profile.status === 'dead') return { id: 'fallen', name: 'Fallen', contractTier: profile.contract?.tier || 1 };
  if (profile.status === 'retired') return { id: 'retired', name: 'Retired', contractTier: profile.contract?.tier || 1 };
  const score = deriveCareerScore(profile);
  return [...CAREER_STAGES].reverse().find((stage) => score >= stage.minScore) || CAREER_STAGES[0];
}

export function normalizeHeroProfile(raw, hero = {}, day = 1) {
  const source = safeObject(raw);
  const hasSavedCareerStage = typeof source.careerStage === 'string' && source.careerStage.length > 0;
  const stats = safeObject(hero.stats);
  const seed = hashSeed(hero.id || hero.name || 'hero');
  const existingHistory = Array.isArray(stats.history) ? stats.history : [];
  const power = Number(stats.power) || 1;
  const career = {
    quests: existingHistory.filter((line) => /Completed|Whale-cleared/i.test(line)).length,
    failures: existingHistory.filter((line) => /Failed/i.test(line)).length,
    kills: existingHistory.filter((line) => /Defeated/i.test(line)).length,
    rescues: existingHistory.filter((line) => /rescu/i.test(line)).length,
    injuries: existingHistory.filter((line) => /injured/i.test(line)).length,
    buildingsDefended: 0, lairsCleared: 0, mentorships: 0, victories: Math.max(0, Math.floor((power - 3) / 3)),
    ...safeObject(source.career),
  };
  const contract = {
    tier: 1,
    satisfaction: 65,
    expectations: [],
    promises: [],
    grievances: [],
    unmetDays: 0,
    warningDay: 0,
    ...safeObject(source.contract),
  };
  contract.expectations = safeArray(contract.expectations, 8);
  contract.promises = safeArray(contract.promises, 10);
  contract.grievances = safeArray(contract.grievances, 12);
  const profile = {
    archetype: source.archetype || hero.personality || 'Adventurer',
    origin: source.origin || ['North Road', 'Old Guild Circuit', 'Debt Coast', 'Patch Frontier'][seed % 4],
    careerStage: source.careerStage || 'recruit',
    level: Math.max(1, Number(source.level) || Math.floor((Number(stats.power) || 1) / 4) + 1),
    wealth: Number.isFinite(Number(source.wealth)) ? Number(source.wealth) : Number(stats.gold) || 0,
    ambition: clamp(source.ambition ?? trait(seed, 1), 0, 100),
    courage: clamp(source.courage ?? trait(seed, 4), 0, 100),
    greed: clamp(source.greed ?? trait(seed, 7), 0, 100),
    honesty: clamp(source.honesty ?? trait(seed, 10), 0, 100),
    premiumTemptation: clamp(source.premiumTemptation ?? trait(seed, 13), 0, 100),
    localReputation: clamp(source.localReputation ?? stats.fame ?? 0, -100, 100),
    influence: clamp(source.influence || 0, 0, 100),
    faction: source.faction || null,
    mentorId: source.mentorId || null,
    studentIds: safeArray(source.studentIds, 6),
    partyId: source.partyId || null,
    retirementTendency: clamp(source.retirementTendency || 0, 0, 100),
    achievements: safeArray(source.achievements, 18),
    scars: safeArray(source.scars, 8),
    career,
    contract,
    arrivalDay: Math.max(1, Number(source.arrivalDay) || day),
    status: source.status || (stats.deathDay ? 'dead' : stats.active === false ? 'departed' : 'active'),
    departureReason: source.departureReason || null,
    retirementRole: source.retirementRole || null,
  };
  const stage = getCareerStage(profile);
  if (!hasSavedCareerStage) profile.careerStage = stage.id;
  profile.contract.tier = Math.max(profile.contract.tier, stage.contractTier);
  return profile;
}

export function normalizeHeroSocialState(raw = {}) {
  const source = safeObject(raw);
  const relationships = Object.fromEntries(Object.entries(safeObject(source.relationships)).map(([key, value]) => {
    const record = safeObject(value);
    return [key, {
      ...Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, clamp(record[dimension])])),
      memories: safeArray(record.memories, 20),
    }];
  }));
  const parties = Object.fromEntries(Object.entries(safeObject(source.parties)).flatMap(([id, value]) => {
    const party = safeObject(value);
    const memberIds = [...new Set(safeArray(party.memberIds, 6).filter((memberId) => typeof memberId === 'string'))];
    if (!memberIds.length) return [];
    return [[id, {
      id,
      name: typeof party.name === 'string' ? party.name : id,
      leaderId: memberIds.includes(party.leaderId) ? party.leaderId : memberIds[0],
      memberIds,
      maxSize: Math.max(2, Math.min(6, Number(party.maxSize) || 4)),
      history: safeArray(party.history, 16),
      cohesion: clamp(party.cohesion ?? 50, 0, 100),
      cohesionReasons: safeArray(party.cohesionReasons, 5),
      reputation: clamp(party.reputation || 0, 0, 100),
      preferredMission: party.preferredMission || 'balanced',
      currentAssignment: party.currentAssignment && typeof party.currentAssignment === 'object' ? party.currentAssignment : null,
      lootPolicy: LOOT_POLICIES.some((policy) => policy.id === party.lootPolicy) ? party.lootPolicy : 'equal',
      riskPolicy: RISK_POLICIES.some((policy) => policy.id === party.riskPolicy) ? party.riskPolicy : 'balanced',
      formedDay: Number(party.formedDay) || 1,
      victories: Math.max(0, Number(party.victories) || 0),
      failures: Math.max(0, Number(party.failures) || 0),
      casualties: Math.max(0, Number(party.casualties) || 0),
      permanent: party.permanent !== false,
    }]];
  }));
  return {
    relationships,
    parties,
    events: safeArray(source.events, 60),
    memorials: safeObject(source.memorials),
    retirements: safeArray(source.retirements, 30),
    lastSocialDay: Number(source.lastSocialDay) || 0,
    nextPartyId: Math.max(1, Number(source.nextPartyId) || 1),
  };
}

export function getRelationship(state, sourceId, targetId) {
  const graph = state.relationships || (state.relationships = {});
  const key = `${sourceId}>${targetId}`;
  if (!graph[key]) {
    graph[key] = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, 0]));
    graph[key].memories = [];
  }
  graph[key].memories = safeArray(graph[key].memories, 20);
  return graph[key];
}

export function describeRelationship(record = {}) {
  if ((record.resentment || 0) >= 70 || (record.trust || 0) <= -70) return 'Public Enemy';
  if ((record.rivalry || 0) >= 70) return 'Bitter Rival';
  if ((record.rivalry || 0) >= 40) return (record.respect || 0) >= 35 ? 'Worthy Rival' : 'Competitive Rival';
  if ((record.friendship || 0) >= 75 && (record.trust || 0) >= 60) return 'Trusted Companion';
  if ((record.friendship || 0) >= 45) return 'Friend';
  if ((record.respect || 0) >= 65) return 'Respected Veteran';
  if ((record.debt || 0) >= 60) return 'Owes a Life Debt';
  if ((record.resentment || 0) >= 45) return 'Holds a Grudge';
  return 'Acquaintance';
}

export function applyRelationshipEvent(state, sourceId, targetId, eventId, context = {}) {
  if (!sourceId || !targetId || sourceId === targetId) return null;
  const def = RELATIONSHIP_EVENTS[eventId];
  if (!def) return null;
  const apply = (from, to, reciprocal = false) => {
    const record = getRelationship(state, from, to);
    for (const [dimension, delta] of Object.entries(def.deltas)) {
      record[dimension] = clamp((record[dimension] || 0) + delta);
    }
    const memory = {
      id: `${context.day || 1}-${eventId}-${from}-${to}-${record.memories.length}`,
      eventId,
      text: context.text || def.text,
      day: context.day || 1,
      location: context.location || 'town',
      relatedId: context.relatedId || null,
      severity: context.severity || def.severity,
      expiresDay: (context.severity || def.severity) >= 4 ? 0 : (context.day || 1) + 7 + (context.severity || def.severity) * 5,
      reciprocal,
    };
    record.memories = [...safeArray(record.memories, 19), memory];
    return record;
  };
  const primary = apply(sourceId, targetId, false);
  if (def.reciprocal || context.reciprocal) apply(targetId, sourceId, true);
  return primary;
}

export function fadeMinorRelationships(state, day) {
  for (const record of Object.values(state.relationships || {})) {
    record.memories = safeArray(record.memories, 20).filter((memory) => !memory.expiresDay || memory.expiresDay >= day);
    const hasMajor = record.memories.some((memory) => (memory.severity || 0) >= 4);
    if (!hasMajor) {
      record.resentment = clamp((record.resentment || 0) - 2);
      record.rivalry = clamp((record.rivalry || 0) - 1);
      record.envy = clamp((record.envy || 0) - 2);
    }
  }
}

export function createParty(state, leaderId, memberIds = [], day = 1) {
  const id = `party-${state.nextPartyId++}`;
  const members = [...new Set([leaderId, ...memberIds])].filter(Boolean).slice(0, 6);
  state.parties[id] = {
    id,
    name: `Company ${state.nextPartyId - 1}`,
    leaderId,
    memberIds: members,
    maxSize: 4,
    history: [`Day ${day}: formed with ${members.length} member${members.length === 1 ? '' : 's'}.`],
    cohesion: 50,
    cohesionReasons: ['New party: relationships are still being invoiced.'],
    reputation: 0,
    preferredMission: 'balanced',
    currentAssignment: null,
    lootPolicy: 'equal',
    riskPolicy: 'balanced',
    formedDay: day,
    victories: 0,
    failures: 0,
    casualties: 0,
    permanent: true,
  };
  return state.parties[id];
}

export function computePartyCohesion(state, party, profiles = {}) {
  if (!party?.memberIds?.length) return { value: 0, reasons: ['No members. The party is legally a mailing list.'] };
  let value = 52;
  const reasons = [];
  for (let i = 0; i < party.memberIds.length; i += 1) {
    for (let j = i + 1; j < party.memberIds.length; j += 1) {
      const a = getRelationship(state, party.memberIds[i], party.memberIds[j]);
      const b = getRelationship(state, party.memberIds[j], party.memberIds[i]);
      const positive = ((a.friendship || 0) + (b.friendship || 0) + (a.trust || 0) + (b.trust || 0)) / 40;
      const negative = ((a.rivalry || 0) + (b.rivalry || 0) + (a.resentment || 0) + (b.resentment || 0)) / 32;
      value += positive - negative;
      if (positive >= 4) reasons.push('Friendship and trust improve cooperation.');
      if (negative >= 4) reasons.push('Rivalry and resentment disrupt coordination.');
    }
  }
  const leaderProfile = profiles[party.leaderId];
  if (leaderProfile) {
    const leaderRespect = party.memberIds
      .filter((id) => id !== party.leaderId)
      .reduce((sum, id) => sum + (getRelationship(state, id, party.leaderId).respect || 0), 0);
    value += leaderRespect / 30;
    if (leaderRespect > 80) reasons.push('Members respect the party leader.');
  }
  value += (party.victories || 0) * 2 - (party.failures || 0) * 3 - (party.casualties || 0) * 8;
  const loot = LOOT_POLICIES.find((policy) => policy.id === party.lootPolicy) || LOOT_POLICIES[0];
  value += loot.cohesion || 0;
  reasons.push(`${loot.name} shapes loot expectations.`);
  party.cohesion = clamp(Math.round(value), 0, 100);
  party.cohesionReasons = [...new Set(reasons)].slice(0, 4);
  return { value: party.cohesion, reasons: party.cohesionReasons };
}

export function getPartyBonus(party) {
  const cohesion = Number(party?.cohesion) || 0;
  if (cohesion >= 75) return { quest: 10, combat: 2, rescue: 0.25, label: 'High cohesion' };
  if (cohesion >= 45) return { quest: 4, combat: 1, rescue: 0.1, label: 'Stable cohesion' };
  if (cohesion < 25) return { quest: -8, combat: -1, rescue: -0.15, label: 'Fractured cohesion' };
  return { quest: -2, combat: 0, rescue: 0, label: 'Uneasy cohesion' };
}

export function cyclePartyPolicy(party, field, options) {
  const current = party[field];
  const index = Math.max(0, options.findIndex((entry) => entry.id === current));
  party[field] = options[(index + 1) % options.length].id;
  return party[field];
}

export function getHeroExpectations(profile, equipment = {}, lodging = {}) {
  const stage = CAREER_STAGES.find((entry) => entry.id === profile.careerStage) || CAREER_STAGES[0];
  const expectations = [];
  if (stage.contractTier >= 2 && ['Poor', undefined].includes(equipment.weapon)) expectations.push('Common weapon');
  if (stage.contractTier >= 3 && ['Poor', 'Common', undefined].includes(equipment.armor)) expectations.push('Good armor');
  if (stage.contractTier >= 3 && !equipment.potions) expectations.push('Potion access');
  if (stage.contractTier >= 4 && (lodging.quality || 0) < 2) expectations.push('better lodging');
  if (stage.contractTier >= 4) expectations.push('public recognition');
  if (profile.partyId && stage.contractTier >= 3) expectations.push('party leadership opportunity');
  return expectations.slice(0, 5);
}

export function recordSocialEvent(state, event) {
  const normalized = {
    id: event.id || `social-${event.day || 1}-${state.events.length}`,
    day: event.day || 1,
    type: event.type || 'social',
    heroIds: safeArray(event.heroIds, 6),
    text: event.text || 'A social event occurred and immediately requested minutes.',
    major: Boolean(event.major),
  };
  state.events = [...safeArray(state.events, 59), normalized];
  return normalized;
}

export function chooseFaction(profile = {}) {
  if ((profile.premiumTemptation || 0) >= 70) return 'Premium Enthusiasts';
  if ((profile.honesty || 0) >= 68) return 'Honest Veterans';
  if ((profile.courage || 0) >= 72) return 'Frontier Hunters';
  if ((profile.greed || 0) >= 70) return 'Merchants and Looters';
  if ((profile.career?.rescues || 0) >= 2) return 'Protectors';
  if ((profile.ambition || 0) >= 72) return 'Glory Seekers';
  return 'Tired Survivors';
}
