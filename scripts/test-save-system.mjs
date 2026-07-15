// Headless save-system tests. Run: node scripts/test-save-system.mjs
//
// These exercise the migration/validation/backup/atomic layers against a set of
// realistic and hostile fixtures. They NEVER touch a real browser and operate
// only through an in-memory localStorage polyfill, and assert that the
// production save key is never written during test-key operations.

// --- minimal browser polyfills (must exist before importing saveManager) ----
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i) { return [...this.map.keys()][i] ?? null; }
  get length() { return this.map.size; }
}
const storage = new MemoryStorage();
globalThis.window = { localStorage: storage, location: { search: '' }, addEventListener() {} };
globalThis.localStorage = storage;

const sm = await import('../src/systems/saveManager.js');
const mig = await import('../src/systems/saveMigrations.js');
const aftermath = await import('../src/systems/aftermath.js');
const defence = await import('../src/systems/townDefense.js');
const social = await import('../src/systems/heroSocial.js');
const forts = await import('../src/systems/fortifications.js');

// --- tiny assert harness ----------------------------------------------------
let passed = 0;
let failed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; }
  else { failed += 1; failures.push(name); }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
}

// --- fixtures ---------------------------------------------------------------
function baseValidSave(overrides = {}) {
  return {
    saveVersion: 11,
    day: 5,
    resources: { gold: 650, trust: 40 },
    townRankId: 'garage',
    townStageId: 'garage',
    heroStats: { hero_a: { name: 'A' }, hero_b: { name: 'B' } },
    availableQuests: [],
    postedQuests: [],
    tradeSettings: { preferredExport: 'tradeGoods' },
    cityBuilder: { placedBuildings: [{ id: 'x', gridX: 1, gridY: 1 }], revealed: ['1,1', '1,2'] },
    ...overrides,
  };
}

const FIXTURES = {
  freshLike: baseValidSave(),
  missingTradeSettings: (() => { const s = baseValidSave(); delete s.tradeSettings; return s; })(),
  nullTradeSettings: baseValidSave({ tradeSettings: null }),
  nullProductionRuntime: baseValidSave({ productionRuntime: null }),
  nullHeroEquipment: baseValidSave({ heroStats: { hero_a: { name: 'A', equipment: null } } }),
  inventoryAsArray: baseValidSave({ townInventory: [1, 2, 3] }),
  arraysReplacedByNull: baseValidSave({ availableQuests: null, postedQuests: null, townLog: null }),
  objectReplacedByString: baseValidSave({ resources: 'not-an-object', stats: 42 }),
  malformedOptionalFields: baseValidSave({ pendingPolicy: 'oops', monsterState: [], weekTracker: 7 }),
  malformedResourceDeliveries: baseValidSave({ resourceDeliveries: 'in transit, allegedly' }),
  futureVersion: baseValidSave({ saveVersion: 99, unknownFutureField: { keep: true } }),
  legacyV1: { saveVersion: 1, day: 2, resources: { gold: 100 } },
  bigMap: baseValidSave({ cityBuilder: { placedBuildings: [], revealed: Array.from({ length: 4000 }, (_, i) => `${i % 144},${Math.floor(i / 144)}`) } }),
};

// --- 1. valid + old + null fixtures all migrate to ok -----------------------
for (const [name, fixture] of Object.entries(FIXTURES)) {
  const res = mig.migrateAndValidate(fixture);
  check(`migrate ok: ${name}`, res.ok === true);
}

