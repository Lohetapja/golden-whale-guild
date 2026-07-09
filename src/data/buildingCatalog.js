const core = (
  id,
  category,
  cost,
  footprint,
  description,
  options = {},
) => ({
  id,
  category,
  cost,
  footprint,
  description,
  roadRequired: options.roadRequired !== false,
  maxCount: options.maxCount || 1,
  unlock: options.unlock || 'Starting catalog',
  upkeep: options.upkeep || 0,
  capacity: options.capacity || 0,
  kind: options.kind || 'fair',
});

export const BUILDING_CATALOG = [
  core('guildhall', 'Core Buildings', 420, { w: 3, h: 3 }, 'Posts quests and produces heroic paperwork.', {
    roadRequired: false,
    capacity: 6,
  }),
  core('tavern', 'Hero Services', 260, { w: 2, h: 2 }, 'Beds, morale, and chairs reinforced for patch-note discourse.', {
    maxCount: 1,
    capacity: 6,
  }),
  core('blacksmith', 'Hero Services', 320, { w: 2, h: 2 }, 'Improves honest hero power and forge-related optimism.'),
  core('training', 'Hero Services', 360, { w: 3, h: 2 }, 'Turns time and effort into suspiciously modest numbers.'),
  core('market', 'Economy', 240, { w: 2, h: 2 }, 'Steady gold with optional dynamic suffering.', {
    kind: 'mixed',
  }),
  core('dungeon', 'Core Buildings', 500, { w: 3, h: 2 }, 'Quest access, threat control, and a door monsters respect selectively.', {
    kind: 'mixed',
  }),
  core('whale', 'Premium / Shady', 680, { w: 3, h: 3 }, 'Fast gold, premium power, and measurable moral distance.', {
    kind: 'shady',
    unlock: 'Available immediately because temptation tested well.',
  }),
];

export const CATALOG_BY_ID = Object.fromEntries(BUILDING_CATALOG.map((entry) => [entry.id, entry]));

export const BUILD_CATEGORIES = [
  'Roads',
  'Core Buildings',
  'Hero Services',
  'Economy',
  'Premium / Shady',
  'Decorations',
];

export function getBuildingCatalogEntry(id) {
  return CATALOG_BY_ID[id] || null;
}
