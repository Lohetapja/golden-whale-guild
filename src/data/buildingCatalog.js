// icon is an item manifest key (item_*); the inspector shows it next to the
// action line when the texture/file exists, and falls back to text otherwise
const action = (id, label, summary, cost, deltas, heroEffect = null, icon = null) => ({
  id,
  label,
  summary,
  cost,
  deltas,
  heroEffect,
  icon,
});

const core = (
  id,
  name,
  category,
  cost,
  footprint,
  description,
  options = {},
) => ({
  id,
  name,
  category,
  cost,
  footprint,
  description,
  assetKey: options.assetKey || `building_${id}`,
  roadRequired: options.roadRequired !== false,
  maxCount: options.maxCount || 1,
  unlockKey: options.unlockKey || null,
  lockReason: options.lockReason || null,
  upkeep: options.upkeep || 0,
  capacity: options.capacity || 0,
  kind: options.kind || 'fair',
  effect: options.effect || description,
  flavor: options.flavor || 'The planning clerk has not invented an excuse yet.',
  actions: options.actions || [],
});

export const BUILDING_CATALOG = [
  core('guildhall', 'Guild Hall', 'Core Buildings', 420, { w: 3, h: 3 }, 'Posts quests and produces heroic paperwork.', {
    capacity: 6,
  }),
  core('tavern', 'Tavern', 'Rest / Housing', 260, { w: 2, h: 2 }, 'Adds beds and morale recovery.', {
    capacity: 6,
    flavor: 'Heroes can now discover the premium feature called indoors.',
  }),
  core('blacksmith', 'Blacksmith', 'Recovery / Support', 320, { w: 2, h: 2 }, 'Improves honest hero power and forge-related optimism.'),
  core('training', 'Training Yard', 'Recovery / Support', 360, { w: 3, h: 2 }, 'Turns time and effort into suspiciously modest numbers.'),
  core('market', 'Market', 'Economy / Shady', 240, { w: 2, h: 2 }, 'Steady gold with optional dynamic suffering.', {
    kind: 'mixed',
    actions: [
      action('sell_loot', 'Sell Hero Loot', '+Gold from surplus loot.', 0, { gold: 110 }, null, 'item_gem_bag'),
      action('buy_supplies', 'Buy Supplies', '+Morale and service quality.', 90, { morale: 2 }, 'quality', 'item_herb_bundle'),
      action('fair_equipment', 'Stock Fair Equipment', '+Trust, honest hero Power.', 140, { trust: 2 }, 'honestPower', 'item_basic_armor'),
    ],
  }),
  core('dungeon', 'Dungeon Gate', 'Defense / Missions', 500, { w: 3, h: 2 }, 'Quest access, threat control, and a door monsters respect selectively.', {
    kind: 'mixed',
  }),
  core('whale', 'Golden Whale Milking Station', 'Premium', 680, { w: 3, h: 3 }, 'Generates gold, corruption, and social collapse.', {
    kind: 'shady',
    flavor: 'Totally optional. Unless you enjoy winning.',
    actions: [
      action('premium_weapon', 'Sell Premium Weapon', '+Gold, whale Power, +Envy.', 0, { gold: 240, corruption: 3, trust: -2 }, 'whalePower', 'item_sword_of_unfair_advantage'),
      action('morale_boost', 'Sell Morale Boost', '+Gold, whale Morale.', 0, { gold: 160, corruption: 2 }, 'whaleMorale', 'item_confidence_booster_soup'),
      action('token_pack', 'Sell Whale Token Pack', 'Large +Gold, +Corruption.', 0, { gold: 300, corruption: 4, trust: -2 }, null, 'item_whale_token_pack'),
      action('optional_bundle', '"Optional" Convenience Bundle', 'Huge +Gold, -Trust, whale Power.', 0, { gold: 380, trust: -4, corruption: 5 }, 'whalePower', 'item_deluxe_struggle_bundle'),
      {
        ...action('scout_report', 'Premium Scout Report', 'Reveals fog for money. +Corruption.', 150, { corruption: 3 }, null, 'ui_dayreport_icon'),
        special: 'scoutReveal',
      },
    ],
  }),

  core('inn', 'Inn', 'Rest / Housing', 350, { w: 2, h: 2 }, 'Warm beds for heroes with enough dignity left to request blankets.', {
    capacity: 8,
    unlockKey: 'tavern',
    lockReason: 'Build a Tavern first. Hospitality requires a pilot program.',
    effect: '+8 hero capacity and stronger morale recovery.',
    flavor: 'Adds mattresses that have not yet read the terms of service.',
    actions: [
      action('fair_beds', 'Rent Fair Beds', '+Gold, +Morale.', 0, { gold: 70, morale: 2 }),
      action('raise_prices', 'Raise Room Prices', '+Gold, -Trust.', 0, { gold: 130, trust: -2 }),
      action('add_beds', 'Add Beds', '+2 capacity.', 120, {}, 'capacity'),
      action('comfort', 'Improve Comfort', '+Morale, +Trust.', 90, { morale: 4, trust: 1 }),
    ],
  }),
  core('hero_hostel', 'Hero Hostel', 'Rest / Housing', 450, { w: 3, h: 2 }, 'Many affordable bunks and one heroic queue for the washroom.', {
    capacity: 12,
    unlockKey: 'hostel',
    lockReason: 'Unlocks at 6 active heroes or when the Tavern reaches capacity.',
    effect: '+12 hero capacity; modest recovery at practical prices.',
    flavor: 'More beds, fewer pillows, identical dreams of loot.',
    actions: [
      action('bunks', 'Add Bunk Beds', '+3 capacity, -Morale.', 100, { morale: -1 }, 'capacityLarge', 'item_budget_bunk_pass'),
      action('cut_maintenance', 'Cut Maintenance', '+Gold, -Trust, -Morale.', 0, { gold: 150, trust: -2, morale: -2 }),
      action('cheap_rest', 'Offer Cheap Rest', '+Trust, +Morale, costs Gold.', 80, { trust: 2, morale: 4 }, null, 'item_budget_bunk_pass'),
    ],
  }),
  core('premium_lodge', 'Premium Lodge', 'Rest / Housing', 900, { w: 3, h: 2 }, 'Luxury recovery where pillows have account managers.', {
    capacity: 8,
    kind: 'shady',
    unlockKey: 'whale3',
    lockReason: 'Requires Golden Whale Level 3.',
    effect: 'Whales recover faster; +Gold, +Corruption, +Envy.',
    flavor: 'Every pillow includes a small convenience fee.',
    actions: [
      action('luxury_recovery', 'Luxury Recovery', '+Gold; whales gain Morale.', 0, { gold: 220, corruption: 2 }, 'whaleMorale', 'item_deluxe_potion'),
      action('pillow_fee', 'Premium Pillow Fee', '+Gold, -Trust.', 0, { gold: 280, trust: -3, corruption: 2 }, null, 'item_luxury_pillow'),
      action('whale_rest', 'Whale-Only Rest', '+Whale Power, +Envy.', 120, { trust: -2 }, 'whalePower', 'item_premium_knees'),
    ],
  }),
  core('potion_shop', 'Potion Shop', 'Recovery / Support', 400, { w: 2, h: 2 }, 'Mission recovery bottled in colors not approved by nature.', {
    unlockKey: 'failedQuest',
    lockReason: 'Unlocks after Day 3 or the first failed quest.',
    effect: 'Improves quest survival and softens failure morale damage.',
    flavor: 'The purple one is either medicine or a business model.',
    actions: [
      action('healing', 'Brew Healing Potions', '+Morale, better recovery.', 70, { morale: 5 }, 'healWeak', 'item_healing_potion'),
      action('questionable', 'Sell Questionable Potion', '+Gold, +Corruption.', 0, { gold: 150, corruption: 3 }, null, 'item_risky_potion'),
      action('stock_herbs', 'Stock Recovery Herbs', '+Service quality.', 100, {}, 'quality', 'item_herb_bundle'),
    ],
  }),
  core('mentor_hall', 'Mentor Hall', 'Recovery / Support', 550, { w: 2, h: 2 }, 'Patient teachers for heroes still willing to learn slowly.', {
    unlockKey: 'mentor',
    lockReason: 'Requires Trust above 60 or a hero with Resentment above 40.',
    effect: 'Honest heroes grow faster; Resentment falls.',
    flavor: 'A suspicious institution where knowledge is not a bundle.',
    actions: [
      action('mentor_weak', 'Mentor Weak Hero', '+Power to weakest honest hero.', 90, { trust: 1 }, 'mentorWeak'),
      action('group_lesson', 'Group Lesson', '+Honest Power, +Morale.', 150, { morale: 2 }, 'honestPower'),
      action('fair_grant', 'Fair Training Grant', '+Trust, +Loyalty.', 180, { trust: 4 }, 'honestLoyalty', 'item_honest_training_scroll'),
    ],
  }),
  core('watchtower', 'Watchtower', 'Defense / Missions', 500, { w: 2, h: 2 }, 'A tall place for noticing consequences before they arrive.', {
    unlockKey: 'watchtower',
    lockReason: 'Unlocks when Threat reaches 40 or after the first town attack.',
    effect: 'Reduces Threat growth and future attack losses.',
    flavor: 'Includes one bell and no premium mute option.',
    actions: [
      action('patrol', 'Patrol Roads', '-Threat, costs Gold.', 70, { threat: -8 }),
      action('alarm', 'Raise Alarm', '-Threat, -Morale.', 0, { threat: -5, morale: -1 }),
      action('subscription', 'Sell Safety Subscription', '+Gold, +Corruption.', 0, { gold: 140, corruption: 2, trust: -1 }),
    ],
  }),
  core('arena', 'Arena', 'Defense / Missions', 800, { w: 3, h: 3 }, 'Combat training with banners, spectators, and waivers.', {
    unlockKey: 'arena',
    lockReason: 'Requires town stage 2 or average hero Power above 10.',
    effect: 'Improves quest success and hero combat Power.',
    flavor: 'Fair fights available before the sponsor arrives.',
    actions: [
      action('fair_tournament', 'Host Fair Tournament', '+Trust, +Power, costs Gold.', 160, { trust: 3, morale: 2 }, 'allPower'),
      action('rig_match', 'Rig Sponsored Match', '+Gold, +Corruption, +Envy.', 0, { gold: 260, corruption: 4, trust: -3 }, 'whalePower'),
      action('champions', 'Train Champions', '+Power to strongest heroes.', 190, {}, 'championPower'),
    ],
  }),
  core('bank_debt_office', 'Bank / Debt Office', 'Economy / Shady', 450, { w: 2, h: 2 }, 'Contracts, locked chests, and interest with a pulse.', {
    kind: 'shady',
    unlockKey: 'bank',
    lockReason: 'Requires Corruption above 30 or any hero Debt above 300.',
    effect: 'Generates debt income; increases Corruption and debt events.',
    flavor: 'The contract smiles only after the signature.',
    actions: [
      action('loan', 'Offer Loan', '+Gold, hero Debt, +Corruption.', 0, { gold: 180, corruption: 2 }, 'addDebt', 'item_debt_contract'),
      action('interest', 'Increase Interest', '+Gold, -Trust, -Morale.', 0, { gold: 250, trust: -3, morale: -2 }, 'addDebtLarge', 'item_interest_rate_totem'),
      action('forgive', 'Forgive Debt', '+Trust, +Morale, costs Gold.', 180, { trust: 4, morale: 3 }, 'reduceDebt', 'item_shame_coin_pouch'),
      action('refinance', 'Refinance Shamefully', '+Gold, rearranged suffering.', 0, { gold: 120, corruption: 3 }, 'shuffleDebt', 'item_cursed_coupon'),
    ],
  }),
  core('gem_exchange', 'Gem Exchange', 'Economy / Shady', 600, { w: 2, h: 1 }, 'A glowing booth that converts ordinary gold into premium confusion.', {
    kind: 'shady',
    unlockKey: 'premiumItems',
    lockReason: 'Unlocks after the town creates a premium item.',
    effect: 'Premium trades generate Gold and Corruption.',
    flavor: 'The exchange rate is dynamic, which means it can smell fear.',
    actions: [
      action('convert', 'Convert Gold to Tokens', '+Premium item chance, costs Gold.', 180, { corruption: 2 }, 'premiumItem', 'item_whale_token_pack'),
      action('dynamic', 'Dynamic Gem Pricing', '+Gold, -Trust.', 0, { gold: 230, trust: -3, corruption: 3 }, null, 'item_gem_bag'),
      action('best_value', 'Best Value Pack', '+Gold, +Corruption, +Envy.', 0, { gold: 300, corruption: 5, trust: -3 }, 'whalePower', 'item_best_value_bundle'),
    ],
  }),
  core('convenience_office', 'Convenience Office', 'Economy / Shady', 650, { w: 2, h: 2 }, 'Urgent stamps and waiting-time removal shaped exactly like power.', {
    kind: 'shady',
    unlockKey: 'stage2',
    lockReason: 'Requires town stage 2 or three policy choices.',
    effect: 'Produces Gold and reduces friction while Trust files objections.',
    flavor: 'Nothing sold here is power. It merely removes everything before power.',
    actions: [
      action('skip_queue', 'Skip Queue', '+Gold, -Trust.', 0, { gold: 170, trust: -2, corruption: 2 }, null, 'item_queue_skip_relic'),
      action('permit', 'Fast Track Permit', '+Building growth, costs Gold.', 120, {}, 'buildingProgress', 'item_convenience_permit'),
      action('urgent', 'Stamp Urgent Paperwork', '+Gold, +Threat.', 0, { gold: 210, threat: 3 }, null, 'item_refund_denial_stamp'),
    ],
  }),
  core('vip_lounge', 'VIP Lounge', 'Premium', 700, { w: 2, h: 2 }, 'Shiny chairs behind a rope that has never met equality.', {
    kind: 'shady',
    unlockKey: 'whale2',
    lockReason: 'Requires Golden Whale Level 2 or a Whale-tier hero.',
    effect: 'Whales spend more; Trust falls and Resentment rises.',
    flavor: 'The chairs are comfortable enough to forget the queue outside.',
    actions: [
      action('chair', 'Sell Premium Chair', '+Gold, +Corruption.', 0, { gold: 190, corruption: 2 }, null, 'item_luxury_pillow'),
      action('gala', 'Host Whale Gala', 'Large +Gold, -Trust, +Envy.', 80, { gold: 360, trust: -5, corruption: 4 }, 'whalePower', 'item_deluxe_potion'),
      action('exclude', 'Exclude Free Heroes', '+Whale Morale, -Town Morale.', 0, { morale: -3, trust: -2 }, 'whaleMorale', 'item_premium_knees'),
    ],
  }),
  core('lootbox_kiosk', 'Lootbox Kiosk', 'Premium', 500, { w: 1, h: 1 }, 'A tiny mystery chest with a very large ethics disclaimer.', {
    kind: 'shady',
    unlockKey: 'lootbox',
    lockReason: 'Requires Golden Whale or Corruption above 35.',
    effect: 'Creates premium items, Gold, Corruption, and heroic opinions.',
    flavor: 'The odds are visible to anyone with enchanted legal vision.',
    actions: [
      action('mystery', 'Open Mystery Chest', 'Premium item chance, costs Gold.', 100, { corruption: 2 }, 'premiumItem', 'item_mystery_chest'),
      action('fake_odds', 'Display Fake Odds', '+Gold, -Trust.', 0, { gold: 160, trust: -3, corruption: 3 }, null, 'item_fake_odds_flyer'),
      action('disappointment', 'Sell Shiny Disappointment', '+Gold, -Morale.', 0, { gold: 210, morale: -2, corruption: 2 }, null, 'item_shiny_disappointment_box'),
    ],
  }),
];