// --- 2. specific null/shape guarantees --------------------------------------
{
  const r = mig.migrateAndValidate(FIXTURES.nullTradeSettings);
  check('nullTradeSettings stays null (normalizer handles null)', r.data.tradeSettings === null);
}
{
  const r = mig.migrateAndValidate(FIXTURES.inventoryAsArray);
  check('inventory array coerced to null container', r.data.townInventory === null);
}
{
  const r = mig.migrateAndValidate(FIXTURES.arraysReplacedByNull);
  check('null array field -> [] ', Array.isArray(r.data.availableQuests) && r.data.availableQuests.length === 0);
}
{
  const r = mig.migrateAndValidate(FIXTURES.objectReplacedByString);
  check('string resources -> {}', r.data.resources && typeof r.data.resources === 'object' && !Array.isArray(r.data.resources));
}
{
  const r = mig.migrateAndValidate(FIXTURES.malformedOptionalFields);
  check('malformed nullable objects repaired safely',
    r.data.pendingPolicy === null
    && r.data.weekTracker === null
    && r.data.monsterState
    && Array.isArray(r.data.monsterState.activeAttacks)
    && r.data.monsterState.lairs
    && Array.isArray(r.data.monsterState.attackHistory));
}
{
  const r = mig.migrateAndValidate(FIXTURES.malformedResourceDeliveries);
  check('malformed resource deliveries -> []', Array.isArray(r.data.resourceDeliveries) && r.data.resourceDeliveries.length === 0);
}
{
  const r = mig.migrateAndValidate({ saveVersion: 10, stats: null });
  check('v10 extraction defaults added', r.data.stats && r.data.stats.resourceDeliveries === 0 && Array.isArray(r.data.resourceDeliveries));
}
{
  const r = mig.migrateAndValidate({ saveVersion: 11, monsterState: null, heroStats: { mira: { power: 8 } } });
  check('v11 world danger defaults added',
    r.data.saveVersion === mig.SAVE_VERSION
    && Array.isArray(r.data.monsterState.activeAttacks)
    && typeof r.data.monsterState.lairs === 'object'
    && Array.isArray(r.data.monsterState.attackHistory));
  check('v11 hero health defaults added', r.data.heroStats.mira.health === 100 && r.data.heroStats.mira.maxHealth === 100);
}
{
  const r = mig.migrateAndValidate({ saveVersion: 12, monsterState: { aftermathDrops: null, aftermathQuests: 'pending' } });
  check('v12 aftermath defaults added',
    r.data.saveVersion === mig.SAVE_VERSION
    && Array.isArray(r.data.monsterState.aftermathDrops)
    && Array.isArray(r.data.monsterState.aftermathQuests));
}
{
  const r = mig.migrateAndValidate({ saveVersion: 13, monsterState: { defence: null } });
  check('v13 defence defaults added',
    r.data.saveVersion === mig.SAVE_VERSION
    && r.data.monsterState.defence.priority === 'balanced'
    && Array.isArray(r.data.monsterState.defence.alerts)
    && Array.isArray(r.data.monsterState.defence.activeRaids));
}
{
  const r = mig.migrateAndValidate({ saveVersion: 14, heroStats: { h1: { power: 7 } }, heroSocial: null });
  check('v14 hero social defaults added',
    r.data.saveVersion === mig.SAVE_VERSION
    && r.data.heroSocial.nextPartyId === 1
    && Object.keys(r.data.heroSocial.relationships).length === 0
    && r.data.heroStats.h1.socialProfile === null);
}
{
  const r = mig.migrateAndValidate({
    saveVersion: 15,
    cityBuilder: { placedBuildings: [], revealed: ['4,4'] },
    monsterState: { activeAttacks: [{ id: 'raid-1', targetRef: { kind: 'building', id: 'hall' } }] },
  });
  check('v15 expanded-map defaults added',
    r.data.saveVersion === mig.SAVE_VERSION
    && r.data.cityBuilder.mapVersion === 3
    && r.data.cityBuilder.mapDimensions.columns === 216
    && r.data.cityBuilder.mapDimensions.rows === 120
    && Array.isArray(r.data.cityBuilder.fortifications));
  check('v15 siege destination defaults safely', r.data.monsterState.activeAttacks[0].siegeDestinationRef === null);
}
{
  const r = mig.migrateAndValidate(FIXTURES.futureVersion);
  check('future version not downgraded', r.data.saveVersion === 99);
  check('unknown future field preserved', r.data.unknownFutureField && r.data.unknownFutureField.keep === true);
}
{
  const r = mig.migrateAndValidate(FIXTURES.legacyV1);
  check('legacy v1 stamped to current version', r.data.saveVersion === mig.SAVE_VERSION);
}

