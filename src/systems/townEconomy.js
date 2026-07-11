// Lightweight city-builder economy foundations (see
// docs/CITY_BUILDER_SYSTEMS_PLAN.md sections 7-10): service walkers, hero
// lodging capacity, town resource inventory, and simple production hooks.
// Pure data/logic only — TownScene owns rendering and state mutation.

import { RESOURCE_CATALOG } from './production.js';

// --- town inventory ---------------------------------------------------------

export const RESOURCE_TYPES = RESOURCE_CATALOG.map((resource) => ({ ...resource, blurb: resource.use }));

export function normalizeInventory(raw) {
  const inventory = {};
  for (const resource of RESOURCE_TYPES) {
    const value = Number(raw?.[resource.id]);
    inventory[resource.id] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }
  const legacyGear = Math.max(0, Math.floor(Number(raw?.gear) || 0));
  if (legacyGear > 0 && inventory.weapons === 0 && inventory.armor === 0) {
    inventory.weapons = Math.ceil(legacyGear / 2);
    inventory.armor = Math.floor(legacyGear / 2);
  }
  return inventory;
}

export function formatInventoryLine(inventory) {
  return RESOURCE_TYPES
    .map((resource) => `${resource.label} ${inventory?.[resource.id] || 0}`)
    .join('  ');
}

// --- hero lodging -----------------------------------------------------------

// beds per rest building at level 1, plus growth per extra level
export const REST_BUILDINGS = {
  tavern: { beds: 4, bedsPerLevel: 2, quality: 1, label: 'Tavern' },
  inn: { beds: 6, bedsPerLevel: 2, quality: 2, label: 'Inn' },
  hero_hostel: { beds: 10, bedsPerLevel: 3, quality: 0.5, label: 'Hero Hostel' },
  premium_lodge: { beds: 4, bedsPerLevel: 1, quality: 3, label: 'Premium Lodge' },
};

// the guild camp always sleeps a couple of heroes on suspicious cots
export const BASE_CAMP_BEDS = 2;

export function getBedCapacity(placedIds, levelById = {}) {
  let beds = BASE_CAMP_BEDS;
  let qualitySum = 0;
  let qualityCount = 0;
  for (const [id, config] of Object.entries(REST_BUILDINGS)) {
    if (!placedIds.includes(id)) continue;
    const level = Math.max(1, levelById[id] || 1);
    beds += config.beds + (level - 1) * config.bedsPerLevel;
    qualitySum += config.quality;
    qualityCount += 1;
  }
  return {
    beds,
    restQuality: qualityCount ? Math.round((qualitySum / qualityCount) * 10) / 10 : 0.5,
  };
}

// --- service walkers --------------------------------------------------------

// Caesar-style: service buildings periodically send a walker along roads;
// arriving applies a small local effect. No road access = no walker.
export const SERVICE_WALKERS = {
  guildhall: {
    id: 'quest_clerk',
    name: 'Quest Clerk',
    assetKey: 'worker_quest_clerk',
    fallbackKey: 'hero_guild_clerk',
    tint: 0xbcd4f0,
    rangeTiles: 12,
    flavor: 'delivering quest paperwork',
  },
  tavern: {
    id: 'tavern_keeper',
    name: 'Tavern Keeper',
    assetKey: 'worker_tavern_keeper',
    fallbackKey: 'hero_default',
    tint: 0xf0c987,
    rangeTiles: 9,
    flavor: 'advertising indoor sleep',
  },
  blacksmith: {
    id: 'gear_runner',
    name: 'Gear Runner',
    assetKey: 'worker_gear_runner',
    fallbackKey: 'hero_disillusioned_blacksmith',
    tint: 0xc9a0a0,
    rangeTiles: 10,
    flavor: 'hauling fresh gear',
  },
  market: {
    id: 'trader',
    name: 'Trader',
    assetKey: 'worker_trader',
    fallbackKey: 'hero_suspicious_merchant',
    tint: 0xa8d8a0,
    rangeTiles: 11,
    flavor: 'buying loot at fair-ish prices',
  },
  watchtower: {
    id: 'guard_patrol',
    name: 'Guard Patrol',
    assetKey: 'worker_guard_patrol',
    fallbackKey: 'hero_veteran',
    tint: 0xb8c4d8,
    rangeTiles: 13,
    flavor: 'patrolling for unlicensed danger',
  },
  potion_shop: {
    id: 'potion_seller',
    name: 'Potion Seller',
    assetKey: 'worker_potion_seller',
    fallbackKey: 'hero_patch_notes_prophet',
    tint: 0xc9a0e8,
    rangeTiles: 9,
    flavor: 'selling bottled optimism',
  },
  whale: {
    id: 'premium_evangelist',
    name: 'Premium Evangelist',
    assetKey: 'worker_premium_evangelist',
    fallbackKey: 'hero_premium_monk',
    tint: 0xf6c945,
    rangeTiles: 12,
    flavor: 'spreading the gospel of convenience',
  },
};

// per-day caps so walker trickle effects never outgrow day-cycle economy
export const WALKER_DAILY_CAPS = {
  threatReduction: 3,
  evangelistGold: 30,
};

// POI kinds/ids -> what exploring heroes can carry home
export const POI_RESOURCE_YIELDS = {
  poi_resource_grove: { resource: 'wood', min: 1, max: 3 },
  quiet_resource_patch: { resource: 'iron', min: 1, max: 2 },
  poi_herb_patch: { resource: 'herbs', min: 1, max: 3 },
  abandoned_cart: { resource: 'loot', min: 1, max: 2 },
  poi_loot_cave: { resource: 'loot', min: 1, max: 3 },
  loot_stash_remains: { resource: 'loot', min: 1, max: 1 },
  poi_skeleton_ruins: { resource: 'iron', min: 1, max: 1 },
  old_balance_ruin: { resource: 'loot', min: 1, max: 1 },
  poi_premium_ruin: { resource: 'premiumSalvage', min: 1, max: 2, premium: true },
  resource_wood_grove_east: { resource: 'wood', min: 2, max: 4 },
  resource_iron_outcrop_south: { resource: 'iron', min: 2, max: 3 },
  resource_herb_patch_far: { resource: 'herbs', min: 2, max: 4 },
  resource_old_ruins_far: { resource: 'loot', min: 2, max: 3 },
  resource_premium_wreckage_far: { resource: 'premiumSalvage', min: 2, max: 4, premium: true },
};