export const CATALOG_BY_ID = Object.fromEntries(BUILDING_CATALOG.map((entry) => [entry.id, entry]));

export const BUILD_CATEGORIES = [
  'Roads',
  'Core',
  'Rest / Housing',
  'Economy / Shops',
  'Defense / Missions',
  'Premium / Shady',
  'Public Order / Social',
  'Decorations',
];

export const BUILD_MENU_CATEGORIES = [
  {
    id: 'roads',
    label: 'Roads',
    description: 'Access first. Heroic ankles second.',
    buildingIds: [],
  },
  {
    id: 'core',
    label: 'Civic Core',
    description: 'The services that make this pile of liabilities legally a town.',
    buildingIds: ['guildhall', 'tavern', 'blacksmith', 'market', 'training', 'dungeon'],
  },
  {
    id: 'rest',
    label: 'Rest & Housing',
    description: 'Beds, blankets, and places to process quest trauma.',
    buildingIds: ['inn', 'hero_hostel', 'premium_lodge'],
  },
  {
    id: 'economy',
    label: 'Shops & Supply',
    description: 'Honest commerce, dishonest margins.',
    buildingIds: ['potion_shop', 'bank_debt_office', 'gem_exchange', 'convenience_office'],
  },
  {
    id: 'defense',
    label: 'Defense & Missions',
    description: 'Notice danger early. Bill it on arrival.',
    buildingIds: ['watchtower', 'arena'],
  },
  {
    id: 'premium',
    label: 'Premium Nonsense',
    description: 'Fast growth with complimentary moral distance.',
    buildingIds: ['whale', 'vip_lounge', 'lootbox_kiosk'],
  },
  {
    id: 'social',
    label: 'Public Order',
    description: 'Fair progress, mentoring, and licensed dissent.',
    buildingIds: ['mentor_hall'],
  },
  {
    id: 'decorations',
    label: 'Decor',
    description: 'Benches, trees, lamps, and other municipal confidence.',
    buildingIds: [],
    informational: true,
  },
];

export function getBuildingCatalogEntry(id) {
  return CATALOG_BY_ID[id] || null;
}