// --- aftermath records remain deterministic and migration-safe -------------
{
  const record = aftermath.normalizeAftermathRecord({
    id: 'old-corpse',
    kind: 'corpse',
    createdDay: 3,
    expiresDay: 8,
    gold: 12,
  }, 5);
  check('legacy corpse normalizes to typed remains', record.kind === 'remains' && record.lootContents.gold === 12);
  check('aftermath fresh state', aftermath.getDecayState(record, 3).state === 'fresh');
  check('aftermath eventually expires', aftermath.getDecayState(record, 8).expired === true);
  const premiumLoot = aftermath.rollMonsterLoot({ id: 'premium_goblin', threat: 4, reward: 40 }, 2, 0, () => 0.5);
  check('premium monster loot remains typed', premiumLoot.premiumSalvage >= 1 && premiumLoot.gold > 0);
}
{
  const state = defence.normalizeDefenceState({ priority: 'invalid', alerts: null, activeRaids: 'raid' });
  check('defence state repairs malformed containers', state.priority === 'balanced' && Array.isArray(state.alerts) && Array.isArray(state.activeRaids));
  const alerts = defence.upsertAlert([], { actorId: 'm1', level: 'sighting', detectedDay: 2 });
  const escalated = defence.upsertAlert(alerts, { actorId: 'm1', level: 'building', detectedDay: 2 });
  check('defence alerts deduplicate and escalate', escalated.length === 1 && escalated[0].level === 'building');
  check('lair pressure exposes raiding state', defence.getLairPressureState({ pressure: 82 }, 5).id === 'raiding');
  check('suppression overrides lair pressure', defence.getLairPressureState({ pressure: 82, suppressedUntilDay: 8 }, 5).id === 'suppressed');
}
{
  const state = social.normalizeHeroSocialState({ relationships: null, parties: [], events: 'bad' });
  const a = social.normalizeHeroProfile(null, { id: 'a', name: 'A', personality: 'Veteran', stats: { power: 9, gold: 20 } }, 3);
  const b = social.normalizeHeroProfile(null, { id: 'b', name: 'B', personality: 'Recruit', stats: { power: 2 } }, 3);
  check('social state repairs malformed containers', Object.keys(state.relationships).length === 0 && Object.keys(state.parties).length === 0 && state.events.length === 0);
  social.applyRelationshipEvent(state, 'a', 'b', 'rescue', { day: 4, location: 'Market' });
  check('rescue creates directed life debt memory', social.getRelationship(state, 'a', 'b').debt === 22 && social.getRelationship(state, 'a', 'b').memories[0].severity === 4);
  social.applyRelationshipEvent(state, 'a', 'b', 'loot_stolen', { day: 5 });
  social.fadeMinorRelationships(state, 30);
  check('major betrayal survives relationship fading', social.getRelationship(state, 'a', 'b').memories.some((memory) => memory.eventId === 'loot_stolen'));
  const party = social.createParty(state, 'a', ['b'], 5);
  a.partyId = party.id;
  b.partyId = party.id;
  social.computePartyCohesion(state, party, { a, b });
  check('party persists members and explained cohesion', party.memberIds.length === 2 && Number.isFinite(party.cohesion) && party.cohesionReasons.length > 0);
  const previousPolicy = party.lootPolicy;
  social.cyclePartyPolicy(party, 'lootPolicy', social.LOOT_POLICIES);
  check('party loot policy cycles', party.lootPolicy !== previousPolicy);
  const cohesiveState = social.normalizeHeroSocialState();
  const cohesiveParty = social.createParty(cohesiveState, 'a', ['b'], 2);
  for (let i = 0; i < 7; i += 1) social.applyRelationshipEvent(cohesiveState, 'a', 'b', 'quest_success', { day: 2 + i, reciprocal: true });
  const friendlyCohesion = social.computePartyCohesion(cohesiveState, cohesiveParty, { a, b }).value;
  check('shared victories create useful party bonus', friendlyCohesion >= 60 && social.getPartyBonus(cohesiveParty).quest > 0);
  for (let i = 0; i < 4; i += 1) social.applyRelationshipEvent(cohesiveState, 'a', 'b', 'loot_stolen', { day: 10 + i });
  const rivalCohesion = social.computePartyCohesion(cohesiveState, cohesiveParty, { a, b }).value;
  check('rivalry lowers party cohesion', rivalCohesion < friendlyCohesion);
  const promised = social.normalizeHeroProfile({ contract: { promises: [{ type: 'equipment', dueDay: 9, fulfilled: false }] } }, { id: 'p', stats: {} }, 2);
  check('contract promises survive normalization', promised.contract.promises.length === 1 && promised.contract.promises[0].dueDay === 9);
  a.career.quests = 8;
  a.career.kills = 3;
  check('career progression derives from achievements', social.getCareerStage(a).id !== 'recruit');
}

