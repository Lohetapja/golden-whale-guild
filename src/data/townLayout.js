// Data-driven layout overlay for the playable town map.
// Content files keep gameplay/flavour data; this file owns placement, scale,
// district membership, path routing, labels, and interaction footprints.

export const TOWN_WORLD = {
  width: 1520,
  height: 900,
  plaza: { x: 690, y: 445 },
  cameraStart: { x: 80, y: 70 },
  centerNode: 'plaza-center',
};

export const LAYOUT_CONSTANTS = {
  BUILDING_SCALE: 0.78,
  MAJOR_BUILDING_SCALE: 0.82,
  SMALL_LOCATION_SCALE: 0.9,
  NPC_SCALE: 1.85,
  LABEL_FONT_SIZE: 10,
  SMALL_LABEL_FONT_SIZE: 8,
  DISTRICT_SPACING: 150,
  ROAD_WIDTH: 34,
};

export const DISTRICTS = [
  { id: 'social', name: 'Social District', x: 245, y: 410, w: 260, h: 230, color: 0x8f6a46, alpha: 0.08 },
  { id: 'guild', name: 'Guild District', x: 520, y: 345, w: 330, h: 260, color: 0x3e6db5, alpha: 0.07 },
  { id: 'market', name: 'Market District', x: 650, y: 640, w: 360, h: 220, color: 0xd9bc85, alpha: 0.08 },
  { id: 'training', name: 'Fair Progress District', x: 945, y: 610, w: 320, h: 230, color: 0x7fdc93, alpha: 0.06 },
  { id: 'premium', name: 'Premium District', x: 1115, y: 405, w: 380, h: 330, color: 0xf6c945, alpha: 0.07 },
];

export const BUILDING_LAYOUT = {
  tavern: {
    district: 'social',
    x: 240,
    y: 365,
    w: 122,
    h: 92,
    visualScale: 0.76,
    shortLabel: 'Tavern',
    pathNode: 'social-cross',
    interactionW: 160,
    interactionH: 124,
  },
  blacksmith: {
    district: 'market',
    x: 535,
    y: 650,
    w: 116,
    h: 90,
    visualScale: 0.76,
    shortLabel: 'Blacksmith',
    pathNode: 'market-west',
    interactionW: 150,
    interactionH: 116,
  },
  guildhall: {
    district: 'guild',
    x: 475,
    y: 285,
    w: 146,
    h: 116,
    visualScale: 0.78,
    shortLabel: 'Guild Hall',
    pathNode: 'guild-square',
    interactionW: 178,
    interactionH: 142,
  },
  market: {
    district: 'market',
    x: 705,
    y: 650,
    w: 118,
    h: 82,
    visualScale: 0.78,
    shortLabel: 'Market',
    pathNode: 'market-square',
    interactionW: 152,
    interactionH: 112,
  },
  training: {
    district: 'training',
    x: 940,
    y: 655,
    w: 112,
    h: 82,
    visualScale: 0.78,
    shortLabel: 'Training Yard',
    pathNode: 'training-yard',
    interactionW: 150,
    interactionH: 108,
  },
  whale: {
    district: 'premium',
    x: 1090,
    y: 315,
    w: 152,
    h: 112,
    visualScale: 0.74,
    shortLabel: 'Golden Whale',
    pathNode: 'premium-gate',
    doorOffsetY: 48,
    interactionW: 188,
    interactionH: 148,
    upgradeScaleStep: 0.045,
    maxUpgradeScaleBoost: 0.22,
  },
  dungeon: {
    district: 'guild',
    x: 760,
    y: 270,
    w: 132,
    h: 100,
    visualScale: 0.82,
    shortLabel: 'Dungeon Gate',
    pathNode: 'dungeon-approach',
    interactionW: 160,
    interactionH: 126,
  },
};

