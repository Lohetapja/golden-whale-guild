// The town map: terrain, buildings, wandering heroes, and the day simulation.
// All important game objects resolve their texture through src/assets.js so
// real sprites can replace placeholder art without touching this file.
import Phaser from 'phaser';
import { BUILDINGS } from '../data/buildings.js';
import { DECORATIONS } from '../data/decorations.js';
import { HEROES } from '../data/heroes.js';
import { rollHeroEvent, WHALE_FLAVOR } from '../data/events.js';
import { OBJECTIVES } from '../data/objectives.js';
import { rollQuestNotices } from '../data/quests.js';
import { EXPLORATION_POINTS } from '../data/explorationPoints.js';
import {
  BUILDING_CATALOG,
  BUILD_MENU_CATEGORIES,
  getBaseBuildingId,
  getBuildingCatalogEntry,
} from '../data/buildingCatalog.js';
import {
  BUILDING_SATIRE_LINES,
  DISTRICT_BONUSES,
  getBuildingRole,
  getBuildingSpecializations,
} from '../data/buildingSystems.js';
import { ASSET_MANIFEST } from '../data/assetManifest.js';
import { getItemByName, getRandomPremiumItem } from '../data/itemCatalog.js';
import { MONSTERS, rollMonster } from '../data/monsters.js';
import { getSatireLine } from '../data/satireText.js';
import {
  buildRevealedTiles,
  createGridState,
  FOG_REVEAL_RADIUS,
  getFootprintCells,
  gridKey,
  gridToWorld,
  GRID_CONFIG,
  GRID_WORLD,
  isInsideGrid,
  revealCircle,
  makeLegacyCityState,
  normalizeCityState,
  occupyBuildingCells,
  ROAD_TYPES,
  worldToGrid,
} from '../data/grid.js';
import { generateHeroName } from '../data/nameGenerator.js';
import {
  applyTownLayout,
  BUILDING_LAYOUT,
  DECORATION_LAYOUT,
  DISTRICTS,
  LAYOUT_CONSTANTS,
  TOWN_PATH_LINKS,
  TOWN_PATH_NODES,
  TOWN_WORLD,
} from '../data/townLayout.js';
import {
  DENIED_LINES,
  EXPLORATION_LINES,
  IDLE_QUIPS,
  QUEUE_LINES,
  RNGEESUS_LINES,
  THREAT_REACTIONS,
  WHALE_REACTIONS,
} from '../data/dialogue.js';
import {
  getUpgradeCost,
  getUpgradeDef,
  getUpgradeEffect,
  getUpgradeFlavor,
} from '../data/upgrades.js';
import { loadAssets, ensureFallbacks, resolveTexture, buildingTexture, heroTexture } from '../assets.js';
import {
  getRoadMask,
  getRoadSurfaceRect,
  getRoadVariant,
  isRoadPlazaTile,
} from '../systems/roadRenderer.js';
import { resolveInteractionTarget } from '../systems/interactionResolver.js';
import {
  formatInventoryLine,
  getBedCapacity,
  normalizeInventory,
  POI_RESOURCE_YIELDS,
  RESOURCE_TYPES,
  REST_BUILDINGS,
  SERVICE_WALKERS,
  WALKER_DAILY_CAPS,
} from '../systems/townEconomy.js';
import {
  BASE_STORAGE_CAP,
  CARRIER_CONFIG,
  EXTRACTION_BUILDINGS,
  EXTRACTION_IDS,
  EXTRACTION_PRIORITIES,
  EXTRACTION_RANGE_TILES,
  FRONTIER_BUILD_SURCHARGE,
  STORED_RESOURCES,
  STOREHOUSE_CAP_PER_LEVEL,
  TERRITORY_RADIUS,
  normalizeExtractionRuntime,
  normalizeNodeRuntime,
} from '../systems/extraction.js';
import {
  DEFAULT_RECIPE_BY_BUILDING,
  EQUIPMENT_QUALITY,
  formatResourceAmountMap,
  getRankForScore,
  hasRecipeInputs,
  HERO_SUPPLY_RESOURCES,
  normalizeHeroEquipment,
  normalizeProductionRuntime,
  normalizeTradeSettings,
  PROCESSED_RESOURCES,
  PRODUCTION_PRIORITIES,
  RECIPES_BY_BUILDING,
  RECIPE_BY_ID,
  RESOURCE_BY_ID,
  RESOURCE_CATALOG,
  TOWN_RANKS,
  TRADE_PRICES,
} from '../systems/production.js';
import {
  getLairBlueprint,
  getMonsterRuntimeStats,
  getSpawnIntervalDays,
  MONSTER_STATES,
  normalizeLairs,
  normalizeMonsterRecord,
  scoreAggroTarget,
  WORLD_DANGER_LIMITS,
} from '../systems/worldDanger.js';
import {
  AFTERMATH_LIMITS,
  formatLootContents,
  getAftermathFlavor,
  getDecayState,
  getRemainsProfile,
  normalizeAftermathRecord,
  rollMonsterLoot,
} from '../systems/aftermath.js';
import {
  ALERT_LEVELS,
  DEFENCE_LIMITS,
  DEFENCE_PRIORITIES,
  DETECTOR_PROFILES,
  estimateDangerLabel,
  getLairPressureState,
  getNextDefencePriority,
  normalizeDefenceState,
  upsertAlert,
} from '../systems/townDefense.js';
import {
  CAREER_STAGES,
  LOOT_POLICIES,
  RISK_POLICIES,
  applyRelationshipEvent,
  chooseFaction,
  computePartyCohesion,
  createParty,
  cyclePartyPolicy,
  describeRelationship,
  fadeMinorRelationships,
  getCareerStage,
  getHeroExpectations,
  getPartyBonus,
  getRelationship,
  normalizeHeroProfile,
  normalizeHeroSocialState,
  recordSocialEvent,
} from '../systems/heroSocial.js';
import {
  applyImportedSave,
  buildExportBundle,
  createBackup,
  downloadTextFile,
  exportFilename,
  getActiveSaveKey,
  isTestSaveMode,
  listBackups,
  loadActiveSave,
  maybeCreateDailyBackup,
  parseImportedSave,
  pickSaveFile,
  readBrokenSave,
  readRawSave,
  restoreBackup,
  safeReset,
  stashBrokenSave,
  SAVE_VERSION,
  UI_PREFS_KEY,
  writeSaveAtomic,
} from '../systems/saveManager.js';
import { getResponsiveUi } from '../ui/responsive.js';
import {
  getIsoDepth,
  getIsoDiamondPoints,
  getIsoFootprintPolygon,
  getIsoTileCenter,
  isoToGrid,
  USE_ISO_RENDERING,
} from '../utils/isometric.js';
import {
  getBuildingEntranceAnchor,
  getBuildingFootprintMetrics,
  getBuildingHitPolygon,
  getBuildingSpriteScale,
  getBuildingWorldAnchor,
} from '../utils/buildingVisuals.js';

const WIDTH = 1280;
const HEIGHT = 720;
const PLAZA = TOWN_WORLD.plaza;
const CAMERA_MAX_ZOOM = 2;
const CAMERA_DEFAULT_ZOOM = 0.72;
const CAMERA_HOME_ZOOM = 0.72;
const ISO_TILE_WIDTH = 64;
const ISO_TILE_HEIGHT = 32;
const ISO_RENDER_OPTIONS = {
  originX: GRID_CONFIG.originX + (GRID_CONFIG.rows - 1) * (ISO_TILE_WIDTH / 2) - 16,
  originY: GRID_CONFIG.originY + 24,
  tileWidth: ISO_TILE_WIDTH,
  tileHeight: ISO_TILE_HEIGHT,
};
const BUILDER_WORLD_PADDING = 240;
const BUILDER_WORLD_BOUNDS = {
  width: Math.max(
    GRID_WORLD.width,
    ISO_RENDER_OPTIONS.originX + GRID_CONFIG.columns * (ISO_TILE_WIDTH / 2) + BUILDER_WORLD_PADDING,
  ),
  height: Math.max(
    GRID_WORLD.height,
    ISO_RENDER_OPTIONS.originY + (GRID_CONFIG.columns + GRID_CONFIG.rows) * (ISO_TILE_HEIGHT / 2) + BUILDER_WORLD_PADDING,
  ),
};
const EXPLORATION_CHANCE = 0.22;
const ROAD_WIDTH = LAYOUT_CONSTANTS.ROAD_WIDTH;
const NPC_SCALE = LAYOUT_CONSTANTS.NPC_SCALE;
const LABEL_FONT_SIZE = LAYOUT_CONSTANTS.LABEL_FONT_SIZE;
const SMALL_LABEL_FONT_SIZE = LAYOUT_CONSTANTS.SMALL_LABEL_FONT_SIZE;
const STEP_MS = 950; // pacing of the day-cycle playback
const MAX_IDLE_BUBBLES = 2;
const MAX_IMPORTANT_BUBBLES = 4;
const BUBBLE_MIN_SPACING = 150;
const IDLE_BUBBLE_DURATION_MS = 4600;
const IMPORTANT_BUBBLE_DURATION_MS = 5600;
const MAX_FLOATING_TEXTS = 12;
const COIN_BURST_COOLDOWN_MS = 450;
// Save keys, versioning, and persistence now live in ../systems/saveManager.js.
// SAVE_VERSION is imported; the active key is resolved per-session via
// getActiveSaveKey() so automated tests never touch the production save.
const TAP_MOVE_THRESHOLD = 14;
const SIMULATION_DAY_MS = 45000;
const HERO_LABEL_DEFAULT_ALPHA = 0;
const HERO_LABEL_FOCUS_ALPHA = 0.96;
const HERO_LABEL_EVENT_ALPHA = 0.82;
const PRIMARY_LABEL_IDS = new Set(['whale', 'guildhall', 'dungeon']);
const DEFAULT_SPECIAL_LABEL_IDS = new Set(['notice_board', 'complaint_barrel']);
const COMPACT_SPECIAL_LABEL_IDS = new Set(['notice_board']);
const SHOW_MOVEMENT_MARKERS = false;
const ROAD_UPGRADE_ORDER = ['dirt', 'stone', 'premium'];
const NORMAL_GRID_STROKE_ALPHA = 0;
const BUILD_GRID_STROKE_ALPHA = 0.13;
const HERO_ANIMATION_STATES = ['idle', 'walk', 'interact', 'carry', 'hurt', 'happy'];
const HERO_STATE_SUFFIXES = {
  idle: ['idle_default'],
  walk: ['walk_1', 'walk_2', 'walk_3', 'walk_4'],
  interact: ['interact'],
  carry: ['carry'],
  hurt: ['hurt'],
  happy: ['happy'],
};
const LEGACY_BUILDING_IDS = new Set([
  'tavern', 'blacksmith', 'guildhall', 'market', 'training', 'whale', 'dungeon',
]);

// build menu tab id -> PixelLab tab icon manifest key
const BUILD_TAB_ICON_KEYS = {
  roads: 'ui_build_category_roads',
  core: 'ui_build_category_core',
  rest: 'ui_build_category_rest',
  economy: 'ui_build_category_shops',
  production: 'ui_build_category_shops',
  defense: 'ui_build_category_defense',
  premium: 'ui_build_category_premium',
  social: 'ui_build_category_social',
  decorations: 'ui_build_category_decor',
};

const DECOR_BUILD_CATALOG = [
  { id: 'decor_tree', title: 'Tree', assetKey: 'prop_tree', fallbackKey: 'tree', cost: 18, w: 42, h: 56, effect: '+Tiny prestige, softens empty land.', flavor: 'Shade, leaves, and no subscription tier.' },
  { id: 'decor_rock', title: 'Rock', assetKey: 'prop_rock', fallbackKey: 'rock', cost: 8, w: 32, h: 28, effect: '+District texture, legally not a building.', flavor: 'Nature placed it first. The guild sent an invoice.' },
  { id: 'decor_fence', title: 'Fence', assetKey: 'prop_fence', fallbackKey: 'fence_h', cost: 14, w: 44, h: 22, effect: '+District boundary and civic pretending.', flavor: 'Keeps problems aesthetically contained.' },
  { id: 'decor_lamp', title: 'Lamp', assetKey: 'prop_lamp', fallbackKey: 'lamp', cost: 26, w: 28, h: 54, effect: '+Tiny morale near roads.', flavor: 'A light in the dark, billed monthly in spirit.' },
  { id: 'decor_bench', title: 'Bench', assetKey: 'object_bench', fallbackKey: 'table', cost: 22, w: 44, h: 28, effect: '+Tiny morale for heroes waiting on balance.', flavor: 'Public seating, reinforced against discourse.' },
  { id: 'decor_barrel', title: 'Barrel', assetKey: 'prop_barrel', fallbackKey: 'barrel', cost: 12, w: 30, h: 34, effect: '+Market clutter, complaint-adjacent.', flavor: 'Contains supplies, rumors, or both.' },
  { id: 'decor_crate', title: 'Crate', assetKey: 'prop_crate', fallbackKey: 'crate', cost: 12, w: 34, h: 32, effect: '+Trade flavor for markets and workshops.', flavor: 'Full of inventory nobody will reconcile.' },
  { id: 'decor_signpost', title: 'Signpost', assetKey: 'prop_signpost', fallbackKey: 'signpost', cost: 16, w: 30, h: 46, effect: '+Path readability.', flavor: 'Directions for heroes who reject conceptual access.' },
  { id: 'decor_well', title: 'Well', assetKey: 'object_well', fallbackKey: 'rock', cost: 44, w: 48, h: 44, effect: '+Prestige and a hydration alibi.', flavor: 'Fresh water with no premium font.' },
  { id: 'decor_statue', title: 'Statue', assetKey: 'object_statue', fallbackKey: 'rock', cost: 70, w: 46, h: 64, effect: '+Prestige, +future civic arguments.', flavor: 'A monument to whoever funded the plaque.' },
  { id: 'decor_market_stall', title: 'Market Stall', assetKey: 'object_market_stall', fallbackKey: 'table', cost: 38, w: 58, h: 46, effect: '+Market district identity.', flavor: 'Pop-up commerce with pop-up ethics.' },
  { id: 'decor_rope_barrier', title: 'Rope Barrier', assetKey: 'object_rope_barrier', fallbackKey: 'fence_h', cost: 35, w: 52, h: 24, effect: '+Premium district identity, +suspicion.', flavor: 'Soft security for hard exclusivity.' },
  { id: 'decor_premium_lamp', title: 'Premium Lamp', assetKey: 'object_lamp_premium', fallbackKey: 'lamp', cost: 48, w: 30, h: 58, effect: '+Prestige, +tiny corruption.', flavor: 'The light is free. The glow is licensed.' },
];

const DECOR_BUILD_BY_ID = Object.fromEntries(DECOR_BUILD_CATALOG.map((entry) => [entry.id, entry]));

// Small, owned role accents. They reinforce a building's purpose without
// becoming independent click targets or surviving a move/delete operation.
const BUILDING_VISUAL_ATTACHMENTS = {
  warehouse: [
    { key: 'object_crate_stack', fallback: 'crate', x: -46, y: 2, height: 30 },
    { key: 'object_cart', fallback: 'crate', x: 48, y: 3, height: 28 },
  ],
  storehouse: [
    { key: 'object_crate_stack', fallback: 'crate', x: -38, y: 2, height: 27 },
    { key: 'prop_barrel', fallback: 'barrel', x: 38, y: 2, height: 24 },
  ],
  premium_fabricator: [
    { key: 'object_brazier', fallback: 'lamp', x: -50, y: 1, height: 31 },
    { key: 'object_contract_stack', fallback: 'crate', x: 49, y: 2, height: 24 },
  ],
  frontier_outpost: [
    { key: 'prop_signpost', fallback: 'signpost', x: -39, y: 1, height: 31 },
    { key: 'prop_crate', fallback: 'crate', x: 39, y: 2, height: 23 },
  ],
  lumber_camp: [
    { key: 'object_cart', fallback: 'crate', x: 38, y: 2, height: 27 },
  ],
  mining_camp: [
    { key: 'prop_crate', fallback: 'crate', x: 36, y: 2, height: 23 },
  ],
  herbalist_hut: [
    { key: 'object_bush', fallback: 'flowers', x: 35, y: 2, height: 25 },
  ],
  salvage_camp: [
    { key: 'object_crate_stack', fallback: 'crate', x: 38, y: 2, height: 27 },
  ],
  roadside_ad_board: [
    { key: 'object_coin_pile', fallback: 'ph-icon_coin', x: 22, y: 2, height: 15 },
  ],
};

const RESOURCE_THRESHOLDS = {
  trustWarning: 34,
  trustCritical: 20,
  corruptionWarning: 66,
  corruptionCritical: 86,
  moraleWarning: 34,
  moraleCritical: 20,
  threatWarning: 76,
  threatCritical: 90,
};

const BALANCE = {
  startingResources: { gold: 650, trust: 66, corruption: 8, morale: 62, threat: 18 },
  passiveThreatBase: [3, 6],
  goldenWhaleBaseIncome: 165,
  goldenWhaleLevelIncome: 82,
  goldenWhaleTrustLoss: [2, 4],
  goldenWhaleCorruptionGain: [3, 6],
  policyInterval: 3,
  weekLength: 7,
  policyNeglectDelay: 2,
  monsterBaseDailyChance: 0.08,
};

const HERO_GROUPS = {
  honest: ['Honest Grinder', 'Broke Optimist', 'Free Trial Paladin', 'Disillusioned Blacksmith'],
  whale: ['Noble Whale', 'Whale Apprentice', 'Premium Monk', 'Overleveled Toddler'],
  debt: ['Debt Goblin', 'Debt Collector', 'Bankrupt Bard', 'Refund Seeker'],
  veteran: ['Veteran', 'Angry Veteran', 'Balance Refugee', 'Ragequitter'],
};

const RES_COLORS = {
  gold: '#f6c945',
  trust: '#7fdc93',
  corruption: '#c99aec',
  morale: '#f0938f',
  threat: '#d4dae2',
};
const RES_SHORT = { gold: 'g', trust: ' Trust', corruption: ' Corr', morale: ' Morale', threat: ' Threat' };

const LOCKABLE_LOCATION_IDS = new Set([
  'complaint_barrel',
  'debt_collector_booth',
  'balance_memorial',
  'refund_denial_desk',
  'sponsored_quest_board',
  'ethics_fountain',
  'ethics_laundromat',
  'premium_temple',
  'patch_notes_shrine',
  'hero_union_tent',
]);

const START_UNLOCKED_LOCATIONS = [
  'notice_board',
  'vip_rope_entrance',
  'poor_hero_queue',
];

const WHALE_PURCHASES = [
  'Sword of Unfair Advantage',
  'Deluxe Struggle Removal Bundle',
  'Premium Knees',
  'Loot Priority Blessing',
  'Revive Insurance Scroll',
  'Dragon Mount Trial',
  'Confidence Booster Soup',
  'Legendary Receipt',
  'Sponsored Armor of Plausible Skill',
  'Queue Skip Relic',
];

const TOWN_STAGES = [
  {
    id: 'garage',
    name: 'Garage Guild',
    message: 'A tiny guild with big invoices and no adult supervision.',
    requirement: () => true,
  },
  {
    id: 'startup',
    name: 'Questionable Startup',
    message: 'The town upgraded from questionable idea to questionable institution.',
    requirement: (scene) => scene.day >= 5 && scene.getUpgradedPlaceCount() >= 2,
  },
  {
    id: 'hub',
    name: 'Sponsored Adventurer Hub',
    message: 'Investors arrived. Citizens hid the chairs.',
    requirement: (scene) => (
      scene.stats.questsPosted >= 5
      && scene.stats.totalGoldEarned >= 3000
      && (
        scene.getPlaceLevel(scene.buildingById.whale) >= 2
        || scene.getPlaceLevel(scene.buildingById.guildhall) >= 3
      )
    ),
  },
  {
    id: 'whale_economy',
    name: 'Whale-Optimized Economy',
    message: 'Your economy is now too shiny to audit.',
    requirement: (scene) => (
      scene.getPlaceLevel(scene.buildingById.whale) >= 4
      && scene.resources.corruption >= 60
      && (scene.stats.crisesSurvived || 0) >= 1
    ),
  },
  {
    id: 'kingdom_problem',
    name: 'Premium Kingdom Problem',
    message: 'The king noticed the whale statue and asked for a cut.',
    requirement: (scene) => (
      scene.day >= 20
      && scene.heroes?.some((hero) => ['Whale Champion', 'Protest Leader'].includes(hero.stats.status))
    ),
  },
];

const ACCOUNTANT_NOTES = [
  'Loss of trust has been reclassified as engagement friction.',
  'Corruption remains within projected sparkle tolerance.',
  'The moral deficit is amortizing beautifully.',
  'Threat exposure increased, but the chart uses heroic colors.',
  'Fairness leakage is down after we stopped measuring it.',
  'Citizen complaints have been bundled into premium insight.',
];

const WEEKLY_REPORT_LINES = [
  'Weekly Report: The town survived, technically.',
  'Weekly Report: Progress detected. Accountability still missing.',
  'Weekly Report: Heroes completed quests, monsters complained, and the economy remained suspicious.',
  'Weekly Report: The guild grew, the ledger sighed, and nobody found the ethics drawer.',
];

const POLICY_NEGLECT_LINES = [
  'The council postponed the issue until it became a feature.',
  'The town ignored the complaint. The complaint gained experience.',
  'No decision was made. Somehow, this was also a decision.',
  'The committee tabled the issue. The table filed for hazard pay.',
];

const MONSTER_WARNING_LINES = [
  'Monster activity near the eastern fog.',
  'Something in the wilderness is reading the town charter aggressively.',
  'Tracks appeared outside town. Several were shaped like poor decisions.',
  'The dungeon coughed politely and sent a visitor.',
];

const MONSTER_VICTORY_LINES = [
  'The monster dropped gold and an apology coupon.',
  'The town called this defense. The monster called it scope creep.',
  'Heroes won. The paperwork survived with minor bite marks.',
  'The attacker retreated after discovering the local economy was already hostile.',
];

const MONSTER_DAMAGE_LINES = [
  'The monster damaged civic confidence and several loose crates.',
  'No hero stopped it in time. The city paid the usual emergency convenience fee.',
  'The attack ended after morale leaked into the road.',
  'The monster left before anyone could upsell it a permit.',
];

const MONSTER_REMAINS_BY_ID = {
  goblin_raider: 'corpse_goblin_remains',
  premium_goblin: 'corpse_goblin_remains',
  queue_demon: 'corpse_goblin_remains',
  skeleton_attacker: 'corpse_skeleton_bones',
  slime: 'corpse_slime_puddle',
  grump_mushroom: 'corpse_slime_puddle',
};

const MONSTER_LOOT_KEYS = [
  'loot_bag_small',
  'coin_pile_small',
  'monster_drop_chest',
  'broken_sword',
  'broken_shield',
  'suspicious_coupon_drop',
];

const PREMIUM_MONSTER_LOOT_KEYS = [
  'loot_bag_premium',
  'monster_drop_chest',
  'suspicious_coupon_drop',
  'coin_pile_small',
];

const LOOT_PICKUP_LINES = [
  'Loot secured. The accounting department called it emergent revenue.',
  'The drop was collected before the odds could be explained.',
  'A hero picked through the remains and found fiscal closure.',
  'The loot bag contained gold, dust, and a small moral waiver.',
];

const TOWN_IDENTITIES = {
  fair: {
    name: 'Fair Guild With Suspicious Receipts',
    line: 'Your town is trying to be fair. Investors are nervous.',
  },
  balanced: {
    name: 'Balanced Mess',
    line: 'Everyone is slightly unhappy, which is how balance introduces itself.',
  },
  shady: {
    name: 'Shady Growth Engine',
    line: 'Your town has confused profit with governance.',
  },
  whale: {
    name: 'Whale Economy',
    line: 'Your town is now mostly glow effects and debt.',
  },
  collapse: {
    name: 'Collapse Startup',
    line: 'The business model is sprinting faster than the town.',
  },
};

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Golden Whale Guild',
    body: 'Build a town. Exploit whales. Pretend this was balanced.',
    next: 'Find Work',
  },
  {
    id: 'quests',
    title: 'Find the Notice Board',
    body: 'Post quests so heroes have something dangerous and legally deniable to do.',
    target: 'openQuests',
    action: { label: 'Show Quests', event: 'gwg-open-quests' },
  },
  {
    id: 'postQuest',
    title: 'Post One Quest',
    body: 'Each bounty has cost, reward, risk, and consequences. Fair quests steady the town. Sponsored quests smell expensive.',
    target: 'postQuest',
  },
  {
    id: 'openGates',
    title: 'Skip Day',
    body: 'The town runs over time. Skip Day resolves hero actions, quests, nonsense, and consequences immediately.',
    target: 'openGates',
  },
  {
    id: 'ledger',
    title: 'Use the Town Ledger',
    body: 'Upgrade fair buildings for stability or Golden Whale for morally flexible profit.',
    target: 'openLedger',
    action: { label: 'Open Ledger', event: 'gwg-open-ledger' },
  },
  {
    id: 'npc',
    title: 'Inspect a Hero',
    body: 'Heroes remember what happens. Some improve. Some become cautionary tales.',
    target: 'inspectHero',
  },
  {
    id: 'resources',
    title: 'Watch the Resources',
    body: 'Trust keeps honest heroes around. Corruption makes money and problems. Morale affects success. Threat means the dungeon is getting ideas.',
    next: 'Finish Tips',
  },
];

const POLICY_EVENTS = [
  {
    id: 'funding-crisis',
    title: 'Policy Choice: Town Funding Crisis',
    description: 'The guild needs money and has discovered the usual awful shortcuts.',
    options: [
      {
        id: 'fair-grant',
        label: 'Fair Training Grant',
        summary: 'Cost 300g, +Trust, +Morale, honest heroes gain power.',
        deltas: { gold: -300, trust: 8, morale: 7, corruption: -1 },
        hero: (scene) => scene.boostHeroGroup('honest', { power: 1, morale: 4, loyalty: 4 }, 'Benefited from a fair training grant.'),
        text: 'The town funded fair training. Effort briefly got a budget.',
      },
      {
        id: 'sponsored-package',
        label: 'Sponsored Progress Package',
        summary: '+Gold, +Corruption, -Trust, whale heroes gain power.',
        deltas: { gold: 420, trust: -6, corruption: 9, morale: -2 },
        hero: (scene) => scene.boostHeroGroup('whale', { power: 3, fame: 5, corruption: 5 }, 'Received a sponsored progress package.'),
        text: 'Sponsored progress arrived. The fine print arrived first.',
      },
      {
        id: 'do-nothing',
        label: 'Do Nothing',
        summary: 'No cost, Threat rises, citizens judge silently.',
        deltas: { threat: 9, morale: -2 },
        text: 'The guild did nothing. The dungeon considered this consent.',
      },
    ],
  },
  {
    id: 'ethics-hearing',
    title: 'Policy Choice: Golden Whale Ethics Hearing',
    description: 'Citizens ask if the whale is fair. The whale asks if fairness has liquidity.',
    options: [
      {
        id: 'public-apology',
        label: 'Public Apology',
        summary: 'Cost 180g, +Trust, -Corruption, whale profits sulk.',
        deltas: { gold: -180, trust: 7, corruption: -5, morale: 2 },
        text: 'The guild apologized in public. Nobody believed it, but the chairs relaxed.',
      },
      {
        id: 'premium-clarification',
        label: 'Premium Clarification',
        summary: '+Gold, +Corruption, -Trust, whales call it transparency.',
        deltas: { gold: 360, trust: -5, corruption: 8 },
        hero: (scene) => scene.boostHeroGroup('whale', { fame: 4, corruption: 4 }, 'Attended a premium ethics clarification.'),
        text: 'The hearing clarified that premium fairness is still fairness, allegedly.',
      },
      {
        id: 'delay-committee',
        label: 'Delay Committee',
        summary: '+Morale slightly, Threat rises while everyone talks.',
        deltas: { morale: 2, threat: 6 },
        text: 'A committee formed. The dungeon attacked the agenda.',
      },
    ],
  },
  {
    id: 'union-talks',
    title: 'Policy Choice: Hero Union Negotiation',
    description: 'The heroes organized. Someone brought pamphlets and a very tired sword.',
    options: [
      {
        id: 'listen',
        label: 'Listen To Heroes',
        summary: 'Cost 220g, +Trust, +Morale, protest resentment cools.',
        deltas: { gold: -220, trust: 9, morale: 6, corruption: -2 },
        hero: (scene) => scene.coolResentment(12, 'Heard during union talks.'),
        text: 'The guild listened. This radical act confused several accountants.',
      },
      {
        id: 'brand-union',
        label: 'Sponsor The Union',
        summary: '+Gold, +Corruption, protest leaders get angrier.',
        deltas: { gold: 280, trust: -4, corruption: 7, morale: -3 },
        hero: (scene) => scene.raiseResentment(10, 'Saw the union receive tasteful branding.'),
        text: 'The union got a sponsor. The banner now has terms.',
      },
      {
        id: 'ignore-union',
        label: 'Ignore It',
        summary: 'No cost, -Trust, risk of protest growth.',
        deltas: { trust: -7, morale: -4 },
        hero: (scene) => scene.raiseResentment(8, 'Ignored during union talks.'),
        text: 'The guild ignored the union. The pamphlets got louder.',
      },
    ],
  },
  {
    id: 'debt-day',
    title: 'Policy Choice: Debt Forgiveness Day',
    description: 'The debt contracts are multiplying. One clerk suggests mercy and is asked to define ROI.',
    options: [
      {
        id: 'forgive',
        label: 'Forgive Debts',
        summary: 'Cost 260g, +Trust, +Morale, debt heroes recover.',
        deltas: { gold: -260, trust: 8, morale: 8, corruption: -3 },
        hero: (scene) => scene.reduceHeroDebt(160, 'Debt forgiveness day happened. The contracts hissed.'),
        text: 'Debt forgiveness worked. The booth demanded hazard pay.',
      },
      {
        id: 'sell-contracts',
        label: 'Sell Contracts',
        summary: '+Gold, +Corruption, -Morale, debt heroes suffer.',
        deltas: { gold: 390, trust: -5, morale: -7, corruption: 10 },
        hero: (scene) => scene.addDebtToDebtHeroes(140, 'Contract sold to a worse smile.'),
        text: 'The guild sold the contracts. The contracts sold the guild spiritually.',
      },
      {
        id: 'misfile',
        label: 'Misfile Forms',
        summary: 'Small +Trust, small +Threat because paperwork escaped.',
        deltas: { trust: 2, threat: 5 },
        text: 'The debt forms were misfiled. Several became wandering monsters.',
      },
    ],
  },
];

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    loadAssets(this);
  }

  create() {
    // Last-resort safety net: if anything in scene construction throws while
    // consuming a save, do NOT leave a black screen. Stash the offending save
    // and show a DOM recovery panel so the player can restore a backup or start
    // fresh without losing the broken data.
    try {
      this.createTown();
    } catch (err) {
      this.handleCreateFailure(err);
    }
  }

  createTown() {
    ensureFallbacks(this);
    this.rsp = getResponsiveUi();
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(2);

    const saved = this.loadSavedState();
    this.cityState = normalizeCityState(saved, () => makeLegacyCityState(
      BUILDINGS.filter((building) => LEGACY_BUILDING_IDS.has(building.id)).map((building) => ({
        ...building,
        footprint: getBuildingCatalogEntry(building.id)?.footprint,
      })),
      BUILDING_LAYOUT,
    ));
    this.isBuilderCity = this.cityState.mode === 'builder';
    this.gridCells = createGridState(this.cityState);
    for (const placement of this.cityState.placedBuildings) {
      const catalog = getBuildingCatalogEntry(placement.id);
      if (catalog) occupyBuildingCells(this.gridCells, placement, catalog.footprint);
    }
    // fog of war: revealed tiles are the buildable/visible world; old saves
    // migrate their purchased zones, new games start with a small clearing
    this.revealedTiles = buildRevealedTiles(this.cityState, Object.fromEntries(
      this.cityState.placedBuildings.map((placement) => [
        placement.id,
        getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 },
      ]),
    ));
    this.cityState.revealed = [...this.revealedTiles];
    for (const cell of this.gridCells.values()) {
      cell.unlocked = this.revealedTiles.has(gridKey(cell.x, cell.y));
    }
    this.day = saved?.day || 1;
    this.resources = saved?.resources || { ...BALANCE.startingResources };
    this.upgradeLevels = saved?.upgradeLevels || {};
    this.stats = {
      questsPosted: 0,
      questsCompleted: 0,
      totalGoldEarned: 0,
      honestQuestSuccesses: 0,
      threatEventsSurvived: 0,
      trustStreak: 0,
      whaleEvents: 0,
      whaleTrustLosses: 0,
      balanceComplaints: 0,
      crisesSurvived: 0,
      policiesChosen: 0,
      stageUps: 0,
      cyclesOpened: 0,
      guildHallInspected: 0,
      questsAssigned: 0,
      lodgingChecked: 0,
      poiActions: 0,
      lootCollected: 0,
      resourcesCollected: 0,
      roadUpgrades: 0,
      weekReportsRead: 0,
      heroesInspected: 0,
      fairUpgrades: 0,
      shadyUpgrades: 0,
      sponsoredQuests: 0,
      warningEvents: 0,
      questFailures: 0,
      premiumActions: 0,
      monsterAttacks: 0,
      monsterVictories: 0,
      monsterDamageEvents: 0,
      heroInjuries: 0,
      heroesLeft: 0,
      corruptionEvents: 0,
      resourceNodesDiscovered: 0,
      resourceNodesSurveyed: 0,
      extractionCampsBuilt: 0,
      extractionWorkersAssigned: 0,
      resourceDeliveries: 0,
      resourcesSpent: 0,
      ...(saved?.stats || {}),
    };
    this.completedObjectives = new Set(saved?.completedObjectives || []);
    this.townStageId = saved?.townStageId || 'garage';
    this.townRankId = saved?.townRankId || 'camp';
    this.townIdentityId = saved?.townIdentityId || 'balanced';
    this.townLog = Array.isArray(saved?.townLog) ? saved.townLog.slice(-80) : [];
    this.crises = saved?.crises || {};
    this.achievements = new Set(saved?.achievements || []);
    this.pendingPolicy = saved?.pendingPolicy || null;
    this.weeklyReport = saved?.weeklyReport || null;
    this.weekReportUnread = Boolean(saved?.weekReportUnread);
    this.weekTracker = this.normalizeWeekTracker(saved?.weekTracker);
    this.monsterState = {
      lastAttackDay: Number(saved?.monsterState?.lastAttackDay) || 0,
      weekAttackCount: Number(saved?.monsterState?.weekAttackCount) || 0,
      activeAttacks: Array.isArray(saved?.monsterState?.activeAttacks)
        ? saved.monsterState.activeAttacks.slice(0, WORLD_DANGER_LIMITS.maxActiveMonsters)
        : [],
      aftermathDrops: Array.isArray(saved?.monsterState?.aftermathDrops)
        ? saved.monsterState.aftermathDrops.slice(-(AFTERMATH_LIMITS.maxRemains + AFTERMATH_LIMITS.maxLoot))
        : [],
      aftermathQuests: Array.isArray(saved?.monsterState?.aftermathQuests) ? saved.monsterState.aftermathQuests.slice(-24) : [],
      lairs: saved?.monsterState?.lairs && typeof saved.monsterState.lairs === 'object'
        ? structuredClone(saved.monsterState.lairs)
        : {},
      attackHistory: Array.isArray(saved?.monsterState?.attackHistory)
        ? saved.monsterState.attackHistory.slice(-WORLD_DANGER_LIMITS.attackHistoryLimit)
        : [],
      defence: normalizeDefenceState(saved?.monsterState?.defence),
    };
    this.defenceState = this.monsterState.defence;
    this.discoveredPois = new Set(saved?.discoveredPois || []);
    // POI visit cooldowns: poiId -> day it becomes available again
    this.poiCooldowns = saved?.poiCooldowns && typeof saved.poiCooldowns === 'object'
      ? { ...saved.poiCooldowns }
      : {};
    // town stores + service-walker state (walkers regenerate from buildings)
    this.townInventory = normalizeInventory(saved?.townInventory);
    this.tradeSettings = normalizeTradeSettings(saved?.tradeSettings);
    this.productionSummary = {
      producedToday: {},
      consumedToday: {},
      incidents: Array.isArray(saved?.productionIncidents) ? saved.productionIncidents.slice(-8) : [],
    };
    this.areaReputation = this.normalizeAreaReputation(saved?.areaReputation);
    this.townReputation = Number.isFinite(saved?.townReputation) ? saved.townReputation : 50;
    this.townPrestige = Number.isFinite(saved?.townPrestige) ? saved.townPrestige : 0;
    this.serviceWalkers = [];
    this.walkerRotation = 0;
    this.walkerDailyTally = { threatReduction: 0, evangelistGold: 0 };
    // resource extraction: node runtime, visible carriers, and harvested/
    // regrowing forest cells. Nodes lazily hydrate from POI_RESOURCE_YIELDS.
    this.resourceNodes = this.hydrateResourceNodes(saved?.resourceNodes);
    this.carriers = [];
    this.savedResourceDeliveries = Array.isArray(saved?.resourceDeliveries) ? saved.resourceDeliveries.slice(0, 12) : [];
    this.extractionCargoVisuals = {};
    this.harvestedForestCells = new Map(
      Array.isArray(saved?.harvestedForest)
        ? saved.harvestedForest
          .filter((entry) => entry && typeof entry.key === 'string')
          .map((entry) => [entry.key, Number(entry.regrowDay) || 0])
        : [],
    );
    this.activeMonsterActors = [];
    this.monsterLairs = {};
    this.worldDangerClockMs = 0;
    this.worldDangerAiElapsedMs = 0;
    this.defenceScanElapsedMs = 0;
    this.aftermathDrops = this.normalizeAftermathDrops(this.monsterState.aftermathDrops);
    this.aftermathQuests = this.normalizeAftermathQuests(this.monsterState.aftermathQuests);
    this.autonomousExplorerLimit = 2;
    this.tutorial = {
      step: Number(saved?.tutorial?.step) || 0,
      completed: Boolean(saved?.tutorial?.completed),
      skipped: Boolean(saved?.tutorial?.skipped),
    };
    this.cycleReport = null;
    this.unlockedLocations = new Set([
      ...START_UNLOCKED_LOCATIONS,
      ...(saved?.unlockedLocations || []),
    ]);
    this.availableQuests = saved?.availableQuests?.length ? saved.availableQuests : rollQuestNotices(this.day);
    this.postedQuests = saved?.postedQuests || [];
    this.savedHeroStats = saved?.heroStats || {};
    this.heroSocial = normalizeHeroSocialState(saved?.heroSocial);
    this.heroDefinitions = HEROES.map((def) => {
      const savedName = this.savedHeroStats?.[def.id]?.name;
      return {
        ...def,
        name: savedName || (this.isBuilderCity ? generateHeroName(def.personality) : def.name),
      };
    });
    this.cycleRunning = false;
    this.lastUpgradeAt = 0;
    this.simulationSpeed = this.cityState.simulation.speed;
    this.simulationElapsedMs = this.cityState.simulation.elapsedMs;
    this.buildMode = null;
    this.buildPreviewCell = null;
    this.buildMenuCategory = 'core';
    this.storeFilter = 'all';
    this.buildMenuSelectedItemId = 'guildhall';
    this.buildMenuSelectionByCategory = { core: 'guildhall' };

    this.buildings = this.applyBuildingPlacements(applyTownLayout(BUILDINGS, BUILDING_LAYOUT));
    this.decorations = this.applyBuilderDecorationState(applyTownLayout(DECORATIONS, DECORATION_LAYOUT));
    this.worldInteractionTargets = [];
    this.hoveredWorldTarget = null;
    this.pathNodes = TOWN_PATH_NODES;
    this.pathLinks = TOWN_PATH_LINKS;
    this.pathNodeById = Object.fromEntries(this.pathNodes.map((node) => [node.id, node]));

    // builder cities live on the full expandable grid; the legacy town keeps
    // its original hand-placed world so nothing floats in empty space
    this.worldWidth = this.isBuilderCity ? BUILDER_WORLD_BOUNDS.width : TOWN_WORLD.width;
    this.worldHeight = this.isBuilderCity ? BUILDER_WORLD_BOUNDS.height : TOWN_WORLD.height;
    this.setupCameraControls();
    const refreshResponsiveState = () => {
      this.rsp = getResponsiveUi();
    };
    window.addEventListener('resize', refreshResponsiveState);
    window.addEventListener('orientationchange', refreshResponsiveState);

    this.buildTerrain();
    this.buildGridLayer();
    this.buildBuildings();
    this.buildDecorations();
    this.buildExplorationPoints();
    this.initializeWorldDanger();
    this.buildAftermathDrops();
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));
    this.placeById = { ...this.buildingById, ...this.decorationById, ...this.explorationPointById };
    this.upgradeVisualsById = {};
    this.refreshAllUpgradeVisuals();
    this.activeBubbles = 0;
    this.importantChatterUntil = 0;
    this.floaters = [];
    this.lastCoinBurstAt = -COIN_BURST_COOLDOWN_MS;
    this.buildTooltip();
    this.buildHeroes();
    this.restoreActiveMonsterActors();
    this.restoreDefenceAssignments();
    this.buildQuestNotices();
    this.setupBuildInput();
    this.startIdleChatter();
    this.startServiceWalkers();
    this.restoreExtractionAssignments();
    this.refreshExtractionCargoVisuals();
    this.restoreResourceDeliveries();

    // shared state for the UI scene
    this.registry.set('day', this.day);
    this.registry.set('resources', { ...this.resources });
    this.registry.set('townStage', this.getCurrentStage().name);
    this.registry.set('townIdentity', this.getTownIdentity().name);
    this.registry.set('simulationSpeed', this.simulationSpeed);
    this.publishHeroRoster();
    this.updateTownNotice();
    this.publishObjectives();
    this.publishTownHint();
    this.checkUnlocks(true);
    this.checkStageProgression(true);
    this.checkTownRankProgression(true);
    this.checkTownIdentity(true);

    this.scene.launch('UIScene');
    this.game.events.on('gwg-end-day', this.runCycle, this);
    this.game.events.on('gwg-save', this.saveGame, this);
    this.game.events.on('gwg-reset', this.resetGame, this);
    this.game.events.on('gwg-open-save-manager', this.openSaveManagerPanel, this);
    this.game.events.on('gwg-open-backups', this.openBackupsPanel, this);
    this.game.events.on('gwg-save-export', this.exportSaveFromUi, this);
    this.game.events.on('gwg-save-import', this.importSaveFromUi, this);
    this.game.events.on('gwg-save-import-confirm', this.confirmImportFromUi, this);
    this.game.events.on('gwg-create-backup', this.createBackupFromUi, this);
    this.game.events.on('gwg-restore-backup', this.restoreBackupFromUi, this);
    this.game.events.on('gwg-recover-restore', this.recoverRestoreLatestBackup, this);
    this.game.events.on('gwg-recover-export-broken', this.recoverExportBrokenSave, this);
    this.game.events.on('gwg-recover-new-game', this.recoverStartNewGame, this);
    this.game.events.on('gwg-recover-retry', this.recoverRetryLoad, this);
    this.game.events.on('gwg-upgrade-place', this.upgradePlaceFromUi, this);
    this.game.events.on('gwg-upgrade-road', this.upgradeRoadFromUi, this);
    this.game.events.on('gwg-post-quest', this.postQuestFromUi, this);
    this.game.events.on('gwg-open-quests', this.openQuestsFromUi, this);
    this.game.events.on('gwg-open-ledger', this.openTownLedger, this);
    this.game.events.on('gwg-open-town-log', this.openTownLog, this);
    this.game.events.on('gwg-open-help', this.openHelpPanel, this);
    this.game.events.on('gwg-open-stores', this.openTownStoresPanel, this);
    this.game.events.on('gwg-open-more', this.openMobileMorePanel, this);
    this.game.events.on('gwg-open-policies', this.showPolicyPanel, this);
    this.game.events.on('gwg-open-reset-confirm', this.openResetConfirmPanel, this);
    this.game.events.on('gwg-tutorial-next', this.advanceOnboardingFromUi, this);
    this.game.events.on('gwg-tutorial-skip', this.skipOnboarding, this);
    this.game.events.on('gwg-tutorial-start', this.restartOnboarding, this);
    this.game.events.on('gwg-policy-choice', this.choosePolicyFromUi, this);
    this.game.events.on('gwg-selection-clear', this.clearSelection, this);
    this.game.events.on('gwg-open-build', this.openBuildMenu, this);
    this.game.events.on('gwg-open-roads', this.openRoadMenu, this);
    this.game.events.on('gwg-select-build', this.selectBuildItem, this);
    this.game.events.on('gwg-preview-build', this.previewBuildItem, this);
    this.game.events.on('gwg-build-category', this.selectBuildCategory, this);
    this.game.events.on('gwg-cancel-build', this.cancelBuildMode, this);
    this.game.events.on('gwg-time-speed', this.setSimulationSpeed, this);
    this.game.events.on('gwg-expand-land', this.expandLand, this);
    this.game.events.on('gwg-building-action', this.runBuildingAction, this);
    this.game.events.on('gwg-repair-building', this.repairBuildingFromUi, this);
    this.game.events.on('gwg-choose-specialization', this.chooseBuildingSpecialization, this);
    this.game.events.on('gwg-toggle-building-open', this.toggleBuildingOpenFromUi, this);
    this.game.events.on('gwg-move-building', this.startMoveBuildingFromUi, this);
    this.game.events.on('gwg-delete-building', this.deleteBuildingFromUi, this);
    this.game.events.on('gwg-open-report', this.showCycleReport, this);
    this.game.events.on('gwg-collect-loot', this.collectLootDrop, this);
    this.game.events.on('gwg-aftermath-action', this.runAftermathActionFromUi, this);
    this.game.events.on('gwg-monster-action', this.runMonsterActionFromUi, this);
    this.game.events.on('gwg-lair-action', this.runLairActionFromUi, this);
    this.game.events.on('gwg-open-defense-alerts', this.showDefenceAlerts, this);
    this.game.events.on('gwg-defense-action', this.runDefenceActionFromUi, this);
    this.game.events.on('gwg-defense-policy', this.cycleDefencePriorityFromUi, this);
    this.game.events.on('gwg-open-delete', this.openDeleteTool, this);
    this.game.events.on('gwg-assign-quest', this.assignQuestHeroFromUi, this);
    this.game.events.on('gwg-poi-action', this.runPoiAction, this);
    this.game.events.on('gwg-node-survey', this.surveyNode, this);
    this.game.events.on('gwg-node-access', this.establishNodeAccess, this);
    this.game.events.on('gwg-node-gatherer', this.assignNodeGatherer, this);
    this.game.events.on('gwg-node-abandon', this.abandonNode, this);
    this.game.events.on('gwg-node-camp', this.startNodeCampPlacement, this);
    this.game.events.on('gwg-extraction-assign', this.assignExtractionWorkerFromUi, this);
    this.game.events.on('gwg-extraction-toggle', this.toggleExtractionFromUi, this);
    this.game.events.on('gwg-extraction-priority', this.cycleExtractionPriorityFromUi, this);
    this.game.events.on('gwg-extraction-carrier', this.requestExtractionCarrierFromUi, this);
    this.game.events.on('gwg-premium-salvage', this.convertPremiumSalvageFromUi, this);
    this.game.events.on('gwg-storehouse-action', this.runStorehouseActionFromUi, this);
    this.game.events.on('gwg-confirm-build', this.confirmRoadPlan, this);
    this.game.events.on('gwg-focus-hero', this.focusHeroFromRoster, this);
    this.game.events.on('gwg-toggle-hero-favorite', this.toggleHeroFavoriteFromUi, this);
    this.game.events.on('gwg-production-recipe', this.setProductionRecipeFromUi, this);
    this.game.events.on('gwg-production-toggle', this.toggleProductionFromUi, this);
    this.game.events.on('gwg-production-priority', this.cycleProductionPriorityFromUi, this);
    this.game.events.on('gwg-equip-hero', this.equipHeroFromUi, this);
    this.game.events.on('gwg-equip-all', this.equipAllHeroesFromUi, this);
    this.game.events.on('gwg-hero-social-action', this.runHeroSocialActionFromUi, this);
    this.game.events.on('gwg-party-action', this.runPartyActionFromUi, this);
    this.game.events.on('gwg-trade-action', this.runTradeActionFromUi, this);
    this.game.events.on('gwg-store-filter', this.setStoreFilterFromUi, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', refreshResponsiveState);
      window.removeEventListener('orientationchange', refreshResponsiveState);
      this.game.events.off('gwg-end-day', this.runCycle, this);
      this.game.events.off('gwg-save', this.saveGame, this);
      this.game.events.off('gwg-reset', this.resetGame, this);
      this.game.events.off('gwg-open-save-manager', this.openSaveManagerPanel, this);
      this.game.events.off('gwg-open-backups', this.openBackupsPanel, this);
      this.game.events.off('gwg-save-export', this.exportSaveFromUi, this);
      this.game.events.off('gwg-save-import', this.importSaveFromUi, this);
      this.game.events.off('gwg-save-import-confirm', this.confirmImportFromUi, this);
      this.game.events.off('gwg-create-backup', this.createBackupFromUi, this);
      this.game.events.off('gwg-restore-backup', this.restoreBackupFromUi, this);
      this.game.events.off('gwg-recover-restore', this.recoverRestoreLatestBackup, this);
      this.game.events.off('gwg-recover-export-broken', this.recoverExportBrokenSave, this);
      this.game.events.off('gwg-recover-new-game', this.recoverStartNewGame, this);
      this.game.events.off('gwg-recover-retry', this.recoverRetryLoad, this);
      this.game.events.off('gwg-upgrade-place', this.upgradePlaceFromUi, this);
      this.game.events.off('gwg-upgrade-road', this.upgradeRoadFromUi, this);
      this.game.events.off('gwg-post-quest', this.postQuestFromUi, this);
      this.game.events.off('gwg-open-quests', this.openQuestsFromUi, this);
      this.game.events.off('gwg-open-ledger', this.openTownLedger, this);
      this.game.events.off('gwg-open-town-log', this.openTownLog, this);
      this.game.events.off('gwg-open-help', this.openHelpPanel, this);
      this.game.events.off('gwg-open-stores', this.openTownStoresPanel, this);
      this.game.events.off('gwg-open-more', this.openMobileMorePanel, this);
      this.game.events.off('gwg-open-policies', this.showPolicyPanel, this);
      this.game.events.off('gwg-open-reset-confirm', this.openResetConfirmPanel, this);
      this.game.events.off('gwg-tutorial-next', this.advanceOnboardingFromUi, this);
      this.game.events.off('gwg-tutorial-skip', this.skipOnboarding, this);
      this.game.events.off('gwg-tutorial-start', this.restartOnboarding, this);
      this.game.events.off('gwg-policy-choice', this.choosePolicyFromUi, this);
      this.game.events.off('gwg-selection-clear', this.clearSelection, this);
      this.game.events.off('gwg-open-build', this.openBuildMenu, this);
      this.game.events.off('gwg-open-roads', this.openRoadMenu, this);
      this.game.events.off('gwg-select-build', this.selectBuildItem, this);
      this.game.events.off('gwg-preview-build', this.previewBuildItem, this);
      this.game.events.off('gwg-build-category', this.selectBuildCategory, this);
      this.game.events.off('gwg-cancel-build', this.cancelBuildMode, this);
      this.game.events.off('gwg-time-speed', this.setSimulationSpeed, this);
      this.game.events.off('gwg-expand-land', this.expandLand, this);
      this.game.events.off('gwg-building-action', this.runBuildingAction, this);
      this.game.events.off('gwg-repair-building', this.repairBuildingFromUi, this);
      this.game.events.off('gwg-choose-specialization', this.chooseBuildingSpecialization, this);
      this.game.events.off('gwg-toggle-building-open', this.toggleBuildingOpenFromUi, this);
      this.game.events.off('gwg-move-building', this.startMoveBuildingFromUi, this);
      this.game.events.off('gwg-delete-building', this.deleteBuildingFromUi, this);
      this.game.events.off('gwg-open-report', this.showCycleReport, this);
      this.game.events.off('gwg-collect-loot', this.collectLootDrop, this);
      this.game.events.off('gwg-aftermath-action', this.runAftermathActionFromUi, this);
      this.game.events.off('gwg-monster-action', this.runMonsterActionFromUi, this);
      this.game.events.off('gwg-lair-action', this.runLairActionFromUi, this);
      this.game.events.off('gwg-open-defense-alerts', this.showDefenceAlerts, this);
      this.game.events.off('gwg-defense-action', this.runDefenceActionFromUi, this);
      this.game.events.off('gwg-defense-policy', this.cycleDefencePriorityFromUi, this);
      this.game.events.off('gwg-open-delete', this.openDeleteTool, this);
      this.game.events.off('gwg-assign-quest', this.assignQuestHeroFromUi, this);
      this.game.events.off('gwg-poi-action', this.runPoiAction, this);
      this.game.events.off('gwg-node-survey', this.surveyNode, this);
      this.game.events.off('gwg-node-access', this.establishNodeAccess, this);
      this.game.events.off('gwg-node-gatherer', this.assignNodeGatherer, this);
      this.game.events.off('gwg-node-abandon', this.abandonNode, this);
      this.game.events.off('gwg-node-camp', this.startNodeCampPlacement, this);
      this.game.events.off('gwg-extraction-assign', this.assignExtractionWorkerFromUi, this);
      this.game.events.off('gwg-extraction-toggle', this.toggleExtractionFromUi, this);
      this.game.events.off('gwg-extraction-priority', this.cycleExtractionPriorityFromUi, this);
      this.game.events.off('gwg-extraction-carrier', this.requestExtractionCarrierFromUi, this);
      this.game.events.off('gwg-premium-salvage', this.convertPremiumSalvageFromUi, this);
      this.game.events.off('gwg-storehouse-action', this.runStorehouseActionFromUi, this);
      this.game.events.off('gwg-confirm-build', this.confirmRoadPlan, this);
      this.game.events.off('gwg-focus-hero', this.focusHeroFromRoster, this);
      this.game.events.off('gwg-toggle-hero-favorite', this.toggleHeroFavoriteFromUi, this);
      this.game.events.off('gwg-production-recipe', this.setProductionRecipeFromUi, this);
      this.game.events.off('gwg-production-toggle', this.toggleProductionFromUi, this);
      this.game.events.off('gwg-production-priority', this.cycleProductionPriorityFromUi, this);
      this.game.events.off('gwg-equip-hero', this.equipHeroFromUi, this);
      this.game.events.off('gwg-equip-all', this.equipAllHeroesFromUi, this);
      this.game.events.off('gwg-hero-social-action', this.runHeroSocialActionFromUi, this);
      this.game.events.off('gwg-party-action', this.runPartyActionFromUi, this);
      this.game.events.off('gwg-trade-action', this.runTradeActionFromUi, this);
      this.game.events.off('gwg-store-filter', this.setStoreFilterFromUi, this);
    });

    this.game.events.emit(
      'gwg-event',
      this.isBuilderCity
        ? 'The Guild Camp opened on mostly empty land. Build roads, place services, and invoice destiny.'
        : 'Welcome back to the legacy town. Its roads are grandfathered in by suspicious paperwork.',
    );
    if (this._saveRecovery) {
      // A save existed but could not be loaded. We booted a fresh town (not a
      // black screen); surface recovery once the UI is ready.
      this.time.delayedCall(400, () => this.openRecoveryPanel());
    } else {
      this.time.delayedCall(650, () => this.maybeShowOnboarding());
    }
  }

  loadSavedState() {
    this.saveKey = getActiveSaveKey();
    const loaded = loadActiveSave(this.saveKey);
    if (!loaded.ok) {
      // No save is normal; a corrupt/unusable one triggers recovery instead of
      // a black screen. The raw bytes are stashed, never wiped, so nothing the
      // player did is lost.
      if (loaded.reason && loaded.reason !== 'no-save' && loaded.raw) {
        stashBrokenSave(loaded.raw, loaded.reason);
        this._saveRecovery = { reason: loaded.reason, hadSave: true };
      }
      return null;
    }
    this._saveWarnings = loaded.warnings && loaded.warnings.length ? loaded.warnings : null;
    const parsed = loaded.data;
    try {
      return {
        saveVersion: parsed.saveVersion || 1,
        day: Number(parsed.day) || 1,
        resources: { ...BALANCE.startingResources, ...(parsed.resources || {}) },
        upgradeLevels: parsed.upgradeLevels || {},
        availableQuests: Array.isArray(parsed.availableQuests) ? parsed.availableQuests : [],
        postedQuests: Array.isArray(parsed.postedQuests) ? parsed.postedQuests : [],
        unlockedLocations: Array.isArray(parsed.unlockedLocations) ? parsed.unlockedLocations : [],
        completedObjectives: Array.isArray(parsed.completedObjectives) ? parsed.completedObjectives : [],
        stats: parsed.stats || {},
        heroStats: parsed.heroStats || {},
        townStageId: parsed.townStageId || 'garage',
        townRankId: parsed.townRankId || 'camp',
        townIdentityId: parsed.townIdentityId || 'balanced',
        townLog: Array.isArray(parsed.townLog) ? parsed.townLog : [],
        crises: parsed.crises || {},
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        pendingPolicy: parsed.pendingPolicy || null,
        discoveredPois: Array.isArray(parsed.discoveredPois) ? parsed.discoveredPois : [],
        poiCooldowns: parsed.poiCooldowns || null,
        townInventory: parsed.townInventory || null,
        tradeSettings: parsed.tradeSettings || null,
        productionIncidents: Array.isArray(parsed.productionIncidents) ? parsed.productionIncidents : [],
        resourceNodes: parsed.resourceNodes && typeof parsed.resourceNodes === 'object' ? parsed.resourceNodes : null,
        resourceDeliveries: Array.isArray(parsed.resourceDeliveries) ? parsed.resourceDeliveries : [],
        harvestedForest: Array.isArray(parsed.harvestedForest) ? parsed.harvestedForest : null,
        areaReputation: parsed.areaReputation || {},
        townReputation: Number.isFinite(parsed.townReputation) ? parsed.townReputation : null,
        townPrestige: Number.isFinite(parsed.townPrestige) ? parsed.townPrestige : null,
        weeklyReport: parsed.weeklyReport || null,
        weekReportUnread: Boolean(parsed.weekReportUnread),
        weekTracker: parsed.weekTracker || null,
        monsterState: parsed.monsterState || null,
        tutorial: parsed.tutorial || {},
        cityBuilder: parsed.cityBuilder || null,
      };
    } catch (err) {
      // A migrated save still threw while being shaped for the scene. Preserve
      // it for inspection and fall back to a fresh start plus recovery UI rather
      // than crash create() into a black screen.
      stashBrokenSave(loaded.raw, `normalize:${err?.message || 'error'}`);
      this._saveRecovery = { reason: 'normalize', hadSave: true };
      return null;
    }
  }

  normalizeAreaReputation(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(Object.entries(source)
      .filter(([key]) => typeof key === 'string' && key.length > 0)
      .map(([key, value]) => [key, Phaser.Math.Clamp(Number(value) || 0, 0, 100)]));
  }

  getAreaReputation(areaId = 'frontier') {
    return Phaser.Math.Clamp(Number(this.areaReputation?.[areaId]) || 0, 0, 100);
  }

  changeAreaReputation(areaId = 'frontier', delta = 0, reason = '') {
    if (!areaId || !Number.isFinite(delta) || delta === 0) return 0;
    this.areaReputation = this.areaReputation || {};
    const before = this.getAreaReputation(areaId);
    const after = Phaser.Math.Clamp(before + delta, 0, 100);
    this.areaReputation[areaId] = after;
    if (after >= 45 && before < 45) {
      const text = `${reason || 'A dangerous area'} gained a bad reputation. Heroes will squint before entering.`;
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'threat');
    }
    return after - before;
  }

  calculateTownPrestige() {
    const buildingLevels = Object.values(this.placeById || {})
      .filter((place) => place?.isPlaced !== false)
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    const discovered = this.discoveredPois?.size || 0;
    const victories = Number(this.stats?.monsterVictories) || 0;
    return Phaser.Math.Clamp(Math.round(buildingLevels * 2 + discovered * 3 + victories * 4), 0, 100);
  }

  calculateTownReputation() {
    const serviceQuality = Object.values(this.cityState?.buildingRuntime || {})
      .reduce((sum, runtime) => sum + (Number(runtime.serviceQuality) || 0), 0);
    const districtBonus = this.getActiveDistrictBonuses().length * 2;
    const problemPenalty = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id))
      .reduce((sum, place) => sum + this.getBuildingProblems(place).length, 0);
    const dangerPenalty = Math.max(0, this.resources.threat - 45) * 0.35
      + Math.max(0, this.resources.corruption - 55) * 0.22;
    return Phaser.Math.Clamp(Math.round(
      42
      + this.resources.trust * 0.34
      + this.resources.morale * 0.18
      + this.calculateTownPrestige() * 0.22
      + serviceQuality * 0.45
      + districtBonus
      - dangerPenalty
      - problemPenalty,
    ), 0, 100);
  }

  updateTownReputationStats() {
    this.townPrestige = this.calculateTownPrestige();
    this.townReputation = this.calculateTownReputation();
    this.stats.townPrestige = this.townPrestige;
    this.stats.townReputation = this.townReputation;
  }

  applyBuildingPlacements(buildings) {
    const baseById = Object.fromEntries(buildings.map((building) => [building.id, building]));
    const placements = this.cityState.placedBuildings.map((placement) => ({
      ...placement,
      baseId: placement.baseId || getBaseBuildingId(placement.id),
    }));
    const usedPlacementIds = new Set();
    const buildFromPlacement = (baseBuilding, placement, copyIndex = 1) => {
      const catalog = getBuildingCatalogEntry(placement.baseId);
      const position = placement.legacyPosition || !this.useIsoRendering()
        ? { x: baseBuilding.x, y: baseBuilding.y }
        : this.gridToVisual(placement.gridX, placement.gridY, catalog?.footprint);
      return {
        ...baseBuilding,
        ...position,
        id: placement.id,
        baseId: placement.baseId,
        catalog,
        footprint: catalog?.footprint || { w: 2, h: 2 },
        gridX: placement.gridX,
        gridY: placement.gridY,
        isPlaced: true,
        name: copyIndex > 1 ? `${baseBuilding.name} ${copyIndex}` : baseBuilding.name,
      };
    };

    const result = buildings.map((building) => {
      const exact = placements.find((placement) => placement.id === building.id);
      const fallback = exact || placements.find((placement) => placement.baseId === building.id && !usedPlacementIds.has(placement.id));
      const catalog = getBuildingCatalogEntry(building.id);
      if (!fallback) {
        return {
          ...building,
          baseId: building.id,
          catalog,
          footprint: catalog?.footprint || { w: 2, h: 2 },
          isPlaced: false,
        };
      }
      usedPlacementIds.add(fallback.id);
      return buildFromPlacement(building, fallback, fallback.copyIndex || 1);
    });

    for (const placement of placements) {
      if (usedPlacementIds.has(placement.id)) continue;
      const baseBuilding = baseById[placement.baseId];
      if (!baseBuilding) continue;
      const copyIndex = placement.copyIndex || (this.getPlacementIndexForBase(placements, placement.baseId, placement.id) + 1);
      usedPlacementIds.add(placement.id);
      result.push(buildFromPlacement(baseBuilding, placement, copyIndex));
    }

    return result;
  }

  getPlacementIndexForBase(placements, baseId, placementId) {
    return placements
      .filter((placement) => placement.baseId === baseId)
      .findIndex((placement) => placement.id === placementId);
  }

  useIsoRendering() {
    return USE_ISO_RENDERING && this.isBuilderCity;
  }

  gridToVisual(gridX, gridY, footprint = { w: 1, h: 1 }) {
    if (!this.useIsoRendering()) return gridToWorld(gridX, gridY, footprint);
    return getBuildingWorldAnchor({ gridX, gridY, footprint }, ISO_RENDER_OPTIONS);
  }

  gridTileVisualCenter(gridX, gridY) {
    if (!this.useIsoRendering()) {
      const world = gridToWorld(gridX, gridY);
      return { x: world.x, y: world.y - GRID_CONFIG.tileSize / 2 };
    }
    return getIsoTileCenter(gridX, gridY, ISO_RENDER_OPTIONS);
  }

  worldToBuildGrid(worldX, worldY) {
    if (!this.useIsoRendering()) return worldToGrid(worldX, worldY);
    const cell = isoToGrid(worldX, worldY, ISO_RENDER_OPTIONS);
    return {
      x: Math.floor(cell.x),
      y: Math.floor(cell.y),
    };
  }

  getVisualTilePoints(gridX, gridY) {
    if (this.useIsoRendering()) return getIsoDiamondPoints(gridX, gridY, ISO_RENDER_OPTIONS);
    const left = GRID_CONFIG.originX + gridX * GRID_CONFIG.tileSize;
    const top = GRID_CONFIG.originY + gridY * GRID_CONFIG.tileSize;
    return [
      { x: left, y: top },
      { x: left + GRID_CONFIG.tileSize, y: top },
      { x: left + GRID_CONFIG.tileSize, y: top + GRID_CONFIG.tileSize },
      { x: left, y: top + GRID_CONFIG.tileSize },
    ];
  }

  getVisualFootprintPolygon(gridX, gridY, footprint = { w: 1, h: 1 }) {
    if (this.useIsoRendering()) {
      return getIsoFootprintPolygon(
        gridX,
        gridY,
        footprint.w || 1,
        footprint.h || 1,
        ISO_RENDER_OPTIONS,
      );
    }
    const left = GRID_CONFIG.originX + gridX * GRID_CONFIG.tileSize;
    const top = GRID_CONFIG.originY + gridY * GRID_CONFIG.tileSize;
    const width = (footprint.w || 1) * GRID_CONFIG.tileSize;
    const height = (footprint.h || 1) * GRID_CONFIG.tileSize;
    return [
      { x: left, y: top },
      { x: left + width, y: top },
      { x: left + width, y: top + height },
      { x: left, y: top + height },
    ];
  }

  getVisualDepth(gridX, gridY) {
    return this.useIsoRendering() ? getIsoDepth(gridX, gridY) : gridToWorld(gridX, gridY).y;
  }

  drawPolygon(graphics, points, fillColor, fillAlpha = 1, strokeColor = null, strokeAlpha = 1, strokeWidth = 1) {
    if (!graphics || !points?.length) return;
    if (fillColor !== null && fillColor !== undefined && fillAlpha > 0) graphics.fillStyle(fillColor, fillAlpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) graphics.lineTo(points[i].x, points[i].y);
    graphics.closePath();
    if (fillColor !== null && fillColor !== undefined && fillAlpha > 0) graphics.fillPath();
    if (strokeColor !== null && strokeColor !== undefined && strokeAlpha > 0) {
      graphics.lineStyle(strokeWidth, strokeColor, strokeAlpha);
      graphics.beginPath();
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) graphics.lineTo(points[i].x, points[i].y);
      graphics.closePath();
      graphics.strokePath();
    }
  }

  insetPoints(points, inset = 0.82) {
    const center = points.reduce((acc, point) => ({
      x: acc.x + point.x / points.length,
      y: acc.y + point.y / points.length,
    }), { x: 0, y: 0 });
    return points.map((point) => ({
      x: center.x + (point.x - center.x) * inset,
      y: center.y + (point.y - center.y) * inset,
    }));
  }

  applyBuilderDecorationState(decorations) {
    if (!this.isBuilderCity) return decorations.map((decoration) => ({ ...decoration, isPlaced: true }));
    const guild = this.buildings.find((building) => building.id === 'guildhall');
    const decorationWorldWidth = this.isBuilderCity ? GRID_WORLD.width : TOWN_WORLD.width;
    const decorationWorldHeight = this.isBuilderCity ? GRID_WORLD.height : TOWN_WORLD.height;
    const automaticDecorations = decorations.map((decoration) => {
      const isNature = ['tree', 'rock', 'flowers'].includes(decoration.fallbackKey);
      const isEdgeNature = isNature && (
        decoration.district === 'edge'
        || decoration.x < 180
        || decoration.x > decorationWorldWidth - 180
        || decoration.y < 140
        || decoration.y > decorationWorldHeight - 140
      );
      const isNotice = decoration.id === 'notice_board';
      if (isNotice && guild) {
        const guildFootprint = getBuildingCatalogEntry('guildhall')?.footprint || { w: 3, h: 2 };
        const boardSpot = this.isBuilderCity && Number.isInteger(guild.gridX) && Number.isInteger(guild.gridY)
          ? this.gridToVisual(guild.gridX + guildFootprint.w + 1, guild.gridY + guildFootprint.h - 1, { w: 1, h: 1 })
          : { x: guild.x + 76, y: guild.y + 20 };
        return {
          ...decoration,
          x: boardSpot.x,
          y: boardSpot.y,
          pathNode: null,
          interactionW: 82,
          interactionH: 58,
          interactionPriority: 390,
          labelOffsetY: 6,
          isPlaced: true,
        };
      }
      return {
        ...decoration,
        isPlaced: isEdgeNature,
      };
    });
    const manualDecorations = (this.cityState.placedDecor || [])
      .map((entry) => {
        const config = DECOR_BUILD_BY_ID[entry.catalogId];
        if (!config || !isInsideGrid(entry.gridX, entry.gridY)) return null;
        const pos = this.gridToVisual(entry.gridX, entry.gridY, { w: 1, h: 1 });
        return {
          id: entry.id,
          name: config.title,
          x: pos.x,
          y: pos.y,
          gridX: entry.gridX,
          gridY: entry.gridY,
          w: config.w,
          h: config.h,
          scale: config.scale || 0.75,
          visualScale: config.visualScale || config.scale || 0.75,
          fallbackKey: config.fallbackKey,
          assetKey: config.assetKey,
          description: config.effect,
          tooltipLines: [config.flavor],
          effect: config.effect,
          userPlaced: true,
          isPlaced: true,
          interactive: true,
          label: false,
          spot: false,
          interactionPriority: 260,
          interactionW: Math.max(30, config.w * 0.74),
          interactionH: Math.max(24, config.h * 0.62),
        };
      })
      .filter(Boolean);
    return [...automaticDecorations, ...manualDecorations];
  }

  getBuildingRuntime(id) {
    const place = this.buildingById?.[id] || this.buildings?.find((building) => building.id === id);
    const level = place ? Math.max(1, Number(this.upgradeLevels?.[id]) || Number(place.level) || 1) : 1;
    const catalog = getBuildingCatalogEntry(id);
    const role = getBuildingRole(id);
    const savedRuntime = this.cityState.buildingRuntime[id] || {};
    const baseCapacity = role?.baseCapacity ?? (catalog?.capacity || (id === 'tavern' ? 6 : 4));
    const capacityPerLevel = role?.capacityPerLevel ?? 2;
    const defaultCapacity = baseCapacity + Math.max(0, level - 1) * capacityPerLevel;
    const defaults = {
      usageCount: 0,
      visitorsTotal: 0,
      visitorsNow: 0,
      serviceQuality: level,
      upgradeProgress: 0,
      capacity: defaultCapacity,
      stock: catalog?.id === 'potion_shop' ? 6 : 0,
      actionDays: {},
      specialization: null,
      closed: false,
      heroesRested: 0,
      productionDone: 0,
      lootProcessed: 0,
      monstersStopped: 0,
      servicesProvided: 0,
      upkeepPaid: 0,
      overloadedDays: 0,
      lastUpkeepDay: 0,
      production: normalizeProductionRuntime({}, getBaseBuildingId(id)),
      extraction: normalizeExtractionRuntime({}, getBaseBuildingId(id)),
      storage: { mode: 'all', resource: null, priority: 'normal', reserveMinimum: 0 },
      health: 100 + Math.max(0, level - 1) * 20,
      maxHealth: 100 + Math.max(0, level - 1) * 20,
      damaged: false,
      heavilyDamaged: false,
      repairCost: 0,
      attackerHistory: [],
      repairAssignment: null,
    };
    this.cityState.buildingRuntime[id] = {
      ...defaults,
      ...savedRuntime,
      capacity: Math.max(Number(savedRuntime.capacity) || 0, defaultCapacity),
      closed: Boolean(savedRuntime.closed),
      specialization: savedRuntime.specialization || null,
      actionDays: {
        ...(savedRuntime.actionDays || {}),
      },
      production: normalizeProductionRuntime(savedRuntime.production, getBaseBuildingId(id)),
      extraction: normalizeExtractionRuntime(savedRuntime.extraction, getBaseBuildingId(id)),
      maxHealth: Math.max(40, Number(savedRuntime.maxHealth) || defaults.maxHealth),
      health: Math.max(0, Math.min(
        Math.max(40, Number(savedRuntime.maxHealth) || defaults.maxHealth),
        Number.isFinite(Number(savedRuntime.health)) ? Number(savedRuntime.health) : defaults.health,
      )),
      damaged: Boolean(savedRuntime.damaged),
      heavilyDamaged: Boolean(savedRuntime.heavilyDamaged),
      repairCost: Math.max(0, Number(savedRuntime.repairCost) || 0),
      attackerHistory: Array.isArray(savedRuntime.attackerHistory) ? savedRuntime.attackerHistory.slice(-8) : [],
      repairAssignment: savedRuntime.repairAssignment && typeof savedRuntime.repairAssignment === 'object'
        ? { ...savedRuntime.repairAssignment }
        : null,
      storage: {
        mode: savedRuntime.storage?.mode === 'restricted' ? 'restricted' : 'all',
        resource: STORED_RESOURCES.includes(savedRuntime.storage?.resource) ? savedRuntime.storage.resource : null,
        priority: ['low', 'normal', 'high'].includes(savedRuntime.storage?.priority) ? savedRuntime.storage.priority : 'normal',
        reserveMinimum: Math.max(0, Math.min(20, Number(savedRuntime.storage?.reserveMinimum) || 0)),
      },
    };
    return this.cityState.buildingRuntime[id];
  }

  getBuildingSpecialization(id) {
    const runtime = this.getBuildingRuntime(id);
    const specId = runtime?.specialization;
    return getBuildingSpecializations(id).find((spec) => spec.id === specId) || null;
  }

  getBuildingSpecializationEffects(id) {
    return this.getBuildingSpecialization(id)?.effects || {};
  }

  getBuildingCapacity(place) {
    if (!place?.id || !getBuildingCatalogEntry(place.id)) return 0;
    const runtime = this.getBuildingRuntime(place.id);
    const spec = this.getBuildingSpecializationEffects(place.id);
    const damageFactor = runtime.heavilyDamaged ? 0.45 : runtime.damaged ? 0.75 : 1;
    return Math.max(0, Math.floor(((Number(runtime.capacity) || 0) + (Number(spec.capacityBonus) || 0)) * damageFactor));
  }

  getBuildingServiceQuality(place) {
    if (!place?.id || !getBuildingCatalogEntry(place.id)) return 0;
    const runtime = this.getBuildingRuntime(place.id);
    const spec = this.getBuildingSpecializationEffects(place.id);
    const damagePenalty = runtime.heavilyDamaged ? 2 : runtime.damaged ? 1 : 0;
    return Math.max(0, (Number(runtime.serviceQuality) || 0) + (Number(spec.serviceQualityBonus) || 0) - damagePenalty);
  }

  getBuildingUpkeep(place) {
    const role = getBuildingRole(place?.id);
    if (!role || place?.isPlaced === false) return 0;
    const level = this.getPlaceLevel(place);
    const spec = this.getBuildingSpecializationEffects(place.id);
    const levelUpkeep = Math.max(0, level - 1);
    return Math.max(0, (Number(role.upkeep) || 0) + levelUpkeep + (Number(spec.upkeepDelta) || 0));
  }

  getBuildingServiceRange(place) {
    const role = getBuildingRole(place?.id);
    const spec = this.getBuildingSpecializationEffects(place?.id);
    const rangeTiles = (role?.serviceRangeTiles || 0) + (Number(spec.rangeBonusTiles) || 0);
    return Math.max(0, rangeTiles * GRID_CONFIG.tileSize);
  }

  getNearbyPlacedBuildings(place, radius = 280) {
    if (!place) return [];
    return Object.values(this.buildingById || {})
      .filter((candidate) => candidate?.isPlaced && candidate.id !== place.id)
      .filter((candidate) => Phaser.Math.Distance.Between(place.x, place.y, candidate.x, candidate.y) <= radius);
  }

  getDistrictBonusesForPlace(place) {
    if (!place?.isPlaced) return [];
    const baseId = getBaseBuildingId(place.baseId || place.id);
    return DISTRICT_BONUSES.filter((bonus) => {
      if (!bonus.buildingIds.includes(baseId)) return false;
      const nearbyIds = new Set([
        baseId,
        ...this.getNearbyPlacedBuildings(place, bonus.radius).map((candidate) => getBaseBuildingId(candidate.baseId || candidate.id)),
      ]);
      const matches = bonus.buildingIds.filter((id) => nearbyIds.has(id));
      return matches.length >= bonus.required;
    });
  }

  getActiveDistrictBonuses() {
    const active = new Map();
    for (const place of Object.values(this.buildingById || {})) {
      if (!place?.isPlaced) continue;
      for (const bonus of this.getDistrictBonusesForPlace(place)) active.set(bonus.id, bonus);
    }
    return [...active.values()];
  }

  getAreaIdForPlace(place) {
    if (!Number.isInteger(place?.gridX) || !Number.isInteger(place?.gridY)) return 'frontier';
    const match = Object.entries(GRID_CONFIG.zones).find(([, zone]) => (
      place.gridX >= zone.minX
      && place.gridX <= zone.maxX
      && place.gridY >= zone.minY
      && place.gridY <= zone.maxY
    ));
    return match?.[0] || 'frontier';
  }

  getBuildingMetrics(place) {
    const role = getBuildingRole(place?.id);
    const runtime = place?.id && getBuildingCatalogEntry(place.id) ? this.getBuildingRuntime(place.id) : null;
    const roadAccess = place && getBuildingCatalogEntry(place.id) ? this.getBuildingRoadAccess(place) : null;
    const serviceRange = this.getBuildingServiceRange(place);
    const localHeroes = serviceRange > 0
      ? this.getActiveHeroes().filter((hero) => (
        hero.state !== 'away'
        && hero.container
        && Phaser.Math.Distance.Between(hero.container.x, hero.container.y, place.x, place.y) <= serviceRange
      )).length
      : 0;
    return {
      role,
      runtime,
      specialization: place?.id ? this.getBuildingSpecialization(place.id) : null,
      capacity: place?.id ? this.getBuildingCapacity(place) : 0,
      load: Number(runtime?.visitorsNow) || 0,
      quality: place?.id ? this.getBuildingServiceQuality(place) : 0,
      upkeep: place?.id ? this.getBuildingUpkeep(place) : 0,
      serviceRange,
      localHeroes,
      roadAccess,
      districtBonuses: this.getDistrictBonusesForPlace(place),
    };
  }

  getBuildingProblems(place) {
    const catalog = getBuildingCatalogEntry(place?.id);
    if (!place?.isPlaced || !catalog) return [];
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const metrics = this.getBuildingMetrics(place);
    const role = metrics.role;
    const runtime = metrics.runtime;
    const problems = [];
    if (runtime?.closed) {
      problems.push({ text: 'Closed: upkeep is lower, but services and growth pause.', className: 'gwg-bad' });
    }
    if (runtime?.damaged || runtime?.health < runtime?.maxHealth) {
      problems.push({ text: `Monster damage: ${Math.ceil(runtime.health)}/${runtime.maxHealth} health. Repair cost ${Math.max(1, runtime.repairCost || 1)}g.`, className: 'gwg-bad' });
    }
    if (metrics.roadAccess && !metrics.roadAccess.connected) {
      problems.push({ text: 'No road access. Services, walkers, and deliveries are mostly vibes.', className: 'gwg-bad' });
    }
    if (metrics.capacity > 0 && metrics.load >= metrics.capacity) {
      problems.push({ text: `${role?.capacityLabel || 'Capacity'} overloaded (${metrics.load}/${metrics.capacity}).`, className: 'gwg-bad' });
    }
    if (REST_BUILDINGS[baseId]) {
      const lodging = this.getLodgingReport();
      if (lodging.homeless > 0) problems.push({ text: `Town beds full: ${lodging.homeless} hero${lodging.homeless === 1 ? '' : 'es'} sleeping outside.`, className: 'gwg-bad' });
    }
    if (role?.inputResource && (this.townInventory?.[role.inputResource] || 0) <= 0) {
      problems.push({ text: role.lacking, className: 'gwg-bad' });
    }
    const production = this.getProductionRecipes(place).length ? this.getProductionState(place) : null;
    if (production && /Waiting|Locked/.test(production.lastStatus || '')) {
      problems.push({ text: `Production ${production.lastStatus.toLowerCase()}.`, className: 'gwg-bad' });
    }
    if (getBaseBuildingId(place.baseId || place.id) === 'warehouse') {
      const full = PROCESSED_RESOURCES.filter((id) => this.isResourceStorageFull(id));
      if (full.length) problems.push({ text: `Finished storage full: ${full.join(', ')}.`, className: 'gwg-bad' });
    }
    const areaRep = this.getAreaReputation(this.getAreaIdForPlace(place));
    if (areaRep >= 45) {
      problems.push({ text: `Local danger reputation ${areaRep}/100. Heroes distrust the neighborhood.`, className: 'gwg-bad' });
    }
    if ((role?.districtTags || []).includes('premium') && this.resources.corruption >= 70) {
      problems.push({ text: 'Premium pressure high. Convenience is spreading and trust is checking exits.', className: 'gwg-whale' });
    }
    return problems;
  }

  getDefenceBuildingInspectorLines(place) {
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    if (!['watchtower', 'guard_post', 'frontier_outpost', 'scout_post', 'training'].includes(baseId)) return null;
    const runtime = this.getBuildingRuntime(place.id);
    const level = this.getPlaceLevel(place);
    const damageFactor = runtime.heavilyDamaged ? 0.4 : runtime.damaged ? 0.68 : 1;
    const baseRanges = { watchtower: 430, guard_post: 270, frontier_outpost: 330, scout_post: 370, training: 190 };
    const radius = Math.round(((baseRanges[baseId] || 0) + Math.max(0, level - 1) * 45) * damageFactor);
    const assigned = this.defenceState.patrolAssignments?.[place.id];
    const lines = {
      watchtower: [`Detection radius: ${radius}px${runtime.damaged ? ' (reduced by damage)' : ''}`, 'Provides earlier alerts and approximate approach direction.', 'Higher levels extend warning time and reveal support.'],
      guard_post: [`Response radius: ${radius}px${runtime.damaged ? ' (reduced by damage)' : ''}`, `Patrol: ${assigned?.zone || 'local automatic coverage'}`, 'Dispatches an emergency guard when confirmed threats enter coverage.'],
      frontier_outpost: [`Frontier support radius: ${radius}px${runtime.damaged ? ' (reduced by damage)' : ''}`, `Patrol assignment: ${assigned?.zone || 'none'}`, 'Reduces nearby lair pressure and shelters explorers or workers.'],
      scout_post: [`Scout detection radius: ${radius}px`, 'Improves wilderness sightings and lair estimates.'],
      training: ['Improves honest-hero and guard readiness.', 'Does not detect threats directly; it makes the response less ceremonial.'],
    }[baseId];
    return lines || null;
  }

  getUpgradeRequirement(place, info = this.getUpgradeInfo(place)) {
    const catalog = getBuildingCatalogEntry(place?.id);
    if (!catalog || !place?.isPlaced || info.maxed) return { met: true, text: 'No extra growth requirement.' };
    const runtime = this.getBuildingRuntime(place.id);
    const nextLevel = info.level + 1;
    const requiredProgress = Math.min(90, nextLevel * 14);
    const requiredUses = Math.max(3, (nextLevel - 1) * 5);
    const role = getBuildingRole(place.id);
    const counterKey = role?.progressCounter || 'usageCount';
    const counterValue = Number(runtime[counterKey]) || 0;
    const counterGoal = counterKey === 'usageCount' ? requiredUses : Math.max(1, nextLevel - 1);
    const progressMet = (Number(runtime.upgradeProgress) || 0) >= requiredProgress;
    const usageMet = (Number(runtime.usageCount) || 0) >= requiredUses;
    const counterMet = counterValue >= counterGoal;
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const firstMaterialCosts = {
      tavern: { wood: 2 }, inn: { wood: 3 }, hero_hostel: { wood: 3 },
      watchtower: { wood: 2, iron: 1 }, frontier_outpost: { wood: 2, iron: 1 },
      storehouse: { wood: 2 }, lumber_camp: { wood: 1 }, mining_camp: { wood: 1 },
      herbalist_hut: { wood: 1 }, salvage_camp: { wood: 1 }, blacksmith: { iron: 2 },
    };
    const materialCost = nextLevel === 2
      ? { ...(firstMaterialCosts[baseId] || {}) }
      : nextLevel >= 3 && getBuildingCatalogEntry(place.id)
        ? { planks: Math.max(1, nextLevel - 2), ...(nextLevel >= 4 ? { tools: 1 } : {}) }
        : {};
    const materialsMet = hasRecipeInputs(this.townInventory, materialCost);
    const usageRequirementMet = nextLevel <= 2 ? (progressMet || usageMet || counterMet) : (progressMet && (usageMet || counterMet));
    const met = usageRequirementMet && materialsMet;
    const counterLabel = counterKey === 'usageCount'
      ? `${runtime.usageCount || 0}/${requiredUses} uses`
      : `${counterValue}/${counterGoal} ${counterKey.replace(/[A-Z]/g, (m) => ` ${m.toLowerCase()}`)}`;
    return {
      met,
      requiredProgress,
      requiredUses,
      materialCost,
      materialsMet,
      text: `Growth: ${Math.floor(runtime.upgradeProgress || 0)}/${requiredProgress}% or ${counterLabel}.${Object.keys(materialCost).length ? ` Materials: ${formatResourceAmountMap(materialCost)} (${materialsMet ? 'ready' : 'short'}).` : ''}`,
      blockedText: Phaser.Utils.Array.GetRandom(BUILDING_SATIRE_LINES.progressBlocked),
    };
  }

  isBuildingPlaced(id) {
    return Boolean(this.buildingById?.[id]?.isPlaced);
  }

  getPlacedBuildingsByBaseId(baseId) {
    return Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && (place.baseId || getBaseBuildingId(place.id)) === baseId);
  }

  getPlacedBuildingCount(baseId) {
    return this.getPlacedBuildingsByBaseId(baseId).length;
  }

  isCatalogAtBuildLimit(catalog) {
    const maxCount = Number(catalog?.maxCount ?? 99);
    return Number.isFinite(maxCount) && this.getPlacedBuildingCount(catalog.id) >= maxCount;
  }

  getNextBuildingInstanceId(baseId) {
    if (!this.buildingById?.[baseId] || !this.buildingById[baseId].isPlaced) return baseId;
    let index = this.getPlacedBuildingCount(baseId) + 1;
    while (this.buildingById?.[`${baseId}__${index}`]) index += 1;
    return `${baseId}__${index}`;
  }

  setupCameraControls() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.worldWidth, this.worldHeight);
    // never allow zooming out past the world edges
    this.minZoom = Math.min(
      CAMERA_MAX_ZOOM,
      Math.max(WIDTH / this.worldWidth, HEIGHT / this.worldHeight),
    );
    this.defaultZoom = Phaser.Math.Clamp(CAMERA_DEFAULT_ZOOM, this.minZoom, CAMERA_MAX_ZOOM);
    cam.setZoom(this.defaultZoom);
    if (this.isBuilderCity) {
      const anchor = this.getBuilderCameraAnchor();
      cam.centerOn(anchor.x, anchor.y);
    } else {
      cam.setScroll(
        Phaser.Math.Clamp(TOWN_WORLD.cameraStart.x, 0, Math.max(0, this.worldWidth - WIDTH)),
        Phaser.Math.Clamp(TOWN_WORLD.cameraStart.y, 0, Math.max(0, this.worldHeight - HEIGHT)),
      );
    }
    this.clampCameraToWorld();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');
    this.cameraDrag = { active: false, moved: false, lastX: 0, lastY: 0 };
    this.pinchState = null;

    this.input.on('wheel', (pointer, _objects, _dx, dy) => {
      if (this.registry.get('uiPointerBlocked')) return;
      this.zoomCamera(dy > 0 ? -1 : 1, pointer);
    });
    this.game.events.on('gwg-zoom', this.zoomFromUi, this);
    this.game.events.on('gwg-camera-home', this.cameraHome, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-zoom', this.zoomFromUi, this);
      this.game.events.off('gwg-camera-home', this.cameraHome, this);
    });

    // dragging pans the camera in build/delete mode (placement only happens
    // on pointerup taps); in ROAD mode dragging paints the road plan instead,
    // so camera drag stays disabled there — pan with WASD/edge/pinch
    this.input.on('pointerdown', (pointer) => {
      if (!pointer.primaryDown) return;
      if (this.buildMode?.kind === 'road') return;
      this.cameraDrag.active = true;
      this.cameraDrag.moved = false;
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (this.updatePinchZoom()) return;
      if (!this.buildMode) this.updateWorldInteractionHover(pointer);
      if (!this.cameraDrag.active || !pointer.primaryDown) return;
      const dx = pointer.x - this.cameraDrag.lastX;
      const dy = pointer.y - this.cameraDrag.lastY;
      const total = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
      if (total > this.getTapThreshold()) this.cameraDrag.moved = true;
      if (this.cameraDrag.moved) {
        // camera bounds clamp the final scroll; divide by zoom so the world
        // tracks the pointer 1:1 at any zoom level
        cam.scrollX -= dx / cam.zoom;
        cam.scrollY -= dy / cam.zoom;
        this.clampCameraToWorld();
      }
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointerup', (pointer, over = []) => {
      this.pinchState = null;
      if (this.registry.get('uiPointerBlocked')) {
        this.cameraDrag.active = false;
        return;
      }
      if (this.cameraDrag.moved) this.suppressTapUntil = this.time.now + 120;
      else if (over.length === 0 && !this.buildMode) {
        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const cell = this.worldToBuildGrid(world.x, world.y);
        if (this.getRoadAt(cell.x, cell.y)) this.showRoadInspector(cell.x, cell.y);
        else if (this.activeInspector) this.hideTooltip();
      }
      this.cameraDrag.active = false;
    });
    this.input.on('gameout', () => this.clearWorldInteractionHover());
  }

  zoomFromUi(direction) {
    this.zoomCamera(Number(direction) >= 0 ? 1 : -1, null);
  }

  // touch needs a wider tap/drag threshold than mouse (finger jitter)
  getTapThreshold() {
    return this.rsp?.tapThreshold || TAP_MOVE_THRESHOLD;
  }

  // "home" button: reset zoom and return to the founding district / plaza
  cameraHome() {
    const cam = this.cameras.main;
    cam.setZoom(Phaser.Math.Clamp(CAMERA_HOME_ZOOM, this.minZoom, CAMERA_MAX_ZOOM));
    if (this.isBuilderCity) {
      const anchor = this.getBuilderCameraAnchor();
      cam.centerOn(anchor.x, anchor.y);
    } else {
      cam.centerOn(PLAZA.x, PLAZA.y);
    }
    this.clampCameraToWorld();
  }

  getBuilderCameraAnchor() {
    const guild = this.buildings?.find((building) => building.id === 'guildhall' && building.isPlaced);
    if (guild) return { x: guild.x + 48, y: guild.y + 24 };
    return this.gridToVisual(
      Math.floor(GRID_CONFIG.columns / 2),
      Math.floor(GRID_CONFIG.rows / 2),
      { w: 1, h: 1 },
    );
  }

  zoomCamera(direction, pointer = null) {
    const cam = this.cameras.main;
    const factor = direction > 0 ? 1.12 : 1 / 1.12;
    const next = Phaser.Math.Clamp(cam.zoom * factor, this.minZoom, CAMERA_MAX_ZOOM);
    if (Math.abs(next - cam.zoom) < 0.0001) return;
    const focusX = pointer ? pointer.x : cam.width / 2;
    const focusY = pointer ? pointer.y : cam.height / 2;
    const originX = cam.width * cam.originX;
    const originY = cam.height * cam.originY;
    const localX = focusX - cam.x;
    const localY = focusY - cam.y;
    const worldX = cam.scrollX + originX + (localX - originX) / cam.zoom;
    const worldY = cam.scrollY + originY + (localY - originY) / cam.zoom;
    cam.setZoom(next);
    // Phaser refreshes its inverse camera matrix on the next render, so use
    // the explicit origin-aware transform here to anchor within this frame.
    cam.scrollX = worldX - originX - (localX - originX) / next;
    cam.scrollY = worldY - originY - (localY - originY) / next;
    this.clampCameraToWorld();
    if (this.buildMode && this.buildPreviewCell) {
      const world = this.gridTileVisualCenter(this.buildPreviewCell.x, this.buildPreviewCell.y);
      this.updateBuildPreview(world.x, world.y);
    }
  }

  clampCameraToWorld() {
    const cam = this.cameras.main;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, Math.max(0, this.worldWidth - viewW));
    cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, Math.max(0, this.worldHeight - viewH));
  }

  // two-finger pinch zoom for touch devices; returns true while pinching
  updatePinchZoom() {
    const p1 = this.input.pointer1;
    const p2 = this.input.pointer2;
    if (!p1?.isDown || !p2?.isDown) {
      this.pinchState = null;
      return false;
    }
    const distance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
    const focusX = (p1.x + p2.x) / 2;
    const focusY = (p1.y + p2.y) / 2;
    const cam = this.cameras.main;
    if (this.pinchState) {
      const scale = distance / Math.max(1, this.pinchState.distance);
      const next = Phaser.Math.Clamp(this.pinchState.zoom * scale, this.minZoom, CAMERA_MAX_ZOOM);
      const originX = cam.width * cam.originX;
      const originY = cam.height * cam.originY;
      const localX = focusX - cam.x;
      const localY = focusY - cam.y;
      const worldX = cam.scrollX + originX + (localX - originX) / cam.zoom;
      const worldY = cam.scrollY + originY + (localY - originY) / cam.zoom;
      cam.setZoom(next);
      cam.scrollX = worldX - originX - (localX - originX) / next;
      cam.scrollY = worldY - originY - (localY - originY) / next;
      this.clampCameraToWorld();
    } else {
      this.pinchState = { distance, zoom: cam.zoom };
    }
    this.cameraDrag.active = false;
    this.cameraDrag.moved = true;
    this.pinchSuppressUntil = this.time.now + 220;
    return true;
  }

  wasDragGesture(pointer) {
    if (!pointer) return this.time.now < (this.suppressTapUntil || 0) || this.time.now < (this.pinchSuppressUntil || 0);
    const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
    return dist > this.getTapThreshold()
      || this.time.now < (this.suppressTapUntil || 0)
      || this.time.now < (this.pinchSuppressUntil || 0);
  }

  getVisibleWorldRect() {
    const view = this.cameras.main.worldView;
    return {
      left: view.x,
      top: view.y,
      right: view.right,
      bottom: view.bottom,
    };
  }

  getWeekStartDay(day = this.day) {
    return Math.max(1, day - ((day - 1) % BALANCE.weekLength));
  }

  getStatsSnapshot() {
    const keys = [
      'questsCompleted',
      'questFailures',
      'whaleEvents',
      'premiumActions',
      'policiesChosen',
      'monsterAttacks',
      'monsterVictories',
      'monsterDamageEvents',
      'heroInjuries',
      'heroesLeft',
      'corruptionEvents',
    ];
    return Object.fromEntries(keys.map((key) => [key, Number(this.stats?.[key]) || 0]));
  }

  normalizeWeekTracker(savedTracker = null) {
    const weekStartDay = Number(savedTracker?.weekStartDay) || this.getWeekStartDay(this.day);
    return {
      weekStartDay,
      startResources: { ...this.resources, ...(savedTracker?.startResources || {}) },
      startStats: { ...this.getStatsSnapshot(), ...(savedTracker?.startStats || {}) },
      lines: Array.isArray(savedTracker?.lines) ? savedTracker.lines.slice(-24) : [],
    };
  }

  resetWeekTracker(nextStartDay = this.day + 1) {
    this.weekTracker = {
      weekStartDay: nextStartDay,
      startResources: { ...this.resources },
      startStats: this.getStatsSnapshot(),
      lines: [],
    };
    if (this.monsterState) this.monsterState.weekAttackCount = 0;
  }

  getSavePayload() {
    return {
      saveVersion: SAVE_VERSION,
      day: this.day,
      resources: { ...this.resources },
      upgradeLevels: { ...this.upgradeLevels },
      availableQuests: this.availableQuests,
      postedQuests: this.postedQuests,
      unlockedLocations: [...this.unlockedLocations],
      completedObjectives: [...this.completedObjectives],
      stats: { ...this.stats },
      townStageId: this.townStageId,
      townRankId: this.townRankId,
      townIdentityId: this.townIdentityId,
      townLog: (this.townLog || []).slice(-80),
      crises: { ...this.crises },
      achievements: [...(this.achievements || [])],
      pendingPolicy: this.pendingPolicy,
      discoveredPois: [...(this.discoveredPois || [])],
      poiCooldowns: { ...(this.poiCooldowns || {}) },
      townInventory: { ...(this.townInventory || {}) },
      tradeSettings: structuredClone(this.tradeSettings || normalizeTradeSettings()),
      productionIncidents: (this.productionSummary?.incidents || []).slice(-8),
      resourceNodes: structuredClone(this.resourceNodes || {}),
      resourceDeliveries: this.serializeResourceDeliveries(),
      harvestedForest: [...(this.harvestedForestCells || new Map())].map(([key, regrowDay]) => ({ key, regrowDay })),
      areaReputation: { ...(this.areaReputation || {}) },
      townReputation: this.townReputation,
      townPrestige: this.townPrestige,
      weeklyReport: this.weeklyReport,
      weekReportUnread: Boolean(this.weekReportUnread),
      weekTracker: this.weekTracker ? structuredClone(this.weekTracker) : null,
      monsterState: {
        lastAttackDay: Number(this.monsterState?.lastAttackDay) || 0,
        weekAttackCount: Number(this.monsterState?.weekAttackCount) || 0,
        activeAttacks: this.serializeMonsterActors(),
        aftermathDrops: this.serializeAftermathDrops(),
        aftermathQuests: this.aftermathQuests.slice(-24).map((quest) => ({ ...quest })),
        lairs: structuredClone(this.monsterLairs || {}),
        attackHistory: (this.monsterState?.attackHistory || []).slice(-WORLD_DANGER_LIMITS.attackHistoryLimit),
        defence: normalizeDefenceState(this.defenceState),
      },
      heroSocial: structuredClone(normalizeHeroSocialState(this.heroSocial)),
      tutorial: { ...this.tutorial },
      cityBuilder: {
        mapVersion: this.cityState.mapVersion || 2,
        mode: this.cityState.mode,
        unlockedZones: [...this.cityState.unlockedZones],
        revealed: [...(this.revealedTiles || [])],
        roads: this.cityState.roads.map((road) => ({ ...road })),
        placedBuildings: this.cityState.placedBuildings.map((building) => ({ ...building })),
        placedDecor: (this.cityState.placedDecor || []).map((decor) => ({ ...decor })),
        buildingRuntime: structuredClone(this.cityState.buildingRuntime || {}),
        simulation: {
          speed: this.simulationSpeed,
          elapsedMs: this.simulationElapsedMs,
        },
      },
      heroStats: Object.fromEntries((this.heroes || []).map((hero) => [hero.def.id, {
        name: hero.def.name,
        power: hero.stats.power,
        gold: hero.stats.gold,
        spent: hero.stats.spent,
        morale: hero.stats.morale,
        debt: hero.stats.debt,
        loyalty: hero.stats.loyalty,
        corruption: hero.stats.corruption,
        fame: hero.stats.fame,
        resentment: hero.stats.resentment,
        envy: hero.stats.envy || 0,
        inventory: Array.isArray(hero.stats.inventory) ? hero.stats.inventory.slice(0, 3) : [],
        whaleAccess: hero.stats.whaleAccess,
        originalPersonality: hero.stats.originalPersonality,
        currentPersonality: hero.stats.currentPersonality,
        status: hero.stats.status,
        currentMood: hero.stats.currentMood,
        history: hero.stats.history,
        evolutionStage: hero.stats.evolutionStage,
        daysInTown: hero.stats.daysInTown,
        cyclesActive: hero.stats.cyclesActive,
        active: hero.stats.active,
        rivalId: hero.stats.rivalId || null,
        admiredId: hero.stats.admiredId || null,
        resentmentTargetId: hero.stats.resentmentTargetId || null,
        injuredUntilDay: hero.stats.injuredUntilDay || 0,
        injuryState: hero.stats.injuryState || 'healthy',
        health: Math.max(0, Number(hero.stats.health) || 0),
        maxHealth: Math.max(1, Number(hero.stats.maxHealth) || 100),
        gatheringNodeId: hero.stats.gatheringNodeId || null,
        deathDay: hero.stats.deathDay || 0,
        deathLocation: hero.stats.deathLocation || null,
        favorite: Boolean(hero.stats.favorite),
        intent: hero.intent ? { ...hero.intent } : null,
        animationState: hero.animationState || hero.stats.animationState || 'idle',
        premiumExposure: hero.stats.premiumExposure || 0,
        equipment: normalizeHeroEquipment(hero.stats.equipment),
        awayUntil: hero.awayUntil || 0,
        combatTargetId: hero.combatTargetId || null,
        defenceOrder: hero.defenceOrder || null,
        socialProfile: structuredClone(hero.stats.socialProfile),
      }])),
    };
  }

  saveGame(showEvent = true) {
    const key = this.saveKey || getActiveSaveKey();
    const result = writeSaveAtomic(key, this.getSavePayload());
    if (result.ok) {
      this.lastSaveAt = Date.now();
      if (showEvent) {
        this.game.events.emit('gwg-event', 'Guild records saved locally. No cloud. No account. Just paperwork.');
      }
      this.game.events.emit('gwg-save-status', { state: 'saved', at: this.lastSaveAt });
      return true;
    }
    // The atomic write refused to replace a valid save with a bad one; the old
    // save is intact. Surface it rather than pretend success.
    if (showEvent) this.game.events.emit('gwg-event', 'The save clerk refused a bad ledger. Previous save kept intact.');
    this.game.events.emit('gwg-save-status', { state: 'error', error: result.error });
    return false;
  }

  resetGame() {
    // Safe reset: snapshot the current town into the backup ring, then remove
    // ONLY the active save key (never localStorage.clear()). The pre-reset
    // backup and any broken stash survive so the town is recoverable.
    safeReset(this.saveKey || getActiveSaveKey());
    window.location.reload();
  }

  // --- Save management UI ----------------------------------------------------

  formatBackupMeta(meta = {}) {
    if (meta.corrupt) return 'unreadable backup';
    const when = meta.timestamp ? new Date(meta.timestamp).toLocaleString() : 'unknown time';
    const reason = meta.reason ? ` (${meta.reason})` : '';
    return `Day ${meta.day ?? '?'} · ${meta.buildings ?? 0} buildings · ${meta.heroes ?? 0} heroes · ${when}${reason}`;
  }

  getSaveStatusLines() {
    const lines = [];
    if (this.lastSaveAt) {
      const t = new Date(this.lastSaveAt);
      lines.push(`Last saved: ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`);
    } else {
      lines.push('No manual save yet this session (autosave still runs).');
    }
    if (isTestSaveMode()) {
      lines.push('Test-save mode is active. The real save is untouched.');
    }
    return lines;
  }

  openSaveManagerPanel() {
    this.activeInspector = { type: 'save-manager' };
    this.clearSelection(false);
    const backups = listBackups();
    this.game.events.emit('gwg-inspector-open', {
      title: 'Save Management',
      subtitle: 'Export, import, back up, and restore your town.',
      sections: [
        { title: 'Status', lines: this.getSaveStatusLines() },
        {
          title: 'Backups',
          lines: backups.length
            ? [`${backups.length} backup${backups.length === 1 ? '' : 's'} kept. Newest: ${this.formatBackupMeta(backups[0].meta)}.`]
            : ['No backups yet. One is made automatically before risky actions.'],
        },
        {
          title: 'Notes',
          lines: [
            'Save files are plain JSON. Keep exports somewhere safe.',
            'Import always backs up your current town first.',
          ],
        },
      ],
      actions: [
        { label: 'Export Save', event: 'gwg-save-export' },
        { label: 'Import Save', event: 'gwg-save-import' },
        { label: 'Create Backup', event: 'gwg-create-backup' },
        { label: 'Restore Backup...', event: 'gwg-open-backups' },
        { label: 'Reset Game...', event: 'gwg-open-reset-confirm', className: 'gwg-danger-action' },
        { label: 'Close', event: 'gwg-inspector-close' },
      ],
    });
  }

  openBackupsPanel() {
    this.activeInspector = { type: 'backups' };
    this.clearSelection(false);
    const backups = listBackups();
    const rows = backups.map((backup) => ({
      title: backup.meta.corrupt ? 'Unreadable backup' : `Day ${backup.meta.day ?? '?'} · ${backup.meta.rank || 'camp'}`,
      meta: backup.meta.reason || '',
      lines: [this.formatBackupMeta(backup.meta)],
      actions: backup.meta.corrupt
        ? []
        : [{ label: 'Restore This', event: 'gwg-restore-backup', id: String(backup.index), className: 'gwg-danger-action' }],
    }));
    this.game.events.emit('gwg-inspector-open', {
      title: 'Restore Backup',
      subtitle: 'Roll the town back to a saved snapshot.',
      sections: rows.length ? [] : [{ title: 'Empty', lines: ['No backups exist yet.'] }],
      rows,
      actions: [{ label: 'Back', event: 'gwg-open-save-manager' }],
    });
  }

  exportSaveFromUi() {
    let preferences = null;
    try {
      const raw = window.localStorage.getItem(UI_PREFS_KEY);
      if (raw) preferences = JSON.parse(raw);
    } catch {
      preferences = null;
    }
    const bundle = buildExportBundle(this.getSavePayload(), preferences);
    const ok = downloadTextFile(exportFilename(), JSON.stringify(bundle, null, 2));
    this.game.events.emit('gwg-event', ok
      ? 'Save exported as JSON. Filed under "things future-you will thank you for."'
      : 'Export failed. The browser blocked the download politely.');
  }

  async importSaveFromUi() {
    const text = await pickSaveFile();
    if (text === null) return; // cancelled
    const parsed = parseImportedSave(text);
    if (!parsed.ok) {
      // Invalid import must never damage the current save.
      this._pendingImport = null;
      this.game.events.emit('gwg-inspector-open', {
        title: 'Import Rejected',
        subtitle: 'Your current town was not touched.',
        sections: [{
          title: 'Problem',
          lines: [
            `That file could not be read as a save (${parsed.reason}).`,
            'Your existing save remains exactly as it was.',
          ],
        }],
        actions: [{ label: 'Back', event: 'gwg-open-save-manager' }],
      });
      return;
    }
    this._pendingImport = parsed;
    const m = parsed.meta;
    this.activeInspector = { type: 'import-confirm' };
    this.game.events.emit('gwg-inspector-open', {
      title: 'Import This Save?',
      subtitle: 'Review before replacing your current town.',
      sections: [
        {
          title: 'Incoming Save',
          lines: [
            `Save version ${m.saveVersion}, Day ${m.day}, rank "${m.rank}".`,
            `${m.buildings} buildings, ${m.heroes} heroes, ${m.revealed} revealed tiles.`,
          ],
        },
        {
          title: 'Safety',
          lines: ['Your current town is automatically backed up before importing.'],
        },
      ],
      actions: [
        { label: 'Cancel', event: 'gwg-open-save-manager' },
        { label: 'Import and Reload', event: 'gwg-save-import-confirm', className: 'gwg-danger-action' },
      ],
    });
  }

  confirmImportFromUi() {
    const pending = this._pendingImport;
    if (!pending || !pending.ok) {
      this.game.events.emit('gwg-event', 'Nothing to import. The clerk shrugged.');
      return;
    }
    const result = applyImportedSave(pending.data, this.saveKey || getActiveSaveKey());
    if (!result.ok) {
      this.game.events.emit('gwg-event', `Import failed (${result.error}). Current save kept.`);
      return;
    }
    // Restore UI preferences if the bundle carried them.
    if (pending.preferences) {
      try {
        window.localStorage.setItem(UI_PREFS_KEY, JSON.stringify(pending.preferences));
      } catch {
        // non-fatal
      }
    }
    this._pendingImport = null;
    this.game.events.emit('gwg-event', 'Import successful. Reloading the guild...');
    window.location.reload();
  }

  createBackupFromUi() {
    const result = createBackup(this.saveKey || getActiveSaveKey(), 'manual');
    if (result.ok && result.skipped) {
      this.game.events.emit('gwg-event', 'Backup skipped: identical to the newest one already kept.');
    } else if (result.ok) {
      this.game.events.emit('gwg-event', 'Backup created. Three most recent snapshots are kept.');
    } else {
      this.game.events.emit('gwg-event', 'Backup failed: no current save to copy yet.');
    }
    if (this.activeInspector?.type === 'save-manager') this.openSaveManagerPanel();
  }

  restoreBackupFromUi(id) {
    const index = Number(id);
    if (!Number.isFinite(index)) return;
    const result = restoreBackup(index, this.saveKey || getActiveSaveKey());
    if (!result.ok) {
      this.game.events.emit('gwg-event', `Restore failed (${result.error}). Current save kept.`);
      return;
    }
    this.game.events.emit('gwg-event', 'Backup restored. Reloading the guild...');
    window.location.reload();
  }

  // --- Save recovery (shown when a save could not be loaded) -----------------

  openRecoveryPanel() {
    this.activeInspector = { type: 'save-recovery' };
    this.clearSelection(false);
    const backups = listBackups().filter((backup) => !backup.meta.corrupt);
    const reason = this._saveRecovery?.reason || 'unknown';
    const actions = [{ label: 'Retry Load', event: 'gwg-recover-retry' }];
    if (backups.length) {
      actions.push({ label: `Restore Latest Backup (${this.formatBackupMeta(backups[0].meta)})`, event: 'gwg-recover-restore' });
    }
    actions.push({ label: 'Export Broken Save', event: 'gwg-recover-export-broken' });
    actions.push({ label: 'Start New Game', event: 'gwg-recover-new-game', className: 'gwg-danger-action' });
    actions.push({ label: 'Dismiss', event: 'gwg-inspector-close' });
    this.game.events.emit('gwg-inspector-open', {
      title: 'Save Recovery',
      subtitle: 'Your saved town could not be loaded safely.',
      sections: [
        {
          title: 'What happened',
          lines: [
            `The save failed to load (${reason}).`,
            'It has been kept aside — nothing was deleted. You are currently in a fresh town.',
          ],
        },
        {
          title: 'Options',
          lines: [
            backups.length ? 'Restore your most recent backup to get your town back.' : 'No usable backups were found.',
            'You can also export the broken save to inspect or share it.',
          ],
        },
      ],
      actions,
    });
  }

  recoverRestoreLatestBackup() {
    const backups = listBackups().filter((backup) => !backup.meta.corrupt);
    if (!backups.length) {
      this.game.events.emit('gwg-event', 'No usable backup to restore.');
      return;
    }
    const result = restoreBackup(backups[0].index, this.saveKey || getActiveSaveKey());
    if (!result.ok) {
      this.game.events.emit('gwg-event', `Restore failed (${result.error}).`);
      return;
    }
    this.game.events.emit('gwg-event', 'Backup restored. Reloading...');
    window.location.reload();
  }

  recoverExportBrokenSave() {
    const broken = readBrokenSave();
    if (!broken || !broken.payload) {
      this.game.events.emit('gwg-event', 'No broken save found to export.');
      return;
    }
    const ok = downloadTextFile(`golden-whale-guild-broken-${new Date().toISOString().slice(0, 10)}.json`, broken.payload);
    this.game.events.emit('gwg-event', ok ? 'Broken save exported for inspection.' : 'Export failed politely.');
  }

  recoverStartNewGame() {
    // The broken save is already stashed; removing the active key just confirms
    // the fresh start. Nothing recoverable is destroyed.
    safeReset(this.saveKey || getActiveSaveKey());
    this.game.events.emit('gwg-event', 'Starting fresh. Your broken save is still kept aside.');
    window.location.reload();
  }

  recoverRetryLoad() {
    window.location.reload();
  }

  // Scene construction threw while consuming a save. Preserve the save, then
  // render a self-contained DOM recovery panel (the Phaser scene may be half
  // built and UIScene may not exist, so we cannot rely on the normal panel).
  handleCreateFailure(err) {
    // eslint-disable-next-line no-console
    console.error('[GWG] Scene creation failed; entering save recovery.', err);
    const key = this.saveKey || getActiveSaveKey();
    try {
      const raw = readRawSave(key);
      if (raw) stashBrokenSave(raw, `create:${err?.message || 'error'}`);
    } catch {
      // best effort
    }

    const backups = listBackups().filter((backup) => !backup.meta.corrupt);
    if (typeof document === 'undefined') return;
    if (document.getElementById('gwg-recovery-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'gwg-recovery-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:99999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(4,8,14,0.94)', 'color:#fff6dc',
      'font-family:system-ui,sans-serif', 'padding:24px',
    ].join(';');

    const backupLine = backups.length
      ? `Latest backup: Day ${backups[0].meta.day ?? '?'}, ${backups[0].meta.buildings ?? 0} buildings, ${backups[0].meta.heroes ?? 0} heroes.`
      : 'No usable backup was found.';

    const card = document.createElement('div');
    card.style.cssText = 'max-width:460px;background:#16202e;border:1px solid #bf8a38;border-radius:10px;padding:22px 24px;';
    card.innerHTML = `
      <h2 style="margin:0 0 8px;font-size:20px;color:#ffd479;">Save Recovery</h2>
      <p style="margin:0 0 10px;line-height:1.45;">Your saved town could not be loaded safely. It has been kept aside — nothing was deleted.</p>
      <p style="margin:0 0 16px;line-height:1.45;opacity:0.85;font-size:13px;">${backupLine}</p>
      <div id="gwg-recovery-actions" style="display:flex;flex-direction:column;gap:8px;"></div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const actionsHost = card.querySelector('#gwg-recovery-actions');
    const addButton = (label, danger, handler) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.cssText = [
        'padding:10px 14px', 'border-radius:6px', 'cursor:pointer',
        'font-weight:bold', 'font-size:14px', 'text-align:left',
        `border:1px solid ${danger ? '#c0533a' : '#bf8a38'}`,
        `background:${danger ? '#3a1d18' : '#223047'}`, 'color:#fff6dc',
      ].join(';');
      btn.addEventListener('click', handler);
      actionsHost.appendChild(btn);
    };

    addButton('Retry Load', false, () => window.location.reload());
    if (backups.length) {
      addButton('Restore Latest Backup', false, () => {
        const result = restoreBackup(backups[0].index, key);
        if (!result.ok) {
          window.alert(`Restore failed: ${result.error}`);
          return;
        }
        window.location.reload();
      });
    }
    addButton('Export Broken Save', false, () => {
      const broken = readBrokenSave();
      if (broken && broken.payload) {
        downloadTextFile(`golden-whale-guild-broken-${new Date().toISOString().slice(0, 10)}.json`, broken.payload);
      }
    });
    addButton('Start New Game', true, () => {
      // Broken save already stashed; removing the active key confirms a fresh
      // start without destroying anything recoverable.
      safeReset(key);
      window.location.reload();
    });
  }

  openMobileMorePanel() {
    this.activeInspector = { type: 'more' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', {
      title: 'Guild Menu',
      subtitle: 'Useful paperwork, tucked away from thumbs.',
      sections: [
        {
          title: 'Quick Access',
          lines: [
            'Build and Roads stay on the bar. Less urgent paperwork lives here.',
            'Save is local only. No accounts, no cloud, no premium memory.',
          ],
        },
      ],
      actions: [
        { label: 'Help', event: 'gwg-open-help' },
        { label: 'Town Log', event: 'gwg-open-town-log' },
        { label: 'Town Stores', event: 'gwg-open-stores' },
        { label: 'Policies', event: 'gwg-open-policies' },
        { label: 'Week Report', event: 'gwg-open-report' },
        { label: 'Town Ledger', event: 'gwg-open-ledger' },
        { label: 'Save', event: 'gwg-save' },
        { label: 'Save Manager', event: 'gwg-open-save-manager' },
        { label: 'Reset...', event: 'gwg-open-reset-confirm', className: 'gwg-danger-action' },
      ],
    });
  }

  openResetConfirmPanel() {
    this.activeInspector = { type: 'reset-confirm' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', {
      title: 'Reset This Town?',
      subtitle: 'Replaces the current town with a fresh start.',
      sections: [
        {
          title: 'Careful',
          lines: [
            'Reset clears the local town and reloads a new game.',
            'A backup of your current town is saved first, so this is undoable.',
            'The clerk still recommends exporting a copy before resetting.',
          ],
        },
      ],
      actions: [
        { label: 'Keep Save', event: 'gwg-inspector-close' },
        { label: 'Export First', event: 'gwg-save-export' },
        { label: 'Create Backup', event: 'gwg-create-backup' },
        { label: 'Reset Town', event: 'gwg-reset', className: 'gwg-danger-action' },
      ],
    });
  }

  openHelpPanel() {
    this.activeInspector = { type: 'help' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', {
      title: 'How To Play',
      subtitle: 'Short rules, no quarterly deck.',
      sections: [
        {
          title: 'Goal',
          lines: ['Survive, grow the town, and decide how much fairness you are willing to liquidate.'],
        },
        {
          title: 'Resources',
          lines: [
            'Gold buys upgrades, quest bounties, and bad ideas.',
            'Trust keeps honest heroes from leaving, complaining, or unionizing.',
            'Corruption makes money easier and consequences funnier.',
            'Morale helps heroes succeed. Threat means the dungeon is getting confident.',
          ],
        },
        {
          title: 'Town Inventory',
          lines: this.getInventoryClarityLines(),
        },
        {
          title: 'Quests',
          lines: ['Post bounties at the Notice Board, then let time run or Skip Day. Fair quests stabilize. Sponsored quests glitter suspiciously.'],
        },
        {
          title: 'Upgrades',
          lines: ['Use Town Ledger to compare costs and trade-offs. Fair buildings grow slowly. Golden Whale grows loudly.'],
        },
        {
          title: 'NPC Evolution',
          lines: ['Heroes remember quests, debt, premium nonsense, and failure. Inspect them to see stats, history, grudges, and current spiral.'],
        },
        {
          title: 'Golden Whale Warning',
          lines: [{ text: 'Fast gold. Big power. Terrible social consequences. Totally optional. Unless you enjoy winning.', className: 'gwg-whale' }],
        },
        {
          title: 'Crisis States',
          lines: ['Trust 0, Corruption 100, Morale 0, or Threat 100 creates a crisis. It is recoverable, but the town will be rude about it.'],
        },
      ],
      actions: [
        { label: 'Restart Tips', event: 'gwg-tutorial-start' },
      ],
    });
  }

  openTownStoresPanel() {
    this.activeInspector = { type: 'stores' };
    this.clearSelection(false);
    const townRank = this.getTownRankSnapshot();
    const resourceUse = {
      wood: {
        gained: 'Wood Grove, Resource Grove, exploration hauls',
        used: 'Lodging upgrades, construction hooks, future district comfort',
        shortage: this.getActiveHeroes().length > this.getLodgingReport().beds ? 'Bed pressure is high. Wood will matter for lodging growth.' : '',
      },
      iron: {
        gained: 'Iron Outcrop, Old Ruins, dangerous exploration',
        used: 'Blacksmith gear production and future defense upgrades',
        shortage: (this.townInventory?.iron || 0) <= 0 && ((this.townInventory?.weapons || 0) + (this.townInventory?.armor || 0)) <= 0 ? 'No iron or equipment stock. Heroes are bringing optimism to weapon fights.' : '',
      },
      herbs: {
        gained: 'Herb Patch, Resource Grove, careful exploration',
        used: 'Potion Shop recovery and injury mitigation',
        shortage: this.getActiveHeroes().some((hero) => this.isHeroInjured(hero)) && (this.townInventory?.potions || 0) <= 0 ? 'Injured heroes need potions or rest.' : '',
      },
      loot: {
        gained: 'Quests, monster drops, Loot Cave, abandoned supplies',
        used: 'Market converts loot into gold',
        shortage: (this.townInventory?.loot || 0) >= 5 ? 'Loot stockpile is high. Markets should convert it before it becomes decor.' : '',
      },
      potions: {
        gained: 'Potion Shop from herbs',
        used: 'Healing injured or missing heroes faster',
        shortage: this.getActiveHeroes().some((hero) => this.isHeroInjured(hero)) ? 'Injuries detected. Potions are no longer decorative soup.' : '',
      },
      weapons: {
        gained: 'Blacksmith from iron',
        used: 'Quest success, monster response, exploration safety',
        shortage: (this.townInventory?.weapons || 0) <= 1 && this.resources.threat > 45 ? 'Threat is rising and weapon stock is thin.' : '',
      },
      armor: { gained: 'Blacksmith from iron', used: 'Injury and death mitigation', shortage: '' },
      planks: { gained: 'Sawmill from wood', used: 'Workshops and construction progression', shortage: '' },
      tools: { gained: 'Workshop or Blacksmith', used: 'Extraction and production efficiency', shortage: '' },
      tradeGoods: { gained: 'Salvage Yard from loot', used: 'Stable Market exports', shortage: '' },
      premiumSalvage: { gained: 'Premium wreckage nodes', used: 'Premium Fabricator', shortage: '' },
      premiumComponents: { gained: 'Premium Fabricator', used: 'Premium hero equipment', shortage: '' },
    };
    const rows = RESOURCE_TYPES
      .filter((resource) => this.storeFilter === 'all' || RESOURCE_BY_ID[resource.id]?.group === this.storeFilter)
      .map((resource) => {
      const info = resourceUse[resource.id] || {};
      const amount = this.townInventory?.[resource.id] || 0;
      const stored = STORED_RESOURCES.includes(resource.id) || PROCESSED_RESOURCES.includes(resource.id);
      const cap = this.getStorageCap(resource.id);
      const incoming = this.getIncomingDeliveries(resource.id);
      const production = this.getResourceProductionRate(resource.id);
      const full = stored && amount >= cap;
      return {
        title: resource.label,
        meta: `${RESOURCE_BY_ID[resource.id]?.group || 'stock'} - ${stored ? `${amount}/${cap}` : amount}`,
        kind: (info.shortage || full) ? 'shady' : 'fair',
        preview: this.getAssetPreviewUrl(resource.icon),
        lines: [
          resource.blurb,
          ...(stored ? [`Storage: ${amount}/${cap}${incoming ? ` (+${incoming} incoming)` : ''}. Extraction rate ~${production}/day.`] : []),
          `Gained from: ${info.gained || 'town events and future systems'}.`,
          `Used by: ${info.used || 'future town services'}.`,
          ...(full ? [{ text: 'Storage FULL - extraction paused. Build/upgrade a Storehouse.', className: 'gwg-bad' }] : []),
          ...(info.shortage ? [{ text: info.shortage, className: 'gwg-bad' }] : (full ? [] : [{ text: 'No urgent shortage right now.', className: 'gwg-muted' }])),
        ],
      };
    });
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'stores',
      title: 'Town Stores',
      subtitle: `${townRank.name} - rank score ${townRank.score}${townRank.next ? `/${townRank.next.score}` : ' / MAX'}`,
      tabs: [
        { id: 'all', label: 'All', event: 'gwg-store-filter', active: this.storeFilter === 'all' },
        { id: 'raw', label: 'Raw', event: 'gwg-store-filter', active: this.storeFilter === 'raw' },
        { id: 'processed', label: 'Processed', event: 'gwg-store-filter', active: this.storeFilter === 'processed' },
        { id: 'hero', label: 'Hero Supplies', event: 'gwg-store-filter', active: this.storeFilter === 'hero' },
        { id: 'trade', label: 'Trade', event: 'gwg-store-filter', active: this.storeFilter === 'trade' },
      ],
      sections: [
        {
          title: 'Why This Matters',
          lines: [
            'Raw stock travels to production. Finished goods supply heroes, construction, and trade.',
            'Shortage notes point to useful buildings instead of asking you to memorize the economy.',
          ],
        },
        {
          title: `Town Rank - ${townRank.name}`,
          lines: [
            townRank.description,
            townRank.next ? `Progress: ${townRank.score}/${townRank.next.score} toward ${townRank.next.name}.` : 'Progress: MAX. The kingdom has noticed the invoices.',
            ...townRank.requirements,
          ],
        },
        {
          title: 'External Trade',
          lines: this.getTradeInspectorLines(),
        },
      ],
      rows,
      actions: [
        { label: this.tradeSettings.autoExport ? 'Pause Auto-Export' : 'Enable Auto-Export', event: 'gwg-trade-action', id: 'toggle-auto' },
        { label: 'Change Export Good', event: 'gwg-trade-action', id: 'cycle-export' },
      ],
    });
  }

  setStoreFilterFromUi(filter) {
    this.storeFilter = ['all', 'raw', 'processed', 'hero', 'trade'].includes(filter) ? filter : 'all';
    this.openTownStoresPanel();
  }

  getOnboardingStep() {
    return ONBOARDING_STEPS[this.tutorial?.step || 0] || null;
  }

  maybeShowOnboarding(force = false) {
    if (!this.tutorial) return;
    if (!force && (this.tutorial.completed || this.tutorial.skipped)) return;
    const step = this.getOnboardingStep();
    if (!step) return;
    this.activeInspector = { type: 'onboarding' };
    this.clearSelection(false);
    const actions = [];
    if (step.next) actions.push({ label: step.next, event: 'gwg-tutorial-next' });
    if (step.action) actions.push(step.action);
    actions.push({ label: 'Skip Tips', event: 'gwg-tutorial-skip' });
    this.game.events.emit('gwg-inspector-open', {
      title: step.title,
      subtitle: `Tip ${Math.min((this.tutorial.step || 0) + 1, ONBOARDING_STEPS.length)} / ${ONBOARDING_STEPS.length}`,
      sections: [{
        title: 'Guild Clerk Note',
        lines: [step.body],
      }],
      actions,
    });
  }

  advanceOnboardingFromUi() {
    this.advanceOnboarding();
  }

  advanceOnboarding(target = null, showNext = true) {
    if (!this.tutorial || this.tutorial.completed || this.tutorial.skipped) return;
    const step = this.getOnboardingStep();
    if (!step) return;
    if (target && step.target && step.target !== target) return;
    this.tutorial.step += 1;
    if (this.tutorial.step >= ONBOARDING_STEPS.length) {
      this.tutorial.completed = true;
      this.tutorial.skipped = false;
      this.game.events.emit('gwg-event', 'Tutorial complete. The guild denies all responsibility for what you do next.');
      this.saveGame(false);
      return;
    }
    this.saveGame(false);
    if (showNext) this.time.delayedCall(350, () => this.maybeShowOnboarding(true));
  }

  skipOnboarding() {
    if (!this.tutorial) return;
    this.tutorial.skipped = true;
    this.tutorial.completed = false;
    this.saveGame(false);
    this.hideTooltip();
    this.game.events.emit('gwg-event', 'Tutorial skipped. Confidence is now your onboarding plan.');
  }

  restartOnboarding() {
    this.tutorial = { step: 0, completed: false, skipped: false };
    this.saveGame(false);
    this.maybeShowOnboarding(true);
  }

  getTownIdentity() {
    const whaleLevel = this.buildingById?.whale ? this.getPlaceLevel(this.buildingById.whale) : 1;
    const fairLevelTotal = ['tavern', 'blacksmith', 'guildhall', 'training']
      .reduce((sum, id) => sum + this.getPlaceLevel(this.buildingById?.[id]), 0);
    if (
      this.resources.trust <= RESOURCE_THRESHOLDS.trustCritical
      || this.resources.morale <= RESOURCE_THRESHOLDS.moraleCritical
      || this.resources.threat >= RESOURCE_THRESHOLDS.threatCritical
    ) return { id: 'collapse', ...TOWN_IDENTITIES.collapse };
    if (whaleLevel >= 4 || this.resources.corruption >= RESOURCE_THRESHOLDS.corruptionCritical) return { id: 'whale', ...TOWN_IDENTITIES.whale };
    if (this.resources.corruption >= RESOURCE_THRESHOLDS.corruptionWarning || (this.stats.shadyUpgrades || 0) > (this.stats.fairUpgrades || 0) + 1) {
      return { id: 'shady', ...TOWN_IDENTITIES.shady };
    }
    if (fairLevelTotal >= 10 && this.resources.trust >= 55 && whaleLevel < 3) return { id: 'fair', ...TOWN_IDENTITIES.fair };
    return { id: 'balanced', ...TOWN_IDENTITIES.balanced };
  }

  checkTownIdentity(silent = false) {
    const identity = this.getTownIdentity();
    this.registry?.set('townIdentity', identity.name);
    if (identity.id === this.townIdentityId) return;
    this.townIdentityId = identity.id;
    const text = `Town Identity: ${identity.name}. ${identity.line}`;
    this.addTownLog(text, 'economy');
    this.addReportLine('stage', text);
    if (!silent) {
      this.game.events.emit('gwg-event', text);
      this.floatText(PLAZA.x, PLAZA.y - 112, identity.name.toUpperCase(), identity.id === 'whale' ? '#f6c945' : '#7fdc93');
    }
  }

  addTownLog(text, category = 'event') {
    if (!text) return;
    this.townLog = Array.isArray(this.townLog) ? this.townLog : [];
    this.townLog.push({ day: this.day, text, category });
    while (this.townLog.length > 80) this.townLog.shift();
  }

  addReportLine(section, text) {
    if (!text) return;
    if (this.cycleReport) {
      if (!Array.isArray(this.cycleReport[section])) this.cycleReport[section] = [];
      this.cycleReport[section].push(text);
    }
    this.addWeekLine(section, text);
  }

  addWeekLine(category, text) {
    if (!text) return;
    this.weekTracker = this.weekTracker || this.normalizeWeekTracker();
    this.weekTracker.lines = Array.isArray(this.weekTracker.lines) ? this.weekTracker.lines : [];
    this.weekTracker.lines.push({ day: this.day, category, text });
    while (this.weekTracker.lines.length > 36) this.weekTracker.lines.shift();
  }

  beginCycleReport() {
    this.cycleReport = {
      day: this.day,
      start: { ...this.resources },
      quests: [],
      npc: [],
      unlocks: [],
      warnings: [],
      stage: [],
      crises: [],
      achievements: [],
      policies: [],
      monsters: [],
    };
  }

  getResourceDeltaSummary(start = {}, end = this.resources) {
    return ['gold', 'trust', 'corruption', 'morale', 'threat'].map((key) => ({
      key,
      value: (end[key] || 0) - (start[key] || 0),
    }));
  }

  getCurrentStage() {
    return TOWN_STAGES.find((stage) => stage.id === this.townStageId) || TOWN_STAGES[0];
  }

  getStageIndex(id = this.townStageId) {
    return Math.max(0, TOWN_STAGES.findIndex((stage) => stage.id === id));
  }

  getUpgradedPlaceCount() {
    return Object.values(this.placeById || {})
      .filter((place) => this.getPlaceLevel(place) >= 2)
      .length;
  }

  checkStageProgression(silent = false) {
    if (!this.placeById) return;
    let target = this.getCurrentStage();
    for (const stage of TOWN_STAGES) {
      if (stage.requirement(this)) target = stage;
    }
    if (target.id === this.townStageId) {
      this.registry?.set('townStage', this.getCurrentStage().name);
      return;
    }
    this.townStageId = target.id;
    this.stats.stageUps = (this.stats.stageUps || 0) + 1;
    this.registry?.set('townStage', target.name);
    this.addTownLog(`Stage reached: ${target.name}. ${target.message}`, 'stage');
    this.addReportLine('stage', `${target.name}: ${target.message}`);
    if (!silent) {
      this.game.events.emit('gwg-event', `Town stage: ${target.name}. ${target.message}`);
      this.floatText(PLAZA.x, PLAZA.y - 96, target.name.toUpperCase(), '#ffe08a');
    }
  }

  getDangerWarnings() {
    const warnings = [];
    if (this.resources.trust <= RESOURCE_THRESHOLDS.trustCritical) warnings.push('Trust is near collapse. Fair quests and the Complaint Barrel matter now.');
    else if (this.resources.trust < 30) warnings.push('Trust is low. Honest heroes may leave.');
    if (this.resources.corruption >= RESOURCE_THRESHOLDS.corruptionCritical) warnings.push('Corruption is near scandal. Ethics decreased. Sparkle effects increased.');
    else if (this.resources.corruption > 70) warnings.push('Corruption is high. Debt and shady events are more likely.');
    if (this.resources.morale <= RESOURCE_THRESHOLDS.moraleCritical) warnings.push('Morale is near crash. The Tavern is not decorative anymore.');
    else if (this.resources.morale < 30) warnings.push('Morale is low. Ragequits and failures become louder.');
    if (this.resources.threat >= RESOURCE_THRESHOLDS.threatCritical) warnings.push('Threat is near invasion. The dungeon is making eye contact.');
    else if (this.resources.threat > 80) warnings.push('Threat is critical. Monsters may visit in person.');
    return warnings;
  }

  getAccountantNote() {
    const stageIndex = this.getStageIndex();
    const index = (this.day + stageIndex + (this.stats.policiesChosen || 0)) % ACCOUNTANT_NOTES.length;
    return ACCOUNTANT_NOTES[index];
  }

  makeWeeklyReportIfDue() {
    const tracker = this.weekTracker || this.normalizeWeekTracker();
    const endDay = this.day;
    if (endDay < tracker.weekStartDay + BALANCE.weekLength - 1) return false;

    const startDay = tracker.weekStartDay;
    const week = Math.floor((endDay - 1) / BALANCE.weekLength) + 1;
    const statsNow = this.getStatsSnapshot();
    const statDelta = Object.fromEntries(Object.entries(statsNow).map(([key, value]) => [
      key,
      value - (tracker.startStats?.[key] || 0),
    ]));
    const importantCategories = new Set([
      'quest', 'policy', 'stage', 'achievement', 'unlock', 'crisis', 'monster', 'golden_whale', 'economy', 'npc',
    ]);
    const importantLog = (this.townLog || [])
      .filter((entry) => entry.day >= startDay && entry.day <= endDay && importantCategories.has(entry.category))
      .slice(-8)
      .map((entry) => `Day ${entry.day}: ${entry.text}`);
    const headline = Phaser.Utils.Array.GetRandom(WEEKLY_REPORT_LINES);
    const pendingPolicy = this.getPendingPolicy();
    const pendingAge = this.getPendingPolicyAge();
    const featuredBuilding = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced)
      .sort((a, b) => {
        const aRuntime = this.getBuildingRuntime(a.id);
        const bRuntime = this.getBuildingRuntime(b.id);
        const aUse = aRuntime.servicesProvided || aRuntime.visits || 0;
        const bUse = bRuntime.servicesProvided || bRuntime.visits || 0;
        return bUse - aUse;
      })[0];
    const featuredBuildingId = getBaseBuildingId(featuredBuilding?.baseId || featuredBuilding?.id || 'guildhall');
    const buildingSummary = getSatireLine('building', featuredBuildingId, 'week_report', {
      day: this.day,
      stage: this.getStageIndex(),
      fallback: 'Town services survived the week with only the usual interpretive accounting.',
    });
    this.weeklyReport = {
      week,
      startDay,
      endDay,
      createdDay: this.day,
      startResources: { ...(tracker.startResources || this.resources) },
      endResources: { ...this.resources },
      statDelta,
      lines: [...(tracker.lines || []), buildingSummary].slice(-12),
      importantLog,
      socialMilestones: (this.heroSocial.events || [])
        .filter((event) => event.day >= startDay && event.day <= endDay && event.major)
        .slice(-7)
        .map((event) => event.text),
      pendingPolicy: pendingPolicy
        ? `${pendingPolicy.title} (${pendingAge} day${pendingAge === 1 ? '' : 's'} pending)`
        : 'No pending policy. Suspiciously decisive.',
      note: `"${this.getAccountantNote()}"`,
      headline,
    };
    this.weekReportUnread = true;
    this.addTownLog(`${headline} Week ${week} report is ready.`, 'report');
    this.addTownLog(buildingSummary, 'economy');
    this.game.events.emit('gwg-event', `Week Report Ready: Week ${week}. The town survived, technically.`);
    this.resetWeekTracker(endDay + 1);
    return true;
  }

  formatDeltaLine({ key, value }) {
    const sign = value > 0 ? '+' : '';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const className = (
      (key === 'gold' && value >= 0)
      || (['trust', 'morale'].includes(key) && value >= 0)
      || (['corruption', 'threat'].includes(key) && value <= 0)
    ) ? 'gwg-good' : 'gwg-bad';
    return { text: `${label}: ${sign}${value}`, className };
  }

  getCycleReportPayload() {
    const report = this.weeklyReport;
    const sections = report ? [
      {
        title: 'Town Identity',
        lines: [{
          text: `${this.getTownIdentity().name}: ${this.getTownIdentity().line}`,
          className: this.getTownIdentity().id === 'whale' ? 'gwg-whale' : 'gwg-muted',
        }],
      },
      {
        title: 'Resource Changes',
        lines: this.getResourceDeltaSummary(report.startResources, report.endResources).map((entry) => this.formatDeltaLine(entry)),
      },
      {
        title: 'Week Counts',
        lines: [
          `Quests completed: ${report.statDelta.questsCompleted || 0}`,
          `Quest failures: ${report.statDelta.questFailures || 0}`,
          `Monster events: ${report.statDelta.monsterAttacks || 0}`,
          `Hero injuries/leaves: ${(report.statDelta.heroInjuries || 0) + (report.statDelta.heroesLeft || 0)}`,
          `Premium purchases/actions: ${(report.statDelta.whaleEvents || 0) + (report.statDelta.premiumActions || 0)}`,
          `Corruption events: ${(report.statDelta.corruptionEvents || 0) + (report.statDelta.whaleEvents || 0)}`,
          `Policies chosen: ${report.statDelta.policiesChosen || 0}`,
        ],
      },
      {
        title: 'Highlights',
        lines: report.lines?.length
          ? report.lines.slice(-7).map((entry) => `Day ${entry.day}: ${entry.text}`)
          : ['No major incidents. The report is suspicious of this.'],
      },
      {
        title: 'Town Log Picks',
        lines: report.importantLog?.length
          ? report.importantLog
          : ['The town log mostly contained ordinary panic.'],
      },
      {
        title: 'Hero Stories',
        lines: report.socialMilestones?.length
          ? report.socialMilestones
          : ['No major friendship, rivalry, party, career, contract, retirement, or legacy milestone this week.'],
      },
      {
        title: 'Policy Status',
        lines: [report.pendingPolicy],
      },
      {
        title: 'Town Accountant Note',
        lines: [{ text: report.note, className: 'gwg-whale' }],
      },
    ] : [
      {
        title: 'Week Report',
        lines: ['No week report is ready yet. Reports arrive every 7 days and no longer interrupt the town.'],
      },
    ];
    const defence = DEFENCE_PRIORITIES[this.defenceState?.priority] || DEFENCE_PRIORITIES.balanced;
    sections.push({
      title: 'Town Defence Priority',
      lines: [
        defence.name,
        defence.id === 'premium'
          ? 'Premium structures receive disproportionate protection. Resentment has been included at no extra charge.'
          : 'Automatic responders use this priority when weighing civilians, storage, pursuit distance, and defensive positions.',
      ],
    });

    // live advisor + stores status, always current regardless of report week
    const lodging = this.getLodgingReport();
    sections.push(
      { title: 'Guild Advisor', lines: this.getAdvisorNotes() },
      {
        title: 'Town Stores',
        lines: [
          formatInventoryLine(this.townInventory),
          ...this.getInventoryClarityLines().slice(0, 6),
          `Beds: ${lodging.used}/${lodging.beds} used - rest quality ${lodging.restQuality}`,
        ],
      },
    );

    return {
      panelType: 'week-report',
      title: report ? `Week ${report.week} Report` : 'Week Reports',
      subtitle: report
        ? `Days ${report.startDay}-${report.endDay} - ${report.headline}`
        : 'Reports are weekly now and never stop the town clock.',
      sections,
      rows: [],
      actions: this.getPendingPolicy()
        ? [{ label: 'Open Policies', event: 'gwg-open-policies' }]
        : [],
    };
  }

  showCycleReport() {
    if (!this.weeklyReport) {
      this.game.events.emit('gwg-event', 'No week report is ready yet. Policies have their own suspicious desk now.');
      return;
    }
    this.activeInspector = { type: 'report' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', this.getCycleReportPayload());
    this.weekReportUnread = false;
    this.stats.weekReportsRead = (this.stats.weekReportsRead || 0) + 1;
    this.checkObjectives();
    this.updateTownNotice();
    this.publishObjectives();
    this.saveGame(false);
  }

  getPolicyPayload() {
    const pendingPolicy = this.getPendingPolicy();
    const age = this.getPendingPolicyAge();
    const defence = DEFENCE_PRIORITIES[this.defenceState?.priority] || DEFENCE_PRIORITIES.balanced;
    const sections = pendingPolicy ? [
      {
        title: 'Pending Policy',
        lines: [
          pendingPolicy.description,
          `Ignored for ${age} day${age === 1 ? '' : 's'}. Time continues; consequences slowly do paperwork.`,
        ],
      },
    ] : [
      {
        title: 'Policies',
        lines: [
          'No policy is pending.',
          'The council is resting, which is always how the next problem starts.',
        ],
      },
    ];
    const influential = this.getActiveHeroes()
      .map((hero) => ({ hero, profile: this.getHeroProfile(hero) }))
      .filter((entry) => entry.profile.influence >= 18)
      .sort((a, b) => b.profile.influence - a.profile.influence)
      .slice(0, 4);
    if (influential.length) {
      sections.push({
        title: 'Guild Voices',
        lines: influential.map(({ hero, profile }) => {
          const opinion = profile.faction === 'Premium Enthusiasts'
            ? 'supports convenient power and suspiciously fast outcomes'
            : profile.faction === 'Honest Veterans' || profile.faction === 'Protectors'
              ? 'supports fair treatment, safety, and promises that survive accounting'
              : profile.faction === 'Frontier Hunters'
                ? 'supports decisive action against lairs'
                : 'wants the policy to produce visible results';
          return `${hero.def.name} (${profile.faction}, influence ${Math.round(profile.influence)}): ${opinion}.`;
        }),
      });
    }

    const rows = pendingPolicy ? pendingPolicy.options.map((option) => ({
      title: option.label,
      meta: 'Policy Option',
      kind: option.id.includes('sponsored') || option.id.includes('sell') || option.id.includes('premium') ? 'shady' : 'fair',
      lines: [
        option.summary,
        { text: option.text, className: 'gwg-muted' },
        ...Object.entries(option.deltas || {})
          .filter(([, value]) => value)
          .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)} ${value > 0 ? '+' : ''}${value}`),
      ],
      actions: [{
        label: 'Choose Policy',
        event: 'gwg-policy-choice',
        id: option.id,
      }],
    })) : [];

    return {
      panelType: 'policy',
      title: pendingPolicy ? 'Policy Pending' : 'Policies',
      subtitle: pendingPolicy ? pendingPolicy.title : 'No active decisions',
      sections,
      rows,
      actions: [
        { label: `Defence: ${defence.name}`, event: 'gwg-defense-policy', id: 'cycle' },
        { label: 'Open Threat Alerts', event: 'gwg-open-defense-alerts' },
        ...(this.weeklyReport ? [{ label: 'Open Week Report', event: 'gwg-open-report' }] : []),
      ],
    };
  }

  showPolicyPanel() {
    this.activeInspector = { type: 'policies' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', this.getPolicyPayload());
  }

  // End-of-day is never a forced modal. Daily summaries are small; detailed
  // reports are generated only at weekly boundaries.
  presentCycleReport(weekReady = false) {
    if (!this.cycleReport) return;
    const attention = [];
    if (this.getPendingPolicy()) attention.push('Policy choice pending');
    if (this.cycleReport.crises?.length) attention.push('Town crisis!');
    if (this.cycleReport.monsters?.length) attention.push(`${this.cycleReport.monsters.length} monster event${this.cycleReport.monsters.length === 1 ? '' : 's'}`);
    const deltas = this.getResourceDeltaSummary(this.cycleReport.start || this.resources)
      .filter((entry) => entry.value !== 0)
      .slice(0, 4)
      .map((entry) => `${entry.key.charAt(0).toUpperCase() + entry.key.slice(1)} ${entry.value > 0 ? '+' : ''}${entry.value}`)
      .join('   ');
    this.game.events.emit('gwg-day-summary', {
      day: this.day,
      reportReady: weekReady,
      summary: attention.length
        ? `${attention.join('  ')}   ${deltas}`.trim()
        : (deltas || 'A quiet day. Suspiciously quiet.'),
    });
    this.updateTownNotice();
  }

  // compact "! ..." badge next to the Day counter
  updateTownNotice() {
    const parts = [];
    if (this.getPendingPolicy()) parts.push('Policy Pending');
    if (this.weekReportUnread) parts.push('Week Report Ready');
    const activeAlerts = this.getActiveDefenceAlerts?.() || [];
    if (activeAlerts.length) parts.push(`Threat Alert ${activeAlerts.length}`);
    const notice = parts.join(' / ');
    this.registry.set('townNotice', notice);
  }

  getPendingPolicy() {
    const id = typeof this.pendingPolicy === 'string' ? this.pendingPolicy : this.pendingPolicy?.id;
    return POLICY_EVENTS.find((policy) => policy.id === id) || null;
  }

  getPendingPolicyAge() {
    if (!this.pendingPolicy) return 0;
    const offeredDay = typeof this.pendingPolicy === 'string'
      ? this.day
      : Number(this.pendingPolicy.offeredDay) || this.day;
    return Math.max(0, this.day - offeredDay);
  }

  maybeOfferPolicy() {
    if (this.pendingPolicy || this.day < 4 || this.day % BALANCE.policyInterval !== 0) return;
    const policy = POLICY_EVENTS[(Math.floor(this.day / BALANCE.policyInterval) + this.getStageIndex()) % POLICY_EVENTS.length];
    this.pendingPolicy = { id: policy.id, offeredDay: this.day, ignoredDays: 0, lastNeglectDay: 0 };
    this.addTownLog(`Policy offered: ${policy.title}.`, 'policy');
    this.addReportLine('policies', `${policy.title} is waiting for a choice.`);
    this.updateTownNotice();
  }

  applyPendingPolicyNeglect() {
    const policy = this.getPendingPolicy();
    if (!policy) return;
    const pending = typeof this.pendingPolicy === 'string'
      ? { id: this.pendingPolicy, offeredDay: this.day, ignoredDays: 0, lastNeglectDay: 0 }
      : this.pendingPolicy;
    const age = Math.max(0, this.day - (Number(pending.offeredDay) || this.day));
    if (age < BALANCE.policyNeglectDelay || age % 2 !== 0 || pending.lastNeglectDay === this.day) {
      this.pendingPolicy = pending;
      return;
    }
    const deltas = {
      trust: -1,
      morale: -1,
      threat: policy.id === 'ethics-hearing' ? 1 : 2,
      corruption: ['ethics-hearing', 'debt-day'].includes(policy.id) ? 1 : 0,
    };
    pending.ignoredDays = age;
    pending.lastNeglectDay = this.day;
    this.pendingPolicy = pending;
    this.applyDeltas(deltas);
    const text = Phaser.Utils.Array.GetRandom(POLICY_NEGLECT_LINES);
    this.game.events.emit('gwg-event', `${text} (${policy.title} still pending.)`);
    this.addTownLog(`${text} Pending: ${policy.title}.`, 'policy');
    this.addReportLine('policies', `${policy.title} ignored for ${age} days. ${text}`);
    this.floatDeltas(PLAZA.x, PLAZA.y - 74, deltas);
    this.updateTownNotice();
  }

  choosePolicyFromUi(optionId) {
    const policy = this.getPendingPolicy();
    if (!policy) {
      this.game.events.emit('gwg-event', 'No policy is pending. The committee has briefly run out of harm.');
      return;
    }
    const option = policy.options.find((item) => item.id === optionId);
    if (!option) return;
    if (option.deltas?.gold < 0 && this.resources.gold < Math.abs(option.deltas.gold)) {
      this.game.events.emit('gwg-event', 'Not enough gold for policy virtue. The accountant recommends hypocrisy.');
      return;
    }

    this.applyDeltas(option.deltas || {});
    option.hero?.(this);
    const premiumChoice = /premium|sponsor|sell|whale/i.test(`${option.id} ${option.label}`);
    for (const hero of this.getActiveHeroes()) {
      const profile = this.getHeroProfile(hero);
      const approves = premiumChoice
        ? profile.faction === 'Premium Enthusiasts'
        : ['Honest Veterans', 'Protectors', 'Tired Survivors'].includes(profile.faction);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + (approves ? 2 : -2), 0, 100);
      profile.contract.satisfaction = Phaser.Math.Clamp(profile.contract.satisfaction + (approves ? 2 : -3), 0, 100);
    }
    this.pendingPolicy = null;
    this.updateTownNotice();
    this.stats.policiesChosen = (this.stats.policiesChosen || 0) + 1;
    this.floatDeltas(PLAZA.x, PLAZA.y - 90, option.deltas || {});
    this.game.events.emit('gwg-event', option.text);
    this.addTownLog(`Policy chosen: ${option.label}. ${option.text}`, 'policy');
    this.addReportLine('policies', `${option.label}: ${option.text}`);
    this.checkStageProgression();
    this.checkTownIdentity();
    this.checkAchievements();
    this.refreshActivePanel();
    this.saveGame(false);
    this.showPolicyPanel();
  }

  boostHeroGroup(group, changes, historyLine) {
    for (const hero of this.getActiveHeroes()) {
      const match = (
        (group === 'honest' && this.isHonestHero(hero.def))
        || (group === 'whale' && this.isWhaleHero(hero.def))
        || (group === 'debt' && this.isDebtHero(hero.def))
      );
      if (!match) continue;
      for (const [key, amount] of Object.entries(changes)) {
        hero.stats[key] = Phaser.Math.Clamp((hero.stats[key] || 0) + amount, 0, key === 'debt' ? 2000 : 100);
      }
      this.addHeroHistory(hero, historyLine);
      this.refreshHeroStatusMarker(hero);
    }
  }

  coolResentment(amount, historyLine) {
    for (const hero of this.getActiveHeroes()) {
      hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) - amount, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp((hero.stats.loyalty || 0) + 3, 0, 100);
      this.addHeroHistory(hero, historyLine);
    }
  }

  raiseResentment(amount, historyLine) {
    for (const hero of this.getActiveHeroes().filter((item) => !this.isWhaleHero(item.def))) {
      hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) + amount, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp((hero.stats.loyalty || 0) - 3, 0, 100);
      this.addHeroHistory(hero, historyLine);
    }
  }

  reduceHeroDebt(amount, historyLine) {
    for (const hero of this.getActiveHeroes()) {
      if ((hero.stats.debt || 0) <= 0) continue;
      hero.stats.debt = Math.max(0, hero.stats.debt - amount);
      hero.stats.morale = Phaser.Math.Clamp((hero.stats.morale || 0) + 4, 0, 100);
      this.addHeroHistory(hero, historyLine);
    }
  }

  addDebtToDebtHeroes(amount, historyLine) {
    for (const hero of this.getActiveHeroes().filter((item) => this.isDebtHero(item.def) || item.stats.debt > 0)) {
      hero.stats.debt += amount;
      hero.stats.morale = Phaser.Math.Clamp((hero.stats.morale || 0) - 4, 0, 100);
      this.addHeroHistory(hero, historyLine);
    }
  }

  buildRelationship(sourceHero, trigger = '') {
    const active = this.getActiveHeroes();
    if (active.length < 2) return;

    if (trigger === 'whaleEvent') {
      if (!sourceHero) return;
      const honest = active
        .filter((hero) => this.isHonestHero(hero.def) && hero.def.id !== sourceHero.def.id)
        .sort((a, b) => (b.stats.resentment || 0) - (a.stats.resentment || 0))[0];
      if (honest && honest.stats.rivalId !== sourceHero.def.id) {
        honest.stats.rivalId = sourceHero.def.id;
        honest.stats.resentmentTargetId = sourceHero.def.id;
        const text = `${honest.def.name} now considers ${sourceHero.def.name} a balance incident.`;
        this.addHeroHistory(honest, text);
        this.addTownLog(text, 'npc');
        this.addReportLine('npc', text);
        this.game.events.emit('gwg-event', text);
      }
      return;
    }

    const mentor = active.find((hero) => hero.stats.status === 'Mentor');
    const weak = active
      .filter((hero) => hero.def.id !== mentor?.def.id && (hero.stats.power || 0) < 8)
      .sort((a, b) => (a.stats.power || 0) - (b.stats.power || 0))[0];
    if (mentor && weak && weak.stats.admiredId !== mentor.def.id) {
      weak.stats.admiredId = mentor.def.id;
      const text = `${mentor.def.name} started mentoring ${weak.def.name}. Old skill still has hands.`;
      this.addHeroHistory(mentor, text);
      this.addHeroHistory(weak, text);
      this.addTownLog(text, 'npc');
      this.addReportLine('npc', text);
      this.game.events.emit('gwg-event', text);
    }
  }

  triggerCrisis(type, title, eventText, deltas, recovery) {
    const count = this.crises[type] || 0;
    if (count > 0 && this.day - count < 4) return false;
    this.crises[type] = this.day;
    this.stats.crisesSurvived = (this.stats.crisesSurvived || 0) + 1;
    this.applyDeltas(deltas);
    this.addTownLog(`${title}: ${eventText}`, 'crisis');
    this.addReportLine('crises', `${title}: ${eventText} Recovery: ${recovery}`);
    this.game.events.emit('gwg-event', `${title}: ${eventText}`);
    this.floatText(PLAZA.x, PLAZA.y - 120, title, '#f0938f');
    return true;
  }

  checkCrises() {
    if (this.resources.trust <= 0) {
      const triggered = this.triggerCrisis(
        'trustCollapse',
        'TRUST COLLAPSE',
        'The citizens discovered the fairness policy was decorative.',
        { gold: -160, morale: -8, corruption: 2, trust: 12 },
        'Upgrade Complaint Barrel, complete fair quests, and avoid whale upgrades for a while.',
      );
      if (triggered) {
        this.getActiveHeroes()
          .filter((hero) => this.isHonestHero(hero.def))
          .slice(0, 2)
          .forEach((hero) => this.sendHeroAway(hero, 3));
      }
    }
    if (this.resources.corruption >= 100) {
      this.triggerCrisis(
        'corruptionScandal',
        'CORRUPTION SCANDAL',
        'The town accountant renamed corruption to strategic sparkle and got subpoenaed by common sense.',
        { gold: -260, trust: -12, morale: -4, corruption: -18 },
        'Run fair policies, complete trust quests, and let the ethics fog clear.',
      );
    }
    if (this.resources.threat >= 100) {
      this.triggerCrisis(
        'threatInvasion',
        'THREAT INVASION',
        'Monsters noticed the economy was distracted.',
        { gold: -320, morale: -10, trust: -6, threat: -35 },
        'Post high threat-reduction quests and upgrade honest infrastructure.',
      );
      this.stats.threatEventsSurvived += 1;
    }
    if (this.resources.morale <= 0) {
      this.triggerCrisis(
        'moraleCrash',
        'MORALE CRASH',
        'The tavern ran out of chairs for complaints.',
        { trust: -6, morale: 18, threat: 5 },
        'Upgrade Tavern or Complaint Barrel and stop feeding heroes receipt-shaped trauma.',
      );
    }
  }

  checkAchievements() {
    const checks = [
      ['firstFairQuest', (this.stats.honestQuestSuccesses || 0) >= 1, 'Achievement: First Bloodless Audit. A fair quest succeeded and the economy looked offended.'],
      ['receiptWarrior', this.heroes?.some((hero) => hero.stats.rivalId), 'Achievement: Receipt Warrior. A hero identified a premium purchase as a combat style.'],
      ['whaleWhisperer', this.getPlaceLevel(this.buildingById.whale) >= 3, 'Achievement: Whale Whisperer. The whale reached level 3 and began glowing in legalese.'],
      ['ethicsOptional', this.resources.corruption >= 80, 'Achievement: Ethics Optional. Corruption reached 80 and filed a growth report.'],
      ['complaintInfrastructure', this.unlockedLocations?.has('complaint_barrel'), 'Achievement: Complaint Infrastructure. Screaming now has a barrel.'],
      ['debtHasLegs', this.heroes?.some((hero) => hero.stats.status === 'Debt Spiral'), 'Achievement: Debt Has Legs. The contract learned to walk.'],
      ['balanceIsDead', this.heroes?.some((hero) => hero.stats.status === 'Protest Leader'), 'Achievement: Balance Is Dead. Fairness found a clipboard.'],
      ['cycle25', this.day >= 25, 'Achievement: Day 25 reached. The economy calls this retention.'],
      ['stage5', this.getStageIndex() >= 4, 'Achievement: Premium Kingdom Problem reached. The king wants a cut.'],
      ['trust10', (this.stats.trustStreak || 0) >= 10, 'Achievement: Trust stayed above 50 for 10 cycles. Citizens briefly believed.'],
      ['fairEnough', this.day >= 15 && this.resources.trust > 60, 'Achievement: Fair Enough. Day 15 with Trust above 60 made investors whisper.'],
      ['fairEconomy', this.day >= 12 && this.getPlaceLevel(this.buildingById.whale) < 3 && this.resources.threat < 40, 'Achievement: Fair-ish economy built. The whale sulked responsibly.'],
      ['cursedEconomy', this.getPlaceLevel(this.buildingById.whale) >= 5 && (this.crises.corruptionScandal || 0) > 0, 'Achievement: Cursed economy survived scandal. Sparkles hid the paperwork.'],
      ['townLegend', this.heroes?.some((hero) => hero.stats.status === 'Town Legend' || hero.stats.fame >= 95), 'Achievement: A Town Legend emerged. Historians requested a receipt.'],
      ['surviveInvasion', (this.crises.threatInvasion || 0) > 0, 'Achievement: Threat invasion survived. The dungeon left feedback.'],
      ['recoverTrust', (this.crises.trustCollapse || 0) > 0 && this.resources.trust >= 35, 'Achievement: Recovered from Trust Collapse. The brochure got thicker.'],
    ];
    for (const [id, condition, text] of checks) {
      if (!condition || this.achievements.has(id)) continue;
      this.achievements.add(id);
      this.addTownLog(text, 'achievement');
      this.addReportLine('achievements', text);
      this.game.events.emit('gwg-event', text);
      this.game.events.emit('gwg-achievement', text);
    }
  }

  isHonestHero(def) {
    return HERO_GROUPS.honest.includes(def.personality);
  }

  isWhaleHero(def) {
    return HERO_GROUPS.whale.includes(def.personality);
  }

  isDebtHero(def) {
    return HERO_GROUPS.debt.includes(def.personality);
  }

  isVeteranHero(def) {
    return HERO_GROUPS.veteran.includes(def.personality);
  }

  getActiveHeroes() {
    if (!Array.isArray(this.heroes)) return [];
    return this.heroes.filter((hero) => hero.stats.active !== false && hero.awayUntil <= this.day && hero.state !== 'away');
  }

  returnAwayHeroes() {
    for (const hero of this.heroes) {
      if (hero.state === 'away' && hero.awayUntil <= this.day) {
        hero.state = 'idle';
        hero.container.setAlpha(1);
        hero.stats.loyalty = Math.max(25, hero.stats.loyalty - 8);
        hero.currentAction = `Returned near ${this.getPlaceName(hero.at)}`;
        hero.intent = {
          action: 'Returned',
          destinationId: hero.at,
          destinationName: this.getPlaceName(hero.at),
          reason: 'Back from being temporarily unprofitable.',
          risk: this.isHeroInjured(hero) ? 'Moderate' : 'Low',
        };
        if (!this.isHeroInjured(hero)) hero.stats.injuryState = 'healthy';
        this.setHeroAnimationState(hero, this.isHeroInjured(hero) ? 'hurt' : 'idle');
        this.addHeroHistory(hero, 'Returned to town despite the evidence.');
        this.refreshHeroStatusMarker(hero);
        this.say(hero, 'I came back. The economy did not improve.', true);
        this.scheduleAmbient(hero, Phaser.Math.Between(900, 2400));
      }
    }
  }

  getObjectiveState() {
    const levels = Object.fromEntries(Object.values(this.placeById || {}).map((place) => [
      place.id,
      this.getPlaceLevel(place),
    ]));
    return {
      day: this.day,
      resources: this.resources,
      levels,
      stats: this.stats,
      completed: this.completedObjectives,
      unlocked: this.unlockedLocations,
      identity: this.getTownIdentity(),
      beds: this.getLodgingReport(),
      inventory: this.townInventory || {},
      extraction: {
        discoveredNodes: Object.values(this.explorationPointById || {}).filter((place) => (
          this.isResourceNode(place) && this.discoveredPois?.has(place.id)
        )).length,
        surveyedNodes: Object.entries(this.resourceNodes || {}).filter(([, node]) => node?.surveyed).length,
        camps: this.cityState.placedBuildings.filter((placement) => EXTRACTION_IDS.includes(getBaseBuildingId(placement.id))).length,
        connected: this.cityState.placedBuildings
          .map((placement) => this.buildingById?.[placement.id])
          .filter((place) => place && EXTRACTION_IDS.includes(getBaseBuildingId(place.baseId || place.id)))
          .some((place) => this.getBuildingRoadAccess(place).connected),
        storehouses: this.getPlacedBuildingCount('storehouse'),
        assigned: this.cityState.placedBuildings
          .map((placement) => this.getExtractionRuntime(placement.id))
          .filter((runtime) => runtime?.assignedHeroId).length,
        delivered: Object.values(this.resourceNodes || {}).reduce((sum, node) => sum + (Number(node?.deliveredTotal) || 0), 0),
      },
      fairBuildingLevelTotal: ['tavern', 'blacksmith', 'guildhall', 'training']
        .reduce((sum, id) => sum + (levels[id] || 1), 0),
    };
  }

  publishObjectives() {
    const active = OBJECTIVES
      .filter((objective) => !this.completedObjectives.has(objective.id))
      .slice(0, 2)
      .map((objective) => objective.text);
    this.registry.set('objectives', {
      active,
      completed: this.completedObjectives.size,
      total: OBJECTIVES.length,
    });
    this.publishTownHint();
  }

  getTownHint() {
    const R = this.resources;
    if (this.cycleRunning) return 'Town Problem: gates are open. Watch the consequences.';
    if (this.weekReportUnread) return 'Week Report ready: read what changed before making the next mistake.';
    if (this.pendingPolicy) return 'Policy pending: choose when ready, or let the town keep making it worse.';
    if ((this.stats.guildHallInspected || 0) < 1) return 'Start here: inspect the Guild Hall to see quests and town work.';
    if (this.postedQuests.some((quest) => !quest.assignedHeroId)) return 'You have a posted quest. Assign a hero from the Notice Board.';
    if ((this.stats.questsPosted || 0) < 1) return 'Goal: post a first quest at the Notice Board.';
    if (this.postedQuests.length > 0) return 'Quest ready. Skip Day or let time run to see the result.';
    if ((this.townInventory?.loot || 0) > 0 && this.isBuildingPlaced('market')) return 'You have loot in storage. Use the Market to convert it into gold.';
    const lodging = this.getLodgingReport();
    if (lodging.homeless > 0) return `Heroes exceed bed capacity by ${lodging.homeless}. Upgrade or build lodging.`;
    const extractionHint = this.cityState?.placedBuildings ? this.getExtractionAdvisorNotes()[0] : null;
    if (extractionHint) return typeof extractionHint === 'string' ? extractionHint : extractionHint.text;
    if (R.threat >= RESOURCE_THRESHOLDS.threatWarning) return 'Warning: Threat is rising. Post safer quests.';
    if (R.trust < RESOURCE_THRESHOLDS.trustWarning) return 'Warning: Trust is low. Honest heroes may leave.';
    if (R.morale < RESOURCE_THRESHOLDS.moraleWarning) return 'Town Problem: heroes are losing morale.';
    if (R.corruption >= RESOURCE_THRESHOLDS.corruptionWarning) return 'Warning: Corruption is profitable and very awake.';
    const readyPoi = Object.values(this.explorationPointById || {}).find((place) => (
      this.isRevealed(place.gridX, place.gridY) && this.getPoiCooldownDay(place.id) <= this.day
    ));
    if (readyPoi) return `A POI is revealed: ${readyPoi.name}. Click it to explore.`;

    const whale = this.buildingById?.whale;
    const whaleInfo = whale ? this.getUpgradeInfo(whale) : null;
    if (whaleInfo?.cost && this.resources.gold >= whaleInfo.cost) {
      return 'Temptation: Golden Whale upgrade available.';
    }

    const canUpgrade = Object.values(this.placeById || {}).some((place) => {
      if (!this.isLocationUnlocked(place.id)) return false;
      const info = this.getUpgradeInfo(place);
      return info.cost && !info.maxed && R.gold >= info.cost;
    });
    if (canUpgrade) return 'Goal: Upgrade a building before opening gates.';
    if (this.postedQuests.length === 0) return 'Goal: post another quest, explore a POI, or upgrade one road/building.';
    return `Goal: Grow toward ${TOWN_STAGES[Math.min(this.getStageIndex() + 1, TOWN_STAGES.length - 1)].name}.`;
  }

  publishTownHint() {
    if (!this.registry) return;
    this.registry.set('townHint', this.getTownHint());
  }

  checkObjectives() {
    if (this.checkingObjectives || !this.placeById) return;
    this.checkingObjectives = true;
    const state = this.getObjectiveState();
    for (const objective of OBJECTIVES) {
      if (this.completedObjectives.has(objective.id)) continue;
      if (!objective.complete(state)) continue;

      this.completedObjectives.add(objective.id);
      const reward = typeof objective.reward === 'function' ? objective.reward(state) : (objective.reward || {});
      const eventText = typeof objective.event === 'function' ? objective.event(state) : objective.event;
      this.applyDeltas(reward);
      this.game.events.emit('gwg-event', eventText);
      this.addTownLog(eventText, 'objective');
      this.addReportLine('achievements', eventText);
    }
    this.checkingObjectives = false;
    this.publishObjectives();
  }

  isLocationUnlocked(id) {
    if (!id || !LOCKABLE_LOCATION_IDS.has(id)) return true;
    return this.unlockedLocations?.has(id);
  }

  getMaxHeroDebt() {
    return Math.max(0, ...(this.heroes || []).map((hero) => hero.stats?.debt || 0));
  }

  checkUnlocks(silent = false) {
    if (!this.unlockedLocations) return;
    const whaleLevel = this.buildingById?.whale ? this.getPlaceLevel(this.buildingById.whale) : 1;
    const guildLevel = this.buildingById?.guildhall ? this.getPlaceLevel(this.buildingById.guildhall) : 1;
    const bitterCount = (this.heroes || []).filter((hero) => (
      hero.stats?.active !== false
      && (hero.stats?.evolutionStage || 0) > 0
      && /Protest|Bitter|Angry|Balance/.test(hero.stats?.status || hero.def?.personality || '')
    )).length;
    const rules = [
      ['complaint_barrel', this.day >= 3 || this.resources.trust < 60, 'Complaint Barrel unlocked. The town discovered official yelling.'],
      ['debt_collector_booth', this.resources.corruption > 40 || this.getMaxHeroDebt() > 500, 'Debt Collector Booth unlocked. The small print found a desk.'],
      ['sponsored_quest_board', guildLevel >= 2 || whaleLevel >= 2, 'Sponsored Quest Board unlocked. Danger now has tasteful branding.'],
      ['balance_memorial', (this.stats.whaleTrustLosses || 0) > 0 || this.stats.whaleEvents > 0, 'Balance Memorial unlocked. Veterans requested a place to sigh.'],
      ['refund_denial_desk', whaleLevel >= 3, 'Refund Denial Desk unlocked. Hope now has business hours.'],
      ['ethics_fountain', this.resources.corruption > 70, 'Fountain of Questionable Ethics unlocked. Coins enter. Principles get wet.'],
      ['ethics_laundromat', this.resources.corruption >= 85 || (this.crises.corruptionScandal || 0) > 0, 'Ethics Laundromat unlocked. The town can now wash principles on warm.'],
      ['patch_notes_shrine', this.day >= 10 || (this.stats.balanceComplaints || 0) > 0, 'Patch Notes Shrine unlocked. Working as intended now has candles.'],
      ['hero_union_tent', bitterCount >= 2, 'Hero Union Tent unlocked. Fairness has organized.'],
      ['premium_temple', whaleLevel >= 5, 'Premium Temple unlocked. The whale discovered architecture.'],
    ];

    for (const [id, condition, text] of rules) {
      if (!condition || this.unlockedLocations.has(id)) continue;
      this.unlockedLocations.add(id);
      this.updateDecorationLockState(id);
      this.addTownLog(text, 'unlock');
      this.addReportLine('unlocks', text);
      if (!silent) {
        const place = this.decorationById?.[id];
        if (place) {
          this.floatText(place.x, place.y - (place.h || 48) - 14, 'UNLOCKED', '#ffe08a');
          const sprite = this.placeSpriteById?.[id];
          if (sprite) {
            this.tweens.add({
              targets: sprite,
              scaleX: sprite.scaleX * 1.12,
              scaleY: sprite.scaleY * 1.12,
              alpha: 1,
              duration: 260,
              yoyo: true,
              ease: 'Back.easeOut',
            });
          }
        }
        this.game.events.emit('gwg-event', text);
      }
    }
    this.publishTownHint();
  }

  // --- world ------------------------------------------------------------

  buildTerrain() {
    this.cameras.main.setBackgroundColor(this.isBuilderCity ? '#030508' : '#2f5f32');
    if (this.isBuilderCity) {
      // The fog/shroud layers own all visible terrain in builder mode. A dark
      // base prevents the old rectangular meadow from leaking at far zoom.
      this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x030508, 1)
        .setDepth(0);
    } else {
      this.add.tileSprite(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 'grass');
    }

    if (this.isBuilderCity) {
      this.isoGroundGraphics = this.add.graphics().setDepth(1.15);
      this.redrawIsoGroundLayer();
      if (!this.useIsoRendering()) this.buildTerrainVariety();
      this.terrainDetailGraphics = this.add.graphics().setDepth(2);
      this.redrawTerrainDetails();
      this.redrawWildernessDressing();
      this.redrawCityRoads();
      return;
    }

    const districts = this.add.graphics();
    for (const district of DISTRICTS) {
      districts.fillStyle(district.color, district.alpha);
      districts.fillRoundedRect(
        district.x - district.w / 2,
        district.y - district.h / 2,
        district.w,
        district.h,
        28,
      );
    }

    const path = this.add.graphics();
    path.fillStyle(0xbf9a61, 0.34);
    path.fillCircle(PLAZA.x, PLAZA.y + 1, ROAD_WIDTH * 1.22);
    path.fillStyle(0xd9bc85, 0.94);
    path.fillCircle(PLAZA.x, PLAZA.y, ROAD_WIDTH * 0.96);

    for (const [from, to] of this.pathLinks) {
      const a = this.pathNodeById[from];
      const b = this.pathNodeById[to];
      if (a && b) this.stampPath(path, a.x, a.y, b.x, b.y, ROAD_WIDTH / 2);
    }

    const places = [
      ...this.buildings,
      ...this.decorations.filter((d) => d.path || d.interactive),
    ];
    for (const place of places) {
      const node = this.pathNodeById[place.pathNode];
      if (!node) continue;
      const door = this.getDoorSpotForPlace(place);
      this.stampPath(path, node.x, node.y, door.x, door.y, ROAD_WIDTH / 3);
    }
  }

  redrawIsoGroundLayer() {
    if (!this.isoGroundGraphics) return;
    const g = this.isoGroundGraphics;
    g.clear();
    if (!this.useIsoRendering()) return;
    const activeSet = this.getActiveVisibilitySet();
    for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        if (!this.isRevealed(x, y)) continue;
        const state = this.getVisibilityState(x, y, activeSet);
        const hash = this.getTerrainHash(x, y, 23);
        const activeTint = [
          0x5f9b45,
          0x6eaa50,
          0x557f3e,
          0x78964f,
        ][hash % 4];
        const memoryTint = [
          0x2b4237,
          0x31493c,
          0x263845,
          0x3f4b3d,
        ][hash % 4];
        const fillAlpha = state === 'active' ? 0.6 : 0.24;
        const strokeAlpha = NORMAL_GRID_STROKE_ALPHA;
        const tint = state === 'active' ? activeTint : memoryTint;
        const points = this.getVisualTilePoints(x, y);
        this.drawPolygon(g, points, tint, fillAlpha, 0xfff6dc, strokeAlpha, 1);
        if (hash % 13 === 0 && state === 'active') {
          const center = this.gridTileVisualCenter(x, y);
          g.fillStyle(0xd8e28d, 0.08);
          g.fillEllipse(center.x + ((hash % 11) - 5), center.y + (((hash >> 4) % 7) - 3), 24, 8);
        }
      }
    }
  }

  buildGridLayer() {
    this.lockedLandGraphics = this.add.graphics().setDepth(60);
    this.gridGraphics = this.add.graphics().setDepth(4800).setVisible(false);
    this.buildPreviewGraphics = this.add.graphics().setDepth(4850).setVisible(false);
    this.buildPreviewLabel = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 3,
      align: 'center',
      backgroundColor: '#101721e8',
      padding: { x: 7, y: 5 },
      wordWrap: { width: 260 },
    }).setOrigin(0.5, 1).setDepth(4860).setVisible(false);
    this.buildPreviewGhost = null;
    this.redrawFog();
    this.redrawBuildGrid();
  }

  // --- fog of war -----------------------------------------------------------

  isRevealed(x, y) {
    return this.revealedTiles?.has(gridKey(x, y)) || false;
  }

  addVisibilityCircle(targetSet, centerX, centerY, radius) {
    const limit = radius * radius + radius * 0.65;
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(GRID_CONFIG.rows - 1, Math.ceil(centerY + radius));
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(GRID_CONFIG.columns - 1, Math.ceil(centerX + radius));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        if (dx * dx + dy * dy <= limit && this.isRevealed(x, y)) targetSet.add(gridKey(x, y));
      }
    }
  }

  getActiveVisibilitySet() {
    const active = new Set();
    if (!this.isBuilderCity || !this.revealedTiles) return active;
    for (const road of this.cityState.roads || []) {
      this.addVisibilityCircle(active, road.x, road.y, 2.2);
    }
    for (const placement of this.cityState.placedBuildings || []) {
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      const radius = placement.id === 'guildhall'
        ? 7.5
        : placement.id === 'watchtower'
          ? 7
          : 4.4;
      this.addVisibilityCircle(
        active,
        placement.gridX + footprint.w / 2,
        placement.gridY + footprint.h / 2,
        radius,
      );
    }
    return active;
  }

  getVisibilityState(x, y, activeSet = null) {
    if (activeSet?.has(gridKey(x, y))) return 'active';
    if (this.isRevealed(x, y)) return 'explored';
    return 'undiscovered';
  }

  hasRevealedNeighbor(x, y, radius = 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        if (this.isRevealed(x + dx, y + dy)) return true;
      }
    }
    return false;
  }

  refreshWorldVisibility() {
    this.redrawIsoGroundLayer();
    this.redrawFog();
    this.updateExplorationPointVisibility();
    this.updateAftermathVisibility();
    this.updateMonsterActorVisibility();
  }

  // reveal a circle of tiles and refresh everything fog-dependent;
  // returns how many new tiles appeared
  revealArea(gridX, gridY, radius, source = '') {
    if (!this.isBuilderCity || !this.revealedTiles) return 0;
    const added = revealCircle(this.revealedTiles, gridX, gridY, radius);
    if (!added.length) return 0;
    for (const spot of added) {
      const cell = this.gridCells.get(gridKey(spot.x, spot.y));
      if (cell) cell.unlocked = true;
    }
    this.cityState.revealed = [...this.revealedTiles];
    this.refreshWorldVisibility();
    this.redrawBuildGrid();
    this.redrawTerrainDetails();
    this.redrawWildernessDressing();
    if (source) this.addTownLog(`${source} lifted the fog: ${added.length} tiles charted.`, 'unlock');
    return added.length;
  }

  // frontier cells: revealed=true gives walkable fog-edge tiles (hero
  // destinations), revealed=false gives fogged tiles touching the clearing
  // (scout-report targets)
  getFogFrontierCells(revealed = true) {
    const frontier = [];
    for (const cell of this.gridCells.values()) {
      if (Boolean(cell.unlocked) !== revealed) continue;
      const neighbors = [
        this.gridCells.get(gridKey(cell.x + 1, cell.y)),
        this.gridCells.get(gridKey(cell.x - 1, cell.y)),
        this.gridCells.get(gridKey(cell.x, cell.y + 1)),
        this.gridCells.get(gridKey(cell.x, cell.y - 1)),
      ];
      if (neighbors.some((item) => item && Boolean(item.unlocked) !== revealed)) frontier.push(cell);
    }
    return frontier;
  }

  runPremiumScoutReveal() {
    const targets = this.getFogFrontierCells(false);
    if (!targets.length) {
      this.game.events.emit('gwg-event', 'The scouts found no fog left to monetize. Refunds are unavailable.');
      return;
    }
    const spot = Phaser.Utils.Array.GetRandom(targets);
    const added = this.revealArea(spot.x, spot.y, FOG_REVEAL_RADIUS.premiumScout, 'Premium Scout Report');
    const world = this.gridTileVisualCenter(spot.x, spot.y);
    this.floatText(world.x, world.y - 30, 'FOG CHARTED', '#ffe08a');
    this.game.events.emit(
      'gwg-event',
      `Premium Scout Report delivered: ${added} tiles. The fog lifted after being monetized.`,
    );
  }

  getTerrainHash(x, y, salt = 0) {
    return Math.abs(((x + 17) * 73856093) ^ ((y + 31) * 19349663) ^ (salt * 83492791));
  }

  // one static render pass of terrain variety: clover meadows, dirt patches
  // and small ground decals baked into a single texture at boot so the world
  // reads like a natural map instead of flat debug green, at zero per-frame
  // cost. Roads, buildings, and fog all draw above this layer.
  buildTerrainVariety() {
    const tile = GRID_CONFIG.tileSize;
    this.terrainVarietyRt = this.add.renderTexture(
      GRID_CONFIG.originX,
      GRID_CONFIG.originY,
      GRID_CONFIG.columns * tile,
      GRID_CONFIG.rows * tile,
    ).setOrigin(0, 0).setDepth(1);
    this.redrawTerrainVariety();
  }

  // town core = average of placed building centers; decor density and prop
  // size scale with distance from it
  getTownCoreCenter() {
    const placed = this.cityState.placedBuildings;
    if (!placed.length) return { x: GRID_CONFIG.columns / 4, y: GRID_CONFIG.rows / 4 };
    const sum = placed.reduce((acc, placement) => {
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      acc.x += placement.gridX + footprint.w / 2;
      acc.y += placement.gridY + footprint.h / 2;
      return acc;
    }, { x: 0, y: 0 });
    return { x: sum.x / placed.length, y: sum.y / placed.length };
  }

  // cells decor must stay out of: building footprints plus a one-tile buffer,
  // extended one extra row south so entrances stay clear and readable
  getDecorBlockedCells() {
    const blocked = new Set();
    for (const placement of this.cityState.placedBuildings) {
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      for (let y = placement.gridY - 1; y < placement.gridY + footprint.h + 2; y += 1) {
        for (let x = placement.gridX - 1; x < placement.gridX + footprint.w + 1; x += 1) {
          blocked.add(gridKey(x, y));
        }
      }
    }
    return blocked;
  }

  pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[i];
      const b = polygon[j];
      const crosses = ((a.y > point.y) !== (b.y > point.y))
        && point.x < ((b.x - a.x) * (point.y - a.y)) / Math.max(0.0001, b.y - a.y) + a.x;
      if (crosses) inside = !inside;
    }
    return inside;
  }

  clearStaticPropsInsideFootprint(gridX, gridY, footprint) {
    if (!this.isBuilderCity || !this.decorationObjectsById) return;
    const polygon = this.getVisualFootprintPolygon(gridX, gridY, footprint);
    const bounds = polygon.reduce((acc, point) => ({
      left: Math.min(acc.left, point.x),
      right: Math.max(acc.right, point.x),
      top: Math.min(acc.top, point.y),
      bottom: Math.max(acc.bottom, point.y),
    }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });

    for (const decoration of this.decorations || []) {
      if (!decoration?.isPlaced || decoration.interactive || decoration.spot || decoration.path) continue;
      const points = [
        { x: decoration.x, y: decoration.y },
        { x: decoration.x, y: decoration.y - (decoration.h || 44) * 0.45 },
      ];
      const nearBounds = points.some((point) => (
        point.x >= bounds.left - 12
        && point.x <= bounds.right + 12
        && point.y >= bounds.top - 12
        && point.y <= bounds.bottom + 12
      ));
      if (!nearBounds || !points.some((point) => this.pointInPolygon(point, polygon))) continue;
      decoration.isPlaced = false;
      for (const obj of this.decorationObjectsById[decoration.id] || []) obj.destroy?.();
      delete this.decorationObjectsById[decoration.id];
      delete this.placeSpriteById[decoration.id];
      delete this.placeLabelsById[decoration.id];
      this.worldInteractionTargets = this.worldInteractionTargets.filter((target) => target.id !== decoration.id);
    }
  }

  // Ground decor is one RenderTexture (zero per-frame cost) but now
  // placement-aware and redrawable: clutter keeps out of building footprints,
  // entrances, and road shoulders; the town core stays clean; everything is
  // hand-scattered with per-prop scale, offset, and loose clustering so
  // nothing looks stamped to a grid square. Redrawn on build/delete events.
  redrawTerrainVariety() {
    const rt = this.terrainVarietyRt;
    if (!rt || !this.isBuilderCity) return;
    rt.clear();
    if (this.useIsoRendering()) return;

    const variantKeys = ['terrain_grass_clover'].filter((key) => this.textures.exists(key));
    // size categories keep scale believable: tiny clutter may appear almost
    // anywhere, medium props stay out of the town core entirely
    const decorSets = {
      tiny: ['decal_pebbles', 'decal_clover', 'decal_grass_tuft', 'decal_mushrooms', 'decal_wildflowers']
        .filter((key) => this.textures.exists(key)),
      small: ['decal_flowers_yellow', 'decal_flowers_red', 'decal_leaf_litter', 'decal_fern', 'decal_mud_puddle', 'decal_rock_trio']
        .filter((key) => this.textures.exists(key)),
      medium: ['decal_tall_grass', 'decal_tree_stump', 'decal_berry_bush', 'decal_hay_pile', 'decal_dirt_mound']
        .filter((key) => this.textures.exists(key)),
    };
    if (!variantKeys.length && !decorSets.tiny.length && !decorSets.small.length) return;

    const tile = GRID_CONFIG.tileSize;
    const core = this.getTownCoreCenter();
    const blocked = this.getDecorBlockedCells();
    const scales = { tiny: [0.4, 0.62], small: [0.55, 0.8], medium: [0.75, 1.05] };
    const maxDraws = 560;
    let drawn = 0;

    rt.beginDraw();
    for (let y = 0; y < GRID_CONFIG.rows && drawn < maxDraws; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        const cell = this.gridCells.get(gridKey(x, y));
        if (!cell || cell.road || cell.occupiedBy || blocked.has(gridKey(x, y))) continue;
        const nearRoad = this.isRoadOrRoadShoulder(x, y, 1);
        const hash = this.getTerrainHash(x, y, 11);
        const roll = hash % 100;
        const coreDistance = Math.hypot(x - core.x, y - core.y);

        // zone density: town core clean and readable, road shoulders nearly
        // clear, the wild fills in the further out you go
        const chance = nearRoad ? 5 : coreDistance < 6 ? 6 : coreDistance < 11 ? 16 : 26;
        // clover meadow patches only away from the core
        if (variantKeys.length && !nearRoad && coreDistance > 8 && roll >= chance && roll < chance + 7) {
          rt.batchDraw(variantKeys[hash % variantKeys.length], x * tile, y * tile);
          drawn += 1;
          continue;
        }
        if (roll >= chance) continue;

        const category = (nearRoad || coreDistance < 6)
          ? 'tiny'
          : coreDistance < 11
            ? ((hash >> 5) % 3 ? 'tiny' : 'small')
            : ['tiny', 'small', 'medium'][(hash >> 5) % 3];
        const keys = decorSets[category].length ? decorSets[category] : decorSets.tiny;
        if (!keys.length) continue;

        // hand-scattered feel: strong in-cell offset + per-prop scale, plus a
        // loose cluster of 1-2 companions so plants grow in groups
        const [minScale, maxScale] = scales[category];
        const baseScale = minScale + ((hash >> 7) % 8) * ((maxScale - minScale) / 7);
        const baseX = x * tile + tile / 2 + ((hash % 29) - 14);
        const baseY = y * tile + tile / 2 + (((hash >> 3) % 25) - 12);
        this.drawDecal(rt, keys[(hash >> 4) % keys.length], baseX, baseY, baseScale);
        drawn += 1;
        if ((hash >> 9) % 100 < 35 && drawn < maxDraws) {
          const companions = 1 + ((hash >> 11) % 2);
          for (let i = 0; i < companions; i += 1) {
            const angle = ((hash >> (12 + i * 3)) % 360) * (Math.PI / 180);
            const spread = 12 + ((hash >> (14 + i * 2)) % 14);
            this.drawDecal(
              rt,
              keys[(hash >> (5 + i)) % keys.length],
              baseX + Math.cos(angle) * spread,
              baseY + Math.sin(angle) * spread * 0.7,
              baseScale * (0.65 + ((hash >> (8 + i)) % 4) * 0.08),
            );
            drawn += 1;
          }
        }
      }
    }
    rt.endDraw();
  }

  // batchDraw has no scale parameter, so scaled decals stamp through a pooled
  // off-scene image; centered origin keeps offsets symmetric
  drawDecal(rt, key, x, y, scale) {
    if (!this.decalStamp) {
      this.decalStamp = this.make.image({ key, add: false }).setOrigin(0.5, 0.5);
    }
    this.decalStamp.setTexture(key).setScale(scale);
    rt.batchDraw(this.decalStamp, x, y);
  }

  // dev helper: re-roll all procedural decoration with current rules
  // (console: game.scene.getScene('TownScene').redecorateMap())
  redecorateMap() {
    this.redrawTerrainVariety();
    this.redrawTerrainDetails();
    this.redrawWildernessDressing();
    return 'map redecorated';
  }

  isRoadOrRoadShoulder(x, y, radius = 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (this.gridCells.get(gridKey(x + dx, y + dy))?.road) return true;
      }
    }
    return false;
  }

  redrawTerrainDetails() {
    if (!this.terrainDetailGraphics || !this.isBuilderCity) return;
    const g = this.terrainDetailGraphics;
    g.clear();
    if (this.useIsoRendering()) {
      for (const placement of this.cityState.placedBuildings) {
        const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
        const polygon = this.getVisualFootprintPolygon(placement.gridX, placement.gridY, footprint);
        this.drawPolygon(g, polygon, 0x6b5a3a, 0.1, null);
        this.drawPolygon(g, this.insetPoints(polygon, 0.82), 0x55462e, 0.08, null);
      }
      for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
        for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
          const cell = this.gridCells.get(gridKey(x, y));
          if (!cell || cell.road || cell.occupiedBy || this.isRoadOrRoadShoulder(x, y, 1)) continue;
          const world = this.gridTileVisualCenter(x, y);
          const hash = this.getTerrainHash(x, y, 3);
          const unlocked = Boolean(cell.unlocked);
          const edge = x < 2 || y < 2 || x > GRID_CONFIG.columns - 3 || y > GRID_CONFIG.rows - 3;
          const chance = unlocked ? (edge ? 30 : 22) : (edge ? 34 : 10);
          if (hash % 100 >= chance) continue;
          const color = unlocked
            ? ([0x79b760, 0x5f9b45, 0x86be67, 0xa2b873][hash % 4])
            : ([0x4f7442, 0x3f6338, 0x6d7b50][hash % 3]);
          const alpha = unlocked ? 0.18 : 0.22;
          const rx = ((hash % 19) - 9);
          const ry = (((hash >> 4) % 11) - 5);
          g.fillStyle(color, alpha);
          g.fillEllipse(world.x + rx, world.y + ry, 16 + (hash % 18), 7 + ((hash >> 3) % 7));
          if (unlocked && hash % 11 === 0) {
            g.fillStyle(hash % 2 ? 0x836f45 : 0x4c7e3d, 0.08);
            g.fillEllipse(world.x - rx * 0.35, world.y - ry * 0.25, 34 + (hash % 22), 12 + ((hash >> 5) % 8));
          }
          if (unlocked && hash % 7 === 0) {
            g.fillStyle(0xd8e28d, 0.16);
            g.fillCircle(world.x + rx * 0.6, world.y + ry, 2);
          }
        }
      }
      return;
    }
    // worn-earth patch under every building footprint: grounds the sprite in
    // the terrain itself instead of relying on shadows alone
    for (const placement of this.cityState.placedBuildings) {
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      const left = GRID_CONFIG.originX + placement.gridX * GRID_CONFIG.tileSize;
      const top = GRID_CONFIG.originY + placement.gridY * GRID_CONFIG.tileSize;
      const width = footprint.w * GRID_CONFIG.tileSize;
      const height = footprint.h * GRID_CONFIG.tileSize;
      g.fillStyle(0x6b5a3a, 0.1);
      g.fillRoundedRect(left - 4, top - 2, width + 8, height + 8, 14);
      g.fillStyle(0x55462e, 0.08);
      g.fillRoundedRect(left + 2, top + height - 10, width - 4, 16, 8);
    }
    for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        const cell = this.gridCells.get(gridKey(x, y));
        if (!cell || cell.road || cell.occupiedBy || this.isRoadOrRoadShoulder(x, y, 1)) continue;
        const world = gridToWorld(x, y);
        const hash = this.getTerrainHash(x, y, 3);
        const unlocked = Boolean(cell.unlocked);
        const edge = x < 2 || y < 2 || x > GRID_CONFIG.columns - 3 || y > GRID_CONFIG.rows - 3;
        const chance = unlocked ? (edge ? 30 : 22) : (edge ? 34 : 10);
        if (hash % 100 >= chance) continue;
        const color = unlocked
          ? ([0x79b760, 0x5f9b45, 0x86be67, 0xa2b873][hash % 4])
          : ([0x4f7442, 0x3f6338, 0x6d7b50][hash % 3]);
        const alpha = unlocked ? 0.18 : 0.22;
        const rx = ((hash % 19) - 9);
        const ry = (((hash >> 4) % 15) - 7);
        g.fillStyle(color, alpha);
        g.fillEllipse(
          world.x + rx,
          world.y - GRID_CONFIG.tileSize / 2 + ry,
          16 + (hash % 18),
          8 + ((hash >> 3) % 8),
        );
        if (unlocked && hash % 11 === 0) {
          g.fillStyle(hash % 2 ? 0x836f45 : 0x4c7e3d, 0.08);
          g.fillEllipse(
            world.x - rx * 0.35,
            world.y - GRID_CONFIG.tileSize / 2 - ry * 0.25,
            34 + (hash % 22),
            15 + ((hash >> 5) % 10),
          );
        }
        if (unlocked && hash % 7 === 0) {
          g.fillStyle(0xd8e28d, 0.16);
          g.fillCircle(world.x + rx * 0.6, world.y - GRID_CONFIG.tileSize / 2 + ry, 2);
        }
      }
    }
  }

  getForestClusters() {
    const c = GRID_CONFIG.columns;
    const r = GRID_CONFIG.rows;
    return [
      { x: c * 0.1, y: r * 0.18, rx: 11, ry: 8, type: 'pine' },
      { x: c * 0.18, y: r * 0.72, rx: 14, ry: 9, type: 'old' },
      { x: c * 0.38, y: r * 0.12, rx: 12, ry: 7, type: 'autumn' },
      { x: c * 0.58, y: r * 0.82, rx: 16, ry: 8, type: 'old' },
      { x: c * 0.75, y: r * 0.2, rx: 15, ry: 10, type: 'pine' },
      { x: c * 0.86, y: r * 0.62, rx: 17, ry: 11, type: 'mixed' },
      { x: c * 0.96, y: r * 0.34, rx: 9, ry: 13, type: 'cursed' },
    ];
  }

  getForestTextureKeys(type) {
    const variants = {
      pine: ['object_tree_pine', 'object_tree_03', 'prop_tree'],
      old: ['object_tree_03', 'object_tree_pine', 'prop_tree'],
      autumn: ['object_tree_autumn', 'object_tree_03', 'prop_tree'],
      cursed: ['object_tree_pine', 'object_tree_autumn', 'object_tree_03'],
      mixed: ['object_tree_03', 'object_tree_pine', 'object_tree_autumn', 'prop_tree'],
    };
    return (variants[type] || variants.mixed).filter((key) => this.textures.exists(key));
  }

  // Deterministic clustered forests. The center of each grove is dense enough
  // to block structures; roads can still be cut through as deliberate access.
  redrawWildernessDressing() {
    if (!this.isBuilderCity) return;
    if (!this.wildernessContainer) this.wildernessContainer = this.add.container(0, 0).setDepth(55);
    this.wildernessContainer.removeAll(true);
    this.forestBlockedCells = new Set();
    const clusters = this.getForestClusters();
    const core = this.getTownCoreCenter();
    const blocked = this.getDecorBlockedCells();
    const activeSet = this.getActiveVisibilitySet();
    for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        const cell = this.gridCells.get(gridKey(x, y));
        if (!cell || cell.road || cell.occupiedBy || blocked.has(gridKey(x, y))) continue;
        // harvested forest cells stay cleared until they regrow
        if (this.harvestedForestCells?.has(gridKey(x, y))) continue;
        const revealed = this.isRevealed(x, y);
        if (!revealed) continue;
        const hash = Math.abs((x * 73856093) ^ (y * 19349663)) % 100000;
        const coreDistance = Math.hypot(x - core.x, y - core.y);
        if (coreDistance < 13 || this.isRoadOrRoadShoulder(x, y, 1)) continue;
        let best = null;
        for (const cluster of clusters) {
          const distance = Math.sqrt(
            ((x - cluster.x) / cluster.rx) ** 2
            + ((y - cluster.y) / cluster.ry) ** 2,
          );
          if (distance <= 1 && (!best || distance < best.distance)) best = { ...cluster, distance };
        }
        const fringe = !best && coreDistance > 20 && hash % 1000 < 8;
        if (!best && !fringe) continue;
        const density = best ? 0.18 + (1 - best.distance) * 0.62 : 0.18;
        if ((hash % 100) / 100 > density) continue;
        const keys = this.getForestTextureKeys(best?.type || 'mixed');
        if (!keys.length) continue;
        const world = this.gridTileVisualCenter(x, y);
        const key = keys[hash % keys.length];
        const image = this.add.image(
          world.x + ((hash % 27) - 13),
          world.y + (((hash >> 4) % 15) - 7),
          key,
        ).setScale(0.46 + ((hash >> 6) % 8) * 0.035)
          .setAlpha(activeSet.has(gridKey(x, y)) ? 1 : 0.56);
        if (best?.type === 'cursed') image.setTint(hash % 2 ? 0x9b8cab : 0x7d8b72);
        this.wildernessContainer.add(image);
        if (best && density >= 0.48 && hash % 100 < 58) this.forestBlockedCells.add(gridKey(x, y));
      }
    }
  }

  // unexplored world: layered organic fog instead of a flat dark rectangle.
  // Depth-tinted tiles + soft edge skirts on revealed frontier tiles keep the
  // boundary from reading as a hard grid line.
  redrawFog() {
    if (!this.lockedLandGraphics) return;
    const g = this.lockedLandGraphics;
    g.clear();
    if (!this.isBuilderCity) return;
    if (this.useIsoRendering()) {
      const activeSet = this.getActiveVisibilitySet();
      for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
        for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
          const points = this.getVisualTilePoints(x, y);
          const state = this.getVisibilityState(x, y, activeSet);
          if (state === 'active') {
            const foggedSides = [
              !this.isRevealed(x - 1, y) && isInsideGrid(x - 1, y),
              !this.isRevealed(x, y - 1) && isInsideGrid(x, y - 1),
              !this.isRevealed(x + 1, y) && isInsideGrid(x + 1, y),
              !this.isRevealed(x, y + 1) && isInsideGrid(x, y + 1),
            ];
            if (foggedSides.some(Boolean)) {
              this.drawPolygon(g, points, 0x141c28, 0.05, 0x2a3648, 0.18, 1);
            }
            continue;
          }
          const hash = this.getTerrainHash(x, y, 7);
          if (state === 'explored') {
            this.drawPolygon(g, points, hash % 3 ? 0x101823 : 0x0d141e, 0.56, 0x42506a, 0.18, 1);
            if (hash % 6 === 0) {
              const center = this.gridTileVisualCenter(x, y);
              g.fillStyle(0x66748d, 0.1);
              g.fillEllipse(
                center.x + ((hash % 15) - 7),
                center.y + (((hash >> 3) % 11) - 5),
                24 + (hash % 14),
                8 + ((hash >> 4) % 7),
              );
            }
            continue;
          }
          const nearExplored = this.hasRevealedNeighbor(x, y, 1);
          const alpha = (nearExplored ? 0.86 : 0.96) + (hash % 5) * 0.004;
          this.drawPolygon(g, points, 0x030508, alpha, 0x111923, nearExplored ? 0.22 : 0.08, 1);
          if (nearExplored && hash % 5 === 0) {
            const center = this.gridTileVisualCenter(x, y);
            g.fillStyle(0x2a3648, 0.14);
            g.fillEllipse(
              center.x + ((hash % 17) - 8),
              center.y + (((hash >> 3) % 13) - 6),
              26 + (hash % 20),
              10 + ((hash >> 4) % 8),
            );
          }
        }
      }
      return;
    }
    const tile = GRID_CONFIG.tileSize;
    for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        const cell = this.gridCells.get(gridKey(x, y));
        const left = GRID_CONFIG.originX + x * tile;
        const top = GRID_CONFIG.originY + y * tile;
        if (cell?.unlocked) {
          // soft fog skirt bleeding onto revealed frontier tiles
          const foggedSides = {
            west: !this.isRevealed(x - 1, y) && isInsideGrid(x - 1, y),
            east: !this.isRevealed(x + 1, y) && isInsideGrid(x + 1, y),
            north: !this.isRevealed(x, y - 1) && isInsideGrid(x, y - 1),
            south: !this.isRevealed(x, y + 1) && isInsideGrid(x, y + 1),
          };
          g.fillStyle(0x141c28, 0.2);
          const skirt = 14;
          if (foggedSides.west) g.fillRect(left, top, skirt, tile);
          if (foggedSides.east) g.fillRect(left + tile - skirt, top, skirt, tile);
          if (foggedSides.north) g.fillRect(left, top, tile, skirt);
          if (foggedSides.south) g.fillRect(left, top + tile - skirt, tile, skirt);
          continue;
        }
        // fog gets deeper the further it sits from the frontier
        const nearClearing = this.isRevealed(x - 1, y) || this.isRevealed(x + 1, y)
          || this.isRevealed(x, y - 1) || this.isRevealed(x, y + 1)
          || this.isRevealed(x - 1, y - 1) || this.isRevealed(x + 1, y + 1)
          || this.isRevealed(x - 1, y + 1) || this.isRevealed(x + 1, y - 1);
        const hash = this.getTerrainHash(x, y, 7);
        const alpha = (nearClearing ? 0.4 : 0.58) + (hash % 7) * 0.012;
        g.fillStyle(hash % 3 ? 0x131b26 : 0x101722, alpha);
        g.fillRect(left, top, tile, tile);
        // faint drifting mist blobs so deep fog is not a flat fill
        if (!nearClearing && hash % 5 === 0) {
          g.fillStyle(0x2a3648, 0.14);
          g.fillEllipse(
            left + tile / 2 + ((hash % 17) - 8),
            top + tile / 2 + (((hash >> 3) % 13) - 6),
            26 + (hash % 20),
            12 + ((hash >> 4) % 9),
          );
        }
      }
    }
  }

  redrawBuildGrid() {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
    if (this.useIsoRendering()) {
      this.gridGraphics.lineStyle(1, 0xfff6dc, BUILD_GRID_STROKE_ALPHA);
      const activeSet = this.getActiveVisibilitySet();
      for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
        for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
          if (!this.isRevealed(x, y)) continue;
          const state = this.getVisibilityState(x, y, activeSet);
          const alpha = state === 'active' ? BUILD_GRID_STROKE_ALPHA : BUILD_GRID_STROKE_ALPHA * 0.42;
          this.drawPolygon(this.gridGraphics, this.getVisualTilePoints(x, y), null, 0, 0xfff6dc, alpha, 1);
        }
      }
      return;
    }
    this.gridGraphics.lineStyle(1, 0xfff6dc, 0.2);
    for (let x = 0; x <= GRID_CONFIG.columns; x += 1) {
      const px = GRID_CONFIG.originX + x * GRID_CONFIG.tileSize;
      this.gridGraphics.lineBetween(
        px,
        GRID_CONFIG.originY,
        px,
        GRID_CONFIG.originY + GRID_CONFIG.rows * GRID_CONFIG.tileSize,
      );
    }
    for (let y = 0; y <= GRID_CONFIG.rows; y += 1) {
      const py = GRID_CONFIG.originY + y * GRID_CONFIG.tileSize;
      this.gridGraphics.lineBetween(
        GRID_CONFIG.originX,
        py,
        GRID_CONFIG.originX + GRID_CONFIG.columns * GRID_CONFIG.tileSize,
        py,
      );
    }
  }

  drawRoadGrounding(graphics, road, left, top, rect, type, plaza) {
    const tile = GRID_CONFIG.tileSize;
    const center = gridToWorld(road.x, road.y);
    const centerY = center.y - tile / 2;
    const hash = this.getTerrainHash(road.x, road.y, 19);
    const shoulderAlpha = road.type === 'premium' ? 0.22 : road.type === 'stone' ? 0.18 : 0.2;
    graphics.fillStyle(0x33482d, 0.1);
    graphics.fillRoundedRect(left + 2, top + 4, tile - 4, tile - 8, plaza ? 8 : 11);
    graphics.fillStyle(type.edgeColor, shoulderAlpha);
    graphics.fillRoundedRect(
      rect.x - (plaza ? 3 : 6),
      rect.y - (plaza ? 3 : 6),
      rect.width + (plaza ? 6 : 12),
      rect.height + (plaza ? 6 : 12),
      plaza ? 7 : 12,
    );
    graphics.fillStyle(0x516b36, 0.08);
    graphics.fillEllipse(center.x, centerY + 2, tile * 0.86, tile * 0.32);

    const flecks = plaza ? 2 : 4;
    for (let i = 0; i < flecks; i += 1) {
      const fx = rect.x + 6 + ((hash >> (i * 3)) % Math.max(1, rect.width - 12));
      const fy = rect.y + 6 + ((hash >> (i * 5 + 2)) % Math.max(1, rect.height - 12));
      const color = road.type === 'premium'
        ? [0xffe08a, 0xb78620, 0xfff1b6][i % 3]
        : road.type === 'stone'
          ? [0xd0ccc4, 0x777c82, 0xf2ead8][i % 3]
          : [0xf0d49a, 0x9a6e43, 0x6f8545][i % 3];
      graphics.fillStyle(color, road.type === 'premium' ? 0.26 : 0.18);
      graphics.fillEllipse(fx, fy, 3 + (hash % 5), 2);
    }
  }

  drawIsoRoadConnectors(graphics, tile, mask, fillColor, fillAlpha, inset = 0.72) {
    if (!mask || fillAlpha <= 0) return;
    const inner = this.insetPoints(tile, inset);
    const edges = [
      { bit: 1, index: 0 }, // north shares edge 0-1
      { bit: 2, index: 1 }, // east shares edge 1-2
      { bit: 4, index: 2 }, // south shares edge 2-3
      { bit: 8, index: 3 }, // west shares edge 3-0
    ];
    for (const edge of edges) {
      if (!(mask & edge.bit)) continue;
      const next = (edge.index + 1) % 4;
      this.drawPolygon(
        graphics,
        [inner[edge.index], tile[edge.index], tile[next], inner[next]],
        fillColor,
        fillAlpha,
        null,
      );
    }
  }

  drawIsoRoadSurfacePattern(overlay, road, tile, mask, plaza) {
    const center = this.gridTileVisualCenter(road.x, road.y);
    const midpoint = (a, b, inset = 0.12) => ({
      x: Phaser.Math.Linear(center.x, (a.x + b.x) / 2, 1 - inset),
      y: Phaser.Math.Linear(center.y, (a.y + b.y) / 2, 1 - inset),
    });
    const edges = [
      { bit: 1, point: midpoint(tile[0], tile[1]) },
      { bit: 2, point: midpoint(tile[1], tile[2]) },
      { bit: 4, point: midpoint(tile[2], tile[3]) },
      { bit: 8, point: midpoint(tile[3], tile[0]) },
    ];

    if (road.type === 'dirt') {
      overlay.lineStyle(1, 0x765033, 0.34);
      for (const edge of edges) {
        if (!(mask & edge.bit)) continue;
        overlay.lineBetween(center.x - 2, center.y, edge.point.x - 2, edge.point.y);
        overlay.lineBetween(center.x + 2, center.y, edge.point.x + 2, edge.point.y);
      }
      overlay.fillStyle(0xf0d49a, 0.24);
      overlay.fillEllipse(center.x, center.y, plaza ? 18 : 10, plaza ? 7 : 4);
      // scattered pebbles and dirt clods so the packed-earth path reads as a
      // well-travelled road rather than a flat brown fill (Settlers/Anno feel)
      const specks = plaza ? 14 : 8;
      for (let i = 0; i < specks; i += 1) {
        const ang = (this.getTerrainHash(road.x * 7 + i, road.y * 13 + i, 64) / 64) * 6.283;
        const rad = (this.getTerrainHash(road.x + i * 3, road.y - i * 2, 60) / 60) * (plaza ? 20 : 11);
        const px = Math.round(center.x + Math.cos(ang) * rad);
        const py = Math.round(center.y + Math.sin(ang) * rad * 0.5);
        const tone = this.getTerrainHash(road.x - i, road.y + i, 3);
        overlay.fillStyle(tone === 0 ? 0x8a6b46 : tone === 1 ? 0x5c4326 : 0xc9a877, 0.4);
        overlay.fillRect(px, py, tone === 2 ? 2 : 1, 1);
      }
      return;
    }

    if (road.type === 'stone') {
      // denser, size- and shade-varied cobblestones for a fitted paved street
      const cobbles = plaza
        ? [[0, 0], [-13, 0], [13, 0], [0, -6], [0, 6], [-20, -5], [20, 5], [-8, -6], [8, 6], [-8, 6], [8, -6], [-16, 4], [16, -4]]
        : [[0, 0], [-9, -3], [9, 3], [-5, 5], [5, -5], [-13, 0], [13, 0], [0, -6], [0, 6], [-4, -2], [4, 2]];
      for (let i = 0; i < cobbles.length; i += 1) {
        const [dx, dy] = cobbles[i];
        const shade = this.getTerrainHash(road.x + i, road.y + i, 3);
        const fill = shade === 0 ? 0xd1ccc1 : shade === 1 ? 0xb9b4aa : 0xc7c2b8;
        const stroke = shade === 1 ? 0x9b9892 : 0xc4c0b8;
        const w = 4 + this.getTerrainHash(road.x - i, road.y + i * 2, 3);
        this.drawPolygon(overlay, [
          { x: center.x + dx, y: center.y + dy - 3 },
          { x: center.x + dx + w, y: center.y + dy },
          { x: center.x + dx, y: center.y + dy + 3 },
          { x: center.x + dx - w, y: center.y + dy },
        ], fill, 0.42, stroke, 0.4, 1);
      }
      overlay.lineStyle(1, 0x777c82, 0.22);
      for (const edge of edges) if (mask & edge.bit) overlay.lineBetween(center.x, center.y, edge.point.x, edge.point.y);
      return;
    }

    // premium: ornate gold inlay with gem accents (satirical luxury paving)
    overlay.lineStyle(1, 0xfff1a6, 0.4);
    for (const edge of edges) if (mask & edge.bit) overlay.lineBetween(center.x, center.y, edge.point.x, edge.point.y);
    this.drawPolygon(overlay, [
      { x: center.x, y: center.y - (plaza ? 7 : 5) },
      { x: center.x + (plaza ? 15 : 10), y: center.y },
      { x: center.x, y: center.y + (plaza ? 7 : 5) },
      { x: center.x - (plaza ? 15 : 10), y: center.y },
    ], 0xffdf73, 0.32, 0xfff1a6, 0.5, 1);
    this.drawPolygon(overlay, [
      { x: center.x, y: center.y - 2 },
      { x: center.x + 4, y: center.y },
      { x: center.x, y: center.y + 2 },
      { x: center.x - 4, y: center.y },
    ], 0xfff6cf, 0.5, 0xffffff, 0.35, 1);
    const gems = plaza ? 4 : 2;
    for (let i = 0; i < gems; i += 1) {
      overlay.fillStyle(i % 2 ? 0x8ad4ff : 0xff9ad4, 0.7);
      overlay.fillRect(center.x + (i % 2 ? 9 : -10), center.y + (i < 2 ? -3 : 3), 1, 1);
    }
  }

  // Build (once, cached) a diamond-clipped version of a detailed square road
  // texture so it can be stamped straight onto iso tiles. Returns the texture
  // key, or null if the source texture is missing (caller falls back to the
  // procedural surface).
  ensureRoadDiamondTexture(type) {
    const key = `road_diamond_${type}`;
    if (this.textures.exists(key)) return key;
    const srcKey = { dirt: 'tile_road_dirt', stone: 'tile_road_stone', premium: 'tile_road_premium' }[type];
    if (!srcKey || !this.textures.exists(srcKey)) return null;
    const src = this.textures.get(srcKey).getSourceImage();
    if (!src || !src.width) return null;
    const W = ISO_TILE_WIDTH;
    const H = ISO_TILE_HEIGHT;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W, H / 2);
      ctx.lineTo(W / 2, H);
      ctx.lineTo(0, H / 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, W, H);
      this.textures.addCanvas(key, canvas);
      return key;
    } catch {
      return this.textures.exists(key) ? key : null;
    }
  }

  ensureRoadMaskTexture(type, mask) {
    const key = `road_iso_mask_${type}_${mask}`;
    if (this.textures.exists(key)) return key;
    const srcKey = `road_mask_${type}_${mask}`;
    if (!this.textures.exists(srcKey)) return null;
    const src = this.textures.get(srcKey).getSourceImage();
    if (!src?.width || !src?.height) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = ISO_TILE_WIDTH;
      canvas.height = ISO_TILE_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      // Affine-project the flat square source into the map's isometric
      // parallelogram. The cardinal exits then meet the matching diamond edge.
      ctx.setTransform(
        ISO_TILE_WIDTH / (2 * src.width), ISO_TILE_HEIGHT / (2 * src.width),
        -ISO_TILE_WIDTH / (2 * src.height), ISO_TILE_HEIGHT / (2 * src.height),
        ISO_TILE_WIDTH / 2, 0,
      );
      ctx.drawImage(src, 0, 0);
      ctx.resetTransform();
      this.textures.addCanvas(key, canvas);
      return key;
    } catch {
      return null;
    }
  }

  drawIsoRoadTile(graphics, overlay, road) {
    const type = ROAD_TYPES[road.type] || ROAD_TYPES.dirt;
    const plaza = isRoadPlazaTile(this.gridCells, road.x, road.y);
    const mask = getRoadMask(this.gridCells, road.x, road.y);
    const tile = this.getVisualTilePoints(road.x, road.y);
    const center = this.gridTileVisualCenter(road.x, road.y);
    const hash = this.getTerrainHash(road.x, road.y, 19);
    const shoulderColor = road.type === 'premium' ? 0x6b6049 : type.edgeColor;
    const surfaceAlpha = road.type === 'premium' ? 0.96 : road.type === 'stone' ? 0.94 : 0.9;
    const inner = this.insetPoints(tile, plaza ? 0.96 : 0.78);
    const core = this.insetPoints(tile, plaza ? 0.82 : 0.62);

    // Roads are painted into the terrain plane. A displaced lower diamond made
    // the old version read as a raised trench at normal zoom.
    this.drawPolygon(graphics, tile, shoulderColor, plaza ? 0.22 : 0.14, shoulderColor, 0.16, 1);
    this.drawIsoRoadConnectors(graphics, tile, mask, shoulderColor, plaza ? 0.33 : 0.28, plaza ? 0.94 : 0.76);
    this.drawPolygon(graphics, inner, type.edgeColor, road.type === 'premium' ? 0.68 : 0.52, type.edgeColor, 0.48, 1);
    this.drawIsoRoadConnectors(graphics, tile, mask, type.edgeColor, road.type === 'premium' ? 0.66 : 0.56, plaza ? 0.82 : 0.68);
    const roadTexKey = this.ensureRoadMaskTexture(road.type, mask)
      || this.ensureRoadDiamondTexture(road.type);
    if (roadTexKey) {
      // Full-tile diamond stamp so connected road tiles share edges and merge
      // into one continuous surface (no gaps / "separate squares"), matching the
      // polished build-menu preview instead of a flat procedural fill.
      const tw = Math.abs(tile[1].x - tile[3].x);
      const th = Math.abs(tile[2].y - tile[0].y);
      const img = this.add.image(center.x, center.y, roadTexKey)
        .setOrigin(0.5, 0.5)
        .setDepth(20.45);
      img.setDisplaySize(tw + 2, th + 2);
      this.cityRoadImages.push(img);
      // Soft grass/curb only on OPEN edges (no road neighbour on that side).
      // Connected sides stay untouched so the road reads as one path.
      const openEdges = [
        [1, tile[0], tile[1]], [2, tile[1], tile[2]],
        [4, tile[2], tile[3]], [8, tile[3], tile[0]],
      ];
      for (const [bit, a, b] of openEdges) {
        if (mask & bit) continue;
        overlay.lineStyle(2, 0x33421f, 0.32);
        overlay.lineBetween(a.x, a.y, b.x, b.y);
      }
      // Gradual material transition: where this (higher-tier) road meets a
      // lower-tier neighbour, fade the neighbour's colour in over the shared
      // half of the tile so Dirt->Stone->Premium blend instead of hard-cutting.
      const tierRank = { dirt: 0, stone: 1, premium: 2 };
      const myRank = tierRank[road.type] ?? 0;
      const neigh = [
        [1, tile[0], tile[1], road.x, road.y - 1],
        [2, tile[1], tile[2], road.x + 1, road.y],
        [4, tile[2], tile[3], road.x, road.y + 1],
        [8, tile[3], tile[0], road.x - 1, road.y],
      ];
      for (const [bit, a, b, nx, ny] of neigh) {
        if (!(mask & bit)) continue;
        const ntype = this._roadTypeLookup?.get(`${nx},${ny}`);
        if (!ntype || (tierRank[ntype] ?? 0) >= myRank) continue;
        const ncolor = (ROAD_TYPES[ntype] || ROAD_TYPES.dirt).color;
        const midA = { x: (a.x + center.x) / 2, y: (a.y + center.y) / 2 };
        const midB = { x: (b.x + center.x) / 2, y: (b.y + center.y) / 2 };
        this.drawPolygon(overlay, [a, b, midB, midA], ncolor, 0.5, ncolor, 0.3, 1);
      }
      if (road.type === 'premium') {
        overlay.fillStyle(0xfff1a6, 0.2);
        overlay.fillCircle(center.x, center.y, plaza ? 2 : 1.5);
      }
    } else {
      this.drawPolygon(graphics, core, type.color, surfaceAlpha, 0xfff6dc, road.type === 'premium' ? 0.22 : 0.1, 1);
      this.drawIsoRoadConnectors(graphics, tile, mask, type.color, road.type === 'premium' ? 0.92 : 0.86, plaza ? 0.72 : 0.58);
      this.drawIsoRoadSurfacePattern(overlay, road, tile, mask, plaza);
      if (road.type === 'stone') {
        overlay.lineStyle(1, 0xf2ead8, 0.1);
        this.drawPolygon(overlay, this.insetPoints(tile, plaza ? 0.68 : 0.5), null, 0, 0xf2ead8, 0.1, 1);
      } else if (road.type === 'premium') {
        overlay.fillStyle(0xfff1a6, 0.24);
        overlay.fillCircle(center.x, center.y, plaza ? 2 : 1.5);
      } else {
        graphics.fillStyle(type.edgeColor, 0.18);
        graphics.fillEllipse(
          center.x + ((hash % 13) - 6),
          center.y + (((hash >> 4) % 9) - 4),
          plaza ? 9 : 6,
          plaza ? 4 : 3,
        );
      }
    }

    if (plaza) {
      overlay.lineStyle(1, 0xfff6dc, 0.12);
      this.drawPolygon(overlay, this.insetPoints(tile, 0.55), null, 0, 0xfff6dc, 0.1, 1);
    }
  }

  redrawCityRoads() {
    if (!this.cityRoadGraphics) this.cityRoadGraphics = this.add.graphics().setDepth(20);
    if (!this.cityRoadOverlay) this.cityRoadOverlay = this.add.graphics().setDepth(20.7);
    if (!this.cityRoadImages) this.cityRoadImages = [];
    for (const image of this.cityRoadImages) image.destroy();
    this.cityRoadImages = [];
    // lookup used by drawIsoRoadTile for gradual material transitions
    this._roadTypeLookup = new Map(this.cityState.roads.map((r) => [`${r.x},${r.y}`, r.type]));
    const graphics = this.cityRoadGraphics;
    const overlay = this.cityRoadOverlay;
    graphics.clear();
    overlay.clear();
    if (!this.isBuilderCity) return;

    if (this.useIsoRendering()) {
      for (const road of this.cityState.roads) this.drawIsoRoadTile(graphics, overlay, road);
      return;
    }

    const roadTextureByType = {
      dirt: 'tile_road_dirt',
      stone: 'tile_road_stone',
      premium: 'tile_road_premium',
    };

    for (const road of this.cityState.roads) {
      const type = ROAD_TYPES[road.type] || ROAD_TYPES.dirt;
      const center = gridToWorld(road.x, road.y);
      const left = center.x - GRID_CONFIG.tileSize / 2;
      const top = center.y - GRID_CONFIG.tileSize;
      const mask = getRoadMask(this.gridCells, road.x, road.y);
      const variant = getRoadVariant(mask);
      const plaza = isRoadPlazaTile(this.gridCells, road.x, road.y);
      const textureKey = resolveTexture(this, roadTextureByType[road.type] || '', null);

      if (textureKey) {
        // textured roads: plaza interiors fill the whole tile so 2x2+ blocks
        // become solid slabs instead of donuts; loose tiles keep a small
        // grass shoulder on unconnected sides
        const rect = getRoadSurfaceRect(left, top, GRID_CONFIG.tileSize, mask, plaza ? 0 : 4);
        this.drawRoadGrounding(graphics, road, left, top, rect, type, plaza);
        if (!plaza) {
          graphics.fillStyle(0xe2cf9d, road.type === 'premium' ? 0.2 : 0.11);
          graphics.fillEllipse(center.x, center.y - GRID_CONFIG.tileSize / 2, rect.width * 0.55, 7);
        }
        const image = this.add.image(left, top, textureKey).setOrigin(0, 0).setDepth(20.5);
        image.setCrop(rect.x - left, rect.y - top, rect.width, rect.height);
        this.cityRoadImages.push(image);
        // pseudo-depth so roads match the angled buildings: a raised light lip
        // on open north edges and a darker curb face on open south edges make
        // the road bed read as a slab instead of a painted strip
        if (!(mask & 1)) { // north open
          overlay.fillStyle(0xffffff, 0.13);
          overlay.fillRect(rect.x + 1, rect.y, rect.width - 2, 2);
        }
        if (!(mask & 4)) { // south open
          overlay.fillStyle(type.edgeColor, 0.85);
          overlay.fillRect(rect.x + 1, rect.y + rect.height - 2, rect.width - 2, 2);
          overlay.fillStyle(0x10151d, 0.3);
          overlay.fillRect(rect.x + 2, rect.y + rect.height, rect.width - 4, 3);
        }
        if (!(mask & 8)) { // west open
          overlay.fillStyle(0x10151d, 0.14);
          overlay.fillRect(rect.x, rect.y + 1, 2, rect.height - 2);
        }
        if (!(mask & 2)) { // east open
          overlay.fillStyle(0x10151d, 0.14);
          overlay.fillRect(rect.x + rect.width - 2, rect.y + 1, 2, rect.height - 2);
        }
        continue;
      }

      // fallback: procedural rectangles when road tile art is missing
      const edgeRect = getRoadSurfaceRect(left, top, GRID_CONFIG.tileSize, mask, plaza ? 3 : 4);
      const surfaceRect = getRoadSurfaceRect(left, top, GRID_CONFIG.tileSize, mask, plaza ? 4 : 8);

      this.drawRoadGrounding(graphics, road, left, top, edgeRect, type, plaza);
      graphics.fillStyle(type.edgeColor, 0.72);
      graphics.fillRoundedRect(edgeRect.x, edgeRect.y, edgeRect.width, edgeRect.height, plaza ? 5 : 8);
      graphics.fillStyle(type.color, 0.98);
      graphics.fillRoundedRect(surfaceRect.x, surfaceRect.y, surfaceRect.width, surfaceRect.height, plaza ? 4 : 7);

      const hash = (road.x * 31 + road.y * 17) % 4;
      if (road.type === 'dirt' && hash < 2 && !plaza) {
        graphics.fillStyle(type.edgeColor, 0.24);
        graphics.fillCircle(center.x + (hash ? 7 : -8), center.y - 25, 2);
      } else if (road.type === 'stone' && variant === 'straight') {
        graphics.lineStyle(1, type.edgeColor, 0.22);
        graphics.lineBetween(surfaceRect.x + 5, center.y - 24, surfaceRect.x + surfaceRect.width - 5, center.y - 24);
      } else if (road.type === 'premium') {
        graphics.fillStyle(0xfff1a6, 0.48);
        graphics.fillCircle(center.x, center.y - 24, variant === 'crossroad' ? 3 : 2);
      }
    }
  }

  setupBuildInput() {
    this.buildInputZone = this.add.zone(
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth,
      this.worldHeight,
    ).setDepth(4900).setVisible(false);

    this.buildInputZone.on('pointermove', (pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.updateBuildPreview(world.x, world.y);
      // road mode: dragging paints tiles into the pending plan
      if (
        this.buildMode?.kind === 'road'
        && pointer.primaryDown
        && !this.input.pointer2?.isDown // never paint mid-pinch
      ) {
        const cell = this.worldToBuildGrid(world.x, world.y);
        this.addRoadPlanCell(cell.x, cell.y);
      }
    });
    this.buildInputZone.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown?.()) {
        this.cancelBuildMode();
        return;
      }
      if (this.buildMode?.kind === 'road') this.roadPaintSession = new Set();
    });
    this.buildInputZone.on('pointerup', (pointer) => {
      if (!this.buildMode) return;
      if (this.buildMode.kind === 'road') {
        const painted = (this.roadPaintSession?.size || 0) > 0;
        this.roadPaintSession = null;
        // a clean tap toggles a single planned tile; drags already painted
        if (!painted && !this.wasDragGesture(pointer)) {
          const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
          const cell = this.worldToBuildGrid(world.x, world.y);
          if (this.getRoadAt(cell.x, cell.y)) {
            const upgrade = this.getRoadUpgradeInfo(cell.x, cell.y, this.buildMode.id);
            if (upgrade.target) this.upgradeRoadAt(cell.x, cell.y, upgrade.target.id);
            else this.showRoadInspector(cell.x, cell.y);
          } else {
            this.toggleRoadPlanCell(cell.x, cell.y);
          }
        }
        return;
      }
      if (this.wasDragGesture(pointer)) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const cell = this.worldToBuildGrid(world.x, world.y);
      this.tryPlaceBuildItem(cell.x, cell.y);
    });
    this.input.keyboard?.on('keydown-ESC', this.cancelBuildMode, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.cancelBuildMode, this);
    });
  }

  getBuildFootprint() {
    if (!this.buildMode) return { w: 1, h: 1 };
    if (this.buildMode.kind === 'road') return { w: 1, h: 1 };
    if (this.buildMode.kind === 'move') {
      const place = this.buildingById?.[this.buildMode.id];
      return place?.footprint || getBuildingCatalogEntry(place?.baseId || place?.id)?.footprint || { w: 1, h: 1 };
    }
    return getBuildingCatalogEntry(this.buildMode.id)?.footprint || { w: 1, h: 1 };
  }

  getRoadAccessCells(gridX, gridY, footprint) {
    const cells = [];
    for (let x = gridX; x < gridX + footprint.w; x += 1) {
      cells.push({ x, y: gridY - 1 }, { x, y: gridY + footprint.h });
    }
    for (let y = gridY; y < gridY + footprint.h; y += 1) {
      cells.push({ x: gridX - 1, y }, { x: gridX + footprint.w, y });
    }
    return cells.filter((cell, index, all) => (
      isInsideGrid(cell.x, cell.y)
      && all.findIndex((item) => item.x === cell.x && item.y === cell.y) === index
    ));
  }

  getBuildingRoadAccess(place) {
    const catalog = getBuildingCatalogEntry(place?.id);
    if (!this.isBuilderCity || !catalog?.roadRequired) {
      return { connected: true, roadCell: null };
    }
    if (!Number.isInteger(place?.gridX) || !Number.isInteger(place?.gridY)) {
      return { connected: false, roadCell: null };
    }
    const roadCell = this.getRoadAccessCells(place.gridX, place.gridY, catalog.footprint)
      .find((cell) => this.gridCells.get(gridKey(cell.x, cell.y))?.road);
    return { connected: Boolean(roadCell), roadCell: roadCell || null };
  }

  getRoadAt(gridX, gridY) {
    if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) return null;
    return (this.cityState?.roads || []).find((road) => road.x === gridX && road.y === gridY) || null;
  }

  getRoadTypeRank(typeId) {
    const index = ROAD_UPGRADE_ORDER.indexOf(typeId);
    return index < 0 ? 0 : index;
  }

  getRoadUpgradeTarget(currentType, requestedType = null) {
    const currentRank = this.getRoadTypeRank(currentType);
    if (requestedType && ROAD_TYPES[requestedType] && this.getRoadTypeRank(requestedType) > currentRank) {
      return requestedType;
    }
    return ROAD_UPGRADE_ORDER[currentRank + 1] || null;
  }

  getRoadUpgradeInfo(gridX, gridY, requestedType = null) {
    const road = this.getRoadAt(gridX, gridY);
    if (!road) return { road: null, valid: false, reason: 'No road here. The commute is theoretical.' };
    const current = ROAD_TYPES[road.type] || ROAD_TYPES.dirt;
    const targetId = this.getRoadUpgradeTarget(current.id, requestedType);
    if (!targetId) return { road, current, target: null, valid: false, reason: 'Road already at maximum municipal shininess.' };
    const target = ROAD_TYPES[targetId];
    const cost = target.cost;
    return {
      road,
      current,
      target,
      cost,
      valid: this.resources.gold >= cost,
      reason: this.resources.gold >= cost
        ? ''
        : `Need ${cost} gold to upgrade this road. Infrastructure refuses exposure.`
    };
  }

  getAverageHeroPower() {
    const heroes = this.getActiveHeroes();
    if (!heroes.length) return 0;
    return heroes.reduce((sum, hero) => sum + (hero.stats.power || 0), 0) / heroes.length;
  }

  isCatalogUnlocked(catalog) {
    if (!catalog?.unlockKey) return true;
    const activeHeroes = this.getActiveHeroes();
    const maxDebt = activeHeroes.reduce((max, hero) => Math.max(max, hero.stats.debt || 0), 0);
    const maxResentment = activeHeroes.reduce((max, hero) => Math.max(max, hero.stats.resentment || 0), 0);
    const tavernRuntime = this.isBuildingPlaced('tavern') ? this.getBuildingRuntime('tavern') : null;
    const hasPremiumItem = activeHeroes.some((hero) => hero.stats.inventory?.some((item) => item.premiumSource));
    switch (catalog.unlockKey) {
      case 'tavern': return this.isBuildingPlaced('tavern');
      case 'hostel': return activeHeroes.length >= 6 || Boolean(tavernRuntime && tavernRuntime.visitorsNow >= this.getBuildingCapacity(this.buildingById.tavern));
      case 'failedQuest': return (this.stats.questFailures || 0) > 0 || this.day >= 3;
      case 'watchtower': return this.resources.threat >= 40 || (this.stats.threatEventsSurvived || 0) > 0;
      case 'bank': return maxDebt > 300 || this.resources.corruption > 30;
      case 'mentor': return maxResentment > 40 || this.resources.trust > 60;
      case 'arena': return this.getStageIndex() >= 1 || this.getAverageHeroPower() > 10;
      case 'whale2':
        return this.getPlaceLevel(this.buildingById.whale) >= 2
          || activeHeroes.some((hero) => /Whale/.test(hero.stats.status || hero.def.personality));
      case 'whale3': return this.getPlaceLevel(this.buildingById.whale) >= 3;
      case 'lootbox': return this.isBuildingPlaced('whale') || this.resources.corruption > 35;
      case 'premiumItems': return hasPremiumItem;
      case 'stage2': return this.getStageIndex() >= 1 || (this.stats.policiesChosen || 0) >= 3;
      case 'rank1': return this.getTownRankSnapshot().index >= 1;
      case 'rank2': return this.getTownRankSnapshot().index >= 2;
      case 'premiumProduction': return this.getTownRankSnapshot().index >= 3 && this.resources.corruption >= 40;
      default: return true;
    }
  }

  getCatalogLockReason(catalog) {
    return this.isCatalogUnlocked(catalog) ? null : (catalog.lockReason || 'Locked by suspicious municipal policy.');
  }

  getExtractionNodesFor(baseId, gridX, gridY) {
    const config = EXTRACTION_BUILDINGS[baseId];
    if (!config) return [];
    const accepts = config.accepts || [config.resource];
    return Object.values(this.explorationPointById || {})
      .filter((place) => this.isResourceNode(place) && accepts.includes(POI_RESOURCE_YIELDS[place.id]?.resource))
      .filter((place) => this.isRevealed(place.gridX, place.gridY))
      .map((place) => ({ place, distance: Math.hypot((place.gridX || 0) - gridX, (place.gridY || 0) - gridY) }))
      .sort((a, b) => a.distance - b.distance);
  }

  getNearestStorehouse(gridX, gridY) {
    return this.cityState.placedBuildings
      .filter((placement) => getBaseBuildingId(placement.id) === 'storehouse')
      .map((placement) => ({
        placement,
        place: this.buildingById?.[placement.id],
        distance: Math.hypot(placement.gridX - gridX, placement.gridY - gridY),
      }))
      .filter((entry) => entry.place?.isPlaced && !this.getBuildingRuntime(entry.place.id).closed)
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  hasHarvestableForestNear(gridX, gridY, radius = 10) {
    return [...(this.forestBlockedCells || [])].some((key) => {
      if (this.harvestedForestCells?.has(key)) return false;
      const [x, y] = key.split(',').map(Number);
      return Math.hypot(x - gridX, y - gridY) <= radius;
    });
  }

  getExtractionPlacementAssessment(baseId, gridX, gridY, footprint = { w: 2, h: 2 }) {
    const config = EXTRACTION_BUILDINGS[baseId];
    if (!config) return null;
    const centerX = gridX + footprint.w / 2;
    const centerY = gridY + footprint.h / 2;
    const nodes = this.getExtractionNodesFor(baseId, centerX, centerY);
    const nearest = nodes[0] || null;
    const forestAvailable = baseId === 'lumber_camp' && this.hasHarvestableForestNear(centerX, centerY);
    const nodeInRange = nearest && nearest.distance <= EXTRACTION_RANGE_TILES;
    if (!nodeInRange && !forestAvailable) {
      const reason = baseId === 'lumber_camp'
        ? 'No forest or Wood Grove in range.'
        : nearest
          ? `${nearest.place.name} is too far away (${Math.ceil(nearest.distance)}/${EXTRACTION_RANGE_TILES} tiles).`
          : `${config.resource === 'iron' ? 'Iron Outcrop' : config.resource === 'herbs' ? 'Herb Patch' : 'Salvage site'} not discovered in range.`;
      return { valid: false, quality: 'bad', reason, node: nearest?.place || null };
    }
    const roadCell = this.getRoadAccessCells(gridX, gridY, footprint)
      .find((cell) => this.gridCells.get(gridKey(cell.x, cell.y))?.road);
    const storage = this.getNearestStorehouse(centerX, centerY);
    const inTerritory = this.isInTerritory(centerX, centerY);
    const node = nodeInRange ? nearest.place : null;
    const danger = node ? this.getResourceNode(node.id).danger : 12;
    const areaRep = this.getAreaReputation(node ? this.getAreaIdForPlace(node) : 'frontier');
    const warnings = [];
    if (!roadCell) warnings.push('No road to storage; carriers will be slow and less reliable.');
    if (!storage) warnings.push('No Storehouse; Guild Hall fallback is inefficient.');
    else if (storage.distance > 28) warnings.push(`Storehouse is far away (${Math.ceil(storage.distance)} tiles).`);
    if (!inTerritory) warnings.push('Outside supported territory; build a Frontier Outpost nearby.');
    if (danger + areaRep >= 65) warnings.push(`Area reputation: Dangerous (${Math.min(100, danger + areaRep)}/100).`);
    return {
      valid: true,
      quality: warnings.length ? 'warning' : 'good',
      reason: warnings.join(' '),
      node,
      forestAvailable,
      roadCell: roadCell || null,
      storage,
      danger,
      areaRep,
      expectedOutput: config.baseRate,
    };
  }

  validateBuildPlacement(gridX, gridY) {
    if (!this.buildMode) return { valid: false, reason: 'Choose something to build.' };
    const footprint = this.getBuildFootprint();
    const cells = getFootprintCells(gridX, gridY, footprint);
    if (cells.some((cell) => !isInsideGrid(cell.x, cell.y))) {
      return { valid: false, reason: 'That plan extends beyond approved reality.' };
    }
    if (cells.some((cell) => !this.isRevealed(cell.x, cell.y))) {
      return { valid: false, reason: 'Hidden by fog. Build roads toward it or let heroes explore first.' };
    }

    if (this.buildMode.kind === 'road') {
      const cell = this.gridCells.get(gridKey(gridX, gridY));
      if (cell?.occupiedBy) return { valid: false, reason: 'A building already owns that argument.' };
      const road = ROAD_TYPES[this.buildMode.id];
      if (cell?.road) {
        const upgrade = this.getRoadUpgradeInfo(gridX, gridY, this.buildMode.id);
        if (!upgrade.target) return { valid: false, reason: upgrade.reason, footprint };
        return {
          valid: upgrade.valid,
          reason: upgrade.reason,
          cost: upgrade.cost,
          footprint,
          roadUpgrade: true,
          targetRoadType: upgrade.target.id,
        };
      }
      // gold is only charged on Confirm, so planning stays green regardless
      return { valid: true, reason: '', cost: road.cost, footprint };
    }

    if (this.buildMode.kind === 'delete') {
      const cell = this.gridCells.get(gridKey(gridX, gridY));
      if (cell?.occupiedBy) {
        return { valid: false, reason: 'Building demolition is not licensed yet. Roads only for now.' };
      }
      if (!cell?.road) {
        return { valid: false, reason: 'Nothing to delete here. The bulldozer sighs.' };
      }
      const refund = Math.floor((ROAD_TYPES[cell.road]?.cost || 0) / 2);
      return { valid: true, reason: '', cost: -refund, footprint };
    }

    const movingPlace = this.buildMode.kind === 'move' ? this.buildingById?.[this.buildMode.id] : null;
    const catalog = getBuildingCatalogEntry(movingPlace?.baseId || this.buildMode.id);
    if (!catalog) return { valid: false, reason: 'The catalog misplaced that building.' };
    if (cells.some((cell) => this.forestBlockedCells?.has(gridKey(cell.x, cell.y)))) {
      return { valid: false, reason: 'Dense forest blocks this footprint. Run a road through the grove to establish access first.' };
    }
    const lockReason = movingPlace ? null : this.getCatalogLockReason(catalog);
    if (lockReason) return { valid: false, reason: lockReason };
    if (!movingPlace && this.isCatalogAtBuildLimit(catalog)) {
      return { valid: false, reason: `${catalog.name} is unique. The town refuses to duplicate that specific problem.` };
    }
    if (cells.some((cell) => {
      const state = this.gridCells.get(gridKey(cell.x, cell.y));
      return (state?.occupiedBy && state.occupiedBy !== movingPlace?.id) || state?.road;
    })) {
      return { valid: false, reason: 'Occupied tiles object to architecture.' };
    }
    const extraction = this.getExtractionPlacementAssessment(catalog.id, gridX, gridY, footprint);
    if (extraction && !extraction.valid) {
      return { valid: false, quality: 'bad', reason: extraction.reason, footprint, extraction };
    }
    if (catalog.roadRequired) {
      const hasRoad = this.getRoadAccessCells(gridX, gridY, footprint)
        .some((cell) => this.gridCells.get(gridKey(cell.x, cell.y))?.road);
      if (!hasRoad) return { valid: false, reason: 'Needs an adjacent road. Heroes dislike conceptual access.' };
    }
    const baseCost = movingPlace
      ? this.getMoveBuildingCost(movingPlace)
      : this.getEffectiveBuildCost(catalog, gridX, gridY, footprint);
    const outsideTerritory = !movingPlace && baseCost > catalog.cost;
    return {
      valid: this.resources.gold >= baseCost,
      reason: this.resources.gold >= baseCost
        ? (outsideTerritory ? 'Frontier build: costs extra without nearby territory. An Outpost fixes that.' : '')
        : 'Not enough gold. The accountant recommends another road to nowhere.',
      cost: baseCost,
      footprint,
      outsideTerritory,
      quality: extraction?.quality || (outsideTerritory ? 'warning' : 'good'),
      extraction,
    };
  }

  // buildings placed outside supported territory cost more; the frontier
  // toolkit (camps/storehouse/outpost) is exempt so you can bootstrap out there
  getEffectiveBuildCost(catalog, gridX, gridY, footprint = { w: 2, h: 2 }) {
    const base = catalog.cost;
    const exempt = EXTRACTION_IDS.includes(catalog.id) || catalog.id === 'storehouse' || catalog.id === 'frontier_outpost';
    if (exempt) return base;
    const centerX = gridX + footprint.w / 2;
    const centerY = gridY + footprint.h / 2;
    if (this.isInTerritory(centerX, centerY)) return base;
    return Math.round(base * FRONTIER_BUILD_SURCHARGE);
  }

  updateBuildPreview(worldX, worldY) {
    if (!this.buildMode || !this.buildPreviewGraphics) return;
    const cell = this.worldToBuildGrid(worldX, worldY);
    if (this.buildPreviewCell?.x === cell.x && this.buildPreviewCell?.y === cell.y) return;
    this.buildPreviewCell = cell;
    const result = this.validateBuildPlacement(cell.x, cell.y);
    const footprint = result.footprint || this.getBuildFootprint();
    const anchor = this.gridToVisual(cell.x, cell.y, footprint);
    // delete mode highlights in amber: a valid target means "will remove"
    const validColor = this.buildMode.kind === 'delete' ? 0xf6c945 : 0x7fdc93;
    this.buildPreviewGraphics.clear().setVisible(true);
    const previewColor = result.valid
      ? (result.quality === 'warning' ? 0xf6c945 : validColor)
      : 0xf0938f;
    if (this.useIsoRendering()) {
      this.drawPolygon(
        this.buildPreviewGraphics,
        this.getVisualFootprintPolygon(cell.x, cell.y, footprint),
        previewColor,
        0.26,
        previewColor,
        0.95,
        2,
      );
      for (const pos of getFootprintCells(cell.x, cell.y, footprint)) {
        this.drawPolygon(
          this.buildPreviewGraphics,
          this.getVisualTilePoints(pos.x, pos.y),
          null,
          0,
          0xfff6dc,
          0.16,
          1,
        );
      }
    } else {
      this.buildPreviewGraphics.fillStyle(previewColor, 0.28);
      this.buildPreviewGraphics.lineStyle(2, previewColor, 0.95);
      for (const pos of getFootprintCells(cell.x, cell.y, footprint)) {
        const world = gridToWorld(pos.x, pos.y);
        const left = world.x - GRID_CONFIG.tileSize / 2 + 2;
        const top = world.y - GRID_CONFIG.tileSize + 2;
        this.buildPreviewGraphics.fillRect(left, top, GRID_CONFIG.tileSize - 4, GRID_CONFIG.tileSize - 4);
        this.buildPreviewGraphics.strokeRect(left, top, GRID_CONFIG.tileSize - 4, GRID_CONFIG.tileSize - 4);
      }
    }
    if (result.extraction?.node) {
      const node = result.extraction.node;
      this.buildPreviewGraphics.lineStyle(2, previewColor, 0.9);
      this.buildPreviewGraphics.strokeEllipse(node.x, node.y - 12, 76, 38);
      this.buildPreviewGraphics.lineBetween(anchor.x, anchor.y - 8, node.x, node.y - 12);
    }

    const definition = this.getBuildModeDefinition();
    const name = definition?.name || 'Construction';
    const cost = result.cost ?? definition?.cost ?? 0;
    const costLabel = cost < 0 ? `+${-cost}g refund` : `${cost}g`;
    const view = this.getVisibleWorldRect();
    const labelX = Phaser.Math.Clamp(anchor.x, view.left + 138, view.right - 138);
    const labelY = Phaser.Math.Clamp(
      anchor.y - (this.useIsoRendering()
        ? Math.max(46, (footprint.w + footprint.h) * ISO_TILE_HEIGHT / 2 + 18)
        : footprint.h * GRID_CONFIG.tileSize + 4),
      view.top + 82,
      view.bottom - 54,
    );
    const isRoad = this.buildMode.kind === 'road';
    const planCount = isRoad ? (this.roadPlan?.size || 0) : 0;
    const hint = result.valid
      ? (this.buildMode.kind === 'delete'
        ? 'Tap to remove'
        : isRoad
          ? (result.roadUpgrade
            ? 'Tap to upgrade this road'
            : planCount
            ? `Plan: ${planCount} tiles / ${this.getRoadPlanCost()}g - Confirm to build`
            : 'Drag or tap to plan, then Confirm')
          : (result.quality === 'warning' ? `Works, but inefficient: ${result.reason}` : 'Ready to place'))
      : result.reason;
    this.buildPreviewLabel
      ?.setText(`${name} - ${costLabel}\n${hint}`)
      .setColor(result.valid ? (result.quality === 'warning' ? '#ffe08a' : '#d7f3d0') : '#ffd0cc')
      .setPosition(labelX, labelY)
      .setVisible(true);
    this.updateBuildGhost(anchor, footprint, result.valid);
    this.game.events.emit('gwg-build-mode', {
      active: true,
      kind: this.buildMode.kind,
      label: name,
      cost: isRoad ? this.getRoadPlanCost() : cost,
      footprint: isRoad ? `${planCount} tiles` : `${footprint.w}x${footprint.h}`,
      valid: result.valid,
      reason: result.reason,
      planCount,
      planCost: isRoad ? this.getRoadPlanCost() : 0,
    });
  }

  getBuildModeDefinition() {
    if (!this.buildMode) return null;
    if (this.buildMode.kind === 'road') return ROAD_TYPES[this.buildMode.id] || null;
    if (this.buildMode.kind === 'delete') {
      return { name: 'Delete Tool', cost: 0, description: 'Removes roads for a 50% refund.' };
    }
    if (this.buildMode.kind === 'move') {
      const place = this.buildingById?.[this.buildMode.id];
      const catalog = getBuildingCatalogEntry(place?.baseId || place?.id);
      return catalog ? {
        ...catalog,
        name: `Move ${place.name}`,
        assetKey: place.assetKey || catalog.assetKey,
        cost: this.getMoveBuildingCost(place),
      } : null;
    }
    const catalog = getBuildingCatalogEntry(this.buildMode.id);
    const place = this.buildingById?.[this.buildMode.id];
    return catalog ? { ...catalog, assetKey: place?.assetKey || catalog.assetKey } : null;
  }

  updateBuildGhost(anchor, footprint, valid) {
    if (!['building', 'move'].includes(this.buildMode?.kind)) {
      this.buildPreviewGhost?.setVisible(false);
      return;
    }
    const definition = this.getBuildModeDefinition();
    const textureKey = definition?.assetKey;
    if (!textureKey || !this.textures.exists(textureKey)) {
      this.buildPreviewGhost?.setVisible(false);
      return;
    }
    if (!this.buildPreviewGhost || this.buildPreviewGhost.texture.key !== textureKey) {
      this.buildPreviewGhost?.destroy();
      this.buildPreviewGhost = this.add.image(0, 0, textureKey)
        .setOrigin(0.5, 1)
        .setDepth(4855);
    }
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const targetWidth = Math.max(42, footprint.w * GRID_CONFIG.tileSize - 14);
    const targetHeight = Math.max(42, footprint.h * GRID_CONFIG.tileSize - 10);
    const scale = Math.min(
      targetWidth / Math.max(1, source?.width || targetWidth),
      targetHeight / Math.max(1, source?.height || targetHeight),
    );
    this.buildPreviewGhost
      .setPosition(anchor.x, anchor.y - 3)
      .setScale(scale)
      .setAlpha(0.5)
      .setTint(valid ? 0x9ef0ae : 0xf4a09a)
      .setVisible(true);
  }

  enterBuildMode(kind, id) {
    if (!this.isBuilderCity) {
      this.game.events.emit('gwg-event', 'Legacy towns cannot be rearranged yet. Start a new city after saving any sentimental paperwork.');
      return;
    }
    if (kind === 'road' && !ROAD_TYPES[id]) return;
    if (kind === 'building' && !getBuildingCatalogEntry(id)) return;
    if (kind === 'move' && !this.buildingById?.[id]) return;
    if (!['road', 'building', 'delete', 'move'].includes(kind)) return;
    this.clearSelection();
    this.clearWorldInteractionHover();
    this.clearRoadPlan(); // switching tools always drops any pending plan
    this.buildMode = { kind, id };
    this.buildPreviewCell = null;
    this.resetAllPlaceLabels();
    this.gridGraphics.setVisible(true);
    this.buildPreviewGraphics.setVisible(true);
    this.buildInputZone.setVisible(true).setInteractive({ useHandCursor: true });
    const definition = this.getBuildModeDefinition();
    const name = definition?.name || id;
    const cost = definition?.cost || 0;
    const footprint = this.getBuildFootprint();
    this.game.events.emit('gwg-event', `${name} selected. Choose a green grid footprint. Escape or Cancel stops construction.`);
    this.game.events.emit('gwg-build-mode', {
      active: true,
      label: name,
      cost,
      footprint: `${footprint.w}x${footprint.h}`,
    });
    this.game.events.emit('gwg-inspector-close');
  }

  cancelBuildMode() {
    if (!this.buildMode) return;
    this.clearRoadPlan();
    this.buildMode = null;
    this.buildPreviewCell = null;
    this.gridGraphics?.setVisible(false);
    this.buildPreviewGraphics?.clear().setVisible(false);
    this.buildPreviewLabel?.setVisible(false);
    this.buildPreviewGhost?.setVisible(false);
    this.buildInputZone?.disableInteractive().setVisible(false);
    this.resetAllPlaceLabels();
    this.game.events.emit('gwg-build-mode', { active: false, label: '' });
  }

  selectBuildItem(id) {
    this.buildMenuSelectedItemId = id;
    this.buildMenuSelectionByCategory[this.buildMenuCategory] = id;
    if (ROAD_TYPES[id]) this.enterBuildMode('road', id);
    else this.enterBuildMode('building', id);
  }

  previewBuildItem(id) {
    this.buildMenuSelectedItemId = id;
    this.buildMenuSelectionByCategory[this.buildMenuCategory] = id;
    if (this.activeInspector?.type === 'build' || this.activeInspector?.type === 'roads') {
      this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload(this.buildMenuCategory));
    }
  }

  tryPlaceBuildItem(gridX, gridY) {
    const result = this.validateBuildPlacement(gridX, gridY);
    if (!result.valid) {
      this.game.events.emit('gwg-event', result.reason);
      const world = this.gridTileVisualCenter(gridX, gridY);
      this.floatText(world.x, world.y - 28, 'INVALID', '#f0938f');
      return;
    }
    if (this.buildMode.kind === 'road') {
      if (result.roadUpgrade) this.upgradeRoadAt(gridX, gridY, result.targetRoadType || this.buildMode.id);
      else this.placeRoad(gridX, gridY, this.buildMode.id, result.cost);
    } else if (this.buildMode.kind === 'delete') {
      this.deleteRoadAt(gridX, gridY);
    } else if (this.buildMode.kind === 'move') {
      this.moveBuildingTo(this.buildMode.id, gridX, gridY, result.cost);
    } else {
      this.placeCatalogBuilding(gridX, gridY, this.buildMode.id, result.cost);
    }
    const world = this.gridTileVisualCenter(gridX, gridY);
    this.updateBuildPreview(world.x, world.y);
  }

  // --- road plan: drag/tap to preview, confirm to place ----------------------

  isRoadPlanCellValid(x, y) {
    if (!isInsideGrid(x, y) || !this.isRevealed(x, y)) return false;
    const cell = this.gridCells.get(gridKey(x, y));
    return Boolean(cell) && !cell.road && !cell.occupiedBy;
  }

  addRoadPlanCell(x, y) {
    if (this.buildMode?.kind !== 'road') return;
    if (!this.roadPlan) this.roadPlan = new Map();
    const key = gridKey(x, y);
    if (this.roadPlan.has(key) || !this.isRoadPlanCellValid(x, y)) return;
    this.roadPlan.set(key, { x, y });
    this.roadPaintSession?.add(key);
    this.refreshRoadPlanPreview();
  }

  toggleRoadPlanCell(x, y) {
    if (this.buildMode?.kind !== 'road') return;
    if (!this.roadPlan) this.roadPlan = new Map();
    const key = gridKey(x, y);
    if (this.roadPlan.has(key)) {
      this.roadPlan.delete(key);
    } else {
      if (!this.isRoadPlanCellValid(x, y)) {
        this.game.events.emit('gwg-event', 'That tile refuses a road. Occupied, fogged, or already paved.');
        return;
      }
      this.roadPlan.set(key, { x, y });
    }
    this.refreshRoadPlanPreview();
  }

  getRoadPlanCost() {
    const road = ROAD_TYPES[this.buildMode?.id];
    return (this.roadPlan?.size || 0) * (road?.cost || 0);
  }

  refreshRoadPlanPreview() {
    if (!this.roadPlanGraphics) this.roadPlanGraphics = this.add.graphics().setDepth(4840);
    const g = this.roadPlanGraphics;
    g.clear();
    const plan = this.roadPlan;
    if (!plan?.size || this.buildMode?.kind !== 'road') {
      this.emitBuildModeState();
      return;
    }
    for (const spot of plan.values()) {
      const valid = this.isRoadPlanCellValid(spot.x, spot.y);
      if (this.useIsoRendering()) {
        this.drawPolygon(
          g,
          this.insetPoints(this.getVisualTilePoints(spot.x, spot.y), 0.86),
          valid ? 0x7fdc93 : 0xf0938f,
          0.34,
          valid ? 0xd7f3d0 : 0xf0938f,
          0.9,
          2,
        );
      } else {
        const left = GRID_CONFIG.originX + spot.x * GRID_CONFIG.tileSize + 3;
        const top = GRID_CONFIG.originY + spot.y * GRID_CONFIG.tileSize + 3;
        g.fillStyle(valid ? 0x7fdc93 : 0xf0938f, 0.34);
        g.fillRect(left, top, GRID_CONFIG.tileSize - 6, GRID_CONFIG.tileSize - 6);
        g.lineStyle(2, valid ? 0xd7f3d0 : 0xf0938f, 0.9);
        g.strokeRect(left, top, GRID_CONFIG.tileSize - 6, GRID_CONFIG.tileSize - 6);
      }
    }
    this.emitBuildModeState();
  }

  emitBuildModeState(extra = {}) {
    if (!this.buildMode) return;
    const definition = this.getBuildModeDefinition();
    this.game.events.emit('gwg-build-mode', {
      active: true,
      kind: this.buildMode.kind,
      label: definition?.name || this.buildMode.id,
      cost: this.buildMode.kind === 'road' ? this.getRoadPlanCost() : definition?.cost || 0,
      footprint: this.buildMode.kind === 'road' ? `${this.roadPlan?.size || 0} tiles` : undefined,
      planCount: this.buildMode.kind === 'road' ? (this.roadPlan?.size || 0) : 0,
      planCost: this.buildMode.kind === 'road' ? this.getRoadPlanCost() : 0,
      ...extra,
    });
  }

  clearRoadPlan() {
    this.roadPlan?.clear();
    this.roadPaintSession = null;
    this.roadPlanGraphics?.clear();
  }

  // place every valid planned tile in one batch: one delta application, one
  // fog/terrain/road redraw, one save, one log line
  confirmRoadPlan() {
    if (this.buildMode?.kind !== 'road' || !this.roadPlan?.size) return;
    const road = ROAD_TYPES[this.buildMode.id];
    let placed = 0;
    let spent = 0;
    let ranOutOfGold = false;
    let revealedAny = 0;
    for (const spot of this.roadPlan.values()) {
      if (!this.isRoadPlanCellValid(spot.x, spot.y)) continue;
      if (this.resources.gold - spent < road.cost) {
        ranOutOfGold = true;
        break;
      }
      spent += road.cost;
      placed += 1;
      this.cityState.roads.push({ x: spot.x, y: spot.y, type: road.id });
      this.gridCells.get(gridKey(spot.x, spot.y)).road = road.id;
      const added = revealCircle(this.revealedTiles, spot.x, spot.y, FOG_REVEAL_RADIUS.road);
      for (const revealedSpot of added) {
        const cell = this.gridCells.get(gridKey(revealedSpot.x, revealedSpot.y));
        if (cell) cell.unlocked = true;
      }
      revealedAny += added.length;
    }
    if (!placed) {
      this.game.events.emit('gwg-event', ranOutOfGold
        ? 'Not enough gold for the road plan. The surveyor suggests ambition later.'
        : 'The road plan contained no valid tiles. Bold, but no.');
      this.clearRoadPlan();
      this.refreshRoadPlanPreview();
      return;
    }
    this.applyDeltas({
      gold: -spent,
      trust: (road.trust || 0) * placed,
      corruption: (road.corruption || 0) * placed,
    });
    if (revealedAny) {
      this.cityState.revealed = [...this.revealedTiles];
    }
    this.refreshWorldVisibility();
    if (revealedAny) this.redrawBuildGrid();
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    this.redrawCityRoads();
    this.clearRoadPlan();
    this.refreshRoadPlanPreview();
    const text = `${placed} ${road.name} tile${placed === 1 ? '' : 's'} placed for ${spent}g.${ranOutOfGold ? ' Gold ran out before the plan finished.' : ''}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
  }

  // delete tool entry point (docs/CITY_BUILDER_SYSTEMS_PLAN.md section 6);
  // stays active after each removal so mistakes can be cleaned in one sweep
  openDeleteTool() {
    this.enterBuildMode('delete', 'delete');
  }

  deleteRoadAt(gridX, gridY) {
    const cell = this.gridCells.get(gridKey(gridX, gridY));
    if (!cell?.road || cell.occupiedBy) return;
    const type = ROAD_TYPES[cell.road] || ROAD_TYPES.dirt;
    const refund = Math.floor(type.cost / 2);
    this.cityState.roads = this.cityState.roads.filter(
      (road) => !(road.x === gridX && road.y === gridY),
    );
    cell.road = null;
    if (refund > 0) this.applyDeltas({ gold: refund });
    // neighbor masks change, so the whole road layer re-autotiles
    this.refreshWorldVisibility();
    this.redrawCityRoads();
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    const world = this.gridTileVisualCenter(gridX, gridY);
    this.floatText(world.x, world.y - 30, refund > 0 ? `+${refund}g` : 'REMOVED', '#f6c945');

    // warn when a service building just lost its last road connection
    const orphaned = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id)?.roadRequired)
      .filter((place) => !this.getBuildingRoadAccess(place).connected)
      .map((place) => place.name);
    const text = orphaned.length
      ? `${type.name} removed. ${orphaned.join(', ')} lost road access and filed a complaint.`
      : `${type.name} removed for a ${refund}g refund. The commute mourns briefly.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
  }

  getMoveBuildingCost(place) {
    const catalog = getBuildingCatalogEntry(place?.baseId || place?.id);
    return Math.max(25, Math.floor((catalog?.cost || 120) * 0.15));
  }

  clearBuildingCells(place) {
    if (!place || !Number.isInteger(place.gridX) || !Number.isInteger(place.gridY)) return;
    const footprint = place.footprint || getBuildingCatalogEntry(place.baseId || place.id)?.footprint || { w: 1, h: 1 };
    for (const cellPos of getFootprintCells(place.gridX, place.gridY, footprint)) {
      const cell = this.gridCells.get(gridKey(cellPos.x, cellPos.y));
      if (cell?.occupiedBy === place.id) cell.occupiedBy = null;
    }
  }

  registerBuildingOwnedVisual(id, object) {
    if (!id || !object) return object;
    if (!this.buildingObjectsById[id]) this.buildingObjectsById[id] = [];
    object.setData?.('visualOwnerId', id);
    this.buildingObjectsById[id].push(object);
    return object;
  }

  destroyOwnedWorldObject(object) {
    if (!object) return;
    this.tweens?.killTweensOf?.(object);
    for (const child of object.list || []) this.tweens?.killTweensOf?.(child);
    object.destroy?.(true);
  }

  cleanupBuildingVisuals(id) {
    if (!id) return;
    const owned = new Set(this.buildingObjectsById?.[id] || []);
    if (this.upgradeVisualsById?.[id]) owned.add(this.upgradeVisualsById[id]);
    if (this.extractionCargoVisuals?.[id]) owned.add(this.extractionCargoVisuals[id]);
    for (const object of owned) this.destroyOwnedWorldObject(object);

    delete this.buildingObjectsById?.[id];
    delete this.placeSpriteById?.[id];
    delete this.placeLabelsById?.[id];
    for (const key of Object.keys(this.placeSpriteById || {})) {
      if (key.startsWith(`${id}:`)) delete this.placeSpriteById[key];
    }
    for (const key of Object.keys(this.placeLabelsById || {})) {
      if (key.startsWith(`${id}:`)) delete this.placeLabelsById[key];
    }
    for (const key of Object.keys(this.attachedPlacesById || {})) {
      if (key.startsWith(`${id}:`)) delete this.attachedPlacesById[key];
    }
    delete this.upgradeVisualsById?.[id];
    delete this.extractionCargoVisuals?.[id];

    this.worldInteractionTargets = (this.worldInteractionTargets || []).filter((target) => (
      target.id !== id && target.ownerId !== id && target.place?.ownerId !== id
    ));
    this.doorSpots = (this.doorSpots || []).filter((spot) => spot.id !== id && spot.ownerId !== id);
    this.doorById = Object.fromEntries((this.doorSpots || []).map((spot) => [spot.id, spot]));

    if (id === 'whale') {
      this.whaleDressingBuilt = false;
      this.coinBurst = null;
    }
    if (this.selectedPlaceId === id || String(this.selectedPlaceId || '').startsWith(`${id}:`)) {
      this.clearSelection(false);
    }
  }

  // Kept as the stable call site used by move/delete. Every building-owned
  // world object must be registered so this removes the complete old stack.
  removeBuildingVisuals(id) {
    this.cleanupBuildingVisuals(id);
  }

  startMoveBuildingFromUi(id) {
    const place = this.buildingById?.[id];
    if (!place?.isPlaced || !getBuildingCatalogEntry(place.baseId || place.id)) return;
    this.tooltipTarget = null;
    this.enterBuildMode('move', id);
  }

  moveBuildingTo(id, gridX, gridY, cost = 0) {
    const place = this.buildingById?.[id];
    const catalog = getBuildingCatalogEntry(place?.baseId || place?.id);
    if (!place?.isPlaced || !catalog) return;
    if (cost > 0) this.applyDeltas({ gold: -cost });
    this.clearBuildingCells(place);
    const placement = this.cityState.placedBuildings.find((entry) => entry.id === id);
    if (placement) {
      placement.gridX = gridX;
      placement.gridY = gridY;
    }
    occupyBuildingCells(this.gridCells, { id, gridX, gridY }, catalog.footprint);
    const position = this.gridToVisual(gridX, gridY, catalog.footprint);
    Object.assign(place, position, {
      gridX,
      gridY,
      footprint: catalog.footprint,
      isPlaced: true,
    });
    this.removeBuildingVisuals(id);
    this.clearStaticPropsInsideFootprint(gridX, gridY, catalog.footprint);
    this.renderBuilding(place);
    this.refreshUpgradeVisual(place);
    if (getBaseBuildingId(place.baseId || place.id) === 'whale') this.buildWhaleStationDressing();
    if (EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)]) {
      const baseId = getBaseBuildingId(place.baseId || place.id);
      const runtime = this.getBuildingRuntime(place.id);
      const previousNodeId = runtime.extraction?.nodeId;
      const assessment = this.getExtractionPlacementAssessment(baseId, gridX, gridY, catalog.footprint);
      runtime.extraction = normalizeExtractionRuntime(runtime.extraction, baseId);
      runtime.extraction.nodeId = assessment?.node?.id || null;
      runtime.extraction.lastStatus = runtime.extraction.assignedHeroId ? 'Ready after relocation' : 'Idle: no worker assigned';
      if (previousNodeId && previousNodeId !== runtime.extraction.nodeId) {
        const previousNode = this.getResourceNode(previousNodeId);
        if (previousNode?.assignedCampId === id) previousNode.assignedCampId = null;
      }
      if (runtime.extraction.nodeId) this.getResourceNode(runtime.extraction.nodeId).assignedCampId = id;
      this.refreshExtractionCargoVisuals();
    }
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    this.refreshWorldVisibility();
    this.cancelBuildMode();
    const text = `${place.name} moved for ${cost}g. The city planner briefly looked powerful.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.floatText(place.x, place.y - (place.h || 58) - 12, 'MOVED', '#7fdc93');
    this.saveGame(false);
    this.time.delayedCall(90, () => this.showPlaceInspector(place));
  }

  deleteBuildingFromUi(id) {
    const place = this.buildingById?.[id];
    const baseId = place?.baseId || getBaseBuildingId(id);
    const catalog = getBuildingCatalogEntry(baseId);
    if (!place?.isPlaced || !catalog) return;
    if (['guildhall', 'whale', 'dungeon'].includes(baseId)) {
      this.game.events.emit('gwg-event', `${place.name} is structurally too important to delete. The clerk hugged the blueprint.`);
      return;
    }
    if (id === baseId && this.getPlacedBuildingCount(baseId) > 1) {
      this.game.events.emit('gwg-event', `Delete extra ${catalog.name} copies before deleting the original. Bureaucracy insists on a queue.`);
      return;
    }
    const refund = Math.floor((catalog.cost || 0) * 0.45);
    const extraction = this.getBuildingRuntime(id).extraction;
    if (extraction?.assignedHeroId) this.releaseExtractionWorker(id, false);
    if (extraction?.nodeId) {
      const node = this.getResourceNode(extraction.nodeId);
      if (node?.assignedCampId === id) node.assignedCampId = null;
    }
    this.clearBuildingCells(place);
    this.cityState.placedBuildings = this.cityState.placedBuildings.filter((entry) => entry.id !== id);
    this.removeBuildingVisuals(id);
    if (id === baseId) {
      place.isPlaced = false;
    } else {
      this.buildings = this.buildings.filter((entry) => entry.id !== id);
      delete this.buildingById[id];
      delete this.placeById[id];
    }
    delete this.cityState.buildingRuntime[id];
    this.extractionCargoVisuals?.[id]?.destroy?.(true);
    delete this.extractionCargoVisuals?.[id];
    delete this.upgradeLevels[id];
    if (refund > 0) this.applyDeltas({ gold: refund });
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    this.refreshWorldVisibility();
    const text = `${place.name} demolished for ${refund}g refund. The foundation denied emotional attachment.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.game.events.emit('gwg-inspector-close');
    this.clearSelection(false);
    this.saveGame(false);
  }

  placeRoad(gridX, gridY, typeId, cost) {
    const road = ROAD_TYPES[typeId];
    this.applyDeltas({
      gold: -cost,
      trust: road.trust || 0,
      corruption: road.corruption || 0,
    });
    this.cityState.roads.push({ x: gridX, y: gridY, type: typeId });
    this.gridCells.get(gridKey(gridX, gridY)).road = typeId;
    this.revealArea(gridX, gridY, FOG_REVEAL_RADIUS.road);
    this.refreshWorldVisibility();
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    this.redrawCityRoads();
    const world = this.gridTileVisualCenter(gridX, gridY);
    this.floatText(world.x, world.y - 30, `-${cost}g`, '#f6c945');
    const text = `${road.name} placed. Access has become ${typeId === 'premium' ? 'a luxury texture' : 'slightly less theoretical'}.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
  }

  upgradeRoadAt(gridX, gridY, targetTypeId = null) {
    const upgrade = this.getRoadUpgradeInfo(gridX, gridY, targetTypeId);
    if (!upgrade.road || !upgrade.target) {
      this.game.events.emit('gwg-event', upgrade.reason || 'That road cannot be upgraded. It has achieved pavement enlightenment.');
      return false;
    }
    if (!upgrade.valid) {
      const world = this.gridTileVisualCenter(gridX, gridY);
      this.floatText(world.x, world.y - 30, 'NO GOLD', '#f0938f');
      this.game.events.emit('gwg-event', upgrade.reason);
      return false;
    }
    const previousName = upgrade.current.name;
    upgrade.road.type = upgrade.target.id;
    const cell = this.gridCells.get(gridKey(gridX, gridY));
    if (cell) cell.road = upgrade.target.id;
    this.applyDeltas({
      gold: -upgrade.cost,
      trust: upgrade.target.trust || 0,
      corruption: upgrade.target.corruption || 0,
    });
    this.redrawCityRoads();
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    const world = this.gridTileVisualCenter(gridX, gridY);
    this.floatText(world.x, world.y - 30, upgrade.target.name.toUpperCase(), upgrade.target.id === 'premium' ? '#ffe08a' : '#d7f3d0');
    const text = `${previousName} upgraded to ${upgrade.target.name} for ${upgrade.cost}g.${upgrade.target.id === 'premium' ? ' The commute got faster and ethics got shinier.' : ''}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.stats.roadUpgrades = (this.stats.roadUpgrades || 0) + 1;
    this.checkObjectives();
    this.publishTownHint();
    this.saveGame(false);
    if (this.activeInspector?.type === 'road') this.showRoadInspector(gridX, gridY);
    else this.refreshActivePanel();
    return true;
  }

  upgradeRoadFromUi(token) {
    const [x, y, targetType] = String(token || '').split(':');
    const gridX = Number(x);
    const gridY = Number(y);
    if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) return;
    this.upgradeRoadAt(gridX, gridY, targetType || null);
  }

  placeCatalogBuilding(gridX, gridY, id, cost) {
    const catalog = getBuildingCatalogEntry(id);
    const baseBuilding = this.buildingById[id] || this.buildings.find((entry) => (entry.baseId || entry.id) === id);
    if (!catalog || !baseBuilding) return;
    const existingCount = this.getPlacedBuildingCount(id);
    const instanceId = this.getNextBuildingInstanceId(id);
    const building = instanceId === id
      ? baseBuilding
      : {
        ...baseBuilding,
        id: instanceId,
        baseId: id,
        name: `${baseBuilding.name} ${existingCount + 1}`,
        isPlaced: false,
      };
    if (instanceId !== id) {
      this.buildings.push(building);
      this.buildingById[instanceId] = building;
    }
    this.applyDeltas({ gold: -cost });
    const placement = { id: instanceId, baseId: id, copyIndex: existingCount + 1, gridX, gridY };
    this.cityState.placedBuildings.push(placement);
    occupyBuildingCells(this.gridCells, placement, catalog.footprint);
    this.revealArea(
      gridX + catalog.footprint.w / 2,
      gridY + catalog.footprint.h / 2,
      id === 'watchtower' ? FOG_REVEAL_RADIUS.watchtower : FOG_REVEAL_RADIUS.building,
      id === 'watchtower' ? 'The new watchtower' : '',
    );
    this.refreshWorldVisibility();
    const position = this.gridToVisual(gridX, gridY, catalog.footprint);
    Object.assign(building, position, {
      gridX,
      gridY,
      footprint: catalog.footprint,
      isPlaced: true,
      baseId: id,
    });
    this.clearStaticPropsInsideFootprint(gridX, gridY, catalog.footprint);
    this.renderBuilding(building);
    this.redrawTerrainDetails();
    this.redrawTerrainVariety();
    this.redrawWildernessDressing();
    this.doorById[building.id] = this.getDoorSpotForPlace(building);
    this.placeById[building.id] = building;
    const runtime = this.getBuildingRuntime(building.id);
    if (EXTRACTION_BUILDINGS[id]) {
      const assessment = this.getExtractionPlacementAssessment(id, gridX, gridY, catalog.footprint);
      runtime.extraction = normalizeExtractionRuntime(runtime.extraction, id);
      runtime.extraction.nodeId = assessment?.node?.id || null;
      runtime.extraction.lastStatus = 'Idle: no worker assigned';
      if (assessment?.node) {
        const node = this.getResourceNode(assessment.node.id);
        if (!node.assignedCampId) node.assignedCampId = building.id;
      }
      this.stats.extractionCampsBuilt = (this.stats.extractionCampsBuilt || 0) + 1;
      this.refreshExtractionCargoVisuals();
      this.checkObjectives();
    }
    this.refreshUpgradeVisual(building);
    if (id === 'whale') this.buildWhaleStationDressing();
    const text = `${building.name} built. ${catalog.kind === 'shady' ? 'The permits arrived pre-corrupted.' : 'Infrastructure briefly resembles hope.'}`;
    this.floatText(building.x, building.y - building.h - 12, 'BUILT', '#7fdc93');
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, id === 'whale' ? 'golden_whale' : 'upgrade');
    this.saveGame(false);
    this.cancelBuildMode();
    this.time.delayedCall(90, () => this.showPlaceInspector(building));
  }

  getAssetPreviewUrl(assetKey) {
    if (!assetKey || !this.textures.exists(assetKey)) return '';
    const entry = ASSET_MANIFEST.find((asset) => asset.key === assetKey);
    return entry ? new URL(entry.path, document.baseURI).toString() : '';
  }

  getBuildMenuLocationRows(categoryId) {
    const idsByCategory = {
      premium: [
        'vip_rope_entrance',
        'debt_collector_booth',
        'refund_denial_desk',
        'ethics_fountain',
        'premium_temple',
      ],
      social: ['complaint_barrel', 'balance_memorial', 'hero_union_tent', 'patch_notes_shrine'],
    };
    return (idsByCategory[categoryId] || [])
      .map((id) => this.decorationById?.[id])
      .filter(Boolean)
      .map((place) => ({
        id: place.id,
        itemType: 'location',
        title: place.name,
        costLabel: 'Town unlock',
        stateLabel: this.isLocationUnlocked(place.id) ? 'ON MAP' : 'LOCKED',
        kind: this.getPlaceKind(place),
        preview: this.getAssetPreviewUrl(place.assetKey),
        description: place.description || 'A municipal object with a suspiciously specific purpose.',
        footprintLabel: 'Town location',
        roadLabel: 'Placed by unlock',
        effect: place.effect || 'Affects the town when unlocked.',
        flavor: place.tooltipLines?.[0] || '',
        status: this.isLocationUnlocked(place.id)
          ? 'Unlocked and visible on the map.'
          : this.getLockReason(place.id),
        state: this.isLocationUnlocked(place.id) ? 'built' : 'locked',
        actions: [{
          label: this.isLocationUnlocked(place.id) ? 'Unlocked on Map' : 'Town Unlock',
          event: 'gwg-select-build',
          id: place.id,
          disabled: true,
        }],
      }));
  }

  getBuildMenuDecorationRows() {
    const decorations = [
      ['Trees', 'prop_tree', 'Grounded edge greenery; non-blocking town dressing.'],
      ['Rocks', 'prop_rock', 'Small terrain anchors with compact shadows.'],
      ['Fences', 'prop_fence', 'Tile-edge boundaries for future district editing.'],
      ['Lamps', 'prop_lamp', 'Roadside light without premium illumination fees.'],
      ['Benches', 'object_bench', 'Public seating, pending monetization review.'],
      ['Barrels', 'prop_barrel', 'Storage and approved complaint-adjacent furniture.'],
      ['Crates', 'prop_crate', 'Market clutter with a municipal permit.'],
      ['Signs', 'prop_signpost', 'Directions for heroes who reject conceptual access.'],
      ['Wells', 'object_well', 'Fresh water with no hydration subscription.'],
      ['Carts', 'object_cart', 'Logistics props awaiting a logistics economy.'],
      ['Statues', 'object_statue', 'Civic pride cast in affordable stone.'],
      ['Campfires', 'object_campfire', 'Ambient warmth for heroes between paychecks.'],
      ['Market Stalls', 'object_market_stall', 'Pop-up commerce with pop-up ethics.'],
      ['Premium Lamps', 'object_lamp_premium', 'Street lighting for the gilded district.'],
      ['Braziers', 'object_brazier', 'Watch post lighting that doubles as drama.'],
      ['Rope Barriers', 'object_rope_barrier', 'Soft security for hard exclusivity.'],
    ];
    return decorations.map(([title, assetKey, description]) => ({
      id: assetKey,
      itemType: 'decoration',
      title,
      costLabel: 'District dressing',
      stateLabel: 'PLACED',
      preview: this.getAssetPreviewUrl(assetKey),
      description,
      footprintLabel: 'Non-blocking',
      roadLabel: 'District dressing',
      effect: 'Improves visual district identity.',
      flavor: 'Procurement currently places these with restrained confidence.',
      status: 'Automatic district dressing.',
      state: 'built',
      actions: [{
        label: 'Automatic',
        event: 'gwg-select-build',
        id: assetKey,
        disabled: true,
      }],
    }));
  }

  getBuildMenuPayload(categoryId = this.buildMenuCategory || 'core') {
    const category = BUILD_MENU_CATEGORIES.find((entry) => entry.id === categoryId)
      || BUILD_MENU_CATEGORIES[1];
    this.buildMenuCategory = category.id;
    const roadRows = Object.values(ROAD_TYPES).map((road) => ({
      id: road.id,
      itemType: 'road',
      title: road.name,
      cost: road.cost,
      costLabel: `${road.cost}g / tile`,
      stateLabel: this.resources.gold >= road.cost ? 'READY' : 'SHORT',
      kind: road.id === 'premium' ? 'shady' : 'fair',
      preview: this.getAssetPreviewUrl(`road_mask_${road.id}_5`),
      swatch: `#${road.color.toString(16).padStart(6, '0')}`,
      description: road.description,
      footprintLabel: '1x1',
      roadLabel: 'Creates access',
      effect: `Movement speed x${road.speed}.`,
      flavor: road.id === 'premium'
        ? 'Public infrastructure, now with a velvet price point.'
        : 'Connects services to heroes with somewhere regrettable to be.',
      status: this.resources.gold >= road.cost ? 'Affordable and ready to place.' : `Need ${road.cost} gold per tile.`,
      state: this.resources.gold >= road.cost ? 'affordable' : 'unaffordable',
      actions: [{
        label: this.resources.gold >= road.cost ? 'Select Road' : `Need ${road.cost}g`,
        event: 'gwg-select-build',
        id: road.id,
        disabled: this.resources.gold < road.cost,
      }],
    }));
    const buildingRows = category.buildingIds
      .map((id) => getBuildingCatalogEntry(id))
      .filter(Boolean)
      .map((catalog) => {
      const place = this.buildingById?.[catalog.id];
      const role = getBuildingRole(catalog.id);
      const builtCount = this.getPlacedBuildingCount(catalog.id);
      const uniqueBuilt = this.isCatalogAtBuildLimit(catalog);
      const lockReason = this.getCatalogLockReason(catalog);
      const locked = Boolean(lockReason);
      const affordable = this.resources.gold >= catalog.cost;
      const state = uniqueBuilt ? 'built' : locked ? 'locked' : affordable ? 'affordable' : 'unaffordable';
      const demand = this.getBuildingDemandHint(catalog.id, builtCount > 0);
      const maxCount = Number(catalog.maxCount ?? 99);
      const countLabel = Number.isFinite(maxCount) && maxCount < 99
        ? `${builtCount}/${maxCount}`
        : `${builtCount} built`;
      const previewKey = this.textures.exists(catalog.previewAssetKey)
        ? catalog.previewAssetKey
        : (place?.assetKey || catalog.assetKey);
      return {
        id: catalog.id,
        itemType: 'building',
        title: catalog.name || place?.name || catalog.id,
        cost: catalog.cost,
        costLabel: `${catalog.cost}g`,
        stateLabel: uniqueBuilt ? 'BUILT' : locked ? 'LOCKED' : affordable ? 'READY' : 'SHORT',
        kind: catalog.kind === 'shady' ? 'shady' : 'fair',
        preview: this.getAssetPreviewUrl(previewKey),
        description: catalog.description,
        footprintLabel: `${catalog.footprint.w}x${catalog.footprint.h}`,
        roadLabel: catalog.roadRequired ? 'Adjacent required' : 'Independent',
        effect: role
          ? `${role.type}: ${role.provides.slice(0, 2).join(', ') || catalog.effect}`
          : catalog.effect,
        flavor: role?.repeatValue || catalog.flavor || place?.upgradeFlavor || '',
        status: [
          demand,
          builtCount > 0
            ? `Current count: ${countLabel}. ${role?.repeatValue || 'More local coverage can still matter.'}`
            : '',
          uniqueBuilt
            ? 'Unique landmark already built.'
            : locked
              ? lockReason
              : affordable
                ? 'Affordable and ready to place.'
                : `Need ${catalog.cost} gold. The accountant remains unhelpful.`,
        ].filter(Boolean).join(' '),
        state,
        actions: [{
          label: uniqueBuilt ? 'BUILT' : (locked ? 'Locked' : (affordable ? 'Select Building' : `Need ${catalog.cost}g`)),
          event: 'gwg-select-build',
          id: catalog.id,
          disabled: uniqueBuilt || locked || !affordable,
        }],
      };
    });
    const rows = category.id === 'roads'
      ? roadRows
      : [...buildingRows, ...this.getBuildMenuLocationRows(category.id)];
    if (category.informational) {
      rows.push(...this.getBuildMenuDecorationRows());
    }
    if (!rows.some((row) => row.id === this.buildMenuSelectedItemId)) {
      this.buildMenuSelectedItemId = this.buildMenuSelectionByCategory[category.id] || rows[0]?.id || null;
      if (!rows.some((row) => row.id === this.buildMenuSelectedItemId)) {
        this.buildMenuSelectedItemId = rows[0]?.id || null;
      }
    }
    this.buildMenuSelectionByCategory[category.id] = this.buildMenuSelectedItemId;
    for (const row of rows) row.selected = row.id === this.buildMenuSelectedItemId;
    const detail = rows.find((row) => row.selected) || null;
    return {
      panelType: 'build-catalog',
      title: 'Build Menu',
      subtitle: `${this.resources.gold}g available - ${category.label}`,
      catalog: {
        categoryId: category.id,
        label: category.label,
        description: category.description,
      },
      tabs: BUILD_MENU_CATEGORIES.map((entry) => ({
        id: entry.id,
        label: entry.label,
        icon: this.getAssetPreviewUrl(BUILD_TAB_ICON_KEYS[entry.id] || ''),
        count: entry.id === 'roads'
          ? Object.keys(ROAD_TYPES).length
          : entry.id === 'decorations'
            ? entry.buildingIds.length + this.getBuildMenuDecorationRows().length
            : entry.buildingIds.length + this.getBuildMenuLocationRows(entry.id).length,
        event: 'gwg-build-category',
        active: entry.id === category.id,
      })),
      rows,
      detail,
      actions: [
        ...this.getExpansionActions(),
        { label: 'Delete Tool', event: 'gwg-open-delete' },
        { label: 'Cancel Build Mode', event: 'gwg-cancel-build' },
      ],
    };
  }

  openBuildMenu() {
    this.activeInspector = { type: 'build', category: this.buildMenuCategory || 'core' };
    this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload(this.activeInspector.category));
  }

  openRoadMenu() {
    this.buildMenuCategory = 'roads';
    this.activeInspector = { type: 'roads', category: 'roads' };
    this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload('roads'));
  }

  selectBuildCategory(categoryId) {
    if (!BUILD_MENU_CATEGORIES.some((entry) => entry.id === categoryId)) return;
    this.buildMenuCategory = categoryId;
    this.buildMenuSelectedItemId = this.buildMenuSelectionByCategory[categoryId] || null;
    this.activeInspector = { type: 'build', category: categoryId };
    this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload(categoryId));
  }

  // expansion is exploration now: the build menu explains how the fog lifts
  // instead of selling a rectangle
  getExpansionActions() {
    const fogged = this.getFogFrontierCells(false).length;
    if (!fogged) return [];
    return [{
      label: 'Fog: roads, watchtowers & heroes reveal land',
      event: 'gwg-cancel-build',
      disabled: true,
    }];
  }

  // legacy event kept so old UI paths do something sensible
  expandLand() {
    this.game.events.emit(
      'gwg-event',
      'Land is no longer for sale. Explore: roads, watchtowers, and heroes lift the fog.',
    );
  }

  stampPath(g, x1, y1, x2, y2, radius = 10) {
    // Clean strokes keep the road intentional without needing a full tilemap yet.
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    g.lineStyle(radius * 2.05, 0xbf9a61, 0.32);
    g.beginPath();
    g.moveTo(x1, y1 + 1);
    g.lineTo(x2, y2 + 1);
    g.strokePath();
    g.lineStyle(radius * 1.58, 0xd9bc85, 0.96);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();

    const steps = Math.max(1, Math.ceil(dist / Math.max(18, radius * 1.25)));
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const jitter = Math.max(1, Math.floor(radius * 0.35));
      const x = Phaser.Math.Linear(x1, x2, t) + Phaser.Math.Between(-jitter, jitter);
      const y = Phaser.Math.Linear(y1, y2, t) + Phaser.Math.Between(-jitter, jitter);
      g.fillStyle(Math.random() < 0.55 ? 0xf0d49a : 0xa98252, 0.34);
      g.fillCircle(x, y, Math.max(2, radius * 0.14));
    }
  }

  getDoorSpotForPlace(place) {
    if (!place) return { id: 'plaza-center', x: PLAZA.x, y: PLAZA.y };
    if (this.useIsoRendering() && this.buildingById?.[place.id] && Number.isInteger(place.gridX) && Number.isInteger(place.gridY)) {
      const metrics = getBuildingFootprintMetrics(place, ISO_RENDER_OPTIONS);
      const entrance = getBuildingEntranceAnchor(metrics);
      return {
        id: place.id,
        x: place.doorX ?? entrance.x,
        y: place.doorY ?? entrance.y,
      };
    }
    const offset = place.doorOffsetY ?? (place.id === 'whale' ? 44 : 18);
    return {
      id: place.id,
      x: place.doorX ?? place.x,
      y: place.doorY ?? place.y + offset,
    };
  }

  getPlaceLabelText(place, includeLevel = false) {
    const base = place.shortLabel || place.name || place.id;
    if (!includeLevel || place?.mapPoint) return base;
    const level = this.getPlaceLevel?.(place) || 1;
    return level > 1 ? `${base}\nLv ${level}` : base;
  }

  isCompactView() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 760px)').matches
      || (this.sys.game.device.input.touch && window.innerWidth < 900);
  }

  getPlaceLabelPriority(place) {
    if (!place) return 5;
    if (PRIMARY_LABEL_IDS.has(place.id)) return 1;
    if (this.buildingById?.[place.id]) return 2;
    if (place.interactive) return 3;
    return 5;
  }

  getDefaultPlaceLabelAlpha(place) {
    if (place?.mapPoint) return 0;
    const priority = this.getPlaceLabelPriority(place);
    if (this.buildMode && priority <= 3 && this.isLocationUnlocked(place.id)) {
      return priority <= 1 ? 0.72 : 0.46;
    }
    if (priority <= 1) return this.isCompactView() ? 0.38 : 0.52;
    if (priority === 2) {
      if (this.useIsoRendering()) return 0;
      return this.isCompactView() ? 0.42 : 0.58;
    }
    if (priority === 3) {
      const visibleIds = this.isCompactView() ? COMPACT_SPECIAL_LABEL_IDS : DEFAULT_SPECIAL_LABEL_IDS;
      return visibleIds.has(place.id) && this.isLocationUnlocked(place.id) ? 0.54 : 0;
    }
    return 0;
  }

  showPlaceLabel(place, alpha = 1) {
    const label = this.placeLabelsById?.[place?.id];
    if (!label) return;
    label.setText(this.getPlaceLabelText(place, true));
    label.setAlpha(alpha);
    label.setDepth(4700);
  }

  resetPlaceLabel(place) {
    const label = this.placeLabelsById?.[place?.id];
    if (!label) return;
    label.setText(this.getPlaceLabelText(place, this.buildMode && this.getPlaceLabelPriority(place) <= 3));
    label.setAlpha(this.getDefaultPlaceLabelAlpha(place));
    label.setDepth(2000);
  }

  resetAllPlaceLabels() {
    for (const place of Object.values(this.placeById || {})) this.resetPlaceLabel(place);
    for (const place of Object.values(this.attachedPlacesById || {})) this.resetPlaceLabel(place);
  }

  addPlaceLabel(place, fontSize = LABEL_FONT_SIZE) {
    const priority = this.getPlaceLabelPriority(place);
    const label = this.add.text(
      place.x + (place.labelOffsetX || 0),
      place.y + (place.labelOffsetY ?? 4),
      this.getPlaceLabelText(place),
      {
        fontFamily: '"Courier New", monospace',
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color: place.id === 'whale' ? '#ffe08a' : '#fff6dc',
        stroke: '#0c1118',
        strokeThickness: 2,
        backgroundColor: priority <= 2 ? '#0f1521c4' : '#0f152199',
        padding: { x: priority <= 2 ? 4 : 3, y: 2 },
        align: 'center',
        wordWrap: { width: place.labelWidth || Math.max(priority <= 2 ? 82 : 74, (place.w || 80) + 20) },
      },
    ).setOrigin(0.5, 0).setDepth(2000);
    label.setMaxLines(2);
    label.setData('isPlaceLabel', true);
    label.setData('placeId', place.id);
    label.setAlpha(this.getDefaultPlaceLabelAlpha(place));
    return label;
  }

  getTextureScaleForBox(textureKey, targetW, targetH, fallbackScale = 1, maxScale = 1.15) {
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    if (!source?.width || !source?.height || !targetW || !targetH) return fallbackScale;
    const fitScale = Math.min(targetW / source.width, targetH / source.height);
    return Phaser.Math.Clamp(fitScale, 0.18, maxScale);
  }

  getPlaceSpriteScale(place, textureKey, fallbackScale = 1) {
    if (place.fitToFootprint === false) return fallbackScale;
    if (this.useIsoRendering() && this.buildingById?.[place.id]) {
      const source = this.textures.get(textureKey)?.getSourceImage?.();
      const metrics = getBuildingFootprintMetrics(place, ISO_RENDER_OPTIONS);
      return getBuildingSpriteScale(
        source?.width,
        source?.height,
        metrics,
        place.maxVisualScale ?? 1.12,
      );
    }
    return this.getTextureScaleForBox(
      textureKey,
      place.w,
      place.h,
      fallbackScale,
      place.maxVisualScale ?? 1.1,
    );
  }

  createPlaceHitZone(place, img, onSelect) {
    const isBuilding = Boolean(this.buildingById?.[place.id]);
    const isSmallSign = getBaseBuildingId(place.baseId || place.id) === 'roadside_ad_board';
    const visualWidth = img?.displayWidth || place.w || 64;
    const visualHeight = img?.displayHeight || place.h || 52;
    const metrics = isBuilding && this.useIsoRendering()
      ? getBuildingFootprintMetrics(place, ISO_RENDER_OPTIONS)
      : null;
    const groundPolygon = metrics ? getBuildingHitPolygon(metrics) : null;
    const hitPolygon = groundPolygon ? new Phaser.Geom.Polygon(groundPolygon) : null;
    const width = metrics?.projectedWidth * 0.86 || place.interactionW || Math.max(
      isSmallSign ? 34 : isBuilding ? 48 : 34,
      Math.min(place.w || visualWidth, visualWidth) * (isBuilding ? 0.68 : 0.78),
    );
    const height = metrics
      ? Math.max(metrics.projectedDepth * 0.78, Math.min(visualHeight * 0.62, metrics.targetHeight * 0.54))
      : place.interactionH || Math.max(
      isSmallSign ? 28 : isBuilding ? 42 : 30,
      Math.min(place.h || visualHeight, visualHeight) * (isBuilding ? 0.58 : 0.74),
    );
    const centerY = metrics
      ? place.y - height * 0.48
      : place.y - (place.h || visualHeight || 52) * (isBuilding ? 0.36 : 0.44) + (place.interactionOffsetY || 0);
    const hit = this.add.rectangle(place.x, centerY, width, height, 0xffffff, 0.001)
      .setOrigin(0.5)
      .setDepth((place.y || 0) + 8)
      .setInteractive({ useHandCursor: true });

    const hoverIn = () => {
      if (img?.setTint) img.setTint(this.isLocationUnlocked(place.id) ? 0xfff3c0 : 0x9aa3b5);
      this.showPlaceLabel(place);
      if (img && this.tweens) {
        const restX = img.getData('restScaleX') || img.getData('baseScaleX') || 1;
        const restY = img.getData('restScaleY') || img.getData('baseScaleY') || 1;
        this.tweens.add({ targets: img, scaleX: restX * 1.035, scaleY: restY * 1.035, duration: 90 });
      }
    };
    const hoverOut = () => {
      if (img?.clearTint && this.isLocationUnlocked(place.id)) img.clearTint();
      else if (img?.setTint) img.setTint(0x6f7787);
      if (this.selectedPlaceId !== place.id) this.resetPlaceLabel(place);
      if (img && this.tweens) {
        this.tweens.add({
          targets: img,
          scaleX: img.getData('restScaleX') || img.getData('baseScaleX') || 1,
          scaleY: img.getData('restScaleY') || img.getData('baseScaleY') || 1,
          duration: 90,
        });
      }
    };
    this.registerWorldInteractionTarget({
      id: place.id,
      ownerId: place.ownerId || (isBuilding ? place.id : null),
      type: isBuilding ? 'building' : 'decoration',
      place,
      hit,
      img,
      width,
      height,
      groundPolygon,
      containsPoint: metrics ? (worldX, worldY) => {
        const inGround = Phaser.Geom.Polygon.Contains(hitPolygon, worldX, worldY);
        const upperLeft = place.x - width * 0.35;
        const upperTop = place.y - Math.min(visualHeight * 0.82, metrics.targetHeight * 0.78);
        return inGround || (
          worldX >= upperLeft
          && worldX <= upperLeft + width * 0.7
          && worldY >= upperTop
          && worldY <= place.y - metrics.projectedDepth * 0.12
        );
      } : null,
      getCenter: () => ({ x: place.x, y: centerY }),
      onHoverIn: hoverIn,
      onHoverOut: hoverOut,
      onSelect: () => onSelect?.(place),
    });
    hit.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.selectWorldInteractionTarget(pointer);
    });
    this.applyInteractionDebugStyle(hit, isBuilding ? 0x7fdc93 : 0xc99aec);
    return hit;
  }

  applyInteractionDebugStyle(hit, color) {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    if (!new URLSearchParams(window.location.search).has('hitboxes')) return;
    hit.setFillStyle?.(color, 0.16);
    hit.setStrokeStyle?.(1, color, 0.85);
  }

  registerWorldInteractionTarget(target) {
    this.worldInteractionTargets.push(target);
    return target;
  }

  getWorldInteractionTargetAt(worldX, worldY) {
    return resolveInteractionTarget(this.worldInteractionTargets, worldX, worldY, {
      placeId: this.selectedPlaceId,
      heroId: this.selectedHeroId,
    });
  }

  updateWorldInteractionHover(pointer) {
    if (!pointer || this.cameraDrag?.moved) return;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = this.getWorldInteractionTargetAt(world.x, world.y);
    if (target === this.hoveredWorldTarget) return;
    this.hoveredWorldTarget?.onHoverOut?.();
    this.hoveredWorldTarget = target;
    this.hoveredWorldTarget?.onHoverIn?.();
  }

  clearWorldInteractionHover() {
    this.hoveredWorldTarget?.onHoverOut?.();
    this.hoveredWorldTarget = null;
  }

  selectWorldInteractionTarget(pointer) {
    if (this.registry.get('uiPointerBlocked')) return;
    const interactionKey = `${pointer.id}:${pointer.upTime || this.time.now}`;
    if (this.lastWorldInteractionKey === interactionKey) return;
    this.lastWorldInteractionKey = interactionKey;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const target = this.getWorldInteractionTargetAt(world.x, world.y);
    target?.onSelect?.();
  }

  buildBuildings() {
    this.doorSpots = [];
    this.buildingById = Object.fromEntries(this.buildings.map((building) => [building.id, building]));
    this.buildingObjectsById = {};
    this.placeSpriteById = {};
    this.placeLabelsById = {};

    for (const b of this.buildings) {
      if (b.isPlaced) this.renderBuilding(b);
    }
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));

    if (this.isBuildingPlaced('whale')) this.buildWhaleStationDressing();
  }

  renderBuilding(b) {
    if (!b?.isPlaced || this.placeSpriteById[b.id]) return;
    this.buildingObjectsById[b.id] = [];
    const catalog = getBuildingCatalogEntry(b.id);
    const footprint = catalog?.footprint || b.footprint || { w: 1, h: 1 };
    const visualMetrics = this.useIsoRendering() && Number.isInteger(b.gridX) && Number.isInteger(b.gridY)
      ? getBuildingFootprintMetrics({ ...b, footprint }, ISO_RENDER_OPTIONS)
      : null;
    if (visualMetrics?.anchor) {
      b.x = visualMetrics.anchor.x;
      b.y = visualMetrics.anchor.y;
      b.visualMetrics = visualMetrics;
    }
    const access = this.getBuildingRoadAccess(b);
    if (this.isBuilderCity && Number.isInteger(b.gridX) && Number.isInteger(b.gridY)) {
      const polygon = this.getVisualFootprintPolygon(b.gridX, b.gridY, footprint);
      const foundation = this.add.graphics().setDepth(this.getVisualDepth(b.gridX, b.gridY) + 18);
      const shady = catalog?.kind === 'shady';
      const padColor = shady ? 0x9c7a32 : 0x8d805e;
      const trimColor = shady ? 0xf0c94a : 0xc5b58c;
      const inner = this.insetPoints(polygon, 0.88);
      const core = this.insetPoints(polygon, 0.76);
      this.drawPolygon(
        foundation,
        polygon.map((point) => ({ x: point.x, y: point.y + 5 })),
        0x162116,
        0.18,
        null,
      );
      this.drawPolygon(foundation, polygon, padColor, shady ? 0.25 : 0.2, trimColor, shady ? 0.28 : 0.2, 1);
      this.drawPolygon(foundation, inner, padColor, shady ? 0.36 : 0.29, trimColor, shady ? 0.44 : 0.32, 1);
      this.drawPolygon(foundation, core, shady ? 0xf0c94a : 0xd1bd8d, shady ? 0.12 : 0.09, null);
      foundation.fillStyle(shady ? 0xf0c94a : 0xd1bd8d, shady ? 0.16 : 0.12);
      foundation.fillEllipse(
        b.x,
        b.y - 5,
        Math.min((footprint.w + footprint.h) * ISO_TILE_WIDTH * 0.34, b.w * 0.84),
        8,
      );
      if (access.roadCell) {
        const road = this.gridTileVisualCenter(access.roadCell.x, access.roadCell.y);
        const roadX = road.x;
        const roadY = road.y;
        const doorX = b.doorX ?? b.x;
        const doorY = b.doorY ?? b.y + (b.doorOffsetY ? 4 : 2);
        const dx = roadX - doorX;
        const dy = roadY - doorY;
        const length = Math.max(1, Math.hypot(dx, dy));
        const nx = (-dy / length) * 8;
        const ny = (dx / length) * 8;
        const endX = doorX + Phaser.Math.Clamp(dx * 0.56, -42, 42);
        const endY = doorY + Phaser.Math.Clamp(dy * 0.56, -28, 28);
        foundation.fillStyle(shady ? 0xd5a63b : 0xc2aa76, shady ? 0.36 : 0.27);
        foundation.beginPath();
        foundation.moveTo(doorX - nx, doorY - ny);
        foundation.lineTo(doorX + nx, doorY + ny);
        foundation.lineTo(endX + nx * 0.72, endY + ny * 0.72);
        foundation.lineTo(endX - nx * 0.72, endY - ny * 0.72);
        foundation.closePath();
        foundation.fillPath();
        foundation.fillStyle(0xf0d9a2, 0.16);
        foundation.fillCircle((doorX + endX) / 2 - nx * 0.3, (doorY + endY) / 2 - ny * 0.3, 2);
        foundation.fillCircle((doorX + endX) / 2 + nx * 0.4, (doorY + endY) / 2 + ny * 0.4, 2);
      }
      this.buildingObjectsById[b.id].push(foundation);

      if (!access.connected) {
        const topPoint = polygon.reduce((best, point) => (point.y < best.y ? point : best), polygon[0]);
        const rightPoint = polygon.reduce((best, point) => (point.x > best.x ? point : best), polygon[0]);
        const warning = this.add.text(rightPoint.x - 6, topPoint.y + 8, '!', {
          fontFamily: '"Courier New", monospace',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#ffd0cc',
          backgroundColor: '#5b1e25dd',
          padding: { x: 4, y: 1 },
        }).setOrigin(1, 0).setDepth(this.getVisualDepth(b.gridX, b.gridY) + 34);
        this.buildingObjectsById[b.id].push(warning);
      }
    }
    const placeDepth = this.isBuilderCity && Number.isInteger(b.gridX) && Number.isInteger(b.gridY)
      ? this.getVisualDepth(b.gridX, b.gridY) + 40
      : b.y;
    const shadowWidth = Math.min(
      Math.max(38, (visualMetrics?.projectedWidth || (catalog?.footprint?.w || 2) * GRID_CONFIG.tileSize) * 0.72),
      visualMetrics?.targetWidth || b.w * 0.86,
    );
    const shadow = this.add.ellipse(b.x, b.y - 8, shadowWidth, 8, 0x10151d, 0.1).setDepth(placeDepth - 2);
    this.buildingObjectsById[b.id].push(shadow);
    const textureKey = buildingTexture(this, b);
    const img = this.add.image(b.x, b.y, textureKey)
      .setOrigin(0.5, 1)
      .setDepth(placeDepth);
    const baseScale = this.getPlaceSpriteScale(b, textureKey, b.visualScale ?? LAYOUT_CONSTANTS.BUILDING_SCALE);
    img.setScale(baseScale);
    img.setData('baseScaleX', img.scaleX);
    img.setData('baseScaleY', img.scaleY);
    img.setData('hoverScale', baseScale * 1.03);
    img.setData('footprintKey', visualMetrics?.key || 'legacy');
    this.placeSpriteById[b.id] = img;
    this.buildingObjectsById[b.id].push(img);

    const hit = this.createPlaceHitZone(b, img, () => this.showTooltip(b));
    this.buildingObjectsById[b.id].push(hit);
    const label = this.addPlaceLabel(b);
    this.placeLabelsById[b.id] = label;
    this.buildingObjectsById[b.id].push(label);
    this.doorSpots.push(this.getDoorSpotForPlace(b));
    this.doorById = Object.fromEntries(this.doorSpots.map((spot) => [spot.id, spot]));
    this.getBuildingRuntime(b.id);
    this.refreshBuildingDamageVisual(b);
    this.renderBuildingRoleAttachments(b, placeDepth);
  }

  renderBuildingRoleAttachments(place, placeDepth) {
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const attachments = BUILDING_VISUAL_ATTACHMENTS[baseId] || [];
    for (const spec of attachments) {
      const textureKey = resolveTexture(this, spec.key, spec.fallback);
      if (!textureKey || !this.textures.exists(textureKey)) continue;
      const image = this.add.image(place.x + spec.x, place.y + spec.y, textureKey)
        .setOrigin(0.5, 1)
        .setDepth(placeDepth + (spec.depthOffset || 2));
      image.setScale(this.getTextureScaleForHeight(textureKey, spec.height || 24, 0.8));
      image.setData('visualRole', 'building-attachment');
      this.registerBuildingOwnedVisual(place.id, image);
    }
  }

  buildDecorations() {
    this.decorationById = Object.fromEntries(this.decorations.map((decoration) => [decoration.id, decoration]));
    this.decorationObjectsById = {};
    for (const d of this.decorations) {
      if (!d.isPlaced) continue;
      const key = resolveTexture(this, d.assetKey, d.fallbackKey);
      if (!key) continue;

      this.decorationObjectsById[d.id] = [];
      const isTree = d.fallbackKey === 'tree';
      const isRock = d.fallbackKey === 'rock';
      const shadowWidth = isTree ? 42 : isRock ? 30 : Math.min(38, (d.w || 34) * 0.68);
      const shadowHeight = isTree ? 14 : isRock ? 9 : 11;
      const shadow = this.add.ellipse(d.x, d.y - 4, shadowWidth, shadowHeight, 0x10151d, isTree ? 0.2 : 0.15)
        .setDepth(d.y - 2);
      this.decorationObjectsById[d.id].push(shadow);
      if (isTree || isRock) {
        const groundPatch = this.add.ellipse(
          d.x,
          d.y - 3,
          shadowWidth * 1.25,
          shadowHeight * 1.35,
          isTree ? 0x4f873f : 0x7a855e,
          0.14,
        ).setDepth(d.y - 3);
        this.decorationObjectsById[d.id].push(groundPatch);
      }
      const img = this.add.image(d.x, d.y, key)
        .setOrigin(0.5, 1)
        .setDepth(d.y + (d.depthOffset || 0));
      this.placeSpriteById[d.id] = img;
      this.decorationObjectsById[d.id].push(img);

      const decorScale = d.w && d.h
        ? this.getPlaceSpriteScale(d, key, d.visualScale ?? d.scale ?? 1)
        : (d.visualScale ?? d.scale ?? 1);
      img.setScale(decorScale);
      img.setData('baseScaleX', img.scaleX);
      img.setData('baseScaleY', img.scaleY);
      img.setData('hoverScale', decorScale * 1.04);

      if (d.fallbackKey === 'tree') {
        this.tweens.add({
          targets: img,
          angle: { from: -1.2, to: 1.2 },
          duration: Phaser.Math.Between(1800, 3200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 1500),
        });
      }

      if (d.interactive) {
        const hit = this.createPlaceHitZone(d, img, () => {
          if (!this.isLocationUnlocked(d.id)) {
            this.game.events.emit('gwg-event', `${d.name} is still locked. The town has not earned that problem yet.`);
            this.floatText(d.x, d.y - (d.h || 44) - 10, 'LOCKED', '#d4dae2');
            return;
          }
          this.showTooltip(d);
        });
        this.decorationObjectsById[d.id].push(hit);
      }

      if (d.label) {
        const label = this.addPlaceLabel(d, d.labelFontSize || SMALL_LABEL_FONT_SIZE);
        this.placeLabelsById[d.id] = label;
        this.decorationObjectsById[d.id].push(label);
      }

      if (d.spot) {
        this.doorSpots.push(this.getDoorSpotForPlace(d));
      }
      this.updateDecorationLockState(d.id);
    }
  }

  buildExplorationPoints() {
    this.explorationPointById = {};
    this.explorationPointObjectsById = {};
    if (!this.isBuilderCity) return;

    for (const point of EXPLORATION_POINTS) {
      if (!isInsideGrid(point.gridX, point.gridY)) continue;
      const position = this.gridToVisual(point.gridX, point.gridY, { w: 1, h: 1 });
      const place = {
        ...point,
        ...position,
        w: point.w || 48,
        h: point.h || 44,
        footprint: { w: 1, h: 1 },
        isPlaced: true,
        mapPoint: true,
        shortLabel: point.shortLabel || point.name,
        labelOffsetY: point.labelOffsetY ?? 2,
      };
      this.explorationPointById[place.id] = place;
      this.explorationPointObjectsById[place.id] = [];

      const depth = this.getVisualDepth(place.gridX, place.gridY) + 26;
      const base = this.add.graphics().setDepth(depth - 3);
      const resourceYield = POI_RESOURCE_YIELDS[place.id];
      this.drawPolygon(
        base,
        this.insetPoints(this.getVisualTilePoints(place.gridX, place.gridY), 0.62),
        resourceYield ? 0x274f3a : 0x243241,
        resourceYield ? 0.5 : 0.36,
        resourceYield ? 0x9ee6aa : 0xfff6dc,
        resourceYield ? 0.42 : 0.12,
        1,
      );
      this.explorationPointObjectsById[place.id].push(base);

      const key = resolveTexture(this, place.assetKey, place.fallbackKey || 'rock');
      const img = this.add.image(place.x, place.y - 2, key)
        .setOrigin(0.5, 1)
        .setDepth(depth);
      const scale = this.getTextureScaleForBox(key, place.w, place.h, point.scale || 0.7, point.maxVisualScale || 0.82);
      img.setScale(scale);
      img.setData('baseScaleX', img.scaleX);
      img.setData('baseScaleY', img.scaleY);
      img.setData('restScaleX', img.scaleX);
      img.setData('restScaleY', img.scaleY);
      this.placeSpriteById[place.id] = img;
      this.explorationPointObjectsById[place.id].push(img);

      const hit = this.createPlaceHitZone(place, img, () => this.showTooltip(place));
      this.explorationPointObjectsById[place.id].push(hit);

      const label = this.addPlaceLabel(place, SMALL_LABEL_FONT_SIZE);
      this.placeLabelsById[place.id] = label;
      this.explorationPointObjectsById[place.id].push(label);
      if (resourceYield) {
        const badge = this.add.text(place.x, place.y - (place.h || 44) - 14, resourceYield.resource.toUpperCase(), {
          fontFamily: '"Courier New", monospace',
          fontSize: '9px',
          fontStyle: 'bold',
          color: '#d7f3d0',
          stroke: '#0c1118',
          strokeThickness: 2,
          backgroundColor: '#173324dd',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 1).setDepth(depth + 3);
        this.explorationPointObjectsById[place.id].push(badge);
      }
    }
    this.updateExplorationPointVisibility();
  }

  updateExplorationPointVisibility() {
    if (!this.explorationPointObjectsById) return;
    const activeSet = this.getActiveVisibilitySet();
    for (const point of Object.values(this.explorationPointById || {})) {
      const revealed = this.isRevealed(point.gridX, point.gridY);
      if (revealed && !this.discoveredPois?.has(point.id)) {
        this.discoveredPois?.add(point.id);
        if (this.isResourceNode(point)) {
          this.stats.resourceNodesDiscovered = (this.stats.resourceNodesDiscovered || 0) + 1;
        }
      }
      const active = activeSet.has(gridKey(point.gridX, point.gridY));
      for (const obj of this.explorationPointObjectsById[point.id] || []) {
        obj.setVisible?.(revealed);
        if (obj.getData?.('isPlaceLabel')) {
          obj.setAlpha(revealed ? (active ? 0.68 : 0.34) : 0);
        } else if (obj.setAlpha) {
          obj.setAlpha(revealed ? (active ? 1 : 0.58) : 0);
        }
      }
    }
  }

  updateDecorationLockState(id) {
    const objects = this.decorationObjectsById?.[id];
    if (!objects) return;
    const unlocked = this.isLocationUnlocked(id);
    const place = this.decorationById?.[id];
    for (const obj of objects) {
      if (obj.getData?.('isPlaceLabel')) {
        obj.setAlpha(unlocked ? this.getDefaultPlaceLabelAlpha(place) : 0);
      } else {
        obj.setAlpha(unlocked ? 1 : 0.34);
      }
      if (obj.setTint) {
        if (unlocked) obj.clearTint?.();
        else obj.setTint(0x6f7787);
      }
    }
  }

  clearQuestNotices() {
    for (const container of this.questNoticeContainers || []) container.destroy();
    this.questNoticeContainers = [];
  }

  buildQuestNotices() {
    this.clearQuestNotices();
    this.questNoticeContainers = [];

    const board = this.decorationById.notice_board || this.buildingById.guildhall;
    const x = board.x + 26;
    const y = board.y - (board.h || 60) - 18;
    const w = 116;
    const h = 32;
    const container = this.add.container(x, y).setDepth(5450);
    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(hover ? 0xfff1c4 : 0x141a24, hover ? 0.98 : 0.9);
      bg.fillRoundedRect(0, 0, w, h, 5);
      bg.fillStyle(0x6b4a2b, 0.35);
      bg.fillRect(8, h - 6, w - 16, 3);
      bg.lineStyle(1.5, 0xf6c945, 0.94);
      bg.strokeRoundedRect(0, 0, w, h, 5);
    };
    drawBg();
    const postedCount = this.postedQuests.length;
    const iconKey = resolveTexture(this, 'icon_quest');
    const icon = iconKey
      ? this.add.image(16, h / 2, iconKey).setScale(this.getTextureScaleForMaxDimension(iconKey, 15, 1))
      : null;
    const text = this.add.text(icon ? 31 : w / 2, h / 2, postedCount > 0
      ? `${postedCount}/${this.availableQuests.length} Posted`
      : `${this.availableQuests.length} Quests`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffe08a',
        stroke: '#0c1118',
        strokeThickness: 2,
        align: icon ? 'left' : 'center',
        wordWrap: { width: icon ? w - 38 : w - 14 },
      }).setOrigin(icon ? 0 : 0.5, 0.5);
    container.add([bg, ...(icon ? [icon] : []), text]);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => drawBg(true));
    container.on('pointerout', () => drawBg(false));
    container.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.showQuestInspector();
    });
    this.questNoticeContainers.push(container);
  }

  createQuestNotice(quest, x, y) {
    quest.noticeX = x;
    quest.noticeY = y;
    const w = 182;
    const h = 96;
    const container = this.add.container(x, y).setDepth(3600);
    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(quest.posted ? 0x4c3a20 : hover ? 0xfff1c4 : 0xf2ead8, 0.96);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(2, quest.posted ? 0xf6c945 : 0x6b4a2b, 0.95);
      bg.strokeRoundedRect(0, 0, w, h, 4);
      bg.fillStyle(0x6b4a2b, 0.22);
      bg.fillRect(8, 8, w - 16, 3);
    };
    drawBg();

    const title = this.add.text(8, 10, quest.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: quest.posted ? '#ffe08a' : '#1d2430',
      wordWrap: { width: w - 16 },
    });
    const body = this.add.text(8, 35, [
      `${quest.type.toUpperCase()} | Cost ${quest.cost}g -> ${quest.reward}g`,
      `Diff ${quest.difficulty}  Risk ${quest.risk}  Threat -${quest.threatReduction}`,
      quest.description,
      quest.posted ? 'POSTED: resolves next cycle' : 'Tap to post bounty',
    ].join('\n'), {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: quest.posted ? '#fff6dc' : '#243042',
      lineSpacing: 2,
      wordWrap: { width: w - 16 },
    });
    body.setMaxLines(4);
    container.add([bg, title, body]);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (!quest.posted) drawBg(true);
    });
    container.on('pointerout', () => drawBg(false));
    container.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.postQuest(quest);
    });
    return container;
  }

  postQuest(quest) {
    if (this.cycleRunning) {
      this.game.events.emit('gwg-event', 'The gates are already open. The guild refuses mid-panic paperwork.');
      return;
    }
    if (quest.posted) {
      this.game.events.emit('gwg-event', 'Quest already posted. The guild has enough paperwork.');
      return;
    }
    if (this.resources.gold < quest.cost) {
      this.floatText(quest.noticeX || 500, quest.noticeY || 250, 'NOT ENOUGH GOLD', '#f0938f');
      this.game.events.emit('gwg-event', Phaser.Utils.Array.GetRandom([
        'Not enough gold. Please exploit responsibly.',
        'The accountant suggests more whales.',
        'Try selling fairness. It was decorative anyway.',
      ]));
      return;
    }

    this.applyDeltas({ gold: -quest.cost });
    const postedQuest = { ...quest, posted: true, status: 'posted' };
    this.postedQuests.push(postedQuest);
    this.availableQuests = this.availableQuests.map((item) => (
      item.noticeId === quest.noticeId ? postedQuest : item
    ));
    this.stats.questsPosted += 1;
    if (quest.type === 'sponsored' || quest.type === 'shady') this.stats.sponsoredQuests += 1;
    const text = `Posted ${quest.name} for ${quest.cost}g. Heroes will make it worse shortly.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'quest');
    const board = this.decorationById.notice_board || this.buildingById.guildhall;
    this.floatText(board.x + 44, board.y - (board.h || 60) - 32, 'QUEST POSTED', '#ffe08a');
    this.buildQuestNotices();
    this.checkObjectives();
    this.advanceOnboarding('postQuest');
    this.publishTownHint();
    this.saveGame(false);
    if (this.activeInspector?.type === 'quests') this.showQuestInspector();

    const clerk = this.heroes?.find((hero) => hero.def.personality === 'Guild Clerk');
    if (clerk) this.say(clerk, 'Quest posted. Liability pending.', true);
  }

  refreshQuestNotices() {
    this.availableQuests = rollQuestNotices(this.day);
    this.postedQuests = [];
    this.buildQuestNotices();
  }

  getTextureScaleForMaxDimension(textureKey, targetPx, fallbackScale = 1) {
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const sourceSize = Math.max(source?.width || 0, source?.height || 0);
    if (!sourceSize) return fallbackScale;
    return Phaser.Math.Clamp(targetPx / sourceSize, 0.2, fallbackScale);
  }

  getTextureScaleForHeight(textureKey, targetHeight, fallbackScale = 1) {
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const sourceHeight = source?.height || 0;
    if (!sourceHeight) return fallbackScale;
    return Phaser.Math.Clamp(targetHeight / sourceHeight, 0.4, fallbackScale);
  }

  buildWhaleStationDressing() {
    // The Whale is already visually loud. Its owned dressing stays restrained,
    // sits above roads but below actors, and is torn down with the building.
    const whale = this.buildingById.whale;
    if (!whale?.isPlaced || this.whaleDressingBuilt) return;
    this.whaleDressingBuilt = true;
    const coinKey = resolveTexture(this, 'icon_coin', 'ph-icon_coin');
    const coinScale = this.getTextureScaleForMaxDimension(coinKey, 10, 1);
    const buildingDepth = this.isBuilderCity && Number.isInteger(whale.gridX) && Number.isInteger(whale.gridY)
      ? this.getVisualDepth(whale.gridX, whale.gridY) + 40
      : whale.y;

    const glow = this.add.image(whale.x, whale.y - 22, 'glow')
      .setDepth(buildingDepth - 5)
      .setScale(0.92)
      .setAlpha(0.16)
      .setTint(0xf6c945);
    this.tweens.add({
      targets: glow, alpha: 0.27, scale: 1.02,
      duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    this.registerBuildingOwnedVisual(whale.id, glow);

    const coinTrickle = this.add.particles(whale.x, whale.y - whale.h + 24, coinKey, {
      x: { min: -26, max: 26 },
      speedY: { min: -32, max: -18 },
      speedX: { min: -8, max: 8 },
      alpha: { start: 0.72, end: 0 },
      scale: { min: coinScale * 0.5, max: coinScale * 0.78 },
      lifespan: 1500,
      frequency: this.rsp?.compact ? 720 : 480,
      maxParticles: this.rsp?.compact ? 7 : 12,
    }).setDepth(buildingDepth + 2);
    this.registerBuildingOwnedVisual(whale.id, coinTrickle);

    this.coinBurst = this.add.particles(whale.x, whale.y - 90, coinKey, {
      speed: { min: 70, max: 160 },
      angle: { min: 210, max: 330 },
      gravityY: 260,
      lifespan: 1050,
      scale: { start: coinScale * 1.1, end: coinScale * 0.35 },
      alpha: { start: 1, end: 0 },
      emitting: false,
      maxParticles: this.rsp?.compact ? 28 : 46,
    }).setDepth(buildingDepth + 2);
    this.registerBuildingOwnedVisual(whale.id, this.coinBurst);

    const queuePlace = {
      id: `${whale.id}:vip_queue`,
      ownerId: whale.id,
      name: 'VIP Queue',
      x: whale.x + 67,
      y: whale.y + 11,
      w: 58,
      h: 28,
      interactionW: 52,
      interactionH: 26,
      labelOffsetY: 4,
      description: 'A velvet line between ambition and disposable income.',
      tooltipLines: ['Premium users queue briefly. Everyone else receives the immersive version.'],
      effect: 'Attached premium landmark: +Prestige, +Corruption, no road blocking.',
      interactive: true,
    };
    if (!this.attachedPlacesById) this.attachedPlacesById = {};
    this.attachedPlacesById[queuePlace.id] = queuePlace;
    const queueShadow = this.add.ellipse(queuePlace.x, queuePlace.y - 2, 54, 10, 0x10151d, 0.16)
      .setDepth(buildingDepth + 1);
    this.registerBuildingOwnedVisual(whale.id, queueShadow);
    const queueKey = resolveTexture(this, 'decor_vip_rope_entrance', 'viprope');
    const queueImage = this.add.image(queuePlace.x, queuePlace.y, queueKey)
      .setOrigin(0.5, 1)
      .setDepth(buildingDepth + 3);
    queueImage.setScale(this.getTextureScaleForHeight(queueKey, 28, 0.9));
    queueImage.setData('baseScaleX', queueImage.scaleX);
    queueImage.setData('baseScaleY', queueImage.scaleY);
    this.placeSpriteById[queuePlace.id] = queueImage;
    this.registerBuildingOwnedVisual(whale.id, queueImage);
    const queueLabel = this.addPlaceLabel(queuePlace, SMALL_LABEL_FONT_SIZE);
    this.placeLabelsById[queuePlace.id] = queueLabel;
    this.registerBuildingOwnedVisual(whale.id, queueLabel);
    const queueHit = this.createPlaceHitZone(queuePlace, queueImage, () => this.showTooltip(queuePlace));
    this.registerBuildingOwnedVisual(whale.id, queueHit);
  }

  burstCoins(count = 42) {
    if (!this.coinBurst) return;
    if (this.time.now - this.lastCoinBurstAt < COIN_BURST_COOLDOWN_MS) return;
    this.lastCoinBurstAt = this.time.now;
    this.coinBurst.explode(Math.min(count, this.rsp?.maxParticleBurst ?? 64));
  }

  refreshAllUpgradeVisuals() {
    for (const place of Object.values(this.placeById || {})) {
      this.refreshUpgradeVisual(place);
    }
  }

  refreshBuildingDamageVisual(place) {
    this.buildingDamageVisualsById = this.buildingDamageVisualsById || {};
    const existing = this.buildingDamageVisualsById[place?.id];
    if (existing?.active) existing.destroy();
    delete this.buildingDamageVisualsById[place?.id];
    if (!place?.isPlaced) return;
    const runtime = this.getBuildingRuntime(place.id);
    const sprite = this.placeSpriteById?.[place.id];
    if (sprite) {
      if (runtime.damaged) sprite.setTint(0xd8b3a4);
      else sprite.clearTint?.();
    }
    if (!runtime.damaged) return;
    const marker = this.add.text(place.x + Math.min(34, (place.w || 70) * 0.32), place.y - (place.h || 58), '!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffd0cc',
      backgroundColor: '#5b1e25dd',
      padding: { x: 4, y: 1 },
    }).setOrigin(0.5).setDepth((sprite?.depth || place.y) + 4);
    this.buildingDamageVisualsById[place.id] = marker;
    this.buildingObjectsById?.[place.id]?.push(marker);
  }

  refreshUpgradeVisual(place) {
    const existing = this.upgradeVisualsById?.[place.id];
    if (existing) this.destroyOwnedWorldObject(existing);
    delete this.upgradeVisualsById?.[place.id];
    if (place?.isPlaced === false) return;

    const sprite = this.placeSpriteById?.[place.id];
    if (sprite) {
      const baseX = sprite.getData('baseScaleX') || 1;
      const baseY = sprite.getData('baseScaleY') || 1;
      sprite.setScale(baseX, baseY);
      sprite.setData('restScaleX', baseX);
      sprite.setData('restScaleY', baseY);
    }
  }

  // --- fixed inspector data -----------------------------------------------

  getConsequenceLine(place) {
    const id = place?.id;
    if (id === 'whale') return 'Consequence: fast gold, louder corruption, lower trust.';
    if (id === 'training' || id === 'blacksmith' || id === 'guildhall') return 'Consequence: slower fair growth and better honest hero odds.';
    if (id === 'tavern' || id === 'complaint_barrel') return 'Consequence: stabilizes morale/trust when the economy gets shiny.';
    if (id === 'dungeon') return 'Consequence: better quest rewards, but danger gets ideas.';
    if (id === 'debt_collector_booth') return 'Consequence: gold now, morale paperwork later.';
    if (id === 'market') return 'Consequence: steady income; high levels smell like dynamic pricing.';
    return place?.effect ? `Consequence: ${place.effect}` : 'Consequence: mostly decorative, allegedly.';
  }

  getLockReason(id) {
    if (!LOCKABLE_LOCATION_IDS.has(id) || this.isLocationUnlocked(id)) return null;
    const reasons = {
      complaint_barrel: 'Unlocks after Day 3 or when Trust drops below 60.',
      debt_collector_booth: 'Unlocks when Corruption exceeds 40 or somebody owes too much.',
      sponsored_quest_board: 'Unlocks at Guild Hall level 2 or Golden Whale level 2.',
      balance_memorial: 'Unlocks after whale success causes trust loss.',
      ethics_fountain: 'Unlocks when Corruption exceeds 70.',
      refund_denial_desk: 'Unlocks when Golden Whale reaches level 3.',
      ethics_laundromat: 'Unlocks near Corruption 85 or after a corruption scandal.',
      patch_notes_shrine: 'Unlocks on Day 10 or after a major balance complaint.',
      hero_union_tent: 'Unlocks when at least two heroes become protest or bitter types.',
      premium_temple: 'Unlocks when Golden Whale reaches level 5.',
    };
    return reasons[id] || 'Locked until the town earns this problem.';
  }

  getPlaceKind(place) {
    const catalogKind = getBuildingCatalogEntry(place?.id)?.kind;
    if (catalogKind && catalogKind !== 'mixed') return catalogKind;
    if (['whale', 'debt_collector_booth', 'refund_denial_desk', 'ethics_fountain', 'ethics_laundromat', 'premium_temple'].includes(place.id)) return 'shady';
    if (['training', 'blacksmith', 'guildhall', 'tavern', 'complaint_barrel', 'balance_memorial', 'patch_notes_shrine', 'hero_union_tent'].includes(place.id)) return 'fair';
    return '';
  }

  getUpgradeablePlaces() {
    return Object.values(this.placeById || {})
      .filter((place) => place.isPlaced !== false)
      .filter((place) => this.getUpgradeInfo(place).cost || getUpgradeDef(place.id));
  }

  // resolve an item manifest key to its file path, only when the art loaded
  getItemIconPath(assetKey) {
    if (!assetKey || !this.textures.exists(assetKey)) return null;
    const entry = ASSET_MANIFEST.find((slot) => slot.key === assetKey);
    return entry ? entry.path : null;
  }

  // what a discovered POI offers the player, by kind
  getPoiActionConfig(place) {
    const yieldConfig = POI_RESOURCE_YIELDS[place.id];
    if (yieldConfig) {
      return {
        id: 'harvest',
        label: `Send hero to harvest (${yieldConfig.resource})`,
        verb: 'harvesting',
        risk: yieldConfig.premium ? 'corruption' : 'low',
      };
    }
    if (place.monsterSource || place.kind === 'camp') {
      return { id: 'clear', label: 'Send hero to clear threat', verb: 'clearing', risk: 'combat' };
    }
    return { id: 'investigate', label: 'Send hero to investigate', verb: 'investigating', risk: 'medium' };
  }

  getPoiRewardPreview(place, actionConfig = this.getPoiActionConfig(place)) {
    const yieldConfig = POI_RESOURCE_YIELDS[place.id];
    if (actionConfig.id === 'harvest' && yieldConfig) {
      return `Expected reward: ${yieldConfig.min + 1}-${yieldConfig.max + 2} ${yieldConfig.resource}.`;
    }
    if (actionConfig.id === 'clear') {
      const monster = place.monsterSource
        ? (MONSTERS.find((entry) => entry.id === place.monsterSource) || null)
        : null;
      const threat = monster?.threat || 2;
      return `Expected reward: about ${26 + threat * 14}g, safer local threat, and hero fame.`;
    }
    return 'Expected reward: gold, loot, morale, or a very educational disappointment.';
  }

  getPoiDangerLabel(place, actionConfig = this.getPoiActionConfig(place)) {
    const areaRisk = this.areaReputation?.[place.id]?.danger || 0;
    if (actionConfig.id === 'harvest') {
      if (actionConfig.risk === 'corruption') return 'Premium residue';
      return areaRisk >= 50 ? 'Moderate' : 'Low';
    }
    if (actionConfig.id === 'clear') {
      const monster = place.monsterSource
        ? (MONSTERS.find((entry) => entry.id === place.monsterSource) || null)
        : null;
      const power = (monster?.threat || 2) * 20 + areaRisk;
      if (power >= 95) return 'Severe';
      if (power >= 65) return 'High';
      return 'Moderate';
    }
    if (areaRisk >= 70 || this.resources.threat >= 80) return 'High';
    if (areaRisk >= 35 || this.resources.threat >= 50) return 'Moderate';
    return 'Low';
  }

  getPoiHeroSuccessChance(hero, place, actionConfig = this.getPoiActionConfig(place)) {
    const power = hero?.stats?.power || 1;
    const morale = hero?.stats?.morale || 50;
    const gear = this.getHeroEquipmentBonus(hero).power;
    const areaRisk = this.areaReputation?.[place.id]?.danger || 0;
    const threatPenalty = Math.round((this.resources.threat || 0) * 0.25);
    let base = 68 + power * 2 + Math.floor((morale - 50) / 8) + Math.min(8, gear);
    if (actionConfig.id === 'harvest') base += actionConfig.risk === 'corruption' ? -5 : 10;
    if (actionConfig.id === 'clear') {
      const monster = place.monsterSource
        ? (MONSTERS.find((entry) => entry.id === place.monsterSource) || null)
        : null;
      base -= (monster?.threat || 2) * 11;
    }
    if (actionConfig.id === 'investigate') base -= 7;
    base -= Math.floor(areaRisk / 5) + threatPenalty;
    if (this.isHeroInjured(hero)) base -= 35;
    return Phaser.Math.Clamp(Math.round(base), 8, 96);
  }

  getPoiBestHero(place, actionConfig = this.getPoiActionConfig(place)) {
    return this.getActiveHeroes()
      .filter((hero) => hero.state !== 'away' && !this.isHeroInjured(hero))
      .map((hero) => ({
        hero,
        chance: this.getPoiHeroSuccessChance(hero, place, actionConfig),
      }))
      .sort((a, b) => b.chance - a.chance)[0] || null;
  }

  getPoiCooldownDay(poiId) {
    return this.poiCooldowns?.[poiId] || 0;
  }

  // live demand line: ties each build-menu card to a current town problem so
  // the menu guides decisions instead of listing objects
  getBuildingDemandHint(id, built = false) {
    const inventory = this.townInventory || {};
    if (['tavern', 'inn', 'hero_hostel', 'premium_lodge'].includes(id)) {
      const lodging = this.getLodgingReport();
      if (lodging.homeless > 0) {
        return `DEMAND: town needs ${lodging.used} beds, has ${lodging.beds}. ${built ? 'Upgrade for more beds.' : 'Build to stop outdoor sleeping.'}`;
      }
      return '';
    }
    if (id === 'potion_shop') {
      const injured = this.getActiveHeroes().filter((hero) => this.isHeroInjured(hero)).length;
      if (injured > 0) {
        return `DEMAND: ${injured} hero${injured === 1 ? '' : 'es'} injured${(inventory.herbs || 0) > 0 ? ` and ${inventory.herbs} herbs in store` : ''}. Potions needed.`;
      }
      return '';
    }
    if (id === 'market' && (inventory.loot || 0) >= 3) {
      return `DEMAND: ${inventory.loot} loot stockpiled. ${built ? 'Upgrade to convert faster.' : 'A Market turns it into gold.'}`;
    }
    if (id === 'blacksmith' && (inventory.iron || 0) > 0 && ((inventory.weapons || 0) + (inventory.armor || 0)) === 0) {
      return `DEMAND: ${inventory.iron} iron waiting to become weapons, armor, or tools.`;
    }
    if (id === 'sawmill' && (inventory.wood || 0) >= 4 && (inventory.planks || 0) < 4) {
      return `DEMAND: ${inventory.wood} wood is waiting for a useful rectangular future.`;
    }
    if (id === 'workshop' && (inventory.planks || 0) >= 2 && (inventory.iron || 0) > 0 && (inventory.tools || 0) < 3) {
      return 'DEMAND: extraction crews need tools. The inputs are already available.';
    }
    if (id === 'salvage_yard' && (inventory.loot || 0) >= 4) {
      return `DEMAND: ${inventory.loot} loot can become trade goods or recovered equipment.`;
    }
    if (id === 'warehouse') {
      const full = PROCESSED_RESOURCES.filter((res) => this.isResourceStorageFull(res));
      if (full.length) return `DEMAND: finished storage full (${full.join(', ')}). Production is becoming furniture.`;
    }
    if (['watchtower', 'arena'].includes(id) && this.resources.threat >= 55) {
      return `DEMAND: threat at ${this.resources.threat}. Defenses cut attack damage and fog danger.`;
    }
    // extraction camps: point at a discovered matching node with no camp yet
    const extractionConfig = EXTRACTION_BUILDINGS[id];
    if (extractionConfig) {
      const openNode = Object.values(this.explorationPointById || {}).find((place) => (
        this.isResourceNode(place)
        && (extractionConfig.accepts || [extractionConfig.resource]).includes(POI_RESOURCE_YIELDS[place.id]?.resource)
        && this.isRevealed(place.gridX, place.gridY)
        && this.getCampsNearNode(place).length === 0
      ));
      if (openNode) return `DEMAND: ${openNode.name} discovered with no camp. Build within 16 tiles to extract ${extractionConfig.resource}.`;
      if (id === 'lumber_camp' && (this.forestBlockedCells?.size || 0) > 0) {
        return 'DEMAND: forests can be harvested for wood. Place near dense forest.';
      }
      return '';
    }
    if (id === 'storehouse') {
      const full = STORED_RESOURCES.filter((res) => this.isResourceStorageFull(res));
      if (full.length) return `DEMAND: ${full.join(', ')} storage full. Build/upgrade a Storehouse to stop wasting extraction.`;
      return '';
    }
    if (id === 'frontier_outpost') {
      const remoteNode = Object.values(this.explorationPointById || {}).find((place) => (
        this.isResourceNode(place)
        && this.isRevealed(place.gridX, place.gridY)
        && !this.isInTerritory(place.gridX, place.gridY)
      ));
      if (remoteNode) return `DEMAND: distant nodes like ${remoteNode.name} sit outside territory. An Outpost makes frontier building cheaper and safer.`;
      return '';
    }
    return '';
  }

  getInventoryClarityLines() {
    return RESOURCE_TYPES.map((resource) => (
      `${resource.label}: ${this.townInventory?.[resource.id] || 0} - ${resource.blurb}`
    ));
  }

  getBuildingNextAction(place, metrics = null, problems = []) {
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const demand = this.getBuildingDemandHint(baseId, true);
    if (demand) return demand.replace(/^DEMAND:\s*/u, '');
    const firstProblem = problems.find(Boolean);
    if (firstProblem) {
      const text = typeof firstProblem === 'string' ? firstProblem : firstProblem.text;
      if (text) return `Fix: ${text}`;
    }
    if (baseId === 'guildhall' || baseId === 'notice_board') {
      if (this.postedQuests.some((quest) => !quest.assignedHeroId)) return 'Assign a hero to the posted quest.';
      return 'Post quests so heroes have dangerous, billable work.';
    }
    if (baseId === 'market' && (this.townInventory?.loot || 0) > 0) return 'Let the Market convert stored loot into gold.';
    if (baseId === 'blacksmith' && (this.townInventory?.iron || 0) > 0) return 'Use iron here to improve town gear supply.';
    if (baseId === 'potion_shop' && (this.townInventory?.herbs || 0) > 0) return 'Turn herbs into potions for injured heroes.';
    if (REST_BUILDINGS[baseId]) return 'Add or upgrade lodging when heroes outgrow the beds.';
    if (['watchtower', 'guard_post'].includes(baseId)) return 'Keep this near roads and wilderness to reduce monster pressure.';
    if (baseId === 'whale') return 'Upgrade for fast gold, corruption, envy, and plausible deniability loss.';
    const info = this.getUpgradeInfo(place);
    if (info.cost && !info.maxed) return `Use this building until its next upgrade is worth ${info.cost}g.`;
    if (metrics?.districtBonuses?.length) return 'Keep nearby district partners active to preserve the bonus.';
    return 'Keep it connected to roads and watch for demand hints.';
  }

  getBuildingClarityLines(place, role, metrics, problems) {
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const demand = this.getBuildingDemandHint(baseId, true);
    const lodging = REST_BUILDINGS[baseId] ? this.getLodgingReport() : null;
    const solves = {
      tavern: 'Solves early beds, rest, morale recovery, and seated complaints.',
      inn: 'Solves higher-quality lodging for heroes who have discovered expectations.',
      hero_hostel: 'Solves cheap bed capacity when the town attracts too many hopefuls.',
      premium_lodge: 'Solves premium comfort while quietly manufacturing envy.',
      blacksmith: 'Solves gear shortages and helps non-whale heroes survive unfair math.',
      market: 'Solves loot conversion. Loot in storage is just clutter with confidence.',
      potion_shop: 'Solves injury recovery when heroes return in tutorial-warning condition.',
      guildhall: 'Solves quest access, clerk coverage, and the illusion of governance.',
      notice_board: 'Solves quest choice clarity. Dangerous paperwork starts here.',
      watchtower: 'Solves local threat pressure and gives monster attacks worse odds.',
      guard_post: 'Solves patrol coverage near roads and exposed districts.',
      whale: 'Solves gold shortages quickly and creates several richer problems.',
    }[baseId] || role?.role || 'Solves a local town need, assuming the road cooperates.';
    const currentDemand = demand
      || (lodging ? `Current demand: ${lodging.used}/${lodging.beds} beds used.` : 'Current demand: no urgent shortage detected.');
    return [
      solves,
      currentDemand,
      `Useful next action: ${this.getBuildingNextAction(place, metrics, problems)}`,
    ];
  }

  getProductionInspector(place) {
    const recipes = this.getProductionRecipes(place);
    if (!recipes.length) return null;
    const state = this.getProductionState(place);
    const recipe = RECIPE_BY_ID[state.recipeId] || recipes[0];
    const priority = PRODUCTION_PRIORITIES[state.priority] || PRODUCTION_PRIORITIES.normal;
    const buffer = Object.fromEntries(Object.entries(state.outputBuffer || {}).filter(([, amount]) => amount > 0));
    const nextEvolution = state.batches < 8 ? 8 : state.batches < 20 ? 20 : state.batches < 40 ? 40 : null;
    return {
      state,
      recipe,
      recipes,
      lines: [
        `Recipe: ${recipe?.name || 'None selected'}`,
        recipe ? `Inputs: ${formatResourceAmountMap(recipe.inputs)}` : 'Inputs: none',
        recipe ? `Outputs: ${formatResourceAmountMap(recipe.outputs)}` : 'Outputs: none',
        recipe ? `Production time: ${recipe.days} day${recipe.days === 1 ? '' : 's'} - priority ${priority.label}` : 'Production time: idle',
        `Status: ${state.lastStatus}`,
        `Progress: ${Math.floor(state.progress * 100) / 100}/${recipe?.days || 1} - batches ${state.batches}`,
        Object.keys(buffer).length ? `Awaiting delivery: ${formatResourceAmountMap(buffer)}` : 'Awaiting delivery: none',
        nextEvolution
          ? `Use evolution: ${state.batches}/${nextEvolution} batches toward the next efficiency step.`
          : 'Use evolution: mature production line; further use still supports town rank.',
      ],
      actions: [
        ...recipes.map((option) => ({
          label: option.id === state.recipeId ? `${option.name} - Selected` : option.name,
          event: 'gwg-production-recipe',
          id: `${place.id}:${option.id}`,
          disabled: option.id === state.recipeId || this.getProductionRank() < option.minRank,
          className: option.id.includes('premium') || option.id.includes('fabricate') ? 'gwg-whale' : '',
        })),
        { label: state.paused ? 'Resume Production' : 'Pause Production', event: 'gwg-production-toggle', id: place.id },
        { label: `Priority: ${priority.label}`, event: 'gwg-production-priority', id: place.id },
      ],
    };
  }

  runTradeActionFromUi(actionId) {
    const market = this.getPlacedBuildingsByBaseId('market')[0];
    if (!market) return;
    const exports = ['tradeGoods', 'planks', 'tools', 'weapons', 'armor', 'potions'];
    if (actionId === 'toggle-auto') this.tradeSettings.autoExport = !this.tradeSettings.autoExport;
    else if (actionId === 'cycle-export') {
      const current = exports.indexOf(this.tradeSettings.preferredExport);
      this.tradeSettings.preferredExport = exports[(current + 1) % exports.length];
    } else if (actionId === 'buy-iron') {
      const amount = 3;
      const cost = TRADE_PRICES.iron.buy * amount;
      if (this.resources.gold < cost) {
        this.game.events.emit('gwg-event', `Need ${cost}g to import iron. The caravan accepts neither exposure nor optimism.`);
        return;
      }
      this.applyDeltas({ gold: -cost });
      this.addTownResource('iron', amount, 'Market import');
    } else if (actionId === 'emergency-supplies') {
      const cost = 260;
      if (this.resources.gold < cost) {
        this.game.events.emit('gwg-event', `Need ${cost}g for emergency supplies. Convenience remains inconveniently priced.`);
        return;
      }
      this.applyDeltas({ gold: -cost, corruption: 2, trust: -1 });
      this.addTownResource('wood', 3);
      this.addTownResource('iron', 2);
      this.addTownResource('herbs', 2);
    }
    const text = `Trade settings updated: ${this.tradeSettings.autoExport ? 'auto-exporting' : 'reserving'} ${RESOURCE_BY_ID[this.tradeSettings.preferredExport]?.label || this.tradeSettings.preferredExport}.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
    this.showPlaceInspector(market);
  }

  getTradeInspectorLines() {
    const id = this.tradeSettings.preferredExport;
    return [
      `Auto-export: ${this.tradeSettings.autoExport ? 'On' : 'Off'}`,
      `Preferred export: ${RESOURCE_BY_ID[id]?.label || id} (${TRADE_PRICES[id]?.sell || 0}g each)`,
      `Reserve: ${this.tradeSettings.reserves[id] || 0} - current stock ${this.townInventory[id] || 0}`,
      'Imports are deliberately expensive. The caravan has read the demand curve.',
    ];
  }

  getTownHeroSupplyLines() {
    const active = this.getActiveHeroes();
    const weaponsNeeded = active.filter((hero) => normalizeHeroEquipment(hero.stats.equipment).weapon === 'Poor').length;
    const armorNeeded = active.filter((hero) => this.getHeroTierIndex(hero) >= 2 && normalizeHeroEquipment(hero.stats.equipment).armor === 'Poor').length;
    const potionNeeded = active.filter((hero) => this.isHeroInjured(hero) && normalizeHeroEquipment(hero.stats.equipment).potions <= 0).length;
    return [
      `Town stock: ${this.townInventory.weapons} weapons, ${this.townInventory.armor} armor, ${this.townInventory.potions} potions.`,
      `Requests: ${weaponsNeeded} weapons, ${armorNeeded} veteran armor, ${potionNeeded} injury potions.`,
      'Equip Best Available prioritizes weapon, armor, then a carried potion. Better town rank improves issued quality.',
    ];
  }

  getStorehouseInspector(place) {
    if (getBaseBuildingId(place?.baseId || place?.id) !== 'storehouse') return null;
    const storage = this.getBuildingRuntime(place.id).storage;
    return {
      lines: [
        `Accepts: ${storage.mode === 'all' ? 'all raw resources' : RESOURCE_BY_ID[storage.resource]?.label || storage.resource}`,
        `Incoming priority: ${storage.priority}`,
        `Reserve minimum: ${storage.reserveMinimum} per accepted resource`,
        ...STORED_RESOURCES.map((id) => `${RESOURCE_BY_ID[id]?.label || id}: ${this.townInventory[id] || 0}/${this.getStorageCap(id)} (${this.getIncomingDeliveries(id)} incoming)`),
      ],
      actions: [
        { label: storage.mode === 'all' ? 'Restrict Resource' : `Restricted: ${RESOURCE_BY_ID[storage.resource]?.label || storage.resource}`, event: 'gwg-storehouse-action', id: `${place.id}:mode` },
        { label: `Incoming: ${storage.priority}`, event: 'gwg-storehouse-action', id: `${place.id}:priority` },
        { label: `Reserve: ${storage.reserveMinimum}`, event: 'gwg-storehouse-action', id: `${place.id}:reserve` },
      ],
    };
  }

  runStorehouseActionFromUi(token) {
    const [placeId, action] = String(token || '').split(':');
    const place = this.buildingById?.[placeId];
    if (!place || getBaseBuildingId(place.baseId || place.id) !== 'storehouse') return;
    const storage = this.getBuildingRuntime(placeId).storage;
    if (action === 'mode') {
      if (storage.mode === 'all') {
        storage.mode = 'restricted';
        storage.resource = STORED_RESOURCES[0];
      } else {
        const next = STORED_RESOURCES.indexOf(storage.resource) + 1;
        if (next >= STORED_RESOURCES.length) {
          storage.mode = 'all';
          storage.resource = null;
        } else storage.resource = STORED_RESOURCES[next];
      }
    } else if (action === 'priority') {
      const order = ['low', 'normal', 'high'];
      storage.priority = order[(order.indexOf(storage.priority) + 1) % order.length];
    } else if (action === 'reserve') {
      storage.reserveMinimum = storage.reserveMinimum >= 10 ? 0 : storage.reserveMinimum + 5;
    }
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  getPlaceInspectorPayload(place) {
    if (place.mapPoint) {
      const actionConfig = this.getPoiActionConfig(place);
      const cooldownDay = this.getPoiCooldownDay(place.id);
      const onCooldown = cooldownDay > this.day;
      const bestHero = this.getPoiBestHero(place, actionConfig);
      const riskLine = {
        low: 'Risk: low. The wilderness is merely judgmental here.',
        medium: 'Risk: medium. Something may object to the visit.',
        combat: 'Risk: combat. Injury is a real outcome.',
        corruption: 'Risk: premium residue. Gold likely, ethics optional.',
      }[actionConfig.risk] || 'Risk: unclear, which is also information.';
      const node = this.isResourceNode(place) ? this.getResourceNode(place.id) : null;
      const sections = [
        ...(node ? [{
          title: 'Operation Status',
          lines: this.getResourceNodeStatusLines(place, node),
        }] : []),
        {
          title: 'Map Note',
          lines: [place.description, ...(place.tooltipLines || [])].filter(Boolean),
        },
        {
          title: 'Field Assessment',
          lines: [
            `Action: ${actionConfig.id === 'clear' ? 'Clear threat' : actionConfig.id === 'harvest' ? 'Harvest' : 'Investigate'}.`,
            place.effect || 'A point of interest with opinions.',
            this.getPoiRewardPreview(place, actionConfig),
            `Danger: ${this.getPoiDangerLabel(place, actionConfig)}.`,
            bestHero
              ? `Best hero: ${bestHero.hero.def.name} (${bestHero.chance}% estimated success).`
              : { text: 'Best hero: nobody free and healthy. Let someone recover first.', className: 'gwg-bad' },
            riskLine,
            onCooldown
              ? { text: `Recently visited. Worth returning after Day ${cooldownDay}.`, className: 'gwg-muted' }
              : 'A hero can be sent from town right now.',
          ],
        },
      ];
      const nodeActions = node ? this.getResourceNodeActions(place, node) : [];
      nodeActions.push({
        label: onCooldown ? `Harvested (Day ${cooldownDay})` : 'Harvest Once',
        event: 'gwg-poi-action',
        id: place.id,
        disabled: onCooldown,
      });
      return {
        title: place.name,
        subtitle: node
          ? `${RESOURCE_BY_ID[node.resource]?.label || node.resource} Node - Discovered - Danger ${node.danger}`
          : 'Exploration Point',
        primaryActions: node ? nodeActions : undefined,
        sections,
        actions: node ? [] : [
          { label: onCooldown ? `Visited (Day ${cooldownDay})` : actionConfig.label, event: 'gwg-poi-action', id: place.id, disabled: onCooldown },
          { label: 'Open Town Log', event: 'gwg-open-town-log' },
        ],
      };
    }
    const info = this.getUpgradeInfo(place);
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const catalog = getBuildingCatalogEntry(place.id);
    const metrics = catalog && place.isPlaced ? this.getBuildingMetrics(place) : null;
    const runtime = metrics?.runtime || null;
    const role = metrics?.role || null;
    const requirement = this.getUpgradeRequirement(place, info);
    const canUpgrade = Boolean(info.cost && !info.maxed && requirement.met);
    const hasGold = Boolean(info.cost && this.resources.gold >= info.cost);
    const canAfford = canUpgrade && hasGold;
    const lockReason = this.getLockReason(place.id);
    const roadAccess = catalog ? this.getBuildingRoadAccess(place) : null;
    const problems = metrics ? this.getBuildingProblems(place) : [];
    const specializations = catalog ? getBuildingSpecializations(place.id) : [];
    const specialization = metrics?.specialization || null;
    const production = catalog && place.isPlaced ? this.getProductionInspector(place) : null;
    const extraction = catalog && place.isPlaced ? this.getExtractionInspector(place) : null;
    const storehouse = catalog && place.isPlaced ? this.getStorehouseInspector(place) : null;
    const detailLines = [place.description, ...(place.tooltipLines || [])].filter(Boolean).slice(0, 4);
    const actions = [];

    if (extraction) actions.push(...extraction.actions);
    if (storehouse) actions.push(...storehouse.actions);
    if (production) actions.push(...production.actions);
    if (baseId === 'guildhall') actions.push({ label: 'Equip All Heroes', event: 'gwg-equip-all', id: place.id });
    if (baseId === 'whale') actions.push({
      label: `Process Premium Salvage (${this.townInventory.premiumSalvage || 0})`,
      event: 'gwg-premium-salvage',
      id: place.id,
      disabled: (this.townInventory.premiumSalvage || 0) <= 0,
      className: 'gwg-whale',
    });
    if (baseId === 'market') {
      actions.push(
        { label: this.tradeSettings.autoExport ? 'Pause Auto-Export' : 'Enable Auto-Export', event: 'gwg-trade-action', id: 'toggle-auto' },
        { label: 'Change Export Good', event: 'gwg-trade-action', id: 'cycle-export' },
        { label: `Import 3 Iron (${TRADE_PRICES.iron.buy * 3}g)`, event: 'gwg-trade-action', id: 'buy-iron', disabled: this.resources.gold < TRADE_PRICES.iron.buy * 3 },
      );
    }

    if (info.cost && !info.maxed) {
      actions.push({
        label: requirement.met
          ? (canAfford ? `Upgrade ${info.cost}g` : `Need ${info.cost}g`)
          : 'Needs use',
        event: 'gwg-upgrade-place',
        id: place.id,
        disabled: !canAfford || !requirement.met,
        className: baseId === 'whale' ? 'gwg-whale' : '',
      });
    }
    if (catalog && place.isPlaced) {
      if (runtime?.damaged || runtime?.health < runtime?.maxHealth) {
        actions.push({
          label: `Repair ${Math.max(1, runtime.repairCost || 1)}g`,
          event: 'gwg-repair-building',
          id: place.id,
          disabled: this.resources.gold < Math.max(1, runtime.repairCost || 1),
        });
      }
      actions.push({
        label: `Move ${this.getMoveBuildingCost(place)}g`,
        event: 'gwg-move-building',
        id: place.id,
      });
      actions.push({
        label: 'Delete',
        event: 'gwg-delete-building',
        id: place.id,
        className: 'gwg-danger-action',
        disabled: ['guildhall', 'whale', 'dungeon'].includes(baseId),
      });
      actions.push({
        label: runtime?.closed ? 'Reopen Building' : 'Close Building',
        event: 'gwg-toggle-building-open',
        id: place.id,
        className: runtime?.closed ? '' : 'gwg-danger-action',
      });
    }
    if (!specialization && specializations.length && info.level >= Math.min(...specializations.map((spec) => spec.minLevel || 2))) {
      for (const spec of specializations) {
        actions.push({
          label: `Specialize: ${spec.name}`,
          event: 'gwg-choose-specialization',
          id: `${place.id}:${spec.id}`,
          className: baseId === 'whale' || spec.id.includes('premium') || spec.id.includes('sponsored') ? 'gwg-whale' : '',
        });
      }
    }
    if (['notice_board', 'guildhall', 'sponsored_quest_board'].includes(baseId)) {
      actions.push({ label: 'View Quests', event: 'gwg-open-quests', id: place.id });
    }
    for (const shopAction of catalog?.actions || []) {
      const usedToday = runtime?.actionDays?.[shopAction.id] === this.day;
      const canPay = this.resources.gold >= shopAction.cost;
      actions.push({
        label: usedToday
          ? `${shopAction.label} - Done`
          : `${shopAction.label}${shopAction.cost ? ` ${shopAction.cost}g` : ''}`,
        event: 'gwg-building-action',
        id: `${place.id}:${shopAction.id}`,
        disabled: usedToday || !canPay,
        className: baseId.includes('premium') || ['vip_lounge', 'lootbox_kiosk', 'gem_exchange'].includes(baseId)
          ? 'gwg-whale'
          : '',
      });
    }

    return {
      panelType: catalog ? 'building-inspector' : 'location-inspector',
      title: place.name,
      subtitle: lockReason || `Level ${info.level}${info.maxed ? ' / MAX' : ''}${catalog?.category ? ` - ${catalog.category}` : ''}${specialization ? ` - ${specialization.name}` : ''}`,
      primaryActions: actions,
      sections: [
        ...(extraction ? [{ title: 'Extraction Operation', lines: extraction.lines }] : []),
        ...(storehouse ? [{ title: 'Storage Control', lines: storehouse.lines }] : []),
        ...(production ? [{ title: 'Production', lines: production.lines }] : []),
        ...(baseId === 'market' ? [{ title: 'External Trade', lines: this.getTradeInspectorLines() }] : []),
        ...(baseId === 'guildhall' ? [{ title: 'Hero Supply', lines: this.getTownHeroSupplyLines() }] : []),
        ...(baseId === 'guildhall' ? [{
          title: 'Parties & Guild Politics',
          lines: [
            `${Object.keys(this.heroSocial.parties || {}).length} active parties.`,
            ...Object.values(this.heroSocial.parties || {}).slice(0, 4).map((party) => `${party.name}: ${party.memberIds.length} members, cohesion ${party.cohesion}/100, ${LOOT_POLICIES.find((policy) => policy.id === party.lootPolicy)?.name || 'unwritten loot policy'}.`),
            ...this.getActiveHeroes()
              .map((hero) => ({ hero, profile: this.getHeroProfile(hero) }))
              .filter(({ profile }) => profile.influence >= 25)
              .sort((a, b) => b.profile.influence - a.profile.influence)
              .slice(0, 3)
              .map(({ hero, profile }) => `${hero.def.name}: ${profile.faction}, influence ${Math.round(profile.influence)}.`),
          ],
        }, {
          title: 'Hall of Records',
          lines: [
            ...Object.values(this.heroSocial.memorials || {}).slice(-6).map((record) => `${record.name} - ${record.careerStage}, Day ${record.day}. ${record.cause}`),
            ...this.heroSocial.retirements.slice(-4).map((record) => `${record.name} retired as ${record.role} on Day ${record.day}.`),
            ...(!Object.keys(this.heroSocial.memorials || {}).length && !this.heroSocial.retirements.length ? ['No fallen or retired records yet. The blank page is optimistic.'] : []),
          ],
        }] : []),
        ...(this.getDefenceBuildingInspectorLines(place) ? [{ title: 'Defence Coverage', lines: this.getDefenceBuildingInspectorLines(place) }] : []),
        {
          title: 'What This Solves',
          lines: this.getBuildingClarityLines(place, role, metrics, problems),
        },
        {
          title: 'Role',
          lines: [
            ...(role ? [
              role.role,
              `Used by: ${role.usedBy.join(', ')}`,
              `Provides: ${role.provides.join(', ') || 'local civic uncertainty'}`,
              `Repeat value: ${role.repeatValue}`,
            ] : detailLines),
            ...(runtime?.closed ? [{ text: 'Closed: this building is not serving the town right now.', className: 'gwg-bad' }] : []),
          ],
        },
        {
          title: 'Capacity & Service',
          lines: [
            `Level: ${info.level}${info.maxed ? ' (max)' : ''}`,
            info.effect ? `Effect: ${info.effect}` : 'Effect: decorative morale hazard.',
            ...(runtime ? [
              `Structure health: ${Math.ceil(runtime.health)}/${runtime.maxHealth}${runtime.damaged ? ' - DAMAGED' : ''}`,
              ...(runtime.repairAssignment?.status === 'working' ? [`Repair crew: ${runtime.repairAssignment.heroName} is en route or working.`] : []),
              ...(runtime.attackerHistory?.length ? [`Last attacker: ${runtime.attackerHistory.at(-1).monsterName} on Day ${runtime.attackerHistory.at(-1).day} (${runtime.attackerHistory.at(-1).damage} damage)`] : []),
              `Use: ${runtime.usageCount} visits - growth ${Math.floor(runtime.upgradeProgress || 0)}%`,
              `Capacity: ${metrics.load}/${metrics.capacity} ${role?.capacityLabel || 'slots'} - quality ${metrics.quality}`,
              `Service range: ${Math.round(metrics.serviceRange / GRID_CONFIG.tileSize)} tiles - ${metrics.localHeroes} nearby hero${metrics.localHeroes === 1 ? '' : 'es'}`,
              `Upkeep: ${metrics.upkeep}g/day`,
              ...(runtime.servicesProvided ? [`Services delivered: ${runtime.servicesProvided}`] : []),
            ] : []),
            ...(REST_BUILDINGS[baseId] ? [this.getBedsInspectorLine()] : []),
            ...(this.getStockInspectorLine(baseId) ? [this.getStockInspectorLine(baseId)] : []),
            ...(roadAccess ? [{
              text: `Road access: ${roadAccess.connected ? 'Connected - service active' : 'NO ROAD - service inactive'}`,
              className: roadAccess.connected ? 'gwg-good' : 'gwg-bad',
            }] : []),
            { text: this.getConsequenceLine(place), className: baseId === 'whale' ? 'gwg-whale' : 'gwg-muted' },
          ],
        },
        ...(role ? [{
          title: 'Inputs / Outputs',
          lines: [
            `Consumes: ${role.consumes.join(', ') || 'nothing yet'}`,
            `Outputs: ${role.outputResource || role.provides[0] || 'service coverage'}`,
            `Improves: ${role.improves.join(', ') || 'the town, allegedly'}`,
            ...(role.inputResource ? [`Input stock: ${this.townInventory?.[role.inputResource] || 0} ${role.inputResource}`] : []),
            ...(role.outputResource && role.outputResource !== 'gold' ? [`Output stock: ${this.townInventory?.[role.outputResource] || 0} ${role.outputResource}`] : []),
          ],
        }] : []),
        {
          title: 'Growth',
          lines: [
            requirement.text,
            ...(requirement.met ? [{ text: 'Growth requirement met for next upgrade.', className: 'gwg-good' }] : [{ text: requirement.blockedText, className: 'gwg-bad' }]),
          ],
        },
        ...(specializations.length ? [{
          title: 'Specialization',
          lines: specialization
            ? [
              { text: `${specialization.name}: ${specialization.summary}`, className: baseId === 'whale' ? 'gwg-whale' : 'gwg-good' },
              specialization.flavor,
            ]
            : info.level >= Math.min(...specializations.map((spec) => spec.minLevel || 2))
              ? ['Choose one specialization. The building will become more useful and harder to apologize for.']
              : [`Specialization unlocks at Level ${Math.min(...specializations.map((spec) => spec.minLevel || 2))}.`],
        }] : []),
        ...(metrics?.districtBonuses?.length ? [{
          title: 'District Bonuses',
          lines: metrics.districtBonuses.flatMap((bonus) => {
            const contributors = [place, ...this.getNearbyPlacedBuildings(place, bonus.radius)]
              .filter((candidate) => bonus.buildingIds.includes(getBaseBuildingId(candidate.baseId || candidate.id)))
              .map((candidate) => candidate.name)
              .slice(0, 5);
            return [
              { text: `${bonus.name}: ${bonus.effect}`, className: bonus.className || 'gwg-good' },
              `Contributors: ${contributors.join(', ')}.`,
            ];
          }),
        }] : []),
        {
          title: 'Problems',
          lines: problems.length
            ? problems
            : [{ text: 'No obvious building problems. The inspector distrusts this calm.', className: 'gwg-good' }],
        },
        {
          title: 'Town Commentary',
          lines: [getSatireLine('building', baseId, problems.length ? 'problem' : 'idle', {
            day: this.day,
            fallback: catalog?.flavor || place.upgradeFlavor || place.description,
          })],
        },
        {
          title: info.maxed ? 'Upgrade' : 'Next Upgrade',
        lines: info.maxed
          ? ['MAX: allegedly balanced.']
          : [
            info.nextEffect ? `Next: ${info.nextEffect}` : 'Next: more questionable polish.',
            `Cost: ${info.cost} gold`,
            info.flavor || 'The clerk misplaced the upgrade excuse.',
            requirement.text,
            ...(requirement.met ? [] : [{ text: requirement.blockedText, className: 'gwg-bad' }]),
            ...(hasGold ? [] : [{ text: 'Not enough gold. Please exploit responsibly.', className: 'gwg-bad' }]),
          ],
      },
        ...((catalog?.actions || []).length ? [{
          title: 'For Sale / Services',
          lines: catalog.actions.map((shopAction) => ({
            text: `${shopAction.label}: ${shopAction.summary}${shopAction.cost ? ` Cost ${shopAction.cost}g.` : ''}`,
            icon: this.getItemIconPath(shopAction.icon),
          })),
        }] : []),
      ],
      actions,
    };
  }

  showPlaceInspector(place) {
    if (!this.isLocationUnlocked(place.id)) {
      this.game.events.emit('gwg-event', `${place.name} is still locked. The town has not earned that problem yet.`);
      this.floatText(place.x, place.y - (place.h || 44) - 10, 'LOCKED', '#d4dae2');
      return;
    }
    this.tooltipTarget = place;
    this.heroTooltipTarget = null;
    this.activeInspector = { type: 'place', id: place.id };
    this.selectPlace(place);
    if (place.lairId && this.monsterLairs?.[place.lairId]) {
      this.showLairInspector(this.monsterLairs[place.lairId]);
      return;
    }
    this.drawExtractionRoute(place);
    this.drawDefenceCoverage(place);
    let trackedObjectiveProgress = false;
    if (place.id === 'guildhall') {
      this.stats.guildHallInspected = (this.stats.guildHallInspected || 0) + 1;
      this.checkObjectives();
      trackedObjectiveProgress = true;
    }
    if (REST_BUILDINGS[place.id]) {
      this.stats.lodgingChecked = (this.stats.lodgingChecked || 0) + 1;
      this.checkObjectives();
      trackedObjectiveProgress = true;
    }
    this.game.events.emit('gwg-inspector-open', this.getPlaceInspectorPayload(place));
    this.publishTownHint();
    if (trackedObjectiveProgress) this.saveGame(false);
  }

  getRoadInspectorPayload(gridX, gridY) {
    const road = this.getRoadAt(gridX, gridY);
    const type = ROAD_TYPES[road?.type] || ROAD_TYPES.dirt;
    const upgrade = this.getRoadUpgradeInfo(gridX, gridY);
    const nextLines = upgrade.target
      ? [
        `Next: ${upgrade.target.name}`,
        `Cost: ${upgrade.cost} gold`,
        `Effect: movement speed x${upgrade.target.speed}.`,
        ...(upgrade.target.corruption ? ['Consequence: shiny infrastructure adds corruption and trims trust.'] : []),
        ...(upgrade.valid ? [] : [{ text: upgrade.reason, className: 'gwg-bad' }]),
      ]
      : ['MAX: this road is as premium as public infrastructure gets.'];
    return {
      title: type.name,
      subtitle: `Road tile (${gridX}, ${gridY})`,
      sections: [
        {
          title: 'Current',
          lines: [
            type.description,
            `Movement/service speed: x${type.speed}.`,
            type.id === 'premium'
              ? { text: 'Premium road: fastest path, slightly worse civic soul.', className: 'gwg-whale' }
              : 'Road access lets buildings serve nearby heroes.',
          ],
        },
        {
          title: 'Upgrade',
          lines: nextLines,
        },
      ],
      actions: upgrade.target ? [{
        label: upgrade.valid ? `Upgrade to ${upgrade.target.name}` : `Need ${upgrade.cost}g`,
        event: 'gwg-upgrade-road',
        id: `${gridX}:${gridY}:${upgrade.target.id}`,
        disabled: !upgrade.valid,
      }] : [],
    };
  }

  showRoadInspector(gridX, gridY) {
    const road = this.getRoadAt(gridX, gridY);
    if (!road) return;
    this.tooltipTarget = null;
    this.heroTooltipTarget = null;
    this.clearSelection(false);
    this.activeInspector = { type: 'road', x: gridX, y: gridY };
    const world = this.gridTileVisualCenter(gridX, gridY);
    this.selectionMarker?.destroy();
    this.selectionMarker = this.add.graphics().setDepth(4750);
    this.drawPolygon(
      this.selectionMarker,
      this.insetPoints(this.getVisualTilePoints(gridX, gridY), 0.88),
      null,
      0,
      0xffe08a,
      0.95,
      2,
    );
    this.floatText(world.x, world.y - 26, (ROAD_TYPES[road.type] || ROAD_TYPES.dirt).name, '#ffe08a');
    this.game.events.emit('gwg-inspector-open', this.getRoadInspectorPayload(gridX, gridY));
  }

  getQuestInspectorPayload() {
    const rows = this.availableQuests.map((quest) => {
      const posted = quest.posted || this.postedQuests.some((item) => item.noticeId === quest.noticeId);
      const canPost = !this.cycleRunning && !posted && this.resources.gold >= quest.cost;
      const typeLabel = quest.type === 'danger' ? 'Risky' : quest.type.charAt(0).toUpperCase() + quest.type.slice(1);
      const trustText = quest.trust > 0 ? `+${quest.trust}` : `${quest.trust || 0}`;
      const corruptionText = quest.corruption > 0 ? `+${quest.corruption}` : `${quest.corruption || 0}`;
      const failThreat = quest.difficulty * 3;
      const candidates = this.getQuestCandidates(quest);
      const best = candidates[0];
      return {
        title: quest.name,
        meta: typeLabel,
        kind: quest.type === 'fair' || quest.type === 'trust' ? 'fair' : 'shady',
        lines: [
          `Post: ${quest.cost}g -> Reward: ${quest.reward}g`,
          `Difficulty ${quest.difficulty} / Risk ${quest.risk} / Threat -${quest.threatReduction}`,
          best
            ? { text: `Best hero: ${best.hero.def.name} (${best.chance}% success).`, className: best.chance >= 65 ? 'gwg-good' : 'gwg-muted' }
            : { text: 'Best hero: nobody free and healthy right now.', className: 'gwg-bad' },
          ...this.getQuestAvailabilityLines(quest),
          `Trust ${trustText} / Corruption ${corruptionText} / Fail Threat +${failThreat}`,
          `Best for: ${(quest.preferred || []).slice(0, 2).join(', ') || 'whoever still answers mail'}`,
          quest.description,
          ...(posted ? [{ text: 'Posted: resolves on the next town cycle.', className: 'gwg-good' }] : []),
          ...(posted && quest.assignedHeroId ? [{
            text: `Assigned: ${this.heroes?.find((h) => h.def.id === quest.assignedHeroId)?.def.name || 'a volunteer'} (+8% prepared bonus, hauls loot on success).`,
            className: 'gwg-good',
          }] : []),
          ...(!posted && !canPost ? [{ text: 'Not enough gold. The guild recommends suspicious revenue.', className: 'gwg-bad' }] : []),
        ],
        actions: [
          ...(posted && !quest.assignedHeroId
            ? candidates.map((candidate) => ({
              label: `Send ${candidate.hero.def.name} (${candidate.chance}%)`,
              event: 'gwg-assign-quest',
              id: `${quest.noticeId}:${candidate.hero.def.id}`,
            }))
            : []),
          {
          label: posted ? 'Posted' : 'Post Bounty',
          event: 'gwg-post-quest',
          id: quest.noticeId,
          disabled: !canPost,
        }],
      };
    });

    return {
      title: 'Notice Board',
      subtitle: `${this.availableQuests.length} quests available`,
      sections: [{
        title: 'Town Work',
        lines: [
          'Post one or more bounties, then let time run or Skip Day to resolve them.',
          ...((this.getOnboardingStep()?.id === 'postQuest') ? [{ text: 'Tip: pick one Post Bounty, then Skip Day to see the result.', className: 'gwg-good' }] : []),
        ],
      }],
      rows,
    };
  }

  showQuestInspector() {
    this.tooltipTarget = null;
    this.heroTooltipTarget = null;
    this.activeInspector = { type: 'quests' };
    const board = this.decorationById.notice_board || this.buildingById.guildhall;
    this.selectPlace(board);
    this.advanceOnboarding('openQuests', false);
    this.game.events.emit('gwg-inspector-open', this.getQuestInspectorPayload());
  }

  getLedgerPayload() {
    const rows = this.getUpgradeablePlaces().map((place) => {
      const info = this.getUpgradeInfo(place);
      const locked = !this.isLocationUnlocked(place.id);
      const lockReason = this.getLockReason(place.id);
      const metrics = getBuildingCatalogEntry(place.id) && place.isPlaced ? this.getBuildingMetrics(place) : null;
      const requirement = this.getUpgradeRequirement(place, info);
      const problems = metrics ? this.getBuildingProblems(place) : [];
      const canUpgrade = Boolean(info.cost && !info.maxed && !locked && requirement.met);
      const hasGold = Boolean(info.cost && this.resources.gold >= info.cost);
      const canAfford = canUpgrade && hasGold;
      const maxLevel = info.def?.maxLevel || 3;
      const state = locked ? 'locked' : info.maxed ? 'maxed' : canAfford ? 'affordable' : !requirement.met ? 'locked' : 'unaffordable';
      const specialization = metrics?.specialization;
      const districtText = metrics?.districtBonuses?.length
        ? metrics.districtBonuses.map((bonus) => bonus.name).join(', ')
        : 'No district bonus yet';
      return {
        id: place.id,
        title: place.name,
        preview: this.getAssetPreviewUrl(place.assetKey),
        kind: this.getPlaceKind(place),
        state,
        stateLabel: locked ? 'LOCKED' : info.maxed ? 'MAX' : canAfford ? 'READY' : !requirement.met ? 'NEEDS USE' : 'SHORT',
        levelLabel: `Level ${info.level}/${maxLevel}`,
        current: [
          info.effect || place.effect || 'Decorative trouble with municipal recognition.',
          metrics ? `${metrics.load}/${metrics.capacity} ${metrics.role?.capacityLabel || 'slots'}, ${metrics.upkeep}g upkeep` : '',
          specialization ? `Spec: ${specialization.name}` : '',
        ].filter(Boolean).join(' | '),
        next: locked
          ? lockReason
          : info.maxed
            ? 'Maximum level reached. The paperwork has achieved final form.'
            : `${info.nextEffect || 'More questionable improvements.'} ${requirement.text}`,
        costLabel: locked ? 'Unavailable' : info.maxed ? 'MAX' : `${info.cost}g`,
        flavor: problems.length
          ? `${problems[0].text} ${Phaser.Utils.Array.GetRandom(BUILDING_SATIRE_LINES.problems)}`
          : info.flavor || place.upgradeFlavor || 'The upgrade clerk smiles without context.',
        consequence: `${this.getConsequenceLine(place)} District: ${districtText}`,
        actions: locked
          ? []
          : [{
            label: info.maxed ? 'MAX' : (!requirement.met ? 'Needs use' : (canAfford ? 'Upgrade' : `Need ${info.cost}g`)),
            event: 'gwg-upgrade-place',
            id: place.id,
            disabled: info.maxed || !canAfford,
          }],
      };
    });

    return {
      panelType: 'town-ledger',
      title: 'Town Ledger',
      subtitle: `Upgrade planning board - ${this.resources.gold}g available`,
      sections: [{
        title: 'Trade-Offs',
        lines: [
          { text: 'Golden Whale: fast gold, corruption, trust damage.', className: 'gwg-whale' },
          { text: 'Fair infrastructure: slower growth, better morale/trust.', className: 'gwg-good' },
          ...((this.getOnboardingStep()?.id === 'npc') ? [{ text: 'Tip: choose one upgrade path, then inspect a hero to see who has opinions.', className: 'gwg-good' }] : []),
        ],
      }],
      rows,
    };
  }

  openTownLedger() {
    this.activeInspector = { type: 'ledger' };
    this.clearSelection(false);
    this.advanceOnboarding('openLedger', false);
    this.game.events.emit('gwg-ledger-open', this.getLedgerPayload());
  }

  getTownLogPayload() {
    const rows = [...(this.townLog || [])].slice(-60).reverse().map((entry) => ({
      title: `Day ${entry.day}`,
      meta: entry.category || 'event',
      kind: ['policy', 'stage', 'achievement', 'unlock', 'economy'].includes(entry.category)
        ? 'fair'
        : (['crisis', 'golden_whale'].includes(entry.category) ? 'shady' : ''),
      lines: [entry.text],
    }));
    return {
      title: 'Town Log',
      subtitle: `${this.townLog?.length || 0} important events remembered badly`,
      sections: [{
        title: 'History',
        lines: [
          'Stage changes, upgrades, quest results, policies, crises, and hero spirals are kept here.',
          'The log is local-only and capped so the browser does not become a historian.',
        ],
      }],
      rows: rows.length ? rows : [{
        title: 'Day 1',
        meta: 'quiet',
        lines: ['No important disasters logged yet. Suspicious.'],
      }],
    };
  }

  openTownLog() {
    this.activeInspector = { type: 'townlog' };
    this.clearSelection(false);
    this.game.events.emit('gwg-ledger-open', this.getTownLogPayload());
  }

  openQuestsFromUi() {
    this.showQuestInspector();
  }

  upgradePlaceFromUi(id) {
    const place = this.placeById?.[id];
    if (!place) return;
    const wasLedger = this.activeInspector?.type === 'ledger';
    const levelBefore = this.getPlaceLevel(place);
    this.tooltipTarget = place;
    this.tryUpgradeTooltipTarget();
    // taller watchtowers see further into the fog
    if (id === 'watchtower' && place.isPlaced && this.getPlaceLevel(place) > levelBefore) {
      const cell = Number.isInteger(place.gridX) && Number.isInteger(place.gridY)
        ? { x: place.gridX, y: place.gridY }
        : worldToGrid(place.x, place.y);
      this.revealArea(
        cell.x,
        cell.y,
        FOG_REVEAL_RADIUS.watchtower + this.getPlaceLevel(place),
        'The taller watchtower',
      );
    }
    if (wasLedger) this.openTownLedger();
    else this.showPlaceInspector(place);
  }

  applyBuildingHeroEffect(effect, place) {
    if (!effect) return '';
    const active = this.getActiveHeroes();
    const honest = active.filter((hero) => this.isHonestHero(hero.def));
    const whales = active.filter((hero) => this.isWhaleHero(hero.def) || hero.stats.whaleAccess);
    const debtHeroes = active.filter((hero) => this.isDebtHero(hero.def) || hero.stats.debt > 0);
    const adjust = (heroes, key, amount) => {
      for (const hero of heroes) {
        hero.stats[key] = key === 'debt'
          ? Math.max(0, (hero.stats[key] || 0) + amount)
          : Phaser.Math.Clamp((hero.stats[key] || 0) + amount, 0, key === 'power' ? 999 : 100);
      }
    };
    switch (effect) {
      case 'capacity':
        this.getBuildingRuntime(place.id).capacity += 2;
        return '+2 service capacity.';
      case 'capacityLarge':
        this.getBuildingRuntime(place.id).capacity += 3;
        return '+3 service capacity.';
      case 'quality':
        this.getBuildingRuntime(place.id).serviceQuality += 1;
        return 'Service quality improved.';
      case 'whaleMorale':
        adjust(whales, 'morale', 10);
        adjust(honest, 'envy', 4);
        return 'Whales recovered; everyone else noticed.';
      case 'whalePower':
        adjust(whales, 'power', 2);
        adjust(honest, 'envy', 8);
        adjust(honest, 'resentment', 4);
        return 'Whale Power rose. So did several eyebrows.';
      case 'healWeak': {
        const hero = [...active].sort((a, b) => a.stats.morale - b.stats.morale)[0];
        if (hero) {
          hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 18, 0, 100);
          this.addHeroHistory(hero, `Recovered at ${place.name}.`);
        }
        return hero ? `${hero.def.name} received suspiciously colorful medicine.` : '';
      }
      case 'mentorWeak': {
        const hero = [...honest].sort((a, b) => a.stats.power - b.stats.power)[0];
        if (hero) {
          hero.stats.power += 2;
          hero.stats.resentment = Math.max(0, (hero.stats.resentment || 0) - 5);
          this.addHeroHistory(hero, 'Received actual mentoring.');
        }
        return hero ? `${hero.def.name} gained 2 honest Power.` : '';
      }
      case 'honestPower':
        adjust(honest, 'power', 1);
        return 'Honest heroes gained 1 Power.';
      case 'honestLoyalty':
        adjust(honest, 'loyalty', 8);
        adjust(honest, 'resentment', -8);
        return 'Honest loyalty improved without a receipt.';
      case 'allPower':
        adjust(active, 'power', 1);
        return 'Active heroes gained 1 Power.';
      case 'championPower': {
        const champions = [...active].sort((a, b) => b.stats.power - a.stats.power).slice(0, 3);
        adjust(champions, 'power', 2);
        return 'The strongest heroes became even less relatable.';
      }
      case 'addDebt': {
        const hero = Phaser.Utils.Array.GetRandom(debtHeroes.length ? debtHeroes : active);
        if (hero) hero.stats.debt += 120;
        return hero ? `${hero.def.name} gained 120 Debt.` : '';
      }
      case 'addDebtLarge': {
        const hero = Phaser.Utils.Array.GetRandom(debtHeroes.length ? debtHeroes : active);
        if (hero) hero.stats.debt += 240;
        return hero ? `${hero.def.name} gained 240 premium-grade Debt.` : '';
      }
      case 'reduceDebt':
        adjust(debtHeroes, 'debt', -120);
        return 'Debt heroes briefly saw smaller numbers.';
      case 'shuffleDebt': {
        adjust(debtHeroes, 'debt', -30);
        const hero = Phaser.Utils.Array.GetRandom(debtHeroes);
        if (hero) hero.stats.debt += 150;
        return 'Debt was redistributed with administrative confidence.';
      }
      case 'premiumItem': {
        const hero = Phaser.Utils.Array.GetRandom(whales.length ? whales : active);
        const item = getRandomPremiumItem();
        if (hero && item) this.grantCatalogItem(hero, item);
        return hero && item ? `${hero.def.name} received ${item.name}.` : '';
      }
      case 'buildingProgress':
        for (const building of this.buildings.filter((entry) => entry.isPlaced)) {
          const runtime = this.getBuildingRuntime(building.id);
          runtime.upgradeProgress = Math.min(100, runtime.upgradeProgress + 8);
        }
        return 'Permits accelerated every placed building by 8%.';
      default:
        return '';
    }
  }

  runBuildingAction(token) {
    const [placeId, actionId] = String(token || '').split(':');
    const place = this.buildingById?.[placeId];
    const catalog = getBuildingCatalogEntry(placeId);
    const shopAction = catalog?.actions?.find((entry) => entry.id === actionId);
    if (!place?.isPlaced || !shopAction) return;
    const runtime = this.getBuildingRuntime(placeId);
    if (runtime.closed) {
      this.game.events.emit('gwg-event', `${place.name} is closed. The clerk found a locked door and a metaphor.`);
      this.showPlaceInspector(place);
      return;
    }
    runtime.actionDays = runtime.actionDays || {};
    if (runtime.actionDays[actionId] === this.day) {
      this.game.events.emit('gwg-event', `${shopAction.label} already ran today. The paperwork needs a nap.`);
      return;
    }
    if (this.resources.gold < shopAction.cost) {
      this.game.events.emit('gwg-event', `Not enough gold for ${shopAction.label}. The clerk recommends cheaper principles.`);
      return;
    }
    const deltas = {
      ...(shopAction.deltas || {}),
      gold: (shopAction.deltas?.gold || 0) - shopAction.cost,
    };
    runtime.actionDays[actionId] = this.day;
    this.applyDeltas(deltas);
    this.getBuildingRuntime(placeId).actionDays[actionId] = this.day;
    const heroResult = this.applyBuildingHeroEffect(shopAction.heroEffect, place);
    if (shopAction.special === 'scoutReveal') this.runPremiumScoutReveal();
    if (catalog.kind === 'shady') this.stats.premiumActions = (this.stats.premiumActions || 0) + 1;
    const text = `${place.name}: ${shopAction.label}. ${shopAction.summary} ${heroResult}`.trim();
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, catalog.kind === 'shady' ? 'golden_whale' : 'economy');
    this.floatDeltas(place.x, place.y - place.h - 10, deltas);
    this.recordBuildingUse(place.id);
    this.checkTownIdentity();
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  repairBuildingFromUi(id) {
    const place = this.buildingById?.[id];
    if (!place?.isPlaced) return;
    const runtime = this.getBuildingRuntime(id);
    if (runtime.health >= runtime.maxHealth && !runtime.damaged) return;
    if (runtime.repairAssignment?.status === 'working') {
      this.game.events.emit('gwg-event', `${place.name} already has a repair crew. Two heroes holding the same hammer did not improve throughput.`);
      return;
    }
    const cost = Math.max(1, runtime.repairCost || Math.ceil((runtime.maxHealth - runtime.health) * 0.65));
    if (this.resources.gold < cost) {
      this.game.events.emit('gwg-event', `${place.name} needs ${cost}g in repairs. Structural optimism is not legal tender.`);
      return;
    }
    const hero = this.getActiveHeroes()
      .filter((candidate) => candidate.state !== 'away' && candidate.state !== 'fighting' && !this.isHeroInjured(candidate))
      .sort((a, b) => Phaser.Math.Distance.Between(a.container.x, a.container.y, place.x, place.y)
        - Phaser.Math.Distance.Between(b.container.x, b.container.y, place.x, place.y))[0];
    if (!hero) {
      this.game.events.emit('gwg-event', `${place.name} needs a repair crew. Every available hero is currently monetizing a different emergency.`);
      return;
    }
    const woodCost = runtime.heavilyDamaged ? 2 : 1;
    const ironCost = runtime.heavilyDamaged ? 1 : 0;
    if ((this.townInventory.wood || 0) < woodCost || (this.townInventory.iron || 0) < ironCost) {
      this.game.events.emit('gwg-event', `${place.name} repair needs ${woodCost} wood${ironCost ? ` and ${ironCost} iron` : ''}. Structural optimism remains non-load-bearing.`);
      return;
    }
    this.applyDeltas({ gold: -cost });
    this.townInventory.wood -= woodCost;
    this.townInventory.iron -= ironCost;
    runtime.repairAssignment = { heroId: hero.def.id, heroName: hero.def.name, status: 'working', startedDay: this.day };
    this.addTownLog(`${hero.def.name} was assigned to repair ${place.name}. The invoice arrived before the hammer.`, 'economy');
    this.walkTo(hero, {
      ...place,
      intentAction: `Repairing ${place.name}`,
      reason: 'Monster damage reduced local capacity and service quality.',
      risk: 'Low',
    }, () => {
      if (!place.isPlaced || runtime.repairAssignment?.heroId !== hero.def.id) return;
      hero.state = 'interacting';
      hero.currentAction = `Repairing ${place.name}`;
      this.setHeroAnimationState(hero, 'interact');
      this.time.delayedCall(1200, () => {
        if (!place.isPlaced || runtime.repairAssignment?.heroId !== hero.def.id) return;
        runtime.health = runtime.maxHealth;
        runtime.damaged = false;
        runtime.heavilyDamaged = false;
        runtime.repairCost = 0;
        runtime.closed = false;
        runtime.repairAssignment = null;
        runtime.serviceQuality = Math.max(runtime.serviceQuality || 1, this.getPlaceLevel(place));
        this.refreshBuildingDamageVisual(place);
        hero.state = 'idle';
        hero.currentAction = 'Finished repairs';
        this.setHeroAnimationState(hero, 'happy');
        const text = `${hero.def.name} repaired ${place.name} for ${cost}g, ${woodCost} wood${ironCost ? `, and ${ironCost} iron` : ''}. The walls resumed pretending to be permanent.`;
        this.addTownLog(text, 'economy');
        this.game.events.emit('gwg-event', text);
        this.saveGame(false);
        this.showPlaceInspector(place);
      });
    });
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  convertPremiumSalvageFromUi() {
    const amount = Math.min(2, this.townInventory.premiumSalvage || 0);
    if (amount <= 0) return;
    this.townInventory.premiumSalvage -= amount;
    this.stats.resourcesSpent = (this.stats.resourcesSpent || 0) + amount;
    const gold = amount * 120;
    this.applyDeltas({ gold, corruption: amount * 4, trust: -amount });
    for (const hero of this.getActiveHeroes().filter((item) => item.stats.whaleAccess).slice(0, amount)) {
      hero.stats.power += 1;
      hero.stats.envy = Phaser.Math.Clamp((hero.stats.envy || 0) + 5, 0, 100);
    }
    const text = `Golden Whale processed ${amount} premium salvage into ${gold}g and several harder questions.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'golden_whale');
    this.addReportLine('economy', text);
    this.checkObjectives();
    this.saveGame(false);
    this.showPlaceInspector(this.buildingById.whale);
  }

  chooseBuildingSpecialization(token) {
    const [placeId, specId] = String(token || '').split(':');
    const place = this.buildingById?.[placeId];
    if (!place?.isPlaced) return;
    const runtime = this.getBuildingRuntime(placeId);
    if (runtime.specialization) {
      this.game.events.emit('gwg-event', `${place.name} is already specialized. The architect refuses identity churn.`);
      this.showPlaceInspector(place);
      return;
    }
    const spec = getBuildingSpecializations(placeId).find((entry) => entry.id === specId);
    if (!spec) return;
    const level = this.getPlaceLevel(place);
    if (level < (spec.minLevel || 2)) {
      this.game.events.emit('gwg-event', `${place.name} needs Level ${spec.minLevel || 2} before specializing. Ambition has prerequisites.`);
      this.showPlaceInspector(place);
      return;
    }
    runtime.specialization = spec.id;
    if (spec.effects?.dailyDeltas?.corruption || spec.effects?.dailyDeltas?.trust < 0) {
      this.stats.premiumActions = (this.stats.premiumActions || 0) + 1;
    }
    const text = `${place.name} specialized into ${spec.name}. ${spec.flavor || Phaser.Utils.Array.GetRandom(BUILDING_SATIRE_LINES.specialization)}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, place.id === 'whale' || spec.id.includes('premium') ? 'golden_whale' : 'upgrade');
    this.floatText(place.x, place.y - (place.h || 58) - 12, spec.name.toUpperCase(), place.id === 'whale' ? '#ffe08a' : '#7fdc93');
    this.updateTownReputationStats();
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  toggleBuildingOpenFromUi(id) {
    const place = this.buildingById?.[id];
    if (!place?.isPlaced) return;
    const runtime = this.getBuildingRuntime(id);
    runtime.closed = !runtime.closed;
    const text = runtime.closed
      ? `${place.name} closed temporarily. Upkeep relaxed; usefulness went home.`
      : `${place.name} reopened. The town resumes depending on it immediately.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.floatText(place.x, place.y - (place.h || 58) - 12, runtime.closed ? 'CLOSED' : 'OPEN', runtime.closed ? '#f0938f' : '#7fdc93');
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  postQuestFromUi(noticeId) {
    const quest = this.availableQuests.find((item) => item.noticeId === noticeId);
    if (!quest) return;
    this.postQuest(quest);
    this.showQuestInspector();
  }

  selectPlace(place) {
    this.clearSelection(false);
    this.selectedPlaceId = place.id;
    this.showPlaceLabel(place);
    const marker = this.add.graphics().setDepth(4990);
    const color = place.id === 'whale' ? 0xf6c945 : 0x7fdc93;
    if (this.useIsoRendering() && Number.isInteger(place.gridX) && Number.isInteger(place.gridY)) {
      const footprint = getBuildingCatalogEntry(place.id)?.footprint || place.footprint || { w: 1, h: 1 };
      this.drawPolygon(
        marker,
        this.getVisualFootprintPolygon(place.gridX, place.gridY, footprint),
        color,
        0.1,
        color,
        0.95,
        3,
      );
    } else {
      marker.lineStyle(3, color, 0.95);
      marker.strokeEllipse(place.x, place.y - (place.h || 60) / 2, (place.w || 70) + 26, (place.h || 60) + 22);
      marker.fillStyle(color, 0.12);
      marker.fillEllipse(place.x, place.y - (place.h || 60) / 2, (place.w || 70) + 26, (place.h || 60) + 22);
    }
    this.selectionMarker = marker;
    this.tweens.add({ targets: marker, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
  }

  selectHero(hero) {
    this.clearSelection(false);
    this.selectedHeroId = hero.def.id;
    const marker = this.add.ellipse(0, -2, 38, 15, 0xf6c945, 0.12)
      .setStrokeStyle(2, 0xf6c945, 0.96);
    hero.container.addAt(marker, 0);
    this.selectionMarker = marker;
    this.setHeroLabelFocus(hero, true);
    this.drawSelectedHeroIntentLine(hero);
    this.tweens.add({ targets: marker, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
  }

  clearSelection(clearInspector = true) {
    if (this.selectionMarker) {
      this.selectionMarker.destroy();
      this.selectionMarker = null;
    }
    if (this.heroIntentLine) {
      this.heroIntentLine.destroy();
      this.heroIntentLine = null;
    }
    if (this.extractionRouteLine) {
      this.extractionRouteLine.destroy();
      this.extractionRouteLine = null;
    }
    if (this.defenceCoverageOverlay) {
      this.defenceCoverageOverlay.destroy();
      this.defenceCoverageOverlay = null;
    }
    this.selectedPlaceId = null;
    this.selectedHeroId = null;
    this.resetAllPlaceLabels();
    for (const hero of this.heroes || []) this.setHeroLabelFocus(hero, false);
    if (clearInspector) {
      this.tooltipTarget = null;
      this.heroTooltipTarget = null;
      this.activeInspector = null;
    }
  }

  drawSelectedHeroIntentLine(hero) {
    if (!hero?.intent) return;
    this.heroIntentLine = this.add.graphics().setDepth(4690);
    this.updateSelectedHeroIntentLine();
  }

  drawExtractionRoute(place) {
    if (!this.getExtractionRuntime(place)) return;
    const target = this.getDeliveryTarget(place, EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)]?.resource);
    if (!target) return;
    this.extractionRouteLine = this.add.graphics().setDepth(4688);
    this.extractionRouteLine.lineStyle(2, 0x8fb7c9, 0.5);
    this.extractionRouteLine.lineBetween(place.x, place.y - 4, target.x, target.y - 4);
    this.extractionRouteLine.fillStyle(0x8fb7c9, 0.8);
    this.extractionRouteLine.fillCircle(target.x, target.y - 4, 4);
  }

  drawDefenceCoverage(place) {
    if (this.defenceCoverageOverlay) this.defenceCoverageOverlay.destroy();
    this.defenceCoverageOverlay = null;
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    const baseRanges = { watchtower: 430, guard_post: 270, frontier_outpost: 330, scout_post: 370 };
    if (!baseRanges[baseId]) return;
    const runtime = this.getBuildingRuntime(place.id);
    const damageFactor = runtime.heavilyDamaged ? 0.4 : runtime.damaged ? 0.68 : 1;
    const radius = (baseRanges[baseId] + Math.max(0, this.getPlaceLevel(place) - 1) * 45) * damageFactor;
    const overlay = this.add.graphics().setDepth(Math.max(1, place.y - 20));
    overlay.fillStyle(0x8fb7c9, 0.045);
    overlay.fillCircle(place.x, place.y, radius);
    overlay.lineStyle(2, runtime.damaged ? 0xe8a16f : 0x8fb7c9, 0.32);
    overlay.strokeCircle(place.x, place.y, radius);
    this.defenceCoverageOverlay = overlay;
  }

  getHeroIntentDestination(hero) {
    if (!hero?.destination && hero?.state !== 'walking') return null;
    if (Number.isFinite(hero.intent?.destinationX) && Number.isFinite(hero.intent?.destinationY)) {
      return { x: hero.intent.destinationX, y: hero.intent.destinationY };
    }
    const id = hero.intent?.destinationId || hero.destination;
    return this.doorById?.[id]
      || this.placeById?.[id]
      || this.aftermathDrops?.find((drop) => drop.id === id)
      || null;
  }

  updateSelectedHeroIntentLine() {
    if (!this.heroIntentLine || !this.selectedHeroId) return;
    const hero = this.heroes?.find((item) => item.def.id === this.selectedHeroId);
    const destination = this.getHeroIntentDestination(hero);
    this.heroIntentLine.clear();
    if (!hero?.container || !destination) return;
    if (Phaser.Math.Distance.Between(hero.container.x, hero.container.y, destination.x, destination.y) < 28) return;
    this.heroIntentLine.lineStyle(2, 0xffe08a, 0.46);
    this.heroIntentLine.beginPath();
    this.heroIntentLine.moveTo(hero.container.x, hero.container.y - 3);
    this.heroIntentLine.lineTo(destination.x, destination.y - 4);
    this.heroIntentLine.strokePath();
    this.heroIntentLine.fillStyle(0xffe08a, 0.72);
    this.heroIntentLine.fillCircle(destination.x, destination.y - 4, 4);
  }

  refreshActivePanel() {
    if (!this.activeInspector) return;
    if (this.activeInspector.type === 'ledger') this.openTownLedger();
    else if (this.activeInspector.type === 'build') this.openBuildMenu();
    else if (this.activeInspector.type === 'roads') this.openRoadMenu();
    else if (this.activeInspector.type === 'quests') this.showQuestInspector();
    else if (this.activeInspector.type === 'report') this.showCycleReport();
    else if (this.activeInspector.type === 'townlog') this.openTownLog();
    else if (this.activeInspector.type === 'help') this.openHelpPanel();
    else if (this.activeInspector.type === 'stores') this.openTownStoresPanel();
    else if (this.activeInspector.type === 'policies') this.showPolicyPanel();
    else if (this.activeInspector.type === 'loot') {
      const drop = this.aftermathDrops?.find((item) => item.id === this.activeInspector.id);
      if (drop) this.showLootInspector(drop);
    } else if (this.activeInspector.type === 'monster') {
      const actor = this.activeMonsterActors?.find((item) => item.id === this.activeInspector.id);
      if (actor) this.showMonsterInspector(actor);
    } else if (this.activeInspector.type === 'lair') {
      const lair = this.monsterLairs?.[this.activeInspector.id];
      if (lair) this.showLairInspector(lair);
    }
    else if (this.activeInspector.type === 'road') this.showRoadInspector(this.activeInspector.x, this.activeInspector.y);
    else if (this.activeInspector.type === 'onboarding') this.maybeShowOnboarding(true);
    else if (this.activeInspector.type === 'place') {
      const place = this.placeById?.[this.activeInspector.id];
      if (place) this.showPlaceInspector(place);
    } else if (this.activeInspector.type === 'hero') {
      const hero = this.heroes?.find((item) => item.def.id === this.activeInspector.id);
      if (hero) this.showHeroTooltip(hero);
    }
  }

  // --- tooltip ------------------------------------------------------------

  buildTooltip() {
    // ui_panel asset (nine-patch-ish stretch) replaces the drawn box when present
    this.tooltipPanelKey = resolveTexture(this, 'ui_panel');
    if (this.tooltipPanelKey) {
      this.tooltipPanel = this.add.image(0, 0, this.tooltipPanelKey)
        .setOrigin(0, 0).setDepth(5000);
    }
    this.tooltipBg = this.add.graphics().setDepth(5000);
    this.tooltipTitle = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f6c945',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setDepth(5001);
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#fff6dc',
      wordWrap: { width: 300 },
      lineSpacing: 5,
    }).setDepth(5001);
    this.tooltipEffects = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#d7f3d0',
      wordWrap: { width: 300 },
      lineSpacing: 4,
    }).setDepth(5001);
    this.tooltipUpgrade = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffe08a',
      wordWrap: { width: 300 },
      lineSpacing: 4,
    }).setDepth(5001);
    this.tooltipButton = this.add.rectangle(0, 0, 190, 36, 0x8a5a2b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf6c945)
      .setDepth(5001)
      .setInteractive({ useHandCursor: true });
    this.tooltipButtonLabel = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5002);
    this.tooltipButton.on('pointerover', () => this.tooltipButton.setFillStyle(0xa66f38));
    this.tooltipButton.on('pointerout', () => this.tooltipButton.setFillStyle(0x8a5a2b));
    this.tooltipButton.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.tryUpgradeTooltipTarget();
    });
    this.hideTooltip();

    // Empty-map dismissal happens on pointerup in setupCameraControls so a drag
    // can be distinguished from a tap.
  }

  getPlaceLevel(place) {
    if (!place || place.isPlaced === false) return 0;
    if (this.upgradeLevels[place.id]) return this.upgradeLevels[place.id];
    const parsed = Number(place.level);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  getUpgradeInfo(place) {
    const def = getUpgradeDef(place.id);
    const level = this.getPlaceLevel(place);
    const baseCost = place.upgradeCost ?? null;
    const cost = def ? getUpgradeCost(def, level) : (baseCost ? baseCost + (level - 1) * 80 : null);
    const flavor = def ? getUpgradeFlavor(def, level) : (place.upgradeFlavor || place.upgrade || null);
    const effect = def ? getUpgradeEffect(def, level) : place.effect;
    const nextEffect = def ? getUpgradeEffect(def, level + 1) : null;
    const maxed = def ? level >= def.maxLevel : (!cost || level >= 3);
    return { def, level, cost, flavor, effect, nextEffect, maxed };
  }

  getTooltipPosition(anchorX, anchorY, anchorH, tw, th) {
    const view = this.getVisibleWorldRect();
    const maxX = Math.max(view.left + 8, view.right - tw - 8);
    const maxY = Math.max(view.top + 48, view.bottom - th - 52);
    const x = Phaser.Math.Clamp(anchorX - tw / 2, view.left + 8, maxX);
    const preferredY = anchorY - anchorH - th - 10;
    const belowY = anchorY + 24;
    const y = preferredY < view.top + 48
      ? Phaser.Math.Clamp(belowY, view.top + 48, maxY)
      : Phaser.Math.Clamp(preferredY, view.top + 48, maxY);
    return { x, y };
  }

  showTooltip(b) {
    this.showPlaceInspector(b);
    return;
    if (!this.isLocationUnlocked(b.id)) {
      this.game.events.emit('gwg-event', `${b.name} is still locked. The town has not earned that problem yet.`);
      return;
    }
    this.heroTooltipTarget = null;
    this.tooltipTarget = b;
    const info = this.getUpgradeInfo(b);
    const level = `Level: ${info.level}${info.maxed ? ' (max)' : ''}`;
    const effect = info.effect ? `Effect: ${info.effect}` : null;
    const detailLines = [b.description, ...(b.tooltipLines || [])].filter(Boolean).slice(0, 4);
    const upgradeText = info.maxed
      ? 'Upgrade: maxed, allegedly balanced'
      : `Upgrade: ${info.cost}g - ${info.flavor || 'questionable improvements'}${info.nextEffect ? `\nNext: ${info.nextEffect}` : ''}`;

    this.tooltipTitle.setText(b.name);
    this.tooltipText.setText(detailLines.join('\n'));
    this.tooltipEffects.setText([level, effect].filter(Boolean).join('\n'));
    this.tooltipUpgrade.setText(upgradeText);

    const canUpgrade = Boolean(info.cost && !info.maxed);
    const canAfford = canUpgrade && this.resources.gold >= info.cost;
    this.tooltipButton.setVisible(canUpgrade);
    this.tooltipButtonLabel.setVisible(canUpgrade);
    if (canUpgrade) {
      this.tooltipButtonLabel.setText(canAfford ? `Upgrade ${info.cost}g` : `Need ${info.cost}g`);
      this.tooltipButton.setAlpha(canAfford ? 1 : 0.62);
      this.tooltipButtonLabel.setAlpha(canAfford ? 1 : 0.72);
    }

    const pad = 12;
    const gap = 7;
    const contentW = Math.max(
      220,
      this.tooltipTitle.width,
      this.tooltipText.width,
      this.tooltipEffects.width,
      this.tooltipUpgrade.width,
      canUpgrade ? this.tooltipButton.width : 0,
    );
    const tw = Math.min(340, contentW + pad * 2);
    const effectsH = this.tooltipEffects.text ? this.tooltipEffects.height + gap : 0;
    const buttonH = canUpgrade ? this.tooltipButton.height + gap : 0;
    const th = pad
      + this.tooltipTitle.height + gap
      + this.tooltipText.height + gap
      + effectsH
      + this.tooltipUpgrade.height
      + buttonH
      + pad;
    const { x, y } = this.getTooltipPosition(b.x, b.y, b.h || 60, tw, th);
    this.tooltipBounds = { x, y, w: tw, h: th };

    if (this.tooltipPanel) {
      this.tooltipPanel.setPosition(x, y).setDisplaySize(tw, th).setVisible(true);
    } else {
      this.tooltipBg.clear();
      this.tooltipBg.fillStyle(0x05070c, 0.42);
      this.tooltipBg.fillRoundedRect(x + 4, y + 4, tw, th, 6);
      this.tooltipBg.fillStyle(0x121a25, 0.98);
      this.tooltipBg.fillRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.lineStyle(2, 0xf6c945, 0.95);
      this.tooltipBg.strokeRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.setVisible(true);
    }

    let ty = y + pad;
    this.tooltipTitle.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipTitle.height + gap;
    this.tooltipText.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipText.height + gap;
    this.tooltipEffects.setPosition(x + pad, ty).setVisible(Boolean(this.tooltipEffects.text));
    ty += effectsH;
    this.tooltipUpgrade.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipUpgrade.height + gap;
    if (canUpgrade) {
      this.tooltipButton.setPosition(x + pad, ty).setVisible(true);
      this.tooltipButtonLabel.setPosition(x + pad + this.tooltipButton.width / 2, ty + this.tooltipButton.height / 2).setVisible(true);
    }

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(6500, () => this.hideTooltip());
  }

  hideTooltip() {
    if (this.tooltipPanel) this.tooltipPanel.setVisible(false);
    this.tooltipBg.setVisible(false);
    this.tooltipTitle.setVisible(false);
    this.tooltipText.setVisible(false);
    this.tooltipEffects.setVisible(false);
    this.tooltipUpgrade.setVisible(false);
    this.tooltipButton.setVisible(false);
    this.tooltipButton.disableInteractive();
    this.tooltipButtonLabel.setVisible(false);
    this.tooltipTarget = null;
    this.heroTooltipTarget = null;
    this.tooltipBounds = null;
    this.activeInspector = null;
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-close');
  }

  getHeroThought(hero) {
    const lines = [
      ...(hero.def.idleLines || []),
      hero.def.statLine,
    ].filter(Boolean);
    if (this.resources.trust < 30 && this.isHonestHero(hero.def)) return 'Thought: "Trust is not a purchasable stat."';
    if (this.resources.corruption > 70 && this.isDebtHero(hero.def)) return 'Thought: "My debt has a health bar now."';
    if (hero.stats.whaleAccess) return 'Thought: "Progression is a mindset, and mine is funded."';
    return `Thought: "${Phaser.Utils.Array.GetRandom(lines) || 'The economy is making eye contact.'}"`;
  }

  getHeroRelationshipLine(hero) {
    const relationships = this.getHeroRelationshipSummaries(hero);
    if (!relationships.length) return 'Relationships: no named grudge yet.';
    return relationships.slice(0, 2).map((entry) => `${entry.label}: ${entry.name}`).join(' / ');
  }

  getHeroById(id) {
    return this.heroes?.find((hero) => hero.def.id === id) || null;
  }

  getHeroProfile(hero) {
    if (!hero?.stats) return null;
    hero.stats.socialProfile = normalizeHeroProfile(hero.stats.socialProfile, {
      id: hero.def.id,
      name: hero.def.name,
      personality: hero.def.personality,
      stats: hero.stats,
    }, this.day);
    hero.stats.socialProfile.faction ||= chooseFaction(hero.stats.socialProfile);
    return hero.stats.socialProfile;
  }

  getHeroRelationshipSummaries(hero) {
    if (!hero) return [];
    return (this.heroes || [])
      .filter((other) => other !== hero)
      .map((other) => {
        const record = getRelationship(this.heroSocial, hero.def.id, other.def.id);
        const intensity = Math.max(
          Math.abs(record.friendship || 0), Math.abs(record.trust || 0),
          Math.abs(record.rivalry || 0), Math.abs(record.resentment || 0), Math.abs(record.debt || 0),
        );
        return { id: other.def.id, name: other.def.name, record, intensity, label: describeRelationship(record) };
      })
      .filter((entry) => entry.intensity >= 12)
      .sort((a, b) => b.intensity - a.intensity);
  }

  recordHeroRelationshipEvent(source, target, eventId, context = {}) {
    if (!source || !target || source === target) return null;
    const before = describeRelationship(getRelationship(this.heroSocial, source.def.id, target.def.id));
    const record = applyRelationshipEvent(this.heroSocial, source.def.id, target.def.id, eventId, {
      day: this.day,
      ...context,
    });
    if (!record) return null;
    const after = describeRelationship(record);
    if (['Competitive Rival', 'Bitter Rival', 'Friend', 'Trusted Companion', 'Public Enemy', 'Owes a Life Debt'].includes(after) && before !== after) {
      const text = `${source.def.name} now considers ${target.def.name} a ${after}. Social progress remains subject to loot allocation.`;
      recordSocialEvent(this.heroSocial, { day: this.day, type: 'relationship', heroIds: [source.def.id, target.def.id], text, major: true });
      this.addTownLog(text, 'npc');
      this.addReportLine('npc', text);
      this.game.events.emit('gwg-event', text);
    }
    if ((record.rivalry || 0) >= 40) source.stats.rivalId = target.def.id;
    if ((record.friendship || 0) >= 45 || (record.respect || 0) >= 60) source.stats.admiredId = target.def.id;
    if ((record.resentment || 0) >= 40) source.stats.resentmentTargetId = target.def.id;
    return record;
  }

  getPartyForHero(hero) {
    const partyId = this.getHeroProfile(hero)?.partyId;
    return partyId ? this.heroSocial.parties?.[partyId] || null : null;
  }

  refreshPartyCohesion(party) {
    if (!party) return null;
    const profiles = Object.fromEntries((this.heroes || []).map((hero) => [hero.def.id, this.getHeroProfile(hero)]));
    return computePartyCohesion(this.heroSocial, party, profiles);
  }

  createHeroParty(hero) {
    if (!hero || this.getPartyForHero(hero)) return null;
    const party = createParty(this.heroSocial, hero.def.id, [], this.day);
    party.name = `${hero.def.name.split(' ')[0]}'s Company`;
    this.getHeroProfile(hero).partyId = party.id;
    this.refreshPartyCohesion(party);
    const text = `${hero.def.name} formed ${party.name}. Membership includes shared danger and separately invoiced loot.`;
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'party', heroIds: [hero.def.id], text, major: true });
    this.addTownLog(text, 'npc');
    this.addReportLine('npc', text);
    return party;
  }

  inviteHeroToParty(party, inviter) {
    if (!party || party.memberIds.length >= party.maxSize) return null;
    const candidate = this.getActiveHeroes()
      .filter((hero) => !this.getHeroProfile(hero).partyId && hero !== inviter && !this.isHeroInjured(hero))
      .map((hero) => ({
        hero,
        score: (getRelationship(this.heroSocial, inviter.def.id, hero.def.id).friendship || 0)
          + (getRelationship(this.heroSocial, inviter.def.id, hero.def.id).respect || 0)
          + hero.stats.loyalty / 3,
      }))
      .sort((a, b) => b.score - a.score)[0]?.hero;
    if (!candidate) return null;
    party.memberIds.push(candidate.def.id);
    this.getHeroProfile(candidate).partyId = party.id;
    party.history = [...(party.history || []), `Day ${this.day}: ${candidate.def.name} joined.`].slice(-16);
    this.recordHeroRelationshipEvent(candidate, inviter, 'quest_success', { text: 'Accepted an invitation to adventure together.', severity: 1 });
    this.refreshPartyCohesion(party);
    const text = `${candidate.def.name} joined ${party.name}. The waiver became a group document.`;
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'party', heroIds: [inviter.def.id, candidate.def.id], text, major: true });
    this.addTownLog(text, 'npc');
    return candidate;
  }

  startMentorship(mentor) {
    const mentorProfile = this.getHeroProfile(mentor);
    if (!mentor || this.isHeroInjured(mentor) || getCareerStage(mentorProfile).contractTier < 2) return false;
    const junior = this.getActiveHeroes()
      .filter((hero) => hero !== mentor && !this.isHeroInjured(hero) && !this.getHeroProfile(hero).mentorId)
      .sort((a, b) => (a.stats.power || 0) - (b.stats.power || 0))[0];
    const training = this.doorById.training || this.doorById.guildhall;
    if (!junior || !training) return false;
    const juniorProfile = this.getHeroProfile(junior);
    juniorProfile.mentorId = mentor.def.id;
    if (!mentorProfile.studentIds.includes(junior.def.id)) mentorProfile.studentIds.push(junior.def.id);
    mentor.currentAction = `Mentoring ${junior.def.name}`;
    junior.currentAction = `Training with ${mentor.def.name}`;
    const finish = () => {
      if (!mentor.container?.active || !junior.container?.active) return;
      junior.stats.power += 1;
      junior.stats.morale = Phaser.Math.Clamp(junior.stats.morale + 3, 0, 100);
      mentor.stats.fame = Phaser.Math.Clamp((mentor.stats.fame || 0) + 2, 0, 100);
      mentorProfile.career.mentorships += 1;
      this.recordHeroRelationshipEvent(junior, mentor, 'mentorship', { location: 'Training Yard' });
      this.recordHeroRelationshipEvent(mentor, junior, 'mentorship', { location: 'Training Yard' });
      const text = `${mentor.def.name} trained ${junior.def.name}. The lesson contained actual experience and only one disclaimer.`;
      recordSocialEvent(this.heroSocial, { day: this.day, type: 'mentorship', heroIds: [mentor.def.id, junior.def.id], text, major: true });
      this.addTownLog(text, 'npc');
      this.addReportLine('npc', text);
      this.say(junior, 'I learned something!', true);
      this.scheduleAmbient(mentor, 2200);
      this.scheduleAmbient(junior, 2600);
      this.publishHeroRoster();
    };
    this.walkTo(mentor, { ...training, intentAction: `Mentoring ${junior.def.name}`, reason: 'Formal mentorship session.', risk: 'Low' });
    this.walkTo(junior, { ...training, intentAction: `Training with ${mentor.def.name}`, reason: 'Learning from an experienced hero.', risk: 'Low' }, finish);
    return true;
  }

  runHeroSocialActionFromUi(token) {
    const [heroId, action] = String(token || '').split(':');
    const hero = this.getHeroById(heroId);
    if (!hero) return;
    const profile = this.getHeroProfile(hero);
    const party = this.getPartyForHero(hero);
    if (action === 'create-party') this.createHeroParty(hero);
    else if (action === 'invite-party') this.inviteHeroToParty(party, hero);
    else if (action === 'mentor') {
      if (!this.startMentorship(hero)) this.game.events.emit('gwg-event', 'Mentorship requires an experienced, healthy mentor and an available junior.');
    } else if (action === 'promise-equipment') {
      profile.contract.promises.push({ id: `equipment-${this.day}`, type: 'equipment', madeDay: this.day, dueDay: this.day + 5, fulfilled: false });
      this.addHeroHistory(hero, 'The guild promised better equipment. The promise now has a due date.');
    } else if (action === 'renegotiate') {
      const cost = 45 + profile.contract.tier * 35;
      if (this.resources.gold < cost) this.game.events.emit('gwg-event', `Renegotiation costs ${cost}g. Respect remains outside the current budget.`);
      else {
        this.applyDeltas({ gold: -cost, trust: 1 });
        hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + 12, 0, 100);
        profile.contract.satisfaction = Phaser.Math.Clamp(profile.contract.satisfaction + 18, 0, 100);
        profile.contract.grievances = profile.contract.grievances.slice(-5);
        this.addHeroHistory(hero, `Contract renegotiated for ${cost}g.`);
      }
    } else if (action === 'bonus') {
      if (this.resources.gold < 100) this.game.events.emit('gwg-event', 'A recognition bonus requires 100g and one functioning signature.');
      else {
        this.applyDeltas({ gold: -100, morale: 1 });
        hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + 8, 0, 100);
        hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + 4, 0, 100);
        profile.contract.satisfaction = Phaser.Math.Clamp(profile.contract.satisfaction + 12, 0, 100);
        profile.achievements.push(`Recognized publicly on Day ${this.day}`);
      }
    } else if (action === 'promote') this.evaluateHeroCareer(hero, true);
    else if (action === 'release') this.leaveHeroPermanently(hero, 'Released from the Guild by mutual paperwork.');
    this.refreshAllPartyCohesion();
    this.publishHeroRoster();
    this.saveGame(false);
    if (hero.stats.active !== false || hero.stats.deathDay) this.showHeroInspector(hero);
  }

  runPartyActionFromUi(token) {
    const [partyId, action] = String(token || '').split(':');
    const party = this.heroSocial.parties?.[partyId];
    if (!party) return;
    if (action === 'loot') cyclePartyPolicy(party, 'lootPolicy', LOOT_POLICIES);
    else if (action === 'risk') cyclePartyPolicy(party, 'riskPolicy', RISK_POLICIES);
    else if (action === 'defend') {
      const threats = (this.activeMonsterActors || []).filter((actor) => actor.container?.active).slice(0, 3);
      const members = party.memberIds.map((id) => this.getHeroById(id)).filter((hero) => hero?.stats.active !== false && !this.isHeroInjured(hero));
      if (!threats.length) this.game.events.emit('gwg-event', `${party.name} found no active monster. Defensive readiness became a group walk.`);
      members.slice(0, Math.max(1, threats.length)).forEach((hero, index) => {
        const threat = threats[index % Math.max(1, threats.length)];
        if (threat) this.dispatchHeroToMonster(threat, hero, true, `${party.name} town defence order.`);
      });
      party.currentAssignment = { type: 'defence', day: this.day, name: 'Town Defence' };
    } else if (action === 'patrol') {
      const members = party.memberIds.map((id) => this.getHeroById(id)).filter((hero) => hero?.stats.active !== false && !this.isHeroInjured(hero));
      members.slice(0, 3).forEach((hero) => {
        const spot = this.getExplorationSpot(hero);
        this.walkTo(hero, { ...spot, intentAction: `Patrolling frontier with ${party.name}`, reason: 'Persistent party patrol order.', risk: party.riskPolicy === 'bold' ? 'High' : 'Moderate' });
      });
      party.currentAssignment = { type: 'patrol', day: this.day, name: 'Frontier Patrol' };
    }
    else if (action === 'disband') {
      for (const id of party.memberIds) {
        const hero = this.getHeroById(id);
        if (hero) this.getHeroProfile(hero).partyId = null;
      }
      recordSocialEvent(this.heroSocial, { day: this.day, type: 'party', heroIds: party.memberIds, text: `${party.name} disbanded. The shared tab remains active.`, major: true });
      delete this.heroSocial.parties[partyId];
    }
    this.refreshPartyCohesion(party);
    this.publishHeroRoster();
    this.saveGame(false);
    const leader = this.getHeroById(party.leaderId);
    if (leader && this.heroSocial.parties?.[partyId]) this.showHeroInspector(leader);
  }

  refreshAllPartyCohesion() {
    for (const party of Object.values(this.heroSocial.parties || {})) this.refreshPartyCohesion(party);
  }

  evaluateHeroCareer(hero, manual = false) {
    const profile = this.getHeroProfile(hero);
    const previousId = profile.careerStage;
    const stage = getCareerStage(profile);
    if (stage.id === previousId) {
      if (manual) this.game.events.emit('gwg-event', `${hero.def.name} needs more quests, rescues, victories, or lair work before promotion.`);
      return false;
    }
    profile.careerStage = stage.id;
    profile.level = Math.max(profile.level + 1, stage.contractTier);
    profile.contract.tier = stage.contractTier;
    hero.stats.power += 1;
    hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + 5, 0, 100);
    profile.influence = Phaser.Math.Clamp(profile.influence + stage.contractTier * 4, 0, 100);
    const text = `${hero.def.name} was promoted to ${stage.name}. Their salary expectations were promoted as well.`;
    profile.achievements.push(text);
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'promotion', heroIds: [hero.def.id], text, major: true });
    this.addHeroHistory(hero, text);
    this.addTownLog(text, 'npc');
    this.addReportLine('npc', text);
    this.game.events.emit('gwg-event', text);
    return true;
  }

  retireHero(hero, reason) {
    if (!hero || hero.stats.deathDay || hero.stats.active === false) return false;
    const profile = this.getHeroProfile(hero);
    profile.status = 'retired';
    profile.retirementRole = profile.studentIds.length ? 'Guild Mentor' : profile.influence >= 45 ? 'Guild Advisor' : 'Named Resident';
    hero.stats.active = false;
    hero.stats.status = 'Retired';
    hero.currentAction = profile.retirementRole;
    hero.container.setVisible(false);
    const record = { heroId: hero.def.id, name: hero.def.name, day: this.day, role: profile.retirementRole, reason, careerStage: profile.careerStage };
    this.heroSocial.retirements = [...this.heroSocial.retirements, record].slice(-30);
    const text = `${hero.def.name} retired as ${profile.retirementRole}. ${reason}`;
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'retirement', heroIds: [hero.def.id], text, major: true });
    this.addTownLog(text, 'npc');
    this.addReportLine('npc', text);
    return true;
  }

  handleHeroDeathLegacy(hero, reason) {
    const profile = this.getHeroProfile(hero);
    profile.status = 'dead';
    profile.careerStage = 'fallen';
    const relationships = this.getHeroRelationshipSummaries(hero);
    const memorial = {
      heroId: hero.def.id,
      name: hero.def.name,
      day: this.day,
      cause: reason,
      careerStage: getCareerStage({ ...profile, status: 'active' }).name,
      friends: relationships.filter((entry) => ['Friend', 'Trusted Companion'].includes(entry.label)).map((entry) => entry.id),
      rivals: relationships.filter((entry) => /Rival|Enemy/.test(entry.label)).map((entry) => entry.id),
      achievements: profile.achievements.slice(-6),
      buried: false,
      epitaph: `Here lies ${hero.def.name}. The town checked the loot table before the flowers.`,
    };
    this.heroSocial.memorials[hero.def.id] = memorial;
    for (const friendId of memorial.friends) {
      const friend = this.getHeroById(friendId);
      if (!friend) continue;
      friend.stats.morale = Phaser.Math.Clamp(friend.stats.morale - 10, 0, 100);
      friend.stats.loyalty = Phaser.Math.Clamp(friend.stats.loyalty - 5, 0, 100);
      this.getHeroProfile(friend).contract.grievances.push(`Mourning ${hero.def.name}, lost on Day ${this.day}.`);
    }
    const party = this.getPartyForHero(hero);
    if (party) {
      party.casualties += 1;
      party.history.push(`Day ${this.day}: ${hero.def.name} fell.`);
      party.memberIds = party.memberIds.filter((id) => id !== hero.def.id);
      if (party.leaderId === hero.def.id) party.leaderId = party.memberIds[0] || null;
      this.refreshPartyCohesion(party);
    }
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'legacy', heroIds: [hero.def.id, ...memorial.friends], text: `${hero.def.name} entered the Hall of Records. Accountability arrived shortly afterward.`, major: true });
  }

  updateHeroSocialSystems() {
    if (this.heroSocial.lastSocialDay === this.day) return;
    this.heroSocial.lastSocialDay = this.day;
    fadeMinorRelationships(this.heroSocial, this.day);
    const lodging = this.getLodgingReport();
    for (const hero of this.heroes || []) {
      const profile = this.getHeroProfile(hero);
      if (hero.stats.deathDay || profile.status === 'retired') continue;
      profile.wealth = hero.stats.gold || 0;
      profile.localReputation = Phaser.Math.Clamp((hero.stats.fame || 0) - (hero.stats.resentment || 0) / 3, -100, 100);
      profile.influence = Phaser.Math.Clamp((hero.stats.fame || 0) * 0.55 + profile.level * 3, 0, 100);
      profile.faction = chooseFaction(profile);
      profile.contract.expectations = getHeroExpectations(profile, normalizeHeroEquipment(hero.stats.equipment), lodging);
      const unmet = profile.contract.expectations.length;
      profile.contract.unmetDays = unmet ? profile.contract.unmetDays + 1 : 0;
      profile.contract.satisfaction = Phaser.Math.Clamp(profile.contract.satisfaction + (unmet ? -Math.min(4, unmet) : 2), 0, 100);
      for (const promise of profile.contract.promises) {
        if (promise.fulfilled) continue;
        const equipment = normalizeHeroEquipment(hero.stats.equipment);
        if (promise.type === 'equipment' && equipment.weapon !== 'Poor') {
          promise.fulfilled = true;
          hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + 8, 0, 100);
          this.addTownLog(`${hero.def.name}'s equipment promise was fulfilled. The ledger appeared briefly sincere.`, 'npc');
        } else if (this.day > promise.dueDay && !promise.broken) {
          promise.broken = true;
          hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - 14, 0, 100);
          profile.contract.grievances.push(`Broken ${promise.type} promise from Day ${promise.madeDay}.`);
          recordSocialEvent(this.heroSocial, { day: this.day, type: 'contract', heroIds: [hero.def.id], text: `${hero.def.name}'s promised ${promise.type} expired into a grievance.`, major: true });
        }
      }
      if (profile.contract.satisfaction < 28 || hero.stats.loyalty < 24) {
        if (!profile.contract.warningDay || this.day - profile.contract.warningDay >= 4) {
          profile.contract.warningDay = this.day;
          const reason = profile.contract.grievances.at(-1) || profile.contract.expectations[0] || 'general guild conduct';
          const text = `${hero.def.name} is considering leaving: ${reason}. Renegotiation is still possible.`;
          this.addTownLog(text, 'npc');
          this.addReportLine('warnings', text);
          recordSocialEvent(this.heroSocial, { day: this.day, type: 'departure-warning', heroIds: [hero.def.id], text, major: true });
        }
      }
      if (profile.contract.warningDay && this.day - profile.contract.warningDay >= 5 && hero.stats.loyalty < 10 && this.day > 10) {
        this.leaveHeroPermanently(hero, profile.contract.grievances.at(-1) || 'Contract expectations remained unmet.');
        profile.status = 'departed';
        profile.departureReason = profile.contract.grievances.at(-1) || 'Unmet expectations';
        continue;
      }
      profile.retirementTendency = Phaser.Math.Clamp(
        profile.retirementTendency + (profile.career.injuries || 0) * 0.2 + (profile.careerStage === 'legend' ? 2 : 0), 0, 100,
      );
      if (this.day > 28 && profile.retirementTendency >= 78 && hero.stats.loyalty >= 35 && Math.random() < 0.08) {
        this.retireHero(hero, 'Their memoir found a publisher before the next lair did.');
        continue;
      }
      this.evaluateHeroCareer(hero);
    }
    this.refreshAllPartyCohesion();
    this.maybeRunSocialEvent();
  }

  maybeRunSocialEvent() {
    if (this.day < 3 || this.day - (this.heroSocial.events.at(-1)?.day || 0) < 2 || Math.random() > 0.42) return;
    const active = this.getActiveHeroes();
    if (active.length < 2) return;
    const pairs = active.flatMap((hero, index) => active.slice(index + 1).map((other) => ({ hero, other })));
    const pair = pairs
      .map((entry) => ({ ...entry, record: getRelationship(this.heroSocial, entry.hero.def.id, entry.other.def.id) }))
      .sort((a, b) => Math.max(b.record.friendship || 0, b.record.rivalry || 0, b.record.resentment || 0)
        - Math.max(a.record.friendship || 0, a.record.rivalry || 0, a.record.resentment || 0))[0];
    if (!pair) return;
    let text;
    if ((pair.record.friendship || 0) >= 35) {
      text = `${pair.hero.def.name} and ${pair.other.def.name} shared a Tavern table and several legally distinct memories.`;
      this.recordHeroRelationshipEvent(pair.hero, pair.other, 'loot_shared', { text: 'Spent peaceful time together.', severity: 1, reciprocal: true });
    } else if ((pair.record.rivalry || 0) >= 30 || (pair.record.resentment || 0) >= 30) {
      text = `${pair.hero.def.name} challenged ${pair.other.def.name}'s record. The scoreboard requested mediation.`;
      pair.hero.stats.morale = Phaser.Math.Clamp(pair.hero.stats.morale - 1, 0, 100);
    } else {
      text = `${pair.hero.def.name} and ${pair.other.def.name} compared quest scars. Both claimed theirs had better rarity.`;
      this.recordHeroRelationshipEvent(pair.hero, pair.other, 'quest_success', { text: 'Compared field experience.', severity: 1, reciprocal: true });
    }
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'social', heroIds: [pair.hero.def.id, pair.other.def.id], text });
    this.addTownLog(text, 'npc');
  }

  getHeroActionText(hero) {
    if (hero.currentAction) return hero.currentAction;
    if (hero.state === 'away') return `Away until Day ${hero.awayUntil}`;
    if (hero.destination) return `Walking to ${this.getPlaceName(hero.destination)}`;
    return `Idle near ${this.getPlaceName(hero.at)}`;
  }

  getHeroDestinationReason(hero, spot) {
    const id = spot?.id || '';
    if (/wilderness|frontier|poi|camp|ruins|cave|pit/i.test(id) || spot?.explore) return 'Exploring fog edge for loot, danger, and narrative liability.';
    if (id === 'tavern' || id === 'inn' || id === 'hero_hostel') return hero?.stats?.morale < 48 ? 'Needs rest and a chair with legal padding.' : 'Social visit.';
    if (id === 'blacksmith') return 'Needs gear access.';
    if (id === 'training' || id === 'arena') return 'Training for honest progress.';
    if (id === 'whale' || id === 'vip_rope_entrance' || id === 'vip_lounge') return 'Premium temptation detected.';
    if (id === 'market') return 'Converting loot, gossip, or both.';
    if (id === 'dungeon') return 'Responding to threat pressure.';
    if (id === 'complaint_barrel' || id === 'hero_union_tent') return 'Needs approved complaint infrastructure.';
    if (id === 'loot') return 'Greedy opportunity.';
    return 'Routine wandering between questionable services.';
  }

  getHeroDestinationRisk(hero, spot) {
    const areaRep = this.getAreaReputation(spot?.areaId || spot?.id || 'frontier');
    if (spot?.risk) return spot.risk;
    if (spot?.monster || /wilderness|frontier|camp|ruins|cave|pit|dungeon/i.test(spot?.id || '')) {
      const danger = this.resources.threat + areaRep + (this.isHeroInjured(hero) ? 20 : 0);
      if (danger >= 100) return 'Extreme';
      if (danger >= 70) return 'High';
      if (danger >= 42) return 'Moderate';
      return 'Low';
    }
    return 'Low';
  }

  getHeroIntentLines(hero) {
    const intent = hero.intent || {};
    return [
      `Action: ${this.getHeroActionText(hero)}`,
      `Destination: ${intent.destinationName || this.getPlaceName(hero.destination || hero.at)}`,
      `Reason: ${intent.reason || this.getHeroDestinationReason(hero, { id: hero.destination || hero.at })}`,
      `Risk: ${intent.risk || 'Low'}`,
    ];
  }

  getPlaceName(id) {
    return this.placeById?.[id]?.name || this.decorationById?.[id]?.name || id || 'town';
  }

  getOperationalPlace(id) {
    const place = this.placeById?.[id];
    const roadAccess = place ? this.getBuildingRoadAccess(place) : { connected: true };
    const runtime = getBuildingCatalogEntry(id) ? this.getBuildingRuntime(id) : null;
    if (place?.isPlaced !== false && this.isLocationUnlocked(id) && roadAccess.connected && !runtime?.closed) return place;
    return this.buildingById?.guildhall || place;
  }

  getHeroTierIndex(hero) {
    const label = `${hero?.stats?.status || ''} ${hero?.stats?.currentPersonality || ''}`;
    if (/Whale Champion|Sponsored Hero/i.test(label)) return 4;
    if (/Champion|Town Legend/i.test(label)) return 3;
    if (/Veteran|Mentor|Leader|Prophet/i.test(label)) return 2;
    if (/Regular|Grinder|Optimist|Clerk|Merchant/i.test(label)) return 1;
    return 0;
  }

  getHeroEquipmentBonus(hero) {
    const equipment = normalizeHeroEquipment(hero?.stats?.equipment);
    return {
      power: (EQUIPMENT_QUALITY[equipment.weapon]?.power || 0) + (equipment.premium ? 2 : 0),
      armor: EQUIPMENT_QUALITY[equipment.armor]?.armor || 0,
      readiness: equipment.readiness || 0,
    };
  }

  getEquipmentQualityForTown() {
    const rank = this.getTownRankSnapshot().index;
    if (rank >= 4) return 'Excellent';
    if (rank >= 2) return 'Good';
    return 'Common';
  }

  equipHeroBest(hero, quiet = false) {
    if (!hero || hero.stats.active === false || hero.stats.deathDay) return false;
    const equipment = normalizeHeroEquipment(hero.stats.equipment);
    const quality = this.getEquipmentQualityForTown();
    let changed = false;
    if ((this.townInventory.weapons || 0) > 0 && equipment.weapon === 'Poor') {
      this.townInventory.weapons -= 1;
      equipment.weapon = quality;
      changed = true;
    }
    if ((this.townInventory.armor || 0) > 0 && equipment.armor === 'Poor') {
      this.townInventory.armor -= 1;
      equipment.armor = quality;
      changed = true;
    }
    if ((this.townInventory.potions || 0) > 0 && equipment.potions < 1) {
      this.townInventory.potions -= 1;
      equipment.potions += 1;
      changed = true;
    }
    if (
      (hero.stats.whaleAccess || this.getHeroTierIndex(hero) >= 4)
      && (this.townInventory.premiumComponents || 0) > 0
      && equipment.weapon !== 'Premium'
    ) {
      this.townInventory.premiumComponents -= 1;
      equipment.weapon = 'Premium';
      equipment.premium = true;
      hero.stats.envy = Phaser.Math.Clamp((hero.stats.envy || 0) + 8, 0, 100);
      this.applyDeltas({ corruption: 1, trust: -1 });
      changed = true;
    }
    hero.stats.equipment = normalizeHeroEquipment(equipment);
    if (changed && !quiet) {
      const text = `${hero.def.name} equipped the best available town supplies. The armory called this allocation; everyone else called dibs.`;
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'npc');
    }
    return changed;
  }

  equipHeroFromUi(heroId) {
    const hero = this.heroes?.find((item) => item.def.id === heroId);
    if (!hero) return;
    if (!this.equipHeroBest(hero)) this.game.events.emit('gwg-event', 'No useful equipment available. The Guild Hall issued encouragement instead.');
    this.saveGame(false);
    this.showHeroInspector(hero);
  }

  equipAllHeroesFromUi() {
    let equipped = 0;
    for (const hero of this.getActiveHeroes().sort((a, b) => this.getHeroTierIndex(b) - this.getHeroTierIndex(a))) {
      if (this.equipHeroBest(hero, true)) equipped += 1;
    }
    const text = equipped
      ? `Equipped ${equipped} hero${equipped === 1 ? '' : 'es'} from town stores. Procurement briefly resembled governance.`
      : 'No heroes could use the current supply stock.';
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
    if (this.activeInspector?.type === 'place' && this.buildingById[this.activeInspector.id]) this.showPlaceInspector(this.buildingById[this.activeInspector.id]);
  }

  getHeroSupplyLines(hero) {
    const equipment = normalizeHeroEquipment(hero.stats.equipment);
    const tier = this.getHeroTierIndex(hero);
    const needs = [];
    if (equipment.weapon === 'Poor') needs.push('weapon');
    if (tier >= 2 && equipment.armor === 'Poor') needs.push('armor');
    if (this.isHeroInjured(hero) && equipment.potions <= 0) needs.push('potion');
    return [
      `Weapon: ${equipment.weapon} (+${EQUIPMENT_QUALITY[equipment.weapon]?.power || 0} power)`,
      `Armor: ${equipment.armor} (-${EQUIPMENT_QUALITY[equipment.armor]?.armor || 0} injury pressure)`,
      `Carried potions: ${equipment.potions}/3`,
      `Readiness: ${equipment.readiness}/100`,
      needs.length
        ? { text: `Requests: ${needs.join(', ')}. Unmet expectations reduce morale and retention.`, className: 'gwg-bad' }
        : { text: 'Supply needs met for current tier.', className: 'gwg-good' },
    ];
  }

  getHeroInspectorPayload(hero) {
    const whaleAccess = hero.stats.whaleAccess ? 'Yes' : (hero.stats.debt > 250 ? 'Technically' : 'No');
    const history = (hero.stats.history || []).slice(-5).reverse();
    const inventory = Array.isArray(hero.stats.inventory) ? hero.stats.inventory : [];
    const profile = this.getHeroProfile(hero);
    const stage = getCareerStage(profile);
    const party = this.getPartyForHero(hero);
    const relationships = this.getHeroRelationshipSummaries(hero);
    const strongestFriend = relationships.find((entry) => ['Friend', 'Trusted Companion'].includes(entry.label));
    const strongestRival = relationships.find((entry) => /Rival|Enemy|Grudge/.test(entry.label));
    const nextStage = CAREER_STAGES[Math.min(CAREER_STAGES.length - 1, Math.max(0, CAREER_STAGES.findIndex((entry) => entry.id === profile.careerStage) + 1))];
    const socialActions = hero.stats.deathDay || profile.status === 'retired' ? [] : [
      { label: 'Assign Quest', event: 'gwg-open-quests', id: hero.def.id },
      { label: 'Assign Defence', event: 'gwg-open-defense-alerts', id: hero.def.id },
      { label: party ? 'Invite Available Hero' : 'Create Party', event: 'gwg-hero-social-action', id: `${hero.def.id}:${party ? 'invite-party' : 'create-party'}`, disabled: party ? party.memberIds.length >= party.maxSize : false },
      { label: 'Assign Mentor Session', event: 'gwg-hero-social-action', id: `${hero.def.id}:mentor` },
      { label: 'Promise Equipment', event: 'gwg-hero-social-action', id: `${hero.def.id}:promise-equipment` },
      { label: 'Renegotiate Contract', event: 'gwg-hero-social-action', id: `${hero.def.id}:renegotiate` },
      { label: 'Award 100g Recognition', event: 'gwg-hero-social-action', id: `${hero.def.id}:bonus`, disabled: this.resources.gold < 100 },
      { label: 'Review Promotion', event: 'gwg-hero-social-action', id: `${hero.def.id}:promote` },
      { label: 'Release from Guild', event: 'gwg-hero-social-action', id: `${hero.def.id}:release`, className: 'gwg-danger-action' },
    ];
    const partyActions = party ? [
      { label: 'Defend Town', event: 'gwg-party-action', id: `${party.id}:defend` },
      { label: 'Patrol Frontier', event: 'gwg-party-action', id: `${party.id}:patrol` },
      { label: `Loot: ${LOOT_POLICIES.find((item) => item.id === party.lootPolicy)?.name || 'Equal Shares'}`, event: 'gwg-party-action', id: `${party.id}:loot` },
      { label: `Risk: ${RISK_POLICIES.find((item) => item.id === party.riskPolicy)?.name || 'Balanced'}`, event: 'gwg-party-action', id: `${party.id}:risk` },
      { label: 'Disband Party', event: 'gwg-party-action', id: `${party.id}:disband`, className: 'gwg-danger-action' },
    ] : [];
    return {
      title: hero.def.name,
      subtitle: `${stage.name} - ${profile.archetype} - ${hero.stats.status || hero.def.personality}`,
      primaryActions: [
        { label: 'Equip Best Available', event: 'gwg-equip-hero', id: hero.def.id },
        {
          label: hero.stats.favorite ? 'Unfavorite Hero' : 'Favorite Hero',
          event: 'gwg-toggle-hero-favorite',
          id: hero.def.id,
          className: hero.stats.favorite ? 'gwg-favorite-action active' : 'gwg-favorite-action',
        },
        ...socialActions,
        ...partyActions,
      ],
      sections: [
        {
          title: 'Identity',
          lines: [
            `Originally: ${hero.stats.originalPersonality || hero.def.personality}`,
            `Current: ${hero.stats.currentPersonality || hero.stats.status || hero.def.personality}`,
            `Origin: ${profile.origin}`,
            `Career: Level ${profile.level} ${stage.name}`,
            `Faction: ${profile.faction}`,
            `Mood: ${hero.stats.currentMood || 'Wary'}`,
            ...this.getHeroIntentLines(hero),
          ],
        },
        {
          title: 'Stats',
          lines: [
            `Power: ${hero.stats.power}`,
            `Morale: ${hero.stats.morale}`,
            `Debt: ${hero.stats.debt}`,
            `Loyalty: ${hero.stats.loyalty}`,
            `Corruption: ${hero.stats.corruption || 0}`,
            `Fame: ${hero.stats.fame || 0}`,
            `Resentment: ${hero.stats.resentment || 0}`,
            `Envy: ${hero.stats.envy || 0}`,
            `Whale Access: ${whaleAccess}`,
            `Cycles Active: ${hero.stats.cyclesActive || 0}`,
            `Injury: ${this.isHeroInjured(hero) ? hero.stats.injuryState || 'injured' : 'healthy'}`,
            `Animation: ${hero.animationState || 'idle'}${hero.hasStateFrames ? ' (state frames)' : ' (static fallback)'}`,
            this.getHeroRelationshipLine(hero),
          ],
        },
        {
          title: 'Relationships',
          lines: [
            strongestFriend ? `Closest companion: ${strongestFriend.name} (${strongestFriend.label})` : 'Closest companion: none yet',
            strongestRival ? `Strongest conflict: ${strongestRival.name} (${strongestRival.label})` : 'Strongest conflict: none yet',
            profile.mentorId ? `Mentor: ${this.getHeroById(profile.mentorId)?.def.name || 'departed mentor'}` : 'Mentor: none',
            profile.studentIds.length ? `Students: ${profile.studentIds.map((id) => this.getHeroById(id)?.def.name || id).join(', ')}` : 'Students: none',
            ...relationships.slice(0, 4).map((entry) => {
              const latest = entry.record.memories?.at(-1);
              return `${entry.name}: ${entry.label}${latest ? ` - ${latest.text}` : ''}`;
            }),
          ],
        },
        ...(party ? [{
          title: `Party - ${party.name}`,
          lines: [
            `Leader: ${this.getHeroById(party.leaderId)?.def.name || 'vacant'}`,
            `Members: ${party.memberIds.map((id) => this.getHeroById(id)?.def.name || id).join(', ')}`,
            `Cohesion: ${party.cohesion}/100 (${getPartyBonus(party).label})`,
            ...party.cohesionReasons,
            `Loot policy: ${LOOT_POLICIES.find((item) => item.id === party.lootPolicy)?.name}`,
            `Risk policy: ${RISK_POLICIES.find((item) => item.id === party.riskPolicy)?.name}`,
            `Record: ${party.victories} victories / ${party.failures} failures / ${party.casualties} casualties`,
          ],
        }] : []),
        {
          title: 'Career Record',
          lines: [
            `Quests: ${profile.career.quests} completed / ${profile.career.failures} failed`,
            `Combat: ${profile.career.kills} kills / ${profile.career.rescues} rescues / ${profile.career.injuries} injuries`,
            `Guild work: ${profile.career.buildingsDefended} buildings defended / ${profile.career.lairsCleared} lairs cleared`,
            nextStage.id !== profile.careerStage ? `Next title: ${nextStage.name} at career score ${nextStage.minScore}.` : 'Highest active career title reached.',
            ...(profile.achievements.length ? profile.achievements.slice(-3).map((line) => `- ${line}`) : ['- No signature achievement yet.']),
            ...(profile.scars.length ? [`Scars: ${profile.scars.join(', ')}`] : []),
          ],
        },
        {
          title: 'Loyalty & Contract',
          lines: [
            `Loyalty: ${hero.stats.loyalty}/100 - Satisfaction: ${profile.contract.satisfaction}/100`,
            `Contract tier: ${profile.contract.tier}`,
            profile.contract.expectations.length ? `Expectations: ${profile.contract.expectations.join(', ')}` : 'Expectations currently met.',
            profile.contract.promises.some((promise) => !promise.fulfilled && !promise.broken)
              ? `Promises pending: ${profile.contract.promises.filter((promise) => !promise.fulfilled && !promise.broken).map((promise) => `${promise.type} by Day ${promise.dueDay}`).join(', ')}`
              : 'Promises pending: none',
            profile.contract.grievances.length ? { text: `Grievances: ${profile.contract.grievances.slice(-3).join(' / ')}`, className: 'gwg-bad' } : 'Grievances: none recorded',
            profile.contract.warningDay ? { text: `Departure warning issued Day ${profile.contract.warningDay}.`, className: 'gwg-bad' } : 'Departure risk: no active warning',
          ],
        },
        {
          title: 'Equipment & Readiness',
          lines: this.getHeroSupplyLines(hero),
        },
        {
          title: 'Inventory',
          lines: inventory.length
            ? inventory.map((item) => ({
              text: `${item.name}${item.premiumSource ? ' (premium)' : ''} +${item.powerBonus || 0}`,
              icon: item.assetKey && this.textures.exists(item.assetKey)
                ? `${import.meta.env.BASE_URL}assets/items/${item.assetKey}.png`
                : null,
              className: item.premiumSource ? 'gwg-whale' : '',
            }))
            : ['- Empty. Even the lint was repossessed.'],
        },
        {
          title: 'Thought',
          lines: [this.getHeroThought(hero)],
        },
        {
          title: 'Recent History',
          lines: history.length ? history.map((line) => `- ${line}`) : ['- No dramatic receipts yet.'],
        },
      ],
    };
  }

  showHeroInspector(hero) {
    if (!hero) return;
    this.tooltipTarget = null;
    this.heroTooltipTarget = hero;
    this.activeInspector = { type: 'hero', id: hero.def.id };
    this.selectHero(hero);
    this.stats.heroesInspected = Math.max(1, this.stats.heroesInspected || 0);
    this.checkObjectives();
    this.advanceOnboarding('inspectHero');
    this.game.events.emit('gwg-inspector-open', this.getHeroInspectorPayload(hero));
  }

  showHeroTooltip(hero) {
    this.showHeroInspector(hero);
    return;
    if (!hero || hero.state === 'away') return;
    this.tooltipTarget = null;
    this.heroTooltipTarget = hero;

    const whaleAccess = hero.stats.whaleAccess ? 'Yes' : (hero.stats.debt > 250 ? 'Technically' : 'No');
    this.tooltipTitle.setText(hero.def.name);
    this.tooltipText.setText(hero.def.personality);
    this.tooltipEffects.setText([
      `Power: ${hero.stats.power}`,
      `Morale: ${hero.stats.morale}`,
      `Debt: ${hero.stats.debt}`,
      `Loyalty: ${hero.stats.loyalty}`,
      `Whale Access: ${whaleAccess}`,
      `Action: ${this.getHeroActionText(hero)}`,
    ].join('\n'));
    this.tooltipUpgrade.setText(this.getHeroThought(hero));
    this.tooltipButton.setVisible(false);
    this.tooltipButtonLabel.setVisible(false);

    const pad = 12;
    const gap = 7;
    const contentW = Math.max(
      230,
      this.tooltipTitle.width,
      this.tooltipText.width,
      this.tooltipEffects.width,
      this.tooltipUpgrade.width,
    );
    const tw = Math.min(350, contentW + pad * 2);
    const th = pad
      + this.tooltipTitle.height + gap
      + this.tooltipText.height + gap
      + this.tooltipEffects.height + gap
      + this.tooltipUpgrade.height
      + pad;
    const { x, y } = this.getTooltipPosition(hero.container.x, hero.container.y, 58, tw, th);
    this.tooltipBounds = { x, y, w: tw, h: th };

    if (this.tooltipPanel) {
      this.tooltipPanel.setPosition(x, y).setDisplaySize(tw, th).setVisible(true);
    } else {
      this.tooltipBg.clear();
      this.tooltipBg.fillStyle(0x05070c, 0.42);
      this.tooltipBg.fillRoundedRect(x + 4, y + 4, tw, th, 6);
      this.tooltipBg.fillStyle(0x121a25, 0.98);
      this.tooltipBg.fillRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.lineStyle(2, 0xf6c945, 0.95);
      this.tooltipBg.strokeRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.setVisible(true);
    }

    let ty = y + pad;
    this.tooltipTitle.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipTitle.height + gap;
    this.tooltipText.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipText.height + gap;
    this.tooltipEffects.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipEffects.height + gap;
    this.tooltipUpgrade.setPosition(x + pad, ty).setVisible(true);

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(7000, () => this.hideTooltip());
  }

  getHeroRosterStatus(hero) {
    if (hero?.stats?.deathDay) return 'Dead';
    if (this.getHeroProfile(hero)?.status === 'retired' || hero?.stats?.status === 'Retired') return 'Retired';
    if (hero?.stats?.active === false) {
      return /Left Town|Balance Refugee|Burned Out/.test(hero.stats.status || '') ? 'Left' : 'Reserve';
    }
    if (this.isHeroInjured(hero)) return hero.stats.injuryState === 'missing' ? 'Missing' : 'Injured';
    if (hero?.state === 'away' || hero?.awayUntil > this.day) return 'Returning';
    const action = `${hero?.currentAction || hero?.intent?.action || ''}`.toLowerCase();
    if (hero?.state === 'working' || action.includes('woodcutter') || action.includes('miner') || action.includes('herbalist') || action.includes('salvage runner')) return 'Working';
    if (action.includes('explor') || action.includes('harvest') || action.includes('investigat') || action.includes('clear')) return 'Exploring';
    if (action.includes('intercept') || action.includes('attack') || action.includes('fight')) return 'Fighting';
    if (action.includes('defend') || action.includes('patrol') || action.includes('escort')) return 'Defending';
    if (action.includes('loot') || action.includes('remains')) return 'Looting';
    if (action.includes('quest') || action.includes('preparing')) return 'On Quest';
    if (this.postedQuests?.some((quest) => quest.assignedHeroId === hero?.def?.id)) return 'On Quest';
    if (hero?.state === 'walking' || hero?.moveTween || hero?.destination) return 'Walking';
    if (action.includes('tavern') || action.includes('rest') || action.includes('visiting')) return 'Resting';
    if (hero?.state === 'inside') return 'Resting';
    return 'Idle';
  }

  refreshHeroIntentRing(hero) {
    if (!hero?.intentRing) return;
    const status = this.getHeroRosterStatus(hero);
    const farZoom = this.cameras.main.zoom < 0.48;
    const visibleStatuses = new Set(['Walking', 'Working', 'Exploring', 'On Quest', 'Returning', 'Looting', 'Fighting', 'Injured', 'Missing']);
    const visible = visibleStatuses.has(status)
      && hero.stats.active !== false
      && !hero.stats.deathDay
      && (!farZoom || ['Fighting', 'Injured', 'Missing'].includes(status));
    const colors = {
      Walking: 0x8fb7c9,
      Working: 0xc7b06a,
      Exploring: 0x7fdc93,
      'On Quest': 0x8db8ff,
      Returning: 0xb8c4d8,
      Looting: 0xf6c945,
      Fighting: 0xf0938f,
      Injured: 0xd75b5b,
      Missing: 0xc99aec,
    };
    const color = colors[status] || 0x8fb7c9;
    hero.intentRing
      .setFillStyle(color, status === 'Fighting' ? 0.16 : 0.08)
      .setStrokeStyle(status === 'Fighting' ? 2 : 1.5, color, 0.68)
      .setVisible(visible);
  }

  getHeroRosterPayload() {
    const heroes = (this.heroes || []).map((hero) => {
      const icon = this.getAssetPreviewUrl(hero.def.assetKey);
      const status = this.getHeroRosterStatus(hero);
      const assignedQuest = this.postedQuests?.find((quest) => quest.assignedHeroId === hero.def.id);
      const action = assignedQuest && status === 'On Quest'
        ? `Assigned to ${assignedQuest.name}`
        : (hero.intent?.action || hero.currentAction || 'Idle');
      const destination = assignedQuest && status === 'On Quest'
        ? assignedQuest.name
        : (hero.intent?.destinationName || this.getPlaceName(hero.destination || hero.at));
      const profile = this.getHeroProfile(hero);
      const party = this.getPartyForHero(hero);
      const conflicts = this.getHeroRelationshipSummaries(hero).filter((entry) => /Rival|Enemy|Grudge/.test(entry.label));
      return {
        id: hero.def.id,
        name: hero.def.name,
        status,
        tier: hero.stats.status || hero.def.personality,
        power: hero.stats.power || 0,
        morale: hero.stats.morale || 0,
        injury: hero.stats.injuryState || 'healthy',
        favorite: Boolean(hero.stats.favorite),
        action,
        destination,
        reason: hero.intent?.reason || '',
        risk: hero.intent?.risk || 'Low',
        dead: Boolean(hero.stats.deathDay),
        loyalty: hero.stats.loyalty || 0,
        careerStage: getCareerStage(profile).name,
        party: party?.name || '',
        conflict: conflicts[0] ? `${conflicts[0].label}: ${conflicts[0].name}` : '',
        urgent: profile.contract.warningDay ? 'Departure warning' : profile.contract.expectations[0] || '',
        unhappy: profile.contract.satisfaction < 35 || hero.stats.loyalty < 30,
        leaving: Boolean(profile.contract.warningDay),
        premiumExposure: hero.stats.premiumExposure || 0,
        icon,
      };
    });
    return { heroes };
  }

  publishHeroRoster() {
    this.registry.set('heroRoster', this.getHeroRosterPayload());
  }

  focusHeroFromRoster(id) {
    const hero = (this.heroes || []).find((item) => item.def.id === id);
    if (!hero) return;
    const deathLocation = hero.stats?.deathLocation;
    const x = deathLocation?.x || hero.container?.x || this.cameras.main.worldView.centerX;
    const y = deathLocation?.y || hero.container?.y || this.cameras.main.worldView.centerY;
    this.cameras.main.pan(x, y, 320, 'Sine.easeInOut');
    this.time.delayedCall(340, () => this.clampCameraToWorld());
    if (hero.container?.visible !== false || hero.stats?.deathDay) {
      this.showHeroInspector(hero);
    } else {
      this.game.events.emit('gwg-inspector-open', this.getHeroInspectorPayload(hero));
    }
  }

  toggleHeroFavoriteFromUi(id) {
    const hero = (this.heroes || []).find((item) => item.def.id === id);
    if (!hero) return;
    hero.stats.favorite = !hero.stats.favorite;
    this.publishHeroRoster();
    this.saveGame(false);
    if (this.activeInspector?.type === 'hero' && this.activeInspector.id === id) {
      this.game.events.emit('gwg-inspector-open', this.getHeroInspectorPayload(hero));
    }
  }

  tryUpgradeTooltipTarget() {
    const place = this.tooltipTarget;
    if (!place) return;
    if (this.time.now - this.lastUpgradeAt < 450) return;
    this.lastUpgradeAt = this.time.now;

    const info = this.getUpgradeInfo(place);
    if (!info.cost || info.maxed) {
      this.game.events.emit('gwg-event', `${place.name} is already as questionable as allowed.`);
      return;
    }
    if (this.resources.gold < info.cost) {
      this.floatText(place.x, place.y - (place.h || 50) - 8, 'NOT ENOUGH GOLD', '#f0938f');
      this.game.events.emit('gwg-event', `${place.name} demanded ${info.cost}g. ${Phaser.Utils.Array.GetRandom([
        'Not enough gold. Please exploit responsibly.',
        'The accountant suggests more whales.',
        'Try selling fairness. It was decorative anyway.',
      ])}`);
      return;
    }
    const requirement = this.getUpgradeRequirement(place, info);
    if (!requirement.met) {
      this.floatText(place.x, place.y - (place.h || 50) - 8, 'NEEDS USE', '#f0938f');
      this.game.events.emit('gwg-event', `${place.name} is not ready to upgrade. ${requirement.blockedText}`);
      this.showPlaceInspector(place);
      return;
    }
    for (const [resource, amount] of Object.entries(requirement.materialCost || {})) {
      this.townInventory[resource] = Math.max(0, (this.townInventory[resource] || 0) - amount);
      this.stats.resourcesSpent = (this.stats.resourcesSpent || 0) + amount;
    }

    const bonus = info.def?.deltas || {};
    const deltas = {
      ...bonus,
      gold: -info.cost + (bonus.gold || 0),
    };
    this.applyDeltas(deltas);
    const nextLevel = info.level + 1;
    this.upgradeLevels[place.id] = nextLevel;
    if (getBuildingCatalogEntry(place.id)) {
      const runtime = this.getBuildingRuntime(place.id);
      const role = getBuildingRole(place.id);
      runtime.serviceQuality = Math.max(runtime.serviceQuality || 0, nextLevel);
      runtime.upgradeProgress = Math.max(0, runtime.upgradeProgress - 35);
      if (role) {
        const minimumCapacity = role.baseCapacity + Math.max(0, nextLevel - 1) * role.capacityPerLevel;
        runtime.capacity = Math.max(runtime.capacity || 0, minimumCapacity);
      }
    }
    if (this.getPlaceKind(place) === 'fair') this.stats.fairUpgrades = (this.stats.fairUpgrades || 0) + 1;
    if (this.getPlaceKind(place) === 'shady') this.stats.shadyUpgrades = (this.stats.shadyUpgrades || 0) + 1;
    this.refreshUpgradeVisual(place);
    this.checkObjectives();

    const sprite = this.placeSpriteById[place.id];
    if (sprite) {
      // Swap to the new level's art if a tier sprite exists (Storehouse,
      // Warehouse, Premium Fabricator, ...). Refresh scale/anchors so the
      // hitbox and hover stay correct; buildings without tier art keep base.
      const nextTexture = buildingTexture(this, place);
      if (sprite.texture.key !== nextTexture) {
        sprite.setTexture(nextTexture);
        const rescale = this.getPlaceSpriteScale(place, nextTexture, place.visualScale ?? LAYOUT_CONSTANTS.BUILDING_SCALE);
        sprite.setScale(rescale);
        sprite.setData('baseScaleX', sprite.scaleX);
        sprite.setData('baseScaleY', sprite.scaleY);
        sprite.setData('hoverScale', rescale * 1.03);
      }
      const baseScaleX = sprite.scaleX;
      const baseScaleY = sprite.scaleY;
      this.tweens.add({
        targets: sprite,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 140,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      sprite.setTint(0xfff3c0);
      this.time.delayedCall(220, () => sprite.clearTint());
    }

    if (place.id === 'whale') {
      this.burstCoins(64);
      this.triggerWhaleReaction();
    }

    this.floatDeltas(place.x, place.y - (place.h || 58) - 10, deltas);
    const eventText = info.def?.event
      ? info.def.event(place.name, nextLevel)
      : `${place.name} upgraded. The town pretends this was wise.`;
    this.game.events.emit('gwg-event', `${eventText} Level ${nextLevel}.`);
    this.addTownLog(`${eventText} Level ${nextLevel}.`, place.id === 'whale' ? 'golden_whale' : 'upgrade');
    this.addReportLine('stage', `${place.name} reached Level ${nextLevel}.`);
    this.checkUnlocks();
    this.checkStageProgression();
    this.checkTownIdentity();
    this.publishTownHint();
    this.saveGame(false);
    this.showTooltip(place);
  }

  // --- heroes -------------------------------------------------------------

  setHeroLabelFocus(hero, focused = false, alpha = HERO_LABEL_FOCUS_ALPHA) {
    if (!hero?.label) return;
    const heldForEvent = hero.labelUntil && hero.labelUntil > this.time.now;
    const isSelected = this.selectedHeroId === hero.def.id || this.heroTooltipTarget === hero;
    hero.label.setAlpha((focused || heldForEvent || isSelected) ? alpha : HERO_LABEL_DEFAULT_ALPHA);
  }

  showHeroLabelBriefly(hero, duration = 2600) {
    if (!hero?.label) return;
    hero.labelUntil = this.time.now + duration;
    this.setHeroLabelFocus(hero, true, HERO_LABEL_EVENT_ALPHA);
    this.time.delayedCall(duration + 40, () => {
      if ((hero.labelUntil || 0) <= this.time.now) this.setHeroLabelFocus(hero, false);
    });
  }

  getHeroStateFrameKey(def, suffix) {
    const assetKey = def?.assetKey || '';
    const candidates = [
      `${assetKey}_${suffix}`,
      `${def?.id || assetKey}_${suffix}`,
      `hero_default_${suffix}`,
    ].filter(Boolean);
    return candidates.find((key) => this.textures.exists(key)) || null;
  }

  getHeroStateFrames(def) {
    return Object.fromEntries(HERO_ANIMATION_STATES.map((state) => {
      const frames = (HERO_STATE_SUFFIXES[state] || [state])
        .map((suffix) => this.getHeroStateFrameKey(def, suffix))
        .filter(Boolean);
      return [state, frames];
    }));
  }

  // 4-direction PixelLab frames: walk_<dir>_1..6 and idle_<dir> rotations.
  // A direction set is all-or-nothing from one prefix (personal, id, or
  // hero_default) so a hero never mixes their own frames with default ones.
  getHeroDirectionalFrames(def, allowDefaultFallback = true) {
    const prefixes = [def?.assetKey, def?.id, allowDefaultFallback ? 'hero_default' : null].filter(Boolean);
    const walk = {};
    const idle = {};
    for (const direction of ['south', 'east', 'north', 'west']) {
      for (const prefix of prefixes) {
        const frames = [];
        for (let n = 1; n <= 6; n += 1) {
          const key = `${prefix}_walk_${direction}_${n}`;
          if (this.textures.exists(key)) frames.push(key);
        }
        if (frames.length >= 2) {
          walk[direction] = frames;
          break;
        }
      }
      for (const prefix of prefixes) {
        const key = `${prefix}_idle_${direction}`;
        if (this.textures.exists(key)) {
          idle[direction] = key;
          break;
        }
      }
    }
    return {
      walk: Object.keys(walk).length ? walk : null,
      idle: Object.keys(idle).length ? idle : null,
    };
  }

  // frames for the current state, preferring real directional sets
  getFramesForState(hero, state) {
    if (state === 'walk' && hero.directionalWalk) {
      return hero.directionalWalk[hero.facing]
        || hero.directionalWalk.east
        || Object.values(hero.directionalWalk)[0]
        || [];
    }
    if (state === 'idle' && hero.directionalIdle) {
      const key = hero.directionalIdle[hero.facing] || hero.directionalIdle.south;
      if (key) return [key];
    }
    return hero.stateFrames?.[state] || [];
  }

  // facing changes swap in the matching directional frames; mirroring is only
  // for actors without real directional art
  setHeroFacing(hero, facing) {
    if (!hero?.sprite || hero.facing === facing) return;
    hero.facing = facing;
    if (hero.directionalWalk || hero.directionalIdle) {
      hero.sprite.setFlipX(false);
      if (['walk', 'idle'].includes(hero.animationState)) {
        this.setHeroAnimationState(hero, hero.animationState);
      }
    }
  }

  prepareHeroAnimation(hero) {
    if (!hero?.sprite) return;
    hero.stateFrames = this.getHeroStateFrames(hero.def);
    // walkers keep their worker identity: never borrow hero_default frames
    const directional = this.getHeroDirectionalFrames(hero.def, !hero.walker);
    hero.directionalWalk = directional.walk;
    hero.directionalIdle = directional.idle;
    hero.facing = hero.facing || 'south';
    hero.hasStateFrames = Boolean(directional.walk)
      || Object.values(hero.stateFrames).some((frames) => frames.length > 0);
    this.setHeroAnimationState(hero, this.isHeroInjured(hero) ? 'hurt' : (hero.stats.animationState || 'idle'));
  }

  stopHeroAnimation(hero) {
    if (hero?.animTimer) {
      hero.animTimer.remove();
      hero.animTimer = null;
    }
  }

  applyHeroStateTexture(hero, textureKey) {
    if (!hero?.sprite || !textureKey || !this.textures.exists(textureKey)) return;
    hero.sprite.setTexture(textureKey);
    const scale = this.getTextureScaleForHeight(textureKey, hero.spriteHeight || 34, NPC_SCALE);
    hero.sprite.setScale(scale);
    hero.sprite.setData('baseScaleX', scale);
    hero.sprite.setData('baseScaleY', scale);
    this.applyHeroTint(hero);
  }

  setHeroAnimationState(hero, state = 'idle') {
    if (!hero?.sprite) return;
    const safeState = HERO_ANIMATION_STATES.includes(state) ? state : 'idle';
    this.stopHeroAnimation(hero);
    hero.animationState = safeState;
    if (hero.stats) hero.stats.animationState = safeState;
    const frames = this.getFramesForState(hero, safeState);
    if (!frames.length) {
      this.applyHeroStateTexture(hero, heroTexture(this, hero.def));
      return;
    }
    hero.animationFrameIndex = 0;
    this.applyHeroStateTexture(hero, frames[0]);
    if (frames.length > 1) {
      hero.animTimer = this.time.addEvent({
        delay: safeState === 'walk' ? 170 : 420,
        loop: true,
        callback: () => {
          hero.animationFrameIndex = (hero.animationFrameIndex + 1) % frames.length;
          this.applyHeroStateTexture(hero, frames[hero.animationFrameIndex]);
        },
      });
    }
  }

  buildHeroes() {
    this.heroes = this.heroDefinitions.map((def, i) => {
      const spot = this.getInitialHeroSpot(def, i);
      const x = spot.x + Phaser.Math.Between(-28, 28);
      const y = spot.y + Phaser.Math.Between(2, 22);

      const textureKey = heroTexture(this, def);
      const spriteScale = this.getTextureScaleForHeight(textureKey, 34, NPC_SCALE);
      const sprite = this.add.image(0, 0, textureKey).setScale(spriteScale).setOrigin(0.5, 1);
      sprite.setData('baseScaleX', spriteScale);
      sprite.setData('baseScaleY', spriteScale);
      const intentRing = this.add.ellipse(0, -2, 30, 11, 0x8fb7c9, 0.08)
        .setStrokeStyle(1.5, 0x8fb7c9, 0.52)
        .setVisible(false);
      const label = this.add.text(0, -40, def.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: `${SMALL_LABEL_FONT_SIZE}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0c1118',
        strokeThickness: 2,
        backgroundColor: '#0f1521cc',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1).setAlpha(HERO_LABEL_DEFAULT_ALPHA);

      const container = this.add.container(x, y, [intentRing, sprite, label]).setDepth(y);
      const savedStats = this.savedHeroStats?.[def.id] || {};
      const defaultActive = !this.isBuilderCity || i < 3;
      const hero = {
        def, container, sprite, label, intentRing,
        stats: {
          morale: 60,
          debt: Math.max(0, -(def.stats?.gold || 0)),
          loyalty: this.isHonestHero(def) ? 72 : 50,
          whaleAccess: HERO_GROUPS.whale.includes(def.personality),
          corruption: HERO_GROUPS.whale.includes(def.personality) ? 15 : 0,
          fame: 0,
          resentment: 0,
          envy: 0,
          inventory: [],
          originalPersonality: def.personality,
          currentPersonality: def.personality,
          status: def.personality || 'New Arrival',
          currentMood: 'Wary',
          history: [`Arrived as ${def.personality}.`],
          evolutionStage: 0,
          daysInTown: 1,
          cyclesActive: 0,
          active: defaultActive,
          rivalId: null,
          admiredId: null,
          resentmentTargetId: null,
          injuredUntilDay: 0,
          injuryState: 'healthy',
          health: 100,
          maxHealth: 100,
          deathDay: 0,
          deathLocation: null,
          favorite: false,
          premiumExposure: 0,
          equipment: normalizeHeroEquipment(),
          animationState: 'idle',
          ...def.stats,
          ...savedStats,
          originalPersonality: savedStats.originalPersonality || def.personality,
          currentPersonality: savedStats.currentPersonality || savedStats.status || def.personality,
          status: savedStats.status || def.personality || 'New Arrival',
          currentMood: savedStats.currentMood || 'Wary',
          history: Array.isArray(savedStats.history) ? savedStats.history.slice(-6) : [`Arrived as ${def.personality}.`],
          active: savedStats.active ?? defaultActive,
          envy: Number(savedStats.envy) || 0,
          inventory: Array.isArray(savedStats.inventory) ? savedStats.inventory.slice(0, 3) : [],
          rivalId: savedStats.rivalId || null,
          admiredId: savedStats.admiredId || null,
          resentmentTargetId: savedStats.resentmentTargetId || null,
          injuredUntilDay: Number(savedStats.injuredUntilDay) || 0,
          injuryState: savedStats.injuryState || (Number(savedStats.injuredUntilDay) > this.day ? 'injured' : 'healthy'),
          maxHealth: Math.max(1, Number(savedStats.maxHealth) || 100),
          health: Math.max(0, Math.min(Number(savedStats.maxHealth) || 100,
            Number.isFinite(Number(savedStats.health)) ? Number(savedStats.health) : 100)),
          deathDay: Number(savedStats.deathDay) || 0,
          deathLocation: savedStats.deathLocation || null,
          favorite: Boolean(savedStats.favorite),
          premiumExposure: Number(savedStats.premiumExposure) || 0,
          equipment: normalizeHeroEquipment(savedStats.equipment),
          animationState: savedStats.animationState || 'idle',
        },
        at: spot.id, pathNode: this.getPathNodeForPlaceId(spot.id)?.id || null, destination: null, state: 'idle',
        currentAction: `Idle near ${this.getPlaceName(spot.id)}`,
        intent: savedStats.intent || {
          action: 'Idle',
          destinationId: spot.id,
          destinationName: this.getPlaceName(spot.id),
          reason: 'Waiting for the economy to become someone else\'s problem.',
          risk: 'Low',
        },
        moveTween: null, bobTween: null, timer: null,
        animTimer: null, animationFrameIndex: 0, animationState: savedStats.animationState || 'idle',
        destMarker: null, bubble: null, bubbleTimer: null,
        awayUntil: savedStats.awayUntil || 0,
      };
      hero.stats.socialProfile = normalizeHeroProfile(savedStats.socialProfile, {
        id: def.id,
        name: def.name,
        personality: def.personality,
        stats: hero.stats,
      }, this.day);
      hero.stats.socialProfile.faction ||= chooseFaction(hero.stats.socialProfile);
      this.prepareHeroAnimation(hero);
      if (hero.awayUntil > this.day) {
        hero.state = 'away';
        hero.container.setAlpha(0.28);
        hero.currentAction = `Away until Day ${hero.awayUntil}`;
      }
      if (!hero.stats.active) {
        hero.state = 'away';
        hero.container.setVisible(false);
        hero.currentAction = 'Left town';
      }
      if (hero.stats.active && hero.stats.inventory.length === 0 && !hero.stats.whaleAccess) {
        this.grantCatalogItem(hero, getItemByName('Starter Sword'));
      }

      // clicking/tapping a hero shows their compact detail sheet; the invisible
      // hit rectangle is larger than the placeholder sprite for mobile fingers.
      const hit = this.add.rectangle(0, -34, 58, 72, 0xffffff, 0.001)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      container.add(hit);
      hero.hit = hit;
      const hoverIn = () => {
        sprite.setTint(0xfff3c0);
        this.setHeroLabelFocus(hero, true);
      };
      const hoverOut = () => {
        this.applyHeroTint(hero);
        this.setHeroLabelFocus(hero, false);
      };
      this.registerWorldInteractionTarget({
        id: def.id,
        type: 'hero',
        hero,
        hit,
        img: container,
        width: 58,
        height: 72,
        getCenter: () => ({ x: hero.container.x, y: hero.container.y - 34 }),
        onHoverIn: hoverIn,
        onHoverOut: hoverOut,
        onSelect: () => this.showHeroTooltip(hero),
      });
      hit.on('pointerup', (pointer) => {
        if (this.wasDragGesture(pointer)) return;
        this.selectWorldInteractionTarget(pointer);
      });
      this.applyInteractionDebugStyle(hit, 0xf6c945);

      // idle breathing — replace with a real idle animation later
      if (!hero.hasStateFrames) {
        const spriteScaleY = sprite.getData('baseScaleY') || sprite.scaleY || NPC_SCALE;
        this.tweens.add({
          targets: sprite, scaleY: { from: spriteScaleY, to: spriteScaleY * 1.04 },
          duration: Phaser.Math.Between(700, 1000), yoyo: true, repeat: -1,
          ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 600),
        });
      }

      this.refreshHeroStatusMarker(hero);
      this.refreshHeroIntentRing(hero);
      if (hero.stats.active) this.scheduleAmbient(hero, Phaser.Math.Between(300, 2500));
      return hero;
    });
    const validHeroIds = new Set(this.heroes.map((hero) => hero.def.id));
    for (const [partyId, party] of Object.entries(this.heroSocial.parties || {})) {
      party.memberIds = party.memberIds.filter((id) => validHeroIds.has(id));
      if (!party.memberIds.length) {
        delete this.heroSocial.parties[partyId];
        continue;
      }
      if (!party.memberIds.includes(party.leaderId)) party.leaderId = party.memberIds[0];
      for (const id of party.memberIds) {
        const hero = this.getHeroById(id);
        if (hero) this.getHeroProfile(hero).partyId = partyId;
      }
      this.refreshPartyCohesion(party);
    }
  }

  getInitialHeroSpot(def, index = 0) {
    const preferredIds = def.preferredDestinations || [def.prefers].filter(Boolean);
    const preferred = preferredIds
      .map((id) => this.doorById?.[id])
      .filter((spot) => spot && this.isLocationUnlocked(spot.id));
    if (preferred.length > 0) return preferred[index % preferred.length];

    const districts = this.getHeroDistrictPreferences({ def });
    for (const district of districts) {
      const spots = this.getDistrictDoorSpots(district);
      if (spots.length > 0) return spots[index % spots.length];
    }
    return this.doorById?.guildhall || this.doorSpots[index % this.doorSpots.length];
  }

  addHeroHistory(hero, line) {
    if (!hero?.stats || !line) return;
    hero.stats.history = Array.isArray(hero.stats.history) ? hero.stats.history : [];
    hero.stats.history.push(line);
    while (hero.stats.history.length > 6) hero.stats.history.shift();
  }

  applyHeroTint(hero) {
    if (!hero?.sprite) return;
    const status = hero.stats.status || '';
    if (hero.stats.deathDay) hero.sprite.setTint(0x4a4f59);
    else if (this.isHeroInjured(hero)) hero.sprite.setTint(0xf0a08f);
    else if (hero.stats.active === false || status === 'Left Town') hero.sprite.setTint(0x7a7d85);
    else if (/Whale|Premium|Brand|Sponsored/.test(status)) hero.sprite.setTint(0xffe08a);
    else if (/Debt|Contract|Cursed/.test(status)) hero.sprite.setTint(0xc99aec);
    else if (/Protest|Angry|Balance/.test(status)) hero.sprite.setTint(0xf0938f);
    else if (/Mentor|Reliable|Community|Recovering/.test(status)) hero.sprite.setTint(0x7fdc93);
    else hero.sprite.clearTint();
  }

  refreshHeroStatusMarker(hero) {
    if (!hero) return;
    if (hero.statusIcon) {
      hero.statusIcon.destroy();
      hero.statusIcon = null;
    }

    const status = hero.stats.status || hero.def.personality;
    let icon = '';
    let color = '#ffe08a';
    if (/Whale|Premium|Brand|Sponsored|Legend/.test(status)) { icon = '$'; color = '#f6c945'; }
    else if (/Debt|Contract|Cursed/.test(status)) { icon = '!'; color = '#c99aec'; }
    else if (/Protest|Angry|Balance/.test(status)) { icon = '!'; color = '#f0938f'; }
    else if (/Mentor|Reliable|Community|Recovering/.test(status)) { icon = '+'; color = '#7fdc93'; }
    else if (/Left|Burned/.test(status)) { icon = 'x'; color = '#d4dae2'; }
    if (!icon) {
      this.applyHeroTint(hero);
      return;
    }

    hero.statusIcon = this.add.text(0, -58, icon, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      stroke: '#0c1118',
      strokeThickness: 3,
      backgroundColor: '#0f1521cc',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1);
    hero.container.add(hero.statusIcon);
    this.applyHeroTint(hero);
  }

  updateHeroMood(hero) {
    const S = hero.stats;
    if (S.active === false) S.currentMood = 'Gone';
    else if (S.morale < 25) S.currentMood = 'Burned Out';
    else if (S.resentment > 70) S.currentMood = 'Organizing';
    else if (S.debt > 700) S.currentMood = 'Financially Haunted';
    else if (S.fame > 70) S.currentMood = 'Famous Enough To Be Wrong';
    else if (S.whaleAccess) S.currentMood = 'Premium-Adjacent';
    else S.currentMood = 'Wary';
  }

  setHeroStatus(hero, status, currentPersonality = status, reason = '') {
    if (!hero || hero.stats.status === status) return false;
    hero.stats.status = status;
    hero.stats.currentPersonality = currentPersonality;
    hero.stats.evolutionStage = (hero.stats.evolutionStage || 0) + 1;
    this.updateHeroMood(hero);
    this.addHeroHistory(hero, `Became ${status}${reason ? `: ${reason}` : '.'}`);
    this.refreshHeroStatusMarker(hero);
    this.floatText(hero.container.x, hero.container.y - 52, status.toUpperCase(), '#ffe08a');
    this.say(hero, Phaser.Utils.Array.GetRandom([
      'That changed me.',
      'I have a new title and concerns.',
      'The economy wrote character development.',
    ]), true);
    const text = `${hero.def.name} became ${status}. ${reason || 'The town updated the paperwork.'}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'npc');
    this.addReportLine('npc', text);
    if (this.heroTooltipTarget === hero) this.showHeroInspector(hero);
    return true;
  }

  leaveHeroPermanently(hero, reason) {
    if (!hero || hero.stats.active === false) return;
    const profile = this.getHeroProfile(hero);
    profile.status = 'departed';
    profile.departureReason = reason;
    const party = this.getPartyForHero(hero);
    if (party) {
      party.memberIds = party.memberIds.filter((id) => id !== hero.def.id);
      party.history = [...party.history, `Day ${this.day}: ${hero.def.name} departed.`].slice(-16);
      if (party.leaderId === hero.def.id) party.leaderId = party.memberIds[0] || null;
      profile.partyId = null;
      if (party.memberIds.length) this.refreshPartyCohesion(party);
      else delete this.heroSocial.parties[party.id];
    }
    hero.stats.active = false;
    hero.stats.status = 'Left Town';
    hero.stats.currentPersonality = 'Left Town';
    hero.state = 'away';
    hero.currentAction = 'Left town';
    hero.container.setAlpha(0.22);
    this.addHeroHistory(hero, `Left town: ${reason}`);
    this.refreshHeroStatusMarker(hero);
    this.floatText(hero.container.x, hero.container.y - 40, 'LEFT TOWN', '#f0938f');
    const text = `${hero.def.name} left town. ${reason}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'npc');
    this.addReportLine('npc', text);
    recordSocialEvent(this.heroSocial, { day: this.day, type: 'departure', heroIds: [hero.def.id], text, major: true });
  }

  progressHeroStories() {
    for (const hero of this.heroes) {
      if (hero.stats.active === false) continue;
      const S = hero.stats;
      S.cyclesActive = (S.cyclesActive || 0) + 1;
      S.daysInTown = Math.max(S.daysInTown || 1, this.day);

      if (this.resources.trust < 35) {
        S.loyalty = Phaser.Math.Clamp(S.loyalty - (this.isHonestHero(hero.def) ? 4 : 2), 0, 100);
        S.resentment = Phaser.Math.Clamp((S.resentment || 0) + (this.isHonestHero(hero.def) ? 7 : 3), 0, 100);
      }
      if (this.resources.corruption > 60) {
        S.corruption = Phaser.Math.Clamp((S.corruption || 0) + 3, 0, 100);
        S.resentment = Phaser.Math.Clamp((S.resentment || 0) + (this.isVeteranHero(hero.def) ? 7 : 2), 0, 100);
      }
      if (this.resources.morale < 35) S.morale = Phaser.Math.Clamp(S.morale - 3, 0, 100);
      if (this.resources.trust > 55 && this.resources.morale > 55) S.loyalty = Phaser.Math.Clamp(S.loyalty + 2, 0, 100);

      if (!S.whaleAccess && S.corruption > 65 && Math.random() < 0.08) {
        S.whaleAccess = true;
        S.debt += 180;
        this.addHeroHistory(hero, 'Gained whale access and called it merit.');
        this.game.events.emit('gwg-event', `${hero.def.name} gained whale access and immediately called it merit.`);
      }

      if (S.loyalty < 8 || S.morale < 8 || S.debt > 1600) {
        const equipment = normalizeHeroEquipment(S.equipment);
        const lodging = this.getLodgingReport();
        const reason = lodging.homeless > 0
          ? 'No bed remained, and sleeping beside industrial output lost its charm.'
          : equipment.weapon === 'Poor' && this.getHeroTierIndex(hero) >= 2
            ? 'The town kept offering veteran danger with rookie equipment.'
            : this.resources.corruption > 80 && !S.whaleAccess
              ? 'The premium dependency exceeded their remaining tolerance.'
              : S.debt > 1600
                ? 'Their debt became a district and they left before zoning approval.'
                : 'The economy found the last nerve.';
        const profile = this.getHeroProfile(hero);
        if (!profile.contract.grievances.includes(reason)) profile.contract.grievances.push(reason);
        if (!profile.contract.warningDay) {
          profile.contract.warningDay = this.day;
          const text = `${hero.def.name} warned the guild before departing: ${reason}`;
          this.addTownLog(text, 'npc');
          this.addReportLine('warnings', text);
        }
      }

      this.evaluateHeroEvolution(hero);
      this.updateHeroMood(hero);
      this.refreshHeroStatusMarker(hero);
    }
    this.maybeInviteArrival();
    this.maybeResolveItemConflict();
    this.buildRelationship(null, 'mentor');
    this.updateTownReputationStats();
    this.checkTownRankProgression();
    if (this.heroTooltipTarget) this.showHeroInspector(this.heroTooltipTarget);
  }

  evaluateHeroEvolution(hero) {
    const base = hero.stats.originalPersonality || hero.def.personality;
    const S = hero.stats;
    if (base === 'Honest Grinder') {
      if (S.power >= 10 && this.resources.trust > 55) this.setHeroStatus(hero, 'Reliable Hero', 'Reliable Hero', 'Effort briefly scaled.');
      else if (S.resentment > 70) this.setHeroStatus(hero, 'Protest Leader', 'Protest Leader', 'She found a clipboard and purpose.');
      else if (S.whaleAccess && S.corruption > 45) this.setHeroStatus(hero, 'Sponsored Sellout', 'Sponsored Hero', 'Convenience shaped exactly like power.');
    } else if (base === 'Noble Whale') {
      if (S.debt > 800) this.setHeroStatus(hero, 'Premium Disaster', 'Premium Disaster', 'The receipt became structural.');
      else if (S.fame > 80) this.setHeroStatus(hero, 'Whale Champion', 'Whale Champion', 'Balance left flowers.');
      else if (this.resources.trust < 25) this.setHeroStatus(hero, 'Public Relations Problem', 'Noble Whale', 'Citizens noticed the glow.');
    } else if (base === 'Lucky Idiot') {
      if (S.fame > 65) this.setHeroStatus(hero, 'Accidental Legend', 'Accidental Legend', 'Nobody can prove he understood the quest.');
      else if (S.debt > 500) this.setHeroStatus(hero, 'Debt Goblin', 'Debt Goblin', 'Luck sent an invoice.');
      else if (S.morale < 25) this.setHeroStatus(hero, 'Refund Seeker', 'Refund Seeker', 'The odds became personal.');
    } else if (base === 'Veteran' || base === 'Angry Veteran') {
      if (this.resources.corruption > 60) this.setHeroStatus(hero, 'Angry Veteran', 'Angry Veteran', 'The milking was not metaphorical.');
      else if (this.resources.trust > 55 && S.fame > 30) this.setHeroStatus(hero, 'Mentor', 'Mentor', 'Old skill still teaches.');
      else if (S.resentment > 75) this.setHeroStatus(hero, 'Balance Prophet', 'Balance Prophet', 'Complaint became scripture.');
    } else if (base === 'Debt Goblin') {
      if (S.debt > 1000) this.setHeroStatus(hero, 'Debt Spiral', 'Debt Spiral', 'The spiral invoiced him.');
      else if (this.resources.corruption > 70) this.setHeroStatus(hero, 'Cursed Investor', 'Cursed Investor', 'Debt became a growth strategy.');
      else if (S.debt < 100 && S.morale > 65) this.setHeroStatus(hero, 'Recovering Goblin', 'Recovering Goblin', 'A budget survived contact with reality.');
    } else if (base === 'Broke Optimist') {
      if (S.whaleAccess) this.setHeroStatus(hero, 'Sponsored Hero', 'Sponsored Hero', 'Optimism found a sponsor.');
      else if (S.morale > 72 && S.loyalty > 60) this.setHeroStatus(hero, 'Community Hero', 'Community Hero', 'Hope became useful paperwork.');
      else if (S.morale < 28) this.setHeroStatus(hero, 'Balance Refugee', 'Balance Refugee', 'The patch followed them home.');
    } else if (base === 'Sponsored Hero') {
      if (S.debt > 700) this.setHeroStatus(hero, 'Contract Victim', 'Contract Victim', 'The ad read read back.');
      else if (S.fame > 70) this.setHeroStatus(hero, 'Brand Paladin', 'Brand Paladin', 'Engagement wore armor.');
      else if (this.resources.trust < 25) this.setHeroStatus(hero, 'Sellout Icon', 'Sponsored Hero', 'The town learned the sponsor name.');
    }
  }

  getHeroArrivalTier() {
    this.updateTownReputationStats();
    const rank = this.getTownRankSnapshot();
    const serviceQuality = Object.values(this.cityState?.buildingRuntime || {})
      .reduce((sum, runtime) => sum + (Number(runtime.serviceQuality) || 0), 0);
    const safety = Phaser.Math.Clamp(100 - this.resources.threat, 0, 100);
    const districtScore = this.getActiveDistrictBonuses().length * 5;
    const supplyScore = Math.min(18, (this.townInventory.weapons || 0) * 3 + (this.townInventory.armor || 0) * 4 + (this.townInventory.potions || 0) * 2);
    const score = this.townReputation * 0.42
      + this.townPrestige * 0.34
      + safety * 0.18
      + serviceQuality * 0.5
      + districtScore
      + supplyScore
      + rank.index * 4;
    if (this.getPlaceLevel(this.buildingById.whale) >= 4 && this.resources.corruption > 58) return 'Whale Champion';
    if (rank.index >= 4 && score >= 82) return 'Champion';
    if (rank.index >= 2 && (score >= 64 || this.resources.threat > 70)) return 'Veteran';
    if (score >= 42) return 'Regular';
    return 'Rookie';
  }

  maybeInviteArrival() {
    this.updateTownReputationStats();
    const activeCount = this.heroes.filter((hero) => hero.stats.active !== false).length;
    const lodgingCapacity = ['tavern', 'inn', 'hero_hostel', 'premium_lodge']
      .filter((id) => this.isBuildingPlaced(id))
      .reduce((sum, id) => sum + this.getBuildingCapacity(this.buildingById[id]), 0);
    const guildCapacity = 3 + Math.max(0, this.getPlaceLevel(this.buildingById.guildhall) - 1);
    const townCapacity = Math.min(28, guildCapacity + lodgingCapacity);
    if (activeCount >= townCapacity) return;
    const arrivalChance = Phaser.Math.Clamp(
      0.18
        + this.resources.trust / 300
        + this.townReputation / 260
        + this.townPrestige / 420
        + this.getPlaceLevel(this.buildingById.guildhall) * 0.035
        + Object.values(this.heroSocial.parties || {}).reduce((sum, party) => sum + Math.min(0.04, (party.victories || 0) * 0.006), 0)
        + Math.min(0.05, Object.keys(this.heroSocial.memorials || {}).filter((id) => this.heroSocial.memorials[id]?.buried).length * 0.01)
        - Math.min(0.12, Object.keys(this.heroSocial.memorials || {}).filter((id) => !this.heroSocial.memorials[id]?.buried).length * 0.025)
        - Math.max(0, this.resources.threat - 60) / 280,
      0.25,
      0.9,
    );
    if (Math.random() > arrivalChance) return;
    const candidate = this.heroes.find((hero) => hero.stats.active === false && !hero.stats.deathDay);
    if (!candidate) return;
    const tier = this.getHeroArrivalTier();
    const tierPower = { Rookie: 2, Regular: 5, Veteran: 9, Champion: 14, 'Whale Champion': 18 }[tier] || 2;
    candidate.stats.active = true;
    candidate.stats.status = tier === 'Rookie' ? 'New Arrival' : tier;
    candidate.stats.currentPersonality = candidate.stats.status;
    candidate.stats.power = Math.max(candidate.stats.power || 1, tierPower);
    candidate.stats.fame = Math.max(candidate.stats.fame || 0, tier === 'Champion' || tier === 'Whale Champion' ? 28 : tier === 'Veteran' ? 14 : 0);
    candidate.stats.whaleAccess = candidate.stats.whaleAccess || tier === 'Whale Champion';
    candidate.stats.morale = tier === 'Rookie' ? 58 : 66;
    candidate.stats.loyalty = Math.max(candidate.stats.loyalty || 0, tier === 'Champion' ? 66 : 55);
    candidate.stats.resentment = Math.max(0, (candidate.stats.resentment || 0) - 20);
    candidate.stats.injuryState = 'healthy';
    candidate.stats.injuredUntilDay = 0;
    candidate.awayUntil = this.day;
    candidate.state = 'idle';
    candidate.currentAction = `Arrived near ${this.getPlaceName(candidate.at)}`;
    candidate.intent = {
      action: 'Arrived',
      destinationId: candidate.at,
      destinationName: this.getPlaceName(candidate.at),
      reason: `Attracted by ${tier === 'Whale Champion' ? 'premium glow and dangerous liquidity' : 'town reputation and service quality'}.`,
      risk: 'Low',
    };
    candidate.container.setVisible(true).setAlpha(1);
    const profile = this.getHeroProfile(candidate);
    profile.status = 'active';
    profile.arrivalDay = this.day;
    profile.departureReason = null;
    profile.contract.warningDay = 0;
    profile.contract.satisfaction = Math.max(55, profile.contract.satisfaction || 0);
    profile.faction = chooseFaction(profile);
    this.setHeroAnimationState(candidate, 'happy');
    this.addHeroHistory(candidate, `Returned as ${candidate.stats.status}, suspiciously informed.`);
    this.refreshHeroStatusMarker(candidate);
    const supplyReason = (this.townInventory.armor || 0) > 0 && (this.townInventory.potions || 0) > 0
      ? 'armor, potions, and a reputation for surviving'
      : (this.townInventory.weapons || 0) > 0
        ? 'available weapons and a functioning road network'
        : 'beds, quest rumors, and dangerous optimism';
    const arrivalText = `${candidate.def.name} arrived as ${candidate.stats.status}, attracted by ${supplyReason}. Capacity ${activeCount + 1}/${townCapacity}.`;
    this.game.events.emit('gwg-event', arrivalText);
    this.addTownLog(arrivalText, 'npc');
    this.addReportLine('npc', arrivalText);
    this.scheduleAmbient(candidate, Phaser.Math.Between(1200, 3200));
  }

  // stop whatever the hero is doing so a new order can take over cleanly
  interruptHero(hero) {
    if (hero.moveTween) { hero.moveTween.stop(); hero.moveTween = null; }
    if (hero.bobTween) { hero.bobTween.stop(); hero.bobTween = null; }
    if (hero.timer) { hero.timer.remove(); hero.timer = null; }
    if (hero.destMarker) { hero.destMarker.destroy(); hero.destMarker = null; }
    this.stopHeroAnimation(hero);
    hero.sprite.setAngle(0);
    hero.container.setAlpha(1);
    hero.destination = null;
    hero.autonomousExploring = false;
    hero.state = 'idle';
    hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
    hero.intent = {
      action: 'Idle',
      destinationId: hero.at,
      destinationName: this.getPlaceName(hero.at),
      reason: 'Waiting for the next bad municipal idea.',
      risk: 'Low',
    };
    this.setHeroAnimationState(hero, this.isHeroInjured(hero) ? 'hurt' : 'idle');
  }

  scheduleAmbient(hero, delay) {
    if (hero.state === 'away') return;
    if (hero.stats?.gatheringNodeId) return;
    hero.timer = this.time.delayedCall(delay, () => {
      if (hero.stats?.gatheringNodeId || hero.state === 'working') return;
      if (!this.tryAutonomousHeroAction(hero)) this.ambientMove(hero);
    });
  }

  getAutonomousExploreSpot(hero) {
    const frontier = Phaser.Utils.Array.Shuffle(this.getFogFrontierCells(true))
      .filter((cell) => {
        const world = this.gridTileVisualCenter(cell.x, cell.y);
        const distance = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, world.x, world.y);
        return distance > GRID_CONFIG.tileSize * 3 && distance < GRID_CONFIG.tileSize * 20;
      });
    const cell = frontier[0];
    if (!cell) return null;
    const world = this.gridTileVisualCenter(cell.x, cell.y);
    return {
      id: `frontier-${cell.x}-${cell.y}`,
      areaId: `frontier-${Math.floor(cell.x / 8)}-${Math.floor(cell.y / 8)}`,
      name: 'Safe Fog Edge',
      x: world.x,
      y: world.y,
      h: 34,
      explore: true,
      autoExplore: true,
      intentAction: 'Exploring fog edge',
      reason: 'Scouting a nearby revealed frontier without a formal quest.',
      risk: this.resources.threat >= 55 ? 'Moderate' : 'Low',
    };
  }

  tryAutonomousHeroAction(hero) {
    if (!hero?.stats?.active || hero.stats.deathDay || hero.state !== 'idle') return false;
    if (this.postedQuests?.some((quest) => quest.assignedHeroId === hero.def.id)) return false;

    const loot = (this.aftermathDrops || [])
      .filter((drop) => !drop.collected && drop.kind === 'loot')
      .sort((a, b) => (
        Phaser.Math.Distance.Between(hero.container.x, hero.container.y, a.x, a.y)
        - Phaser.Math.Distance.Between(hero.container.x, hero.container.y, b.x, b.y)
      ))[0];
    if (loot && Math.random() < 0.32) {
      this.sendHeroToLoot(loot, hero);
      return true;
    }

    const restSpot = this.doorById?.tavern || this.doorById?.inn || this.doorById?.hero_hostel;
    if ((this.isHeroInjured(hero) || hero.stats.morale < 34) && restSpot) {
      this.walkTo(hero, {
        ...restSpot,
        intentAction: `Walking to ${restSpot.name || 'lodging'}`,
        reason: this.isHeroInjured(hero) ? 'Needs rest before becoming a memorial.' : 'Low morale needs a chair and soup.',
        risk: 'Low',
      }, () => this.enterBuilding(hero));
      return true;
    }

    const blacksmith = this.doorById?.blacksmith;
    if (blacksmith && (hero.stats.power || 0) < 6 && Math.random() < 0.18) {
      this.walkTo(hero, {
        ...blacksmith,
        intentAction: 'Walking to Blacksmith',
        reason: 'Gear is currently more theoretical than equipped.',
        risk: 'Low',
      }, () => this.onAmbientArrive(hero, blacksmith));
      return true;
    }

    const exploringNow = (this.heroes || []).filter((item) => item.autonomousExploring).length;
    const brave = this.isVeteranHero(hero.def) || this.isHonestHero(hero.def) || (hero.stats.power || 0) >= 9;
    const exploreChance = brave ? 0.18 : 0.055;
    if (exploringNow < this.autonomousExplorerLimit && this.resources.threat < (brave ? 78 : 52) && Math.random() < exploreChance) {
      const spot = this.getAutonomousExploreSpot(hero);
      if (spot) {
        this.walkTo(hero, spot, () => {
          hero.autonomousExploring = false;
          const added = this.revealArea(spot.gridX ?? this.worldToBuildGrid(spot.x, spot.y).x,
            spot.gridY ?? this.worldToBuildGrid(spot.x, spot.y).y,
            2,
            `${hero.def.name}'s casual scouting`);
          const haul = this.rollExplorationHaul(hero);
          this.say(hero, haul || (added ? 'Mapped it.' : 'Fog still suspicious.'), true);
          this.scheduleAmbient(hero, Phaser.Math.Between(2800, 5600));
        });
        return true;
      }
    }
    return false;
  }

  getHeroDistrictPreferences(hero) {
    const personality = hero?.def?.personality || hero?.personality || '';
    const status = hero?.stats?.status || '';
    if (/Protest|Bitter|Balance/.test(status)) return ['training', 'guild', 'social'];
    if (/Whale|Premium|Brand|Sponsored/.test(status) || HERO_GROUPS.whale.includes(personality)) return ['premium', 'social'];
    if (/Debt|Contract|Cursed/.test(status) || HERO_GROUPS.debt.includes(personality)) return ['premium', 'market'];
    if (personality === 'Guild Clerk' || personality === 'Quest Intern' || personality === 'Patch Notes Prophet') return ['guild', 'social'];
    if (personality === 'Suspicious Merchant' || personality === 'Lootbox Philosopher') return ['market', 'premium'];
    if (HERO_GROUPS.veteran.includes(personality)) return ['social', 'training', 'guild'];
    if (HERO_GROUPS.honest.includes(personality)) return ['training', 'guild', 'market'];
    return ['guild', 'social', 'market'];
  }

  getDistrictDoorSpots(district) {
    return (this.doorSpots || []).filter((spot) => {
      const place = this.placeById?.[spot.id];
      return place?.district === district && this.isLocationUnlocked(spot.id);
    });
  }

  pickAmbientSpot(hero) {
    const serviceIds = [];
    if (hero.stats.morale < 48) serviceIds.push('tavern', 'inn', 'hero_hostel', 'potion_shop');
    if (this.isHonestHero(hero.def)) serviceIds.push('mentor_hall', 'arena');
    if (this.isWhaleHero(hero.def) || hero.stats.whaleAccess) serviceIds.push('vip_lounge', 'premium_lodge', 'lootbox_kiosk');
    if (this.isDebtHero(hero.def) || hero.stats.debt > 250) serviceIds.push('bank_debt_office', 'gem_exchange');
    const serviceSpots = serviceIds
      .map((id) => this.doorById[id])
      .filter((spot) => spot && spot.id !== hero.at);
    if (serviceSpots.length > 0 && Math.random() < 0.48) {
      return Phaser.Utils.Array.GetRandom(serviceSpots);
    }

    const preferredIds = hero.def.preferredDestinations || [hero.def.prefers].filter(Boolean);
    const preferredSpots = preferredIds
      .map((id) => this.doorById[id])
      .filter((s) => s && s.id !== hero.at && this.isLocationUnlocked(s.id));

    if (/Protest|Bitter/.test(hero.stats.status || '') && Math.random() < 0.74) {
      const protest = ['complaint_barrel', 'hero_union_tent', 'whale']
        .map((id) => this.doorById[id])
        .filter((s) => s && s.id !== hero.at && this.isLocationUnlocked(s.id));
      if (protest.length > 0) return Phaser.Utils.Array.GetRandom(protest);
    }

    if (Math.random() < 0.72 && preferredSpots.length > 0) return Phaser.Utils.Array.GetRandom(preferredSpots);

    const districtSpots = this.getHeroDistrictPreferences(hero)
      .flatMap((district) => this.getDistrictDoorSpots(district))
      .filter((s) => s.id !== hero.at);
    if (Math.random() < 0.86 && districtSpots.length > 0) return Phaser.Utils.Array.GetRandom(districtSpots);

    const fallback = this.doorSpots.filter((s) => s.id !== hero.at && this.isLocationUnlocked(s.id));
    return Phaser.Utils.Array.GetRandom(fallback);
  }

  ambientMove(hero) {
    const spot = this.pickAmbientSpot(hero);
    this.walkTo(hero, spot, () => this.onAmbientArrive(hero, spot));
  }

  getPathNodeForPlaceId(id) {
    const place = this.placeById?.[id];
    if (place?.pathNode && this.pathNodeById?.[place.pathNode]) return this.pathNodeById[place.pathNode];
    if (place) return this.getNearestPathNode(place.x, place.y);
    return null;
  }

  getNearestPathNode(x, y) {
    if (!this.pathNodes?.length) return null;
    return this.pathNodes.reduce((best, node) => {
      const dist = Phaser.Math.Distance.Between(x, y, node.x, node.y);
      return !best || dist < best.dist ? { node, dist } : best;
    }, null)?.node || null;
  }

  getPathRouteIds(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return fromId ? [fromId] : [];
    const graph = new Map();
    for (const [a, b] of this.pathLinks || []) {
      if (!graph.has(a)) graph.set(a, []);
      if (!graph.has(b)) graph.set(b, []);
      graph.get(a).push(b);
      graph.get(b).push(a);
    }
    const queue = [[fromId]];
    const seen = new Set([fromId]);
    while (queue.length > 0) {
      const route = queue.shift();
      const last = route[route.length - 1];
      for (const next of graph.get(last) || []) {
        if (seen.has(next)) continue;
        const candidate = [...route, next];
        if (next === toId) return candidate;
        seen.add(next);
        queue.push(candidate);
      }
    }
    return [fromId, TOWN_WORLD.centerNode, toId].filter(Boolean);
  }

  getNearestRoadCell(worldX, worldY) {
    if (!this.cityState.roads.length) return null;
    return this.cityState.roads.reduce((best, road) => {
      const center = this.gridTileVisualCenter(road.x, road.y);
      const distance = Phaser.Math.Distance.Between(worldX, worldY, center.x, center.y);
      return !best || distance < best.distance ? { ...road, distance } : best;
    }, null);
  }

  buildGridRoadRoute(hero, spot, tx, ty) {
    const start = this.getNearestRoadCell(hero.container.x, hero.container.y);
    const finish = this.getNearestRoadCell(spot.x, spot.y);
    if (!start || !finish) return [{ x: tx, y: ty, final: true }];
    const startKey = gridKey(start.x, start.y);
    const finishKey = gridKey(finish.x, finish.y);
    const queue = [startKey];
    const previous = new Map([[startKey, null]]);
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length > 0) {
      const currentKey = queue.shift();
      if (currentKey === finishKey) break;
      const [x, y] = currentKey.split(',').map(Number);
      for (const [dx, dy] of directions) {
        const nextKey = gridKey(x + dx, y + dy);
        if (previous.has(nextKey) || !this.gridCells.get(nextKey)?.road) continue;
        previous.set(nextKey, currentKey);
        queue.push(nextKey);
      }
    }
    if (!previous.has(finishKey)) return [{ x: tx, y: ty, final: true }];
    const route = [];
    let cursor = finishKey;
    while (cursor) {
      route.unshift(cursor);
      cursor = previous.get(cursor);
    }
    const points = route.map((key) => {
      const [x, y] = key.split(',').map(Number);
      const world = this.gridTileVisualCenter(x, y);
      return {
        x: world.x,
        y: world.y,
        roadType: this.gridCells.get(key)?.road || 'dirt',
      };
    });
    points.push({ x: tx, y: ty, final: true, roadType: finish.type });
    return points;
  }

  buildWalkRoute(hero, spot, tx, ty) {
    if (this.isBuilderCity) return this.buildGridRoadRoute(hero, spot, tx, ty);
    const fromNode = this.getPathNodeForPlaceId(hero.at) || this.getNearestPathNode(hero.container.x, hero.container.y);
    const toNode = this.getPathNodeForPlaceId(spot.id) || this.getNearestPathNode(spot.x, spot.y);
    const routeIds = this.getPathRouteIds(fromNode?.id, toNode?.id);
    const points = [];
    const addPoint = (point) => {
      if (!point) return;
      const prev = points[points.length - 1] || { x: hero.container.x, y: hero.container.y };
      if (Phaser.Math.Distance.Between(prev.x, prev.y, point.x, point.y) > 28) {
        points.push({ x: point.x, y: point.y, pathNode: point.id });
      }
    };
    for (const id of routeIds) addPoint(this.pathNodeById[id]);
    points.push({ x: tx, y: ty, pathNode: toNode?.id, final: true });
    return points;
  }

  walkTo(hero, spot, onArrive) {
    if (!hero || !spot) {
      if (hero) this.scheduleAmbient(hero, Phaser.Math.Between(1200, 3000));
      return;
    }
    this.interruptHero(hero);
    hero.autonomousExploring = Boolean(spot.autoExplore);
    hero.state = 'walking';
    hero.destination = spot.id;
    const spotName = spot.name || this.getPlaceName(spot.id);
    hero.currentAction = spot.intentAction || `Walking to ${spotName}`;
    hero.intent = {
      action: hero.currentAction,
      destinationId: spot.id,
      destinationName: spotName,
      reason: spot.reason || this.getHeroDestinationReason(hero, spot),
      risk: spot.risk || this.getHeroDestinationRisk(hero, spot),
    };

    const tx = spot.x + Phaser.Math.Between(-38, 38);
    const ty = spot.y + Phaser.Math.Between(-4, 18);
    hero.intent.destinationX = tx;
    hero.intent.destinationY = ty;
    const route = this.buildWalkRoute(hero, spot, tx, ty);

    // Movement markers are useful while tuning pathing, but too debug-like
    // for normal play. Keep the hook without cluttering the town.
    if (SHOW_MOVEMENT_MARKERS) {
      hero.destMarker = this.add.image(tx, ty - 12, 'chevron').setDepth(3500).setAlpha(0.45);
      this.tweens.add({
        targets: hero.destMarker, y: ty - 4,
        duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    if (!hero.directionalWalk) hero.sprite.setFlipX(tx < hero.container.x);
    this.setHeroAnimationState(hero, 'walk');
    if (!hero.hasStateFrames) {
      hero.bobTween = this.tweens.add({
        targets: hero.sprite, angle: { from: -4, to: 4 },
        duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    const moveSegment = (index) => {
      const point = route[index];
      if (!point) {
        if (hero.bobTween) { hero.bobTween.stop(); hero.bobTween = null; }
        if (hero.destMarker) { hero.destMarker.destroy(); hero.destMarker = null; }
        hero.sprite.setAngle(0);
        hero.moveTween = null;
        hero.at = spot.id;
        hero.pathNode = this.getPathNodeForPlaceId(spot.id)?.id || hero.pathNode;
        hero.destination = null;
        hero.state = 'idle';
        hero.currentAction = `Idle near ${spotName}`;
        hero.intent = {
          action: 'Idle',
          destinationId: spot.id,
          destinationName: spotName,
          reason: 'Reached destination.',
          risk: 'Low',
        };
        this.setHeroAnimationState(hero, this.isHeroInjured(hero) ? 'hurt' : 'idle');
        onArrive?.();
        return;
      }
      const deltaX = point.x - hero.container.x;
      const deltaY = point.y - hero.container.y;
      this.setHeroFacing(
        hero,
        Math.abs(deltaX) >= Math.abs(deltaY)
          ? (deltaX >= 0 ? 'east' : 'west')
          : (deltaY >= 0 ? 'south' : 'north'),
      );
      if (!hero.directionalWalk) hero.sprite.setFlipX(point.x < hero.container.x);
      const dist = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, point.x, point.y);
      const roadSpeed = ROAD_TYPES[point.roadType]?.speed || 1;
      const duration = Math.max(180, (dist / (hero.def.speed * roadSpeed)) * 1000);
      hero.moveTween = this.tweens.add({
        targets: hero.container,
        x: point.x,
        y: point.y,
        duration,
        ease: point.final ? 'Sine.easeInOut' : 'Linear',
        onUpdate: () => hero.container.setDepth(hero.container.y),
        onComplete: () => {
          if (point.pathNode) hero.pathNode = point.pathNode;
          moveSegment(index + 1);
        },
      });
    };

    moveSegment(0);
  }

  onAmbientArrive(hero, spot) {
    // non-whales get bounced off the VIP rope more often than not
    if ((spot.id === 'whale' || spot.id === 'vip_rope_entrance') && hero.def.personality !== 'Noble Whale') {
      if (hero.def.personality === 'Debt Goblin' && Math.random() < 0.35) {
        this.say(hero, 'Snuck in. Shh.');
        this.enterBuilding(hero);
        return;
      }
      if (Math.random() < 0.6) {
        const line = this.pickHeroLine(hero, [...DENIED_LINES, ...QUEUE_LINES]);
        this.say(hero, line);
        this.floatText(spot.x, spot.y - 34, 'VIPs ONLY', '#e74c3c');
        hero.timer = this.time.delayedCall(900, () => this.ambientMove(hero));
        return;
      }
    }
    if ((spot.id === 'whale' || spot.id === 'vip_rope_entrance') && hero.def.personality === 'Noble Whale') {
      if (Math.random() < 0.85) {
        this.say(hero, 'Premium pathing.', true);
        this.enterBuilding(hero);
        return;
      }
    }

    if (Math.random() < 0.55) {
      this.enterBuilding(hero);
    } else {
      this.scheduleAmbient(hero, Phaser.Math.Between(1200, 5000));
    }
  }

  recordBuildingUse(id, hero = null) {
    if (!this.isBuildingPlaced(id)) return null;
    const place = this.buildingById[id];
    if (!this.getBuildingRoadAccess(place).connected) return null;
    const runtime = this.getBuildingRuntime(id);
    if (runtime.closed) return null;
    runtime.usageCount += 1;
    runtime.visitorsTotal += 1;
    runtime.upgradeProgress = Math.min(100, runtime.upgradeProgress + 4);
    const role = getBuildingRole(id);
    if (role?.progressCounter && role.progressCounter !== 'usageCount') {
      runtime[role.progressCounter] = (runtime[role.progressCounter] || 0) + 1;
    }
    if (REST_BUILDINGS[id]) runtime.heroesRested = (runtime.heroesRested || 0) + 1;
    const sprite = this.placeSpriteById[id];
    if (sprite && !sprite.getData('usagePulse')) {
      sprite.setData('usagePulse', true);
      const baseX = sprite.getData('baseScaleX') || sprite.scaleX;
      const baseY = sprite.getData('baseScaleY') || sprite.scaleY;
      this.tweens.add({
        targets: sprite,
        scaleX: baseX * 1.035,
        scaleY: baseY * 1.035,
        duration: 180,
        yoyo: true,
        onComplete: () => sprite.setData('usagePulse', false),
      });
    }
    if (runtime.usageCount % 5 === 0) {
      this.floatText(place.x, place.y - place.h - 8, `${runtime.usageCount} VISITS`, '#7fdc93');
    }
    if (hero) this.addHeroHistory(hero, `Used ${place.name}.`);
    return runtime;
  }

  // hero slips inside the building for a moment, then pops back out
  enterBuilding(hero) {
    const runtime = this.isBuildingPlaced(hero.at) ? this.getBuildingRuntime(hero.at) : null;
    const catalog = getBuildingCatalogEntry(hero.at);
    const place = this.buildingById?.[hero.at];
    const capacity = place ? this.getBuildingCapacity(place) : runtime?.capacity;
    if (runtime?.closed) {
      hero.stats.morale = Math.max(0, hero.stats.morale - 2);
      this.say(hero, 'Closed. Naturally.', true);
      this.scheduleAmbient(hero, Phaser.Math.Between(1200, 2600));
      return;
    }
    if (catalog?.capacity && runtime && runtime.visitorsNow >= capacity) {
      runtime.overloadedDays = (runtime.overloadedDays || 0) + 1;
      hero.stats.morale = Math.max(0, hero.stats.morale - 4);
      this.say(hero, 'Indoors is full.', true);
      this.game.events.emit('gwg-event', `${hero.def.name} discovered the premium feature called indoors.`);
      this.scheduleAmbient(hero, Phaser.Math.Between(1200, 2600));
      return;
    }
    if (runtime) {
      runtime.visitorsNow += 1;
      this.recordBuildingUse(hero.at, hero);
    }
    hero.state = 'inside';
    hero.currentAction = `Visiting ${this.getPlaceName(hero.at)}`;
    hero.intent = {
      action: 'Visiting',
      destinationId: hero.at,
      destinationName: this.getPlaceName(hero.at),
      reason: 'Using town services.',
      risk: 'Low',
    };
    this.setHeroAnimationState(hero, 'interact');
    this.tweens.add({ targets: hero.container, alpha: 0, duration: 250 });
    hero.timer = this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
      if (runtime) runtime.visitorsNow = Math.max(0, runtime.visitorsNow - 1);
      this.tweens.add({ targets: hero.container, alpha: 1, duration: 250 });
      hero.state = 'idle';
      hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
      hero.intent = {
        action: 'Idle',
        destinationId: hero.at,
        destinationName: this.getPlaceName(hero.at),
        reason: 'Recovered from service interaction.',
        risk: 'Low',
      };
      this.setHeroAnimationState(hero, this.isHeroInjured(hero) ? 'hurt' : 'idle');
      this.scheduleAmbient(hero, Phaser.Math.Between(800, 3000));
    });
  }

  // --- speech bubbles & floating text --------------------------------------

  hasNearbyBubble(hero, minDistance = BUBBLE_MIN_SPACING) {
    return this.heroes.some((other) => (
      other !== hero
      && other.bubble
      && Phaser.Math.Distance.Between(
        other.container.x,
        other.container.y,
        hero.container.x,
        hero.container.y,
      ) < minDistance
    ));
  }

  clearHeroBubble(hero, fade = false) {
    if (!hero?.bubble) return;
    const bubble = hero.bubble;
    hero.bubble = null;
    if (hero.bubbleTimer) {
      hero.bubbleTimer.remove();
      hero.bubbleTimer = null;
    }
    this.activeBubbles = Math.max(0, this.activeBubbles - 1);

    if (fade && bubble.active) {
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 220,
        onComplete: () => bubble.destroy(),
      });
    } else {
      bubble.destroy();
    }
  }

  clearOldestBubble() {
    const bubbled = this.heroes
      .filter((h) => h.bubble)
      .sort((a, b) => (a.bubbleStartedAt || 0) - (b.bubbleStartedAt || 0));
    if (bubbled.length > 0) this.clearHeroBubble(bubbled[0]);
  }

  say(hero, text, important = false) {
    if (!hero || !text) return;
    const maxBubbles = important
      ? (this.rsp?.maxImportantBubbles ?? MAX_IMPORTANT_BUBBLES)
      : (this.rsp?.maxIdleBubbles ?? MAX_IDLE_BUBBLES);
    if (!important && this.activeBubbles >= maxBubbles) return;
    if (!important && this.hasNearbyBubble(hero)) return;
    if (important && this.activeBubbles >= maxBubbles) this.clearOldestBubble();
    if (important) this.importantChatterUntil = this.time.now + 3800;

    this.clearHeroBubble(hero);
    hero.container.setAlpha(1);
    if (important) this.showHeroLabelBriefly(hero, 3400);

    const txt = this.add.text(0, -4, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#141a24',
      wordWrap: { width: 190 },
      lineSpacing: 3,
    }).setOrigin(0.5, 1);

    const bw = txt.width + 18;
    const bh = txt.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0xfff6dc, 0.97);
    g.fillRoundedRect(-bw / 2, -bh - 2, bw, bh, 5);
    g.fillTriangle(-4, -3, 4, -3, 0, 3); // tail
    g.lineStyle(2, 0x1d2430, 0.65);
    g.strokeRoundedRect(-bw / 2, -bh - 2, bw, bh, 5);

    const view = this.getVisibleWorldRect();
    const left = hero.container.x - bw / 2;
    const right = hero.container.x + bw / 2;
    let edgeOffset = 0;
    if (left < view.left + 12) edgeOffset = view.left + 12 - left;
    if (right > view.right - 12) edgeOffset = view.right - 12 - right;

    let localY = -64;
    const top = hero.container.y + localY - bh - 2;
    if (top < view.top + 52) localY += view.top + 52 - top;

    const bubble = this.add.container(edgeOffset, localY, [g, txt]).setScale(0);
    hero.container.add(bubble);
    hero.bubble = bubble;
    hero.bubbleStartedAt = this.time.now;
    this.activeBubbles += 1;

    this.tweens.add({ targets: bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    hero.bubbleTimer = this.time.delayedCall(
      important ? IMPORTANT_BUBBLE_DURATION_MS : IDLE_BUBBLE_DURATION_MS,
      () => this.clearHeroBubble(hero, true),
    );
  }

  floatText(x, y, str, color) {
    this.floaters = this.floaters.filter((item) => item.active);
    while (this.floaters.length >= (this.rsp?.maxFloatingTexts ?? MAX_FLOATING_TEXTS)) {
      const oldest = this.floaters.shift();
      if (oldest?.active) oldest.destroy();
    }

    const view = this.getVisibleWorldRect();
    const safeX = Phaser.Math.Clamp(x, view.left + 58, view.right - 58);
    const safeY = Phaser.Math.Clamp(y, view.top + 60, view.bottom - 72);
    const t = this.add.text(safeX, safeY, str, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      stroke: '#141a24',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(4000);
    this.floaters.push(t);
    this.tweens.add({
      targets: t, y: safeY - 38, alpha: 0,
      duration: 1500, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.floaters = this.floaters.filter((item) => item !== t);
        t.destroy();
      },
    });
  }

  // pop the resource deltas of an event above a building, staggered
  floatDeltas(x, y, deltas) {
    let i = 0;
    for (const [key, value] of Object.entries(deltas)) {
      if (!value) continue;
      const label = `${value > 0 ? '+' : ''}${value}${RES_SHORT[key]}`;
      this.time.delayedCall(i * 260, () => this.floatText(x, y - i * 6, label, RES_COLORS[key]));
      i += 1;
    }
  }

  initializeWorldDanger() {
    const points = Object.values(this.explorationPointById || {});
    this.monsterLairs = normalizeLairs(this.monsterState?.lairs, points, this.day);
    for (const lair of Object.values(this.monsterLairs)) {
      // Active IDs are reconstructed from the persisted actor records below;
      // clearing stale IDs here prevents old corpses from occupying a lair cap.
      lair.activeMonsterIds = [];
      const point = this.explorationPointById?.[lair.poiId];
      if (!point) continue;
      lair.discovered = Boolean(lair.discovered || this.discoveredPois?.has(point.id));
      point.lairId = lair.id;
      point.lair = true;
      point.mapPointType = 'Monster Lair';
    }
  }

  normalizeAftermathDrops(drops = []) {
    const normalized = (Array.isArray(drops) ? drops : [])
      .filter((drop) => drop?.id && Number.isFinite(Number(drop.x)) && Number.isFinite(Number(drop.y)))
      .map((drop) => normalizeAftermathRecord({
        ...drop,
        x: Number(drop.x),
        y: Number(drop.y),
        gridX: Number.isInteger(drop.gridX) ? drop.gridX : null,
        gridY: Number.isInteger(drop.gridY) ? drop.gridY : null,
        name: drop.name || 'Monster Aftermath',
        assetKey: drop.assetKey || 'loot_bag_small',
        fallbackKey: drop.fallbackKey || 'object_coin_pile',
        heroName: drop.heroName || null,
        role: drop.role || null,
        epitaph: drop.epitaph || null,
        areaId: drop.areaId || null,
      }, this.day))
      .filter((drop) => !drop.cleared && getDecayState(drop, this.day).id !== 'gone');
    const graves = normalized.filter((drop) => drop.kind === 'grave');
    const remains = normalized.filter((drop) => drop.kind === 'remains').slice(-AFTERMATH_LIMITS.maxRemains);
    const loot = normalized.filter((drop) => drop.kind === 'loot').slice(-AFTERMATH_LIMITS.maxLoot);
    return [...graves, ...remains, ...loot].slice(-(AFTERMATH_LIMITS.maxRemains + AFTERMATH_LIMITS.maxLoot + 16));
  }

  serializeAftermathDrops() {
    return this.normalizeAftermathDrops(this.aftermathDrops).map((drop) => ({
      ...drop,
      x: Math.round(drop.x),
      y: Math.round(drop.y),
    }));
  }

  normalizeAftermathQuests(quests = []) {
    return (Array.isArray(quests) ? quests : [])
      .filter((quest) => quest?.id && quest?.targetId)
      .map((quest) => ({ ...quest, status: quest.status === 'complete' ? 'complete' : 'active' }))
      .slice(-24);
  }

  createAftermathQuest(target, type, text) {
    if (!target || this.aftermathQuests.some((quest) => quest.targetId === target.id && quest.status === 'active')) return null;
    const quest = {
      id: `aftermath-quest-${target.id}`,
      targetId: target.id,
      type,
      title: text,
      createdDay: this.day,
      status: 'active',
    };
    this.aftermathQuests.push(quest);
    target.relatedQuestId = quest.id;
    this.addTownLog(`World task: ${text}`, 'quest');
    return quest;
  }

  completeAftermathQuest(targetId, reason) {
    const quest = this.aftermathQuests.find((entry) => entry.targetId === targetId && entry.status === 'active');
    if (!quest) return;
    quest.status = 'complete';
    quest.completedDay = this.day;
    this.addTownLog(`World task complete: ${quest.title}. ${reason}`, 'quest');
  }

  serializeMonsterActors() {
    return (this.activeMonsterActors || [])
      .filter((actor) => actor?.container?.active && actor.state !== MONSTER_STATES.DYING && actor.state !== MONSTER_STATES.DEAD)
      .slice(0, WORLD_DANGER_LIMITS.maxActiveMonsters)
      .map((actor) => ({
        id: actor.id,
        monsterId: actor.monster.id,
        monster: {
          id: actor.monster.id,
          name: actor.monster.name,
          assetKey: actor.monster.assetKey,
          power: actor.monster.power,
          threat: actor.monster.threat,
          speed: actor.monster.speed,
          flavour: actor.monster.flavour,
        },
        x: Math.round(actor.container.x),
        y: Math.round(actor.container.y),
        target: actor.target ? {
          id: actor.target.id,
          name: actor.target.name,
          x: Math.round(actor.target.x),
          y: Math.round(actor.target.y),
        } : null,
        state: actor.state || 'roaming',
        intent: actor.intent || 'Looking for public infrastructure.',
        createdDay: actor.createdDay || this.day,
        health: Math.max(0, Math.round(actor.health || 0)),
        maxHealth: Math.max(1, Math.round(actor.maxHealth || 1)),
        homeLairId: actor.homeLairId || null,
        homeX: Math.round(actor.homeX || actor.container.x),
        homeY: Math.round(actor.homeY || actor.container.y),
        targetRef: actor.targetRef ? { ...actor.targetRef } : null,
        priority: Boolean(actor.priority),
        kills: Number(actor.kills) || 0,
        stolenCargo: Number(actor.stolenCargo) || 0,
        detectedAt: Number(actor.detectedAt) || 0,
        detectedDay: Number(actor.detectedDay) || 0,
        detectedBy: actor.detectedBy || null,
        detectionKind: actor.detectionKind || null,
        raidId: actor.raidId || null,
        raidTargetRef: actor.raidTargetRef ? { ...actor.raidTargetRef } : null,
      }));
  }

  buildAftermathDrops() {
    this.aftermathDropObjectsById = {};
    this.aftermathDrops = this.normalizeAftermathDrops(this.aftermathDrops);
    for (const drop of this.aftermathDrops) this.renderAftermathDrop(drop);
  }

  getVisibleDropAlpha(drop) {
    if (!this.isBuilderCity || !Number.isInteger(drop.gridX) || !Number.isInteger(drop.gridY)) return 1;
    const activeSet = this.getActiveVisibilitySet();
    if (!this.isRevealed(drop.gridX, drop.gridY)) return 0;
    return activeSet.has(gridKey(drop.gridX, drop.gridY)) ? 1 : 0.52;
  }

  renderAftermathDrop(drop) {
    if (!drop || this.aftermathDropObjectsById?.[drop.id]) return;
    this.aftermathDropObjectsById = this.aftermathDropObjectsById || {};
    const textureKey = resolveTexture(this, drop.assetKey, drop.fallbackKey || 'object_coin_pile') || 'crate';
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const scale = source?.height ? Phaser.Math.Clamp(34 / source.height, 0.32, 0.95) : 0.65;
    const container = this.add.container(drop.x, drop.y).setDepth(drop.y + 64);
    const shadow = this.add.ellipse(0, -4, 34, 9, 0x10151d, 0.22);
    const sprite = this.add.image(0, -8, textureKey).setOrigin(0.5, 1).setScale(scale);
    const isRemains = drop.kind === 'remains' || drop.kind === 'grave';
    const label = this.add.text(0, -44, drop.kind === 'grave' ? drop.heroName || 'Grave' : drop.kind === 'remains' ? drop.name : 'Loot', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: isRemains ? '#d4dae2' : '#ffe08a',
      stroke: '#0c1118',
      strokeThickness: 2,
      backgroundColor: '#0f1521aa',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setAlpha(0);
    container.add([shadow, sprite, label]);
    container.setSize(54, 54);
    container.setInteractive(new Phaser.Geom.Rectangle(-27, -54, 54, 54), Phaser.Geom.Rectangle.Contains);
    container.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.selectWorldInteractionTarget(pointer);
    });
    const target = {
      id: drop.id,
      type: 'aftermath',
      hit: container,
      img: container,
      width: 54,
      height: 54,
      loot: drop,
      getCenter: () => ({ x: container.x, y: container.y - 28 }),
      onHoverIn: () => { sprite.setTint(0xfff3c0); label.setAlpha(0.9); },
      onHoverOut: () => { sprite.clearTint?.(); if (this.activeInspector?.id !== drop.id) label.setAlpha(0); },
      onSelect: () => this.showLootInspector(drop),
    };
    this.registerWorldInteractionTarget(target);
    this.aftermathDropObjectsById[drop.id] = { container, sprite, label, target };
    const alpha = this.getVisibleDropAlpha(drop);
    container.setVisible(alpha > 0);
    container.setAlpha(alpha);
  }

  updateAftermathVisibility() {
    if (!this.aftermathDropObjectsById) return;
    for (const drop of this.aftermathDrops || []) {
      const bundle = this.aftermathDropObjectsById[drop.id];
      if (!bundle?.container) continue;
      const alpha = this.getVisibleDropAlpha(drop);
      const decayAlpha = getDecayState(drop, this.day).alpha;
      bundle.container.setVisible(alpha > 0);
      bundle.container.setAlpha(alpha * decayAlpha);
    }
  }

  showLootInspector(drop) {
    if (!drop || drop.cleared) return;
    const isRemains = drop.kind === 'remains' || drop.kind === 'grave';
    const decay = getDecayState(drop, this.day);
    const lair = drop.homeLairId ? this.monsterLairs?.[drop.homeLairId] : null;
    const claim = drop.claimedByHeroName || (drop.claimedByHeroId ? this.heroes.find((hero) => hero.def.id === drop.claimedByHeroId)?.def.name : null);
    const localDanger = this.getAreaReputation(drop.areaId || 'frontier');
    this.activeInspector = { type: 'aftermath', id: drop.id };
    this.aftermathDropObjectsById?.[drop.id]?.label?.setAlpha(0.9);
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'aftermath',
      title: drop.name,
      subtitle: drop.kind === 'grave' ? `${drop.role || 'Town worker'} memorial` : `${drop.monsterName} aftermath - ${decay.label}`,
      sections: [
        {
          title: drop.kind === 'grave' ? 'Memorial' : drop.kind === 'remains' ? 'Remains' : 'Loose Loot',
          lines: [
            drop.kind === 'grave'
              ? `${drop.heroName || 'An unnamed worker'} died here on Day ${drop.deathDay}.`
              : `${drop.monsterName} died here on Day ${drop.deathDay}.`,
            `Killed by: ${drop.killerName || drop.killer || 'unknown'} | Cause: ${drop.causeOfDeath}`,
            `Age: ${decay.age} day${decay.age === 1 ? '' : 's'} | ${decay.remaining > 0 ? `${decay.remaining} until decay` : 'decayed'}`,
            `Remaining loot: ${formatLootContents(drop.lootContents)}`,
            `Claimed by: ${claim || 'Nobody'}`,
            drop.kind === 'grave'
              ? drop.epitaph || 'The paperwork survived.'
              : drop.flavour || 'Loot rights remain disputed by everyone who arrived after the fighting stopped.',
            `Danger effect: +${drop.dangerEffect || 0} | Corruption: +${drop.corruptionEffect || 0}`,
            `Tracking evidence: ${drop.evidenceState === 'resolved' ? 'resolved' : drop.evidenceValue > 0 ? `${drop.evidenceValue}/5` : 'none'}`,
            `Home lair: ${lair?.discovered ? lair.name : lair ? 'Unknown source; tracks may help' : 'Unknown'}`,
            `Local danger reputation: ${localDanger}/100`,
            ...(drop.relatedQuestId ? [`World task: ${this.aftermathQuests.find((quest) => quest.id === drop.relatedQuestId)?.title || 'Aftermath cleanup'}`] : []),
          ],
        },
      ],
      actions: [
        ...(isRemains ? [{ label: 'Inspect Remains', event: 'gwg-aftermath-action', id: `${drop.id}|inspect` }] : []),
        ...(Object.keys(drop.lootContents || {}).length ? [
          { label: 'Loot Now', event: 'gwg-aftermath-action', id: `${drop.id}|loot` },
          { label: 'Assign Hero to Loot', event: 'gwg-aftermath-action', id: `${drop.id}|assign-loot`, disabled: Boolean(drop.claimedByHeroId) },
        ] : []),
        ...(isRemains ? [
          { label: 'Burn Remains', event: 'gwg-aftermath-action', id: `${drop.id}|burn`, disabled: (this.townInventory.wood || 0) < 1 },
          { label: 'Bury Remains', event: 'gwg-aftermath-action', id: `${drop.id}|bury` },
          { label: 'Follow Tracks', event: 'gwg-aftermath-action', id: `${drop.id}|tracks`, disabled: drop.evidenceState === 'resolved' || !drop.homeLairId },
          { label: 'Mark Area Dangerous', event: 'gwg-aftermath-action', id: `${drop.id}|mark-danger` },
          { label: 'Leave It', event: 'gwg-aftermath-action', id: `${drop.id}|leave` },
        ] : []),
        { label: 'Open Town Log', event: 'gwg-open-town-log' },
      ],
    });
  }

  collectLootDrop(id, collector = null) {
    const drop = this.aftermathDrops?.find((item) => item.id === id && !item.cleared);
    if (!drop || drop.kind === 'grave') return false;
    if (drop.claimedByHeroId && collector && drop.claimedByHeroId !== collector.def.id) return false;
    const contents = { ...(drop.lootContents || {}) };
    const delivered = {};
    const leftovers = {};
    for (const [resource, amount] of Object.entries(contents)) {
      if (resource === 'gold') {
        delivered.gold = amount;
        this.applyDeltas({ gold: amount });
        continue;
      }
      const gained = this.addTownResource(resource, amount, `${collector?.def?.name || 'Aftermath recovery'}`);
      if (gained > 0) delivered[resource] = gained;
      if (gained < amount) leftovers[resource] = amount - gained;
    }
    const deliveredValue = Object.values(delivered).reduce((sum, amount) => sum + amount, 0);
    if (deliveredValue <= 0) {
      drop.claimedByHeroId = null;
      drop.claimedByHeroName = null;
      this.game.events.emit('gwg-event', 'Storage is full. The loot remains exactly where the problem started.');
      this.showLootInspector(drop);
      return false;
    }
    drop.lootContents = leftovers;
    drop.searched = true;
    if (delivered.premiumSalvage) this.applyDeltas({ corruption: 1, morale: -1 });
    if (collector) {
      collector.stats.gold = (collector.stats.gold || 0) + (delivered.gold || 0);
      collector.stats.fame = Phaser.Math.Clamp((collector.stats.fame || 0) + 1, 0, 100);
      collector.stats.envy = Phaser.Math.Clamp((collector.stats.envy || 0) + (delivered.premiumSalvage ? 3 : 0), 0, 100);
      this.addHeroHistory(collector, `Collected ${drop.name} after ${drop.monsterName}.`);
      const killer = drop.killerId ? this.getHeroById(drop.killerId) : null;
      const party = this.getPartyForHero(collector);
      if (killer && killer !== collector && party?.id === this.getPartyForHero(killer)?.id) {
        if (['equal', 'need'].includes(party.lootPolicy)) {
          this.recordHeroRelationshipEvent(killer, collector, 'loot_shared', { relatedId: drop.id, location: drop.areaId || 'battlefield', reciprocal: true });
        } else if (party.lootPolicy === 'finders') {
          this.recordHeroRelationshipEvent(killer, collector, 'loot_stolen', {
            text: `${collector.def.name} claimed ${drop.name} under Finders Keepers.`,
            relatedId: drop.id,
            severity: 3,
          });
        }
      }
      this.say(collector, 'Loot secured.', true);
    }
    const summary = formatLootContents(delivered);
    this.addTownLog(`${collector ? `${collector.def.name} collected` : 'Collected'} ${drop.name}: ${summary}.`, 'monster');
    this.addReportLine('monsters', `${drop.name} recovered: ${summary}.`);
    this.game.events.emit('gwg-event', Phaser.Utils.Array.GetRandom(LOOT_PICKUP_LINES));
    this.floatText(drop.x, drop.y - 48, 'RECOVERED', '#ffe08a');
    this.stats.lootCollected = (this.stats.lootCollected || 0) + 1;
    this.checkObjectives();
    this.publishTownHint();
    if (Object.keys(leftovers).length) {
      drop.claimedByHeroId = null;
      drop.claimedByHeroName = null;
      this.game.events.emit('gwg-event', `Some loot remains because storage is full: ${formatLootContents(leftovers)}.`);
      this.showLootInspector(drop);
      this.saveGame(false);
      return true;
    }
    drop.cleared = true;
    this.completeAftermathQuest(drop.id, 'The recoverable goods reached town storage.');
    const bundle = this.aftermathDropObjectsById?.[drop.id];
    if (bundle?.container) bundle.container.destroy(true);
    this.worldInteractionTargets = this.worldInteractionTargets.filter((target) => target.id !== drop.id);
    delete this.aftermathDropObjectsById?.[drop.id];
    this.aftermathDrops = this.normalizeAftermathDrops(this.aftermathDrops).filter((item) => item.id !== drop.id);
    this.saveGame(false);
    if (this.activeInspector?.type === 'aftermath') this.game.events.emit('gwg-inspector-close');
    return true;
  }

  cleanupAftermathDrops() {
    for (const drop of [...(this.aftermathDrops || [])]) {
      const decay = getDecayState(drop, this.day);
      drop.decayState = decay.state;
      const bundle = this.aftermathDropObjectsById?.[drop.id];
      if (bundle?.container?.active) {
        bundle.container.setAlpha(this.getVisibleDropAlpha(drop) * decay.alpha);
        if (decay.state === 'decaying') bundle.sprite?.setTint?.(0xb6a987);
      }
      if (drop.kind === 'remains' && decay.state !== 'fresh' && drop.lastDecayEffectDay !== this.day) {
        drop.lastDecayEffectDay = this.day;
        if ((drop.dangerEffect || 0) > 0) this.changeAreaReputation(drop.areaId, 1, `ignored ${drop.monsterName || 'monster'} remains`);
        if ((drop.corruptionEffect || 0) > 0) this.applyDeltas({ corruption: 1, morale: -1 });
      }
      if (!decay.expired && !drop.collected) continue;
      this.completeAftermathQuest(drop.id, 'The evidence decayed before anyone finished the paperwork.');
      this.clearAftermathObject(drop, 'Aftermath decayed naturally.', 0);
    }
    this.aftermathDrops = this.normalizeAftermathDrops(this.aftermathDrops).filter((drop) => !drop.cleared && !drop.collected);
  }

  createMonsterAftermath(monster, x, y, defeated = true, hero = null) {
    if (defeated) {
      const context = arguments[5] || {};
      const profile = getRemainsProfile(monster.id);
      const baseId = `${this.day}-${monster.id}-${Math.floor(Math.random() * 100000)}`;
      const cell = this.worldToBuildGrid(x, y);
      const areaId = context.areaId || `frontier-${Math.floor(cell.x / 8)}-${Math.floor(cell.y / 8)}`;
      const lair = context.homeLairId ? this.monsterLairs?.[context.homeLairId] : null;
      const remains = normalizeAftermathRecord({
        id: `remains-${baseId}`,
        kind: 'remains',
        name: `${monster.name}: ${profile.name}`,
        assetKey: profile.assetKey,
        fallbackKey: profile.fallbackKey,
        x: x - 10,
        y: y + 5,
        gridX: cell.x,
        gridY: cell.y,
        monsterId: monster.id,
        monsterName: monster.name,
        homeLairId: context.homeLairId || null,
        killerId: hero?.def?.id || context.killerId || null,
        killerName: hero?.def?.name || context.killerName || 'Town defenders',
        deathDay: this.day,
        causeOfDeath: context.causeOfDeath || 'Defeated in visible combat',
        remainsType: profile.type,
        decayDuration: profile.decayDays,
        dangerEffect: profile.danger,
        corruptionEffect: profile.corruption || 0,
        evidenceValue: profile.evidence,
        evidenceState: 'unread',
        lootContents: {},
        areaId,
        flavour: getAftermathFlavor(profile.type),
        large: Boolean(profile.large),
      }, this.day);
      this.aftermathDrops.push(remains);
      this.renderAftermathDrop(remains);
      this.changeAreaReputation(areaId, Math.max(1, profile.danger), `${monster.name} remains`);
      if (profile.corruption) this.applyDeltas({ corruption: profile.corruption });

      const contents = rollMonsterLoot(monster, lair?.level || 1, context.stolenCargo || 0);
      if (Object.keys(contents).length) {
        const premium = Boolean(contents.premiumSalvage);
        const loot = normalizeAftermathRecord({
          id: `loot-${baseId}`,
          kind: 'loot',
          name: premium ? 'Suspicious Premium Drop' : `${monster.name} Loot`,
          assetKey: premium ? 'loot_bag_premium' : 'loot_bag_small',
          fallbackKey: premium ? 'resource_premium_wreckage' : 'object_coin_pile',
          x: x + 13,
          y: y + 9,
          gridX: cell.x,
          gridY: cell.y,
          monsterId: monster.id,
          monsterName: monster.name,
          homeLairId: context.homeLairId || null,
          killerId: hero?.def?.id || null,
          killerName: hero?.def?.name || 'Town defenders',
          deathDay: this.day,
          remainsType: 'loot',
          decayDuration: premium ? 7 : 5,
          lootContents: contents,
          areaId,
          flavour: 'Loot rights remain disputed by everyone who arrived after the fighting stopped.',
        }, this.day);
        this.aftermathDrops.push(loot);
        this.renderAftermathDrop(loot);
        this.createAftermathQuest(loot, 'recover-loot', `Recover ${loot.name} before it decays`);
        this.floatText(loot.x, loot.y - 42, 'LOOT', '#ffe08a');
        this.time.delayedCall(Phaser.Math.Between(900, 1900), () => this.sendHeroToLoot(loot, hero));
      } else if (remains.evidenceValue > 0) {
        this.createAftermathQuest(remains, 'follow-tracks', `Investigate ${monster.name} remains for its source`);
      }
      this.enforceAftermathCaps();
      return;
    }
    const baseId = `${this.day}-${monster.id}-${Math.floor(Math.random() * 100000)}`;
    const cell = this.worldToBuildGrid(x, y);
    if (!defeated) {
      const debrisKey = Phaser.Utils.Array.GetRandom(['broken_sword', 'broken_shield', 'suspicious_coupon_drop']);
      const debris = {
        id: `debris-${baseId}`,
        kind: 'remains',
        name: 'Attack Debris',
        assetKey: debrisKey,
        fallbackKey: 'crate',
        x,
        y: y + 8,
        gridX: cell.x,
        gridY: cell.y,
        gold: 0,
        monsterName: monster.name,
        createdDay: this.day,
        expiresDay: this.day + 3,
      };
      this.aftermathDrops.push(debris);
      this.renderAftermathDrop(debris);
      return;
    }
    const remainsKey = MONSTER_REMAINS_BY_ID[monster.id] || (monster.id.includes('skeleton') ? 'corpse_skeleton_bones' : 'corpse_goblin_remains');
    const corpse = {
      id: `corpse-${baseId}`,
      kind: 'corpse',
      name: `${monster.name} Remains`,
      assetKey: remainsKey,
      fallbackKey: remainsKey === 'corpse_slime_puddle' ? 'rock' : 'object_rock_02',
      x: x - 12,
      y: y + 6,
      gridX: cell.x,
      gridY: cell.y,
      gold: 0,
      monsterName: monster.name,
      createdDay: this.day,
      expiresDay: this.day + 4,
    };
    this.aftermathDrops.push(corpse);
    this.renderAftermathDrop(corpse);

    const premium = ['premium_goblin', 'debt_wraith', 'refund_ghost', 'loot_mimic', 'audit_imp', 'coin_golem'].includes(monster.id);
    const lootKeys = premium ? PREMIUM_MONSTER_LOOT_KEYS : MONSTER_LOOT_KEYS;
    const lootKey = Phaser.Utils.Array.GetRandom(lootKeys);
    const gold = Math.max(10, Math.floor((monster.reward || monster.threat * 18) * Phaser.Math.FloatBetween(0.28, 0.55)));
    const loot = {
      id: `loot-${baseId}`,
      kind: 'loot',
      name: premium ? 'Suspicious Premium Drop' : 'Monster Loot Bag',
      assetKey: lootKey,
      fallbackKey: lootKey.includes('coin') ? 'object_coin_pile' : 'crate',
      x: x + 14,
      y: y + 10,
      gridX: cell.x,
      gridY: cell.y,
      gold,
      monsterName: monster.name,
      createdDay: this.day,
      expiresDay: this.day + 5,
    };
    this.aftermathDrops.push(loot);
    this.renderAftermathDrop(loot);
    this.floatText(loot.x, loot.y - 42, 'LOOT', '#ffe08a');
    this.sendHeroToLoot(loot, hero);
  }

  enforceAftermathCaps() {
    const protectedIds = new Set(this.aftermathQuests.filter((quest) => quest.status === 'active').map((quest) => quest.targetId));
    const removable = this.aftermathDrops
      .filter((drop) => drop.kind !== 'grave' && !protectedIds.has(drop.id))
      .sort((a, b) => a.deathDay - b.deathDay);
    const excess = Math.max(0, this.aftermathDrops.filter((drop) => drop.kind !== 'grave').length - (AFTERMATH_LIMITS.maxRemains + AFTERMATH_LIMITS.maxLoot));
    for (const drop of removable.slice(0, excess)) this.clearAftermathObject(drop, 'Old low-value aftermath decayed under the global cap.', 0);
    for (const [kind, limit] of [['remains', AFTERMATH_LIMITS.maxRemains], ['loot', AFTERMATH_LIMITS.maxLoot]]) {
      const kindOverflow = this.aftermathDrops
        .filter((drop) => drop.kind === kind && !protectedIds.has(drop.id))
        .sort((a, b) => a.deathDay - b.deathDay)
        .slice(0, Math.max(0, this.aftermathDrops.filter((drop) => drop.kind === kind).length - limit));
      for (const drop of kindOverflow) this.clearAftermathObject(drop, `Old ${kind} exceeded the bounded world cap.`, 0);
    }
    const areas = new Map();
    for (const drop of this.aftermathDrops.filter((entry) => entry.kind !== 'grave')) {
      const areaId = drop.areaId || 'town';
      if (!areas.has(areaId)) areas.set(areaId, []);
      areas.get(areaId).push(drop);
    }
    for (const drops of areas.values()) {
      const overflow = drops
        .filter((drop) => !protectedIds.has(drop.id))
        .sort((a, b) => a.deathDay - b.deathDay)
        .slice(0, Math.max(0, drops.length - AFTERMATH_LIMITS.maxPerArea));
      for (const drop of overflow) this.clearAftermathObject(drop, 'Local aftermath density cap compacted old evidence.', 0);
    }
  }

  sendHeroToLoot(drop, preferredHero = null) {
    if (!drop || drop.kind === 'grave' || drop.cleared || drop.claimedByHeroId) return false;
    const candidates = this.getActiveHeroes()
      .filter((hero) => hero.state !== 'inside' && hero.state !== 'away' && !this.isHeroInjured(hero) && !hero.combatTargetId)
      .map((hero) => {
        const distance = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, drop.x, drop.y);
        const premiumValue = Number(drop.lootContents?.premiumSalvage || 0);
        const greed = (hero.stats.envy || 0) + (this.isWhaleHero(hero.def) ? 35 : 0) + (premiumValue && hero.stats.whaleAccess ? 45 : 0);
        const party = this.getPartyForHero(hero);
        const killerParty = drop.killerId ? this.getPartyForHero(this.getHeroById(drop.killerId)) : null;
        const sameParty = party && killerParty?.id === party.id;
        const equipment = normalizeHeroEquipment(hero.stats.equipment);
        let policyBonus = 0;
        if (sameParty && party.lootPolicy === 'equal') policyBonus += 24;
        if (party?.lootPolicy === 'leader' && party.leaderId === hero.def.id) policyBonus += 38;
        if (party?.lootPolicy === 'need' && (equipment.weapon === 'Poor' || equipment.armor === 'Poor')) policyBonus += 42;
        if (party?.lootPolicy === 'premium' && hero.stats.whaleAccess) policyBonus += 48;
        if (party?.lootPolicy === 'finders') policyBonus += Math.max(0, 35 - distance / 8);
        const killerBonus = drop.killerId === hero.def.id ? (party?.lootPolicy === 'killer' ? 120 : 80) : 0;
        return { hero, score: killerBonus + policyBonus + greed - distance / 12 };
      })
      .sort((a, b) => b.score - a.score);
    const hero = preferredHero?.state !== 'away' && !this.isHeroInjured(preferredHero) ? preferredHero : candidates[0]?.hero;
    if (!hero) return false;
    drop.claimedByHeroId = hero.def.id;
    drop.claimedByHeroName = hero.def.name;
    const delay = Phaser.Math.Between(1100, 2600);
    this.time.delayedCall(delay, () => {
      if (!this.aftermathDrops?.some((item) => item.id === drop.id && !item.cleared) || drop.claimedByHeroId !== hero.def.id) return;
      this.walkTo(hero, {
        id: drop.id,
        name: drop.name,
        x: drop.x,
        y: drop.y,
        h: 30,
        intentAction: `Looting ${drop.name}`,
        reason: 'Greedy opportunity with a finite despawn timer.',
        risk: 'Low',
      }, () => {
        hero.state = 'looting';
        hero.currentAction = `Looting ${drop.name}`;
        this.setHeroAnimationState(hero, 'interact');
        this.collectLootDrop(drop.id, hero);
        this.scheduleAmbient(hero, Phaser.Math.Between(1800, 3800));
      });
    });
    return true;
  }

  getAftermathWorker(drop, preferGuard = false) {
    const heroes = this.getActiveHeroes()
      .filter((hero) => hero.state !== 'away' && !this.isHeroInjured(hero) && !hero.combatTargetId && !hero.stats.gatheringNodeId)
      .map((hero) => ({ hero, distance: Phaser.Math.Distance.Between(hero.container.x, hero.container.y, drop.x, drop.y) }))
      .sort((a, b) => a.distance - b.distance);
    if (preferGuard) {
      const veteran = heroes.find(({ hero }) => this.isVeteranHero(hero.def));
      if (veteran) return veteran.hero;
    }
    return heroes[0]?.hero || null;
  }

  clearAftermathObject(drop, reason, reputationDelta = -2) {
    if (!drop) return;
    drop.cleared = true;
    const bundle = this.aftermathDropObjectsById?.[drop.id];
    if (bundle?.container) bundle.container.destroy(true);
    this.worldInteractionTargets = this.worldInteractionTargets.filter((target) => target.id !== drop.id);
    delete this.aftermathDropObjectsById?.[drop.id];
    this.aftermathDrops = this.aftermathDrops.filter((item) => item.id !== drop.id);
    this.completeAftermathQuest(drop.id, reason);
    if (drop.areaId && reputationDelta) this.changeAreaReputation(drop.areaId, reputationDelta, reason);
    if (this.activeInspector?.id === drop.id) {
      this.activeInspector = null;
      this.game.events.emit('gwg-inspector-close');
    }
  }

  runAftermathActionFromUi(value) {
    const [id, action = 'inspect'] = String(value || '').split('|');
    const drop = this.aftermathDrops.find((item) => item.id === id && !item.cleared);
    if (!drop) return;
    if (action === 'leave') {
      this.game.events.emit('gwg-inspector-close');
      return;
    }
    if (action === 'mark-danger') {
      drop.markedDangerous = true;
      this.changeAreaReputation(drop.areaId || 'frontier', 2, `${drop.name} marked dangerous`);
      this.addTownLog(`${drop.name} was marked dangerous. The map now agrees with the smell.`, 'threat');
      this.showLootInspector(drop);
      return;
    }
    if (action === 'inspect') {
      drop.searched = true;
      drop.evidenceState = drop.evidenceValue > 0 ? 'ready' : 'none';
      this.addTownLog(`${drop.name} was inspected. ${drop.flavour || 'The remains declined to clarify the encounter.'}`, 'monster');
      this.showLootInspector(drop);
      this.saveGame(false);
      return;
    }
    if (action === 'loot' || action === 'assign-loot') {
      if (!this.sendHeroToLoot(drop)) this.game.events.emit('gwg-event', 'No healthy unassigned hero can claim that loot right now.');
      this.showLootInspector(drop);
      this.saveGame(false);
      return;
    }
    const hero = this.getAftermathWorker(drop, action === 'burn');
    if (!hero) {
      this.game.events.emit('gwg-event', 'No healthy hero is free for aftermath duty. The smell remains employed.');
      return;
    }
    if (action === 'burn' && (this.townInventory.wood || 0) < 1) {
      this.game.events.emit('gwg-event', 'Burning remains needs 1 wood. Fire has maintained its input requirements.');
      return;
    }
    const intent = action === 'tracks' ? 'Following tracks' : action === 'burn' ? 'Burning remains' : 'Burying remains';
    this.walkTo(hero, {
      id: drop.id,
      name: drop.name,
      x: drop.x,
      y: drop.y,
      h: 28,
      intentAction: intent,
      reason: `${intent} near ${drop.monsterName}.`,
      risk: drop.dangerEffect >= 5 ? 'Moderate' : 'Low',
    }, () => {
      hero.state = 'interacting';
      hero.currentAction = intent;
      this.setHeroAnimationState(hero, 'interact');
      this.time.delayedCall(850, () => {
        if (!this.aftermathDrops.some((item) => item.id === drop.id && !item.cleared)) return;
        if (action === 'tracks') this.followAftermathTracks(drop, hero);
        else {
          if (action === 'burn') this.townInventory.wood = Math.max(0, (this.townInventory.wood || 0) - 1);
          const verb = action === 'burn' ? 'burned' : 'buried';
          this.addTownLog(`${hero.def.name} ${verb} ${drop.name}. Public health briefly received a budget.`, 'monster');
          if (action === 'bury' && drop.heroName) {
            const fallen = this.heroes.find((candidate) => candidate.def.name === drop.heroName);
            const memorial = fallen ? this.heroSocial.memorials[fallen.def.id] : null;
            if (memorial) {
              memorial.buried = true;
              memorial.buriedDay = this.day;
              memorial.honouredBy = hero.def.id;
              this.recordHeroRelationshipEvent(hero, fallen, 'grave_honoured', {
                text: `${hero.def.name} honoured ${fallen.def.name}'s grave.`,
                location: drop.areaId || 'grave',
                severity: 3,
              });
              recordSocialEvent(this.heroSocial, { day: this.day, type: 'legacy', heroIds: [hero.def.id, fallen.def.id], text: `${hero.def.name} honoured ${fallen.def.name} at the grave.`, major: true });
            }
          }
          this.clearAftermathObject(drop, `${drop.name} ${verb}`, action === 'burn' ? -4 : -3);
          this.applyDeltas({ morale: 1, trust: action === 'bury' ? 1 : 0 });
          this.saveGame(false);
        }
        this.scheduleAmbient(hero, Phaser.Math.Between(1500, 3200));
      });
    });
  }

  followAftermathTracks(drop, hero) {
    const lair = this.monsterLairs?.[drop.homeLairId];
    if (!lair) return;
    const point = this.explorationPointById?.[lair.poiId];
    const decay = getDecayState(drop, this.day);
    const chance = Phaser.Math.Clamp(0.28 + drop.evidenceValue * 0.1 + (hero.stats.power || 0) * 0.012 - decay.age * 0.08, 0.15, 0.9);
    drop.searched = true;
    drop.evidenceState = 'resolved';
    if (Math.random() <= chance && point) {
      const fromCell = this.worldToBuildGrid(drop.x, drop.y);
      const steps = Math.max(2, Math.min(5, drop.evidenceValue || 2));
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const gx = Math.round(Phaser.Math.Linear(fromCell.x, point.gridX, t * 0.72));
        const gy = Math.round(Phaser.Math.Linear(fromCell.y, point.gridY, t * 0.72));
        this.revealArea(gx, gy, 1, `${hero.def.name}'s tracks`);
      }
      if (chance >= 0.62 || this.isRevealed(point.gridX, point.gridY)) {
        lair.discovered = true;
        this.discoveredPois.add(point.id);
        this.completeAftermathQuest(drop.id, `${lair.name} was identified from the evidence.`);
      }
      this.addTownLog(`${hero.def.name} followed evidence from ${drop.name} toward ${lair.name}.`, 'unlock');
    } else {
      this.addTownLog(`${hero.def.name} followed the tracks until they became legally inconclusive.`, 'monster');
    }
    this.showLootInspector(drop);
    this.saveGame(false);
  }

  getActiveDefenceAlerts() {
    const activeIds = new Set((this.activeMonsterActors || [])
      .filter((actor) => actor?.container?.active && ![MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state))
      .map((actor) => actor.id));
    this.defenceState.alerts = (this.defenceState.alerts || [])
      .filter((alert) => {
        if (alert.dismissed) return false;
        if (activeIds.has(alert.actorId)) return true;
        if (!alert.lairId) return false;
        const lair = this.monsterLairs?.[alert.lairId];
        return lair && ['active', 'raiding'].includes(getLairPressureState(lair, this.day).id);
      })
      .slice(-DEFENCE_LIMITS.maxAlerts);
    return this.defenceState.alerts;
  }

  getDefenceDetectors() {
    const detectors = [];
    const defensiveIds = new Set(['watchtower', 'guard_post', 'frontier_outpost', 'scout_post']);
    for (const place of Object.values(this.buildingById || {})) {
      const baseId = getBaseBuildingId(place?.baseId || place?.id);
      if (!place?.isPlaced || !defensiveIds.has(baseId)) continue;
      const runtime = this.getBuildingRuntime(place.id);
      if (runtime.closed) continue;
      const profile = DETECTOR_PROFILES[baseId] || DETECTOR_PROFILES.watchtower;
      const levelBonus = Math.max(0, this.getPlaceLevel(place) - 1) * 45;
      const damageFactor = runtime.heavilyDamaged ? 0.4 : runtime.damaged ? 0.68 : 1;
      detectors.push({
        id: `building:${place.id}`,
        kind: baseId,
        name: place.name,
        x: place.x,
        y: place.y,
        radius: (profile.radius + levelBonus) * damageFactor,
        reactionMs: profile.reactionMs,
        reliability: profile.reliability * damageFactor,
        place,
      });
    }
    for (const hero of this.getActiveHeroes()) {
      if (!hero.container?.active || hero.state === 'inside' || hero.stats.deathDay) continue;
      detectors.push({ id: `hero:${hero.def.id}`, kind: 'hero', name: hero.def.name, x: hero.container.x, y: hero.container.y, ...DETECTOR_PROFILES.hero, unit: hero });
    }
    for (const walker of this.serviceWalkers || []) {
      if (!walker.container?.active || walker.alertState === 'SHELTERING') continue;
      const kind = walker.serviceRole === 'guard_patrol' ? 'guard' : 'worker';
      detectors.push({ id: `walker:${walker.targetEntry?.id || walker.def.id}`, kind, name: walker.def.name, x: walker.container.x, y: walker.container.y, ...DETECTOR_PROFILES[kind], unit: walker });
    }
    for (const carrier of this.carriers || []) {
      if (!carrier.container?.active || carrier.deliveryCompleted || carrier.alertState === 'SHELTERING') continue;
      detectors.push({ id: `carrier:${carrier.def.id}`, kind: 'civilian', name: carrier.def.name, x: carrier.container.x, y: carrier.container.y, ...DETECTOR_PROFILES.civilian, unit: carrier });
    }
    return detectors;
  }

  getMonsterAlertLevel(actor) {
    const target = this.resolveMonsterTarget(actor);
    if (actor.state === MONSTER_STATES.ATTACKING && target?.kind === 'building') return 'building';
    if (actor.state === MONSTER_STATES.ATTACKING) return 'attack';
    return actor.detectedBy ? 'confirmed' : 'sighting';
  }

  scanMonsterDetection() {
    const detectors = this.getDefenceDetectors();
    for (const actor of this.activeMonsterActors || []) {
      if (!actor?.container?.active || [MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state)) continue;
      const cell = this.worldToBuildGrid(actor.container.x, actor.container.y);
      if (this.isBuilderCity && !this.isRevealed(cell.x, cell.y)) continue;
      const candidates = detectors
        .map((detector) => ({ detector, distance: Phaser.Math.Distance.Between(detector.x, detector.y, actor.container.x, actor.container.y) }))
        .filter(({ detector, distance }) => distance <= detector.radius)
        .sort((a, b) => a.detector.reactionMs - b.detector.reactionMs || a.distance - b.distance);
      const sighting = candidates[0];
      if (!sighting) continue;
      actor.detectionAttempts = actor.detectionAttempts || {};
      const attempt = actor.detectionAttempts[sighting.detector.id];
      if (!attempt) {
        actor.detectionAttempts[sighting.detector.id] = this.worldDangerClockMs;
        continue;
      }
      if (this.worldDangerClockMs - attempt < sighting.detector.reactionMs) continue;
      if (actor.detectedAt || Math.random() <= sighting.detector.reliability) {
        this.confirmMonsterDetection(actor, sighting.detector, sighting.distance);
      } else {
        actor.detectionAttempts[sighting.detector.id] = this.worldDangerClockMs + 1800;
      }
    }
  }

  confirmMonsterDetection(actor, detector, distance) {
    const firstDetection = !actor.detectedAt;
    actor.detectedAt = actor.detectedAt || this.worldDangerClockMs;
    actor.detectedDay = actor.detectedDay || this.day;
    actor.detectedBy = actor.detectedBy || detector.name;
    actor.detectionKind = actor.detectionKind || detector.kind;
    const level = this.getMonsterAlertLevel(actor);
    const target = this.resolveMonsterTarget(actor) || actor.target;
    const nearestBuilding = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced)
      .map((place) => ({ place, distance: Phaser.Math.Distance.Between(place.x, place.y, actor.container.x, actor.container.y) }))
      .sort((a, b) => a.distance - b.distance)[0]?.place;
    const nearestHero = this.getActiveHeroes()
      .filter((hero) => !this.isHeroInjured(hero) && hero.state !== 'away')
      .map((hero) => ({ hero, distance: Phaser.Math.Distance.Between(hero.container.x, hero.container.y, actor.container.x, actor.container.y) }))
      .sort((a, b) => a.distance - b.distance)[0]?.hero;
    this.defenceState.alerts = upsertAlert(this.defenceState.alerts, {
      id: `alert-${actor.id}`,
      actorId: actor.id,
      level,
      monsterName: actor.monster.name,
      detectorId: detector.id,
      detectorName: detector.name,
      detectorKind: detector.kind,
      x: Math.round(actor.container.x),
      y: Math.round(actor.container.y),
      targetName: target?.name || 'Unknown',
      nearestBuildingId: nearestBuilding?.id || null,
      nearestBuildingName: nearestBuilding?.name || 'Town edge',
      nearestDefenderId: nearestHero?.def.id || null,
      nearestDefenderName: nearestHero?.def.name || 'None available',
      danger: estimateDangerLabel((actor.monster.threat || 1) * 16 + (actor.homeLairId ? this.monsterLairs?.[actor.homeLairId]?.pressure || 0 : 0) * 0.25),
      detectedAtMs: actor.detectedAt,
      detectedDay: actor.detectedDay,
      updatedAtMs: this.worldDangerClockMs,
      distance: Math.round(distance),
    });
    if (firstDetection) {
      this.defenceState.summarizedIncidents.sightings += 1;
      const direction = actor.container.x < PLAZA.x ? 'west' : actor.container.x > PLAZA.x ? 'east' : actor.container.y < PLAZA.y ? 'north' : 'south';
      const text = `${detector.name} detected ${actor.monster.name} ${direction} of town. ${nearestBuilding?.name || 'Municipal confidence'} is nearest.`;
      this.addTownLog(text, 'monster');
      this.addReportLine('monsters', text);
      this.game.events.emit('gwg-event', text);
      this.panicNearbyCivilians(actor, detector.kind);
      if (['guard', 'guard_post'].includes(detector.kind)) this.dispatchGuardToMonster(actor, detector.place || null);
    }
    this.updateTownNotice();
  }

  getNearestShelter(unit, actor) {
    const shelterIds = new Set(['tavern', 'inn', 'guildhall', 'guard_post', 'frontier_outpost']);
    const shelters = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && shelterIds.has(getBaseBuildingId(place.baseId || place.id)))
      .map((place) => ({ place, door: this.doorById?.[place.id] || place }))
      .filter(({ place }) => !this.getBuildingRuntime(place.id).closed)
      .sort((a, b) => Phaser.Math.Distance.Between(unit.container.x, unit.container.y, a.door.x, a.door.y)
        - Phaser.Math.Distance.Between(unit.container.x, unit.container.y, b.door.x, b.door.y));
    const chosen = shelters[0]?.door || { id: 'town-square', name: 'Town Square', x: PLAZA.x, y: PLAZA.y };
    const awayX = Math.sign(chosen.x - actor.container.x) * Phaser.Math.Between(5, 18);
    return { ...chosen, x: chosen.x + awayX, y: chosen.y + Phaser.Math.Between(-10, 10) };
  }

  panicNearbyCivilians(actor) {
    const policy = DEFENCE_PRIORITIES[this.defenceState.priority] || DEFENCE_PRIORITIES.balanced;
    const panicRadius = 170 + (this.resources.morale < 35 ? 55 : 0);
    const units = [...(this.serviceWalkers || []).filter((walker) => walker.serviceRole !== 'guard_patrol'), ...(this.carriers || [])];
    for (const unit of units) {
      if (!unit.container?.active || unit.alertState === 'FLEEING' || unit.alertState === 'SHELTERING') continue;
      if (Phaser.Math.Distance.Between(unit.container.x, unit.container.y, actor.container.x, actor.container.y) > panicRadius) continue;
      const brave = unit.serviceRole === 'carrier' && Math.random() < Math.max(0.06, 0.24 - (this.getAreaReputation('frontier') || 0) / 500);
      const escorted = unit.serviceRole === 'carrier' && unit.escortHeroId && this.heroes.some((hero) => hero.def.id === unit.escortHeroId && hero.container?.active && !this.isHeroInjured(hero));
      if ((brave || escorted) && policy.id !== 'civilians') {
        unit.currentAction = `Braving route near ${actor.monster.name}`;
        continue;
      }
      if (unit.serviceRole === 'carrier') this.dropCarrierCargoForDanger(unit, actor);
      this.sendCivilianToShelter(unit, actor);
    }
  }

  dropCarrierCargoForDanger(carrier, actor) {
    const amount = Math.max(0, Number(carrier.cargo || carrier.assignedCargo) || 0);
    if (!amount || carrier.cargoDropped) return;
    carrier.cargoDropped = true;
    carrier.deliveryCompleted = true;
    const cell = this.worldToBuildGrid(carrier.container.x, carrier.container.y);
    const drop = normalizeAftermathRecord({
      id: `dropped-cargo-${carrier.def.id}-${this.day}`,
      kind: 'loot',
      name: `Dropped ${RESOURCE_BY_ID[carrier.resource]?.label || carrier.resource || 'Cargo'}`,
      assetKey: 'prop_crate',
      fallbackKey: 'crate',
      x: carrier.container.x,
      y: carrier.container.y,
      gridX: cell.x,
      gridY: cell.y,
      monsterId: actor.monster.id,
      monsterName: actor.monster.name,
      deathDay: this.day,
      decayDuration: 7,
      lootContents: { [carrier.resource || 'loot']: amount },
      areaId: `frontier-${Math.floor(cell.x / 8)}-${Math.floor(cell.y / 8)}`,
      flavour: 'The carrier preserved their life by converting logistics into a map objective.',
    }, this.day);
    this.aftermathDrops.push(drop);
    this.renderAftermathDrop(drop);
    this.createAftermathQuest(drop, 'recover-cargo', `Recover ${drop.name}`);
    carrier.cargo = 0;
    carrier.assignedCargo = 0;
    this.defenceState.summarizedIncidents.cargoDropped += amount;
    this.addTownLog(`${carrier.def.name} dropped ${amount} ${carrier.resource} while fleeing ${actor.monster.name}.`, 'monster');
  }

  sendCivilianToShelter(unit, actor) {
    const shelter = this.getNearestShelter(unit, actor);
    unit.alertState = 'FLEEING';
    unit.currentAction = `Fleeing ${actor.monster.name}`;
    unit.shelterUntil = this.worldDangerClockMs + Phaser.Math.Between(5200, 9000) + Math.max(0, this.getAreaReputation('frontier')) * 18;
    this.walkTo(unit, {
      ...shelter,
      intentAction: `Fleeing to ${shelter.name}`,
      reason: 'Confirmed nearby monster.',
      risk: 'High',
    }, () => {
      if (!unit.container?.active) return;
      unit.alertState = 'SHELTERING';
      unit.currentAction = `Sheltering at ${shelter.name}`;
      unit.container.setAlpha(0.42);
    });
  }

  releaseShelteredCivilians() {
    const monsters = (this.activeMonsterActors || []).filter((actor) => actor.container?.active && ![MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state));
    for (const unit of [...(this.serviceWalkers || []), ...(this.carriers || [])]) {
      if (!unit.container?.active || unit.alertState !== 'SHELTERING' || this.worldDangerClockMs < (unit.shelterUntil || 0)) continue;
      const dangerNear = monsters.some((actor) => Phaser.Math.Distance.Between(unit.container.x, unit.container.y, actor.container.x, actor.container.y) < 230);
      if (dangerNear) continue;
      unit.alertState = 'RETURNING_TO_WORK';
      unit.container.setAlpha(1);
      const home = this.doorById?.[unit.originId] || { id: 'town-square', name: 'Town Square', x: PLAZA.x, y: PLAZA.y };
      this.walkTo(unit, { ...home, intentAction: 'Returning to work', reason: 'The immediate alert passed.', risk: 'Low' }, () => {
        unit.alertState = 'IDLE';
        unit.currentAction = 'Returned after emergency shelter';
      });
    }
  }

  showDefenceAlerts() {
    const alerts = this.getActiveDefenceAlerts();
    const priority = DEFENCE_PRIORITIES[this.defenceState.priority] || DEFENCE_PRIORITIES.balanced;
    this.activeInspector = { type: 'defence-alerts' };
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'defence-alerts',
      title: 'Town Defence',
      subtitle: `${alerts.length} active alert${alerts.length === 1 ? '' : 's'} - ${priority.name}`,
      sections: [{
        title: 'Response Policy',
        lines: [`Current priority: ${priority.name}`, 'Alerts do not pause time. Ignoring them merely lets consequences retain initiative.'],
      }],
      rows: alerts.map((alert) => ({
        title: `${ALERT_LEVELS[alert.level]?.name || 'Sighting'}: ${alert.monsterName}`,
        meta: `Day ${alert.detectedDay} - ${alert.danger}`,
        kind: alert.severity >= 4 ? 'danger' : 'warning',
        lines: [
          `Detected by ${alert.detectorName} near ${alert.nearestBuildingName}.`,
          `Target: ${alert.targetName} | Nearest defender: ${alert.nearestDefenderName}`,
          `Age: ${Math.max(0, Math.round((this.worldDangerClockMs - alert.detectedAtMs) / 1000))}s`,
        ],
        actions: [
          { label: 'Focus Camera', event: 'gwg-defense-action', id: `${alert.actorId}|focus` },
          { label: 'Assign Hero', event: 'gwg-defense-action', id: `${alert.actorId}|intercept` },
          { label: 'Dispatch Guards', event: 'gwg-defense-action', id: `${alert.actorId}|guards` },
          { label: 'Defend Building', event: 'gwg-defense-action', id: `${alert.actorId}|defend` },
          { label: 'Escort Civilians', event: 'gwg-defense-action', id: `${alert.actorId}|escort` },
          { label: 'Ignore', event: 'gwg-defense-action', id: `${alert.actorId}|ignore` },
        ],
      })),
      actions: [
        { label: `Priority: ${priority.name}`, event: 'gwg-defense-policy', id: 'cycle' },
        { label: 'Open Threat Log', event: 'gwg-open-town-log' },
      ],
    });
  }

  cycleDefencePriorityFromUi() {
    this.defenceState.priority = getNextDefencePriority(this.defenceState.priority);
    const priority = DEFENCE_PRIORITIES[this.defenceState.priority];
    if (priority.id === 'premium') this.applyDeltas({ corruption: 1, trust: -1 });
    this.addTownLog(`Defence priority changed to ${priority.name}.`, priority.id === 'premium' ? 'golden_whale' : 'policy');
    this.game.events.emit('gwg-event', `${priority.name}: automatic responders updated their list of things worth saving.`);
    this.saveGame(false);
    if (this.activeInspector?.type === 'policies') this.showPolicyPanel();
    else this.showDefenceAlerts();
  }

  runDefenceActionFromUi(value) {
    const [actorId, action = 'focus'] = String(value || '').split('|');
    const actor = this.activeMonsterActors?.find((entry) => entry.id === actorId && entry.container?.active);
    const alert = this.defenceState.alerts.find((entry) => entry.actorId === actorId);
    if (!actor) {
      if (alert?.lairId) {
        const lair = this.monsterLairs?.[alert.lairId];
        const point = lair ? this.explorationPointById?.[lair.poiId] : null;
        if (action === 'focus' && point) this.cameras.main.centerOn(point.x, point.y);
        else if (action === 'guards' && lair) this.runLairActionFromUi(`${lair.id}|patrol`);
        else if (action === 'intercept' && lair) this.runLairActionFromUi(`${lair.id}|scout`);
        else if (action === 'ignore') alert.ignored = true;
        if (lair && action !== 'ignore') this.showLairInspector(lair);
        this.saveGame(false);
        return;
      }
      if (alert) alert.dismissed = true;
      this.showDefenceAlerts();
      return;
    }
    if (action === 'focus') this.cameras.main.centerOn(actor.container.x, actor.container.y);
    else if (action === 'guards') this.dispatchGuardToMonster(actor);
    else if (action === 'escort') {
      const civilian = [...(this.carriers || []), ...(this.serviceWalkers || []).filter((walker) => walker.serviceRole !== 'guard_patrol')]
        .filter((unit) => unit.container?.active)
        .sort((a, b) => Phaser.Math.Distance.Between(a.container.x, a.container.y, actor.container.x, actor.container.y)
          - Phaser.Math.Distance.Between(b.container.x, b.container.y, actor.container.x, actor.container.y))[0];
      const hero = this.getBestDefenderForMonster(actor);
      if (civilian && hero) {
        civilian.escortHeroId = hero.def.id;
        this.walkTo(hero, { id: civilian.def.id, name: civilian.def.name, x: civilian.container.x, y: civilian.container.y, h: 30,
          intentAction: `Escorting ${civilian.def.name}`, reason: 'Protecting a vulnerable town worker.', risk: 'Moderate' });
        this.addTownLog(`${hero.def.name} was assigned to escort ${civilian.def.name}.`, 'monster');
      } else this.game.events.emit('gwg-event', 'No civilian and hero pair is available for escort. The clipboard remains optimistic.');
    }
    else if (action === 'ignore') {
      if (alert) alert.ignored = true;
      this.game.events.emit('gwg-event', `The town ignored ${actor.monster.name}. Somehow, this was also a defence decision.`);
    } else {
      const hero = this.getBestDefenderForMonster(actor);
      if (hero) this.dispatchHeroToMonster(actor, hero, true, action === 'defend' ? 'Defending threatened town asset' : 'Player-assigned interception');
      else this.game.events.emit('gwg-event', 'No suitable hero can respond. Courage is currently out of stock.');
    }
    this.saveGame(false);
    this.showDefenceAlerts();
  }

  getBestDefenderForMonster(actor) {
    const priority = DEFENCE_PRIORITIES[this.defenceState.priority] || DEFENCE_PRIORITIES.balanced;
    return this.getActiveHeroes()
      .filter((hero) => hero.state !== 'away' && !hero.stats.deathDay && !this.isHeroInjured(hero) && !hero.stats.gatheringNodeId && !hero.combatTargetId)
      .map((hero) => {
        const distance = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, actor.container.x, actor.container.y);
        const equipment = this.getHeroEquipmentBonus(hero);
        const courage = (hero.stats.power || 0) + equipment.power + (this.isVeteranHero(hero.def) ? 8 : 0);
        const riskGap = courage - (actor.monster.power || actor.monster.threat * 4);
        return { hero, score: courage * 5 - distance / (18 * priority.chaseMultiplier) + Math.min(18, riskGap * 2) };
      })
      .sort((a, b) => b.score - a.score)[0]?.hero || null;
  }

  getMonsterAnimationDirection(dx = 0, dy = 1) {
    if (Math.abs(dx) > Math.abs(dy) * 0.72) return dx < 0 ? 'west' : 'east';
    return dy < 0 ? 'north' : 'south';
  }

  getMonsterAnimationState(actor) {
    if ([MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state)) return 'death';
    if (actor.state === MONSTER_STATES.ATTACKING) return 'attack';
    if (actor.state === MONSTER_STATES.INJURED) return 'hurt';
    if ([MONSTER_STATES.ROAMING, MONSTER_STATES.PATROLLING_LAIR, MONSTER_STATES.CHASING, MONSTER_STATES.RETURNING_TO_LAIR, MONSTER_STATES.FLEEING].includes(actor.state)) return 'walk';
    return 'idle';
  }

  setMonsterAnimation(actor, state, direction = actor?.facing || 'south') {
    if (!actor?.sprite) return false;
    const directionalKey = `monster_anim_${actor.monster.id}_${state}_${direction}`;
    const actionFallbackKey = `monster_anim_${actor.monster.id}_${state}_south`;
    const key = this.textures.exists(directionalKey) ? directionalKey : actionFallbackKey;
    if (actor.animationState === state && actor.facing === direction && actor.animationKey === key) return actor.hasAnimationFrames;
    actor.animationTimer?.remove?.();
    actor.animationTimer = null;
    actor.animationState = state;
    actor.facing = direction;
    actor.animationKey = key;
    actor.hasAnimationFrames = this.textures.exists(key);
    if (!actor.hasAnimationFrames) {
      actor.sprite.setTexture(this.textures.exists(actor.monster.assetKey) ? actor.monster.assetKey : resolveTexture(this, 'icon_warning', 'chevron'));
      return false;
    }
    actor.ambientTween?.stop?.();
    actor.ambientTween = null;
    // Phaser includes the __BASE frame in frameTotal for spritesheets.
    const frameTotal = Math.max(1, (this.textures.get(key)?.frameTotal || 2) - 1);
    actor.animationFrame = 0;
    actor.sprite.setTexture(key, 0).setFlipX(false);
    actor.sprite.setScale(this.getTextureScaleForHeight(key, 44, 1));
    if (frameTotal > 1) {
      actor.animationTimer = this.time.addEvent({
        delay: state === 'attack' ? 105 : state === 'hurt' ? 125 : state === 'death' ? 135 : 145,
        loop: state !== 'death',
        repeat: state === 'death' ? frameTotal - 2 : -1,
        callback: () => {
          if (!actor.sprite?.active) return;
          actor.animationFrame = Math.min(frameTotal - 1, actor.animationFrame + 1);
          if (state !== 'death') actor.animationFrame %= frameTotal;
          actor.sprite.setFrame(actor.animationFrame);
        },
      });
    }
    return true;
  }

  spawnMonsterActor(monster, target, spawn = null, runtime = {}) {
    const start = spawn || target || { x: PLAZA.x, y: PLAZA.y };
    const textureKey = this.textures.exists(monster.assetKey)
      ? monster.assetKey
      : resolveTexture(this, 'icon_warning', 'chevron');
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const scale = source?.height ? Phaser.Math.Clamp(44 / source.height, 0.32, 1.2) : 1;
    const homeLair = runtime.homeLairId ? this.monsterLairs?.[runtime.homeLairId] : null;
    const homePoint = homeLair ? this.explorationPointById?.[homeLair.poiId] : null;
    const stats = getMonsterRuntimeStats(monster, homeLair?.level || 1);
    const behavior = monster.behavior || {};
    const familyCount = (this.activeMonsterActors || []).filter((entry) => entry.homeLairId === runtime.homeLairId && entry.monster?.id === monster.id).length;
    if (behavior.groupBonus && familyCount) {
      stats.damage = Math.round(stats.damage * (1 + Math.min(0.7, familyCount * behavior.groupBonus)));
      stats.maxHealth = Math.round(stats.maxHealth * (1 + Math.min(0.35, familyCount * behavior.groupBonus * 0.5)));
    }
    if (behavior.ignoredDayScaling && homeLair) {
      const neglect = Phaser.Math.Clamp(((homeLair.pressure || 0) - 18) / 160, 0, 0.45);
      stats.damage = Math.round(stats.damage * (1 + neglect));
      stats.maxHealth = Math.round(stats.maxHealth * (1 + neglect * 0.6));
    }
    if (behavior.raisesRemains) {
      const nearbyRemains = (this.aftermathDrops || []).filter((drop) => drop.kind !== 'loot' && !drop.cleared && Phaser.Math.Distance.Between(drop.x, drop.y, start.x, start.y) < 420).length;
      stats.damage += Math.min(8, nearbyRemains * 2);
      stats.maxHealth += Math.min(32, nearbyRemains * 6);
    }
    const normalized = normalizeMonsterRecord({ ...runtime, maxHealth: runtime.maxHealth || stats.maxHealth });
    const actor = {
      id: runtime.id || `monster-${this.day}-${monster.id}-${Math.floor(Math.random() * 100000)}`,
      monster: { ...monster },
      target,
      targetRef: normalized.targetRef,
      state: normalized.state === MONSTER_STATES.DEAD ? MONSTER_STATES.IDLE : normalized.state,
      intent: runtime.intent || (target ? `Moving toward ${target.name}.` : 'Roaming the fog edge.'),
      createdDay: Number(runtime.createdDay) || this.day,
      health: Math.min(normalized.health || stats.maxHealth, normalized.maxHealth || stats.maxHealth),
      maxHealth: normalized.maxHealth || stats.maxHealth,
      stats,
      homeLairId: normalized.homeLairId,
      homeX: Number(runtime.homeX) || homePoint?.x || start.x,
      homeY: Number(runtime.homeY) || homePoint?.y || start.y,
      priority: normalized.priority,
      kills: normalized.kills,
      stolenCargo: normalized.stolenCargo,
      nextDecisionAt: this.worldDangerClockMs + Phaser.Math.Between(180, 620),
      nextAttackAt: 0,
      reactionUntil: 0,
      moveTarget: null,
      lastHitAt: 0,
      defenderAssignedAt: 0,
      detectedAt: Number(runtime.detectedAt) || 0,
      detectedDay: Number(runtime.detectedDay) || 0,
      detectedBy: runtime.detectedBy || null,
      detectionKind: runtime.detectionKind || null,
      raidId: runtime.raidId || null,
      raidTargetRef: runtime.raidTargetRef && typeof runtime.raidTargetRef === 'object' ? { ...runtime.raidTargetRef } : null,
    };
    const container = this.add.container(start.x, start.y).setDepth(start.y + 75);
    const shadow = this.add.ellipse(0, -4, 34, 10, 0x10151d, 0.24);
    const sprite = this.add.image(0, -10, textureKey).setOrigin(0.5, 1).setScale(scale);
    const healthBg = this.add.rectangle(0, -49, 34, 4, 0x10151d, 0.82).setOrigin(0.5);
    const healthBar = this.add.rectangle(-17, -49, 34, 3, 0xe74c3c, 0.9).setOrigin(0, 0.5);
    const label = this.add.text(0, -56, monster.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#ffd0cc',
      stroke: '#0c1118',
      strokeThickness: 2,
      backgroundColor: '#301820cc',
      padding: { x: 4, y: 1 },
      wordWrap: { width: 90 },
    }).setOrigin(0.5, 1).setAlpha(0);
    container.add([shadow, sprite, healthBg, healthBar, label]);
    container.setSize(58, 68);
    container.setInteractive(new Phaser.Geom.Rectangle(-29, -68, 58, 68), Phaser.Geom.Rectangle.Contains);
    container.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.selectWorldInteractionTarget(pointer);
    });
    actor.container = container;
    actor.sprite = sprite;
    actor.label = label;
    actor.healthBar = healthBar;
    actor.healthBg = healthBg;
    actor.facing = 'south';
    this.setMonsterAnimation(actor, 'idle', actor.facing);
    actor.targetEntry = this.registerWorldInteractionTarget({
      id: actor.id,
      type: 'monster',
      hit: container,
      img: container,
      width: 58,
      height: 68,
      actor,
      getCenter: () => ({ x: container.x, y: container.y - 34 }),
      onHoverIn: () => { sprite.setTint(0xffd0cc); label.setAlpha(0.92); },
      onHoverOut: () => { sprite.clearTint?.(); if (this.activeInspector?.id !== actor.id) label.setAlpha(0); },
      onSelect: () => this.showMonsterInspector(actor),
    });
    this.applyInteractionDebugStyle(container, 0xe74c3c);
    this.activeMonsterActors.push(actor);
    if (homeLair && !homeLair.activeMonsterIds.includes(actor.id)) homeLair.activeMonsterIds.push(actor.id);
    if (!actor.hasAnimationFrames) {
      actor.ambientTween = this.tweens.add({
        targets: sprite,
        y: -16,
        duration: Phaser.Math.Between(520, 780),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    return actor;
  }

  restoreActiveMonsterActors() {
    const records = Array.isArray(this.monsterState?.activeAttacks) ? this.monsterState.activeAttacks : [];
    for (const record of records.slice(0, WORLD_DANGER_LIMITS.maxActiveMonsters)) {
      const monster = MONSTERS.find((entry) => entry.id === record.monsterId)
        || record.monster
        || { id: 'goblin_raider', name: 'Roaming Monster', assetKey: 'monster_goblin_raider', power: 6, threat: 2 };
      const target = record.target || this.getOperationalPlace('guildhall') || { id: 'guildhall', name: 'Guild Hall', x: PLAZA.x, y: PLAZA.y };
      const actor = this.spawnMonsterActor(
        monster,
        target,
        { x: Number(record.x) || target.x, y: Number(record.y) || target.y },
        record,
      );
      actor.state = Object.values(MONSTER_STATES).includes(record.state) ? record.state : MONSTER_STATES.IDLE;
      actor.intent = record.intent || `Still looking at ${target.name}.`;
      actor.createdDay = Number(record.createdDay) || this.day;
    }
  }

  restoreDefenceAssignments() {
    for (const hero of this.heroes || []) {
      const saved = this.savedHeroStats?.[hero.def.id];
      if (!saved?.combatTargetId || !saved.defenceOrder || this.isHeroInjured(hero) || hero.stats.deathDay) continue;
      const actor = this.activeMonsterActors.find((entry) => entry.id === saved.combatTargetId && entry.container?.active);
      if (!actor) continue;
      this.time.delayedCall(450, () => this.dispatchHeroToMonster(actor, hero, saved.defenceOrder === 'manual', 'Restored defensive assignment.'));
    }
  }

  showMonsterInspector(actor) {
    if (!actor?.monster) return;
    const knownLair = this.monsterLairs?.[actor.homeLairId];
    const lairKnown = Boolean(knownLair?.discovered);
    this.activeInspector = { type: 'monster', id: actor.id };
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'monster',
      title: actor.monster.name,
      subtitle: actor.state === MONSTER_STATES.ATTACKING ? 'Attacking Town' : 'Persistent World Threat',
      sections: [
        {
          title: 'Threat',
          lines: [
            `Health: ${Math.ceil(actor.health)}/${actor.maxHealth}`,
            `Level: ${this.monsterLairs?.[actor.homeLairId]?.level || 1}`,
            `State: ${actor.state}`,
            `Power: ${actor.monster.power || actor.monster.threat * 4} | Damage: ${actor.stats?.damage || '?'}`,
            `Speed: ${Number(actor.monster.speed || 1).toFixed(2)}x`,
            `Intent: ${actor.intent || 'Finding the nearest bad idea.'}`,
            `Target: ${this.resolveMonsterTarget(actor)?.name || actor.target?.name || 'None'}`,
            `Home lair: ${lairKnown ? knownLair.name : knownLair?.inferred ? 'Suspected hidden lair' : 'Unknown wilderness'}`,
            `Distance from lair: ${lairKnown ? `${Math.round(Phaser.Math.Distance.Between(actor.container.x, actor.container.y, actor.homeX, actor.homeY))}px` : 'unknown'}`,
            getSatireLine('monster', actor.monster.id, 'inspector', { day: this.day, fallback: actor.monster.flavour }),
          ].filter(Boolean),
        },
        {
          title: 'Response',
          lines: [
            `Potential loot: ${actor.monster.reward || actor.monster.threat * 18}g and remains.`,
            `Detected by: ${actor.detectedBy || 'Nobody yet'}.`,
            actor.priority ? 'Priority target: yes.' : 'Priority target: no.',
          ],
        },
      ],
      actions: [
        { label: 'Intercept', event: 'gwg-monster-action', id: `${actor.id}|intercept` },
        { label: 'Dispatch Guards', event: 'gwg-defense-action', id: `${actor.id}|guards` },
        { label: 'Hunt', event: 'gwg-monster-action', id: `${actor.id}|hunt` },
        { label: 'Follow Without Engaging', event: 'gwg-monster-action', id: `${actor.id}|shadow` },
        { label: 'Drive Away', event: 'gwg-monster-action', id: `${actor.id}|drive` },
        { label: 'Track to Lair', event: 'gwg-monster-action', id: `${actor.id}|track` },
        { label: 'Cancel Response', event: 'gwg-monster-action', id: `${actor.id}|cancel` },
        { label: actor.priority ? 'Unmark Priority' : 'Mark Priority', event: 'gwg-monster-action', id: `${actor.id}|priority` },
        { label: 'Follow', event: 'gwg-monster-action', id: `${actor.id}|follow` },
        ...(actor.homeLairId && this.monsterLairs?.[actor.homeLairId]?.discovered
          ? [{ label: 'Open Nearby Lair', event: 'gwg-lair-action', id: `${actor.homeLairId}|inspect` }]
          : []),
      ],
    });
    actor.label?.setAlpha(0.92);
  }

  showLairInspector(lair) {
    const point = this.explorationPointById?.[lair?.poiId];
    if (!lair || !point) return;
    lair.discovered = true;
    this.discoveredPois?.add(point.id);
    this.activeInspector = { type: 'lair', id: lair.id };
    const active = (this.activeMonsterActors || []).filter((actor) => actor.homeLairId === lair.id && actor.state !== MONSTER_STATES.DEAD);
    const areaDanger = this.getAreaReputation(point.id);
    const pressureState = getLairPressureState(lair, this.day);
    const coverage = this.getDefenceCoverageAt(point.x, point.y);
    const recentHistory = (this.monsterState.attackHistory || []).filter((entry) => entry.lairId === lair.id).slice(-3);
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'lair',
      title: lair.name,
      subtitle: `${lair.type} - ${pressureState.name}`,
      sections: [
        { title: 'Known Threat', lines: [
          `Pressure: ${pressureState.name}${lair.scouted ? ` (${Math.round(lair.pressure || 0)}/100)` : ''}`,
          `Estimated strength: ${lair.scouted ? estimateDangerLabel(lair.danger + (lair.pressure || 0) * 0.35) : 'Unknown'}`,
          `Family: ${lair.scouted ? lair.monsterFamily.map((id) => MONSTERS.find((monster) => monster.id === id)?.name || id).join(', ') : 'Unknown until scouted'}`,
          `Active monsters: ${lair.scouted ? `${active.length}/${lair.activeMonsterCap}` : active.length ? 'Several suspected' : 'Unknown'}`,
          `Next activity: ${lair.scouted ? `around Day ${lair.nextSpawnDay}` : 'Unknown'}`,
          `Nearest town asset: ${this.getRaidTarget(lair)?.name || 'None'}`,
          `Guard coverage: ${coverage >= 4 ? 'Strong' : coverage >= 2 ? 'Moderate' : coverage > 0 ? 'Weak' : 'None'}`,
          `Local danger reputation: ${areaDanger}/100`,
        ] },
        { title: 'Operation', lines: [
          lair.scouted ? 'Scouted: strength estimate is reliable.' : 'Not scouted: management is guessing professionally.',
          `Suppression progress: ${Math.round(lair.suppressionProgress || 0)}%${lair.suppressedUntilDay > this.day ? ` - active until Day ${lair.suppressedUntilDay}` : ''}`,
          `Operation: ${lair.operation?.status === 'active' ? `${lair.operation.type} in progress` : 'none'}`,
          `Potential loot: ${lair.lootTable}`,
          ...(lair.recentAttacks?.length ? [`Recent: ${lair.recentAttacks.slice(-2).join(' | ')}`] : ['No recorded attacks. This is not reassurance.']),
          ...(recentHistory.length ? [`Outcomes: ${recentHistory.map((entry) => `Day ${entry.day} ${entry.outcome}`).join(' | ')}`] : []),
        ] },
      ],
      actions: [
        { label: 'Scout Lair', event: 'gwg-lair-action', id: `${lair.id}|scout`, disabled: lair.cleared },
        { label: 'Assign Patrol', event: 'gwg-lair-action', id: `${lair.id}|patrol`, disabled: lair.cleared },
        { label: 'Suppress Lair', event: 'gwg-lair-action', id: `${lair.id}|suppress`, disabled: lair.cleared || lair.operation?.status === 'active' },
        { label: 'Clear Lair', event: 'gwg-lair-action', id: `${lair.id}|clear`, disabled: lair.cleared || lair.operation?.status === 'active' },
        { label: 'Establish Outpost', event: 'gwg-node-camp', id: point.id, action: 'frontier_outpost', disabled: lair.cleared },
        { label: 'Track Active Monster', event: 'gwg-lair-action', id: `${lair.id}|track`, disabled: active.length === 0 },
        { label: 'Withdraw', event: 'gwg-lair-action', id: `${lair.id}|withdraw`, disabled: lair.operation?.status !== 'active' },
        { label: 'Open Attack History', event: 'gwg-open-town-log' },
      ],
    });
  }

  updateMonsterActorVisibility() {
    if (!this.activeMonsterActors?.length || !this.isBuilderCity) return;
    const activeSet = this.getActiveVisibilitySet();
    for (const actor of this.activeMonsterActors) {
      if (!actor?.container?.active) continue;
      const cell = this.worldToBuildGrid(actor.container.x, actor.container.y);
      const revealed = this.isRevealed(cell.x, cell.y);
      const active = revealed && activeSet.has(gridKey(cell.x, cell.y));
      actor.container.setVisible(revealed);
      actor.container.setAlpha(revealed ? (active ? 1 : 0.55) : 0);
      if (revealed && !actor.wasVisible) {
        actor.wasVisible = true;
        const source = this.monsterLairs?.[actor.homeLairId];
        if (source && !source.discovered && !source.inferred) {
          source.inferred = true;
          this.addTownLog(`${actor.monster.name} crossed into known land. Scouts suspect a hidden ${source.type.toLowerCase()} nearby.`, 'monster');
        }
      }
      if (revealed && actor.homeLairId) {
        const lair = this.monsterLairs?.[actor.homeLairId];
        const point = lair ? this.explorationPointById?.[lair.poiId] : null;
        if (lair && point && this.isRevealed(point.gridX, point.gridY)) {
          lair.discovered = true;
          this.discoveredPois?.add(point.id);
        }
      }
    }
  }

  getMonsterTargetRef(kind, id, name = '') {
    return { kind, id, name };
  }

  resolveMonsterTarget(actor) {
    const ref = actor?.targetRef;
    if (!ref) return null;
    if (ref.kind === 'hero') {
      const hero = this.heroes?.find((entry) => entry.def.id === ref.id && entry.stats.active !== false && !entry.stats.deathDay);
      return hero ? { id: hero.def.id, name: hero.def.name, kind: 'hero', unit: hero, x: hero.container.x, y: hero.container.y } : null;
    }
    if (ref.kind === 'service' || ref.kind === 'carrier' || ref.kind === 'guard') {
      const entry = this.worldInteractionTargets?.find((target) => target.id === ref.id);
      const unit = entry?.walker;
      return unit?.container?.active
        ? { id: ref.id, name: unit.def?.name || ref.name, kind: ref.kind, unit, x: unit.container.x, y: unit.container.y }
        : null;
    }
    if (ref.kind === 'building') {
      const place = this.buildingById?.[ref.id];
      return place?.isPlaced !== false ? { id: place.id, name: place.name, kind: 'building', place, x: place.x, y: place.y } : null;
    }
    return null;
  }

  getMonsterAggroCandidates(actor) {
    const radius = actor.stats.detectionRadius;
    const candidates = [];
    for (const hero of this.getActiveHeroes()) {
      if (hero.state === 'away' || hero.stats.deathDay) continue;
      const distance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, hero.container.x, hero.container.y);
      if (distance > radius) continue;
      candidates.push({
        ref: this.getMonsterTargetRef('hero', hero.def.id, hero.def.name),
        distance,
        score: scoreAggroTarget(actor.monster.id, {
          kind: 'hero', injured: this.isHeroInjured(hero), power: hero.stats.power || 0,
        }, distance),
      });
    }
    for (const entry of this.worldInteractionTargets || []) {
      if (!['service', 'carrier'].includes(entry.type) || !entry.walker?.container?.active) continue;
      const unit = entry.walker;
      const distance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, unit.container.x, unit.container.y);
      if (distance > radius) continue;
      const guard = unit.serviceRole === 'guard_patrol';
      const kind = guard ? 'guard' : entry.type;
      candidates.push({
        ref: this.getMonsterTargetRef(kind, entry.id, unit.def?.name),
        distance,
        score: scoreAggroTarget(actor.monster.id, { kind }, distance),
      });
    }
    if (!candidates.length) {
      for (const place of Object.values(this.buildingById || {})) {
        if (!place?.isPlaced || !getBuildingCatalogEntry(place.baseId || place.id)) continue;
        const distance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, place.x, place.y);
        if (distance > radius * 0.82) continue;
        candidates.push({
          ref: this.getMonsterTargetRef('building', place.id, place.name),
          distance,
          score: scoreAggroTarget(actor.monster.id, { kind: 'building', buildingId: getBaseBuildingId(place.baseId || place.id) }, distance),
        });
      }
    }
    return candidates.sort((a, b) => b.score - a.score);
  }

  chooseMonsterRoamPoint(actor) {
    const towardTown = Math.random() < 0.58;
    const baseX = towardTown ? Phaser.Math.Linear(actor.container.x, PLAZA.x, 0.28) : actor.homeX;
    const baseY = towardTown ? Phaser.Math.Linear(actor.container.y, PLAZA.y, 0.28) : actor.homeY;
    const radius = towardTown ? 90 : Math.min(180, actor.stats.leashDistance * 0.3);
    const point = {
      x: Phaser.Math.Clamp(baseX + Phaser.Math.Between(-radius, radius), 40, this.worldWidth - 40),
      y: Phaser.Math.Clamp(baseY + Phaser.Math.Between(-Math.floor(radius / 2), Math.floor(radius / 2)), 70, this.worldHeight - 60),
    };
    const cell = this.worldToBuildGrid(point.x, point.y);
    if (!isInsideGrid(cell.x, cell.y) || !this.revealedTiles?.has(gridKey(cell.x, cell.y))) {
      point.x = Phaser.Math.Linear(actor.container.x, actor.homeX, 0.45);
      point.y = Phaser.Math.Linear(actor.container.y, actor.homeY, 0.45);
    }
    return point;
  }

  decideMonsterAction(actor) {
    if (!actor?.container?.active || actor.state === MONSTER_STATES.DEAD) return;
    const homeDistance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, actor.homeX, actor.homeY);
    const current = this.resolveMonsterTarget(actor);
    if (current && homeDistance <= actor.stats.leashDistance) {
      const distance = Phaser.Math.Distance.Between(actor.container.x, actor.container.y, current.x, current.y);
      actor.target = current;
      actor.moveTarget = current;
      if (actor.state === MONSTER_STATES.INVESTIGATING && this.worldDangerClockMs < actor.reactionUntil) return;
      actor.state = distance <= actor.stats.attackRange ? MONSTER_STATES.ATTACKING : MONSTER_STATES.CHASING;
      actor.intent = `${actor.state === MONSTER_STATES.ATTACKING ? 'Attacking' : 'Chasing'} ${current.name}.`;
      this.maybeDispatchDefender(actor);
      return;
    }
    actor.targetRef = null;
    actor.target = null;
    const candidate = this.getMonsterAggroCandidates(actor)[0];
    if (candidate && homeDistance <= actor.stats.leashDistance) {
      actor.targetRef = candidate.ref;
      actor.state = MONSTER_STATES.INVESTIGATING;
      actor.reactionUntil = this.worldDangerClockMs + actor.stats.reactionMs;
      actor.intent = `Noticed ${candidate.ref.name}.`;
      actor.detectedBy = candidate.ref.kind === 'guard' ? 'Guard Patrol' : 'Proximity';
      return;
    }
    if (homeDistance > actor.stats.leashDistance) {
      actor.state = MONSTER_STATES.RETURNING_TO_LAIR;
      actor.moveTarget = { x: actor.homeX, y: actor.homeY, name: 'home lair' };
      actor.intent = 'Returning to its lair before the chase becomes unpaid overtime.';
      return;
    }
    actor.state = Math.random() < 0.45 ? MONSTER_STATES.PATROLLING_LAIR : MONSTER_STATES.ROAMING;
    actor.moveTarget = this.chooseMonsterRoamPoint(actor);
    actor.intent = actor.state === MONSTER_STATES.PATROLLING_LAIR ? 'Patrolling its lair.' : 'Roaming toward signs of municipal confidence.';
  }

  isMonsterStepBlocked(actor, x, y) {
    const cellPos = this.worldToBuildGrid(x, y);
    if (!isInsideGrid(cellPos.x, cellPos.y)) return true;
    const occupied = this.gridCells?.get(gridKey(cellPos.x, cellPos.y))?.occupiedBy;
    return Boolean(occupied && actor.targetRef?.kind !== 'building' && occupied !== actor.targetRef?.id);
  }

  advanceMonsterMovement(actor, deltaSeconds) {
    if (!actor.moveTarget || ![MONSTER_STATES.ROAMING, MONSTER_STATES.PATROLLING_LAIR, MONSTER_STATES.CHASING, MONSTER_STATES.RETURNING_TO_LAIR, MONSTER_STATES.FLEEING].includes(actor.state)) return;
    const target = actor.state === MONSTER_STATES.CHASING ? this.resolveMonsterTarget(actor) : actor.moveTarget;
    if (!target) return;
    const dx = target.x - actor.container.x;
    const dy = target.y - actor.container.y;
    this.setMonsterAnimation(actor, 'walk', this.getMonsterAnimationDirection(dx, dy));
    const distance = Math.hypot(dx, dy);
    const stopRange = actor.state === MONSTER_STATES.CHASING ? actor.stats.attackRange : 8;
    if (distance <= stopRange) {
      if (actor.state === MONSTER_STATES.CHASING) actor.state = MONSTER_STATES.ATTACKING;
      else if (actor.state === MONSTER_STATES.RETURNING_TO_LAIR || actor.state === MONSTER_STATES.FLEEING) {
        actor.state = MONSTER_STATES.IDLE;
        const lair = this.monsterLairs?.[actor.homeLairId];
        if (lair) {
          lair.pressure = Phaser.Math.Clamp((lair.pressure || 0) + 4 + (actor.stolenCargo || 0), 0, 100);
          lair.pressureState = getLairPressureState(lair, this.day).id;
        }
        if (actor.detectedAt) this.finalizeDefenceIncident(actor, 'escaped to lair', null);
      }
      else actor.moveTarget = null;
      return;
    }
    const step = Math.min(distance - stopRange, actor.stats.speedPx * deltaSeconds);
    let nextX = actor.container.x + (dx / distance) * step;
    let nextY = actor.container.y + (dy / distance) * step;
    if (this.isMonsterStepBlocked(actor, nextX, nextY)) {
      const sideX = actor.container.x + (-dy / distance) * step;
      const sideY = actor.container.y + (dx / distance) * step;
      if (!this.isMonsterStepBlocked(actor, sideX, sideY)) {
        nextX = sideX;
        nextY = sideY;
      } else return;
    }
    actor.container.setPosition(nextX, nextY).setDepth(nextY + 75);
    if (!actor.hasAnimationFrames) actor.sprite?.setFlipX?.(dx < 0);
  }

  updateMonsterHealthVisual(actor) {
    if (!actor?.healthBar) return;
    const ratio = Phaser.Math.Clamp(actor.health / actor.maxHealth, 0, 1);
    actor.healthBar.displayWidth = 34 * ratio;
    actor.healthBar.setFillStyle(ratio > 0.55 ? 0x7fdc93 : ratio > 0.25 ? 0xf6c945 : 0xe74c3c, 0.94);
  }

  damageMonster(actor, damage, source = null) {
    if (!actor?.container?.active || [MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state)) return false;
    const dealt = Math.max(1, Math.round(damage - (actor.stats.armour || 0)));
    actor.health = Math.max(0, actor.health - dealt);
    actor.lastHitAt = this.worldDangerClockMs;
    this.setMonsterAnimation(actor, 'hurt', actor.facing);
    this.updateMonsterHealthVisual(actor);
    this.floatText(actor.container.x, actor.container.y - 52, `-${dealt}`, '#ffd0cc');
    actor.sprite?.setTint?.(0xffffff);
    this.time.delayedCall(110, () => actor.sprite?.active && actor.sprite.clearTint?.());
    if (actor.health <= 0) {
      this.defeatMonsterActor(actor, source);
      return true;
    }
    if (actor.stats.fleeHealthRatio > 0 && actor.health / actor.maxHealth <= actor.stats.fleeHealthRatio) {
      actor.state = MONSTER_STATES.FLEEING;
      actor.targetRef = null;
      actor.moveTarget = { x: actor.homeX, y: actor.homeY, name: 'home lair' };
      actor.intent = 'Fleeing toward its lair with a strongly worded survival instinct.';
    } else {
      actor.state = MONSTER_STATES.INJURED;
      actor.nextDecisionAt = this.worldDangerClockMs + 280;
    }
    return false;
  }

  defeatMonsterActor(actor, source = null) {
    if (!actor || [MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state)) return;
    const threatenedHeroId = actor.targetRef?.kind === 'hero' ? actor.targetRef.id : null;
    actor.state = MONSTER_STATES.DYING;
    actor.targetRef = null;
    actor.target = null;
    actor.moveTarget = null;
    actor.nextDecisionAt = Number.POSITIVE_INFINITY;
    actor.intent = 'Dying. The loot table is preparing a statement.';
    const hasDeathAnimation = this.setMonsterAnimation(actor, 'death', actor.facing);
    this.worldInteractionTargets = this.worldInteractionTargets.filter((target) => target.id !== actor.id);
    actor.healthBar?.setVisible?.(false);
    const lair = this.monsterLairs?.[actor.homeLairId];
    if (lair) lair.activeMonsterIds = lair.activeMonsterIds.filter((id) => id !== actor.id);
    if (source?.def) {
      source.stats.fame = Phaser.Math.Clamp((source.stats.fame || 0) + actor.monster.threat * 2, 0, 100);
      this.addHeroHistory(source, `Defeated ${actor.monster.name} in visible combat.`);
      this.getHeroProfile(source).career.kills += 1;
      this.getHeroProfile(source).career.victories += 1;
      if (actor.raidTargetRef?.kind === 'building') this.getHeroProfile(source).career.buildingsDefended += 1;
      const rescued = threatenedHeroId ? this.getHeroById(threatenedHeroId) : null;
      if (rescued && rescued !== source) {
        this.getHeroProfile(source).career.rescues += 1;
        this.recordHeroRelationshipEvent(rescued, source, 'rescue', {
          location: actor.monster.name,
          relatedId: actor.id,
          text: `${source.def.name} rescued them from ${actor.monster.name}.`,
          severity: 4,
        });
      }
    }
    this.stats.monsterVictories = (this.stats.monsterVictories || 0) + 1;
    this.applyDeltas({ threat: actor.monster.threatImpact || -Math.max(2, actor.monster.threat) });
    this.addTownLog(`${source?.def?.name || 'Town defenders'} defeated ${actor.monster.name}. The loot table became briefly tangible.`, 'monster');
    this.finalizeDefenceIncident(actor, 'defeated', source?.def?.name || 'Town defenders');
    const deathX = actor.container.x;
    const deathY = actor.container.y;
    const finishDeath = () => {
      this.createMonsterAftermath(actor.monster, deathX, deathY, true, source?.def ? source : null, {
        homeLairId: actor.homeLairId,
        stolenCargo: actor.stolenCargo,
        killerId: source?.def?.id,
        killerName: source?.def?.name,
        causeOfDeath: source?.def ? `Defeated by ${source.def.name}` : 'Defeated by town defenses',
      });
      actor.state = MONSTER_STATES.DEAD;
      this.clearMonsterActor(actor, false);
      if (lair?.expeditionActive) this.checkLairCleared(lair);
      this.saveGame(false);
    };
    if (!actor.container?.active) {
      finishDeath();
      return;
    }
    const finishWithTween = () => this.tweens.add({
      targets: actor.container,
      alpha: 0.18,
      angle: hasDeathAnimation ? 0 : Phaser.Math.Between(-18, 18),
      scaleX: actor.container.scaleX * 0.88,
      scaleY: actor.container.scaleY * (hasDeathAnimation ? 0.88 : 0.5),
      y: deathY + 8,
      duration: hasDeathAnimation ? 220 : 480,
      ease: 'Quad.easeIn',
      onComplete: finishDeath,
    });
    if (hasDeathAnimation) this.time.delayedCall(760, finishWithTween);
    else finishWithTween();
  }

  applyBuildingMonsterDamage(actor, target) {
    this.confirmMonsterDetection(actor, {
      id: `attacked-building:${target.place.id}`,
      kind: 'attacked_building',
      name: target.name,
      x: target.x,
      y: target.y,
      radius: 0,
      reactionMs: 0,
      reliability: 1,
      place: target.place,
    }, 0);
    const runtime = this.getBuildingRuntime(target.place.id);
    const damage = Math.max(2, Math.round(actor.stats.damage * (actor.monster.behavior?.buildingDamage || 1)) - Math.floor(this.getDefenseBonus() / 4));
    runtime.health = Math.max(0, runtime.health - damage);
    if (actor.monster.behavior?.serviceDrain) runtime.serviceQuality = Math.max(0, (runtime.serviceQuality || 1) - actor.monster.behavior.serviceDrain);
    if (actor.monster.behavior?.corruptionAura && this.worldDangerClockMs >= (actor.nextEconomyEffectAt || 0)) {
      actor.nextEconomyEffectAt = this.worldDangerClockMs + 3800;
      this.applyDeltas({ corruption: actor.monster.behavior.corruptionAura, trust: -(actor.monster.behavior.trustDamage || 0) });
    }
    runtime.damaged = runtime.health < runtime.maxHealth * 0.7;
    runtime.heavilyDamaged = runtime.health < runtime.maxHealth * 0.35;
    runtime.repairCost = Math.max(runtime.repairCost || 0, Math.ceil((runtime.maxHealth - runtime.health) * 0.65));
    runtime.attackerHistory = [...(runtime.attackerHistory || []), {
      day: this.day,
      monsterId: actor.monster.id,
      monsterName: actor.monster.name,
      damage,
    }].slice(-8);
    if (runtime.damaged) runtime.serviceQuality = Math.max(1, (runtime.serviceQuality || 1) - 1);
    this.stats.monsterDamageEvents = (this.stats.monsterDamageEvents || 0) + 1;
    this.floatText(target.x, target.y - (target.place.h || 50), `-${damage} BUILDING`, '#f0938f');
    this.recordWorldAttack(actor, target, `${actor.monster.name} damaged ${target.name}.`);
    if (runtime.health <= 0) {
      runtime.health = 1;
      runtime.closed = true;
      runtime.damaged = true;
      this.addTownLog(`${target.name} was disabled by ${actor.monster.name}. It remains standing and requires repair.`, 'crisis');
      actor.state = MONSTER_STATES.RETURNING_TO_LAIR;
      actor.targetRef = null;
      actor.moveTarget = { x: actor.homeX, y: actor.homeY };
    }
    this.refreshBuildingDamageVisual(target.place);
  }

  createNamedDeathMarker(unit, actor, role = 'Hero') {
    const name = unit.def?.name || role;
    const areaCell = this.worldToBuildGrid(unit.container.x, unit.container.y);
    const areaId = `frontier-${Math.floor(areaCell.x / 8)}-${Math.floor(areaCell.y / 8)}`;
    const epitaphs = [
      'Died while proving that armour was an optional expense.',
      `Attempted to negotiate with ${actor.monster.name}. The monster declined.`,
      'Last seen carrying responsibilities and no survival instinct.',
      'The premium resurrection trial had already expired.',
      'The town mourned for six seconds, then checked the loot table.',
    ];
    const profileType = role === 'Hero' ? 'hero' : role === 'Carrier' ? 'carrier' : 'worker';
    const marker = normalizeAftermathRecord({
      id: `grave-${unit.def?.id || role}-${this.day}-${Math.floor(Math.random() * 100000)}`,
      kind: 'grave',
      name: `${name}'s Grave`,
      assetKey: 'icon_corpse',
      fallbackKey: 'corpse_skeleton_bones',
      x: unit.container.x,
      y: unit.container.y,
      gold: 0,
      monsterName: actor.monster.name,
      heroName: name,
      role,
      killerId: actor.id,
      killerName: actor.monster.name,
      deathDay: this.day,
      causeOfDeath: `${actor.monster.name} attack`,
      remainsType: profileType,
      decayDuration: 30,
      lootContents: role === 'Carrier' && unit.cargoResource ? { [unit.cargoResource]: Number(unit.cargo || unit.assignedCargo) || 1 } : {},
      homeLairId: actor.homeLairId || null,
      evidenceValue: 2,
      evidenceState: 'unread',
      dangerEffect: 4,
      flavour: getAftermathFlavor(profileType),
      epitaph: Phaser.Utils.Array.GetRandom(epitaphs),
      areaId,
    }, this.day);
    this.aftermathDrops.push(marker);
    this.renderAftermathDrop(marker);
    this.createAftermathQuest(marker, role === 'Hero' ? 'bury-fallen' : 'recover-cargo', role === 'Hero' ? `Bury ${name}` : `Recover ${name}'s cargo`);
    this.changeAreaReputation(areaId, 10, `${name}'s death`);
  }

  applyMonsterAttack(actor, target) {
    if (!target || this.worldDangerClockMs < actor.nextAttackAt) return;
    actor.nextAttackAt = this.worldDangerClockMs + actor.stats.attackCooldownMs;
    if (!actor.hasAnimationFrames) {
      actor.sprite?.setScale?.(actor.sprite.scaleX * 1.08, actor.sprite.scaleY * 0.94);
      this.time.delayedCall(100, () => actor.sprite?.active && actor.sprite.setScale?.(Math.abs(actor.sprite.scaleX) / 1.08 * Math.sign(actor.sprite.scaleX || 1), actor.sprite.scaleY / 0.94));
    }
    if (target.kind === 'building') {
      this.applyBuildingMonsterDamage(actor, target);
      return;
    }
    const unit = target.unit;
    if (!unit?.container?.active) return;
    unit.stats = unit.stats || {};
    unit.stats.maxHealth = Math.max(20, Number(unit.stats.maxHealth) || (target.kind === 'hero' ? 100 : 45));
    unit.stats.health = Number.isFinite(Number(unit.stats.health)) ? Number(unit.stats.health) : unit.stats.maxHealth;
    const armour = target.kind === 'hero' ? this.getHeroEquipmentBonus(unit).armor : 0;
    const damage = Math.max(1, actor.stats.damage - Math.floor(armour / 2));
    unit.stats.health = Math.max(0, unit.stats.health - damage);
    if (actor.monster.behavior?.moraleDrain && target.kind === 'hero') {
      unit.stats.morale = Phaser.Math.Clamp((unit.stats.morale || 0) - actor.monster.behavior.moraleDrain, 0, 100);
    }
    if (target.kind === 'carrier' && actor.monster.behavior?.cargoTheft && (unit.cargo || unit.assignedCargo)) {
      const stolen = Math.min(Number(unit.cargo || unit.assignedCargo) || 0, Math.max(1, Math.floor(actor.monster.behavior.cargoTheft)));
      actor.stolenCargo += stolen;
      if (Number.isFinite(unit.cargo)) unit.cargo = Math.max(0, unit.cargo - stolen);
      if (Number.isFinite(unit.assignedCargo)) unit.assignedCargo = Math.max(0, unit.assignedCargo - stolen);
      actor.state = MONSTER_STATES.FLEEING;
      actor.targetRef = null;
      actor.moveTarget = { x: actor.homeX, y: actor.homeY, name: 'home lair' };
      actor.intent = `Returning to its lair with ${stolen} stolen cargo.`;
    }
    this.floatText(unit.container.x, unit.container.y - 42, `-${damage}`, '#f0938f');
    unit.sprite?.setTint?.(0xff9b96);
    this.time.delayedCall(130, () => unit.sprite?.active && unit.sprite.clearTint?.());
    if (target.kind === 'hero') {
      const counter = Math.max(1, (unit.stats.power || 1) + this.getHeroEquipmentBonus(unit).power + Phaser.Math.Between(0, 4));
      this.damageMonster(actor, counter, unit);
      if (unit.stats.health <= 0 && !unit.stats.deathDay) {
        const fatal = actor.monster.threat >= 4 && Math.random() < 0.24;
        if (fatal) {
          this.createNamedDeathMarker(unit, actor, 'Hero');
          this.killHero(unit, `${actor.monster.name} ended the interception near ${target.name}.`);
          this.raiseCivilianDownAlert(actor, unit.def.name, 'Hero killed');
          this.failLairOperation(actor.homeLairId, `${unit.def.name} was killed during the operation.`);
          actor.kills += 1;
        } else {
          unit.stats.health = Math.ceil(unit.stats.maxHealth * 0.25);
          this.injureHero(unit, actor.monster.threat >= 4 ? 4 : 2, 'badly injured', actor.monster.name);
          this.triggerUnitFlee(unit, actor);
        }
      }
    } else if (target.kind === 'guard' && unit.stats.health > 0) {
      this.damageMonster(actor, Math.max(3, 5 + this.getPlaceLevel(this.buildingById.guard_post) * 2), unit);
      unit.currentAction = `Guarding against ${actor.monster.name}`;
    } else if (unit.stats.health > 0 && target.kind === 'service') {
      this.triggerUnitFlee(unit, actor);
    } else if (unit.stats.health <= 0) {
      this.createNamedDeathMarker(unit, actor, target.kind === 'carrier' ? 'Carrier' : 'Service Worker');
      if (target.kind === 'carrier') actor.stolenCargo += Number(unit.cargo || unit.assignedCargo) || 0;
      this.interruptHero(unit);
      this.worldInteractionTargets = this.worldInteractionTargets.filter((entry) => entry.id !== target.id);
      unit.container.destroy(true);
      actor.kills += 1;
      this.raiseCivilianDownAlert(actor, target.name, `${target.kind === 'carrier' ? 'Carrier' : 'Worker'} killed`);
      actor.targetRef = null;
      actor.state = MONSTER_STATES.IDLE;
      this.recordWorldAttack(actor, target, `${actor.monster.name} killed ${target.name}.`);
    }
  }

  triggerUnitFlee(unit, actor) {
    if (!unit?.container?.active || unit.serviceRole === 'carrier') return;
    const safe = this.doorById?.guildhall || this.doorById?.tavern || { id: 'town-square', name: 'Town Square', x: PLAZA.x, y: PLAZA.y };
    this.walkTo(unit, { ...safe, intentAction: `Fleeing ${actor.monster.name}`, reason: 'Survival briefly outranked productivity.', risk: 'High' }, () => {
      if (unit.walker) {
        unit.currentAction = `Sheltering from ${actor.monster.name}`;
        return;
      }
      unit.state = 'resting';
      this.scheduleAmbient(unit, Phaser.Math.Between(2400, 5200));
    });
  }

  recordWorldAttack(actor, target, text) {
    const responders = [
      ...this.getActiveHeroes().filter((hero) => hero.combatTargetId === actor.id).map((hero) => hero.def.name),
      ...(this.serviceWalkers || []).filter((walker) => walker.combatTargetId === actor.id).map((walker) => walker.def.name),
    ];
    const existing = [...(this.monsterState.attackHistory || [])].reverse()
      .find((entry) => entry.actorId === actor.id && entry.outcome === 'active');
    if (existing) {
      existing.target = target.name;
      existing.targetKind = target.kind;
      existing.responders = [...new Set([...(existing.responders || []), ...responders])];
      existing.deaths += text.includes('killed') ? 1 : 0;
      existing.buildingDamage += target.kind === 'building' ? 1 : 0;
      existing.cargoLost = actor.stolenCargo || existing.cargoLost || 0;
      existing.text = text;
      return existing;
    }
    const entry = {
      id: `attack-${actor.id}-${this.day}-${this.monsterState.attackHistory?.length || 0}`,
      actorId: actor.id,
      day: this.day,
      monsterId: actor.monster.id,
      monsterName: actor.monster.name,
      lairId: actor.homeLairId || null,
      detectionSource: actor.detectedBy || 'Impact report',
      location: `${Math.round(actor.container.x)},${Math.round(actor.container.y)}`,
      target: target.name,
      targetKind: target.kind,
      responders,
      injuries: 0,
      deaths: text.includes('killed') ? 1 : 0,
      buildingDamage: target.kind === 'building' ? 1 : 0,
      cargoLost: actor.stolenCargo || 0,
      outcome: 'active',
      responseTimeMs: actor.detectedAt ? Math.max(0, this.worldDangerClockMs - actor.detectedAt) : null,
      text,
    };
    this.monsterState.attackHistory = [...(this.monsterState.attackHistory || []), entry].slice(-WORLD_DANGER_LIMITS.attackHistoryLimit);
    const lair = this.monsterLairs?.[actor.homeLairId];
    if (lair) lair.recentAttacks = [...(lair.recentAttacks || []), `Day ${this.day}: ${target.name}`].slice(-8);
    return entry;
  }

  raiseCivilianDownAlert(actor, name, outcome) {
    const existing = this.defenceState.alerts.find((alert) => alert.actorId === actor.id);
    this.defenceState.alerts = upsertAlert(this.defenceState.alerts, {
      ...(existing || {}),
      id: existing?.id || `alert-${actor.id}`,
      actorId: actor.id,
      level: 'civilian',
      monsterName: actor.monster.name,
      detectorName: existing?.detectorName || name,
      targetName: name,
      nearestBuildingName: existing?.nearestBuildingName || 'Town edge',
      nearestDefenderName: existing?.nearestDefenderName || 'None',
      danger: 'Severe',
      detectedAtMs: actor.detectedAt || this.worldDangerClockMs,
      detectedDay: actor.detectedDay || this.day,
      updatedAtMs: this.worldDangerClockMs,
    });
    this.defenceState.lastSevereIncidentDay = this.day;
    this.addReportLine('monsters', `${outcome}: ${name}, caused by ${actor.monster.name}.`);
    this.updateTownNotice();
  }

  finalizeDefenceIncident(actor, outcome, responder = null) {
    const alert = this.defenceState.alerts.find((entry) => entry.actorId === actor.id);
    if (alert) {
      alert.dismissed = true;
      alert.outcome = outcome;
      alert.responder = responder;
    }
    const history = [...(this.monsterState.attackHistory || [])].reverse().find((entry) => entry.actorId === actor.id && entry.outcome === 'active');
    if (history) {
      history.outcome = outcome;
      history.responder = responder;
      history.cargoLost = actor.stolenCargo || history.cargoLost || 0;
    }
    const lair = this.monsterLairs?.[actor.homeLairId];
    if (lair && outcome === 'defeated') {
      lair.pressure = Phaser.Math.Clamp((lair.pressure || lair.threatBudget || 0) - 5, 0, 100);
      lair.pressureState = getLairPressureState(lair, this.day).id;
    }
    if (actor.raidId) {
      const raid = this.defenceState.activeRaids.find((entry) => entry.id === actor.raidId);
      const otherRaiders = (this.activeMonsterActors || []).some((entry) => entry !== actor && entry.raidId === actor.raidId && entry.container?.active && ![MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(entry.state));
      if (raid && !otherRaiders) {
        raid.status = 'complete';
        raid.completedDay = this.day;
        raid.outcome = outcome;
      }
    }
    this.updateTownNotice();
  }

  updateHeroMonsterCombat() {
    for (const hero of this.getActiveHeroes()) {
      if (!hero.combatTargetId || hero.state !== 'fighting') continue;
      const actor = this.activeMonsterActors.find((entry) => entry.id === hero.combatTargetId && entry.container?.active);
      if (!actor) {
        hero.combatTargetId = null;
        hero.state = 'idle';
        this.scheduleAmbient(hero, Phaser.Math.Between(1200, 2800));
        continue;
      }
      const distance = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, actor.container.x, actor.container.y);
      if (distance > 66) {
        this.dispatchHeroToMonster(actor, hero, false);
        continue;
      }
      if (this.worldDangerClockMs >= (hero.nextCombatAttackAt || 0)) {
        hero.nextCombatAttackAt = this.worldDangerClockMs + 1050;
        const damage = (hero.stats.power || 1) + this.getHeroEquipmentBonus(hero).power + Phaser.Math.Between(0, 5);
        this.damageMonster(actor, damage, hero);
        this.setHeroAnimationState(hero, 'interact');
      }
    }
  }

  dispatchHeroToMonster(actor, hero, manual = false, orderReason = null) {
    if (!actor?.container?.active || !hero?.container?.active || hero.stats.deathDay || this.isHeroInjured(hero)) return false;
    hero.combatTargetId = actor.id;
    hero.defenceOrder = manual ? 'manual' : 'automatic';
    actor.detectedBy = manual ? hero.def.name : actor.detectedBy || 'Town watch';
    const spot = {
      id: actor.id,
      name: actor.monster.name,
      x: actor.container.x,
      y: actor.container.y,
      h: 40,
      intentAction: `Intercepting ${actor.monster.name}`,
      reason: orderReason || (manual ? 'Player-assigned interception.' : 'Automatic danger response.'),
      risk: actor.monster.threat >= 5 ? 'High' : 'Moderate',
    };
    this.walkTo(hero, spot, () => {
      if (!actor.container?.active) return;
      const distance = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, actor.container.x, actor.container.y);
      if (distance > 80) {
        this.dispatchHeroToMonster(actor, hero, manual);
        return;
      }
      hero.state = 'fighting';
      hero.currentAction = `Fighting ${actor.monster.name}`;
      hero.intent = { action: hero.currentAction, destinationId: actor.id, destinationName: actor.monster.name, reason: spot.reason, risk: spot.risk };
      actor.targetRef = this.getMonsterTargetRef('hero', hero.def.id, hero.def.name);
      actor.state = MONSTER_STATES.ATTACKING;
    });
    return true;
  }

  spawnEmergencyGuard(post, actor) {
    const source = post || Object.values(this.buildingById || {}).find((place) => place?.isPlaced && getBaseBuildingId(place.baseId || place.id) === 'guard_post');
    if (!source || this.getBuildingRuntime(source.id).closed) return null;
    const config = SERVICE_WALKERS.watchtower;
    const textureKey = this.textures.exists(config.assetKey) ? config.assetKey : resolveTexture(this, config.fallbackKey, 'hero_default');
    if (!textureKey || !this.textures.exists(textureKey)) return null;
    const door = this.doorById?.[source.id] || source;
    const sprite = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    sprite.setScale(this.getTextureScaleForHeight(textureKey, 28, 1.2));
    const label = this.add.text(0, 2, 'Emergency Guard', {
      fontFamily: '"Courier New", monospace', fontSize: '8px', fontStyle: 'bold', color: '#ffd0cc', stroke: '#0c1118', strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(0);
    const container = this.add.container(door.x, door.y, [sprite, label]).setDepth(door.y + 4);
    const guard = {
      def: { id: `emergency-guard-${source.id}-${this.time.now}`, name: 'Emergency Guard', speed: 82, assetKey: textureKey },
      sprite,
      container,
      stats: { health: 70 + this.getPlaceLevel(source) * 8, maxHealth: 70 + this.getPlaceLevel(source) * 8, active: true },
      walker: true,
      serviceRole: 'guard_patrol',
      guardState: 'INTERCEPTING',
      originId: source.id,
      originName: source.name,
      currentAction: `Intercepting ${actor.monster.name}`,
      combatTargetId: actor.id,
      patrolLeash: (DETECTOR_PROFILES.guard_post.radius + this.getPlaceLevel(source) * 45)
        * (DEFENCE_PRIORITIES[this.defenceState.priority]?.chaseMultiplier || 1),
    };
    this.prepareHeroAnimation(guard);
    this.serviceWalkers.push(guard);
    guard.targetEntry = this.registerWorldInteractionTarget({
      id: guard.def.id,
      type: 'service', hit: container, img: container, walker: guard, width: 42, height: 54,
      getCenter: () => ({ x: container.x, y: container.y - 24 }),
      onHoverIn: () => { sprite.setTint(0xffd0cc); label.setAlpha(1); },
      onHoverOut: () => { sprite.clearTint?.(); if (this.activeInspector?.id !== guard.def.id) label.setAlpha(0); },
      onSelect: () => this.showServiceWalkerInspector(guard, config),
    });
    this.defenceState.patrolAssignments[source.id] = { zone: 'local-response', guardId: guard.def.id, actorId: actor.id, updatedDay: this.day };
    return guard;
  }

  dispatchGuardToMonster(actor, preferredPost = null) {
    if (!actor?.container?.active) return false;
    const policy = DEFENCE_PRIORITIES[this.defenceState.priority] || DEFENCE_PRIORITIES.balanced;
    let candidate = (this.serviceWalkers || [])
      .filter((walker) => walker.serviceRole === 'guard_patrol' && walker.container?.active && (walker.stats?.health || 0) > 0 && !walker.combatTargetId)
      .map((guard) => ({ guard, distance: Phaser.Math.Distance.Between(guard.container.x, guard.container.y, actor.container.x, actor.container.y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (!candidate) {
      const posts = Object.values(this.buildingById || {})
        .filter((place) => place?.isPlaced && ['guard_post', 'frontier_outpost'].includes(getBaseBuildingId(place.baseId || place.id)))
        .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, actor.container.x, actor.container.y) - Phaser.Math.Distance.Between(b.x, b.y, actor.container.x, actor.container.y));
      const guard = this.spawnEmergencyGuard(preferredPost || posts[0], actor);
      if (guard) candidate = { guard, distance: Phaser.Math.Distance.Between(guard.container.x, guard.container.y, actor.container.x, actor.container.y) };
    }
    if (!candidate) {
      this.game.events.emit('gwg-event', 'No Guard Post can dispatch. The warning bell has entered a solo career.');
      return false;
    }
    const guard = candidate.guard;
    const home = this.doorById?.[guard.originId] || this.buildingById?.[guard.originId] || guard.container;
    const leash = guard.patrolLeash || DETECTOR_PROFILES.guard.radius * policy.chaseMultiplier;
    if (Phaser.Math.Distance.Between(home.x, home.y, actor.container.x, actor.container.y) > leash) {
      this.game.events.emit('gwg-event', `${guard.def.name} requested hero support; the target is beyond patrol leash.`);
      return false;
    }
    guard.combatTargetId = actor.id;
    guard.guardState = 'INTERCEPTING';
    guard.currentAction = `Intercepting ${actor.monster.name}`;
    actor.defenderAssignedAt = this.worldDangerClockMs;
    this.walkTo(guard, {
      id: actor.id, name: actor.monster.name, x: actor.container.x, y: actor.container.y, h: 40,
      intentAction: `Intercepting ${actor.monster.name}`, reason: 'Guard Post emergency dispatch.', risk: 'Moderate',
    }, () => {
      if (!actor.container?.active || !guard.container?.active) return;
      guard.guardState = 'FIGHTING';
      actor.targetRef = this.getMonsterTargetRef('guard', guard.targetEntry?.id, guard.def.name);
      actor.state = MONSTER_STATES.ATTACKING;
    });
    return true;
  }

  maybeDispatchDefender(actor) {
    if (this.worldDangerClockMs - (actor.defenderAssignedAt || 0) < 3500) return;
    const guardRange = 260 + this.getPlaceLevel(this.buildingById.watchtower) * 70 + this.getPlaceLevel(this.buildingById.guard_post) * 85;
    const guard = (this.serviceWalkers || [])
      .filter((walker) => walker.serviceRole === 'guard_patrol' && walker.container?.active && (walker.stats?.health || 0) > 0)
      .map((walker) => ({ walker, distance: Phaser.Math.Distance.Between(walker.container.x, walker.container.y, actor.container.x, actor.container.y) }))
      .filter((entry) => entry.distance <= guardRange)
      .sort((a, b) => a.distance - b.distance)[0];
    if (guard) {
      this.dispatchGuardToMonster(actor);
      return;
    }
    const guardPost = Object.values(this.buildingById || {}).find((place) => (
      place?.isPlaced
      && ['guard_post', 'frontier_outpost'].includes(getBaseBuildingId(place.baseId || place.id))
      && !this.getBuildingRuntime(place.id).closed
    ));
    if (guardPost && this.dispatchGuardToMonster(actor, guardPost)) return;
    const defenders = this.getActiveHeroes()
      .filter((hero) => hero.state !== 'away' && !hero.stats.deathDay && !this.isHeroInjured(hero) && !hero.stats.gatheringNodeId)
      .map((hero) => ({ hero, distance: Phaser.Math.Distance.Between(hero.container.x, hero.container.y, actor.container.x, actor.container.y) }))
      .filter((entry) => entry.distance <= guardRange)
      .sort((a, b) => (b.hero.stats.power || 0) - (a.hero.stats.power || 0) || a.distance - b.distance);
    if (!defenders.length) return;
    actor.defenderAssignedAt = this.worldDangerClockMs;
    this.dispatchHeroToMonster(actor, defenders[0].hero, false);
  }

  runMonsterActionFromUi(value) {
    const [actorId, action = 'intercept'] = String(value || '').split('|');
    const actor = this.activeMonsterActors?.find((entry) => entry.id === actorId && entry.container?.active);
    if (!actor) return;
    if (action === 'priority') {
      actor.priority = !actor.priority;
      this.showMonsterInspector(actor);
    } else if (action === 'follow') {
      this.cameras.main.centerOn(actor.container.x, actor.container.y);
    } else if (action === 'cancel') {
      for (const hero of this.heroes || []) {
        if (hero.combatTargetId !== actor.id) continue;
        hero.combatTargetId = null;
        hero.defenceOrder = null;
        this.interruptHero(hero);
        this.scheduleAmbient(hero, Phaser.Math.Between(700, 1600));
      }
      for (const guard of this.serviceWalkers || []) {
        if (guard.combatTargetId !== actor.id) continue;
        guard.combatTargetId = null;
        guard.guardState = 'RETURNING_TO_POST';
        const home = this.doorById?.[guard.originId] || this.buildingById?.[guard.originId];
        if (home) this.walkTo(guard, { ...home, intentAction: 'Returning to post', reason: 'Response cancelled.', risk: 'Low' });
      }
    } else if (action === 'shadow' || action === 'track') {
      const hero = this.getBestDefenderForMonster(actor);
      if (hero) {
        hero.combatTargetId = null;
        const destination = action === 'track' && actor.homeLairId ? this.explorationPointById?.[actor.homeLairId] || actor.container : actor.container;
        this.walkTo(hero, { id: actor.id, name: actor.monster.name, x: destination.x, y: destination.y, h: 40,
          intentAction: action === 'track' ? `Tracking ${actor.monster.name} to lair` : `Following ${actor.monster.name}`,
          reason: 'Observe without automatic engagement.', risk: 'Moderate' });
      }
    } else {
      const hero = this.getBestDefenderForMonster(actor);
      if (hero) this.dispatchHeroToMonster(actor, hero, true, action === 'hunt' ? 'Aggressive hunt order.' : action === 'drive' ? 'Drive the monster beyond town coverage.' : null);
      else this.game.events.emit('gwg-event', 'No healthy hero is free to intercept. The monster considers this premium service.');
    }
    this.saveGame(false);
  }

  runLairActionFromUi(value) {
    const [lairId, action = 'inspect'] = String(value || '').split('|');
    const lair = this.monsterLairs?.[lairId];
    const point = lair ? this.explorationPointById?.[lair.poiId] : null;
    if (!lair || !point) return;
    if (action === 'inspect') {
      this.showLairInspector(lair);
      return;
    }
    if (action === 'track') {
      const actor = this.activeMonsterActors.find((entry) => entry.homeLairId === lair.id && entry.container?.active);
      if (actor) {
        this.cameras.main.centerOn(actor.container.x, actor.container.y);
        this.showMonsterInspector(actor);
      }
      return;
    }
    if (action === 'withdraw') {
      for (const heroId of lair.operation?.heroIds || []) {
        const hero = this.heroes.find((entry) => entry.def.id === heroId);
        if (!hero) continue;
        hero.combatTargetId = null;
        this.interruptHero(hero);
        this.scheduleAmbient(hero, Phaser.Math.Between(800, 1800));
      }
      lair.operation = null;
      lair.expeditionActive = false;
      this.addTownLog(`The operation at ${lair.name} withdrew. The lair billed this as customer retention.`, 'monster');
      this.showLairInspector(lair);
      this.saveGame(false);
      return;
    }
    if (action === 'patrol') {
      const outpost = Object.values(this.buildingById || {})
        .filter((place) => place?.isPlaced && ['guard_post', 'frontier_outpost', 'watchtower'].includes(getBaseBuildingId(place.baseId || place.id)))
        .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, point.x, point.y) - Phaser.Math.Distance.Between(b.x, b.y, point.x, point.y))[0];
      if (!outpost) {
        this.game.events.emit('gwg-event', 'No defensive post can own that patrol route. Build one before assigning bravery by spreadsheet.');
        return;
      }
      this.defenceState.patrolAssignments[outpost.id] = { zone: lair.id, lairId: lair.id, updatedDay: this.day };
      lair.pressure = Math.max(0, (lair.pressure || 0) - 6);
      this.addTownLog(`${outpost.name} assigned a patrol toward ${lair.name}.`, 'monster');
      this.showLairInspector(lair);
      this.saveGame(false);
      return;
    }
    const available = this.getActiveHeroes()
      .filter((entry) => entry.state !== 'away' && !this.isHeroInjured(entry) && !entry.stats.gatheringNodeId)
      .filter((entry) => !entry.combatTargetId)
      .sort((a, b) => (b.stats.power || 0) - (a.stats.power || 0));
    const teamSize = action === 'clear' ? Math.min(2, available.length) : 1;
    const team = available.slice(0, teamSize);
    if (!team.length) {
      this.game.events.emit('gwg-event', 'No healthy hero is free for lair work. Danger remains vertically integrated.');
      return;
    }
    if (action === 'scout') {
      const hero = team[0];
      this.walkTo(hero, { ...point, intentAction: `Scouting ${lair.name}`, reason: 'Improves the threat estimate.', risk: 'Moderate' }, () => {
        lair.scouted = true;
        lair.discovered = true;
        lair.pressure = Math.max(0, (lair.pressure || 0) - 4);
        this.revealArea(point.gridX, point.gridY, lair.revealRadius, `${hero.def.name}'s lair survey`);
        this.addTownLog(`${hero.def.name} scouted ${lair.name}. The danger estimate is now professionally alarming.`, 'monster');
        this.showLairInspector(lair);
        this.saveGame(false);
      });
      return;
    }
    const operationType = action === 'clear' ? 'clear' : 'suppress';
    lair.expeditionActive = true;
    lair.discovered = true;
    lair.operation = { type: operationType, heroIds: team.map((hero) => hero.def.id), startedDay: this.day, status: 'active' };
    let defenders = this.activeMonsterActors.filter((actor) => actor.homeLairId === lair.id && actor.container?.active);
    while (defenders.length < team.length) {
      const spawned = this.spawnMonsterFromLair(lair, true);
      if (spawned) defenders.push(spawned);
      else break;
    }
    defenders.sort((a, b) => (b.monster.threat || 0) - (a.monster.threat || 0));
    team.forEach((hero, index) => {
      const target = defenders[index % Math.max(1, defenders.length)];
      if (target) this.dispatchHeroToMonster(target, hero, true, `${operationType === 'clear' ? 'Clearing' : 'Suppressing'} ${lair.name}.`);
      else this.walkTo(hero, { ...point, intentAction: `${operationType === 'clear' ? 'Clearing' : 'Suppressing'} ${lair.name}`, reason: 'Lair operation.', risk: 'High' });
    });
    this.addTownLog(`${team.map((hero) => hero.def.name).join(' and ')} began a ${operationType} operation at ${lair.name}.`, 'monster');
    this.saveGame(false);
  }

  failLairOperation(lairId, reason) {
    const lair = this.monsterLairs?.[lairId];
    if (!lair?.operation || lair.operation.status !== 'active') return;
    lair.operation.status = 'failed';
    lair.expeditionActive = false;
    lair.pressure = Phaser.Math.Clamp((lair.pressure || 0) + 14, 0, 100);
    lair.pressureState = getLairPressureState(lair, this.day).id;
    lair.raidCooldownUntilDay = Math.min(lair.raidCooldownUntilDay || this.day + 2, this.day + 2);
    this.addTownLog(`${lair.name} repelled the operation. ${reason} Pressure rose to ${Math.round(lair.pressure)}.`, 'crisis');
    this.addReportLine('monsters', `Failed operation at ${lair.name}: ${reason}`);
  }

  checkLairCleared(lair) {
    const remaining = this.activeMonsterActors.some((actor) => actor.homeLairId === lair.id && actor.container?.active && actor.state !== MONSTER_STATES.DEAD);
    if (remaining) return;
    lair.expeditionActive = false;
    const operationType = lair.operation?.type || 'suppress';
    const canClear = operationType === 'clear' && (lair.level <= 2 || (lair.suppressionProgress || 0) >= 45 || (lair.pressure || 0) < 42);
    if (canClear) {
      lair.cleared = true;
      lair.suppressedUntilDay = 0;
    } else {
      const duration = operationType === 'suppress' ? 6 : 4;
      lair.suppressedUntilDay = this.day + duration;
      lair.recoveryDay = this.day + duration;
      lair.nextSpawnDay = this.day + duration + 1;
      lair.suppressionProgress = Phaser.Math.Clamp((lair.suppressionProgress || 0) + (operationType === 'clear' ? 35 : 24), 0, 100);
    }
    const operationHeroes = (lair.operation?.heroIds || []).map((id) => this.getHeroById(id)).filter(Boolean);
    lair.operation = { ...(lair.operation || {}), status: 'complete', completedDay: this.day };
    for (const hero of operationHeroes) {
      const profile = this.getHeroProfile(hero);
      profile.career.lairsCleared += lair.cleared ? 1 : 0;
      profile.career.victories += 1;
      profile.localReputation = Phaser.Math.Clamp(profile.localReputation + (lair.cleared ? 12 : 6), -100, 100);
    }
    for (let i = 0; i < operationHeroes.length; i += 1) {
      for (let j = i + 1; j < operationHeroes.length; j += 1) {
        this.recordHeroRelationshipEvent(operationHeroes[i], operationHeroes[j], 'quest_success', {
          relatedId: lair.id,
          location: lair.name,
          text: `${lair.cleared ? 'Cleared' : 'Suppressed'} ${lair.name} together.`,
          severity: lair.cleared ? 3 : 2,
          reciprocal: true,
        });
      }
    }
    lair.threatBudget = Math.max(0, lair.threatBudget - 18);
    lair.pressure = lair.cleared ? 0 : Math.max(0, (lair.pressure || 0) - 28);
    lair.pressureState = getLairPressureState(lair, this.day).id;
    this.changeAreaReputation(lair.poiId, -18, `${lair.name} cleared`);
    this.applyDeltas({ gold: 45 + lair.level * 35, trust: 2, threat: -(4 + lair.level * 2) });
    const text = lair.cleared
      ? `${lair.name} was cleared permanently. The monsters lost their zoning appeal.`
      : `${lair.name} was suppressed until Day ${lair.suppressedUntilDay}. Large dungeons retain legal counsel.`;
    this.addTownLog(text, 'unlock');
    this.addReportLine('monsters', text);
    this.saveGame(false);
  }

  applyWatchtowerAssistance(actor) {
    if (!actor?.container?.active || !actor.detectedAt || this.worldDangerClockMs < (actor.nextTowerShotAt || 0)) return;
    const towers = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && getBaseBuildingId(place.baseId || place.id) === 'watchtower')
      .filter((place) => !this.getBuildingRuntime(place.id).closed)
      .map((place) => {
        const runtime = this.getBuildingRuntime(place.id);
        const healthRatio = runtime.maxHealth > 0 ? Phaser.Math.Clamp(runtime.health / runtime.maxHealth, 0.35, 1) : 1;
        const radius = (430 + this.getPlaceLevel(place) * 55) * healthRatio;
        return { place, radius, distance: Phaser.Math.Distance.Between(place.x, place.y, actor.container.x, actor.container.y) };
      })
      .filter((entry) => entry.distance <= entry.radius)
      .sort((a, b) => a.distance - b.distance);
    if (!towers.length) return;
    const tower = towers[0].place;
    actor.nextTowerShotAt = this.worldDangerClockMs + 2600;
    const damage = 2 + Math.max(0, this.getPlaceLevel(tower) - 1);
    this.damageMonster(actor, damage, null);
  }

  updateWorldDanger(deltaMs) {
    if (this.simulationSpeed <= 0 || this.buildMode) return;
    const scaled = deltaMs * this.simulationSpeed;
    this.worldDangerClockMs += scaled;
    this.defenceScanElapsedMs += scaled;
    if (this.defenceScanElapsedMs >= 420) {
      this.defenceScanElapsedMs = 0;
      this.scanMonsterDetection();
      this.releaseShelteredCivilians();
      for (const actor of this.activeMonsterActors || []) this.applyWatchtowerAssistance(actor);
    }
    const deltaSeconds = scaled / 1000;
    for (const actor of [...(this.activeMonsterActors || [])]) {
      if (!actor?.container?.active || [MONSTER_STATES.DYING, MONSTER_STATES.DEAD].includes(actor.state)) continue;
      if (this.worldDangerClockMs >= actor.nextDecisionAt) {
        actor.nextDecisionAt = this.worldDangerClockMs + WORLD_DANGER_LIMITS.aiStepMs + Phaser.Math.Between(0, 220);
        this.decideMonsterAction(actor);
      }
      this.advanceMonsterMovement(actor, deltaSeconds);
      if (actor.state === MONSTER_STATES.ATTACKING) this.setMonsterAnimation(actor, 'attack', actor.facing);
      if (actor.state === MONSTER_STATES.ATTACKING) this.applyMonsterAttack(actor, this.resolveMonsterTarget(actor));
    }
    this.updateHeroMonsterCombat();
  }

  moveMonsterActor(actor, target, onComplete = null) {
    if (!actor?.container || !target) {
      onComplete?.();
      return;
    }
    actor.state = 'attacking';
    actor.intent = `Attacking ${target.name}.`;
    const startX = actor.container.x;
    const startY = actor.container.y;
    const mid = {
      x: (startX + target.x) / 2 + Phaser.Math.Between(-54, 54),
      y: (startY + target.y) / 2 + Phaser.Math.Between(-22, 28),
    };
    const speed = Math.max(0.55, actor.monster.speed || 1);
    this.tweens.add({
      targets: actor.container,
      x: mid.x,
      y: mid.y,
      duration: 620 / speed,
      ease: 'Sine.easeInOut',
      onUpdate: () => actor.container.setDepth(actor.container.y + 75),
      onComplete: () => {
        this.tweens.add({
          targets: actor.container,
          x: target.x,
          y: target.y - 8,
          duration: 1150 / speed,
          ease: 'Sine.easeInOut',
          onUpdate: () => actor.container.setDepth(actor.container.y + 75),
          onComplete,
        });
      },
    });
  }

  clearMonsterActor(actor, fade = true) {
    if (!actor) return;
    actor.animationTimer?.remove?.();
    actor.ambientTween?.stop?.();
    const lair = this.monsterLairs?.[actor.homeLairId];
    if (lair) lair.activeMonsterIds = (lair.activeMonsterIds || []).filter((id) => id !== actor.id);
    for (const hero of this.heroes || []) {
      if (hero.combatTargetId !== actor.id) continue;
      hero.combatTargetId = null;
      if (hero.state === 'fighting') {
        hero.state = 'idle';
        hero.currentAction = 'Recovering after combat';
        this.scheduleAmbient(hero, Phaser.Math.Between(900, 2200));
      }
    }
    for (const guard of this.serviceWalkers || []) {
      if (guard.combatTargetId !== actor.id) continue;
      guard.combatTargetId = null;
      guard.guardState = 'RETURNING_TO_POST';
      guard.currentAction = 'Returning to patrol';
      const home = this.doorById?.[guard.originId] || this.buildingById?.[guard.originId];
      if (!home || !guard.container?.active) {
        guard.guardState = 'IDLE';
        continue;
      }
      this.walkTo(guard, {
        id: guard.originId,
        name: guard.originName || 'Guard Post',
        x: home.x,
        y: home.y,
        h: 36,
        intentAction: 'Returning to patrol',
        reason: 'The immediate threat has ended.',
        risk: 'Low',
      }, () => {
        if (!guard.container?.active) return;
        guard.guardState = 'PATROLLING';
        guard.currentAction = `Patrolling near ${guard.originName || 'post'}`;
      });
    }
    if (this.activeInspector?.type === 'monster' && this.activeInspector.id === actor.id) {
      this.activeInspector = null;
      this.game.events.emit('gwg-inspector-close');
    }
    this.activeMonsterActors = (this.activeMonsterActors || []).filter((item) => item !== actor);
    this.worldInteractionTargets = this.worldInteractionTargets.filter((target) => target.id !== actor.id);
    if (!actor.container?.active) return;
    if (fade) {
      this.tweens.add({
        targets: actor.container,
        alpha: 0,
        scale: 0.72,
        duration: 360,
        onComplete: () => actor.container.destroy(true),
      });
    } else {
      actor.container.destroy(true);
    }
  }

  showMonsterAttack(monster, target, spawn = null) {
    if (!monster || !target) return;
    const textureKey = this.textures.exists(monster.assetKey)
      ? monster.assetKey
      : resolveTexture(this, 'icon_warning', 'chevron');
    if (!textureKey) return;
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const scale = source?.height ? Phaser.Math.Clamp(42 / source.height, 0.35, 1.4) : 1;
    const start = spawn || target;
    const sprite = this.add.image(start.x, start.y - 28, textureKey)
      .setScale(scale)
      .setDepth(5200);
    this.tweens.add({
      targets: sprite,
      x: target.x,
      y: target.y - 28,
      duration: 1250 / Math.max(0.55, monster.speed || 1),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: sprite,
          scale: scale * 1.24,
          alpha: 0,
          duration: 520,
          onComplete: () => sprite.destroy(),
        });
      },
    });
  }

  showMonsterEncounter(monster, x, y) {
    if (!monster) return;
    const textureKey = this.textures.exists(monster.assetKey)
      ? monster.assetKey
      : resolveTexture(this, 'icon_warning', 'chevron');
    if (!textureKey) return;
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const scale = source?.height ? Phaser.Math.Clamp(40 / source.height, 0.35, 1.3) : 1;
    const sprite = this.add.image(x, y - 26, textureKey)
      .setScale(scale)
      .setDepth(y + 30)
      .setAlpha(0);
    this.tweens.add({
      targets: sprite,
      alpha: 1,
      y: y - 38,
      duration: 180,
      yoyo: true,
      hold: 1050,
      onComplete: () => sprite.destroy(),
    });
  }

  getMonsterAttackChance() {
    if (this.day <= 2) return 0.04;
    const placedCount = this.isBuilderCity
      ? this.cityState.placedBuildings.filter((building) => this.isBuildingPlaced(building.id)).length
      : Object.values(this.buildingById || {}).filter((place) => place?.isPlaced !== false).length;
    const watchtower = this.getPlaceLevel(this.buildingById.watchtower);
    const activeHeroes = this.getActiveHeroes().length;
    const openedFog = this.isBuilderCity && this.revealedTiles
      ? Math.max(0, this.revealedTiles.size - 140) / 900
      : 0;
    const recentCooldown = this.day - (this.monsterState?.lastAttackDay || 0) <= 1 ? 0.45 : 1;
    const weeklyThrottle = (this.monsterState?.weekAttackCount || 0) >= 3 ? 0.45 : 1;
    const chance = (
      BALANCE.monsterBaseDailyChance
      + this.resources.threat * 0.0022
      + placedCount * 0.004
      + this.resources.corruption * 0.0007
      + (this.isBuildingPlaced('dungeon') ? 0.035 : 0)
      + openedFog
      - watchtower * 0.035
      - activeHeroes * 0.006
      - this.resources.morale * 0.0005
    ) * recentCooldown * weeklyThrottle;
    return Phaser.Math.Clamp(chance, 0.02, this.resources.threat >= 90 ? 0.55 : 0.34);
  }

  getDefenceCoverageAt(x, y) {
    let coverage = 0;
    const sources = Object.values(this.buildingById || {}).filter((place) => place?.isPlaced);
    for (const place of sources) {
      const baseId = getBaseBuildingId(place.baseId || place.id);
      const ranges = { watchtower: 430, guard_post: 270, frontier_outpost: 330, scout_post: 370 };
      if (!ranges[baseId]) continue;
      const runtime = this.getBuildingRuntime(place.id);
      if (runtime.closed) continue;
      const damageFactor = runtime.heavilyDamaged ? 0.4 : runtime.damaged ? 0.68 : 1;
      const range = (ranges[baseId] + Math.max(0, this.getPlaceLevel(place) - 1) * 45) * damageFactor;
      const distance = Phaser.Math.Distance.Between(x, y, place.x, place.y);
      if (distance <= range) coverage += (1 - distance / range) * (baseId === 'frontier_outpost' ? 3 : 2);
    }
    return Math.max(0, coverage);
  }

  updateLairPressureAndRaids() {
    const activeMajorEmergency = (this.defenceState.activeRaids || []).some((raid) => raid.status === 'active');
    for (const lair of Object.values(this.monsterLairs || {})) {
      const point = this.explorationPointById?.[lair.poiId];
      if (!point) continue;
      if (lair.cleared) {
        lair.pressure = 0;
        lair.pressureState = 'cleared';
        continue;
      }
      if (lair.suppressedUntilDay > this.day) {
        lair.pressure = Math.max(0, (lair.pressure || 0) - 3);
        lair.pressureState = 'suppressed';
        continue;
      }
      const coverage = this.getDefenceCoverageAt(point.x, point.y);
      const patrolSupport = Object.values(this.defenceState.patrolAssignments || {}).some((assignment) => assignment?.lairId === lair.id) ? 2.5 : 0;
      const nearbyExpansion = (this.cityState?.placedBuildings || []).filter((building) => {
        const place = this.buildingById?.[building.id];
        return place && Phaser.Math.Distance.Between(place.x, place.y, point.x, point.y) < 520;
      }).length;
      const returned = (this.activeMonsterActors || []).filter((actor) => actor.homeLairId === lair.id && actor.state === MONSTER_STATES.RETURNING_TO_LAIR).length;
      const increase = 1 + lair.level * 0.7 + Math.min(3, nearbyExpansion * 0.25) + Math.min(2, this.resources.corruption / 45) + returned * 1.5;
      lair.pressure = Phaser.Math.Clamp((lair.pressure ?? lair.threatBudget ?? 0) + increase - coverage - patrolSupport, 0, 100);
      const previous = lair.pressureState;
      const state = getLairPressureState(lair, this.day);
      lair.pressureState = state.id;
      lair.threatBudget = Phaser.Math.Clamp(Math.max(lair.threatBudget || 0, lair.pressure * 0.7), 0, 100);
      if (previous !== state.id && ['active', 'raiding'].includes(state.id)) {
        const text = `${lair.name} is now ${state.name}. Pressure ${Math.round(lair.pressure)}/100.`;
        this.addTownLog(text, 'monster');
        this.addReportLine('warnings', text);
        if (lair.discovered) this.createLairPressureAlert(lair, point);
      }
      const severeGrace = this.day - (this.defenceState.lastSevereIncidentDay || 0) <= DEFENCE_LIMITS.incidentGraceDays;
      if (!activeMajorEmergency && !severeGrace && this.day > 2 && state.id === 'raiding' && (lair.raidCooldownUntilDay || 0) <= this.day) {
        this.launchRaidFromLair(lair);
      }
    }
    this.defenceState.activeRaids = (this.defenceState.activeRaids || [])
      .filter((raid) => raid.status === 'active' && (this.activeMonsterActors || []).some((actor) => actor.raidId === raid.id && actor.container?.active))
      .slice(-DEFENCE_LIMITS.maxActiveRaids);
  }

  createLairPressureAlert(lair, point) {
    const actor = (this.activeMonsterActors || []).find((entry) => entry.homeLairId === lair.id && entry.container?.active);
    this.defenceState.alerts = upsertAlert(this.defenceState.alerts, {
      id: actor ? `alert-${actor.id}` : `alert-lair-${lair.id}`,
      actorId: actor?.id || `lair:${lair.id}`,
      lairId: lair.id,
      level: 'pressure',
      monsterName: actor?.monster.name || lair.type,
      detectorName: lair.name,
      detectorKind: 'lair',
      x: point.x,
      y: point.y,
      targetName: 'Unknown',
      nearestBuildingName: 'Frontier',
      nearestDefenderName: 'Unassigned',
      danger: estimateDangerLabel(lair.pressure),
      detectedAtMs: this.worldDangerClockMs,
      detectedDay: this.day,
      updatedAtMs: this.worldDangerClockMs,
    });
    this.game.events.emit('gwg-event', `Lair Pressure Rising: ${lair.name}. ${actor ? `${actor.monster.name} is already active.` : 'No individual monster has signed the attack form yet.'}`);
    this.updateTownNotice();
  }

  getRaidTarget(lair) {
    const policy = DEFENCE_PRIORITIES[this.defenceState.priority] || DEFENCE_PRIORITIES.balanced;
    const premiumIds = new Set(['whale', 'premium_temple', 'premium_fabricator', 'vip_lounge', 'lootbox_kiosk']);
    const storageIds = new Set(['storehouse', 'warehouse', 'market', 'lumber_camp', 'mining_camp', 'salvage_camp']);
    const candidates = Object.values(this.buildingById || {}).filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id));
    return candidates.map((place) => {
      const baseId = getBaseBuildingId(place.baseId || place.id);
      const point = this.explorationPointById?.[lair.poiId];
      const distance = point ? Phaser.Math.Distance.Between(point.x, point.y, place.x, place.y) : 0;
      let score = 400 - distance / 4;
      if (storageIds.has(baseId)) score += 45 - policy.storage * 0.2;
      if (premiumIds.has(baseId)) score += 35 + (this.resources.corruption || 0) * 0.25 - policy.premium * 0.15;
      if (['watchtower', 'guard_post'].includes(baseId)) score += 24;
      return { place, score };
    }).sort((a, b) => b.score - a.score)[0]?.place || this.getOperationalPlace('guildhall');
  }

  launchRaidFromLair(lair) {
    if ((this.defenceState.activeRaids || []).length >= DEFENCE_LIMITS.maxActiveRaids) return false;
    const target = this.getRaidTarget(lair);
    if (!target) return false;
    const raidId = `raid-${lair.id}-${this.day}-${Math.floor(Math.random() * 10000)}`;
    const townScale = Math.max(1, Math.floor((this.cityState?.placedBuildings?.length || 1) / 10));
    const size = Phaser.Math.Clamp(1 + Math.floor((lair.pressure - 70) / 18) + Math.min(1, townScale), 1, this.day < 15 ? 3 : 4);
    const spawned = [];
    for (let index = 0; index < size; index += 1) {
      const actor = this.spawnMonsterFromLair(lair, true);
      if (!actor) break;
      actor.raidId = raidId;
      actor.raidTargetRef = this.getMonsterTargetRef('building', target.id, target.name);
      actor.targetRef = actor.raidTargetRef;
      actor.target = target;
      actor.moveTarget = target;
      actor.intent = `Raiding ${target.name} from ${lair.name}.`;
      spawned.push(actor.id);
    }
    if (!spawned.length) return false;
    const raid = { id: raidId, lairId: lair.id, targetId: target.id, targetName: target.name, monsterIds: spawned, startedDay: this.day, status: 'active' };
    this.defenceState.activeRaids = [...(this.defenceState.activeRaids || []), raid].slice(-DEFENCE_LIMITS.maxActiveRaids);
    this.defenceState.summarizedIncidents.raids += 1;
    this.defenceState.lastSevereIncidentDay = this.day;
    lair.lastRaidDay = this.day;
    lair.raidCooldownUntilDay = this.day + Phaser.Math.Between(4, 6);
    lair.recentAttacks = [...(lair.recentAttacks || []), `Day ${this.day}: raid targeting ${target.name}`].slice(-8);
    const text = `${lair.name} launched a visible raid on ${target.name}: ${spawned.length} attacker${spawned.length === 1 ? '' : 's'} departed on foot.`;
    this.addTownLog(text, 'crisis');
    this.addReportLine('monsters', text);
    this.game.events.emit('gwg-event', text);
    return true;
  }

  maybeTriggerMonsterAttack(force = false) {
    const chance = this.getMonsterAttackChance();
    if (!force && Math.random() > chance) return false;
    return this.resolveMonsterAttack({ forced: force, chance });
  }

  getEligibleMonsterLairs(force = false) {
    return Object.values(this.monsterLairs || {})
      .filter((lair) => {
        if (!lair || lair.cleared) return false;
        if (!force && lair.suppressedUntilDay > this.day) return false;
        if (!force && lair.nextSpawnDay > this.day) return false;
        const point = this.explorationPointById?.[lair.poiId];
        return Boolean(point);
      })
      .sort((a, b) => (b.threatBudget + b.danger) - (a.threatBudget + a.danger));
  }

  getLairSpawnPoint(lair) {
    const point = this.explorationPointById?.[lair?.poiId];
    if (!point) return null;
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(28, 62);
    let x = point.x + Math.cos(angle) * radius;
    let y = point.y + Math.sin(angle) * radius * 0.55;
    const cell = this.worldToBuildGrid(x, y);
    if (!isInsideGrid(cell.x, cell.y) || this.gridCells?.get(gridKey(cell.x, cell.y))?.occupiedBy) {
      x = point.x;
      y = point.y + 24;
    }
    return { x, y };
  }

  spawnMonsterFromLair(lair, force = false) {
    if (!lair || lair.cleared) return null;
    if (!force && lair.suppressedUntilDay > this.day) return null;
    const activeTotal = (this.activeMonsterActors || []).filter((actor) => actor.container?.active && actor.state !== MONSTER_STATES.DEAD).length;
    const activeForLair = (this.activeMonsterActors || []).filter((actor) => actor.homeLairId === lair.id && actor.container?.active && actor.state !== MONSTER_STATES.DEAD).length;
    if (activeTotal >= WORLD_DANGER_LIMITS.maxActiveMonsters || activeForLair >= lair.activeMonsterCap) return null;
    const family = (lair.monsterFamily || []).map((id) => MONSTERS.find((monster) => monster.id === id)).filter(Boolean);
    const monster = Phaser.Utils.Array.GetRandom(family.length ? family : MONSTERS);
    const spawn = this.getLairSpawnPoint(lair);
    if (!monster || !spawn) return null;
    const target = this.getMonsterTarget(monster) || this.getOperationalPlace('guildhall');
    const stats = getMonsterRuntimeStats(monster, lair.level);
    const actor = this.spawnMonsterActor(monster, target, spawn, {
      homeLairId: lair.id,
      homeX: spawn.x,
      homeY: spawn.y,
      state: MONSTER_STATES.SPAWNING,
      intent: `Emerging from ${lair.name}.`,
      maxHealth: stats.maxHealth,
      health: stats.maxHealth,
    });
    actor.nextDecisionAt = this.worldDangerClockMs + Phaser.Math.Between(450, 900);
    lair.activeMonsterIds = [...new Set([...(lair.activeMonsterIds || []), actor.id])].slice(-lair.activeMonsterCap);
    lair.nextSpawnDay = this.day + getSpawnIntervalDays(lair);
    lair.threatBudget = Phaser.Math.Clamp((lair.threatBudget || 0) + 2 + lair.level, 0, 100);
    lair.pressure = Phaser.Math.Clamp((lair.pressure ?? lair.threatBudget) + 2 + lair.level, 0, 100);
    lair.pressureState = getLairPressureState(lair, this.day).id;
    this.stats.monsterAttacks = (this.stats.monsterAttacks || 0) + 1;
    this.monsterState.lastAttackDay = this.day;
    this.monsterState.weekAttackCount = (this.monsterState.weekAttackCount || 0) + 1;
    const text = `${monster.name} emerged from ${lair.name}. ${getSatireLine('monster', monster.id, 'sighting', { day: this.day, fallback: monster.flavour })}`;
    this.addTownLog(text, 'monster');
    this.addReportLine('monsters', text);
    this.game.events.emit('gwg-event', text);
    return actor;
  }

  getMonsterSpawnSpot(target) {
    if (this.isBuilderCity && this.gridCells) {
      const frontier = this.getFogFrontierCells(true);
      if (frontier.length) {
        const sorted = frontier
          .map((cell) => {
            const world = this.gridTileVisualCenter(cell.x, cell.y);
            return {
              x: world.x,
              y: world.y,
              dist: Phaser.Math.Distance.Between(world.x, world.y, target.x, target.y),
            };
          })
          .sort((a, b) => b.dist - a.dist);
        return sorted[Math.floor(Math.random() * Math.min(8, sorted.length))] || sorted[0];
      }
    }
    const side = Phaser.Math.Between(0, 3);
    if (side === 0) return { x: 38, y: Phaser.Math.Between(110, this.worldHeight - 120) };
    if (side === 1) return { x: this.worldWidth - 38, y: Phaser.Math.Between(110, this.worldHeight - 120) };
    if (side === 2) return { x: Phaser.Math.Between(110, this.worldWidth - 120), y: 72 };
    return { x: Phaser.Math.Between(110, this.worldWidth - 120), y: this.worldHeight - 72 };
  }

  getMonsterTarget(monster) {
    const prefer = monster?.targetPreference || 'random_building';
    const candidates = [];
    const addPlace = (id) => {
      const place = this.getOperationalPlace(id);
      if (place?.isPlaced !== false) candidates.push(place);
    };
    if (prefer === 'hero') {
      const hero = Phaser.Utils.Array.GetRandom(this.getActiveHeroes());
      if (hero) return { id: hero.def.id, name: hero.def.name, x: hero.container.x, y: hero.container.y, h: 42, heroTarget: hero };
    } else if (prefer === 'random_road' && this.cityState?.roads?.length) {
      const road = Phaser.Utils.Array.GetRandom(this.cityState.roads);
      const world = this.gridTileVisualCenter(road.x, road.y);
      return { id: `road-${road.x}-${road.y}`, name: 'town road', x: world.x, y: world.y, h: 28 };
    } else {
      const preferenceMap = {
        tavern: ['tavern', 'inn', 'hero_hostel'],
        market: ['market', 'gem_exchange', 'convenience_office'],
        whale: ['whale', 'vip_lounge', 'premium_temple'],
        watchtower: ['watchtower'],
        guildhall: ['guildhall', 'notice_board'],
        bank_debt_office: ['bank_debt_office', 'debt_collector_booth'],
        lootbox_kiosk: ['lootbox_kiosk', 'refund_denial_desk'],
        training: ['training', 'arena'],
        vip_rope_entrance: ['vip_rope_entrance', 'whale'],
      };
      for (const id of preferenceMap[prefer] || [prefer]) addPlace(id);
    }
    if (!candidates.length) {
      for (const place of Object.values(this.placeById || {})) {
        if (place?.mapPoint && !this.isRevealed(place.gridX, place.gridY)) continue;
        if (place?.isPlaced !== false && this.isLocationUnlocked(place.id) && place.id !== 'notice_board') candidates.push(place);
      }
    }
    return Phaser.Utils.Array.GetRandom(candidates) || this.getOperationalPlace('guildhall');
  }

  getMonsterResponders(target) {
    return this.getActiveHeroes()
      .filter((hero) => hero.state !== 'inside' && hero.state !== 'away')
      .map((hero) => ({
        hero,
        dist: Phaser.Math.Distance.Between(hero.container.x, hero.container.y, target.x, target.y),
      }))
      .sort((a, b) => a.dist - b.dist)
      .map((entry) => entry.hero)
      .slice(0, Phaser.Math.Between(1, 3));
  }

  getDefenseBonus() {
    const defenseDistrict = this.getActiveDistrictBonuses().some((bonus) => bonus.id === 'defense') ? 2 : 0;
    const towerSpec = this.getBuildingSpecialization('watchtower');
    const towerSpecBonus = towerSpec?.id === 'patrol_focus' ? 2 : 0;
    const barracks = this.getPlacedBuildingsByBaseId('guard_barracks')
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    const hunters = this.getPlacedBuildingsByBaseId('monster_hunter_lodge')
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    return this.getPlaceLevel(this.buildingById.watchtower) * 3
      + this.getPlaceLevel(this.buildingById.training)
      + this.getPlaceLevel(this.buildingById.arena) * 2
      + Math.floor(this.getPlaceLevel(this.buildingById.blacksmith) / 2)
      + defenseDistrict
      + towerSpecBonus
      + barracks * 2
      + hunters;
  }

  resolveMonsterAttack({ forced = false, chance = 0 } = {}) {
    const eligible = this.getEligibleMonsterLairs(forced);
    const lair = Phaser.Utils.Array.GetRandom(eligible);
    if (!lair) return false;
    const actor = this.spawnMonsterFromLair(lair, forced || chance > 0.28);
    if (actor && (forced || chance > 0.28)) {
      this.stats.threatEventsSurvived = (this.stats.threatEventsSurvived || 0) + 1;
    }
    return Boolean(actor);
    /* Legacy deterministic resolver retained below as reference for old balance
       values. Runtime attacks now resolve through persistent map actors. */
    const monster = rollMonster();
    const target = this.getMonsterTarget(monster);
    const spawn = this.getMonsterSpawnSpot(target);
    const warning = Phaser.Utils.Array.GetRandom(MONSTER_WARNING_LINES);
    const attackText = `${warning} ${monster.name} approached ${target.name}. ${getSatireLine('monster', monster.id, 'attack', { day: this.day, fallback: monster.flavour })}`;
    this.stats.monsterAttacks = (this.stats.monsterAttacks || 0) + 1;
    this.monsterState.lastAttackDay = this.day;
    this.monsterState.weekAttackCount = (this.monsterState.weekAttackCount || 0) + 1;
    this.addTownLog(attackText, 'monster');
    this.addReportLine('monsters', attackText);
    this.game.events.emit('gwg-event', attackText);
    this.floatText(target.x, target.y - (target.h || 42) - 40, 'MONSTER', '#f0938f');
    const monsterActor = this.spawnMonsterActor(monster, target, spawn);
    this.moveMonsterActor(monsterActor, target);

    const responders = this.getMonsterResponders(target);
    const defenseBonus = this.getDefenseBonus();
    let defeated = false;
    let winningHero = null;
    let remainingPower = Math.max(3, monster.power || monster.threat * 4);
    const deltas = { gold: 0, trust: 0, morale: 0, threat: 0, corruption: 0 };
    const stepLines = [];
    let responseIndex = 0;

    for (const hero of responders) {
      const tiredPenalty = hero.stats.morale < 30 ? 3 : 0;
      const premiumBonus = hero.stats.whaleAccess ? 3 : 0;
      const roll = Phaser.Math.Between(0, 8);
      const equipment = this.getHeroEquipmentBonus(hero);
      const score = hero.stats.power + equipment.power + Math.floor(equipment.readiness / 25) + Math.floor(defenseBonus / 2) + premiumBonus + roll - tiredPenalty;
      const wonThisRound = score >= remainingPower;
      stepLines.push(`${hero.def.name} intercepted ${monster.name}.`);
      this.addHeroHistory(hero, `Intercepted ${monster.name} near ${target.name}.`);
      const responseDelay = responseIndex * 620;
      responseIndex += 1;
      this.time.delayedCall(responseDelay, () => {
        this.walkTo(hero, {
          id: target.id,
          name: target.name,
          x: target.x,
          y: target.y,
          reason: `Intercepting ${monster.name}.`,
          risk: monster.threat >= 6 ? 'High' : monster.threat >= 3 ? 'Moderate' : 'Low',
          monster,
          intentAction: `Intercepting ${monster.name}`,
        }, () => {
          this.say(hero, wonThisRound ? 'Handled it.' : 'That had teeth.', true);
        });
      });
      if (wonThisRound) {
        defeated = true;
        winningHero = hero;
        const gold = Math.max(12, monster.reward || monster.threat * 18);
        deltas.gold += gold;
        deltas.threat += monster.threatImpact || -Math.max(2, monster.threat * 2);
        deltas.trust += this.isHonestHero(hero.def) ? 1 : 0;
        deltas.morale += 1;
        hero.stats.power += this.isHonestHero(hero.def) || this.isVeteranHero(hero.def) ? 1 : 0;
        hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + monster.threat * 3, 0, 100);
        this.addHeroHistory(hero, `Defeated ${monster.name}.`);
        stepLines.push(`${hero.def.name} defeated ${monster.name}. ${Phaser.Utils.Array.GetRandom(MONSTER_VICTORY_LINES)}`);
        this.stats.monsterVictories = (this.stats.monsterVictories || 0) + 1;
        if (this.isBuildingPlaced('watchtower')) {
          const runtime = this.getBuildingRuntime('watchtower');
          if (!runtime.closed) {
            runtime.monstersStopped = (runtime.monstersStopped || 0) + 1;
            runtime.upgradeProgress = Math.min(100, (runtime.upgradeProgress || 0) + 12);
          }
        }
        break;
      }
      remainingPower = Math.max(2, remainingPower - Math.max(1, Math.floor(score * 0.45)));
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - (5 + monster.threat), 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - 2, 0, 100);
      this.injureHero(hero, monster.threat >= 5 ? 3 : 2, monster.threat >= 5 ? 'badly injured' : 'injured', monster.name);
      stepLines.push(`${hero.def.name} was injured. The next hero checked the fine print.`);
    }

    if (!defeated) {
      const watchtowerLevel = this.getPlaceLevel(this.buildingById.watchtower);
      const mitigation = Phaser.Math.Clamp(1 - watchtowerLevel * 0.12, 0.45, 1);
      const loss = Math.ceil((45 + monster.threat * 28) * mitigation);
      deltas.gold -= Math.min(this.resources.gold, loss);
      deltas.trust -= Math.max(1, Math.floor(monster.threat / 2));
      deltas.morale -= 2 + monster.threat;
      deltas.threat += Math.max(2, Math.ceil(monster.threat / 2));
      if (monster.id === 'debt_wraith' || monster.id === 'audit_imp') deltas.corruption += 1;
      this.stats.monsterDamageEvents = (this.stats.monsterDamageEvents || 0) + 1;
      if (this.isBuildingPlaced('watchtower')) {
        const runtime = this.getBuildingRuntime('watchtower');
        if (!runtime.closed) runtime.upgradeProgress = Math.min(100, (runtime.upgradeProgress || 0) + 5);
      }
      stepLines.push(`${monster.name} damaged ${target.name}. ${Phaser.Utils.Array.GetRandom(MONSTER_DAMAGE_LINES)}`);
    }

    this.applyDeltas(deltas);
    this.floatDeltas(target.x, target.y - (target.h || 58) - 12, deltas);
    const summary = stepLines.join(' ');
    this.addTownLog(summary, defeated ? 'monster' : 'crisis');
    this.addReportLine('monsters', summary);
    this.game.events.emit('gwg-event', summary);
    if (!defeated) this.floatText(target.x, target.y - (target.h || 42) - 58, 'DAMAGED', '#e74c3c');
    else this.floatText(target.x, target.y - (target.h || 42) - 58, 'DEFENDED', '#7fdc93');
    if (forced || chance > 0.28) this.stats.threatEventsSurvived = (this.stats.threatEventsSurvived || 0) + 1;
    this.time.delayedCall(1800 + responseIndex * 620, () => {
      this.createMonsterAftermath(monster, target.x, target.y, defeated, winningHero);
      this.clearMonsterActor(monsterActor);
    });
    return true;
  }

  // --- ambient chatter -------------------------------------------------------

  pickHeroLine(hero, lines) {
    const options = (lines || []).filter(Boolean);
    if (options.length === 0) return '';
    hero.recentLines = Array.isArray(hero.recentLines) ? hero.recentLines : [];
    const fresh = options.filter((line) => !hero.recentLines.includes(line));
    const line = Phaser.Utils.Array.GetRandom(fresh.length ? fresh : options);
    hero.recentLines.push(line);
    hero.recentLines = hero.recentLines.slice(-6);
    return line;
  }

  startIdleChatter() {
    const chatter = () => {
      const candidates = this.heroes.filter((h) => (
        (h.state === 'idle' || h.state === 'walking') && !h.bubble
      ));
      if (
        candidates.length > 0
        && !this.cycleRunning
        && this.activeBubbles < (this.rsp?.maxIdleBubbles ?? MAX_IDLE_BUBBLES)
        && this.time.now > this.importantChatterUntil
      ) {
        const hero = Phaser.Utils.Array.GetRandom(candidates);
        const lines = [
          ...(IDLE_QUIPS[hero.def.personality] || []),
          ...(hero.def.idleLines || []),
          ...(this.resources.corruption > 45 ? RNGEESUS_LINES : []),
          ...(this.resources.threat > 55 ? EXPLORATION_LINES : []),
        ];
        const line = this.pickHeroLine(hero, lines);
        if (line) this.say(hero, line);
      }
      this.time.delayedCall(Phaser.Math.Between(8000, 25000), chatter);
    };
    this.time.delayedCall(2600, chatter);
  }

  setSimulationSpeed(value) {
    const speed = Number(value);
    if (![0, 1, 2, 4].includes(speed)) return;
    this.simulationSpeed = speed;
    this.cityState.simulation.speed = speed;
    this.registry.set('simulationSpeed', speed);
    this.game.events.emit('gwg-time-changed', speed);
    this.game.events.emit(
      'gwg-event',
      speed === 0 ? 'Town paused. Even corruption must wait.' : `Town clock set to ${speed}x.`,
    );
    this.saveGame(false);
  }

  update(_time, delta = 16) {
    const cam = this.cameras.main;
    const speed = 6;
    const left = this.cursors?.left?.isDown || this.wasd?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasd?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.wasd?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.wasd?.S?.isDown;
    // camera bounds clamp the result; scale by zoom so panning feels constant
    if (left) cam.scrollX -= speed / cam.zoom;
    if (right) cam.scrollX += speed / cam.zoom;
    if (up) cam.scrollY -= speed / cam.zoom;
    if (down) cam.scrollY += speed / cam.zoom;
    if (left || right || up || down) this.clampCameraToWorld();

    // depth-sort heroes by their feet; talking heroes pop above rooftops
    for (const hero of this.heroes) {
      hero.container.setDepth(hero.container.y + (hero.bubble ? 800 : 0));
    }
    this.updateSelectedHeroIntentLine();
    for (const actor of this.activeMonsterActors || []) {
      if (actor?.container?.active) actor.container.setDepth(actor.container.y + 75);
    }
    for (const bundle of Object.values(this.aftermathDropObjectsById || {})) {
      if (bundle?.container?.active) bundle.container.setDepth(bundle.container.y + 64);
    }
    this.updateWorldDanger(delta);
    this.monsterVisibilityElapsedMs = (this.monsterVisibilityElapsedMs || 0) + delta;
    if (this.monsterVisibilityElapsedMs >= 400) {
      this.monsterVisibilityElapsedMs = 0;
      this.updateMonsterActorVisibility();
    }

    this.heroRosterElapsedMs = (this.heroRosterElapsedMs || 0) + delta;
    if (this.heroRosterElapsedMs >= 1000) {
      this.heroRosterElapsedMs = 0;
      for (const hero of this.heroes || []) this.refreshHeroIntentRing(hero);
      this.publishHeroRoster();
    }

    if (!this.cycleRunning && this.simulationSpeed > 0 && !this.buildMode) {
      this.simulationElapsedMs += delta * this.simulationSpeed;
      this.cityState.simulation.elapsedMs = this.simulationElapsedMs;
      if (this.simulationElapsedMs >= SIMULATION_DAY_MS) {
        this.simulationElapsedMs %= SIMULATION_DAY_MS;
        this.runCycle();
      }
    }
  }

  // --- daily simulation ----------------------------------------------------

  applyDeltas(deltas) {
    const R = this.resources;
    for (const [key, value] of Object.entries(deltas)) {
      R[key] += value;
      if (key === 'gold' && value > 0 && this.stats) this.stats.totalGoldEarned += value;
      if (key === 'corruption' && value > 0 && this.stats) this.stats.corruptionEvents = (this.stats.corruptionEvents || 0) + 1;
    }
    for (const key of ['trust', 'corruption', 'morale', 'threat']) {
      R[key] = Phaser.Math.Clamp(R[key], 0, 100);
    }
    R.gold = Math.max(0, R.gold);
    this.registry.set('resources', { ...R });
    if (this.activeInspector) this.refreshActivePanel();
    this.checkUnlocks();
    this.publishTownHint();
    if (!this.checkingObjectives) this.checkObjectives();
  }

  triggerWhaleReaction() {
    const candidates = this.heroes.filter((h) => h.state !== 'inside' && !h.bubble);
    if (candidates.length === 0) return;
    const hero = Phaser.Utils.Array.GetRandom(candidates);
    const lines = [
      ...(hero.def.reactionLines || []),
      ...(WHALE_REACTIONS[hero.def.personality] || []),
    ];
    if (lines.length > 0) {
      this.say(hero, this.pickHeroLine(hero, lines), true);
    }
  }

  maybeBlockPoorHero() {
    if (Math.random() > 0.55) return;
    const ropeSpot = this.doorById.vip_rope_entrance || this.doorById.whale;
    const candidates = this.heroes.filter((h) => (
      h.state !== 'inside'
      && h.def.personality !== 'Noble Whale'
      && (h.stats.gold < 500 || h.def.personality !== 'Sponsored Hero')
    ));
    if (!ropeSpot || candidates.length === 0) return;

    const hero = Phaser.Utils.Array.GetRandom(candidates);
    this.walkTo(hero, ropeSpot, () => {
      this.say(hero, this.pickHeroLine(hero, [...DENIED_LINES, ...QUEUE_LINES]), true);
      this.floatText(ropeSpot.x, ropeSpot.y - 38, 'VIPs ONLY', '#e74c3c');
      this.scheduleAmbient(hero, Phaser.Math.Between(2000, 4200));
    });
  }

  // heroes the player can send on a posted quest, best odds first
  getQuestCandidates(quest, limit = 3) {
    return this.getActiveHeroes()
      .filter((hero) => hero.state !== 'away' && !this.isHeroInjured(hero))
      .filter((hero) => !this.postedQuests.some((posted) => (
        posted.assignedHeroId === hero.def.id && posted.noticeId !== quest.noticeId
      )))
      .map((hero) => ({
        hero,
        chance: Math.round(this.getQuestSuccessChance(hero, quest)),
      }))
      .sort((a, b) => b.chance - a.chance)
      .slice(0, limit);
  }

  getQuestAvailabilityLines(quest) {
    const active = this.getActiveHeroes();
    const injured = active.filter((hero) => this.isHeroInjured(hero)).length;
    const away = active.filter((hero) => hero.state === 'away').length;
    const assignedElsewhere = active.filter((hero) => this.postedQuests.some((posted) => (
      posted.assignedHeroId === hero.def.id && posted.noticeId !== quest.noticeId
    ))).length;
    const lines = [];
    if (injured > 0) lines.push({ text: `${injured} hero${injured === 1 ? '' : 'es'} injured and unavailable.`, className: 'gwg-muted' });
    if (away > 0) lines.push({ text: `${away} hero${away === 1 ? ' is' : 'es are'} away from town.`, className: 'gwg-muted' });
    if (assignedElsewhere > 0) lines.push({ text: `${assignedElsewhere} hero${assignedElsewhere === 1 ? '' : 'es'} already assigned elsewhere.`, className: 'gwg-muted' });
    return lines.slice(0, 2);
  }

  // player assignment: 'noticeId:heroId' from the quest board panel
  assignQuestHeroFromUi(token) {
    const [noticeId, heroId] = String(token || '').split(':');
    const quest = this.postedQuests.find((posted) => posted.noticeId === noticeId);
    const hero = this.heroes?.find((item) => item.def.id === heroId && item.stats.active !== false);
    if (!quest || !hero) return;
    if (quest.assignedHeroId) {
      this.game.events.emit('gwg-event', 'That quest already has a volunteer. Heroism is not a queue... usually.');
      return;
    }
    quest.assignedHeroId = hero.def.id;
    const assignedParty = this.getPartyForHero(hero);
    if (assignedParty) {
      quest.partyId = assignedParty.id;
      assignedParty.currentAssignment = { type: 'quest', id: quest.noticeId, name: quest.name, day: this.day };
      for (const memberId of assignedParty.memberIds) {
        const member = this.getHeroById(memberId);
        if (!member || member === hero || member.stats.active === false || this.isHeroInjured(member)) continue;
        member.currentAction = `Preparing with ${assignedParty.name}: ${quest.name}`;
        member.intent = { action: member.currentAction, destinationId: 'dungeon', destinationName: quest.name, reason: 'Persistent party assignment.', risk: quest.risk >= 3 ? 'High' : 'Medium' };
      }
    }
    this.availableQuests = this.availableQuests.map((item) => (
      item.noticeId === quest.noticeId ? quest : item
    ));
    hero.currentAction = `Preparing: ${quest.name}`;
    hero.intent = {
      action: hero.currentAction,
      destinationId: 'dungeon',
      destinationName: quest.name,
      reason: 'Assigned to a posted quest by the guild.',
      risk: quest.risk >= 3 ? 'High' : 'Medium',
    };
    const board = this.doorById.notice_board || this.doorById.guildhall;
    if (board && hero.state !== 'away') {
      this.walkTo(hero, {
        ...board,
        intentAction: `Assigned to quest: ${quest.name}`,
        reason: 'Reporting to the quest board before departure.',
        risk: quest.risk >= 3 ? 'High' : 'Medium',
      }, () => {
        this.say(hero, 'Signed. Regret pending.', true);
        this.scheduleAmbient(hero, Phaser.Math.Between(2500, 5000));
      });
    }
    const text = `${hero.def.name} volunteered for ${quest.name} (${Math.round(this.getQuestSuccessChance(hero, quest))}% odds).`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'quest');
    this.stats.questsAssigned = (this.stats.questsAssigned || 0) + 1;
    this.checkObjectives();
    this.publishTownHint();
    this.saveGame(false);
    if (this.activeInspector?.type === 'quests') this.showQuestInspector();
  }

  pickQuestHero(quest) {
    const active = this.getActiveHeroes();
    if (active.length === 0) return null;

    // player-assigned hero always takes the quest, with prepared-hero bonus
    if (quest.assignedHeroId) {
      const assigned = active.find((hero) => hero.def.id === quest.assignedHeroId);
      if (assigned) return assigned;
    }

    const preferred = active.filter((hero) => quest.preferred.includes(hero.def.personality));
    if (preferred.length > 0) return Phaser.Utils.Array.GetRandom(preferred);

    if (quest.type === 'fair') {
      const honest = active.filter((hero) => this.isHonestHero(hero.def));
      if (honest.length > 0) return Phaser.Utils.Array.GetRandom(honest);
    }
    if (quest.type === 'sponsored' || quest.type === 'shady') {
      const whales = active.filter((hero) => this.isWhaleHero(hero.def));
      if (whales.length > 0) return Phaser.Utils.Array.GetRandom(whales);
    }
    if (quest.type === 'trust') {
      const veterans = active.filter((hero) => this.isVeteranHero(hero.def));
      if (veterans.length > 0) return Phaser.Utils.Array.GetRandom(veterans);
    }
    return Phaser.Utils.Array.GetRandom(active);
  }

  getQuestSuccessChance(hero, quest) {
    const R = this.resources;
    const blacksmith = this.getPlaceLevel(this.buildingById.blacksmith);
    const training = this.getPlaceLevel(this.buildingById.training);
    const guildhall = this.getPlaceLevel(this.buildingById.guildhall);
    const whale = this.getPlaceLevel(this.buildingById.whale);
    const potion = this.getPlaceLevel(this.buildingById.potion_shop);
    const mentor = this.getPlaceLevel(this.buildingById.mentor_hall);
    const arena = this.getPlaceLevel(this.buildingById.arena);
    const honestBonus = this.isHonestHero(hero.def) ? training * 4 + mentor * 4 : 0;
    const whaleBonus = this.isWhaleHero(hero.def) ? whale * 6 : 0;
    const corruptionBias = quest.type === 'fair' ? -R.corruption * 0.08 : R.corruption * 0.06;
    // a hero who volunteered ahead of time goes in prepared
    const assignedBonus = quest.assignedHeroId === hero.def.id ? 8 : 0;
    const party = quest.partyId ? this.heroSocial.parties?.[quest.partyId] : this.getPartyForHero(hero);
    const partyBonus = party ? getPartyBonus(this.refreshPartyCohesion(party) && party).quest : 0;

    return Phaser.Math.Clamp(
      34
      + assignedBonus
      + partyBonus
      + hero.stats.power * 4
      + this.getHeroEquipmentBonus(hero).power * 3
      + this.getHeroEquipmentBonus(hero).readiness * 0.08
      + R.morale * 0.22
      + R.trust * 0.12
      + blacksmith * 5
      + guildhall * 4
      + potion * 3
      + arena * 4
      + honestBonus
      + whaleBonus
      + corruptionBias
      - quest.difficulty * 12
      - Math.max(0, R.threat - 50) * 0.18,
      12,
      92,
    );
  }

  resolvePostedQuest(quest) {
    const hero = this.pickQuestHero(quest);
    const dungeon = this.buildingById.dungeon;
    const spotId = quest.type === 'trust' ? 'complaint_barrel' : 'dungeon';
    const place = this.placeById[spotId] || dungeon;
    const spot = this.doorById[spotId] || this.doorById.dungeon;

    if (!hero) {
      const d = { gold: -Math.ceil(quest.cost / 2), threat: quest.difficulty * 2, morale: -2 };
      this.applyDeltas(d);
      this.floatDeltas(place.x, place.y - (place.h || 58) - 10, d);
      const text = `${quest.name} expired. Nobody volunteered, which is technically feedback.`;
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'quest');
      this.addReportLine('quests', text);
      return;
    }

    const chance = this.getQuestSuccessChance(hero, quest);
    const whaleSolve = this.isWhaleHero(hero.def) && Math.random() < 0.22 + this.getPlaceLevel(this.buildingById.whale) * 0.06;
    const success = whaleSolve || Math.random() * 100 <= chance;
    const guildBonus = this.getPlaceLevel(this.buildingById.guildhall) * 12;
    const dungeonBonus = this.getPlaceLevel(this.buildingById.dungeon) * 10;
    const heroRole = hero.stats.status || hero.def.personality;
    const party = quest.partyId ? this.heroSocial.parties?.[quest.partyId] : null;
    const partyMembers = party
      ? party.memberIds.map((id) => this.getHeroById(id)).filter((member) => member?.stats.active !== false && !member.stats.deathDay)
      : [hero];
    let text;
    let bubble;
    let deltas;

    if (whaleSolve) {
      const reward = quest.reward + guildBonus + dungeonBonus + this.getPlaceLevel(this.buildingById.whale) * 35;
      deltas = {
        gold: reward,
        trust: -Math.max(2, quest.difficulty),
        corruption: quest.difficulty + 3,
        morale: -Math.max(1, Math.floor(quest.risk / 2)),
        threat: -Math.max(2, Math.floor(quest.threatReduction / 2)),
      };
      text = `${hero.def.name} (${heroRole}) solved ${quest.name} by purchasing a better ending. +${2 + this.getPlaceLevel(this.buildingById.whale)} Power, +${Math.floor(quest.reward / 20)} Fame. ${quest.whale}`;
      bubble = 'Receipt victory.';
      hero.stats.spent += Math.ceil(reward / 4);
      hero.stats.power += 2 + this.getPlaceLevel(this.buildingById.whale);
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 3, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - 3, 0, 100);
      hero.stats.corruption = Phaser.Math.Clamp((hero.stats.corruption || 0) + quest.difficulty + 4, 0, 100);
      hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + quest.reward / 20, 0, 100);
      this.grantPremiumItem(
        hero,
        Phaser.Utils.Array.GetRandom(WHALE_PURCHASES),
        2 + this.getPlaceLevel(this.buildingById.whale),
      );
      this.addHeroHistory(hero, `Whale-cleared ${quest.name}.`);
      this.getHeroProfile(hero).career.quests += 1;
      this.stats.whaleEvents += 1;
      this.stats.whaleTrustLosses += Math.abs(deltas.trust || 0);
      this.burstCoins(44);
      this.buildRelationship(hero, 'whaleEvent');
    } else if (success) {
      const honest = this.isHonestHero(hero.def);
      deltas = {
        gold: quest.reward + guildBonus + dungeonBonus,
        trust: quest.trust + (honest ? 2 : 0),
        morale: quest.morale + 1,
        corruption: quest.corruption,
        threat: -quest.threatReduction,
      };
      text = `${hero.def.name} (${heroRole}) completed ${quest.name}${honest ? ' with honest effort' : ''}. ${honest ? '+1 Power, +Trust. ' : ''}${quest.success}`;
      bubble = honest ? 'Earned loot.' : quest.bubble;
      hero.stats.power += honest ? 1 : 0;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 8, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + (honest ? 5 : 2), 0, 100);
      hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + (honest ? 8 : 5), 0, 100);
      hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) - (honest ? 3 : 1), 0, 100);
      this.addHeroHistory(hero, `Completed ${quest.name}.`);
      for (const member of partyMembers) {
        const memberProfile = this.getHeroProfile(member);
        memberProfile.career.quests += 1;
        memberProfile.career.victories += 1;
        if (member !== hero) {
          member.stats.fame = Phaser.Math.Clamp((member.stats.fame || 0) + 3, 0, 100);
          this.addHeroHistory(member, `Completed ${quest.name} with ${party?.name || hero.def.name}.`);
        }
      }
      for (let i = 0; i < partyMembers.length; i += 1) {
        for (let j = i + 1; j < partyMembers.length; j += 1) {
          this.recordHeroRelationshipEvent(partyMembers[i], partyMembers[j], 'quest_success', { relatedId: quest.noticeId, location: quest.name, reciprocal: true });
        }
      }
      if (party) {
        party.victories += 1;
        party.reputation = Phaser.Math.Clamp((party.reputation || 0) + quest.difficulty * 3, 0, 100);
        party.history = [...party.history, `Day ${this.day}: completed ${quest.name}.`].slice(-16);
      }
      this.stats.questsCompleted += 1;
      if (honest) this.stats.honestQuestSuccesses += 1;
      // prepared expeditions also haul goods back to the town stores
      if (quest.assignedHeroId === hero.def.id) {
        const hauled = this.addTownResource('loot', Phaser.Math.Between(1, 2));
        if (hauled > 0) text += ` The expedition hauled ${hauled} loot into the town stores.`;
      }
    } else {
      deltas = {
        gold: Math.floor(quest.reward * 0.2),
        trust: -Math.max(1, Math.floor(quest.risk / 2)),
        morale: -quest.risk,
        corruption: quest.type === 'shady' ? 2 : 0,
        threat: quest.difficulty * 3,
      };
      const debtGain = quest.risk * 8;
      text = `${hero.def.name} (${heroRole}) failed ${quest.name} and gained ${debtGain} debt. ${quest.failure}`;
      bubble = 'This scaled badly.';
      const potionProtection = this.getPlaceLevel(this.buildingById.potion_shop) * 2;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - Math.max(2, quest.risk * 4 - potionProtection), 0, 100);
      hero.stats.debt += debtGain;
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - quest.risk, 0, 100);
      hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) + quest.risk * 4, 0, 100);
      this.addHeroHistory(hero, `Failed ${quest.name}.`);
      for (const member of partyMembers) {
        this.getHeroProfile(member).career.failures += 1;
        if (member !== hero) this.addHeroHistory(member, `Survived the failure of ${quest.name}.`);
      }
      for (let i = 0; i < partyMembers.length; i += 1) {
        for (let j = i + 1; j < partyMembers.length; j += 1) {
          this.recordHeroRelationshipEvent(partyMembers[i], partyMembers[j], 'quest_failure', { relatedId: quest.noticeId, location: quest.name, reciprocal: true });
        }
      }
      if (party) {
        party.failures += 1;
        party.history = [...party.history, `Day ${this.day}: failed ${quest.name}.`].slice(-16);
      }
      this.stats.questFailures = (this.stats.questFailures || 0) + 1;
    }

    this.applyDeltas(deltas);
    this.floatDeltas(place.x, place.y - (place.h || 58) - 10, deltas);
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'quest');
    this.addReportLine('quests', text);
    this.updateHeroMood(hero);
    this.evaluateHeroEvolution(hero);
    this.refreshHeroStatusMarker(hero);
    if (party) {
      party.currentAssignment = null;
      this.refreshPartyCohesion(party);
    }
    this.checkObjectives();
    this.checkUnlocks();
    this.walkTo(hero, spot, () => {
      this.say(hero, bubble, true);
      this.scheduleAmbient(hero, Phaser.Math.Between(2500, 5200));
    });
  }

  sendHeroAway(hero, cycles = 2) {
    this.interruptHero(hero);
    hero.awayUntil = this.day + cycles;
    hero.state = 'away';
    hero.currentAction = `Away until Day ${hero.awayUntil}`;
    hero.container.setAlpha(0.28);
    hero.stats.loyalty = Math.max(0, hero.stats.loyalty - 18);
    hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) + 12, 0, 100);
    this.stats.heroesLeft = (this.stats.heroesLeft || 0) + 1;
    this.addHeroHistory(hero, `Left town until Day ${hero.awayUntil}.`);
    this.updateHeroMood(hero);
    this.refreshHeroStatusMarker(hero);
    this.floatText(hero.container.x, hero.container.y - 36, 'LEFT TOWN', '#f0938f');
  }

  grantCatalogItem(hero, itemDef, powerOverride = null) {
    if (!hero?.stats || !itemDef) return null;
    hero.stats.inventory = Array.isArray(hero.stats.inventory) ? hero.stats.inventory : [];
    const item = {
      id: `${hero.def.id}-${this.day}-${Math.floor(Math.random() * 100000)}`,
      catalogId: itemDef.id,
      assetKey: itemDef.assetKey,
      name: itemDef.name,
      rarity: itemDef.rarity,
      type: itemDef.type,
      powerBonus: powerOverride ?? itemDef.powerBonus,
      moraleEffect: itemDef.moraleEffect || 0,
      debtEffect: itemDef.debtEffect || 0,
      corruptionEffect: itemDef.corruptionEffect || 0,
      premiumSource: Boolean(itemDef.premiumSource),
      envyValue: itemDef.envyValue,
      canBeStolen: itemDef.canBeStolen,
      destroyChance: itemDef.destroyChance,
      ownerId: hero.def.id,
    };
    hero.stats.inventory.unshift(item);
    hero.stats.inventory = hero.stats.inventory.slice(0, 3);
    return item;
  }

  grantPremiumItem(hero, name, powerBonus = 2) {
    const itemDef = getItemByName(name) || getRandomPremiumItem();
    return this.grantCatalogItem(hero, itemDef, powerBonus);
  }

  maybeResolveItemConflict() {
    const jealous = this.getActiveHeroes().filter((hero) => (
      (hero.stats.envy || 0) >= 70
      && hero.stats.resentmentTargetId
    ));
    if (!jealous.length || Math.random() > 0.1) return;
    const instigator = Phaser.Utils.Array.GetRandom(jealous);
    const target = this.heroes.find((hero) => hero.def.id === instigator.stats.resentmentTargetId);
    const premiumItems = target?.stats?.inventory?.filter((item) => item.premiumSource && item.canBeStolen !== false) || [];
    if (!target || !premiumItems.length) return;
    const item = Phaser.Utils.Array.GetRandom(premiumItems);
    target.stats.inventory = target.stats.inventory.filter((owned) => owned.id !== item.id);
    let text;
    if (Math.random() < 0.5) {
      item.ownerId = instigator.def.id;
      instigator.stats.inventory = [item, ...(instigator.stats.inventory || [])].slice(0, 3);
      instigator.stats.power += item.powerBonus || 0;
      text = `${item.name} changed hands under mysterious balance conditions.`;
    } else {
      text = `${item.name} was destroyed in an argument about merit.`;
    }
    target.stats.morale = Math.max(0, target.stats.morale - 10);
    instigator.stats.envy = Math.max(0, instigator.stats.envy - 28);
    this.applyDeltas({ trust: -3, corruption: 1, morale: -2 });
    this.addHeroHistory(instigator, text);
    this.addHeroHistory(target, `Lost ${item.name} during emergent gameplay.`);
    this.recordHeroRelationshipEvent(target, instigator, 'loot_stolen', {
      text: `${instigator.def.name} took or destroyed ${item.name}.`,
      location: 'town',
      severity: 5,
    });
    const sharedParty = this.getPartyForHero(instigator);
    if (sharedParty && sharedParty.id === this.getPartyForHero(target)?.id) {
      sharedParty.history = [...sharedParty.history, `Day ${this.day}: ${item.name} caused a loot dispute.`].slice(-16);
      this.refreshPartyCohesion(sharedParty);
    }
    this.game.events.emit('gwg-event', `${text} The guild called it emergent gameplay.`);
    this.addTownLog(text, 'npc');
    this.floatText(instigator.container.x, instigator.container.y - 44, 'ITEM CONFLICT', '#f0938f');
  }

  getExplorationSpot(hero) {
    if (!this.isBuilderCity) {
      const gate = this.doorById.dungeon || { x: PLAZA.x + 120, y: PLAZA.y - 90 };
      return { id: 'wilderness', name: 'Wilderness', x: gate.x + 120, y: Math.max(90, gate.y - 80), h: 40 };
    }
    // heroes walk to the fog frontier: a revealed tile that borders fog, so
    // exploration visibly pushes the map outward
    const frontier = this.getFogFrontierCells(true);
    if (frontier.length) {
      const pick = frontier[(this.day * 7 + hero.def.id.length * 13 + hero.def.name.length) % frontier.length];
      const world = this.gridTileVisualCenter(pick.x, pick.y);
      return {
        id: `wilderness-${hero.def.id}`,
        areaId: `frontier-${pick.x}-${pick.y}`,
        name: 'Fog Frontier',
        x: world.x,
        y: world.y,
        h: 40,
        explore: true,
        reason: 'Exploring fog edge to reveal buildable land.',
        risk: this.resources.threat > 65 ? 'High' : this.resources.threat > 38 ? 'Moderate' : 'Low',
      };
    }
    // fully charted map: fall back to a spot beyond the founding district
    const west = GRID_CONFIG.zones.west;
    const edgeX = Math.min(GRID_CONFIG.columns - 2, west.maxX + 3 + ((this.day + hero.def.id.length) % 6));
    const edgeY = Phaser.Math.Clamp(
      west.minY + 2 + ((this.day * 3 + hero.def.name.length) % Math.max(1, west.maxY - west.minY - 2)),
      1,
      GRID_CONFIG.rows - 2,
    );
    const world = this.gridTileVisualCenter(edgeX, edgeY);
    return {
      id: `wilderness-${hero.def.id}`,
      areaId: `wilderness-${edgeX}-${edgeY}`,
      name: 'Wilderness Edge',
      x: world.x,
      y: world.y,
      h: 40,
      explore: true,
      reason: 'Scouting the edge of the known world.',
      risk: this.resources.threat > 65 ? 'High' : this.resources.threat > 38 ? 'Moderate' : 'Low',
    };
  }

  // --- town economy: stores, lodging, services (townEconomy.js) --------------

  addTownResource(id, amount, source = '') {
    if (!this.townInventory || !Number.isFinite(amount) || amount === 0) return 0;
    const before = this.townInventory[id] || 0;
    const cap = this.getStorageCap(id);
    this.townInventory[id] = Phaser.Math.Clamp(before + amount, 0, cap);
    const gained = this.townInventory[id] - before;
    if (gained > 0 && source) {
      this.addTownLog(`${source} added ${gained} ${id} to the town stores.`, 'economy');
    }
    return gained;
  }

  // Raw and finished goods use different storage networks. Old saves without
  // Warehouses retain a modest finished-goods buffer instead of losing stock.
  getStorageCap(id) {
    const processed = PROCESSED_RESOURCES.includes(id);
    if (!STORED_RESOURCES.includes(id) && !processed) return 99;
    let cap = processed ? 18 : BASE_STORAGE_CAP;
    for (const placement of this.cityState.placedBuildings) {
      const baseId = getBaseBuildingId(placement.id);
      if (baseId !== 'storehouse' && baseId !== 'warehouse') continue;
      const runtime = this.getBuildingRuntime(placement.id);
      if (runtime.closed) continue;
      const level = Math.max(1, this.getPlaceLevel(this.buildingById[placement.id]));
      if (processed && baseId === 'warehouse') cap += 35 * level;
      else if (processed && baseId === 'storehouse') cap += 8 * level;
      else if (!processed && baseId === 'storehouse') cap += STOREHOUSE_CAP_PER_LEVEL * level;
      else if (!processed && baseId === 'warehouse') cap += 10 * level;
    }
    return cap;
  }

  isResourceStorageFull(id) {
    return (this.townInventory?.[id] || 0) >= this.getStorageCap(id);
  }

  getStorageReport() {
    return RESOURCE_CATALOG.map(({ id }) => ({
      id,
      current: this.townInventory?.[id] || 0,
      cap: this.getStorageCap(id),
      incoming: this.getIncomingDeliveries(id),
    }));
  }

  getIncomingDeliveries(id) {
    return (this.carriers || [])
      .filter((carrier) => carrier.container?.active && carrier.resource === id)
      .reduce((sum, carrier) => sum + (carrier.assignedCargo || carrier.cargo || 0), 0);
  }

  // total daily extraction rate into stores for one resource, across all nodes
  getResourceProductionRate(id) {
    let rate = 0;
    for (const place of Object.values(this.explorationPointById || {})) {
      if (!this.isResourceNode(place)) continue;
      const node = this.getResourceNode(place.id);
      if (node.resource !== id) continue;
      rate += this.getNodeExtractionRate(place, node);
    }
    return rate;
  }

  // --- resource nodes: ownership, survey, access ----------------------------

  hydrateResourceNodes(saved) {
    const nodes = {};
    for (const [poiId, yieldConfig] of Object.entries(POI_RESOURCE_YIELDS)) {
      nodes[poiId] = normalizeNodeRuntime(saved?.[poiId], yieldConfig.resource, Boolean(yieldConfig.premium));
    }
    return nodes;
  }

  isResourceNode(place) {
    return Boolean(place?.id && POI_RESOURCE_YIELDS[place.id]);
  }

  getResourceNode(poiId) {
    if (!POI_RESOURCE_YIELDS[poiId]) return null;
    if (!this.resourceNodes[poiId]) {
      const yieldConfig = POI_RESOURCE_YIELDS[poiId];
      this.resourceNodes[poiId] = normalizeNodeRuntime(null, yieldConfig.resource, Boolean(yieldConfig.premium));
    }
    return this.resourceNodes[poiId];
  }

  getNodeDistanceTiles(place) {
    const core = this.getTownCoreCenter();
    return Math.round(Math.hypot((place.gridX || 0) - core.x, (place.gridY || 0) - core.y));
  }

  // a node has access if a road tile is within 3, or a camp/outpost is within
  // extraction range — access makes extraction faster and safer
  nodeHasRoadAccess(place) {
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (this.gridCells.get(gridKey((place.gridX || 0) + dx, (place.gridY || 0) + dy))?.road) return true;
      }
    }
    return false;
  }

  getCampsNearNode(place) {
    const nx = place.gridX || 0;
    const ny = place.gridY || 0;
    const resource = POI_RESOURCE_YIELDS[place.id]?.resource;
    return this.cityState.placedBuildings.filter((placement) => {
      const config = EXTRACTION_BUILDINGS[getBaseBuildingId(placement.id)];
      const accepted = config?.accepts || [config?.resource];
      if (!config || !accepted.includes(resource)) return false;
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      const cx = placement.gridX + footprint.w / 2;
      const cy = placement.gridY + footprint.h / 2;
      return Math.hypot(cx - nx, cy - ny) <= EXTRACTION_RANGE_TILES;
    });
  }

  surveyNode(poiId) {
    const place = this.explorationPointById?.[poiId];
    const node = this.getResourceNode(poiId);
    if (!place || !node) return;
    node.surveyed = true;
    this.stats.resourceNodesSurveyed = (this.stats.resourceNodesSurveyed || 0) + 1;
    const text = `Surveyed the ${place.name}: about ${node.amount} ${node.resource} left, danger ${node.danger}, ${this.getNodeDistanceTiles(place)} tiles out.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.checkObjectives();
    this.saveGame(false);
    if (this.activeInspector?.type === 'place') this.showPlaceInspector(place);
  }

  establishNodeAccess(poiId) {
    const place = this.explorationPointById?.[poiId];
    const node = this.getResourceNode(poiId);
    if (!place || !node) return;
    const hasRoad = this.nodeHasRoadAccess(place);
    const hasCamp = this.getCampsNearNode(place).length > 0;
    if (!hasRoad && !hasCamp) {
      this.game.events.emit('gwg-event', 'No access yet. Run a road toward the node or build a Frontier Outpost/camp nearby first.');
      return;
    }
    node.accessEstablished = true;
    node.danger = Math.max(5, node.danger - 15);
    const text = `Access established to the ${place.name}. Extraction is faster and less likely to eat a gatherer.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
    if (this.activeInspector?.type === 'place') this.showPlaceInspector(place);
  }

  assignNodeGatherer(poiId) {
    const place = this.explorationPointById?.[poiId];
    const node = this.getResourceNode(poiId);
    if (!place || !node) return;
    const camp = this.getCampsNearNode(place)
      .map((placement) => this.buildingById?.[placement.id])
      .find((candidate) => candidate && !this.getExtractionRuntime(candidate)?.assignedHeroId);
    if (camp) {
      this.assignExtractionWorkerFromUi(camp.id);
      return;
    }
    const hero = this.getActiveHeroes()
      .filter((item) => item.state !== 'away' && !this.isHeroInjured(item) && !item.stats.gatheringNodeId)
      .sort((a, b) => (b.stats.power || 0) - (a.stats.power || 0))[0];
    if (!hero) {
      this.game.events.emit('gwg-event', 'No free healthy hero to assign as gatherer.');
      return;
    }
    node.gathererId = hero.def.id;
    hero.stats.gatheringNodeId = poiId;
    this.interruptHero(hero);
    this.walkTo(hero, {
      ...place,
      intentAction: `Surveying ${place.name}`,
      reason: 'Temporary field assignment; establish a camp for continuous extraction.',
      risk: node.danger >= 45 ? 'High' : 'Moderate',
    }, () => {
      hero.state = 'working';
      hero.currentAction = `Assigned at ${place.name}; waiting for camp`;
      this.setHeroAnimationState(hero, 'interact');
    });
    const text = `${hero.def.name} assigned to ${place.name}. Build a matching camp for continuous packaged extraction.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
    if (this.activeInspector?.type === 'place') this.showPlaceInspector(place);
  }

  abandonNode(poiId) {
    const node = this.getResourceNode(poiId);
    if (!node) return;
    if (node.gathererId) {
      const hero = this.heroes?.find((item) => item.def.id === node.gathererId);
      if (hero) {
        hero.stats.gatheringNodeId = null;
        this.interruptHero(hero);
        this.scheduleAmbient(hero, Phaser.Math.Between(900, 2200));
      }
    }
    if (node.assignedCampId) {
      const extraction = this.getExtractionRuntime(node.assignedCampId);
      if (extraction) {
        extraction.nodeId = null;
        extraction.lastStatus = 'Idle: operation abandoned';
      }
    }
    node.gathererId = null;
    node.assignedCampId = null;
    node.accessEstablished = false;
    this.game.events.emit('gwg-event', 'Node abandoned. The wilderness resumes ownership immediately.');
    this.saveGame(false);
    const place = this.explorationPointById?.[poiId];
    if (place && this.activeInspector?.type === 'place') this.showPlaceInspector(place);
  }

  // node ownership actions for the POI inspector
  getResourceNodeActions(place, node) {
    const actions = [];
    if (!node.surveyed) {
      actions.push({ label: 'Survey Node', event: 'gwg-node-survey', id: place.id });
    }
    if (!node.accessEstablished) {
      actions.push({ label: 'Establish Access', event: 'gwg-node-access', id: place.id });
    }
    const campId = this.getCampTypeForNode(node);
    const camps = this.getCampsNearNode(place);
    actions.push({
      label: camps.length ? `${camps.length} Camp${camps.length === 1 ? '' : 's'} Established` : `Establish ${getBuildingCatalogEntry(campId)?.name || 'Camp'}`,
      event: 'gwg-node-camp',
      id: place.id,
      disabled: camps.length > 0,
    });
    if (!node.gathererId) {
      actions.push({ label: 'Assign Hero', event: 'gwg-node-gatherer', id: place.id });
    } else {
      actions.push({ label: 'Abandon Operation', event: 'gwg-node-abandon', id: place.id });
    }
    return actions;
  }

  getCampTypeForNode(node) {
    if (node?.resource === 'wood') return 'lumber_camp';
    if (node?.resource === 'iron') return 'mining_camp';
    if (node?.resource === 'herbs') return 'herbalist_hut';
    return 'salvage_camp';
  }

  startNodeCampPlacement(poiId) {
    const place = this.explorationPointById?.[poiId];
    const node = this.getResourceNode(poiId);
    if (!place || !node) return;
    const campId = this.getCampTypeForNode(node);
    this.buildMenuCategory = 'frontier';
    this.buildMenuSelectedItemId = campId;
    this.enterBuildMode('building', campId);
    this.game.events.emit('gwg-event', `${getBuildingCatalogEntry(campId)?.name || 'Extraction camp'} selected for ${place.name}. Green is efficient; amber works badly; red is municipal fiction.`);
  }

  getResourceNodeStatusLines(place, node) {
    const campPlacements = this.getCampsNearNode(place);
    const camps = campPlacements.length;
    const assignedCamp = node.assignedCampId ? this.buildingById?.[node.assignedCampId] : this.buildingById?.[campPlacements[0]?.id];
    const extraction = assignedCamp ? this.getExtractionRuntime(assignedCamp) : null;
    const gatherer = node.gathererId
      ? (this.heroes?.find((h) => h.def.id === node.gathererId)?.def.name || 'a hero')
      : 'none';
    const rate = this.getNodeExtractionRate(place, node);
    const depleted = node.amount <= 0;
    const storage = this.getNearestStorehouse(place.gridX || 0, place.gridY || 0);
    const areaRep = this.getAreaReputation(this.getAreaIdForPlace(place));
    return [
      `Resource: ${RESOURCE_BY_ID[node.resource]?.label || node.resource} - discovered`,
      node.surveyed
        ? `Available: ${node.amount}/${node.maxAmount} ${node.resource}${depleted ? ' (depleted, regrowing)' : ''}.`
        : 'Available: unknown until surveyed.',
      `Regeneration: ${node.regenPerDay > 0 ? `${node.regenPerDay}/day` : 'none; finite salvage'}.`,
      `Danger: ${node.danger}/100 - area reputation ${areaRep}/100.`,
      `Distance: ${this.getNodeDistanceTiles(place)} tiles from town core.`,
      {
        text: `Access: ${node.accessEstablished ? 'established' : this.nodeHasRoadAccess(place) ? 'road nearby (not yet claimed)' : 'none - slow and dangerous'}.`,
        className: node.accessEstablished ? 'gwg-good' : (this.nodeHasRoadAccess(place) ? '' : 'gwg-bad'),
      },
      `Extraction camps in range: ${camps}${camps ? '' : ' - build a matching camp within 16 tiles.'}`,
      `Assigned site: ${assignedCamp?.name || 'none'}.`,
      `Assigned gatherer: ${gatherer}.`,
      `Nearest Storehouse: ${storage ? `${storage.place.name} (${Math.ceil(storage.distance)} tiles)` : 'none; remote supply is inefficient'}.`,
      `Cargo waiting: ${extraction?.outputWaiting || 0}/${extraction?.outputCapacity || 0}.`,
      rate > 0
        ? { text: `Extraction rate: ~${rate}/day. ${extraction?.lastStatus || 'Operation active.'}`, className: 'gwg-good' }
        : `Extraction status: ${extraction?.lastStatus || 'Idle: needs a camp and assigned worker.'}`,
    ];
  }

  getExtractionRuntime(placeOrId) {
    const place = typeof placeOrId === 'string' ? this.buildingById?.[placeOrId] : placeOrId;
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    if (!place || !EXTRACTION_BUILDINGS[baseId]) return null;
    const runtime = this.getBuildingRuntime(place.id);
    runtime.extraction = normalizeExtractionRuntime(runtime.extraction, baseId);
    return runtime.extraction;
  }

  getExtractionNodeForCamp(place) {
    const extraction = this.getExtractionRuntime(place);
    const current = extraction?.nodeId ? this.explorationPointById?.[extraction.nodeId] : null;
    if (current && this.getCampsNearNode(current).some((placement) => placement.id === place.id)) return current;
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    const footprint = getBuildingCatalogEntry(baseId)?.footprint || { w: 2, h: 2 };
    const assessment = this.getExtractionPlacementAssessment(baseId, place.gridX, place.gridY, footprint);
    if (extraction) extraction.nodeId = assessment?.node?.id || null;
    return assessment?.node || null;
  }

  getExtractionRisk(place, nodePlace = this.getExtractionNodeForCamp(place)) {
    const node = nodePlace ? this.getResourceNode(nodePlace.id) : null;
    const areaRep = nodePlace ? this.getAreaReputation(this.getAreaIdForPlace(nodePlace)) : 20;
    const road = this.getBuildingRoadAccess(place).connected;
    const supported = this.isInTerritory(place.gridX || 0, place.gridY || 0);
    let risk = 4 + (node?.danger || 10) * 0.22 + areaRep * 0.16;
    if (!road) risk += 8;
    if (!supported) risk += 7;
    if (node?.accessEstablished) risk -= 6;
    return Phaser.Math.Clamp(Math.round(risk), 3, 38);
  }

  getRoadTransportMultiplier(place) {
    const access = this.getBuildingRoadAccess(place);
    if (!access.connected) return 0.55;
    const road = this.getRoadAt(access.roadCell.x, access.roadCell.y);
    return ROAD_TYPES[road?.type]?.speed || 1;
  }

  getExtractionInspector(place) {
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    const config = EXTRACTION_BUILDINGS[baseId];
    const extraction = this.getExtractionRuntime(place);
    if (!config || !extraction) return null;
    const nodePlace = this.getExtractionNodeForCamp(place);
    const node = nodePlace ? this.getResourceNode(nodePlace.id) : null;
    const hero = extraction.assignedHeroId
      ? this.heroes?.find((item) => item.def.id === extraction.assignedHeroId)
      : null;
    const storage = this.getNearestStorehouse(place.gridX || 0, place.gridY || 0);
    const roadAccess = this.getBuildingRoadAccess(place);
    const risk = this.getExtractionRisk(place, nodePlace);
    const priority = EXTRACTION_PRIORITIES[extraction.priority] || EXTRACTION_PRIORITIES.normal;
    return {
      config,
      extraction,
      nodePlace,
      node,
      storage,
      lines: [
        `Resource site: ${nodePlace?.name || (config.canHarvestForest ? 'nearby harvestable forest' : 'none assigned')}`,
        `Worker: ${hero ? `${hero.def.name} (${config.workerRole})` : 'none'}`,
        `Status: ${extraction.lastStatus}`,
        `Output waiting: ${extraction.outputWaiting}/${extraction.outputCapacity} ${config.resource}`,
        `Production progress: ${Math.round(extraction.progress * 100)}% - priority ${priority.label}`,
        `Expected package: ${config.baseRate} ${config.resource} before level/road bonuses`,
        `Route: ${roadAccess.connected ? `${(ROAD_TYPES[this.getRoadAt(roadAccess.roadCell.x, roadAccess.roadCell.y)?.type] || ROAD_TYPES.dirt).name} access` : 'no road'} -> ${storage?.place?.name || 'Guild Hall fallback'}`,
        `Travel: ${storage ? `${Math.ceil(storage.distance)} tiles` : 'no Storehouse route'} - speed x${this.getRoadTransportMultiplier(place)}`,
        { text: `Injury/cargo risk: ${risk}%`, className: risk >= 20 ? 'gwg-bad' : risk >= 12 ? 'gwg-muted' : 'gwg-good' },
      ],
      actions: [
        { label: hero ? 'Release Worker' : `Assign ${config.workerRole}`, event: 'gwg-extraction-assign', id: place.id },
        { label: extraction.paused ? 'Start Extraction' : 'Pause Extraction', event: 'gwg-extraction-toggle', id: place.id },
        { label: `Priority: ${priority.label}`, event: 'gwg-extraction-priority', id: place.id },
        { label: 'Request Carrier', event: 'gwg-extraction-carrier', id: place.id, disabled: extraction.outputWaiting <= 0 },
      ],
    };
  }

  assignExtractionWorkerFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    const extraction = this.getExtractionRuntime(place);
    if (!place || !extraction) return;
    if (extraction.assignedHeroId) {
      this.releaseExtractionWorker(placeId);
      return;
    }
    const nodePlace = this.getExtractionNodeForCamp(place);
    if (!nodePlace && !EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)]?.canHarvestForest) {
      this.game.events.emit('gwg-event', `${place.name} has no valid resource site. Moving the building may improve its career.`);
      return;
    }
    const hero = this.getActiveHeroes()
      .filter((item) => item.state !== 'away' && !this.isHeroInjured(item) && !item.stats.gatheringNodeId)
      .filter((item) => !this.postedQuests.some((quest) => quest.assignedHeroId === item.def.id))
      .sort((a, b) => (b.stats.power || 0) - (a.stats.power || 0))[0];
    if (!hero) {
      this.game.events.emit('gwg-event', 'No free healthy hero can take extraction duty. The pickaxe remains management-adjacent.');
      return;
    }
    const config = EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)];
    extraction.assignedHeroId = hero.def.id;
    extraction.nodeId = nodePlace?.id || extraction.nodeId;
    extraction.lastStatus = `Working: ${config.task}`;
    if (nodePlace) {
      const node = this.getResourceNode(nodePlace.id);
      node.gathererId = hero.def.id;
      node.assignedCampId = place.id;
    }
    hero.stats.gatheringNodeId = extraction.nodeId || place.id;
    this.interruptHero(hero);
    const spot = this.doorById[place.id] || place;
    this.walkTo(hero, {
      ...spot,
      intentAction: `Working at ${place.name}`,
      reason: `${config.workerRole} assigned to ${config.task}.`,
      risk: this.getExtractionRisk(place) >= 20 ? 'High' : 'Moderate',
    }, () => {
      hero.state = 'working';
      hero.currentAction = `${config.workerRole}: ${config.task}`;
      hero.intent = { action: `Working: ${config.task}`, destinationId: place.id, destinationName: place.name, reason: 'Assigned extraction duty.', risk: this.getExtractionRisk(place) >= 20 ? 'High' : 'Moderate' };
      this.setHeroAnimationState(hero, 'interact');
      this.publishHeroRoster();
    });
    this.stats.extractionWorkersAssigned = (this.stats.extractionWorkersAssigned || 0) + 1;
    this.checkObjectives();
    this.game.events.emit('gwg-event', `${hero.def.name} assigned as ${config.workerRole} at ${place.name}.`);
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  releaseExtractionWorker(placeId, showPanel = true) {
    const place = this.buildingById?.[placeId];
    const extraction = this.getExtractionRuntime(place);
    if (!place || !extraction) return;
    const hero = this.heroes?.find((item) => item.def.id === extraction.assignedHeroId);
    if (hero) {
      hero.stats.gatheringNodeId = null;
      this.interruptHero(hero);
      this.scheduleAmbient(hero, Phaser.Math.Between(900, 2200));
    }
    if (extraction.nodeId) {
      const node = this.getResourceNode(extraction.nodeId);
      if (node?.gathererId === extraction.assignedHeroId) node.gathererId = null;
    }
    extraction.assignedHeroId = null;
    extraction.lastStatus = 'Idle: no worker assigned';
    this.saveGame(false);
    if (showPanel) this.showPlaceInspector(place);
  }

  toggleExtractionFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    const extraction = this.getExtractionRuntime(place);
    if (!place || !extraction) return;
    extraction.paused = !extraction.paused;
    extraction.lastStatus = extraction.paused ? 'Paused by player' : (extraction.assignedHeroId ? 'Ready to work' : 'Idle: no worker assigned');
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  cycleExtractionPriorityFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    const extraction = this.getExtractionRuntime(place);
    if (!place || !extraction) return;
    const order = ['low', 'normal', 'high'];
    extraction.priority = order[(order.indexOf(extraction.priority) + 1) % order.length];
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  requestExtractionCarrierFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    const extraction = this.getExtractionRuntime(place);
    if (!place || !extraction || extraction.outputWaiting <= 0) return;
    extraction.carrierRequested = true;
    this.dispatchCarriers(true);
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  restoreExtractionAssignments() {
    for (const placement of this.cityState.placedBuildings) {
      const place = this.buildingById?.[placement.id];
      const extraction = this.getExtractionRuntime(place);
      if (!place || !extraction?.assignedHeroId) continue;
      const hero = this.heroes?.find((item) => item.def.id === extraction.assignedHeroId && item.stats.active !== false && !item.stats.deathDay);
      if (!hero) {
        extraction.assignedHeroId = null;
        extraction.lastStatus = 'Idle: assigned worker unavailable';
        continue;
      }
      hero.stats.gatheringNodeId = extraction.nodeId || place.id;
      const spot = this.doorById[place.id] || place;
      hero.container.setPosition(spot.x, spot.y);
      hero.state = 'working';
      const config = EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)];
      hero.currentAction = `${config.workerRole}: ${config.task}`;
      hero.intent = { action: `Working: ${config.task}`, destinationId: place.id, destinationName: place.name, reason: 'Restored extraction assignment.', risk: this.getExtractionRisk(place) >= 20 ? 'High' : 'Moderate' };
      this.setHeroAnimationState(hero, 'interact');
    }
  }

  refreshExtractionCargoVisuals() {
    for (const visual of Object.values(this.extractionCargoVisuals || {})) visual?.destroy?.(true);
    this.extractionCargoVisuals = {};
    for (const placement of this.cityState.placedBuildings) {
      const place = this.buildingById?.[placement.id];
      const extraction = this.getExtractionRuntime(place);
      if (!place || !extraction || extraction.outputWaiting <= 0) continue;
      const baseId = getBaseBuildingId(place.baseId || place.id);
      const config = EXTRACTION_BUILDINGS[baseId];
      const textureKey = resolveTexture(this, 'prop_crate', 'crate');
      if (!textureKey || !this.textures.exists(textureKey)) continue;
      const sprite = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
      sprite.setScale(this.getTextureScaleForHeight(textureKey, 22, 0.8));
      sprite.setTint(config.packageTint);
      const label = this.add.text(12, -20, `${extraction.outputWaiting}`, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', fontStyle: 'bold', color: '#fff6dc',
        stroke: '#0c1118', strokeThickness: 2, backgroundColor: '#0f1521dd', padding: { x: 3, y: 1 },
      }).setOrigin(0.5);
      const door = this.doorById[place.id] || place;
      const container = this.add.container(door.x + 18, door.y + 3, [sprite, label]).setDepth(door.y + 18);
      this.extractionCargoVisuals[place.id] = container;
    }
  }

  serializeResourceDeliveries() {
    return (this.carriers || [])
      .filter((carrier) => carrier.container?.active && carrier.extractionDelivery && !carrier.deliveryCompleted)
      .map((carrier) => ({
        id: carrier.def.id,
        resource: carrier.resource,
        amount: carrier.assignedCargo || carrier.cargo || 0,
        nodeId: carrier.nodeId,
        sourceId: carrier.originId,
        destinationId: carrier.destinationId || null,
      }))
      .filter((delivery) => delivery.amount > 0)
      .slice(0, 12);
  }

  restoreResourceDeliveries() {
    for (const delivery of this.savedResourceDeliveries || []) {
      const source = this.buildingById?.[delivery.sourceId];
      if (!source || !EXTRACTION_BUILDINGS[getBaseBuildingId(source.baseId || source.id)]) {
        const node = this.getResourceNode(delivery.nodeId);
        if (node) node.pending += delivery.amount;
        continue;
      }
      const started = this.spawnCarrier(source, delivery.resource, delivery.amount, delivery.nodeId, source.name, {
        directFallback: false,
        originId: source.id,
        restored: true,
        persistDelivery: true,
        onLeftover: (leftover) => {
          const extraction = this.getExtractionRuntime(source);
          if (extraction) extraction.outputWaiting += leftover;
        },
        onDelivered: (delivered) => {
          const extraction = this.getExtractionRuntime(source);
          if (extraction) {
            extraction.deliveredTotal += delivered;
            extraction.lastStatus = delivered > 0 ? `Delivered ${delivered} ${delivery.resource}` : 'Waiting: delivery rejected';
          }
          const node = delivery.nodeId ? this.getResourceNode(delivery.nodeId) : null;
          if (node) node.deliveredTotal += delivered;
          if (delivered > 0) {
            this.stats.resourceDeliveries = (this.stats.resourceDeliveries || 0) + 1;
            this.checkObjectives();
          }
          this.refreshExtractionCargoVisuals();
        },
      });
      if (!started) {
        const extraction = this.getExtractionRuntime(source);
        if (extraction) extraction.outputWaiting += delivery.amount;
      }
    }
    this.savedResourceDeliveries = [];
    this.refreshExtractionCargoVisuals();
  }

  // --- extraction, transport, storage ---------------------------------------

  getNodeExtractionRate(place, node) {
    if (!node || node.amount <= 0) return 0;
    let rate = 0;
    for (const placement of this.getCampsNearNode(place)) {
      const config = EXTRACTION_BUILDINGS[getBaseBuildingId(placement.id)];
      const runtime = this.getBuildingRuntime(placement.id);
      const extraction = this.getExtractionRuntime(placement.id);
      if (runtime.closed || extraction?.paused || !extraction?.assignedHeroId) continue;
      const level = this.getPlaceLevel(this.buildingById[placement.id]);
      const priority = EXTRACTION_PRIORITIES[extraction.priority] || EXTRACTION_PRIORITIES.normal;
      let campRate = (config.baseRate + (level - 1)) * priority.speed;
      if (this.getBuildingRoadAccess(this.buildingById[placement.id]).connected) campRate *= 1.15;
      if (node.accessEstablished) campRate *= 1.1;
      rate += campRate;
    }
    return Math.round(rate * 10) / 10;
  }

  // day-cycle: every working camp/gatherer pulls from its node into a pending
  // package, harvests forest for lumber camps, then regen ticks the nodes
  runExtractionStep() {
    let anyBottleneck = false;
    for (const node of Object.values(this.resourceNodes || {})) {
      if (node.amount < node.maxAmount) node.amount = Math.min(node.maxAmount, node.amount + (node.regenPerDay || 0));
    }
    for (const placement of this.cityState.placedBuildings.filter((entry) => getBaseBuildingId(entry.id) === 'frontier_outpost')) {
      const nearbyNodes = Object.values(this.explorationPointById || {}).filter((place) => (
        this.isResourceNode(place) && Math.hypot((place.gridX || 0) - placement.gridX, (place.gridY || 0) - placement.gridY) <= 14
      ));
      for (const nodePlace of nearbyNodes) this.changeAreaReputation(this.getAreaIdForPlace(nodePlace), -1, 'Frontier patrols');
    }
    for (const placement of this.cityState.placedBuildings) {
      const baseId = getBaseBuildingId(placement.id);
      const config = EXTRACTION_BUILDINGS[baseId];
      if (!config) continue;
      const place = this.buildingById?.[placement.id];
      const runtime = this.getBuildingRuntime(placement.id);
      const extraction = this.getExtractionRuntime(place);
      if (!place || !extraction) continue;
      if (runtime.closed || extraction.paused) {
        extraction.lastStatus = runtime.closed ? 'Idle: building closed' : 'Paused by player';
        continue;
      }
      const hero = this.heroes?.find((item) => item.def.id === extraction.assignedHeroId);
      if (!hero || hero.stats.active === false || hero.stats.deathDay) {
        extraction.assignedHeroId = null;
        extraction.lastStatus = 'Idle: no worker assigned';
        continue;
      }
      if (this.isHeroInjured(hero)) {
        extraction.lastStatus = `Idle: ${hero.def.name} is injured`;
        continue;
      }
      const nodePlace = this.getExtractionNodeForCamp(place);
      const node = nodePlace ? this.getResourceNode(nodePlace.id) : null;
      const forestAvailable = config.canHarvestForest && this.hasHarvestableForestNear(place.gridX, place.gridY);
      if (!node && !forestAvailable) {
        extraction.lastStatus = 'Idle: no matching resource in range';
        continue;
      }
      if (node && node.amount <= 0) {
        extraction.lastStatus = node.regenPerDay ? 'Idle: node depleted and regrowing' : 'Idle: site depleted';
        continue;
      }
      if (this.isResourceStorageFull(node?.resource || config.resource)) {
        extraction.lastStatus = 'Idle: storage full';
        anyBottleneck = true;
        continue;
      }
      if (extraction.outputWaiting >= extraction.outputCapacity) {
        extraction.lastStatus = 'Waiting for carrier: output pile full';
        anyBottleneck = true;
        continue;
      }
      const priority = EXTRACTION_PRIORITIES[extraction.priority] || EXTRACTION_PRIORITIES.normal;
      const roadMultiplier = this.getRoadTransportMultiplier(place);
      extraction.progress += 0.72 * priority.speed * Math.max(0.55, roadMultiplier);
      if (extraction.progress < 1) {
        extraction.lastStatus = `Working: ${config.task} (${Math.round(extraction.progress * 100)}%)`;
        continue;
      }
      extraction.progress = Math.max(0, extraction.progress - 1);
      const level = this.getPlaceLevel(place);
      let amount = Math.min(config.baseRate + Math.max(0, level - 1), extraction.outputCapacity - extraction.outputWaiting);
      if (node) {
        amount = Math.min(amount, node.amount);
        node.amount -= amount;
        node.lastHarvestDay = this.day;
      } else {
        amount = Math.min(amount, this.harvestForestForCamp(place, 1));
      }
      if (amount <= 0) {
        extraction.lastStatus = 'Idle: local resource exhausted';
        continue;
      }
      extraction.outputWaiting += amount;
      extraction.extractedTotal += amount;
      extraction.lastStatus = `Waiting for carrier: ${extraction.outputWaiting}/${extraction.outputCapacity} ${node?.resource || config.resource}`;
      runtime.productionDone = (runtime.productionDone || 0) + 1;
      runtime.upgradeProgress = Math.min(100, (runtime.upgradeProgress || 0) + 2);
      const risk = this.getExtractionRisk(place, nodePlace) * priority.risk;
      if (Math.random() < risk / 400) {
        this.injureHero(hero, risk >= 24 ? 3 : 2, risk >= 24 ? 'badly injured' : 'injured', nodePlace?.name || 'frontier logging');
        extraction.lastStatus = `Unsafe route: ${hero.def.name} injured`;
        this.changeAreaReputation(nodePlace ? this.getAreaIdForPlace(nodePlace) : 'frontier', 4, nodePlace?.name || place.name);
        this.addReportLine('warnings', `${hero.def.name} was injured at ${place.name}. The area gained paperwork and a bad reputation.`);
      } else if (Math.random() < risk / 650 && extraction.outputWaiting > 0) {
        extraction.outputWaiting -= 1;
        extraction.lastStatus = 'Delayed: one cargo unit was stolen on the frontier route';
        this.changeAreaReputation(nodePlace ? this.getAreaIdForPlace(nodePlace) : 'frontier', 2, nodePlace?.name || place.name);
      }
      if (node?.premium && Math.random() < 0.45) this.applyDeltas({ corruption: 1 });
    }
    this.refreshExtractionCargoVisuals();
    if (anyBottleneck) {
      this.addReportLine('warnings', 'Storage full: some extraction paused. Build or upgrade a Storehouse.');
    }
    // deliver pending packages via visible carriers (also credits inventory)
    this.dispatchCarriers();
  }

  // carriers pick up pending packages and walk them toward a delivery building
  dispatchCarriers(force = false) {
    if (!this.isBuilderCity) return;
    this.carriers = (this.carriers || []).filter((carrier) => carrier.container?.active);
    const depotCapacity = this.getPlacedBuildingsByBaseId('caravan_depot')
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    const maxCarriers = (this.rsp?.compact ? 2 : 4) + depotCapacity * 2;
    const camps = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place && EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)])
      .sort((a, b) => Number(this.getExtractionRuntime(b)?.carrierRequested) - Number(this.getExtractionRuntime(a)?.carrierRequested));
    for (const camp of camps) {
      if (this.carriers.length >= maxCarriers) break;
      const extraction = this.getExtractionRuntime(camp);
      if (!extraction || extraction.outputWaiting <= 0) continue;
      if (!force && !extraction.carrierRequested && extraction.outputWaiting < Math.min(4, extraction.outputCapacity)) continue;
      if (this.carriers.some((carrier) => carrier.originId === camp.id && carrier.nodeId === extraction.nodeId)) continue;
      const config = EXTRACTION_BUILDINGS[getBaseBuildingId(camp.baseId || camp.id)];
      const node = extraction.nodeId ? this.getResourceNode(extraction.nodeId) : null;
      const resource = node?.resource || config.resource;
      if (this.isResourceStorageFull(resource)) {
        extraction.lastStatus = 'Waiting: destination storage full';
        continue;
      }
      const load = Math.min(extraction.outputWaiting, 6);
      const started = this.spawnCarrier(camp, resource, load, extraction.nodeId, camp.name, {
        directFallback: false,
        originId: camp.id,
        persistDelivery: true,
        onLeftover: (leftover) => { extraction.outputWaiting += leftover; },
        onDelivered: (delivered) => {
          extraction.deliveredTotal += delivered;
          extraction.lastStatus = delivered > 0 ? `Delivered ${delivered} ${resource}` : 'Waiting: delivery rejected';
          if (node) node.deliveredTotal += delivered;
          if (delivered > 0) {
            this.stats.resourceDeliveries = (this.stats.resourceDeliveries || 0) + 1;
            this.checkObjectives();
          }
          this.refreshExtractionCargoVisuals();
        },
      });
      if (started) {
        extraction.outputWaiting -= load;
        extraction.carrierRequested = false;
        extraction.lastStatus = `Carrier assigned: ${load} ${resource}`;
      }
    }
    this.refreshExtractionCargoVisuals();
  }

  getDeliveryTarget(fromPlace, resource = null) {
    const preferred = HERO_SUPPLY_RESOURCES.includes(resource)
      ? ['guildhall', 'warehouse', 'storehouse', 'market']
      : PROCESSED_RESOURCES.includes(resource)
        ? ['warehouse', 'market', 'storehouse', 'guildhall']
        : ['storehouse', 'warehouse', 'market', 'guildhall'];
    for (const baseId of preferred) {
      const candidates = this.cityState.placedBuildings
        .filter((placement) => getBaseBuildingId(placement.id) === baseId)
        .map((placement) => ({ placement, door: this.doorById[placement.id] }))
        .filter(({ placement, door }) => {
          if (!door) return false;
          if (baseId !== 'storehouse') return true;
          const storage = this.getBuildingRuntime(placement.id).storage;
          return storage.mode === 'all' || storage.resource === resource;
        })
        .sort((a, b) => (
          (baseId === 'storehouse'
            ? ({ high: -500, normal: 0, low: 500 }[this.getBuildingRuntime(a.placement.id).storage.priority]
              - ({ high: -500, normal: 0, low: 500 }[this.getBuildingRuntime(b.placement.id).storage.priority]))
            : 0)
          + Phaser.Math.Distance.Between(fromPlace.x, fromPlace.y, a.door.x, a.door.y)
          - Phaser.Math.Distance.Between(fromPlace.x, fromPlace.y, b.door.x, b.door.y)
        ));
      if (candidates.length) return candidates[0].door;
    }
    return null;
  }

  spawnCarrier(camp, resource, amount, nodeId, nodeName, options = {}) {
    if (!camp || amount <= 0) return false;
    const config = Object.values(CARRIER_CONFIG).find((c) => c.resource === resource) || CARRIER_CONFIG.wood_carrier;
    const target = this.getDeliveryTarget(camp, resource);
    const door = this.doorById[camp.id] || camp;
    if (!target) {
      if (options.directFallback === false) return false;
      const delivered = this.addTownResource(resource, amount, `${nodeName} camp`);
      const node = this.getResourceNode(nodeId);
      if (node) node.pending += (amount - delivered);
      return true;
    }
    const textureKey = this.textures.exists(config.assetKey)
      ? config.assetKey
      : resolveTexture(this, config.fallbackKey, 'hero_default');
    if (!textureKey || !this.textures.exists(textureKey)) {
      if (options.directFallback === false) return false;
      this.addTownResource(resource, amount, `${nodeName} camp`);
      return true;
    }
    const sprite = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    sprite.setScale(this.getTextureScaleForHeight(textureKey, 24, 1.1));
    if (!this.textures.exists(config.assetKey) && config.tint) sprite.setTint(config.tint);
    const packageKey = resolveTexture(this, 'prop_crate', 'crate');
    const packageSprite = packageKey && this.textures.exists(packageKey)
      ? this.add.image(7, -18, packageKey).setOrigin(0.5, 1).setScale(this.getTextureScaleForHeight(packageKey, 13, 0.55)).setTint(config.tint || 0xffffff).setVisible(false)
      : null;
    const container = this.add.container(target.x, target.y, packageSprite ? [sprite, packageSprite] : [sprite]).setDepth(target.y);
    const routeMultiplier = this.getRoadTransportMultiplier(camp);

    const carrier = {
      def: { id: `carrier-${resource}-${this.time.now}`, name: config.name, speed: Math.round(66 * routeMultiplier), assetKey: textureKey },
      sprite,
      container,
      stats: { health: 42, maxHealth: 42, active: true },
      walker: true,
      serviceRole: 'carrier',
      spriteHeight: 24,
      resource,
      cargo: 0,
      assignedCargo: amount,
      nodeId,
      originId: options.originId || camp.id,
      originName: camp.name || nodeName,
      destinationName: target.name || this.getPlaceName(target.id),
      destinationId: target.id || null,
      routeStatus: routeMultiplier < 0.8 ? 'No road: slow and unreliable' : routeMultiplier > 1.2 ? 'Upgraded road: fast route' : 'Dirt road: normal route',
      currentAction: `walking to collect ${amount} ${resource}`,
      packageSprite,
      extractionDelivery: Boolean(options.persistDelivery),
      deliveryCompleted: false,
    };
    this.prepareHeroAnimation(carrier);
    this.carriers.push(carrier);
    carrier.targetEntry = this.registerWorldInteractionTarget({
      id: `carrier-${carrier.def.id}`,
      type: 'carrier',
      hit: container,
      img: container,
      walker: carrier,
      width: 40,
      height: 50,
      getCenter: () => ({ x: container.x, y: container.y - 22 }),
      onSelect: () => this.showCarrierInspector(carrier),
    });
    const completeDelivery = () => {
      carrier.deliveryCompleted = true;
      const delivered = this.addTownResource(resource, amount, '');
      const leftover = amount - delivered;
      if (leftover > 0) {
        if (options.onLeftover) options.onLeftover(leftover);
        else {
          const node = this.getResourceNode(nodeId);
          if (node) node.pending += leftover;
        }
      }
      if (delivered > 0) {
        this.floatText(target.x, target.y - 34, `+${delivered} ${resource}`, '#d7f3d0');
      }
      options.onDelivered?.(delivered);
      this.worldInteractionTargets = this.worldInteractionTargets.filter((entry) => entry !== carrier.targetEntry);
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 500,
        delay: 300,
        onComplete: () => container.destroy(),
      });
    };
    const collectCargo = () => {
      carrier.cargo = amount;
      carrier.currentAction = `carrying ${amount} ${resource} to ${carrier.destinationName}`;
      packageSprite?.setVisible(true);
      this.walkTo(carrier, target, completeDelivery);
    };
    this.walkTo(carrier, door, collectCargo);
    return true;
  }

  showCarrierInspector(carrier) {
    if (!carrier?.container?.active) return;
    this.activeInspector = { type: 'carrier', id: carrier.def.id };
    this.game.events.emit('gwg-inspector-open', {
      title: carrier.def.name,
      subtitle: 'Goods Carrier',
      sections: [
        {
          title: 'Delivery',
          lines: [
            `Cargo: ${carrier.cargo || 0}/${carrier.assignedCargo || carrier.cargo || 0} ${RESOURCE_BY_ID[carrier.resource]?.label || carrier.resource}`,
            `Origin: ${carrier.originName || 'unknown supplier'}`,
            `Destination: ${carrier.destinationName || 'town storage'}`,
            `Status: ${carrier.currentAction || 'walking with inventory'}`,
            `Route: ${carrier.routeStatus || 'route status pending'}`,
          ],
        },
        {
          title: 'Route Note',
          lines: ['Carriers prefer connected roads. Missing storage leaves finished goods waiting at the producer.'],
        },
      ],
    });
  }

  // --- forest harvesting ----------------------------------------------------

  harvestForestForCamp(place, maxCells = 1) {
    if (!place || !this.forestBlockedCells?.size) return 0;
    const footprint = getBuildingCatalogEntry(place.id)?.footprint || { w: 2, h: 2 };
    const cx = place.gridX + footprint.w / 2;
    const cy = place.gridY + footprint.h / 2;
    const targets = [...this.forestBlockedCells]
      .filter((key) => !this.harvestedForestCells.has(key))
      .map((key) => {
        const [x, y] = key.split(',').map(Number);
        return { key, dist: Math.hypot(x - cx, y - cy) };
      })
      .filter((cell) => cell.dist <= 10)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxCells);
    for (const target of targets) this.harvestedForestCells.set(target.key, this.day + 12);
    if (targets.length) {
      this.redrawWildernessDressing();
      this.addReportLine('economy', `${place.name} harvested ${targets.length} forest cell${targets.length === 1 ? '' : 's'}. Stumps entered the visual roadmap.`);
    }
    return targets.length * 2;
  }

  harvestForestFromCamps() {
    const lumberCamps = this.cityState.placedBuildings.filter((p) => getBaseBuildingId(p.id) === 'lumber_camp');
    if (!lumberCamps.length || !this.forestBlockedCells?.size) return;
    for (const placement of lumberCamps) {
      const runtime = this.getBuildingRuntime(placement.id);
      if (runtime.closed) continue;
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      const cx = placement.gridX + footprint.w / 2;
      const cy = placement.gridY + footprint.h / 2;
      // harvest the nearest 1-2 still-forested cells within range
      const targets = [...this.forestBlockedCells]
        .filter((key) => !this.harvestedForestCells.has(key))
        .map((key) => {
          const [x, y] = key.split(',').map(Number);
          return { key, x, y, dist: Math.hypot(x - cx, y - cy) };
        })
        .filter((cell) => cell.dist <= EXTRACTION_RANGE_TILES)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 2);
      if (!targets.length) continue;
      for (const cell of targets) {
        this.harvestedForestCells.set(cell.key, this.day + 12); // regrow after 12 days
        this.addTownResource('wood', 2, 'Lumber Camp');
      }
      this.addReportLine('stage', `A Lumber Camp thinned ${targets.length} forest tile${targets.length === 1 ? '' : 's'} for wood.`);
    }
    this.redrawWildernessDressing();
  }

  regrowForest() {
    if (!this.harvestedForestCells?.size) return;
    let regrew = false;
    for (const [key, regrowDay] of [...this.harvestedForestCells]) {
      if (regrowDay > 0 && this.day >= regrowDay) {
        this.harvestedForestCells.delete(key);
        regrew = true;
      }
    }
    if (regrew) this.redrawWildernessDressing();
  }

  // --- territory ------------------------------------------------------------

  getTerritoryAnchors() {
    const anchors = [];
    for (const placement of this.cityState.placedBuildings) {
      const baseId = getBaseBuildingId(placement.id);
      const radius = TERRITORY_RADIUS[baseId];
      if (!radius) continue;
      const footprint = getBuildingCatalogEntry(placement.id)?.footprint || { w: 2, h: 2 };
      anchors.push({
        x: placement.gridX + footprint.w / 2,
        y: placement.gridY + footprint.h / 2,
        radius,
      });
    }
    return anchors;
  }

  isInTerritory(gridX, gridY) {
    return this.getTerritoryAnchors().some((anchor) => (
      Math.hypot(gridX - anchor.x, gridY - anchor.y) <= anchor.radius
    ));
  }

  isHeroInjured(hero) {
    return (hero?.stats?.injuredUntilDay || 0) > this.day;
  }

  injureHero(hero, days = 2, severity = 'injured', source = 'town hazard') {
    if (!hero?.stats || hero.stats.active === false) return;
    const armor = this.getHeroEquipmentBonus(hero).armor;
    const protectedDays = Math.max(1, days - Math.floor(armor / 3));
    hero.stats.injuredUntilDay = Math.max(hero.stats.injuredUntilDay || 0, this.day + protectedDays);
    hero.stats.injuryState = severity;
    hero.stats.morale = Phaser.Math.Clamp((hero.stats.morale || 50) - (severity === 'badly injured' ? 9 : 5), 0, 100);
    this.stats.heroInjuries = (this.stats.heroInjuries || 0) + 1;
    const profile = this.getHeroProfile(hero);
    profile.career.injuries += 1;
    if (severity === 'badly injured') profile.scars = [...new Set([...profile.scars, `Scar from ${source}`])].slice(-8);
    this.addHeroHistory(hero, `${severity} by ${source}.`);
    this.setHeroAnimationState(hero, 'hurt');
    this.refreshHeroStatusMarker(hero);
  }

  markHeroMissing(hero, days = 1, source = 'wilderness paperwork') {
    if (!hero?.stats || hero.stats.active === false) return;
    this.injureHero(hero, days + 1, 'missing', source);
    this.sendHeroAway(hero, days);
    hero.currentAction = `Missing until Day ${hero.awayUntil}`;
    hero.intent = {
      action: 'Missing',
      destinationId: 'wilderness',
      destinationName: 'Wilderness',
      reason: source,
      risk: 'High',
    };
  }

  killHero(hero, reason = 'The wilderness made a final argument.') {
    if (!hero?.stats || hero.stats.deathDay) return;
    hero.stats.active = false;
    hero.stats.deathDay = this.day;
    hero.stats.status = 'Lost Hero';
    hero.stats.currentPersonality = 'Lost Hero';
    hero.stats.injuryState = 'dead';
    hero.stats.health = 0;
    hero.stats.deathLocation = {
      x: Math.round(hero.container?.x || this.cameras.main.worldView.centerX || 0),
      y: Math.round(hero.container?.y || this.cameras.main.worldView.centerY || 0),
    };
    hero.state = 'away';
    hero.currentAction = 'Lost in the wilds';
    hero.intent = {
      action: 'Lost',
      destinationId: 'wilderness',
      destinationName: 'Wilderness',
      reason,
      risk: 'Final',
    };
    hero.container.setAlpha(0.18);
    this.addHeroHistory(hero, `Died: ${reason}`);
    this.handleHeroDeathLegacy(hero, reason);
    this.stats.heroesLeft = (this.stats.heroesLeft || 0) + 1;
    this.applyDeltas({ morale: -5, trust: -2 });
    this.setHeroAnimationState(hero, 'hurt');
    this.refreshHeroStatusMarker(hero);
    this.floatText(hero.container.x, hero.container.y - 44, 'LOST HERO', '#f0938f');
    const text = `${hero.def.name} died. ${reason}`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'crisis');
    this.addReportLine('warnings', text);
  }

  getLodgingReport() {
    const placedRest = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && REST_BUILDINGS[getBaseBuildingId(place.baseId || place.id)]);
    let beds = 2;
    let qualitySum = 0;
    let qualityCount = 0;
    for (const place of placedRest) {
      const baseId = getBaseBuildingId(place.baseId || place.id);
      const config = REST_BUILDINGS[baseId];
      const level = this.getPlaceLevel(place);
      const baseBeds = config.beds + (level - 1) * config.bedsPerLevel;
      beds += Math.max(baseBeds, this.getBuildingCapacity(place));
      qualitySum += config.quality;
      qualityCount += 1;
    }
    const used = this.getActiveHeroes().length;
    return {
      beds,
      restQuality: qualityCount ? Math.round((qualitySum / qualityCount) * 10) / 10 : 0.5,
      used,
      homeless: Math.max(0, used - beds),
    };
  }

  getBedsInspectorLine() {
    const lodging = this.getLodgingReport();
    return {
      text: `Town beds: ${lodging.used}/${lodging.beds} used - rest quality ${lodging.restQuality}`,
      className: lodging.homeless > 0 ? 'gwg-bad' : 'gwg-good',
    };
  }

  getStockInspectorLine(placeId) {
    if (!this.townInventory) return null;
    if (placeId === 'market') return `Stores: ${this.townInventory.loot} loot waiting for conversion.`;
    if (placeId === 'blacksmith') return `Stores: ${this.townInventory.iron} iron, ${this.townInventory.weapons} weapons, ${this.townInventory.armor} armor.`;
    if (placeId === 'potion_shop') return `Stores: ${this.townInventory.herbs} herbs, ${this.townInventory.potions} potions ready.`;
    return null;
  }

  // guild advisor: compact "why are my numbers moving" notes for the report
  getAdvisorNotes() {
    const notes = [];
    this.updateTownReputationStats();
    notes.push({
      text: `Town reputation ${this.townReputation}/100 - prestige ${this.townPrestige}/100. Better services and lower threat attract stronger heroes.`,
      className: this.townReputation >= 60 ? 'gwg-good' : this.townReputation < 35 ? 'gwg-bad' : 'gwg-muted',
    });
    const districtBonuses = this.getActiveDistrictBonuses();
    if (districtBonuses.length) {
      notes.push({
        text: `District bonuses: ${districtBonuses.map((bonus) => bonus.name).join(', ')}.`,
        className: 'gwg-good',
      });
    }
    const productionBottlenecks = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place?.isPlaced && this.getProductionRecipes(place).length)
      .map((place) => ({ place, state: this.getProductionState(place) }))
      .filter(({ state }) => /Waiting|Locked/.test(state.lastStatus || ''))
      .slice(0, 3);
    for (const { place, state } of productionBottlenecks) {
      notes.push({ text: `${place.name}: ${state.lastStatus}.`, className: 'gwg-bad' });
    }
    const buildingProblems = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id))
      .flatMap((place) => this.getBuildingProblems(place).map((problem) => `${place.name}: ${problem.text}`))
      .slice(0, 3);
    for (const problem of buildingProblems) notes.push({ text: problem, className: 'gwg-bad' });
    const badAreas = Object.entries(this.areaReputation || {})
      .filter(([, value]) => Number(value) >= 35)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    if (badAreas.length) {
      notes.push({
        text: `Bad area reputation: ${badAreas.map(([id, value]) => `${id} ${value}`).join(', ')}. Heroes avoid places that keep hurting people.`,
        className: 'gwg-bad',
      });
    }
    const lodging = this.getLodgingReport();
    if (lodging.homeless > 0) {
      notes.push({
        text: `${lodging.homeless} hero${lodging.homeless === 1 ? '' : 'es'} without beds (${lodging.used}/${lodging.beds}). Morale is sleeping outside too.`,
        className: 'gwg-bad',
      });
    }
    const disconnected = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id)?.roadRequired)
      .filter((place) => !this.getBuildingRoadAccess(place).connected)
      .map((place) => place.name);
    if (disconnected.length) {
      notes.push({ text: `No road access: ${disconnected.join(', ')}. Services and walkers are idle there.`, className: 'gwg-bad' });
    }
    if (((this.townInventory?.weapons || 0) + (this.townInventory?.armor || 0)) === 0 && this.isBuildingPlaced('blacksmith') && (this.townInventory?.iron || 0) === 0) {
      notes.push('Equipment supply empty: the Blacksmith has no iron. Heroes explore under-equipped.');
    }
    if (this.resources.threat >= 60) {
      notes.push({ text: 'Threat is rising. Watchtowers, patrols, and hero hunts push it back.', className: 'gwg-bad' });
    }
    const camps = [...(this.discoveredPois || [])]
      .map((id) => this.explorationPointById?.[id])
      .filter((point) => point?.kind === 'camp');
    if (camps.length) {
      notes.push(`${camps.length} monster camp${camps.length === 1 ? '' : 's'} discovered in the wilds. Ignoring them feeds threat.`);
    }
    if ((this.stats.premiumActions || 0) + (this.stats.whaleEvents || 0) >= 12) {
      notes.push({ text: 'Premium dependency rising: a worrying share of income is "optional".', className: 'gwg-whale' });
    }
    // hero workforce overview: idle / on quest / injured
    const activeHeroes = this.getActiveHeroes();
    const injuredCount = activeHeroes.filter((hero) => this.isHeroInjured(hero)).length;
    const assignedCount = this.postedQuests.filter((quest) => quest.assignedHeroId).length;
    notes.push(
      `Heroes: ${activeHeroes.length} active, ${assignedCount} assigned to quests, ${injuredCount} injured.`,
    );
    if (injuredCount > 0 && (this.townInventory?.potions || 0) === 0) {
      notes.push({ text: `${injuredCount} injured hero${injuredCount === 1 ? '' : 'es'} and no potions in store. Herbs and a Potion Shop would help.`, className: 'gwg-bad' });
    }
    // extraction economy: bottlenecks and idle opportunities
    for (const note of this.getExtractionAdvisorNotes()) notes.push(note);
    // town rank: the long-term score behind hero attraction
    const reputation = this.getTownReputation();
    const rank = this.getTownRank(reputation);
    notes.push({
      text: rank.next
        ? `Town Rank: ${rank.name} (${rank.score}/${rank.next.score}). ${rank.remaining} score to ${rank.next.name}.`
        : `Town Rank: ${rank.name} - maximum institutional concern achieved.`,
      className: reputation >= 50 ? 'gwg-good' : 'gwg-muted',
    });
    const needWeapons = activeHeroes.filter((hero) => normalizeHeroEquipment(hero.stats.equipment).weapon === 'Poor').length;
    const needArmor = activeHeroes.filter((hero) => this.getHeroTierIndex(hero) >= 2 && normalizeHeroEquipment(hero.stats.equipment).armor === 'Poor').length;
    if (needWeapons || needArmor) notes.push({ text: `Hero supply shortage: ${needWeapons} need weapons, ${needArmor} need armor. Select Guild Hall to equip stock.`, className: 'gwg-bad' });
    return notes;
  }

  getExtractionAdvisorNotes() {
    const notes = [];
    const full = [...STORED_RESOURCES, ...PROCESSED_RESOURCES].filter((res) => this.isResourceStorageFull(res));
    if (full.length) {
      notes.push({ text: `Storage full (${full.join(', ')}). Extraction paused - build or upgrade a Storehouse.`, className: 'gwg-bad' });
    }
    // discovered resource node with no camp = build opportunity
    for (const place of Object.values(this.explorationPointById || {})) {
      if (!this.isResourceNode(place) || !this.isRevealed(place.gridX, place.gridY)) continue;
      const node = this.getResourceNode(place.id);
      if (node.amount <= 0) continue;
      if (this.getCampsNearNode(place).length === 0 && !node.gathererId) {
        const config = Object.values(EXTRACTION_BUILDINGS).find((c) => (c.accepts || [c.resource]).includes(node.resource));
        notes.push(`${place.name} (${node.resource}) has no camp. Build a ${config?.label || 'camp'} within ${EXTRACTION_RANGE_TILES} tiles.`);
      } else if (!node.accessEstablished && !this.nodeHasRoadAccess(place)) {
        notes.push({ text: `${place.name} extraction is slow and dangerous with no road access.`, className: 'gwg-bad' });
      }
    }
    // camps that lost their node (depleted) or a delivery target
    const hasDelivery = ['storehouse', 'warehouse', 'market', 'guildhall'].some((baseId) => (
      this.cityState.placedBuildings.some((p) => getBaseBuildingId(p.id) === baseId)
    ));
    if (!hasDelivery && this.cityState.placedBuildings.some((p) => EXTRACTION_IDS.includes(getBaseBuildingId(p.id)))) {
      notes.push({ text: 'Extraction camps have nowhere to deliver. Build a Storehouse or Market.', className: 'gwg-bad' });
    }
    const campBottlenecks = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place && EXTRACTION_BUILDINGS[getBaseBuildingId(place.baseId || place.id)])
      .map((place) => ({ place, extraction: this.getExtractionRuntime(place) }))
      .filter(({ extraction }) => extraction && /Idle|Waiting|Unsafe|Delayed/.test(extraction.lastStatus || ''))
      .slice(0, 3);
    for (const { place, extraction } of campBottlenecks) {
      notes.push({
        text: `${place.name}: ${extraction.lastStatus}.`,
        className: /full|no worker|no matching|Unsafe/.test(extraction.lastStatus || '') ? 'gwg-bad' : 'gwg-muted',
      });
    }
    return notes.slice(0, 4);
  }

  applyBuildingUpkeep() {
    const placed = Object.values(this.buildingById || {})
      .filter((place) => place?.isPlaced && getBuildingCatalogEntry(place.id));
    let due = 0;
    for (const place of placed) {
      const runtime = this.getBuildingRuntime(place.id);
      if (runtime.closed) continue;
      due += this.getBuildingUpkeep(place);
    }
    if (due <= 0) return;
    const paid = Math.min(this.resources.gold, due);
    if (paid > 0) {
      this.applyDeltas({ gold: -paid });
      for (const place of placed) {
        const runtime = this.getBuildingRuntime(place.id);
        if (!runtime.closed) runtime.upkeepPaid = (runtime.upkeepPaid || 0) + this.getBuildingUpkeep(place);
      }
    }
    if (paid < due) {
      const text = `Upkeep shortfall: paid ${paid}/${due}g. ${Phaser.Utils.Array.GetRandom(BUILDING_SATIRE_LINES.upkeep)}`;
      this.applyDeltas({ morale: -1, trust: -1 });
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'economy');
      this.addReportLine('warnings', text);
    } else if (this.day % 5 === 0) {
      this.addReportLine('economy', `Building upkeep paid: ${paid}g. Infrastructure remained briefly convinced.`);
    }
  }

  applyDistrictDailyEffects() {
    const active = this.getActiveDistrictBonuses();
    if (!active.length) return;
    const deltas = {};
    for (const bonus of active) {
      for (const [key, value] of Object.entries(bonus.dailyDeltas || {})) {
        deltas[key] = (deltas[key] || 0) + value;
      }
    }
    if (Object.keys(deltas).length) this.applyDeltas(deltas);
    if (this.day % 3 === 0) {
      const text = `District bonuses active: ${active.map((bonus) => bonus.name).join(', ')}. Layout is beginning to have opinions.`;
      this.addTownLog(text, 'economy');
      this.addReportLine('economy', text);
    }
  }

  applySpecializationDailyEffects() {
    const deltas = {};
    const lines = [];
    for (const place of Object.values(this.buildingById || {})) {
      if (!place?.isPlaced || !getBuildingCatalogEntry(place.id)) continue;
      const runtime = this.getBuildingRuntime(place.id);
      if (runtime.closed) continue;
      const spec = this.getBuildingSpecialization(place.id);
      for (const [key, value] of Object.entries(spec?.effects?.dailyDeltas || {})) {
        deltas[key] = (deltas[key] || 0) + value;
      }
      if (spec?.effects?.dailyDeltas && this.day % 4 === 0) {
        lines.push(`${place.name} (${spec.name})`);
      }
    }
    if (Object.keys(deltas).length) this.applyDeltas(deltas);
    if (lines.length) this.addReportLine('economy', `Specializations produced side effects: ${lines.join(', ')}.`);
  }

  getProductionState(place) {
    if (!place?.id) return null;
    const baseId = getBaseBuildingId(place.baseId || place.id);
    const runtime = this.getBuildingRuntime(place.id);
    runtime.production = normalizeProductionRuntime(runtime.production, baseId);
    return runtime.production;
  }

  getProductionRecipes(place) {
    const baseId = getBaseBuildingId(place?.baseId || place?.id);
    return RECIPES_BY_BUILDING[baseId] || [];
  }

  getProductionRank() {
    return this.getTownRankSnapshot().index;
  }

  setProductionRecipeFromUi(token) {
    const [placeId, recipeId] = String(token || '').split(':');
    const place = this.buildingById?.[placeId];
    const recipe = RECIPE_BY_ID[recipeId];
    if (!place || !recipe || recipe.building !== getBaseBuildingId(place.baseId || place.id)) return;
    if (this.getProductionRank() < recipe.minRank) {
      this.game.events.emit('gwg-event', `Recipe locked until Town Rank ${recipe.minRank + 1}. The foreman has laminated the refusal.`);
      return;
    }
    const state = this.getProductionState(place);
    state.recipeId = recipeId;
    state.progress = 0;
    state.lastStatus = `Selected: ${recipe.name}`;
    this.game.events.emit('gwg-event', `${place.name} selected ${recipe.name}. Materials began negotiating.`);
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  toggleProductionFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    if (!place) return;
    const state = this.getProductionState(place);
    state.paused = !state.paused;
    state.lastStatus = state.paused ? 'Paused by player' : 'Ready';
    this.game.events.emit('gwg-event', `${place.name} production ${state.paused ? 'paused' : 'resumed'}. The machinery took this personally.`);
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  cycleProductionPriorityFromUi(placeId) {
    const place = this.buildingById?.[placeId];
    if (!place) return;
    const state = this.getProductionState(place);
    const order = ['low', 'normal', 'high'];
    state.priority = order[(order.indexOf(state.priority) + 1) % order.length];
    this.game.events.emit('gwg-event', `${place.name} priority: ${PRODUCTION_PRIORITIES[state.priority].label}. Urgency has been formally categorized.`);
    this.saveGame(false);
    this.showPlaceInspector(place);
  }

  recordProductionFlow(target, values) {
    for (const [id, amount] of Object.entries(values || {})) {
      if (id === 'gold') continue;
      target[id] = (target[id] || 0) + amount;
    }
  }

  getProductionSpeed(place, state) {
    const priority = PRODUCTION_PRIORITIES[state.priority] || PRODUCTION_PRIORITIES.normal;
    const level = this.getPlaceLevel(place);
    const spec = this.getBuildingSpecializationEffects(place.id);
    const district = this.getDistrictBonusesForPlace(place)
      .reduce((sum, bonus) => sum + (Number(bonus.productionBonus) || 0), 0);
    const tools = Math.min(0.4, (this.townInventory.tools || 0) * 0.04);
    const evolution = Math.min(0.5, Math.floor((state.batches || 0) / 12) * 0.1);
    return Math.max(0.25, priority.progress + (level - 1) * 0.12 + district * 0.18 + tools + evolution + (Number(spec.productionBonus) || 0) * 0.18);
  }

  runProductionStep() {
    this.productionSummary.producedToday = {};
    this.productionSummary.consumedToday = {};
    for (const placement of this.cityState.placedBuildings) {
      const place = this.buildingById?.[placement.id];
      if (!place?.isPlaced || !this.getProductionRecipes(place).length) continue;
      const runtime = this.getBuildingRuntime(place.id);
      const state = this.getProductionState(place);
      const recipe = RECIPE_BY_ID[state.recipeId] || RECIPE_BY_ID[DEFAULT_RECIPE_BY_BUILDING[getBaseBuildingId(place.baseId || place.id)]];
      if (!recipe) continue;
      if (runtime.closed || state.paused) {
        state.lastStatus = runtime.closed ? 'Closed' : 'Paused by player';
        continue;
      }
      if (!this.getBuildingRoadAccess(place).connected) {
        state.lastStatus = 'Waiting: no road access';
        continue;
      }
      if (this.getProductionRank() < recipe.minRank) {
        state.lastStatus = `Locked until Town Rank ${recipe.minRank + 1}`;
        continue;
      }
      const priority = PRODUCTION_PRIORITIES[state.priority] || PRODUCTION_PRIORITIES.normal;
      if (priority.upkeep > 0 && this.resources.gold < priority.upkeep) {
        state.lastStatus = 'Waiting: high-priority overtime unpaid';
        continue;
      }
      const spec = this.getBuildingSpecializationEffects(place.id);
      const inputs = { ...recipe.inputs };
      if (spec.inputEfficiency) {
        const firstInput = Object.keys(inputs)[0];
        if (firstInput) inputs[firstInput] = Math.max(1, inputs[firstInput] - spec.inputEfficiency);
      }
      if (!hasRecipeInputs(this.townInventory, inputs)) {
        state.lastStatus = `Waiting: needs ${formatResourceAmountMap(inputs)}`;
        continue;
      }
      state.progress += this.getProductionSpeed(place, state);
      if (state.progress < recipe.days) {
        state.lastStatus = `Working: ${Math.floor((state.progress / recipe.days) * 100)}%`;
        continue;
      }
      state.progress = Math.max(0, state.progress - recipe.days);
      for (const [id, amount] of Object.entries(inputs)) {
        this.townInventory[id] = Math.max(0, (this.townInventory[id] || 0) - amount);
        this.stats.resourcesSpent = (this.stats.resourcesSpent || 0) + amount;
      }
      if (priority.upkeep > 0) this.applyDeltas({ gold: -priority.upkeep });
      this.recordProductionFlow(this.productionSummary.consumedToday, inputs);
      for (const [id, baseAmount] of Object.entries(recipe.outputs)) {
        const amount = Math.max(1, baseAmount + Math.max(0, Number(spec.productionBonus) || 0));
        if (id === 'gold') this.applyDeltas({ gold: amount });
        else state.outputBuffer[id] = (state.outputBuffer[id] || 0) + amount;
        this.recordProductionFlow(this.productionSummary.producedToday, { [id]: amount });
      }
      if (recipe.corruption || recipe.trust) this.applyDeltas({ corruption: recipe.corruption, trust: recipe.trust });
      state.batches += 1;
      state.resourcesProcessed += Object.values(inputs).reduce((sum, amount) => sum + amount, 0);
      state.lastStatus = `Batch complete: ${formatResourceAmountMap(recipe.outputs)}`;
      runtime.productionDone = (runtime.productionDone || 0) + 1;
      runtime.servicesProvided = (runtime.servicesProvided || 0) + 1;
      runtime.upgradeProgress = Math.min(100, (runtime.upgradeProgress || 0) + 3);
      if ([8, 20, 40].includes(state.batches)) {
        runtime.serviceQuality = (runtime.serviceQuality || 1) + 1;
        const evolutionText = `${place.name} evolved through use after ${state.batches} batches. Efficiency gained a tiny hat.`;
        this.addTownLog(evolutionText, 'upgrade');
        this.addReportLine('unlocks', evolutionText);
        this.floatText(place.x, place.y - (place.h || 56) - 18, 'PRODUCTION EVOLVED', '#7fdc93');
        const sprite = this.placeSpriteById?.[place.id];
        if (sprite) {
          sprite.setTint(0xfff3c0);
          this.time.delayedCall(320, () => sprite.clearTint?.());
        }
      }
      if (getBaseBuildingId(place.baseId || place.id) === 'market') runtime.lootProcessed = (runtime.lootProcessed || 0) + 1;
      this.addReportLine('economy', `${place.name}: ${recipe.flavor}`);
    }
    this.dispatchProductionCarriers();
  }

  dispatchProductionCarriers() {
    if (!this.isBuilderCity) {
      for (const placement of this.cityState.placedBuildings) {
        const place = this.buildingById?.[placement.id];
        const state = place && this.getProductionRecipes(place).length ? this.getProductionState(place) : null;
        if (!state) continue;
        for (const [id, amount] of Object.entries(state.outputBuffer)) {
          const delivered = this.addTownResource(id, amount, place.name);
          state.outputBuffer[id] = Math.max(0, amount - delivered);
        }
      }
      return;
    }
    this.carriers = (this.carriers || []).filter((carrier) => carrier.container?.active);
    const depotCapacity = this.getPlacedBuildingsByBaseId('caravan_depot')
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    const maxCarriers = (this.rsp?.compact ? 3 : 6) + depotCapacity * 2;
    for (const placement of this.cityState.placedBuildings) {
      if (this.carriers.length >= maxCarriers) break;
      const place = this.buildingById?.[placement.id];
      const state = place && this.getProductionRecipes(place).length ? this.getProductionState(place) : null;
      if (!state) continue;
      for (const [resource, buffered] of Object.entries(state.outputBuffer)) {
        if (this.carriers.length >= maxCarriers) break;
        if (buffered <= 0 || this.carriers.some((carrier) => carrier.originId === place.id && carrier.resource === resource)) continue;
        const load = Math.min(buffered, 5);
        const started = this.spawnCarrier(place, resource, load, null, place.name, {
          directFallback: false,
          originId: place.id,
          onLeftover: (leftover) => { state.outputBuffer[resource] = (state.outputBuffer[resource] || 0) + leftover; },
        });
        if (started) state.outputBuffer[resource] -= load;
        else state.lastStatus = 'Waiting: no Warehouse, Storehouse, Market, or Guild Hall route';
      }
    }
  }

  runHeroSupplyStep() {
    let missingWeapons = 0;
    let missingArmor = 0;
    for (const hero of this.getActiveHeroes()) {
      hero.stats.equipment = normalizeHeroEquipment(hero.stats.equipment);
      const equipment = hero.stats.equipment;
      if (equipment.weapon === 'Poor') missingWeapons += 1;
      if (equipment.armor === 'Poor' && this.getHeroTierIndex(hero) >= 2) missingArmor += 1;
      equipment.readiness = Phaser.Math.Clamp(
        45 + (equipment.weapon !== 'Poor' ? 18 : 0) + (equipment.armor !== 'Poor' ? 16 : 0) + equipment.potions * 5 + Math.floor((hero.stats.morale || 0) / 5),
        0,
        100,
      );
      if (this.isHeroInjured(hero) && equipment.potions > 0) {
        equipment.potions -= 1;
        hero.stats.injuredUntilDay = Math.max(this.day, (hero.stats.injuredUntilDay || this.day) - 2);
        this.addTownLog(`${hero.def.name} used a carried potion. Recovery stopped being entirely theoretical.`, 'npc');
      } else if (this.isHeroInjured(hero) && (this.townInventory.potions || 0) > 0) {
        this.townInventory.potions -= 1;
        hero.stats.injuredUntilDay = Math.max(this.day, (hero.stats.injuredUntilDay || this.day) - 1);
      }
      if (this.getHeroTierIndex(hero) >= 2 && equipment.weapon === 'Poor') {
        hero.stats.morale = Phaser.Math.Clamp((hero.stats.morale || 0) - 1, 0, 100);
        hero.stats.loyalty = Phaser.Math.Clamp((hero.stats.loyalty || 0) - 1, 0, 100);
      }
    }
    if (missingWeapons || missingArmor) {
      this.addReportLine('warnings', `Hero supply: ${missingWeapons} need weapons, ${missingArmor} veteran-tier heroes need armor.`);
    }
    const infirmaries = this.getPlacedBuildingsByBaseId('infirmary')
      .filter((place) => !this.getBuildingRuntime(place.id).closed && this.getBuildingRoadAccess(place).connected);
    let treatmentSlots = infirmaries.reduce((sum, place) => sum + 2 + this.getPlaceLevel(place) * 2, 0);
    for (const hero of this.getActiveHeroes().filter((entry) => this.isHeroInjured(entry))) {
      if (treatmentSlots <= 0 || (this.townInventory.potions || 0) <= 0) break;
      this.townInventory.potions -= 1;
      treatmentSlots -= 1;
      hero.stats.injuredUntilDay = Math.max(this.day, (hero.stats.injuredUntilDay || this.day) - 1);
      const infirmary = infirmaries.find((place) => Phaser.Math.Distance.Between(place.x, place.y, hero.container.x, hero.container.y) <= 620) || infirmaries[0];
      if (infirmary) {
        const runtime = this.getBuildingRuntime(infirmary.id);
        runtime.servicesProvided = (runtime.servicesProvided || 0) + 1;
      }
    }
    const appraisers = this.getPlacedBuildingsByBaseId('loot_appraiser')
      .filter((place) => !this.getBuildingRuntime(place.id).closed && this.getBuildingRoadAccess(place).connected);
    const appraised = Math.min(appraisers.length, this.townInventory.loot || 0);
    if (appraised > 0) {
      this.townInventory.loot -= appraised;
      this.addTownResource('tradeGoods', appraised);
      for (const place of appraisers.slice(0, appraised)) {
        const runtime = this.getBuildingRuntime(place.id);
        runtime.lootProcessed = (runtime.lootProcessed || 0) + 1;
        runtime.servicesProvided = (runtime.servicesProvided || 0) + 1;
      }
      this.addReportLine('economy', `${appraised} loot lot${appraised === 1 ? '' : 's'} appraised into Trade Goods. Narrative fees were assessed.`);
    }
    const hunterStrength = this.getPlacedBuildingsByBaseId('monster_hunter_lodge')
      .filter((place) => !this.getBuildingRuntime(place.id).closed)
      .reduce((sum, place) => sum + this.getPlaceLevel(place), 0);
    if (hunterStrength > 0) {
      const lair = Object.values(this.monsterLairs || {})
        .filter((entry) => entry.discovered && !entry.cleared)
        .sort((a, b) => (b.pressure || 0) - (a.pressure || 0))[0];
      if (lair) lair.pressure = Math.max(0, (lair.pressure || 0) - Math.min(3, hunterStrength));
    }
    const gravekeepers = this.getPlacedBuildingsByBaseId('gravekeeper_hut')
      .filter((place) => !this.getBuildingRuntime(place.id).closed);
    if (gravekeepers.length) {
      const worstArea = Object.entries(this.areaReputation || {})
        .filter(([, danger]) => Number(danger) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      if (worstArea) {
        this.changeAreaReputation(worstArea[0], -Math.min(2, gravekeepers.length), 'Gravekeeper memorial care');
        const runtime = this.getBuildingRuntime(gravekeepers[0].id);
        runtime.servicesProvided = (runtime.servicesProvided || 0) + 1;
      }
    }
  }

  runTradeStep() {
    if (!this.tradeSettings.autoExport || !this.isBuildingPlaced('market')) return;
    const id = this.tradeSettings.preferredExport;
    const reserve = this.tradeSettings.reserves[id] || 0;
    const amount = Math.min(3, Math.max(0, (this.townInventory[id] || 0) - reserve));
    const price = TRADE_PRICES[id]?.sell || 0;
    if (amount <= 0 || price <= 0) return;
    this.townInventory[id] -= amount;
    const gold = amount * price;
    this.applyDeltas({ gold });
    const market = this.getPlacedBuildingsByBaseId('market')[0];
    if (market) {
      const runtime = this.getBuildingRuntime(market.id);
      runtime.lootProcessed = (runtime.lootProcessed || 0) + amount;
      runtime.servicesProvided = (runtime.servicesProvided || 0) + amount;
    }
    this.addReportLine('economy', `External trade sold ${amount} ${RESOURCE_BY_ID[id]?.label || id} for ${gold}g. The price was stable and therefore suspicious.`);
  }

  maybeRunProductionIncident() {
    if (this.day < 4 || Math.random() > 0.14) return;
    const active = this.cityState.placedBuildings
      .map((placement) => this.buildingById?.[placement.id])
      .filter((place) => place?.isPlaced && this.getProductionRecipes(place).length && !this.getBuildingRuntime(place.id).closed);
    if (!active.length) return;
    const place = Phaser.Utils.Array.GetRandom(active);
    const baseId = getBaseBuildingId(place.baseId || place.id);
    let text = '';
    if (baseId === 'sawmill' && (this.townInventory.planks || 0) > 0) {
      const lost = Math.min(2, this.townInventory.planks);
      this.townInventory.planks -= lost;
      text = `Sawmill spark incident: ${lost} planks became atmosphere. The fire marshal requested straighter grain.`;
    } else if (baseId === 'blacksmith' && (this.townInventory.tools || 0) > 0) {
      this.townInventory.tools -= 1;
      text = 'Blacksmith tool shortage: one tool broke while making tools. The loop was declared vertical integration.';
    } else if (baseId === 'potion_shop') {
      this.applyDeltas({ morale: 2, corruption: 1 });
      text = 'A potion batch caused temporary confidence. Side effects included volunteering.';
    } else if (baseId === 'premium_fabricator' && (this.townInventory.premiumComponents || 0) > 0) {
      this.townInventory.premiumComponents -= 1;
      this.applyDeltas({ corruption: 1 });
      text = 'A premium component became obsolete overnight. The replacement has the same shape and better monetization.';
    } else if (baseId === 'market' && (this.townInventory.tradeGoods || 0) > 0) {
      this.townInventory.tradeGoods -= 1;
      text = 'The Market announced a sale on goods already owned. One crate vanished into promotional accounting.';
    } else if (baseId === 'salvage_yard' && (this.townInventory.loot || 0) > 0) {
      this.townInventory.loot -= 1;
      this.addTownResource('tradeGoods', 1);
      text = 'The Salvage Yard found a useful object by accident. Management denied setting a precedent.';
    }
    if (!text) return;
    this.productionSummary.incidents.push({ day: this.day, placeId: place.id, text });
    this.productionSummary.incidents = this.productionSummary.incidents.slice(-8);
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.addReportLine('warnings', text);
  }

  // day-cycle step: lodging pressure + simple production conversions
  runTownServicesStep() {
    this.walkerDailyTally = { threatReduction: 0, evangelistGold: 0 };
    this.applyBuildingUpkeep();
    this.applyDistrictDailyEffects();
    this.applySpecializationDailyEffects();
    // extract from nodes/forest and regrow before production consumes stock
    this.runExtractionStep();
    this.regrowForest();

    // hero lodging: over capacity drains morale and trust, quietly but daily
    const lodging = this.getLodgingReport();
    if (lodging.homeless > 0) {
      const victims = this.getActiveHeroes()
        .sort((a, b) => (a.stats.loyalty || 0) - (b.stats.loyalty || 0))
        .slice(0, lodging.homeless);
      for (const hero of victims) {
        hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - 3, 0, 100);
        hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) + 2, 0, 100);
      }
      this.applyDeltas({ morale: -Math.min(3, lodging.homeless), trust: -1 });
      const text = `${lodging.homeless} hero${lodging.homeless === 1 ? '' : 'es'} slept outside (beds ${lodging.used}/${lodging.beds}). Reviews were written in dew.`;
      this.game.events.emit('gwg-event', text);
      this.addReportLine('warnings', text);
      this.stats.heroInjuries = this.stats.heroInjuries || 0;
    }

    this.runProductionStep();
    this.runTradeStep();
    this.runHeroSupplyStep();

    // clear expired injury visuals after supplies and rest have done their work
    for (const hero of this.getActiveHeroes()) {
      if (!this.isHeroInjured(hero) && !hero.stats.deathDay && hero.stats.injuryState !== 'healthy') {
        hero.stats.injuryState = 'healthy';
        this.setHeroAnimationState(hero, hero.state === 'walking' ? 'walk' : 'idle');
      }
    }
    this.maybeRunProductionIncident();
  }

  // --- service walkers (Caesar-style, lightweight) ---------------------------

  startServiceWalkers() {
    if (!this.isBuilderCity) return;
    this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => this.spawnServiceWalker(),
    });
  }

  spawnServiceWalker() {
    if (this.cycleRunning || this.simulationSpeed === 0) return;
    const maxWalkers = this.rsp?.compact ? 1 : 2;
    this.serviceWalkers = this.serviceWalkers.filter((walker) => walker.container.active);
    if (this.serviceWalkers.length >= maxWalkers) return;

    // round-robin through placed, road-connected service buildings
    const sources = Object.values(this.buildingById || {}).filter((place) => {
      const baseId = place?.baseId || getBaseBuildingId(place?.id);
      return place?.isPlaced
        && SERVICE_WALKERS[baseId]
        && this.getBuildingRoadAccess(place).connected
        && !this.getBuildingRuntime(place.id).closed;
    });
    if (!sources.length) return;
    const sourcePlace = sources[this.walkerRotation % sources.length];
    this.walkerRotation += 1;
    const buildingId = sourcePlace.id;
    const config = SERVICE_WALKERS[sourcePlace.baseId || getBaseBuildingId(sourcePlace.id)];
    const door = this.doorById[buildingId];
    if (!door) return;

    // destination: another door spot within walker range, roads preferred by
    // the shared hero routing
    const range = config.rangeTiles * GRID_CONFIG.tileSize;
    const targets = (this.doorSpots || []).filter((spot) => (
      spot.id !== buildingId
      && this.placeById?.[spot.id]?.isPlaced !== false
      && Phaser.Math.Distance.Between(door.x, door.y, spot.x, spot.y) <= range
    ));
    if (!targets.length) return;
    const target = Phaser.Utils.Array.GetRandom(targets);

    const textureKey = this.textures.exists(config.assetKey)
      ? config.assetKey
      : resolveTexture(this, config.fallbackKey, 'hero_default');
    if (!textureKey || !this.textures.exists(textureKey)) return;
    const sprite = this.add.image(0, 0, textureKey).setOrigin(0.5, 1);
    sprite.setScale(this.getTextureScaleForHeight(textureKey, 26, 1.2));
    if (!this.textures.exists(config.assetKey) && config.tint) sprite.setTint(config.tint);
    const label = this.add.text(0, 2, config.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#d4dae2',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setAlpha(0);
    const container = this.add.container(door.x, door.y, [sprite, label]).setDepth(door.y);

    const walker = {
      // assetKey keeps the worker texture through the animation state machine
      // (without it, heroTexture() would swap walkers to hero_default mid-walk)
      def: { id: `walker-${config.id}`, name: config.name, speed: 72, assetKey: textureKey },
      sprite,
      container,
      stats: { health: config.id === 'guard_patrol' ? 62 : 38, maxHealth: config.id === 'guard_patrol' ? 62 : 38, active: true },
      walker: true,
      serviceRole: config.id,
      spriteHeight: 26,
      originId: buildingId,
      originName: sourcePlace.name,
      destinationName: target.name || this.getPlaceName(target.id),
      currentAction: config.flavor,
    };
    this.prepareHeroAnimation(walker);
    this.serviceWalkers.push(walker);
    walker.targetEntry = this.registerWorldInteractionTarget({
      id: `service-${config.id}-${buildingId}-${this.time.now}`,
      type: 'service',
      hit: container,
      img: container,
      walker,
      width: 42,
      height: 54,
      getCenter: () => ({ x: container.x, y: container.y - 24 }),
      onHoverIn: () => {
        sprite.setTint(0xfff3c0);
        label.setAlpha(1);
      },
      onHoverOut: () => {
        if (!this.textures.exists(config.assetKey) && config.tint) sprite.setTint(config.tint);
        else sprite.clearTint?.();
        if (this.activeInspector?.id !== walker.def.id) label.setAlpha(0);
      },
      onSelect: () => this.showServiceWalkerInspector(walker, config),
    });
    this.walkTo(walker, target, () => {
      this.applyWalkerService(buildingId, config, target);
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 700,
        delay: 500,
        onComplete: () => {
          this.worldInteractionTargets = this.worldInteractionTargets.filter((entry) => entry !== walker.targetEntry);
          container.destroy();
        },
      });
    });
  }

  showServiceWalkerInspector(walker, config = null) {
    if (!walker?.container?.active) return;
    const walkerConfig = config || Object.values(SERVICE_WALKERS).find((entry) => entry.name === walker.def?.name);
    this.activeInspector = { type: 'service', id: walker.def.id };
    this.game.events.emit('gwg-inspector-open', {
      panelType: 'service-inspector',
      title: walker.def.name,
      subtitle: 'Service Walker',
      sections: [
        {
          title: 'Current Route',
          lines: [
            `Origin: ${walker.originName || 'Unknown building'}`,
            `Destination: ${walker.destinationName || 'nearby town service point'}`,
            `Current work: ${walker.currentAction || walkerConfig?.flavor || 'walking with purpose'}`,
          ],
        },
        {
          title: 'Service Effect',
          lines: [
            walkerConfig?.flavor || 'Provides a small local service while walking roads.',
            this.getWalkerEffectLine(walkerConfig?.id),
          ].filter(Boolean),
        },
      ],
    });
  }

  getWalkerEffectLine(id) {
    const effects = {
      tavern_keeper: 'Nearby heroes gain morale and rest coverage.',
      quest_clerk: 'Nearby heroes gain loyalty and quest awareness.',
      gear_runner: 'Nearby heroes can receive gear support.',
      trader: 'Nearby loot flow improves.',
      guard_patrol: 'Local threat pressure drops when patrols connect.',
      potion_seller: 'Injured heroes recover more reliably.',
      premium_evangelist: 'Gold rises, and so does premium exposure.',
    };
    return effects[id] || 'Service coverage improves while the route is active.';
  }

  applyWalkerService(buildingId, config, spot) {
    this.recordBuildingUse(buildingId);
    const runtime = this.getBuildingRuntime(buildingId);
    runtime.servicesProvided = (runtime.servicesProvided || 0) + 1;
    const nearby = this.getActiveHeroes().filter((hero) => (
      hero.state !== 'away'
      && Phaser.Math.Distance.Between(hero.container.x, hero.container.y, spot.x, spot.y) < 220
    ));
    const clampStat = (hero, key, delta, max = 100) => {
      hero.stats[key] = Phaser.Math.Clamp((hero.stats[key] || 0) + delta, 0, max);
    };
    let floatLine = '';
    switch (config.id) {
      case 'tavern_keeper':
        for (const hero of nearby) clampStat(hero, 'morale', 2);
        floatLine = nearby.length ? '+morale' : '';
        break;
      case 'quest_clerk':
        for (const hero of nearby) clampStat(hero, 'loyalty', 1);
        floatLine = nearby.length ? '+loyalty' : '';
        break;
      case 'gear_runner': {
        const needy = nearby.find((hero) => (hero.stats.power || 0) < 6);
        if (needy && (this.townInventory.weapons || 0) > 0) {
          this.townInventory.weapons -= 1;
          needy.stats.equipment = normalizeHeroEquipment(needy.stats.equipment);
          needy.stats.equipment.weapon = this.getEquipmentQualityForTown();
          floatLine = `${needy.def.name} +weapon`;
        }
        break;
      }
      case 'trader':
        if ((this.townInventory.loot || 0) > 0) {
          this.townInventory.loot -= 1;
          this.applyDeltas({ gold: 14 });
          floatLine = '+14g';
        }
        break;
      case 'guard_patrol':
        if (this.walkerDailyTally.threatReduction < WALKER_DAILY_CAPS.threatReduction && this.resources.threat > 0) {
          this.walkerDailyTally.threatReduction += 1;
          this.applyDeltas({ threat: -1 });
          floatLine = '-threat';
        }
        break;
      case 'potion_seller': {
        const injured = nearby.find((hero) => this.isHeroInjured(hero));
        if (injured && (this.townInventory.potions || 0) > 0) {
          this.townInventory.potions -= 1;
          injured.stats.injuredUntilDay = 0;
          floatLine = `${injured.def.name} healed`;
        } else {
          for (const hero of nearby) clampStat(hero, 'morale', 1);
        }
        break;
      }
      case 'premium_evangelist':
        if (this.walkerDailyTally.evangelistGold < WALKER_DAILY_CAPS.evangelistGold) {
          this.walkerDailyTally.evangelistGold += 6;
          this.applyDeltas({ gold: 6, corruption: Math.random() < 0.3 ? 1 : 0 });
          for (const hero of nearby.filter((item) => this.isHonestHero(item.def))) clampStat(hero, 'envy', 2);
          floatLine = '+6g "optional"';
        }
        break;
      default:
        break;
    }
    if (floatLine) this.floatText(spot.x, spot.y - 40, floatLine, '#d7f3d0');
  }

  // player-ordered POI visit: pick the best free hero, walk them out, roll
  // the outcome on arrival, cooldown the POI (persisted)
  runPoiAction(poiId) {
    const place = this.explorationPointById?.[poiId];
    if (!place || !this.isRevealed(place.gridX, place.gridY)) return;
    if (this.getPoiCooldownDay(poiId) > this.day) {
      this.game.events.emit('gwg-event', 'That spot was just visited. Even wilderness needs downtime.');
      return;
    }
    const hero = this.getActiveHeroes()
      .filter((item) => item.state !== 'away' && !this.isHeroInjured(item))
      .sort((a, b) => (b.stats.power || 0) - (a.stats.power || 0))[0];
    if (!hero) {
      this.game.events.emit('gwg-event', 'No able hero is free. The wilderness will keep.');
      return;
    }
    const actionConfig = this.getPoiActionConfig(place);
    this.poiCooldowns = this.poiCooldowns || {};
    this.poiCooldowns[poiId] = this.day + 2;
    hero.currentAction = `${actionConfig.verb} ${place.name}`;
    hero.intent = {
      action: hero.currentAction,
      destinationId: place.id,
      destinationName: place.name,
      reason: this.getPoiRewardPreview(place, actionConfig),
      risk: this.getPoiDangerLabel(place, actionConfig),
    };
    const spot = {
      id: place.id,
      name: place.name,
      x: place.x,
      y: place.y,
      h: place.h || 40,
      intentAction: `${actionConfig.verb} ${place.name}`,
      reason: this.getPoiRewardPreview(place, actionConfig),
      risk: this.getPoiDangerLabel(place, actionConfig),
      explore: true,
    };
    this.game.events.emit('gwg-event', `${hero.def.name} set out for the ${place.name}.`);
    this.walkTo(hero, spot, () => {
      this.resolvePoiVisit(hero, place, actionConfig);
      this.scheduleAmbient(hero, Phaser.Math.Between(2600, 5200));
    });
    this.stats.poiActions = (this.stats.poiActions || 0) + 1;
    this.checkObjectives();
    this.publishTownHint();
    this.saveGame(false);
    if (this.activeInspector?.type === 'place') this.showPlaceInspector(place);
  }

  resolvePoiVisit(hero, place, actionConfig) {
    const yieldConfig = POI_RESOURCE_YIELDS[place.id];
    if (actionConfig.id === 'harvest' && yieldConfig) {
      const amount = Phaser.Math.Between(yieldConfig.min + 1, yieldConfig.max + 2);
      const gained = this.addTownResource(yieldConfig.resource, amount, `${hero.def.name}'s harvest run`);
      const deltas = { morale: 1 };
      if (yieldConfig.premium && Math.random() < 0.5) deltas.corruption = 1;
      this.applyDeltas(deltas);
      this.floatText(place.x, place.y - 44, `+${gained} ${yieldConfig.resource}`, '#d7f3d0');
      this.say(hero, 'Honest cargo.', true);
      const text = `${hero.def.name} harvested ${gained} ${yieldConfig.resource} at the ${place.name}.`;
      this.game.events.emit('gwg-event', text);
      this.addReportLine('quests', text);
      this.stats.resourcesCollected = (this.stats.resourcesCollected || 0) + Math.max(1, gained);
      this.checkObjectives();
      this.publishTownHint();
      return;
    }
    if (actionConfig.id === 'clear') {
      const monster = place.monsterSource
        ? (MONSTERS.find((entry) => entry.id === place.monsterSource) || rollMonster())
        : rollMonster();
      const support = this.getPlaceLevel(this.buildingById.watchtower)
        + this.getHeroEquipmentBonus(hero).power;
      const success = (hero.stats.power || 0) + support + Phaser.Math.Between(0, 7) >= monster.threat * 3 + 3;
      this.showMonsterEncounter(monster, place.x, place.y);
      if (success) {
        const deltas = { gold: 26 + monster.threat * 14, threat: -(4 + monster.threat * 2), morale: 2 };
        this.applyDeltas(deltas);
        this.floatDeltas(place.x, place.y - 48, deltas);
        hero.stats.power += 1;
        hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + monster.threat * 2, 0, 100);
        this.addHeroHistory(hero, `Cleared ${place.name}.`);
        const text = `${hero.def.name} cleared the ${place.name}. ${getSatireLine('monster', monster.id, 'defeat', { day: this.day, fallback: monster.flavour })} The area feels safer.`;
        this.game.events.emit('gwg-event', text);
        this.addTownLog(text, 'monster');
        this.addReportLine('quests', text);
      } else {
        hero.stats.injuredUntilDay = this.day + 2;
        hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - 6, 0, 100);
        this.setHeroAnimationState(hero, 'hurt');
        const deltas = { threat: monster.threat, morale: -2 };
        this.applyDeltas(deltas);
        this.floatDeltas(place.x, place.y - 48, deltas);
        this.addHeroHistory(hero, `Was driven off from ${place.name}.`);
        const text = `${hero.def.name} was driven off from the ${place.name} and limped home. ${getSatireLine('monster', monster.id, 'victory', { day: this.day, fallback: monster.flavour })}`;
        this.game.events.emit('gwg-event', text);
        this.addTownLog(text, 'monster');
        this.addReportLine('warnings', text);
      }
      return;
    }
    // investigate: a small grab-bag outcome
    const roll = Math.random();
    if (roll < 0.4) {
      const gold = Phaser.Math.Between(20, 60);
      this.applyDeltas({ gold });
      this.floatText(place.x, place.y - 44, `+${gold}g`, '#ffe08a');
      const text = `${hero.def.name} investigated the ${place.name} and found ${gold}g in suspiciously labeled pouches.`;
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'exploration');
      this.stats.lootCollected = (this.stats.lootCollected || 0) + 1;
      this.checkObjectives();
      this.publishTownHint();
    } else if (roll < 0.7) {
      const gained = this.addTownResource('loot', Phaser.Math.Between(1, 2), `${hero.def.name}'s find`);
      this.floatText(place.x, place.y - 44, `+${gained} loot`, '#d7f3d0');
      const text = `${hero.def.name} pulled ${gained} loot out of the ${place.name}.`;
      this.game.events.emit('gwg-event', text);
      this.addTownLog(text, 'exploration');
      this.stats.resourcesCollected = (this.stats.resourcesCollected || 0) + Math.max(1, gained);
      this.checkObjectives();
      this.publishTownHint();
    } else {
      this.applyDeltas({ morale: 1 });
      this.say(hero, 'Just vibes here.', true);
      this.game.events.emit('gwg-event', `${hero.def.name} investigated the ${place.name}. Findings: atmosphere, mild dread, no revenue.`);
    }
  }

  // reads the maintained reputation score (calculateTownReputation owns the
  // formula; this is just the accessor the rank/advisor systems use)
  getTownReputation() {
    return Math.round(Phaser.Math.Clamp(Number(this.townReputation) || 0, 0, 100));
  }

  getTownRankScore() {
    const activeHeroes = this.getActiveHeroes().length;
    const lodging = this.getLodgingReport();
    const batches = Object.values(this.cityState?.buildingRuntime || {})
      .reduce((sum, runtime) => sum + (Number(runtime.production?.batches) || 0), 0);
    const territory = this.revealedTiles?.size || 0;
    const balance = Math.max(0, Math.min(this.resources.trust, 100 - this.resources.corruption));
    return Phaser.Math.Clamp(Math.round(
      this.getTownReputation() * 0.24
      + this.townPrestige * 0.16
      + Math.min(12, activeHeroes) * 1.15
      + Math.min(12, this.stats.questsCompleted || 0) * 1.1
      + Math.min(14, batches) * 0.8
      + Math.min(8, lodging.beds) * 0.45
      + (100 - this.resources.threat) * 0.08
      + Math.min(10, Math.floor(territory / 80))
      + balance * 0.08,
    ), 0, 100);
  }

  getTownRankSnapshot() {
    const score = this.getTownRankScore();
    const rank = getRankForScore(score);
    const index = Math.max(0, TOWN_RANKS.findIndex((item) => item.id === rank.id));
    const next = TOWN_RANKS[index + 1] || null;
    return {
      ...rank,
      tier: index,
      index,
      score,
      next,
      remaining: next ? Math.max(0, next.score - score) : 0,
      requirements: [
        `Reputation ${this.getTownReputation()}/100 and prestige ${this.townPrestige}/100`,
        `${this.getActiveHeroes().length} active heroes, ${this.stats.questsCompleted || 0} completed quests`,
        `${Object.values(this.cityState?.buildingRuntime || {}).reduce((sum, runtime) => sum + (Number(runtime.production?.batches) || 0), 0)} production batches`,
        `Safety ${100 - this.resources.threat}/100, beds ${this.getLodgingReport().used}/${this.getLodgingReport().beds}`,
      ],
    };
  }

  getTownRank() {
    return this.getTownRankSnapshot();
  }

  checkTownRankProgression(silent = false) {
    const rank = this.getTownRankSnapshot();
    if (rank.id === this.townRankId) return rank;
    const previous = TOWN_RANKS.findIndex((item) => item.id === this.townRankId);
    this.townRankId = rank.id;
    if (rank.index > previous) {
      const text = `Town Rank: ${rank.name}. ${rank.description}`;
      this.addTownLog(text, 'stage');
      this.addReportLine('unlocks', text);
      if (!silent) {
        this.game.events.emit('gwg-event', text);
        this.floatText(PLAZA.x, PLAZA.y - 126, rank.name.toUpperCase(), '#ffe08a');
      }
    }
    return rank;
  }

  // successful expeditions can carry resources home from discovered POIs
  rollExplorationHaul(hero) {
    const candidates = [...(this.discoveredPois || [])]
      .filter((id) => POI_RESOURCE_YIELDS[id])
      .filter((id) => {
        const point = this.explorationPointById?.[id];
        return point && this.isRevealed(point.gridX, point.gridY);
      });
    if (!candidates.length || Math.random() < 0.35) return '';
    const poiId = Phaser.Utils.Array.GetRandom(candidates);
    const yieldConfig = POI_RESOURCE_YIELDS[poiId];
    const point = this.explorationPointById[poiId];
    const amount = Phaser.Math.Between(yieldConfig.min, yieldConfig.max);
    const gained = this.addTownResource(yieldConfig.resource, amount);
    if (gained <= 0) return '';
    this.stats.resourcesCollected = (this.stats.resourcesCollected || 0) + Math.max(1, gained);
    this.checkObjectives();
    this.publishTownHint();
    if (yieldConfig.premium && Math.random() < 0.4) {
      this.applyDeltas({ corruption: 1 });
      this.addTownLog(`${hero.def.name} salvaged the ${point.name}. Some of it was still monetized.`, 'golden_whale');
    }
    return `Brought back ${gained} ${yieldConfig.resource} from the ${point.name}.`;
  }

  chooseExplorationAction(hero) {
    if (!this.isBuilderCity || !this.revealedTiles) return null;
    const watchtower = this.getPlaceLevel(this.buildingById.watchtower);
    const guildhall = this.getPlaceLevel(this.buildingById.guildhall);
    const dungeon = this.getPlaceLevel(this.buildingById.dungeon);
    const threatPull = Phaser.Math.Clamp((this.resources.threat - 35) * 0.005, 0, 0.22);
    const scoutingSupport = Math.min(0.08, guildhall * 0.015 + watchtower * 0.025);
    const brave = this.isHonestHero(hero.def) || this.isVeteranHero(hero.def);
    const base = dungeon > 0 ? EXPLORATION_CHANCE : EXPLORATION_CHANCE * 0.55;
    const chance = Phaser.Math.Clamp(base + threatPull + scoutingSupport + (brave ? 0.08 : 0), 0.08, 0.58);
    if (Math.random() > chance) return null;
    const monster = rollMonster();
    const spot = this.getExplorationSpot(hero);
    const areaId = spot.areaId || spot.id || 'frontier';
    const badReputation = this.getAreaReputation(areaId);
    const support = this.getPlaceLevel(this.buildingById.watchtower)
      + Math.floor(this.getPlaceLevel(this.buildingById.blacksmith) / 2)
      + Math.floor(this.getPlaceLevel(this.buildingById.training) / 2)
      + this.getHeroEquipmentBonus(hero).power
      - (this.isHeroInjured(hero) ? 2 : 0)
      - Math.floor(badReputation / 25); // dangerous reputations become self-fulfilling
    const hazardPressure = monster.threat * 3 + 4 + Math.floor(this.resources.threat / 18) + Math.floor(badReputation / 18);
    const success = hero.stats.power + support + Phaser.Math.Between(0, 8) >= hazardPressure;
    if (success) {
      const gold = 34 + monster.threat * 18 + support * 4;
      hero.stats.power += brave ? 1 : 0;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 4, 0, 100);
      hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + monster.threat * 2, 0, 100);
      this.addHeroHistory(hero, `Scouted wilderness and beat ${monster.name}.`);
      this.changeAreaReputation(areaId, -Math.max(1, monster.threat), spot.name);
      const haul = this.rollExplorationHaul(hero);
      return {
        building: 'dungeon',
        spot,
        explore: true,
        areaId,
        monster,
        text: `${hero.def.name} hunted ${monster.name} near the wilderness. ${monster.flavour}${haul ? ` ${haul}` : ''}`,
        bubble: this.pickHeroLine(hero, EXPLORATION_LINES),
        d: { gold, threat: -(3 + monster.threat * 2), morale: 1, trust: brave ? 1 : 0 },
      };
    }
    hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - 5, 0, 100);
    hero.stats.debt += monster.threat * 5;
    hero.stats.resentment = Phaser.Math.Clamp((hero.stats.resentment || 0) + monster.threat, 0, 100);
    const dangerRoll = Phaser.Math.Between(1, 100) + Math.floor(this.resources.threat / 4) + Math.floor(badReputation / 2) + monster.threat * 4;
    const deathRisk = dangerRoll > 150 && hero.stats.power < monster.threat * 4 && Math.random() < 0.28;
    const missingRisk = !deathRisk && dangerRoll > 118 && Math.random() < 0.42;
    const badlyInjured = !deathRisk && !missingRisk && dangerRoll > 96;
    const injurySeverity = badlyInjured ? 'badly injured' : 'injured';
    const injuryDays = badlyInjured ? 4 : 2;
    this.addHeroHistory(hero, `Scouted wilderness and fled ${monster.name}.`);
    this.changeAreaReputation(areaId, deathRisk ? 10 : missingRisk ? 7 : badlyInjured ? 5 : 3, spot.name);
    const failureText = deathRisk
      ? `${hero.def.name} did not return from ${monster.name}'s territory. ${monster.flavour}`
      : missingRisk
        ? `${hero.def.name} went missing after finding ${monster.name}. The wilderness kept the receipt. ${monster.flavour}`
        : `${hero.def.name} found ${monster.name} outside town and returned with debt, dust, and opinions. ${monster.flavour}`;
    return {
      building: 'dungeon',
      spot,
      explore: true,
      areaId,
      monster,
      heroDeath: deathRisk,
      heroMissing: missingRisk,
      injurySeverity,
      injuryDays,
      text: failureText,
      bubble: this.pickHeroLine(hero, EXPLORATION_LINES) || 'The wilderness has feedback.',
      d: { gold: 8, threat: monster.threat + 2, morale: -2, trust: -1 },
    };
  }

  chooseHeroAction(hero) {
    const R = this.resources;
    const tavern = this.getPlaceLevel(this.buildingById.tavern);
    const training = this.getPlaceLevel(this.buildingById.training);
    const blacksmith = this.getPlaceLevel(this.buildingById.blacksmith);
    const whale = this.getPlaceLevel(this.buildingById.whale);
    const complaint = this.getPlaceLevel(this.decorationById.complaint_barrel);
    const debtBooth = this.getPlaceLevel(this.decorationById.debt_collector_booth);
    const market = this.getPlaceLevel(this.buildingById.market);
    const exploration = this.chooseExplorationAction(hero);
    if (exploration) return exploration;

    if (
      R.trust < 30
      && this.isHonestHero(hero.def)
      && this.decorationById.complaint_barrel?.isPlaced
      && Math.random() < 0.34
    ) {
      return {
        building: 'complaint_barrel',
        text: `${hero.def.name} left town after discovering the fairness brochure was decorative.`,
        bubble: 'I need honest air.',
        d: { trust: -1, morale: -2 + Math.min(2, complaint) },
        leave: true,
      };
    }

    if (R.morale < 30 && (hero.def.personality === 'Ragequitter' || Math.random() < 0.25)) {
      return {
        building: 'tavern',
        text: `${hero.def.name} ragequit into a tavern chair. The chair requested hazard pay.`,
        bubble: 'I retire loudly.',
        d: { morale: -2 + Math.min(2, tavern), trust: -1 },
      };
    }

    if (
      R.corruption > 70
      && this.isDebtHero(hero.def)
      && this.decorationById.debt_collector_booth?.isPlaced
      && Math.random() < 0.58
    ) {
      hero.stats.debt += 18 + debtBooth * 6;
      hero.stats.corruption = Phaser.Math.Clamp((hero.stats.corruption || 0) + 5, 0, 100);
      this.addHeroHistory(hero, 'Debt became a daily route.');
      return {
        building: 'debt_collector_booth',
        text: `${hero.def.name} became a debt problem with legs. The booth applauded internally.`,
        bubble: 'My debt leveled up.',
        d: { gold: 35 + debtBooth * 18, corruption: 2 + debtBooth, morale: -2 },
      };
    }

    if (whale > 0 && this.isWhaleHero(hero.def) && Math.random() < 0.48 + whale * 0.05) {
      const purchase = Phaser.Utils.Array.GetRandom(WHALE_PURCHASES);
      const income = 100 + whale * 75 + Math.floor(R.corruption * 1.4);
      hero.stats.spent += Math.floor(income / 3);
      hero.stats.power += 1 + whale;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 5, 0, 100);
      hero.stats.corruption = Phaser.Math.Clamp((hero.stats.corruption || 0) + 4 + whale, 0, 100);
      hero.stats.fame = Phaser.Math.Clamp((hero.stats.fame || 0) + 5, 0, 100);
      this.grantPremiumItem(hero, purchase, 1 + whale);
      this.addHeroHistory(hero, `Bought ${purchase}.`);
      this.stats.whaleEvents += 1;
      return {
        building: 'whale',
        text: `${hero.def.name} bought ${purchase} and called it mastery.`,
        bubble: purchase,
        d: { gold: income, trust: -2 - Math.floor(whale / 2), corruption: 2 + whale },
        whale: true,
      };
    }

    if (this.isBuildingPlaced('dungeon') && R.threat > 65 && hero.stats.power >= 7 && Math.random() < 0.45) {
      return {
        building: 'dungeon',
        text: `${hero.def.name} pushed back the dungeon before it billed the town.`,
        bubble: 'Gate handled.',
        d: { threat: -(5 + blacksmith), morale: 1, trust: this.isHonestHero(hero.def) ? 1 : 0 },
      };
    }

    if ((training > 0 || blacksmith > 0) && this.isHonestHero(hero.def) && Math.random() < 0.58) {
      const gain = training + Math.floor(blacksmith / 2);
      hero.stats.power += gain;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 4, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + 2, 0, 100);
      this.addHeroHistory(hero, `Trained honestly for +${gain} power.`);
      return {
        building: Math.random() < 0.55 ? 'training' : 'blacksmith',
        text: `${hero.def.name} trained honestly and gained ${gain} power. A slow miracle.`,
        bubble: `+${gain} power. Earned.`,
        d: { trust: 1, morale: 1 + Math.floor(training / 2) },
      };
    }

    if (this.isBuildingPlaced('market') && hero.def.personality === 'Suspicious Merchant' && market >= 3 && Math.random() < 0.55) {
      return {
        building: 'market',
        text: `${hero.def.name} optimized prices until the price tags looked guilty.`,
        bubble: 'Dynamic suffering.',
        d: { gold: 40 + market * 18, corruption: market >= 4 ? 2 : 1, trust: market >= 4 ? -1 : 0 },
      };
    }

    const rolled = rollHeroEvent(hero.def);
    return {
      ...rolled,
      d: { ...rolled.d },
    };
  }

  runCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    this.game.events.emit('gwg-cycle-start');
    this.stats.cyclesOpened = (this.stats.cyclesOpened || 0) + 1;
    this.advanceOnboarding('openGates', false);
    this.publishTownHint();

    this.day += 1;
    this.registry.set('day', this.day);
    // Throttled safety net: at most one automatic backup snapshot per in-game
    // day, taken from the last valid save so a fresh day never overwrites
    // yesterday's recoverable town.
    maybeCreateDailyBackup(this.saveKey || getActiveSaveKey(), this.day);
    this.beginCycleReport();
    this.returnAwayHeroes();

    const steps = [];
    steps.push(() => {
      this.game.events.emit('gwg-event', `Day ${this.day}: the gates opened. So did several liability issues.`);
    });

    const questsToResolve = [...this.postedQuests];
    if (questsToResolve.length > 0) {
      for (const quest of questsToResolve) {
        steps.push(() => this.resolvePostedQuest(quest));
      }
    } else {
      steps.push(() => {
        const d = { gold: -35, morale: -2, threat: 7 };
        this.applyDeltas(d);
        this.floatDeltas(this.buildingById.guildhall.x, this.buildingById.guildhall.y - this.buildingById.guildhall.h - 10, d);
        const text = 'No quest bounties were posted. Heroes improvise, which is rarely cheaper.';
        this.game.events.emit('gwg-event', text);
        this.addReportLine('quests', text);
        this.addTownLog(text, 'quest');
      });
    }

    // Once built, the station pays loudly and invoices the social fabric.
    if (this.isBuildingPlaced('whale')) {
      steps.push(() => {
        const whale = this.buildingById.whale;
        const whaleCount = this.heroes.filter((h) => h.def.personality === 'Noble Whale').length;
        const whaleLevel = this.getPlaceLevel(whale);
        const income = BALANCE.goldenWhaleBaseIncome
          + whaleLevel * BALANCE.goldenWhaleLevelIncome
          + whaleCount * 155
          + Math.floor(this.resources.corruption * 2.2)
          + Phaser.Math.Between(0, 120);
        const d = {
          gold: income,
          trust: -Phaser.Math.Between(BALANCE.goldenWhaleTrustLoss[0], BALANCE.goldenWhaleTrustLoss[1] + whaleLevel),
          corruption: Phaser.Math.Between(
            BALANCE.goldenWhaleCorruptionGain[0] + whaleLevel,
            BALANCE.goldenWhaleCorruptionGain[1] + whaleLevel,
          ),
        };
        this.applyDeltas(d);
        this.stats.whaleEvents += 1;
        this.burstCoins(42);
        this.floatDeltas(whale.x, whale.y - whale.h - 10, d);
        this.game.events.emit('gwg-event',
          `Golden Whale Milking Station earned ${income} gold. Trust ${d.trust}, Corruption +${d.corruption}.`);
        if (d.trust < 0) this.stats.whaleTrustLosses += Math.abs(d.trust);
        this.triggerWhaleReaction();
        this.maybeBlockPoorHero();
      });

      if (Math.random() < 0.5) {
        steps.push(() => {
          const whale = this.buildingById.whale;
          const flavor = Phaser.Utils.Array.GetRandom(WHALE_FLAVOR);
          this.applyDeltas(flavor.d);
          this.floatDeltas(whale.x, whale.y - whale.h - 10, flavor.d);
          this.game.events.emit('gwg-event', flavor.text);
          this.triggerWhaleReaction();
        });
      }
    }

    // a handful of heroes act out their day: walk to the building, then speak
    const actorCount = Phaser.Math.Clamp(5 + this.getPlaceLevel(this.buildingById.guildhall), 6, 11);
    const actors = Phaser.Utils.Array.Shuffle([...this.getActiveHeroes()]).slice(0, actorCount);
    for (const hero of actors) {
      const ev = this.chooseHeroAction(hero);
      steps.push(() => {
        const b = ev.spot || this.getOperationalPlace(ev.building);
        const spot = ev.spot || this.doorById[ev.building] || this.doorById.guildhall;
        hero.currentAction = ev.explore
          ? 'Exploring the wilderness'
          : ev.whale ? 'Buying premium advantage' : `Acting at ${this.getPlaceName(ev.building)}`;
        this.applyDeltas(ev.d);
        hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + (ev.d.morale || 0) * 2, 0, 100);
        hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + (ev.d.trust || 0) * 2, 0, 100);
        if (ev.d.corruption > 0 && !hero.stats.whaleAccess && this.resources.corruption > 55) {
          hero.stats.debt += ev.d.corruption * 12;
        }
        this.floatDeltas(b.x, b.y - (b.h || 58) - 10, ev.d);
        this.game.events.emit('gwg-event', ev.text);

        // satire stat bookkeeping
        if (ev.building === 'training') hero.stats.power += this.getPlaceLevel(this.buildingById.training);
        if (ev.d.gold > 0) hero.stats.spent += ev.d.gold;
        if (ev.whale) {
          hero.stats.premiumExposure = (hero.stats.premiumExposure || 0) + 1;
          if (ev.d.trust < 0) this.stats.whaleTrustLosses += Math.abs(ev.d.trust);
          this.burstCoins(34);
          this.triggerWhaleReaction();
          this.checkUnlocks();
          for (const witness of this.getActiveHeroes().filter((item) => this.isHonestHero(item.def))) {
            witness.stats.resentment = Phaser.Math.Clamp((witness.stats.resentment || 0) + 4, 0, 100);
            witness.stats.envy = Phaser.Math.Clamp((witness.stats.envy || 0) + 8, 0, 100);
            witness.stats.resentmentTargetId = hero.def.id;
            if (witness !== hero) this.recordHeroRelationshipEvent(witness, hero, 'premium_favoritism', {
              text: `${hero.def.name} received a visible premium advantage.`,
              location: 'Golden Whale',
            });
          }
          this.buildRelationship(hero, 'whaleEvent');
        }

        const travelSpot = {
          ...spot,
          intentAction: ev.explore
            ? `Exploring ${spot.name || 'the wilderness'}`
            : ev.whale
              ? 'Seeking premium advantage'
              : `Travelling to ${this.getPlaceName(ev.building)}`,
          reason: ev.explore
            ? `Exploring ${spot.name || 'the wilderness'} for loot and map knowledge.`
            : ev.whale
              ? 'Seeking premium power. Totally optional, allegedly.'
              : `Acting on ${this.getPlaceName(ev.building)} business.`,
          risk: ev.explore ? (ev.heroDeath ? 'Extreme' : ev.heroMissing ? 'High' : this.getHeroDestinationRisk(hero, spot)) : 'Low',
          areaId: ev.areaId || spot.areaId,
          monster: ev.monster,
        };
        this.walkTo(hero, travelSpot, () => {
          if (ev.explore) {
            this.showMonsterEncounter(ev.monster, travelSpot.x, travelSpot.y);
            // expeditions chart the land they walked, win or lose
            const cell = this.worldToBuildGrid(travelSpot.x, travelSpot.y);
            this.revealArea(cell.x, cell.y, FOG_REVEAL_RADIUS.heroExplore, `${hero.def.name}'s expedition`);
            if (ev.heroDeath) {
              this.killHero(hero, `${ev.monster.name} made ${travelSpot.name} infamous.`);
              return;
            }
            if (ev.heroMissing) {
              this.markHeroMissing(hero, Phaser.Math.Between(1, 2), `${travelSpot.name} kept them overnight.`);
              return;
            }
            if (ev.injurySeverity) this.injureHero(hero, ev.injuryDays || 2, ev.injurySeverity, ev.monster.name);
          }
          this.say(hero, ev.bubble, true);
          if (ev.leave) this.sendHeroAway(hero, 2);
          else this.scheduleAmbient(hero, Phaser.Math.Between(3000, 6000));
        });
      });
    }

    // world pressure
    steps.push(() => {
      const R = this.resources;
      const marketLevel = this.getPlaceLevel(this.buildingById.market);
      const tavernLevel = this.getPlaceLevel(this.buildingById.tavern);
      const dungeonLevel = this.getPlaceLevel(this.buildingById.dungeon);
      const complaintLevel = this.getPlaceLevel(this.decorationById.complaint_barrel);
      const debtLevel = this.getPlaceLevel(this.decorationById.debt_collector_booth);
      const innLevel = this.getPlaceLevel(this.buildingById.inn);
      const hostelLevel = this.getPlaceLevel(this.buildingById.hero_hostel);
      const potionLevel = this.getPlaceLevel(this.buildingById.potion_shop);
      const watchtowerLevel = this.getPlaceLevel(this.buildingById.watchtower);
      const bankLevel = this.getPlaceLevel(this.buildingById.bank_debt_office);
      const mentorLevel = this.getPlaceLevel(this.buildingById.mentor_hall);
      const arenaLevel = this.getPlaceLevel(this.buildingById.arena);
      const vipLevel = this.getPlaceLevel(this.buildingById.vip_lounge);
      const lodgeLevel = this.getPlaceLevel(this.buildingById.premium_lodge);
      const lootboxLevel = this.getPlaceLevel(this.buildingById.lootbox_kiosk);
      const gemLevel = this.getPlaceLevel(this.buildingById.gem_exchange);
      const convenienceLevel = this.getPlaceLevel(this.buildingById.convenience_office);
      const townSizePressure = this.isBuilderCity
        ? Math.max(0, this.cityState.placedBuildings.length - 2)
          + Math.max(0, this.cityState.unlockedZones.length - 1) * 2
        : 0;
      const passive = {
        gold: marketLevel * 18
          + this.getPlaceLevel(this.buildingById.guildhall) * 6
          + bankLevel * 28
          + vipLevel * 30
          + lodgeLevel * 38
          + lootboxLevel * 24
          + gemLevel * 20
          + convenienceLevel * 24,
        trust: mentorLevel - Math.floor((vipLevel + lodgeLevel + lootboxLevel + gemLevel + convenienceLevel) / 2),
        morale: Math.max(0, tavernLevel + innLevel * 2 + hostelLevel + potionLevel + mentorLevel * 2 + complaintLevel - 2),
        corruption: (marketLevel >= 4 ? 1 : 0)
          + bankLevel
          + vipLevel
          + lodgeLevel
          + lootboxLevel
          + gemLevel
          + convenienceLevel,
        threat: Phaser.Math.Between(...BALANCE.passiveThreatBase)
          + dungeonLevel
          + townSizePressure
          + Math.floor(arenaLevel / 2)
          - watchtowerLevel * 2
          - Math.floor(complaintLevel / 2),
      };
      this.applyDeltas(passive);
      if (mentorLevel > 0) this.coolResentment(mentorLevel, 'Mentor Hall translated resentment into homework.');
      this.floatDeltas(PLAZA.x, PLAZA.y - 64, passive);
      if (passive.gold || passive.morale) {
        this.game.events.emit('gwg-event', `Town upgrades paid off: +${passive.gold}g, +${passive.morale} Morale.`);
      }
      this.checkCrises();
      if (R.trust < 30) {
        const barrel = this.getOperationalPlace('complaint_barrel');
        const d = { trust: -1, morale: -Math.max(1, 4 - complaintLevel) };
        this.applyDeltas(d);
        this.floatDeltas(barrel.x, barrel.y - 44, d);
        this.game.events.emit('gwg-event', 'Citizens discovered the fairness brochure was decorative.');
        const honest = this.getActiveHeroes().filter((hero) => this.isHonestHero(hero.def));
        if (honest.length > 0 && Math.random() < 0.5) {
          const hero = Phaser.Utils.Array.GetRandom(honest);
          this.say(hero, 'Decorative fairness?', true);
          this.sendHeroAway(hero, 2);
        }
      }
      if (R.corruption >= 70) {
        const booth = this.getOperationalPlace('debt_collector_booth');
        const d = {
          gold: debtLevel > 0 ? 45 + debtLevel * 22 : 0,
          corruption: 2,
          trust: -2,
          morale: -1,
        };
        this.applyDeltas(d);
        this.floatDeltas(booth.x, booth.y - 62, d);
        this.game.events.emit('gwg-event', 'The town accountant renamed corruption to strategic sparkle.');
      }
      if (R.morale < 30) {
        const tavern = this.getOperationalPlace('tavern');
        const d = { morale: -1, trust: -1 };
        this.applyDeltas(d);
        this.floatDeltas(tavern.x, tavern.y - tavern.h - 10, d);
        this.game.events.emit('gwg-event', 'A hero retired to become a tutorial warning.');
      }
      this.applyPendingPolicyNeglect();
      this.updateLairPressureAndRaids();
      const forceAttack = R.threat >= 92 && this.day - (this.monsterState?.lastAttackDay || 0) > 1;
      const monsterAttackHappened = this.maybeTriggerMonsterAttack(forceAttack);
      if (monsterAttackHappened && R.threat >= 80) {
        const candidates = this.heroes.filter((h) => h.state !== 'inside' && !h.bubble);
        if (candidates.length > 0) {
          this.say(
            Phaser.Utils.Array.GetRandom(candidates),
            Phaser.Utils.Array.GetRandom(THREAT_REACTIONS),
            true,
          );
        }
      }
      this.stats.trustStreak = this.resources.trust > 50 ? this.stats.trustStreak + 1 : 0;
      this.checkObjectives();
      const warnings = this.getDangerWarnings();
      if (warnings.length > 0) this.stats.warningEvents = (this.stats.warningEvents || 0) + 1;
      for (const warning of warnings) this.addReportLine('warnings', warning);
      if (warnings.length > 0) this.checkObjectives();
    });

    steps.push(() => this.runTownServicesStep());

    steps.push(() => {
      this.progressHeroStories();
      this.updateHeroSocialSystems();
      this.cycleRunning = false;
      this.refreshQuestNotices();
      this.checkObjectives();
      this.checkUnlocks();
      this.checkCrises();
      this.checkStageProgression();
      this.checkTownIdentity();
      this.checkAchievements();
      this.maybeOfferPolicy();
      this.cleanupAftermathDrops();
      const weekReady = this.makeWeeklyReportIfDue();
      this.publishTownHint();
      this.refreshActivePanel();
      this.saveGame(false);
      this.presentCycleReport(weekReady);
      this.game.events.emit('gwg-cycle-done');
    });

    steps.forEach((fn, i) => this.time.delayedCall(i * STEP_MS, fn));
  }
}