// --- connected fortification topology and siege rules ---------------------
{
  const malformed = forts.normalizeFortifications([
    { id: 'a', type: 'unknown', x: -2, y: 3, health: -9 },
    { id: 'duplicate', type: 'stone_wall', x: 0, y: 3 },
    null,
  ]);
  check('fortification normalization repairs malformed entries and duplicate cells',
    malformed.length === 2
    && malformed[0].type === 'palisade'
    && malformed[0].x === 0
    && malformed[0].state === 'breached');

  const line = Array.from({ length: 100 }, (_, x) => forts.normalizeFortification({ id: `wall-${x}`, type: 'palisade', x, y: 8 }));
  const index = new Map(line.map((entry) => [forts.fortificationKey(entry.x, entry.y), entry]));
  check('100 connected wall sections normalize within supported cap', line.length === 100);
  check('wall adjacency identifies endpoint and straight variants',
    forts.getFortificationVariant(forts.getFortificationMask(index, 0, 8)) === 'endpoint'
    && forts.getFortificationVariant(forts.getFortificationMask(index, 50, 8)) === 'straight');

  const center = forts.normalizeFortification({ id: 'center', type: 'palisade', x: 4, y: 4 });
  const neighbors = [
    forts.normalizeFortification({ id: 'n', type: 'palisade', x: 4, y: 3 }),
    forts.normalizeFortification({ id: 'e', type: 'palisade', x: 5, y: 4 }),
    forts.normalizeFortification({ id: 's', type: 'palisade', x: 4, y: 5 }),
    forts.normalizeFortification({ id: 'w', type: 'palisade', x: 3, y: 4 }),
  ];
  const allMaskNames = new Set();
  for (let expected = 0; expected < 16; expected += 1) {
    const entries = [center, ...neighbors.filter((_, index) => expected & (1 << index))];
    const maskIndex = new Map(entries.map((entry) => [forts.fortificationKey(entry.x, entry.y), entry]));
    const actual = forts.getFortificationMask(maskIndex, 4, 4);
    allMaskNames.add(forts.getFortificationMaskName(actual));
    check(`fortification adjacency mask ${expected}`, actual === expected);
  }
  check('all 16 fortification mask names are distinct', allMaskNames.size === 16);

  const horizontal = forts.getDominantAxisLine({ x: 2, y: 2 }, { x: 8, y: 5 });
  const vertical = forts.getDominantAxisLine({ x: 8, y: 8 }, { x: 6, y: 2 });
  check('dominant-axis drag produces clean horizontal line', horizontal.length === 7 && horizontal.every((spot) => spot.y === 2));
  check('dominant-axis drag produces clean vertical line', vertical.length === 7 && vertical.every((spot) => spot.x === 8));

  const roadWall = forts.normalizeFortification({ id: 'road-wall', type: 'palisade', x: 4, y: 1 });
  check('gate replacement requires wall and preserved road',
    forts.canReplaceWallWithGate(roadWall, 'gate', true)
    && !forts.canReplaceWallWithGate(roadWall, 'gate', false));
  const replacement = forts.replaceWallWithGate(roadWall, 'gate');
  check('gate replacement retains identity and coordinates',
    replacement.id === roadWall.id && replacement.x === roadWall.x && replacement.y === roadWall.y && replacement.open);
  check('open and closed gates have distinct passability',
    !forts.isFortificationBlocking(replacement)
    && forts.isFortificationBlocking(forts.normalizeFortification({ ...replacement, open: false, construction: 1 })));
  check('gate closure safety rejects an occupied collision cell',
    forts.canCloseGateSafely(0) && !forts.canCloseGateSafely(1));

  const replacementLine = [
    forts.normalizeFortification({ id: 'replacement-left', type: 'palisade', x: 3, y: 1 }),
    replacement,
    forts.normalizeFortification({ id: 'replacement-right', type: 'palisade', x: 5, y: 1 }),
  ];
  const replacementIndex = new Map(replacementLine.map((entry) => [forts.fortificationKey(entry.x, entry.y), entry]));
  replacementIndex.delete(forts.fortificationKey(replacement.x, replacement.y));
  check('gate removal refreshes neighboring wall topology',
    forts.getFortificationMask(replacementIndex, 3, 1) === 0
    && forts.getFortificationMask(replacementIndex, 5, 1) === 0);

  const ring = [];
  for (let x = 1; x <= 5; x += 1) {
    ring.push(forts.normalizeFortification({ id: `top-${x}`, type: 'stone_wall', x, y: 1 }));
    ring.push(forts.normalizeFortification({ id: `bottom-${x}`, type: 'stone_wall', x, y: 5 }));
  }
  for (let y = 2; y <= 4; y += 1) {
    ring.push(forts.normalizeFortification({ id: `left-${y}`, type: 'stone_wall', x: 1, y }));
    ring.push(forts.normalizeFortification({ id: `right-${y}`, type: 'stone_wall', x: 5, y }));
  }
  const closed = forts.computePerimeter(8, 8, ring, [{ id: 'hall', gridX: 3, gridY: 3 }]);
  check('closed wall ring identifies protected interior and building',
    closed.complete && closed.inside.has('3,3') && closed.protectedBuildings[0]?.id === 'hall');

  const gateRing = ring.map((entry) => entry.id === 'top-3'
    ? forts.normalizeFortification({ ...entry, type: 'gate', open: true })
    : entry);
  const open = forts.computePerimeter(8, 8, gateRing, [{ id: 'hall', gridX: 3, gridY: 3 }]);
  check('open gate makes the perimeter traversable and exposed', !open.complete && open.inside.size === 0);

  const breachedRing = ring.map((entry) => entry.id === 'top-3'
    ? forts.normalizeFortification({ ...entry, health: 0 })
    : entry);
  const breachedPerimeter = forts.computePerimeter(8, 8, breachedRing, [{ id: 'hall', gridX: 3, gridY: 3 }]);
  check('breached wall recalculates perimeter as incomplete',
    !breachedPerimeter.complete && breachedPerimeter.breached.length === 1 && breachedPerimeter.inside.size === 0);

  const gate = forts.normalizeFortification({ id: 'gate', type: 'gate', x: 3, y: 1, open: false, health: 10 });
  const hit = forts.damageFortification(gate, 40, 8, 'Goblin Raider');
  check('siege damage creates a passable breach with capped history',
    hit.breached && gate.state === 'breached' && !forts.isFortificationBlocking(gate) && gate.recentAttacks.length === 1);
  forts.repairFortification(gate, Infinity, 9, 'repair-hero');
  check('breach repair restores intact blocking state', gate.state === 'intact' && gate.health === gate.maxHealth && forts.isFortificationBlocking(gate));

  const openPassage = forts.normalizeFortification({ id: 'open-passage', type: 'gate', x: 3, y: 4, open: true });
  const breachedPassage = forts.normalizeFortification({ id: 'breach-passage', type: 'stone_wall', x: 7, y: 4, health: 0 });
  check('monster passage choice prefers nearby open gate or breach',
    forts.chooseFortificationPassage([openPassage, breachedPassage], { x: 1, y: 4 }, { x: 9, y: 4 })?.id === 'open-passage');

  const weakGate = forts.normalizeFortification({ id: 'weak-gate', type: 'gate', x: 4, y: 4, open: false, health: 20 });
  const strongWall = forts.normalizeFortification({ id: 'strong-wall', type: 'stone_wall', x: 5, y: 4 });
  check('siege target choice prefers a weak nearby gate',
    forts.chooseFortificationTarget([strongWall, weakGate], { x: 3, y: 4 }, { x: 8, y: 4 }, 'goblin_raider')?.id === 'weak-gate');

  const stress = Array.from({ length: 150 }, (_, index) => forts.normalizeFortification({
    id: `stress-${index}`, type: index % 3 ? 'palisade' : 'stone_wall', x: index % 50, y: 10 + Math.floor(index / 50),
  }));
  check('150-segment fixture stays normalized and indexed',
    forts.normalizeFortifications(stress).length === 150
    && new Map(stress.map((entry) => [forts.fortificationKey(entry.x, entry.y), entry])).size === 150);
}

