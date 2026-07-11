// Readable production-chain data. TownScene owns timing, animation, and state
// mutation; this module keeps recipes, resource groups, trade, and ranks out of
// the already-large scene.

export const RESOURCE_CATALOG = [
  { id: 'wood', label: 'Wood', group: 'raw', icon: 'icon_wood', use: 'Sawmills turn it into planks.' },
  { id: 'iron', label: 'Iron', group: 'raw', icon: 'icon_iron', use: 'Forges and workshops turn it into equipment and tools.' },
  { id: 'herbs', label: 'Herbs', group: 'raw', icon: 'icon_herbs', use: 'Potion Shops turn it into recovery supplies.' },
  { id: 'loot', label: 'Loot', group: 'raw', icon: 'icon_loot', use: 'Salvage Yards recover goods; Markets sell it cheaply.' },
  { id: 'premiumSalvage', label: 'Premium Salvage', group: 'raw', icon: 'icon_whale', use: 'Fabricators convert it into suspicious components.' },
  { id: 'planks', label: 'Planks', group: 'processed', icon: 'icon_wood', use: 'Construction stock for lodging and industrial growth.' },
  { id: 'tools', label: 'Tools', group: 'processed', icon: 'icon_upgrade', use: 'Improves extraction and production efficiency.' },
  { id: 'weapons', label: 'Weapons', group: 'hero', icon: 'item_iron_sword', use: 'Raises hero combat and quest power.' },
  { id: 'armor', label: 'Armor', group: 'hero', icon: 'item_basic_armor', use: 'Reduces injury and death pressure.' },
  { id: 'potions', label: 'Potions', group: 'hero', icon: 'item_healing_potion', use: 'Supports injured heroes and dangerous expeditions.' },
  { id: 'tradeGoods', label: 'Trade Goods', group: 'trade', icon: 'item_gem_bag', use: 'Markets export these for dependable gold.' },
  { id: 'premiumComponents', label: 'Premium Components', group: 'trade', icon: 'icon_whale', use: 'Creates premium equipment, envy, and excellent invoices.' },
];

export const RESOURCE_BY_ID = Object.fromEntries(RESOURCE_CATALOG.map((resource) => [resource.id, resource]));
export const RAW_RESOURCES = RESOURCE_CATALOG.filter((resource) => resource.group === 'raw').map((resource) => resource.id);
export const PROCESSED_RESOURCES = RESOURCE_CATALOG.filter((resource) => resource.group !== 'raw').map((resource) => resource.id);
export const HERO_SUPPLY_RESOURCES = RESOURCE_CATALOG.filter((resource) => resource.group === 'hero').map((resource) => resource.id);

const recipe = (id, building, name, inputs, outputs, options = {}) => ({
  id,
  building,
  name,
  inputs,
  outputs,
  days: options.days || 1,
  minRank: options.minRank || 0,
  corruption: options.corruption || 0,
  trust: options.trust || 0,
  flavor: options.flavor || 'Materials entered. Accounting emerged changed.',
});

export const PRODUCTION_RECIPES = [
  recipe('sawmill_planks', 'sawmill', 'Produce Planks', { wood: 2 }, { planks: 2 }, {
    flavor: 'Two logs entered. Several standardized rectangles emerged.',
  }),
  recipe('workshop_tools', 'workshop', 'Produce Tools', { planks: 2, iron: 1 }, { tools: 1 }, {
    days: 2,
    flavor: 'The workshop invented leverage and immediately charged upkeep.',
  }),
  recipe('forge_weapons', 'blacksmith', 'Forge Weapons', { iron: 2 }, { weapons: 1 }, {
    flavor: 'The blade is practical, sharp, and not yet sponsored.',
  }),
  recipe('forge_armor', 'blacksmith', 'Forge Armor', { iron: 3 }, { armor: 1 }, {
    days: 2,
    flavor: 'Armor produced. Mortality downgraded from feature to risk.',
  }),
  recipe('forge_tools', 'blacksmith', 'Forge Tools', { iron: 2 }, { tools: 1 }, {
    flavor: 'The Blacksmith made tools and briefly supported the whole economy.',
  }),
  recipe('brew_potions', 'potion_shop', 'Brew Potions', { herbs: 2 }, { potions: 2 }, {
    flavor: 'The purple batch is medicinal according to the purple label.',
  }),
  recipe('salvage_trade_goods', 'salvage_yard', 'Recover Trade Goods', { loot: 2 }, { tradeGoods: 2 }, {
    flavor: 'Loot became merchandise after a respectful change of shelf.',
  }),
  recipe('salvage_equipment', 'salvage_yard', 'Recover Equipment', { loot: 3 }, { weapons: 1 }, {
    days: 2,
    flavor: 'A sword was recovered. Its previous owner left no review.',
  }),
  recipe('market_trade_goods', 'market', 'Export Trade Goods', { tradeGoods: 2 }, { gold: 52 }, {
    flavor: 'The Market exported value and retained the narrative fee.',
  }),
  recipe('market_raw_loot', 'market', 'Sell Raw Loot', { loot: 2 }, { gold: 28 }, {
    flavor: 'Raw loot sold quickly, cheaply, and with tremendous confidence.',
  }),
  recipe('fabricate_components', 'premium_fabricator', 'Fabricate Premium Components', { premiumSalvage: 2 }, { premiumComponents: 1 }, {
    days: 2,
    minRank: 3,
    corruption: 2,
    trust: -1,
    flavor: 'Questionable debris became a component with better lighting.',
  }),
];