export const DECORATION_LAYOUT = {
  ethics_fountain: {
    district: 'premium', x: 955, y: 410, w: 84, h: 52, visualScale: 0.9,
    shortLabel: 'Ethics Fountain', pathNode: 'premium-gate', interactionW: 124, interactionH: 86,
  },
  vip_rope_entrance: {
    district: 'premium', x: 1088, y: 390, w: 100, h: 38, visualScale: 0.88,
    shortLabel: 'VIP Rope', pathNode: 'premium-gate', interactionW: 138, interactionH: 68,
  },
  complaint_barrel: {
    district: 'training', x: 850, y: 545, w: 38, h: 44, visualScale: 0.94,
    shortLabel: 'Complaint Barrel', pathNode: 'training-yard', interactionW: 96, interactionH: 72,
  },
  debt_collector_booth: {
    district: 'premium', x: 1215, y: 505, w: 72, h: 62, visualScale: 0.9,
    shortLabel: 'Debt Booth', pathNode: 'premium-south', interactionW: 116, interactionH: 92,
  },
  notice_board: {
    district: 'guild', x: 560, y: 365, w: 58, h: 58, visualScale: 0.92,
    shortLabel: 'Notice Board', pathNode: 'guild-square', interactionW: 120, interactionH: 90,
  },
  poor_hero_queue: {
    district: 'premium', x: 985, y: 455, w: 96, h: 44, visualScale: 0.84,
    shortLabel: 'Poor Queue', pathNode: 'premium-gate', interactionW: 132, interactionH: 72,
  },
  sponsored_quest_board: {
    district: 'guild', x: 380, y: 370, w: 66, h: 60, visualScale: 0.9,
    shortLabel: 'Sponsored Board', pathNode: 'guild-west', interactionW: 124, interactionH: 90,
  },
  balance_memorial: {
    district: 'training', x: 915, y: 525, w: 54, h: 42, visualScale: 0.92,
    shortLabel: 'Balance Memorial', pathNode: 'training-yard', interactionW: 108, interactionH: 72,
  },
  refund_denial_desk: {
    district: 'premium', x: 1270, y: 390, w: 70, h: 52, visualScale: 0.9,
    shortLabel: 'Refund Desk', pathNode: 'premium-east', interactionW: 116, interactionH: 78,
  },
  ethics_laundromat: {
    district: 'market', x: 780, y: 595, w: 72, h: 54, visualScale: 0.9,
    shortLabel: 'Ethics Wash', pathNode: 'market-square', interactionW: 112, interactionH: 82,
  },
  premium_temple: {
    district: 'premium', x: 1235, y: 250, w: 86, h: 70, visualScale: 0.9,
    shortLabel: 'Premium Temple', pathNode: 'premium-north', interactionW: 124, interactionH: 96,
  },
  patch_notes_shrine: {
    district: 'guild', x: 470, y: 405, w: 56, h: 56, visualScale: 0.9,
    shortLabel: 'Patch Shrine', pathNode: 'guild-square', interactionW: 110, interactionH: 84,
  },
  hero_union_tent: {
    district: 'training', x: 1015, y: 545, w: 84, h: 54, visualScale: 0.9,
    shortLabel: 'Union Tent', pathNode: 'training-east', interactionW: 126, interactionH: 84,
  },

  'tree-nw-1': { district: 'edge', x: 72, y: 150, visualScale: 0.92 },
  'tree-nw-2': { district: 'edge', x: 170, y: 118, visualScale: 0.88 },
  'tree-west-1': { district: 'edge', x: 72, y: 468, visualScale: 0.9 },
  'tree-sw-1': { district: 'edge', x: 138, y: 748, visualScale: 0.95 },
  'tree-north-1': { district: 'guild', x: 350, y: 135, visualScale: 0.86 },
  'tree-north-2': { district: 'edge', x: 880, y: 118, visualScale: 0.9 },
  'tree-ne-1': { district: 'edge', x: 1360, y: 165, visualScale: 0.9 },
  'tree-se-1': { district: 'edge', x: 1365, y: 710, visualScale: 0.94 },
  'tree-south-1': { district: 'edge', x: 820, y: 785, visualScale: 0.9 },
  'tree-south-2': { district: 'edge', x: 450, y: 765, visualScale: 0.88 },
  'tree-mid-1': { district: 'social', x: 330, y: 505, visualScale: 0.72 },
  'tree-east-1': { district: 'premium', x: 905, y: 330, visualScale: 0.72 },
  'tree-east-2': { district: 'training', x: 1120, y: 642, visualScale: 0.78 },

  'rock-west': { x: 215, y: 485, visualScale: 0.85 },
  'rock-north': { x: 965, y: 155, visualScale: 0.85 },
  'rock-east': { x: 1160, y: 640, visualScale: 0.8 },
  'rock-guild': { x: 350, y: 250, visualScale: 0.74 },
  'rock-plaza': { x: 725, y: 410, visualScale: 0.7 },
  'rock-market': { x: 790, y: 540, visualScale: 0.72 },

  'flowers-1': { x: 185, y: 420 },
  'flowers-2': { x: 300, y: 472 },
  'flowers-3': { x: 425, y: 470 },
  'flowers-4': { x: 575, y: 435 },
  'flowers-5': { x: 745, y: 505 },
  'flowers-6': { x: 920, y: 470 },
  'flowers-7': { x: 1135, y: 415 },
  'flowers-8': { x: 1288, y: 455 },
  'flowers-9': { x: 625, y: 710 },
  'flowers-10': { x: 1000, y: 718 },

  'fence-tavern-1': { district: 'social', x: 150, y: 390 },
  'fence-tavern-2': { district: 'social', x: 202, y: 390 },
  'fence-training-1': { district: 'training', x: 875, y: 590 },
  'fence-training-2': { district: 'training', x: 928, y: 590 },
  'fence-training-3': { district: 'training', x: 981, y: 590 },
  'fence-whale-1': { district: 'premium', x: 990, y: 374 },
  'fence-whale-2': { district: 'premium', x: 1185, y: 374 },

  'barrel-tavern-1': { district: 'social', x: 310, y: 386, visualScale: 0.82 },
  'barrel-market-1': { district: 'market', x: 625, y: 664, visualScale: 0.82 },
  'barrel-whale-1': { district: 'premium', x: 1015, y: 383, visualScale: 0.74 },
  'crate-market-1': { district: 'market', x: 785, y: 664, visualScale: 0.82 },
  'crate-market-2': { district: 'market', x: 818, y: 650, visualScale: 0.78 },
  'crate-blacksmith-1': { district: 'market', x: 470, y: 656, visualScale: 0.82 },
  'crate-guild-1': { district: 'guild', x: 585, y: 302, visualScale: 0.72 },

  'lamp-plaza-n': { district: 'guild', x: 650, y: 360, visualScale: 0.82 },
  'lamp-plaza-s': { district: 'market', x: 650, y: 545, visualScale: 0.82 },
  'lamp-market': { district: 'market', x: 735, y: 565, visualScale: 0.82 },
  'lamp-whale': { district: 'premium', x: 1010, y: 340, visualScale: 0.82 },
  'lamp-dungeon': { district: 'guild', x: 710, y: 322, visualScale: 0.82 },

  'sign-dungeon': { district: 'guild', x: 820, y: 330, visualScale: 0.82 },
  'sign-market': { district: 'market', x: 610, y: 610, visualScale: 0.82 },
  'sign-training': { district: 'training', x: 1015, y: 650, visualScale: 0.82 },
};