// --- 3. corrupted JSON opens the failure path -------------------------------
check('corrupted JSON -> ok:false', sm.loadAndMigrate('{ this is not json').ok === false);
check('empty string -> ok:false', sm.loadAndMigrate('').ok === false);
check('primitive save -> ok:false', mig.migrateAndValidate(42).ok === false);
check('null save -> ok:false', mig.migrateAndValidate(null).ok === false);

// --- 4. import parsing (bundle + bare) --------------------------------------
{
  const bundle = sm.buildExportBundle(FIXTURES.freshLike, { some: 'pref' });
  const parsed = sm.parseImportedSave(JSON.stringify(bundle));
  check('import bundle ok', parsed.ok === true);
  check('import bundle preferences carried', parsed.preferences && parsed.preferences.some === 'pref');
  check('import bare save ok', sm.parseImportedSave(JSON.stringify(FIXTURES.freshLike)).ok === true);
  check('import garbage rejected', sm.parseImportedSave('not json').ok === false);
}

// --- 5. atomic write + backup ring + restore, on the TEST KEY only ----------
storage.clear();
// Seed a known production save and remember its exact bytes.
const PROD_SNAPSHOT = JSON.stringify(baseValidSave({ day: 999, townRankId: 'renowned' }));
storage.setItem(sm.PROD_SAVE_KEY, PROD_SNAPSHOT);

