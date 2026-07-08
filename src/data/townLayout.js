// Data-driven layout overlay for the playable town map.
// Content files keep gameplay/flavour data; this file owns placement, scale,
// district membership, path routing, labels, and interaction footprints.

export const TOWN_WORLD = {
  width: 1460,
  height: 840,
  plaza: { x: 675, y: 435 },
  cameraStart: { x: 140, y: 78 },
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
  ROAD_WIDTH: 28,
};

export const DISTRICTS = [
  { id: 'social', name: 'Social District', x: 270, y: 410, w: 250, h: 220, color: 0x8f6a46, alpha: 0.08 },
  { id: 'guild', name: 'Guild District', x: 525, y: 345, w: 320, h: 250, color: 0x3e6db5, alpha: 0.07 },
  { id: 'market', name: 'Market District', x: 640, y: 625, w: 340, h: 210, color: 0xd9bc85, alpha: 0.08 },
  { id: 'training', name: 'Fair Progress District', x: 920, y: 600, w: 300, h: 220, color: 0x7fdc93, alpha: 0.06 },
  { id: 'premium', name: 'Premium District', x: 1085, y: 400, w: 350, h: 315, color: 0xf6c945, alpha: 0.07 },
];

export const BUILDING_LAYOUT = {
  tavern: {
    district: 'social',
    x: 255,
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
    x: 515,
    y: 635,
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
    x: 500,
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
    x: 680,
    y: 635,
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
    x: 918,
    y: 640,
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
    x: 1065,
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
    x: 735,
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
    district: 'premium', x: 932, y: 405, w: 84, h: 52, visualScale: 0.9,
    shortLabel: 'Ethics Fountain', pathNode: 'premium-gate', interactionW: 124, interactionH: 86,
  },
  vip_rope_entrance: {
    district: 'premium', x: 1062, y: 386, w: 100, h: 38, visualScale: 0.88,
    shortLabel: 'VIP Rope', pathNode: 'premium-gate', interactionW: 138, interactionH: 68,
  },
  complaint_barrel: {
    district: 'training', x: 830, y: 535, w: 38, h: 44, visualScale: 0.94,
    shortLabel: 'Complaint Barrel', pathNode: 'training-yard', interactionW: 96, interactionH: 72,
  },
  debt_collector_booth: {
    district: 'premium', x: 1168, y: 500, w: 72, h: 62, visualScale: 0.9,
    shortLabel: 'Debt Booth', pathNode: 'premium-south', interactionW: 116, interactionH: 92,
  },
  notice_board: {
    district: 'guild', x: 550, y: 360, w: 58, h: 58, visualScale: 0.92,
    shortLabel: 'Notice Board', pathNode: 'guild-square', interactionW: 120, interactionH: 90,
  },
  poor_hero_queue: {
    district: 'premium', x: 958, y: 448, w: 96, h: 44, visualScale: 0.84,
    shortLabel: 'Poor Queue', pathNode: 'premium-gate', interactionW: 132, interactionH: 72,
  },
  sponsored_quest_board: {
    district: 'guild', x: 400, y: 370, w: 66, h: 60, visualScale: 0.9,
    shortLabel: 'Sponsored Board', pathNode: 'guild-west', interactionW: 124, interactionH: 90,
  },
  balance_memorial: {
    district: 'training', x: 895, y: 515, w: 54, h: 42, visualScale: 0.92,
    shortLabel: 'Balance Memorial', pathNode: 'training-yard', interactionW: 108, interactionH: 72,
  },
  refund_denial_desk: {
    district: 'premium', x: 1215, y: 385, w: 70, h: 52, visualScale: 0.9,
    shortLabel: 'Refund Desk', pathNode: 'premium-east', interactionW: 116, interactionH: 78,
  },
  ethics_laundromat: {
    district: 'market', x: 755, y: 585, w: 72, h: 54, visualScale: 0.9,
    shortLabel: 'Ethics Wash', pathNode: 'market-square', interactionW: 112, interactionH: 82,
  },
  premium_temple: {
    district: 'premium', x: 1178, y: 250, w: 86, h: 70, visualScale: 0.9,
    shortLabel: 'Premium Temple', pathNode: 'premium-north', interactionW: 124, interactionH: 96,
  },
  patch_notes_shrine: {
    district: 'guild', x: 485, y: 398, w: 56, h: 56, visualScale: 0.9,
    shortLabel: 'Patch Shrine', pathNode: 'guild-square', interactionW: 110, interactionH: 84,
  },
  hero_union_tent: {
    district: 'training', x: 990, y: 535, w: 84, h: 54, visualScale: 0.9,
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

  'bench-social-1': { district: 'social', x: 205, y: 455, visualScale: 0.68 },
  'table-social-1': { district: 'social', x: 315, y: 432, visualScale: 0.64 },
  'coin-pile-whale-1': { district: 'premium', x: 1132, y: 374, visualScale: 0.58 },
  'contracts-premium-1': { district: 'premium', x: 1178, y: 468, visualScale: 0.58 },
  'anvil-blacksmith-1': { district: 'market', x: 585, y: 640, visualScale: 0.62 },
  'dummy-training-1': { district: 'training', x: 858, y: 650, visualScale: 0.62 },
  'target-training-1': { district: 'training', x: 982, y: 635, visualScale: 0.56 },
};

export const TOWN_PATH_NODES = [
  { id: 'plaza-center', x: 675, y: 435 },
  { id: 'social-cross', x: 320, y: 425 },
  { id: 'guild-west', x: 415, y: 400 },
  { id: 'guild-square', x: 528, y: 360 },
  { id: 'dungeon-approach', x: 725, y: 335 },
  { id: 'market-west', x: 520, y: 570 },
  { id: 'market-square', x: 670, y: 560 },
  { id: 'training-yard', x: 905, y: 558 },
  { id: 'training-east', x: 1005, y: 548 },
  { id: 'premium-gate', x: 1038, y: 414 },
  { id: 'premium-north', x: 1148, y: 330 },
  { id: 'premium-east', x: 1195, y: 425 },
  { id: 'premium-south', x: 1158, y: 552 },
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