export const RECIPES_BY_BUILDING = PRODUCTION_RECIPES.reduce((result, item) => {
  if (!result[item.building]) result[item.building] = [];
  result[item.building].push(item);
  return result;
}, {});
export const RECIPE_BY_ID = Object.fromEntries(PRODUCTION_RECIPES.map((item) => [item.id, item]));
export const DEFAULT_RECIPE_BY_BUILDING = {
  sawmill: 'sawmill_planks',
  workshop: 'workshop_tools',
  blacksmith: 'forge_weapons',
  potion_shop: 'brew_potions',
  salvage_yard: 'salvage_trade_goods',
  market: 'market_trade_goods',
  premium_fabricator: 'fabricate_components',
};

export const PRODUCTION_PRIORITIES = {
  low: { id: 'low', label: 'Low', progress: 0.6, upkeep: 0 },
  normal: { id: 'normal', label: 'Normal', progress: 1, upkeep: 0 },
  high: { id: 'high', label: 'High', progress: 1.45, upkeep: 1 },
};

export function normalizeProductionRuntime(raw = {}, buildingId = '') {
  raw = raw || {}; // guard: default param only covers undefined, not a saved null
  const recipeId = RECIPE_BY_ID[raw.recipeId]?.building === buildingId
    ? raw.recipeId
    : DEFAULT_RECIPE_BY_BUILDING[buildingId] || null;
  return {
    recipeId,
    paused: Boolean(raw.paused),
    priority: PRODUCTION_PRIORITIES[raw.priority] ? raw.priority : 'normal',
    progress: Math.max(0, Number(raw.progress) || 0),
    batches: Math.max(0, Math.floor(Number(raw.batches) || 0)),
    resourcesProcessed: Math.max(0, Math.floor(Number(raw.resourcesProcessed) || 0)),
    outputBuffer: raw.outputBuffer && typeof raw.outputBuffer === 'object' ? { ...raw.outputBuffer } : {},
    lastStatus: typeof raw.lastStatus === 'string' ? raw.lastStatus : 'Ready',
  };
}

export function formatResourceAmountMap(values = {}) {
  return Object.entries(values)
    .map(([id, amount]) => `${amount} ${RESOURCE_BY_ID[id]?.label || id}`)
    .join(' + ');
}

export function hasRecipeInputs(inventory = {}, inputs = {}, reserves = {}) {
  return Object.entries(inputs).every(([id, amount]) => (
    (inventory[id] || 0) - (reserves[id] || 0) >= amount
  ));
}

export const TRADE_PRICES = {
  wood: { buy: 34, sell: 12 },
  iron: { buy: 48, sell: 18 },
  herbs: { buy: 38, sell: 15 },
  loot: { buy: 60, sell: 14 },
  planks: { buy: 44, sell: 20 },
  tools: { buy: 90, sell: 42 },
  weapons: { buy: 120, sell: 58 },
  armor: { buy: 150, sell: 72 },
  potions: { buy: 82, sell: 36 },
  tradeGoods: { buy: 75, sell: 30 },
};

export function normalizeTradeSettings(raw = {}) {
  raw = raw || {}; // guard: default param only covers undefined, not a saved null
  return {
    preferredExport: TRADE_PRICES[raw.preferredExport] ? raw.preferredExport : 'tradeGoods',
    autoExport: raw.autoExport !== false,
    reserves: {
      wood: Math.max(0, Math.floor(Number(raw.reserves?.wood) || 4)),
      iron: Math.max(0, Math.floor(Number(raw.reserves?.iron) || 3)),
      herbs: Math.max(0, Math.floor(Number(raw.reserves?.herbs) || 3)),
      potions: Math.max(0, Math.floor(Number(raw.reserves?.potions) || 2)),
      weapons: Math.max(0, Math.floor(Number(raw.reserves?.weapons) || 2)),
      armor: Math.max(0, Math.floor(Number(raw.reserves?.armor) || 2)),
      tradeGoods: Math.max(0, Math.floor(Number(raw.reserves?.tradeGoods) || 2)),
    },
  };
}

export const EQUIPMENT_QUALITY = {
  Poor: { power: 0, armor: 0 },
  Common: { power: 1, armor: 1 },
  Good: { power: 3, armor: 2 },
  Excellent: { power: 5, armor: 4 },
  Premium: { power: 8, armor: 6 },
};

export function normalizeHeroEquipment(raw = {}) {
  raw = raw || {}; // guard: default param only covers undefined, not a saved null
  return {
    weapon: EQUIPMENT_QUALITY[raw.weapon] ? raw.weapon : 'Poor',
    armor: EQUIPMENT_QUALITY[raw.armor] ? raw.armor : 'Poor',
    potions: Math.max(0, Math.min(3, Math.floor(Number(raw.potions) || 0))),
    readiness: Math.max(0, Math.min(100, Math.floor(Number(raw.readiness) || 45))),
    premium: Boolean(raw.premium),
  };
}

export const TOWN_RANKS = [
  { id: 'camp', name: 'Questionable Camp', score: 0, description: 'A clearing with paperwork and unusually ambitious debt.' },
  { id: 'garage', name: 'Garage Guild', score: 20, description: 'A functioning guild if nobody inspects the hinges.' },
  { id: 'settlement', name: 'Recognized Settlement', score: 38, description: 'Maps include the town now. Some use a warning symbol.' },
  { id: 'renowned', name: 'Renowned Guild Town', score: 56, description: 'Veterans arrive expecting armor, potions, and fewer excuses.' },
  { id: 'trade_city', name: 'Heroic Trade City', score: 74, description: 'Production chains work. Accountability remains artisanal.' },
  { id: 'premium_problem', name: 'Premium Kingdom Problem', score: 90, description: 'The economy has become too shiny for local government.' },
];

export function getRankForScore(score = 0) {
  return [...TOWN_RANKS].reverse().find((rank) => score >= rank.score) || TOWN_RANKS[0];
}
