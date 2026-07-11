// Resource extraction, transport, storage, and territory config (see
// docs/CITY_BUILDER_SYSTEMS_PLAN.md "Extraction & Frontier Loop"). Pure data;
// TownScene owns runtime state, rendering, and mutation. No new PixelLab
// assets — extraction buildings and carriers reuse existing node/worker art.

// --- storage ----------------------------------------------------------------
// Base per-resource cap without a storehouse; each storehouse level adds more.
// Finished goods use Warehouses; raw stock uses Storehouses.
export const BASE_STORAGE_CAP = 24;
export const STOREHOUSE_CAP_PER_LEVEL = 30;
export const STORED_RESOURCES = ['wood', 'iron', 'herbs', 'loot', 'premiumSalvage'];

// --- extraction buildings ---------------------------------------------------
// Each camp gathers one resource from a matching node within range. assetKey
// points at existing art so nothing needs generating.
export const EXTRACTION_BUILDINGS = {
  lumber_camp: {
    id: 'lumber_camp',
    resource: 'wood',
    label: 'Lumber Camp',
    canHarvestForest: true,
    carrier: 'wood_carrier',
    baseRate: 3,
  },
  mining_camp: {
    id: 'mining_camp',
    resource: 'iron',
    label: 'Mining Camp',
    carrier: 'ore_carrier',
    baseRate: 2,
  },
  herbalist_hut: {
    id: 'herbalist_hut',
    resource: 'herbs',
    label: 'Herbalist Hut',
    carrier: 'herb_collector',
    baseRate: 3,
  },
  salvage_camp: {
    id: 'salvage_camp',
    resource: 'loot',
    accepts: ['loot', 'premiumSalvage'],
    label: 'Salvage Camp',
    carrier: 'salvage_runner',
    baseRate: 2,
  },
};

export const EXTRACTION_IDS = Object.keys(EXTRACTION_BUILDINGS);

// how close (in tiles) a camp must be to a matching node to work
export const EXTRACTION_RANGE_TILES = 16;

// --- carriers ---------------------------------------------------------------
// Visible workers that haul a package from a camp toward the nearest
// storehouse / market / guild hall. Reuse worker sprites with a tint fallback.
export const CARRIER_CONFIG = {
  wood_carrier: { name: 'Wood Carrier', resource: 'wood', assetKey: 'worker_trader', fallbackKey: 'hero_default', tint: 0x9c7b4a },
  ore_carrier: { name: 'Ore Carrier', resource: 'iron', assetKey: 'worker_gear_runner', fallbackKey: 'hero_default', tint: 0xa8a8b4 },
  herb_collector: { name: 'Herb Collector', resource: 'herbs', assetKey: 'worker_potion_seller', fallbackKey: 'hero_default', tint: 0x8fbf7a },
  salvage_runner: { name: 'Salvage Runner', resource: 'loot', assetKey: 'worker_quest_clerk', fallbackKey: 'hero_default', tint: 0xc7b06a },
  premium_salvage_runner: { name: 'Premium Salvage Runner', resource: 'premiumSalvage', assetKey: 'worker_premium_evangelist', fallbackKey: 'hero_default', tint: 0xf6c945 },
  plank_runner: { name: 'Plank Runner', resource: 'planks', assetKey: 'worker_trader', fallbackKey: 'hero_default', tint: 0xb88a56 },
  tool_runner: { name: 'Tool Runner', resource: 'tools', assetKey: 'worker_gear_runner', fallbackKey: 'hero_default', tint: 0x93a4aa },
  goods_runner: { name: 'Goods Runner', resource: 'tradeGoods', assetKey: 'worker_quest_clerk', fallbackKey: 'hero_default', tint: 0xd6b86c },
  gear_runner: { name: 'Gear Runner', resource: 'weapons', assetKey: 'worker_gear_runner', fallbackKey: 'hero_default', tint: 0xb9bdc8 },
  armor_runner: { name: 'Armor Runner', resource: 'armor', assetKey: 'worker_guard_patrol', fallbackKey: 'hero_default', tint: 0x8fa5bd },
  potion_runner: { name: 'Potion Runner', resource: 'potions', assetKey: 'worker_potion_seller', fallbackKey: 'hero_default', tint: 0xaa83c7 },
  component_runner: { name: 'Questionable Component Runner', resource: 'premiumComponents', assetKey: 'worker_premium_evangelist', fallbackKey: 'hero_default', tint: 0xf6c945 },
};

// --- territory --------------------------------------------------------------
// Influence radius (tiles) each anchor projects. Union of all anchors is the
// supported territory: cheaper, safer construction; outside is a frontier.
export const TERRITORY_RADIUS = {
  guildhall: 16,
  frontier_outpost: 13,
  watchtower: 9,
  storehouse: 8,
};
export const FRONTIER_BUILD_SURCHARGE = 1.35; // gold multiplier outside territory

// --- resource nodes ---------------------------------------------------------
// Starting stock + daily regen + inherent danger by resource type. amount is
// finite: nodes deplete, then slowly regenerate (loot ruins never regrow).
export const NODE_DEFAULTS = {
  wood: { amount: 48, regenPerDay: 2, danger: 12 },
  iron: { amount: 34, regenPerDay: 1, danger: 34 },
  herbs: { amount: 40, regenPerDay: 2, danger: 18 },
  loot: { amount: 26, regenPerDay: 0, danger: 48 },
  premiumSalvage: { amount: 18, regenPerDay: 0, danger: 62 },
};

export function makeNodeRuntime(resource, premium = false) {
  const defaults = NODE_DEFAULTS[resource] || NODE_DEFAULTS.wood;
  return {
    resource,
    amount: defaults.amount,
    maxAmount: defaults.amount,
    regenPerDay: defaults.regenPerDay,
    danger: defaults.danger + (premium ? 20 : 0),
    premium,
    surveyed: false,
    accessEstablished: false,
    gathererId: null,
    pending: 0, // extracted-but-not-yet-delivered package units
  };
}

export function normalizeNodeRuntime(raw, resource, premium = false) {
  const base = makeNodeRuntime(resource, premium);
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    amount: Number.isFinite(raw.amount) ? Math.max(0, Math.floor(raw.amount)) : base.amount,
    maxAmount: Number.isFinite(raw.maxAmount) ? raw.maxAmount : base.maxAmount,
    danger: Number.isFinite(raw.danger) ? raw.danger : base.danger,
    surveyed: Boolean(raw.surveyed),
    accessEstablished: Boolean(raw.accessEstablished),
    gathererId: raw.gathererId || null,
    pending: Number.isFinite(raw.pending) ? Math.max(0, raw.pending) : 0,
  };
}