const TEST_KEY = sm.TEST_SAVE_KEY;
const w1 = sm.writeSaveAtomic(TEST_KEY, baseValidSave({ day: 1 }));
check('atomic write #1 ok', w1.ok === true);
check('temp key cleaned up', storage.getItem(sm.TEMP_SAVE_KEY) === null);

sm.createBackup(TEST_KEY, 'manual');
sm.writeSaveAtomic(TEST_KEY, baseValidSave({ day: 2 }));
sm.createBackup(TEST_KEY, 'manual');
sm.writeSaveAtomic(TEST_KEY, baseValidSave({ day: 3 }));
sm.createBackup(TEST_KEY, 'manual');
sm.writeSaveAtomic(TEST_KEY, baseValidSave({ day: 4 }));
sm.createBackup(TEST_KEY, 'manual');

const ring = sm.listBackups();
check('backup ring capped at 3', ring.length === 3);
check('backup ring newest-first', Number(ring[0].meta.day) > Number(ring[2].meta.day));

// Restore the oldest kept backup and confirm the active TEST key changed.
const restore = sm.restoreBackup(2, TEST_KEY);
check('restore backup ok', restore.ok === true);

// Atomic write refuses an unserializable payload without harming current save.
const currentTest = storage.getItem(TEST_KEY);
const circular = {}; circular.self = circular;
const badWrite = sm.writeSaveAtomic(TEST_KEY, circular);
check('unserializable write rejected', badWrite.ok === false);
check('test save intact after rejected write', storage.getItem(TEST_KEY) === currentTest);

// safeReset backs up then clears ONLY the test key.
sm.safeReset(TEST_KEY);
check('safeReset cleared test key', storage.getItem(TEST_KEY) === null);

// --- 6. THE GUARANTEE: production key never changed during test ops ---------
check('PRODUCTION save key byte-for-byte unchanged', storage.getItem(sm.PROD_SAVE_KEY) === PROD_SNAPSHOT);

// --- 7. broken-save stash is recoverable, never lost ------------------------
sm.stashBrokenSave('{corrupt', 'test-reason');
const broken = sm.readBrokenSave();
check('broken save stashed and readable', broken && broken.payload === '{corrupt' && broken.reason === 'test-reason');

// --- summary ----------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failures:', failures.join(', '));
  process.exit(1);
}
