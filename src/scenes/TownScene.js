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
import { BUILDING_CATALOG, getBuildingCatalogEntry } from '../data/buildingCatalog.js';
import { getItemByName, getRandomPremiumItem } from '../data/itemCatalog.js';
import { rollMonster } from '../data/monsters.js';
import {
  createGridState,
  getFootprintCells,
  gridKey,
  gridToWorld,
  GRID_CONFIG,
  isInsideGrid,
  isTileUnlocked,
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
  IDLE_QUIPS,
  QUEUE_LINES,
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

const WIDTH = 1280;
const HEIGHT = 720;
const WORLD_WIDTH = TOWN_WORLD.width;
const WORLD_HEIGHT = TOWN_WORLD.height;
const PLAZA = TOWN_WORLD.plaza;
const ROAD_WIDTH = LAYOUT_CONSTANTS.ROAD_WIDTH;
const NPC_SCALE = LAYOUT_CONSTANTS.NPC_SCALE;
const LABEL_FONT_SIZE = LAYOUT_CONSTANTS.LABEL_FONT_SIZE;
const SMALL_LABEL_FONT_SIZE = LAYOUT_CONSTANTS.SMALL_LABEL_FONT_SIZE;
const STEP_MS = 950; // pacing of the day-cycle playback
const MAX_IDLE_BUBBLES = 2;
const MAX_IMPORTANT_BUBBLES = 4;
const BUBBLE_MIN_SPACING = 150;
const MAX_FLOATING_TEXTS = 12;
const COIN_BURST_COOLDOWN_MS = 450;
const SAVE_KEY = 'golden-whale-guild-save-v2';
const SAVE_VERSION = 6;
const TAP_MOVE_THRESHOLD = 14;
const SIMULATION_DAY_MS = 45000;
const HERO_LABEL_DEFAULT_ALPHA = 0;
const HERO_LABEL_FOCUS_ALPHA = 0.96;
const HERO_LABEL_EVENT_ALPHA = 0.82;
const PRIMARY_LABEL_IDS = new Set(['whale', 'guildhall', 'dungeon']);
const DEFAULT_SPECIAL_LABEL_IDS = new Set(['notice_board', 'complaint_barrel']);
const COMPACT_SPECIAL_LABEL_IDS = new Set(['notice_board']);
const LEGACY_BUILDING_IDS = new Set([
  'tavern', 'blacksmith', 'guildhall', 'market', 'training', 'whale', 'dungeon',
]);

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
    ensureFallbacks(this);
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(2);
    this.setupCameraControls();

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
      heroesInspected: 0,
      fairUpgrades: 0,
      shadyUpgrades: 0,
      sponsoredQuests: 0,
      warningEvents: 0,
      questFailures: 0,
      premiumActions: 0,
      ...(saved?.stats || {}),
    };
    this.completedObjectives = new Set(saved?.completedObjectives || []);
    this.townStageId = saved?.townStageId || 'garage';
    this.townIdentityId = saved?.townIdentityId || 'balanced';
    this.townLog = Array.isArray(saved?.townLog) ? saved.townLog.slice(-80) : [];
    this.crises = saved?.crises || {};
    this.achievements = new Set(saved?.achievements || []);
    this.pendingPolicy = saved?.pendingPolicy || null;
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

    this.buildings = this.applyBuildingPlacements(applyTownLayout(BUILDINGS, BUILDING_LAYOUT));
    this.decorations = this.applyBuilderDecorationState(applyTownLayout(DECORATIONS, DECORATION_LAYOUT));
    this.pathNodes = TOWN_PATH_NODES;
    this.pathLinks = TOWN_PATH_LINKS;
    this.pathNodeById = Object.fromEntries(this.pathNodes.map((node) => [node.id, node]));

    this.buildTerrain();
    this.buildGridLayer();
    this.buildBuildings();
    this.buildDecorations();
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));
    this.placeById = { ...this.buildingById, ...this.decorationById };
    this.upgradeVisualsById = {};
    this.refreshAllUpgradeVisuals();
    this.activeBubbles = 0;
    this.importantChatterUntil = 0;
    this.floaters = [];
    this.lastCoinBurstAt = -COIN_BURST_COOLDOWN_MS;
    this.buildTooltip();
    this.buildHeroes();
    this.buildQuestNotices();
    this.setupBuildInput();
    this.startIdleChatter();

    // shared state for the UI scene
    this.registry.set('day', this.day);
    this.registry.set('resources', { ...this.resources });
    this.registry.set('townStage', this.getCurrentStage().name);
    this.registry.set('townIdentity', this.getTownIdentity().name);
    this.registry.set('simulationSpeed', this.simulationSpeed);
    this.publishObjectives();
    this.publishTownHint();
    this.checkUnlocks(true);
    this.checkStageProgression(true);
    this.checkTownIdentity(true);

    this.scene.launch('UIScene');
    this.game.events.on('gwg-end-day', this.runCycle, this);
    this.game.events.on('gwg-save', this.saveGame, this);
    this.game.events.on('gwg-reset', this.resetGame, this);
    this.game.events.on('gwg-upgrade-place', this.upgradePlaceFromUi, this);
    this.game.events.on('gwg-post-quest', this.postQuestFromUi, this);
    this.game.events.on('gwg-open-quests', this.openQuestsFromUi, this);
    this.game.events.on('gwg-open-ledger', this.openTownLedger, this);
    this.game.events.on('gwg-open-town-log', this.openTownLog, this);
    this.game.events.on('gwg-open-help', this.openHelpPanel, this);
    this.game.events.on('gwg-tutorial-next', this.advanceOnboardingFromUi, this);
    this.game.events.on('gwg-tutorial-skip', this.skipOnboarding, this);
    this.game.events.on('gwg-tutorial-start', this.restartOnboarding, this);
    this.game.events.on('gwg-policy-choice', this.choosePolicyFromUi, this);
    this.game.events.on('gwg-selection-clear', this.clearSelection, this);
    this.game.events.on('gwg-open-build', this.openBuildMenu, this);
    this.game.events.on('gwg-open-roads', this.openRoadMenu, this);
    this.game.events.on('gwg-select-build', this.selectBuildItem, this);
    this.game.events.on('gwg-cancel-build', this.cancelBuildMode, this);
    this.game.events.on('gwg-time-speed', this.setSimulationSpeed, this);
    this.game.events.on('gwg-expand-land', this.expandLand, this);
    this.game.events.on('gwg-building-action', this.runBuildingAction, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-end-day', this.runCycle, this);
      this.game.events.off('gwg-save', this.saveGame, this);
      this.game.events.off('gwg-reset', this.resetGame, this);
      this.game.events.off('gwg-upgrade-place', this.upgradePlaceFromUi, this);
      this.game.events.off('gwg-post-quest', this.postQuestFromUi, this);
      this.game.events.off('gwg-open-quests', this.openQuestsFromUi, this);
      this.game.events.off('gwg-open-ledger', this.openTownLedger, this);
      this.game.events.off('gwg-open-town-log', this.openTownLog, this);
      this.game.events.off('gwg-open-help', this.openHelpPanel, this);
      this.game.events.off('gwg-tutorial-next', this.advanceOnboardingFromUi, this);
      this.game.events.off('gwg-tutorial-skip', this.skipOnboarding, this);
      this.game.events.off('gwg-tutorial-start', this.restartOnboarding, this);
      this.game.events.off('gwg-policy-choice', this.choosePolicyFromUi, this);
      this.game.events.off('gwg-selection-clear', this.clearSelection, this);
      this.game.events.off('gwg-open-build', this.openBuildMenu, this);
      this.game.events.off('gwg-open-roads', this.openRoadMenu, this);
      this.game.events.off('gwg-select-build', this.selectBuildItem, this);
      this.game.events.off('gwg-cancel-build', this.cancelBuildMode, this);
      this.game.events.off('gwg-time-speed', this.setSimulationSpeed, this);
      this.game.events.off('gwg-expand-land', this.expandLand, this);
      this.game.events.off('gwg-building-action', this.runBuildingAction, this);
    });

    this.game.events.emit(
      'gwg-event',
      this.isBuilderCity
        ? 'The Guild Camp opened on mostly empty land. Build roads, place services, and invoice destiny.'
        : 'Welcome back to the legacy town. Its roads are grandfathered in by suspicious paperwork.',
    );
    this.time.delayedCall(650, () => this.maybeShowOnboarding());
  }

  loadSavedState() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
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
        townIdentityId: parsed.townIdentityId || 'balanced',
        townLog: Array.isArray(parsed.townLog) ? parsed.townLog : [],
        crises: parsed.crises || {},
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
        pendingPolicy: parsed.pendingPolicy || null,
        tutorial: parsed.tutorial || {},
        cityBuilder: parsed.cityBuilder || null,
      };
    } catch {
      return null;
    }
  }

  applyBuildingPlacements(buildings) {
    const placementById = Object.fromEntries(
      this.cityState.placedBuildings.map((placement) => [placement.id, placement]),
    );
    return buildings.map((building) => {
      const placement = placementById[building.id];
      const catalog = getBuildingCatalogEntry(building.id);
      if (!placement) {
        return {
          ...building,
          catalog,
          footprint: catalog?.footprint || { w: 2, h: 2 },
          isPlaced: false,
        };
      }
      const position = placement.legacyPosition
        ? { x: building.x, y: building.y }
        : gridToWorld(placement.gridX, placement.gridY, catalog?.footprint);
      return {
        ...building,
        ...position,
        catalog,
        footprint: catalog?.footprint || { w: 2, h: 2 },
        gridX: placement.gridX,
        gridY: placement.gridY,
        isPlaced: true,
      };
    });
  }

  applyBuilderDecorationState(decorations) {
    if (!this.isBuilderCity) return decorations.map((decoration) => ({ ...decoration, isPlaced: true }));
    const guild = this.buildings.find((building) => building.id === 'guildhall');
    return decorations.map((decoration) => {
      const isNature = ['tree', 'rock', 'flowers'].includes(decoration.fallbackKey);
      const isEdgeNature = isNature && (
        decoration.district === 'edge'
        || decoration.x < 180
        || decoration.x > 1320
        || decoration.y < 140
        || decoration.y > 750
      );
      const isNotice = decoration.id === 'notice_board';
      if (isNotice && guild) {
        return {
          ...decoration,
          x: guild.x + 76,
          y: guild.y + 20,
          pathNode: null,
          isPlaced: true,
        };
      }
      return {
        ...decoration,
        isPlaced: isEdgeNature,
      };
    });
  }

  getBuildingRuntime(id) {
    const place = this.buildingById?.[id] || this.buildings?.find((building) => building.id === id);
    const level = place ? Math.max(1, Number(this.upgradeLevels?.[id]) || Number(place.level) || 1) : 1;
    const catalog = getBuildingCatalogEntry(id);
    const defaults = {
      usageCount: 0,
      visitorsTotal: 0,
      visitorsNow: 0,
      serviceQuality: level,
      upgradeProgress: 0,
      capacity: id === 'tavern' ? 4 + level * 2 : (catalog?.capacity || 4) + Math.max(0, level - 1) * 2,
      stock: catalog?.id === 'potion_shop' ? 6 : 0,
      actionDays: {},
    };
    this.cityState.buildingRuntime[id] = {
      ...defaults,
      ...(this.cityState.buildingRuntime[id] || {}),
      capacity: id === 'tavern'
        ? 4 + level * 2
        : (this.cityState.buildingRuntime[id]?.capacity || defaults.capacity),
      actionDays: {
        ...(this.cityState.buildingRuntime[id]?.actionDays || {}),
      },
    };
    return this.cityState.buildingRuntime[id];
  }

  isBuildingPlaced(id) {
    return Boolean(this.buildingById?.[id]?.isPlaced);
  }

  setupCameraControls() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setScroll(
      Phaser.Math.Clamp(TOWN_WORLD.cameraStart.x, 0, Math.max(0, WORLD_WIDTH - WIDTH)),
      Phaser.Math.Clamp(TOWN_WORLD.cameraStart.y, 0, Math.max(0, WORLD_HEIGHT - HEIGHT)),
    );

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');
    this.cameraDrag = { active: false, moved: false, lastX: 0, lastY: 0 };

    this.input.on('pointerdown', (pointer) => {
      if (this.buildMode) return;
      if (!pointer.primaryDown) return;
      this.cameraDrag.active = true;
      this.cameraDrag.moved = false;
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (this.buildMode) return;
      if (!this.cameraDrag.active || !pointer.primaryDown) return;
      const dx = pointer.x - this.cameraDrag.lastX;
      const dy = pointer.y - this.cameraDrag.lastY;
      const total = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
      if (total > TAP_MOVE_THRESHOLD) this.cameraDrag.moved = true;
      if (this.cameraDrag.moved) {
        cam.scrollX = Phaser.Math.Clamp(cam.scrollX - dx, 0, Math.max(0, WORLD_WIDTH - WIDTH));
        cam.scrollY = Phaser.Math.Clamp(cam.scrollY - dy, 0, Math.max(0, WORLD_HEIGHT - HEIGHT));
      }
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointerup', (pointer, over = []) => {
      if (this.cameraDrag.moved) this.suppressTapUntil = this.time.now + 120;
      else if (over.length === 0 && this.activeInspector) this.hideTooltip();
      this.cameraDrag.active = false;
    });
  }

  wasDragGesture(pointer) {
    if (!pointer) return this.time.now < (this.suppressTapUntil || 0);
    const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
    return dist > TAP_MOVE_THRESHOLD || this.time.now < (this.suppressTapUntil || 0);
  }

  getVisibleWorldRect() {
    const cam = this.cameras.main;
    return {
      left: cam.scrollX,
      top: cam.scrollY,
      right: cam.scrollX + WIDTH,
      bottom: cam.scrollY + HEIGHT,
    };
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
      townIdentityId: this.townIdentityId,
      townLog: (this.townLog || []).slice(-80),
      crises: { ...this.crises },
      achievements: [...(this.achievements || [])],
      pendingPolicy: this.pendingPolicy,
      tutorial: { ...this.tutorial },
      cityBuilder: {
        mode: this.cityState.mode,
        unlockedZones: [...this.cityState.unlockedZones],
        roads: this.cityState.roads.map((road) => ({ ...road })),
        placedBuildings: this.cityState.placedBuildings.map((building) => ({ ...building })),
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
        awayUntil: hero.awayUntil || 0,
      }])),
    };
  }

  saveGame(showEvent = true) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.getSavePayload()));
      if (showEvent) {
        this.game.events.emit('gwg-event', 'Guild records saved locally. No cloud. No account. Just paperwork.');
      }
      return true;
    } catch {
      if (showEvent) this.game.events.emit('gwg-event', 'The save clerk dropped the ledger. Local save failed politely.');
      return false;
    }
  }

  resetGame() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Local storage may be blocked; reloading still returns to the default state.
    }
    window.location.reload();
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
    if (!this.cycleReport || !text) return;
    if (!Array.isArray(this.cycleReport[section])) this.cycleReport[section] = [];
    this.cycleReport[section].push(text);
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

  getCycleReportPayload() {
    const report = this.cycleReport;
    const deltas = this.getResourceDeltaSummary(report?.start || this.resources);
    const formatDelta = ({ key, value }) => {
      const sign = value > 0 ? '+' : '';
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const className = (
        (key === 'gold' && value >= 0)
        || (['trust', 'morale'].includes(key) && value >= 0)
        || (['corruption', 'threat'].includes(key) && value <= 0)
      ) ? 'gwg-good' : 'gwg-bad';
      return { text: `${label}: ${sign}${value}`, className };
    };

    const sections = [
      {
        title: 'Town Identity',
        lines: [{
          text: `${this.getTownIdentity().name}: ${this.getTownIdentity().line}`,
          className: this.getTownIdentity().id === 'whale' ? 'gwg-whale' : 'gwg-muted',
        }],
      },
      {
        title: 'Resource Changes',
        lines: deltas.map(formatDelta),
      },
      {
        title: 'Quest Results',
        lines: report?.quests?.length ? report.quests.map((line) => `- ${line}`) : ['- No posted quests resolved. The town learned less than hoped.'],
      },
      {
        title: 'NPC Changes',
        lines: report?.npc?.length ? report.npc.map((line) => `- ${line}`) : ['- No major personal spiral was filed today.'],
      },
    ];

    const extraSections = [
      ['Stage', 'stage'],
      ['New Unlocks', 'unlocks'],
      ['Town Crises', 'crises'],
      ['Achievements', 'achievements'],
      ['Warnings', 'warnings'],
    ];
    for (const [title, key] of extraSections) {
      const lines = report?.[key] || [];
      if (lines.length) sections.push({ title, lines: lines.map((line) => `- ${line}`) });
    }

    const pendingPolicy = this.getPendingPolicy();
    if (pendingPolicy) {
      sections.push({
        title: pendingPolicy.title,
        lines: [pendingPolicy.description],
      });
    }

    sections.push({
      title: 'Town Accountant Note',
      lines: [{ text: `"${this.getAccountantNote()}"`, className: 'gwg-whale' }],
    });

    const rows = pendingPolicy ? pendingPolicy.options.map((option) => ({
      title: option.label,
      meta: 'Policy',
      kind: option.id.includes('sponsored') || option.id.includes('sell') || option.id.includes('premium') ? 'shady' : 'fair',
      lines: [option.summary, { text: option.text, className: 'gwg-muted' }],
      actions: [{
        label: 'Choose',
        event: 'gwg-policy-choice',
        id: option.id,
      }],
    })) : [];

    return {
      title: report?.crises?.length ? `Town Crisis - Day ${this.day}` : `Day ${this.day} Report`,
      subtitle: `${this.getCurrentStage().name} - compact consequences ledger`,
      sections,
      rows,
    };
  }

  showCycleReport() {
    if (!this.cycleReport) return;
    this.activeInspector = { type: 'report' };
    this.clearSelection(false);
    this.game.events.emit('gwg-inspector-open', this.getCycleReportPayload());
  }

  getPendingPolicy() {
    const id = typeof this.pendingPolicy === 'string' ? this.pendingPolicy : this.pendingPolicy?.id;
    return POLICY_EVENTS.find((policy) => policy.id === id) || null;
  }

  maybeOfferPolicy() {
    if (this.pendingPolicy || this.day < 4 || this.day % BALANCE.policyInterval !== 0) return;
    const policy = POLICY_EVENTS[(Math.floor(this.day / BALANCE.policyInterval) + this.getStageIndex()) % POLICY_EVENTS.length];
    this.pendingPolicy = policy.id;
    this.addTownLog(`Policy offered: ${policy.title}.`, 'policy');
    this.addReportLine('policies', `${policy.title} is waiting for a choice.`);
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
    this.pendingPolicy = null;
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
    this.showCycleReport();
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
    return this.heroes.filter((hero) => hero.stats.active !== false && hero.awayUntil <= this.day && hero.state !== 'away');
  }

  returnAwayHeroes() {
    for (const hero of this.heroes) {
      if (hero.state === 'away' && hero.awayUntil <= this.day) {
        hero.state = 'idle';
        hero.container.setAlpha(1);
        hero.stats.loyalty = Math.max(25, hero.stats.loyalty - 8);
        hero.currentAction = `Returned near ${this.getPlaceName(hero.at)}`;
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
      fairBuildingLevelTotal: ['tavern', 'blacksmith', 'guildhall', 'training']
        .reduce((sum, id) => sum + (levels[id] || 1), 0),
    };
  }

  publishObjectives() {
    const active = OBJECTIVES
      .filter((objective) => !this.completedObjectives.has(objective.id))
      .slice(0, 3)
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
    if (this.pendingPolicy) return 'Policy choice pending: open the Day Report and pick a compromise.';
    if (R.threat >= RESOURCE_THRESHOLDS.threatWarning) return 'Warning: Threat is rising. Post safer quests.';
    if (R.trust < RESOURCE_THRESHOLDS.trustWarning) return 'Warning: Trust is low. Honest heroes may leave.';
    if (R.morale < RESOURCE_THRESHOLDS.moraleWarning) return 'Town Problem: heroes are losing morale.';
    if (R.corruption >= RESOURCE_THRESHOLDS.corruptionWarning) return 'Warning: Corruption is profitable and very awake.';
    if (this.postedQuests.length === 0) return 'Goal: Post a quest near the Guild Hall.';

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
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'grass');

    if (this.isBuilderCity) {
      const land = this.add.graphics().setDepth(1);
      const west = GRID_CONFIG.zones.west;
      land.fillStyle(0xb8d98a, 0.08);
      land.fillRect(
        GRID_CONFIG.originX + west.minX * GRID_CONFIG.tileSize,
        GRID_CONFIG.originY + west.minY * GRID_CONFIG.tileSize,
        (west.maxX - west.minX + 1) * GRID_CONFIG.tileSize,
        (west.maxY - west.minY + 1) * GRID_CONFIG.tileSize,
      );
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

  buildGridLayer() {
    this.lockedLandGraphics = this.add.graphics().setDepth(60);
    this.gridGraphics = this.add.graphics().setDepth(4800).setVisible(false);
    this.buildPreviewGraphics = this.add.graphics().setDepth(4850).setVisible(false);
    this.redrawLockedLand();
    this.redrawBuildGrid();
  }

  redrawLockedLand() {
    if (!this.lockedLandGraphics) return;
    this.lockedLandGraphics.clear();
    if (!this.isBuilderCity) return;
    for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
      for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
        if (isTileUnlocked(x, y, this.cityState.unlockedZones)) continue;
        const world = gridToWorld(x, y);
        this.lockedLandGraphics.fillStyle(0x18202b, 0.52);
        this.lockedLandGraphics.fillRect(
          world.x - GRID_CONFIG.tileSize / 2,
          world.y - GRID_CONFIG.tileSize,
          GRID_CONFIG.tileSize,
          GRID_CONFIG.tileSize,
        );
      }
    }
  }

  redrawBuildGrid() {
    if (!this.gridGraphics) return;
    this.gridGraphics.clear();
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

  redrawCityRoads() {
    if (!this.cityRoadGraphics) this.cityRoadGraphics = this.add.graphics().setDepth(20);
    const graphics = this.cityRoadGraphics;
    graphics.clear();
    if (!this.isBuilderCity) return;

    for (const road of this.cityState.roads) {
      const type = ROAD_TYPES[road.type] || ROAD_TYPES.dirt;
      const center = gridToWorld(road.x, road.y);
      const cx = center.x;
      const cy = center.y - GRID_CONFIG.tileSize / 2;
      const hasRoad = (x, y) => Boolean(this.gridCells.get(gridKey(x, y))?.road);
      graphics.fillStyle(type.edgeColor, 0.72);
      graphics.fillRoundedRect(cx - 15, cy - 15, 30, 30, 6);
      graphics.fillStyle(type.color, 0.98);
      graphics.fillRoundedRect(cx - 11, cy - 11, 22, 22, 5);
      if (hasRoad(road.x - 1, road.y)) {
        graphics.fillStyle(type.edgeColor, 0.72);
        graphics.fillRect(cx - 24, cy - 15, 24, 30);
        graphics.fillStyle(type.color, 0.98);
        graphics.fillRect(cx - 24, cy - 11, 24, 22);
      }
      if (hasRoad(road.x + 1, road.y)) {
        graphics.fillStyle(type.edgeColor, 0.72);
        graphics.fillRect(cx, cy - 15, 24, 30);
        graphics.fillStyle(type.color, 0.98);
        graphics.fillRect(cx, cy - 11, 24, 22);
      }
      if (hasRoad(road.x, road.y - 1)) {
        graphics.fillStyle(type.edgeColor, 0.72);
        graphics.fillRect(cx - 15, cy - 24, 30, 24);
        graphics.fillStyle(type.color, 0.98);
        graphics.fillRect(cx - 11, cy - 24, 22, 24);
      }
      if (hasRoad(road.x, road.y + 1)) {
        graphics.fillStyle(type.edgeColor, 0.72);
        graphics.fillRect(cx - 15, cy, 30, 24);
        graphics.fillStyle(type.color, 0.98);
        graphics.fillRect(cx - 11, cy, 22, 24);
      }
    }
  }

  setupBuildInput() {
    this.buildInputZone = this.add.zone(
      GRID_CONFIG.originX + GRID_CONFIG.columns * GRID_CONFIG.tileSize / 2,
      GRID_CONFIG.originY + GRID_CONFIG.rows * GRID_CONFIG.tileSize / 2,
      GRID_CONFIG.columns * GRID_CONFIG.tileSize,
      GRID_CONFIG.rows * GRID_CONFIG.tileSize,
    ).setDepth(4900).setVisible(false);

    this.buildInputZone.on('pointermove', (pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.updateBuildPreview(world.x, world.y);
    });
    this.buildInputZone.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown?.()) this.cancelBuildMode();
    });
    this.buildInputZone.on('pointerup', (pointer) => {
      if (!this.buildMode || this.wasDragGesture(pointer)) return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const cell = worldToGrid(world.x, world.y);
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
      case 'hostel': return activeHeroes.length >= 6 || Boolean(tavernRuntime && tavernRuntime.visitorsNow >= tavernRuntime.capacity);
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
      default: return true;
    }
  }

  getCatalogLockReason(catalog) {
    return this.isCatalogUnlocked(catalog) ? null : (catalog.lockReason || 'Locked by suspicious municipal policy.');
  }

  validateBuildPlacement(gridX, gridY) {
    if (!this.buildMode) return { valid: false, reason: 'Choose something to build.' };
    const footprint = this.getBuildFootprint();
    const cells = getFootprintCells(gridX, gridY, footprint);
    if (cells.some((cell) => !isInsideGrid(cell.x, cell.y))) {
      return { valid: false, reason: 'That plan extends beyond approved reality.' };
    }
    if (cells.some((cell) => !isTileUnlocked(cell.x, cell.y, this.cityState.unlockedZones))) {
      return { valid: false, reason: 'Land locked. The paperwork has territorial ambitions.' };
    }

    if (this.buildMode.kind === 'road') {
      const cell = this.gridCells.get(gridKey(gridX, gridY));
      if (cell?.occupiedBy) return { valid: false, reason: 'A building already owns that argument.' };
      if (cell?.road) return { valid: false, reason: 'Road already present. It refuses a second commute.' };
      const road = ROAD_TYPES[this.buildMode.id];
      return {
        valid: this.resources.gold >= road.cost,
        reason: this.resources.gold >= road.cost ? '' : 'Not enough gold for municipal dirt.',
        cost: road.cost,
        footprint,
      };
    }

    const catalog = getBuildingCatalogEntry(this.buildMode.id);
    if (!catalog) return { valid: false, reason: 'The catalog misplaced that building.' };
    const lockReason = this.getCatalogLockReason(catalog);
    if (lockReason) return { valid: false, reason: lockReason };
    if (this.isBuildingPlaced(catalog.id)) {
      return { valid: false, reason: `${catalog.id === 'tavern' ? 'This prototype supports one tavern for now.' : 'Already built.'}` };
    }
    if (cells.some((cell) => {
      const state = this.gridCells.get(gridKey(cell.x, cell.y));
      return state?.occupiedBy || state?.road;
    })) {
      return { valid: false, reason: 'Occupied tiles object to architecture.' };
    }
    if (catalog.roadRequired) {
      const hasRoad = this.getRoadAccessCells(gridX, gridY, footprint)
        .some((cell) => this.gridCells.get(gridKey(cell.x, cell.y))?.road);
      if (!hasRoad) return { valid: false, reason: 'Needs an adjacent road. Heroes dislike conceptual access.' };
    }
    return {
      valid: this.resources.gold >= catalog.cost,
      reason: this.resources.gold >= catalog.cost ? '' : 'Not enough gold. The accountant recommends another road to nowhere.',
      cost: catalog.cost,
      footprint,
    };
  }

  updateBuildPreview(worldX, worldY) {
    if (!this.buildMode || !this.buildPreviewGraphics) return;
    const cell = worldToGrid(worldX, worldY);
    if (this.buildPreviewCell?.x === cell.x && this.buildPreviewCell?.y === cell.y) return;
    this.buildPreviewCell = cell;
    const result = this.validateBuildPlacement(cell.x, cell.y);
    const footprint = result.footprint || this.getBuildFootprint();
    this.buildPreviewGraphics.clear().setVisible(true);
    this.buildPreviewGraphics.fillStyle(result.valid ? 0x7fdc93 : 0xf0938f, 0.28);
    this.buildPreviewGraphics.lineStyle(2, result.valid ? 0x7fdc93 : 0xf0938f, 0.95);
    for (const pos of getFootprintCells(cell.x, cell.y, footprint)) {
      const world = gridToWorld(pos.x, pos.y);
      const left = world.x - GRID_CONFIG.tileSize / 2 + 2;
      const top = world.y - GRID_CONFIG.tileSize + 2;
      this.buildPreviewGraphics.fillRect(left, top, GRID_CONFIG.tileSize - 4, GRID_CONFIG.tileSize - 4);
      this.buildPreviewGraphics.strokeRect(left, top, GRID_CONFIG.tileSize - 4, GRID_CONFIG.tileSize - 4);
    }
  }

  enterBuildMode(kind, id) {
    if (!this.isBuilderCity) {
      this.game.events.emit('gwg-event', 'Legacy towns cannot be rearranged yet. Start a new city after saving any sentimental paperwork.');
      return;
    }
    if (kind === 'road' && !ROAD_TYPES[id]) return;
    if (kind === 'building' && !getBuildingCatalogEntry(id)) return;
    this.clearSelection();
    this.buildMode = { kind, id };
    this.buildPreviewCell = null;
    this.gridGraphics.setVisible(true);
    this.buildPreviewGraphics.setVisible(true);
    this.buildInputZone.setVisible(true).setInteractive({ useHandCursor: true });
    const name = kind === 'road' ? ROAD_TYPES[id].name : this.buildingById[id]?.name;
    this.game.events.emit('gwg-event', `${name} selected. Choose a green grid footprint. Escape or Cancel stops construction.`);
    this.game.events.emit('gwg-build-mode', { active: true, label: name });
    this.game.events.emit('gwg-inspector-close');
  }

  cancelBuildMode() {
    if (!this.buildMode) return;
    this.buildMode = null;
    this.buildPreviewCell = null;
    this.gridGraphics?.setVisible(false);
    this.buildPreviewGraphics?.clear().setVisible(false);
    this.buildInputZone?.disableInteractive().setVisible(false);
    this.game.events.emit('gwg-build-mode', { active: false, label: '' });
  }

  selectBuildItem(id) {
    if (ROAD_TYPES[id]) this.enterBuildMode('road', id);
    else this.enterBuildMode('building', id);
  }

  tryPlaceBuildItem(gridX, gridY) {
    const result = this.validateBuildPlacement(gridX, gridY);
    if (!result.valid) {
      this.game.events.emit('gwg-event', result.reason);
      const world = gridToWorld(gridX, gridY);
      this.floatText(world.x, world.y - 28, 'INVALID', '#f0938f');
      return;
    }
    if (this.buildMode.kind === 'road') {
      this.placeRoad(gridX, gridY, this.buildMode.id, result.cost);
    } else {
      this.placeCatalogBuilding(gridX, gridY, this.buildMode.id, result.cost);
    }
    this.updateBuildPreview(
      gridToWorld(gridX, gridY).x,
      gridToWorld(gridX, gridY).y - GRID_CONFIG.tileSize / 2,
    );
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
    this.redrawCityRoads();
    const world = gridToWorld(gridX, gridY);
    this.floatText(world.x, world.y - 30, `-${cost}g`, '#f6c945');
    const text = `${road.name} placed. Access has become ${typeId === 'premium' ? 'a luxury texture' : 'slightly less theoretical'}.`;
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'economy');
    this.saveGame(false);
  }

  placeCatalogBuilding(gridX, gridY, id, cost) {
    const catalog = getBuildingCatalogEntry(id);
    const building = this.buildingById[id];
    if (!catalog || !building) return;
    this.applyDeltas({ gold: -cost });
    const placement = { id, gridX, gridY };
    this.cityState.placedBuildings.push(placement);
    occupyBuildingCells(this.gridCells, placement, catalog.footprint);
    const position = gridToWorld(gridX, gridY, catalog.footprint);
    Object.assign(building, position, {
      gridX,
      gridY,
      footprint: catalog.footprint,
      isPlaced: true,
    });
    this.renderBuilding(building);
    this.doorById[building.id] = this.getDoorSpotForPlace(building);
    this.placeById[building.id] = building;
    this.getBuildingRuntime(id);
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

  getBuildMenuPayload(category = null) {
    const roadRows = Object.values(ROAD_TYPES).map((road) => ({
      title: road.name,
      meta: `${road.cost}g / tile`,
      kind: road.id === 'premium' ? 'shady' : 'fair',
      lines: [road.description, 'Footprint: 1x1'],
      actions: [{
        label: this.resources.gold >= road.cost ? 'Build Road' : `Need ${road.cost}g`,
        event: 'gwg-select-build',
        id: road.id,
        disabled: this.resources.gold < road.cost,
      }],
    }));
    const buildingRows = BUILDING_CATALOG.map((catalog) => {
      const place = this.buildingById?.[catalog.id];
      const built = Boolean(place?.isPlaced);
      const lockReason = this.getCatalogLockReason(catalog);
      const locked = Boolean(lockReason);
      return {
        title: catalog.name || place?.name || catalog.id,
        meta: built ? 'BUILT' : (locked ? 'LOCKED' : `${catalog.cost}g`),
        kind: catalog.kind === 'shady' ? 'shady' : 'fair',
        lines: [
          `Category: ${catalog.category}`,
          catalog.description,
          `Footprint: ${catalog.footprint.w}x${catalog.footprint.h}${catalog.roadRequired ? ' - road access required' : ''}`,
          catalog.capacity ? `Starting capacity: ${catalog.capacity}` : `Upkeep: ${catalog.upkeep}g`,
          ...(locked ? [{ text: lockReason, className: 'gwg-bad' }] : []),
        ],
        actions: [{
          label: built ? 'Built' : (locked ? 'Locked' : (this.resources.gold >= catalog.cost ? 'Place Building' : `Need ${catalog.cost}g`)),
          event: 'gwg-select-build',
          id: catalog.id,
          disabled: built || locked || this.resources.gold < catalog.cost,
        }],
      };
    });
    const rows = category === 'roads' ? roadRows : [...roadRows, ...buildingRows];
    return {
      title: category === 'roads' ? 'Road Works' : 'Build Menu',
      subtitle: `${this.resources.gold}g available - construction snaps to the town grid`,
      sections: [{
        title: 'City Rules',
        lines: [
          'Buildings cannot overlap roads or each other.',
          'Services need an adjacent road. Green fits; red files a complaint.',
        ],
      }],
      rows,
      actions: [
        {
          label: 'Expand Eastern Lot - 900g',
          event: 'gwg-expand-land',
          disabled: this.cityState.unlockedZones.includes('east') || this.resources.gold < 900,
        },
        { label: 'Cancel Build Mode', event: 'gwg-cancel-build' },
      ],
    };
  }

  openBuildMenu() {
    this.activeInspector = { type: 'build' };
    this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload());
  }

  openRoadMenu() {
    this.activeInspector = { type: 'roads' };
    this.game.events.emit('gwg-ledger-open', this.getBuildMenuPayload('roads'));
  }

  expandLand() {
    if (this.cityState.unlockedZones.includes('east')) return;
    if (this.resources.gold < 900) {
      this.game.events.emit('gwg-event', 'Expansion costs 900g. The surveyor does not accept optimism.');
      return;
    }
    this.applyDeltas({ gold: -900, threat: 4 });
    this.cityState.unlockedZones.push('east');
    for (const cell of this.gridCells.values()) {
      cell.unlocked = isTileUnlocked(cell.x, cell.y, this.cityState.unlockedZones);
    }
    this.redrawLockedLand();
    const text = 'New land unlocked. The monsters noticed the paperwork.';
    this.game.events.emit('gwg-event', text);
    this.addTownLog(text, 'unlock');
    this.saveGame(false);
    this.openBuildMenu();
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
    const offset = place.doorOffsetY ?? (place.id === 'whale' ? 44 : 18);
    return {
      id: place.id,
      x: place.doorX ?? place.x,
      y: place.doorY ?? place.y + offset,
    };
  }

  getPlaceLabelText(place) {
    return place.shortLabel || place.name || place.id;
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
    const priority = this.getPlaceLabelPriority(place);
    if (priority <= 1) return 0.96;
    if (priority === 2) return this.isCompactView() ? 0.78 : 0.88;
    if (priority === 3) {
      const visibleIds = this.isCompactView() ? COMPACT_SPECIAL_LABEL_IDS : DEFAULT_SPECIAL_LABEL_IDS;
      return visibleIds.has(place.id) && this.isLocationUnlocked(place.id) ? 0.74 : 0;
    }
    return 0;
  }

  showPlaceLabel(place, alpha = 1) {
    const label = this.placeLabelsById?.[place?.id];
    if (!label) return;
    label.setAlpha(alpha);
    label.setDepth(4700);
  }

  resetPlaceLabel(place) {
    const label = this.placeLabelsById?.[place?.id];
    if (!label) return;
    label.setAlpha(this.getDefaultPlaceLabelAlpha(place));
    label.setDepth(2000);
  }

  resetAllPlaceLabels() {
    for (const place of Object.values(this.placeById || {})) this.resetPlaceLabel(place);
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
    return this.getTextureScaleForBox(
      textureKey,
      place.w,
      place.h,
      fallbackScale,
      place.maxVisualScale ?? 1.1,
    );
  }

  createPlaceHitZone(place, img, onSelect) {
    const width = place.interactionW || Math.max(84, (place.w || 64) + 34);
    const height = place.interactionH || Math.max(72, (place.h || 52) + 34);
    const centerY = place.y - (place.h || 52) / 2 + (place.interactionOffsetY || 0);
    const hit = this.add.rectangle(place.x, centerY, width, height, 0xffffff, 0.001)
      .setOrigin(0.5)
      .setDepth((place.y || 0) + 8)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => {
      if (img?.setTint) img.setTint(this.isLocationUnlocked(place.id) ? 0xfff3c0 : 0x9aa3b5);
      this.showPlaceLabel(place);
      if (img && this.tweens) {
        const restX = img.getData('restScaleX') || img.getData('baseScaleX') || 1;
        const restY = img.getData('restScaleY') || img.getData('baseScaleY') || 1;
        this.tweens.add({ targets: img, scaleX: restX * 1.035, scaleY: restY * 1.035, duration: 90 });
      }
    });
    hit.on('pointerout', () => {
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
    });
    hit.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      onSelect?.(place);
    });
    return hit;
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
    const shadow = this.add.ellipse(b.x, b.y - 8, b.w * 0.8, 26, 0x10151d, 0.22).setDepth(b.y - 2);
    this.buildingObjectsById[b.id].push(shadow);
    const textureKey = buildingTexture(this, b);
    const img = this.add.image(b.x, b.y, textureKey)
      .setOrigin(0.5, 1)
      .setDepth(b.y);
    const baseScale = this.getPlaceSpriteScale(b, textureKey, b.visualScale ?? LAYOUT_CONSTANTS.BUILDING_SCALE);
    img.setScale(baseScale);
    img.setData('baseScaleX', img.scaleX);
    img.setData('baseScaleY', img.scaleY);
    img.setData('hoverScale', baseScale * 1.03);
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

    if (b.id !== 'training') return;
    const yard = b;
    const dummyKey = resolveTexture(this, 'object_training_dummy', 'dummy');
    const targetKey = resolveTexture(this, 'object_target', 'dummy');
    const dummy = this.add.image(yard.x - 54, yard.y - 5, dummyKey)
      .setScale(0.72).setOrigin(0.5, 1).setDepth(yard.y - 8);
    const target = this.add.image(yard.x + 54, yard.y - 1, targetKey)
      .setScale(0.62).setOrigin(0.5, 1).setDepth(yard.y - 2);
    this.buildingObjectsById[b.id].push(dummy, target);
  }

  buildDecorations() {
    this.decorationById = Object.fromEntries(this.decorations.map((decoration) => [decoration.id, decoration]));
    this.decorationObjectsById = {};
    for (const d of this.decorations) {
      if (!d.isPlaced) continue;
      const key = resolveTexture(this, d.assetKey, d.fallbackKey);
      if (!key) continue;

      this.decorationObjectsById[d.id] = [];
      const shadow = this.add.ellipse(d.x, d.y - 5, (d.w || 42) * 0.72, 15, 0x10151d, 0.16)
        .setDepth(d.y - 2);
      this.decorationObjectsById[d.id].push(shadow);
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
    const container = this.add.container(x, y).setDepth(3600);
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
    // Golden Whale Milking Station: glow, coins, carpet, VIP rope. Peak premium.
    const whale = this.buildingById.whale;
    if (!whale?.isPlaced || this.whaleDressingBuilt) return;
    this.whaleDressingBuilt = true;
    const coinKey = resolveTexture(this, 'icon_coin', 'ph-icon_coin');
    const coinScale = this.getTextureScaleForMaxDimension(coinKey, 10, 1);

    const glow = this.add.image(whale.x, whale.y - 60, 'glow')
      .setDepth(whale.y - whale.h - 1)
      .setScale(2.05)
      .setAlpha(0.62);
    this.tweens.add({
      targets: glow, alpha: 0.92, scale: 2.32,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const profitHalo = this.add.image(whale.x, whale.y - 18, 'glow')
      .setDepth(whale.y - 2)
      .setScale(1.1)
      .setAlpha(0.35);
    this.tweens.add({
      targets: profitHalo, angle: 360, alpha: 0.62,
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // real whale sign asset floats above the door once it exists
    const signKey = resolveTexture(this, 'icon_whale', 'ph-icon_whale');
    this.add.image(whale.x, whale.y - whale.h * 0.55, signKey)
      .setScale(1.38)
      .setDepth(whale.y + 2);

    // steady trickle of coins rising out of the chimney region
    this.add.particles(whale.x, whale.y - whale.h + 20, coinKey, {
      x: { min: -Math.floor(whale.w * 0.42), max: Math.floor(whale.w * 0.42) },
      speedY: { min: -45, max: -20 },
      speedX: { min: -16, max: 16 },
      alpha: { start: 1, end: 0 },
      scale: { min: coinScale * 0.62, max: coinScale * 1.05 },
      lifespan: 1900,
      frequency: 190,
      maxParticles: 28,
    }).setDepth(whale.y + 2);

    // burst emitter fired when the station cashes in during a cycle
    this.coinBurst = this.add.particles(whale.x, whale.y - 90, coinKey, {
      speed: { min: 85, max: 210 },
      angle: { min: 210, max: 330 },
      gravityY: 260,
      lifespan: 1200,
      scale: { start: coinScale * 1.45, end: coinScale * 0.45 },
      alpha: { start: 1, end: 0 },
      emitting: false,
      maxParticles: 80,
    }).setDepth(whale.y + 2);

    // premium entrance: red carpet + velvet rope in front of the door
    this.add.image(whale.x, whale.y + 22, 'carpet').setScale(0.82).setDepth(2);
    this.add.image(whale.x, whale.y + 30, 'viprope').setScale(0.9).setOrigin(0.5, 1).setDepth(whale.y + 30);
    this.add.text(whale.x, whale.y + 45, 'VIP QUEUE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#f6c945',
      stroke: '#141a24',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(whale.y + 40);
  }

  burstCoins(count = 42) {
    if (!this.coinBurst) return;
    if (this.time.now - this.lastCoinBurstAt < COIN_BURST_COOLDOWN_MS) return;
    this.lastCoinBurstAt = this.time.now;
    this.coinBurst.explode(Math.min(count, 64));
  }

  refreshAllUpgradeVisuals() {
    for (const place of Object.values(this.placeById || {})) {
      this.refreshUpgradeVisual(place);
    }
  }

  refreshUpgradeVisual(place) {
    const existing = this.upgradeVisualsById?.[place.id];
    if (existing) existing.destroy();
    if (place?.isPlaced === false) return;

    const level = this.getPlaceLevel(place);
    const sprite = this.placeSpriteById?.[place.id];
    if (sprite) {
      const baseX = sprite.getData('baseScaleX') || 1;
      const baseY = sprite.getData('baseScaleY') || 1;
      const maxBoost = place.maxUpgradeScaleBoost ?? 0.14;
      const step = place.upgradeScaleStep ?? 0.035;
      const scaleBoost = Math.min(maxBoost, Math.max(0, level - 1) * step);
      const restScaleX = baseX * (1 + scaleBoost);
      const restScaleY = baseY * (1 + scaleBoost);
      sprite.setScale(restScaleX, restScaleY);
      sprite.setData('restScaleX', restScaleX);
      sprite.setData('restScaleY', restScaleY);
    }
    if (level <= 1) return;

    const w = place.w || 70;
    const h = place.h || 60;
    const container = this.add.container(place.x, place.y).setDepth((place.y || 0) + 6);
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(0x141a24, 0.9);
    g.fillRoundedRect(-w / 2 + 8, -h - 18, 44, 17, 4);
    g.lineStyle(1, 0xf6c945, 0.9);
    g.strokeRoundedRect(-w / 2 + 8, -h - 18, 44, 17, 4);
    const badge = this.add.text(-w / 2 + 14, -h - 17, `Lv ${level}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffe08a',
    });
    container.add(badge);

    const addImage = (lx, ly, key, scale = 1, depthOffset = 0) => {
      if (!this.textures.exists(key)) return;
      const img = this.add.image(lx, ly, key).setScale(scale).setDepth((place.y || 0) + depthOffset);
      container.add(img);
    };

    const addSparkles = (count, color = 0xffe08a) => {
      g.fillStyle(color, 0.9);
      for (let i = 0; i < count; i += 1) {
        const lx = Phaser.Math.Between(-Math.floor(w / 2), Math.floor(w / 2));
        const ly = Phaser.Math.Between(-h, -20);
        g.fillRect(lx, ly, 3, 3);
      }
    };

    if (place.id === 'tavern') {
      addImage(-w / 2 - 10, -8, resolveTexture(this, 'prop_barrel', 'barrel'), 0.85);
      if (level >= 3) addImage(w / 2 + 10, -10, resolveTexture(this, 'prop_lamp', 'lamp'), 0.8);
      g.fillStyle(0xf6c945);
      g.fillRect(-26, -h + 22, 52, 7);
      if (level >= 4) {
        g.fillStyle(0xd9bc85, 0.75);
        g.fillCircle(8, -h - 18, 8);
        g.fillCircle(21, -h - 28, 6);
      }
    } else if (place.id === 'blacksmith') {
      g.fillStyle(0xff7a2f, 0.55 + level * 0.06);
      g.fillRoundedRect(-20, -46, 40, 28, 4);
      g.fillStyle(0xf6c945, 0.75);
      g.fillRect(-13, -39, 26, 12);
      if (level >= 2) addImage(w / 2 + 10, -8, resolveTexture(this, 'object_anvil', 'crate'), 0.75);
      if (level >= 3) addImage(-w / 2 - 10, -7, resolveTexture(this, 'prop_crate', 'crate'), 0.9);
      if (level >= 4) addSparkles(8, 0xffa04d);
    } else if (place.id === 'guildhall') {
      g.fillStyle(0x3e6db5);
      g.fillRect(-w / 2 + 18, -h + 18, 12, 42);
      g.fillRect(w / 2 - 30, -h + 18, 12, 42);
      g.fillStyle(0xf2ead8);
      for (let i = 0; i < level; i += 1) g.fillRect(w / 2 - 18, -30 - i * 5, 18, 4);
      if (level >= 4) addImage(w / 2 + 12, -10, resolveTexture(this, 'prop_signpost', 'signpost'), 0.75);
    } else if (place.id === 'training') {
      if (level >= 2) addImage(-w / 2 - 10, -8, resolveTexture(this, 'object_training_dummy', 'dummy'), 0.8);
      if (level >= 3) addImage(w / 2 + 10, -8, resolveTexture(this, 'object_target', 'dummy'), 0.7);
      g.lineStyle(3, 0x8a5a2b);
      g.strokeCircle(0, -36, 14 + level * 2);
      g.lineStyle(2, 0xf6c945);
      g.strokeCircle(0, -36, 6 + level);
    } else if (place.id === 'market') {
      addImage(-w / 2 - 8, -8, resolveTexture(this, 'prop_crate', 'crate'), 0.85);
      addImage(w / 2 + 8, -8, resolveTexture(this, 'prop_barrel', 'barrel'), 0.8);
      if (level >= 3) {
        g.fillStyle(0xf6c945);
        for (let i = 0; i < level + 2; i += 1) g.fillCircle(-26 + i * 12, -44, 4);
      }
      if (level >= 4) addImage(0, -h - 8, resolveTexture(this, 'prop_signpost', 'signpost'), 0.8);
    } else if (place.id === 'whale') {
      const upgradeCoinKey = resolveTexture(this, 'icon_coin', 'ph-icon_coin');
      const upgradeCoinScale = this.getTextureScaleForMaxDimension(upgradeCoinKey, 10, 1);
      const upgradeWhaleKey = resolveTexture(this, 'icon_whale', 'ph-icon_whale');
      const upgradeWhaleScale = this.getTextureScaleForMaxDimension(upgradeWhaleKey, 28 + level * 3, 1.4);
      addImage(0, -h * 0.52, 'glow', 1.15 + level * 0.18);
      addImage(0, -h * 0.58, upgradeWhaleKey, upgradeWhaleScale);
      addImage(0, 20, 'viprope', 1 + level * 0.05);
      addSparkles(10 + level * 3, 0xffe08a);
      for (let i = 0; i < level + 2; i += 1) {
        addImage(-52 + i * 22, -h - 4 - (i % 2) * 8, upgradeCoinKey, upgradeCoinScale * 1.15);
      }
    } else if (place.id === 'dungeon') {
      g.fillStyle(0x7a4bd0, 0.24 + level * 0.08);
      g.fillEllipse(0, -32, w * 0.55, 34 + level * 5);
      g.fillStyle(0xe74c3c);
      g.fillRect(-30, -58, 5, 5);
      g.fillRect(25, -58, 5, 5);
      if (level >= 3) {
        g.fillStyle(0xf2ead8);
        g.fillCircle(-w / 2 - 6, -24, 8);
        g.fillRect(-w / 2 - 10, -20, 8, 5);
      }
    } else if (place.id === 'debt_collector_booth') {
      g.fillStyle(0xf2ead8);
      for (let i = 0; i < level + 1; i += 1) g.fillRect(-w / 2 + 6 + i * 13, -h - 6, 10, 14);
      g.fillStyle(0x14101c);
      g.fillRect(w / 2 + 4, -32, 7, 22);
      g.fillRect(w / 2 + 16, -32, 7, 22);
    } else if (place.id === 'complaint_barrel') {
      g.fillStyle(0x6b4a2b);
      g.fillRect(-w / 2 - 8, -18, 6, 28);
      g.fillRect(w / 2 + 4, -18, 6, 28);
      g.fillStyle(0xf2ead8);
      g.fillRect(-w / 2 - 14, -38, w + 28, 16);
      g.fillStyle(0xc0392b);
      g.fillRect(-w / 2 - 8, -31, w + 16, 3);
    } else if (place.id === 'notice_board') {
      g.fillStyle(0xfff6dc);
      for (let i = 0; i < level + 2; i += 1) g.fillRect(-24 + i * 13, -h + 8 + (i % 2) * 10, 10, 12);
      if (level >= 3) addSparkles(4, 0x7fdc93);
    } else {
      g.fillStyle(place.eventPoolCategory?.includes('corruption') ? 0xc99aec : 0xf6c945, 0.72);
      g.fillRect(-w / 2 - 8, -h + 18, 7, 28);
      g.fillRect(w / 2 + 1, -h + 18, 7, 28);
      g.fillStyle(0xfff6dc);
      g.fillRect(-w / 2 - 14, -h + 8, w + 28, 12);
      if (level >= 3) addSparkles(4 + level, place.eventPoolCategory?.includes('corruption') ? 0xc99aec : 0x7fdc93);
    }

    this.upgradeVisualsById[place.id] = container;
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

  getPlaceInspectorPayload(place) {
    const info = this.getUpgradeInfo(place);
    const catalog = getBuildingCatalogEntry(place.id);
    const runtime = catalog && place.isPlaced
      ? this.getBuildingRuntime(place.id)
      : null;
    const canUpgrade = Boolean(info.cost && !info.maxed);
    const canAfford = canUpgrade && this.resources.gold >= info.cost;
    const lockReason = this.getLockReason(place.id);
    const detailLines = [place.description, ...(place.tooltipLines || [])].filter(Boolean).slice(0, 4);
    const actions = [];

    if (canUpgrade) {
      actions.push({
        label: canAfford ? `Upgrade ${info.cost}g` : `Need ${info.cost}g`,
        event: 'gwg-upgrade-place',
        id: place.id,
        disabled: !canAfford,
        className: place.id === 'whale' ? 'gwg-whale' : '',
      });
    }
    if (['notice_board', 'guildhall', 'sponsored_quest_board'].includes(place.id)) {
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
        className: place.id.includes('premium') || ['vip_lounge', 'lootbox_kiosk', 'gem_exchange'].includes(place.id)
          ? 'gwg-whale'
          : '',
      });
    }

    return {
      title: place.name,
      subtitle: lockReason || `Level ${info.level}${info.maxed ? ' / MAX' : ''}`,
      sections: [
        {
          title: 'Description',
          lines: detailLines,
        },
        {
          title: 'Current',
          lines: [
            `Level: ${info.level}${info.maxed ? ' (max)' : ''}`,
            info.effect ? `Effect: ${info.effect}` : 'Effect: decorative morale hazard.',
            ...(runtime ? [
              `Use: ${runtime.usageCount} visits - growth ${runtime.upgradeProgress}%`,
              `Capacity: ${runtime.visitorsNow}/${runtime.capacity} - quality ${runtime.serviceQuality}`,
            ] : []),
            { text: this.getConsequenceLine(place), className: place.id === 'whale' ? 'gwg-whale' : 'gwg-muted' },
          ],
        },
        {
          title: info.maxed ? 'Upgrade' : 'Next Upgrade',
          lines: info.maxed
            ? ['MAX: allegedly balanced.']
            : [
              info.nextEffect ? `Next: ${info.nextEffect}` : 'Next: more questionable polish.',
              `Cost: ${info.cost} gold`,
              info.flavor || 'The clerk misplaced the upgrade excuse.',
              ...(canAfford ? [] : [{ text: 'Not enough gold. Please exploit responsibly.', className: 'gwg-bad' }]),
            ],
        },
        ...((catalog?.actions || []).length ? [{
          title: 'Shop Actions',
          lines: catalog.actions.map((shopAction) => (
            `${shopAction.label}: ${shopAction.summary}${shopAction.cost ? ` Cost ${shopAction.cost}g.` : ''}`
          )),
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
    this.game.events.emit('gwg-inspector-open', this.getPlaceInspectorPayload(place));
  }

  getQuestInspectorPayload() {
    const rows = this.availableQuests.map((quest) => {
      const posted = quest.posted || this.postedQuests.some((item) => item.noticeId === quest.noticeId);
      const canPost = !this.cycleRunning && !posted && this.resources.gold >= quest.cost;
      const typeLabel = quest.type === 'danger' ? 'Risky' : quest.type.charAt(0).toUpperCase() + quest.type.slice(1);
      const trustText = quest.trust > 0 ? `+${quest.trust}` : `${quest.trust || 0}`;
      const corruptionText = quest.corruption > 0 ? `+${quest.corruption}` : `${quest.corruption || 0}`;
      const failThreat = quest.difficulty * 3;
      return {
        title: quest.name,
        meta: typeLabel,
        kind: quest.type === 'fair' || quest.type === 'trust' ? 'fair' : 'shady',
        lines: [
          `Post: ${quest.cost}g -> Reward: ${quest.reward}g`,
          `Difficulty ${quest.difficulty} / Risk ${quest.risk} / Threat -${quest.threatReduction}`,
          `Trust ${trustText} / Corruption ${corruptionText} / Fail Threat +${failThreat}`,
          `Best for: ${(quest.preferred || []).slice(0, 2).join(', ') || 'whoever still answers mail'}`,
          quest.description,
          ...(posted ? [{ text: 'Posted: resolves on the next town cycle.', className: 'gwg-good' }] : []),
          ...(!posted && !canPost ? [{ text: 'Not enough gold. The guild recommends suspicious revenue.', className: 'gwg-bad' }] : []),
        ],
        actions: [{
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
      const canUpgrade = Boolean(info.cost && !info.maxed && !locked);
      const canAfford = canUpgrade && this.resources.gold >= info.cost;
      const maxLevel = info.def?.maxLevel || 3;
      return {
        place,
        affordable: canAfford,
        maxed: info.maxed,
        locked,
        row: {
          title: place.name,
          meta: locked ? 'LOCKED' : `Level ${info.level}/${maxLevel}`,
          kind: this.getPlaceKind(place),
          lines: locked
            ? [lockReason]
            : [
              `Current: ${info.effect || place.effect || 'decorative trouble'}`,
              info.maxed ? 'Next: MAX' : `Next: ${info.nextEffect || 'more questionable improvements'}`,
              info.maxed ? 'Cost: MAX' : `Cost: ${info.cost}g - ${canAfford ? 'Can afford' : 'Cannot afford'}`,
              info.flavor || place.upgradeFlavor || 'The upgrade clerk smiles without context.',
              { text: this.getConsequenceLine(place), className: place.id === 'whale' ? 'gwg-whale' : 'gwg-muted' },
            ],
          actions: locked
            ? []
            : [{
              label: info.maxed ? 'MAX' : (canAfford ? 'Upgrade' : `Need ${info.cost}g`),
              event: 'gwg-upgrade-place',
              id: place.id,
              disabled: info.maxed || !canAfford,
            }],
        },
      };
    }).sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? 1 : -1;
      if (a.maxed !== b.maxed) return a.maxed ? 1 : -1;
      if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
      return a.place.name.localeCompare(b.place.name);
    });

    return {
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
      rows: rows.map((entry) => entry.row),
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
    this.tooltipTarget = place;
    this.tryUpgradeTooltipTarget();
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
    marker.lineStyle(3, place.id === 'whale' ? 0xf6c945 : 0x7fdc93, 0.95);
    marker.strokeEllipse(place.x, place.y - (place.h || 60) / 2, (place.w || 70) + 26, (place.h || 60) + 22);
    marker.fillStyle(place.id === 'whale' ? 0xf6c945 : 0x7fdc93, 0.12);
    marker.fillEllipse(place.x, place.y - (place.h || 60) / 2, (place.w || 70) + 26, (place.h || 60) + 22);
    this.selectionMarker = marker;
    this.tweens.add({ targets: marker, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
  }

  selectHero(hero) {
    this.clearSelection(false);
    this.selectedHeroId = hero.def.id;
    const marker = this.add.graphics();
    marker.lineStyle(3, 0xf6c945, 0.95);
    marker.strokeCircle(0, -31, 34);
    marker.fillStyle(0xf6c945, 0.12);
    marker.fillCircle(0, -31, 34);
    hero.container.add(marker);
    this.selectionMarker = marker;
    this.setHeroLabelFocus(hero, true);
    this.tweens.add({ targets: marker, alpha: 0.45, duration: 620, yoyo: true, repeat: -1 });
  }

  clearSelection(clearInspector = true) {
    if (this.selectionMarker) {
      this.selectionMarker.destroy();
      this.selectionMarker = null;
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

  refreshActivePanel() {
    if (!this.activeInspector) return;
    if (this.activeInspector.type === 'ledger') this.openTownLedger();
    else if (this.activeInspector.type === 'build') this.openBuildMenu();
    else if (this.activeInspector.type === 'roads') this.openRoadMenu();
    else if (this.activeInspector.type === 'quests') this.showQuestInspector();
    else if (this.activeInspector.type === 'report') this.showCycleReport();
    else if (this.activeInspector.type === 'townlog') this.openTownLog();
    else if (this.activeInspector.type === 'help') this.openHelpPanel();
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
    const nameFor = (id) => this.heroes?.find((item) => item.def.id === id)?.def.name || null;
    const parts = [];
    const rival = nameFor(hero.stats.rivalId);
    const admired = nameFor(hero.stats.admiredId);
    const target = nameFor(hero.stats.resentmentTargetId);
    if (rival) parts.push(`Rival: ${rival}`);
    if (admired) parts.push(`Admires: ${admired}`);
    if (target && target !== rival) parts.push(`Resentment target: ${target}`);
    return parts.length ? parts.join(' / ') : 'Relationships: no named grudge yet.';
  }

  getHeroActionText(hero) {
    if (hero.currentAction) return hero.currentAction;
    if (hero.state === 'away') return `Away until Day ${hero.awayUntil}`;
    if (hero.destination) return `Walking to ${this.getPlaceName(hero.destination)}`;
    return `Idle near ${this.getPlaceName(hero.at)}`;
  }

  getPlaceName(id) {
    return this.placeById?.[id]?.name || this.decorationById?.[id]?.name || id || 'town';
  }

  getOperationalPlace(id) {
    const place = this.placeById?.[id];
    if (place?.isPlaced !== false && this.isLocationUnlocked(id)) return place;
    return this.buildingById?.guildhall || place;
  }

  getHeroInspectorPayload(hero) {
    const whaleAccess = hero.stats.whaleAccess ? 'Yes' : (hero.stats.debt > 250 ? 'Technically' : 'No');
    const history = (hero.stats.history || []).slice(-5).reverse();
    const inventory = Array.isArray(hero.stats.inventory) ? hero.stats.inventory : [];
    return {
      title: hero.def.name,
      subtitle: `Status: ${hero.stats.status || hero.def.personality}`,
      sections: [
        {
          title: 'Identity',
          lines: [
            `Originally: ${hero.stats.originalPersonality || hero.def.personality}`,
            `Current: ${hero.stats.currentPersonality || hero.stats.status || hero.def.personality}`,
            `Mood: ${hero.stats.currentMood || 'Wary'}`,
            `Action: ${this.getHeroActionText(hero)}`,
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
            this.getHeroRelationshipLine(hero),
          ],
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
      runtime.serviceQuality = nextLevel;
      runtime.upgradeProgress = Math.max(0, runtime.upgradeProgress - 35);
      if (place.id === 'tavern') runtime.capacity = 4 + nextLevel * 2;
    }
    if (this.getPlaceKind(place) === 'fair') this.stats.fairUpgrades = (this.stats.fairUpgrades || 0) + 1;
    if (this.getPlaceKind(place) === 'shady') this.stats.shadyUpgrades = (this.stats.shadyUpgrades || 0) + 1;
    this.refreshUpgradeVisual(place);
    this.checkObjectives();

    const sprite = this.placeSpriteById[place.id];
    if (sprite) {
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

      const container = this.add.container(x, y, [sprite, label]).setDepth(y);
      const savedStats = this.savedHeroStats?.[def.id] || {};
      const defaultActive = !this.isBuilderCity || i < 3;
      const hero = {
        def, container, sprite, label,
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
        },
        at: spot.id, pathNode: this.getPathNodeForPlaceId(spot.id)?.id || null, destination: null, state: 'idle',
        currentAction: `Idle near ${this.getPlaceName(spot.id)}`,
        moveTween: null, bobTween: null, timer: null,
        destMarker: null, bubble: null, bubbleTimer: null,
        awayUntil: savedStats.awayUntil || 0,
      };
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
      hit.on('pointerover', () => {
        sprite.setTint(0xfff3c0);
        this.setHeroLabelFocus(hero, true);
      });
      hit.on('pointerout', () => {
        this.applyHeroTint(hero);
        this.setHeroLabelFocus(hero, false);
      });
      hit.on('pointerup', (pointer) => {
        if (this.wasDragGesture(pointer)) return;
        this.showHeroTooltip(hero);
      });

      // idle breathing — replace with a real idle animation later
      const spriteScaleY = sprite.getData('baseScaleY') || sprite.scaleY || NPC_SCALE;
      this.tweens.add({
        targets: sprite, scaleY: { from: spriteScaleY, to: spriteScaleY * 1.04 },
        duration: Phaser.Math.Between(700, 1000), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 600),
      });

      this.refreshHeroStatusMarker(hero);
      if (hero.stats.active) this.scheduleAmbient(hero, Phaser.Math.Between(300, 2500));
      return hero;
    });
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
    if (hero.stats.active === false || status === 'Left Town') hero.sprite.setTint(0x7a7d85);
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
        this.leaveHeroPermanently(hero, 'The economy found the last nerve.');
        continue;
      }

      this.evaluateHeroEvolution(hero);
      this.updateHeroMood(hero);
      this.refreshHeroStatusMarker(hero);
    }
    this.maybeInviteArrival();
    this.maybeResolveItemConflict();
    this.buildRelationship(null, 'mentor');
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

  maybeInviteArrival() {
    const activeCount = this.heroes.filter((hero) => hero.stats.active !== false).length;
    const lodgingCapacity = ['tavern', 'inn', 'hero_hostel', 'premium_lodge']
      .filter((id) => this.isBuildingPlaced(id))
      .reduce((sum, id) => sum + this.getBuildingRuntime(id).capacity, 0);
    const guildCapacity = 3 + Math.max(0, this.getPlaceLevel(this.buildingById.guildhall) - 1);
    const townCapacity = Math.min(28, guildCapacity + lodgingCapacity);
    if (activeCount >= townCapacity) return;
    const arrivalChance = Phaser.Math.Clamp(
      0.3 + this.resources.trust / 250 + this.getPlaceLevel(this.buildingById.guildhall) * 0.04,
      0.25,
      0.82,
    );
    if (Math.random() > arrivalChance) return;
    const candidate = this.heroes.find((hero) => hero.stats.active === false);
    if (!candidate) return;
    candidate.stats.active = true;
    candidate.stats.status = 'New Arrival';
    candidate.stats.currentPersonality = candidate.stats.originalPersonality || candidate.def.personality;
    candidate.stats.morale = 58;
    candidate.stats.loyalty = 55;
    candidate.stats.resentment = Math.max(0, (candidate.stats.resentment || 0) - 20);
    candidate.awayUntil = this.day;
    candidate.state = 'idle';
    candidate.currentAction = `Arrived near ${this.getPlaceName(candidate.at)}`;
    candidate.container.setVisible(true).setAlpha(1);
    this.addHeroHistory(candidate, 'Returned as a new arrival, suspiciously informed.');
    this.refreshHeroStatusMarker(candidate);
    this.game.events.emit(
      'gwg-event',
      `${candidate.def.name} arrived, still unaware of the full business model. Capacity ${activeCount + 1}/${townCapacity}.`,
    );
  }

  // stop whatever the hero is doing so a new order can take over cleanly
  interruptHero(hero) {
    if (hero.moveTween) { hero.moveTween.stop(); hero.moveTween = null; }
    if (hero.bobTween) { hero.bobTween.stop(); hero.bobTween = null; }
    if (hero.timer) { hero.timer.remove(); hero.timer = null; }
    if (hero.destMarker) { hero.destMarker.destroy(); hero.destMarker = null; }
    hero.sprite.setAngle(0);
    hero.container.setAlpha(1);
    hero.destination = null;
    hero.state = 'idle';
    hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
  }

  scheduleAmbient(hero, delay) {
    if (hero.state === 'away') return;
    hero.timer = this.time.delayedCall(delay, () => this.ambientMove(hero));
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
      const center = gridToWorld(road.x, road.y);
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
      const world = gridToWorld(x, y);
      return {
        x: world.x,
        y: world.y - GRID_CONFIG.tileSize / 2,
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
    hero.state = 'walking';
    hero.destination = spot.id;
    hero.currentAction = `Walking to ${this.getPlaceName(spot.id)}`;

    const tx = spot.x + Phaser.Math.Between(-38, 38);
    const ty = spot.y + Phaser.Math.Between(-4, 18);
    const route = this.buildWalkRoute(hero, spot, tx, ty);

    // destination indicator: a small chevron bouncing where the hero is headed
    hero.destMarker = this.add.image(tx, ty - 12, 'chevron').setDepth(3500).setAlpha(0.85);
    this.tweens.add({
      targets: hero.destMarker, y: ty - 4,
      duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    hero.sprite.setFlipX(tx < hero.container.x);
    // waddle while walking — replace with a real walk animation later
    hero.bobTween = this.tweens.add({
      targets: hero.sprite, angle: { from: -4, to: 4 },
      duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

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
        hero.currentAction = `Idle near ${this.getPlaceName(spot.id)}`;
        onArrive?.();
        return;
      }
      hero.sprite.setFlipX(point.x < hero.container.x);
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
        const line = Phaser.Utils.Array.GetRandom([...DENIED_LINES, ...QUEUE_LINES]);
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
    const runtime = this.getBuildingRuntime(id);
    runtime.usageCount += 1;
    runtime.visitorsTotal += 1;
    runtime.upgradeProgress = Math.min(100, runtime.upgradeProgress + 4);
    const place = this.buildingById[id];
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
    if (catalog?.capacity && runtime && runtime.visitorsNow >= runtime.capacity) {
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
    this.tweens.add({ targets: hero.container, alpha: 0, duration: 250 });
    hero.timer = this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
      if (runtime) runtime.visitorsNow = Math.max(0, runtime.visitorsNow - 1);
      this.tweens.add({ targets: hero.container, alpha: 1, duration: 250 });
      hero.state = 'idle';
      hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
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
    const maxBubbles = important ? MAX_IMPORTANT_BUBBLES : MAX_IDLE_BUBBLES;
    if (!important && this.activeBubbles >= maxBubbles) return;
    if (!important && this.hasNearbyBubble(hero)) return;
    if (important && this.activeBubbles >= maxBubbles) this.clearOldestBubble();
    if (important) this.importantChatterUntil = this.time.now + 2800;

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
      important ? 3400 : 2600,
      () => this.clearHeroBubble(hero, true),
    );
  }

  floatText(x, y, str, color) {
    this.floaters = this.floaters.filter((item) => item.active);
    while (this.floaters.length >= MAX_FLOATING_TEXTS) {
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

  showMonsterAttack(monster, gate) {
    if (!monster || !gate) return;
    const textureKey = this.textures.exists(monster.assetKey)
      ? monster.assetKey
      : resolveTexture(this, 'icon_warning', 'chevron');
    if (!textureKey) return;
    const source = this.textures.get(textureKey)?.getSourceImage?.();
    const scale = source?.height ? Phaser.Math.Clamp(42 / source.height, 0.35, 1.4) : 1;
    const sprite = this.add.image(gate.x, gate.y - 28, textureKey)
      .setScale(scale)
      .setDepth(5200);
    this.tweens.add({
      targets: sprite,
      x: Phaser.Math.Linear(gate.x, PLAZA.x, 0.35),
      y: Phaser.Math.Linear(gate.y, PLAZA.y, 0.35),
      alpha: 0,
      duration: 1800,
      ease: 'Sine.easeIn',
      onComplete: () => sprite.destroy(),
    });
  }

  // --- ambient chatter -------------------------------------------------------

  startIdleChatter() {
    const chatter = () => {
      const candidates = this.heroes.filter((h) => (
        (h.state === 'idle' || h.state === 'walking') && !h.bubble
      ));
      if (
        candidates.length > 0
        && !this.cycleRunning
        && this.activeBubbles < MAX_IDLE_BUBBLES
        && this.time.now > this.importantChatterUntil
      ) {
        const hero = Phaser.Utils.Array.GetRandom(candidates);
        const lines = [
          ...(IDLE_QUIPS[hero.def.personality] || []),
          ...(hero.def.idleLines || []),
        ];
        if (lines.length > 0) this.say(hero, Phaser.Utils.Array.GetRandom(lines));
      }
      this.time.delayedCall(Phaser.Math.Between(4200, 8200), chatter);
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
    if (left) cam.scrollX = Phaser.Math.Clamp(cam.scrollX - speed, 0, Math.max(0, WORLD_WIDTH - WIDTH));
    if (right) cam.scrollX = Phaser.Math.Clamp(cam.scrollX + speed, 0, Math.max(0, WORLD_WIDTH - WIDTH));
    if (up) cam.scrollY = Phaser.Math.Clamp(cam.scrollY - speed, 0, Math.max(0, WORLD_HEIGHT - HEIGHT));
    if (down) cam.scrollY = Phaser.Math.Clamp(cam.scrollY + speed, 0, Math.max(0, WORLD_HEIGHT - HEIGHT));

    // depth-sort heroes by their feet; talking heroes pop above rooftops
    for (const hero of this.heroes) {
      hero.container.setDepth(hero.container.y + (hero.bubble ? 800 : 0));
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
      this.say(hero, Phaser.Utils.Array.GetRandom(lines), true);
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
      this.say(hero, Phaser.Utils.Array.GetRandom([...DENIED_LINES, ...QUEUE_LINES]), true);
      this.floatText(ropeSpot.x, ropeSpot.y - 38, 'VIPs ONLY', '#e74c3c');
      this.scheduleAmbient(hero, Phaser.Math.Between(2000, 4200));
    });
  }

  pickQuestHero(quest) {
    const active = this.getActiveHeroes();
    if (active.length === 0) return null;

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

    return Phaser.Math.Clamp(
      34
      + hero.stats.power * 4
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
      this.stats.questsCompleted += 1;
      if (honest) this.stats.honestQuestSuccesses += 1;
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
    this.game.events.emit('gwg-event', `${text} The guild called it emergent gameplay.`);
    this.addTownLog(text, 'npc');
    this.floatText(instigator.container.x, instigator.container.y - 44, 'ITEM CONFLICT', '#f0938f');
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
        const b = this.getOperationalPlace(ev.building);
        const spot = this.doorById[ev.building] || this.doorById.guildhall;
        hero.currentAction = ev.whale ? 'Buying premium advantage' : `Acting at ${this.getPlaceName(ev.building)}`;
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
          if (ev.d.trust < 0) this.stats.whaleTrustLosses += Math.abs(ev.d.trust);
          this.burstCoins(34);
          this.triggerWhaleReaction();
          this.checkUnlocks();
          for (const witness of this.getActiveHeroes().filter((item) => this.isHonestHero(item.def))) {
            witness.stats.resentment = Phaser.Math.Clamp((witness.stats.resentment || 0) + 4, 0, 100);
            witness.stats.envy = Phaser.Math.Clamp((witness.stats.envy || 0) + 8, 0, 100);
            witness.stats.resentmentTargetId = hero.def.id;
          }
          this.buildRelationship(hero, 'whaleEvent');
        }

        this.walkTo(hero, spot, () => {
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
      if (R.threat >= 80) {
        const gate = this.getOperationalPlace('dungeon');
        const defenseFactor = Phaser.Math.Clamp(1 - watchtowerLevel * 0.16, 0.35, 1);
        const monster = rollMonster();
        const d = {
          gold: -Math.ceil(Math.min(260, Math.floor(R.gold * 0.16)) * defenseFactor),
          trust: -Math.max(1, 4 - watchtowerLevel),
          morale: -Math.max(2, 5 - watchtowerLevel),
          threat: -22 - watchtowerLevel * 3,
        };
        this.applyDeltas(d);
        this.floatDeltas(gate.x, gate.y - gate.h - 14, d);
        this.floatText(gate.x, gate.y - gate.h - 34, 'TOWN ATTACK', '#e74c3c');
        this.stats.threatEventsSurvived += 1;
        this.showMonsterAttack(monster, gate);
        this.game.events.emit(
          'gwg-event',
          `${monster.name} attacked. ${monster.flavour}${watchtowerLevel ? ` Watchtowers reduced losses by ${Math.round((1 - defenseFactor) * 100)}%.` : ''}`,
        );
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

    steps.push(() => {
      this.progressHeroStories();
      this.cycleRunning = false;
      this.refreshQuestNotices();
      this.checkObjectives();
      this.checkUnlocks();
      this.checkCrises();
      this.checkStageProgression();
      this.checkTownIdentity();
      this.checkAchievements();
      this.maybeOfferPolicy();
      this.publishTownHint();
      this.refreshActivePanel();
      this.saveGame(false);
      this.showCycleReport();
      this.game.events.emit('gwg-cycle-done');
    });

    steps.forEach((fn, i) => this.time.delayedCall(i * STEP_MS, fn));
  }
}