export const TOWN_PATH_NODES = [
  { id: 'plaza-center', x: 690, y: 445 },
  { id: 'social-cross', x: 310, y: 430 },
  { id: 'guild-west', x: 400, y: 405 },
  { id: 'guild-square', x: 535, y: 365 },
  { id: 'dungeon-approach', x: 745, y: 340 },
  { id: 'market-west', x: 535, y: 585 },
  { id: 'market-square', x: 690, y: 575 },
  { id: 'training-yard', x: 925, y: 570 },
  { id: 'training-east', x: 1030, y: 555 },
  { id: 'premium-gate', x: 1065, y: 420 },
  { id: 'premium-north', x: 1190, y: 330 },
  { id: 'premium-east', x: 1250, y: 430 },
  { id: 'premium-south', x: 1205, y: 560 },
];

export const TOWN_PATH_LINKS = [
  ['plaza-center', 'guild-square'],
  ['guild-square', 'guild-west'],
  ['guild-square', 'dungeon-approach'],
  ['guild-west', 'social-cross'],
  ['social-cross', 'market-west'],
  ['market-west', 'market-square'],
  ['market-square', 'plaza-center'],
  ['market-square', 'training-yard'],
  ['training-yard', 'training-east'],
  ['training-east', 'premium-gate'],
  ['premium-gate', 'premium-north'],
  ['premium-gate', 'premium-east'],
  ['premium-east', 'premium-south'],
  ['premium-south', 'training-east'],
  ['premium-gate', 'dungeon-approach'],
  ['dungeon-approach', 'plaza-center'],
];

export function applyTownLayout(items, layout) {
  return items.map((item) => {
    const patch = layout[item.id] || {};
    const merged = {
      ...item,
      ...patch,
      sourceW: item.w,
      sourceH: item.h,
    };
    merged.w = patch.w ?? item.w;
    merged.h = patch.h ?? item.h;
    return merged;
  });
}
