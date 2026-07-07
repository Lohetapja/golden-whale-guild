// Building definitions — the single source of truth for the town's buildings.
// x/y is the ground point (sprite origin 0.5, 1).
//
// assetKey  -> real sprite slot (see src/data/assetManifest.js). Drop a PNG at
//              the manifest path and it replaces the placeholder automatically.
// fallback  -> TEMPORARY debug-art generator used while the asset is missing;
//              it draws texture `ph-<id>` from wall/roof/style below.
// level/effect/upgrade are tooltip placeholders for the future economy pass.
import { makeBuildingPlaceholder } from '../textures.js';

export const BUILDINGS = [
  {
    id: 'tavern',
    name: 'Tavern',
    description: 'The Rusty Flagon. Heroes drink away quest trauma and argue about patch notes.',
    x: 255, y: 345, w: 160, h: 120,
    assetKey: 'building_tavern',
    fallback: makeBuildingPlaceholder,
    wall: 0x9c6a3f, roof: 0xb0413c, style: 'house',
    level: 1, effect: 'Morale +1 per rowdy evening', upgrade: '250g',
  },
  {
    id: 'blacksmith',
    name: 'Blacksmith',
    description: 'Honest steel at honest prices. The forge judges you silently.',
    x: 350, y: 610, w: 150, h: 115,
    assetKey: 'building_blacksmith',
    fallback: makeBuildingPlaceholder,
    wall: 0x6e6a72, roof: 0x4a4650, style: 'house',
    level: 1, effect: 'Gear quality +5%', upgrade: '300g',
  },
  {
    id: 'guildhall',
    name: 'Guild Hall',
    description: 'Guild HQ. Quests posted daily. Complaints filed directly into the fireplace.',
    x: 640, y: 275, w: 180, h: 150,
    assetKey: 'building_guild_hall',
    fallback: makeBuildingPlaceholder,
    wall: 0xb99c6b, roof: 0x3e6db5, style: 'house',
    level: 2, effect: 'Posts 5 hero actions per cycle', upgrade: '400g',
  },
  {
    id: 'market',
    name: 'Market',
    description: 'Fresh potions, dubious maps, and one suspiciously cheap "mystery barrel".',
    x: 680, y: 590, w: 150, h: 100,
    assetKey: 'building_market',
    fallback: makeBuildingPlaceholder,
    wall: 0xc2a06a, roof: 0xd85b4a, style: 'stall',
    level: 1, effect: 'Raffle odds: rigged (favorably?)', upgrade: '200g',
  },
  {
    id: 'training',
    name: 'Training Yard',
    description: 'Where power is earned the boring way. +1 at a time.',
    x: 985, y: 600, w: 140, h: 100,
    assetKey: 'building_training_yard',
    fallback: makeBuildingPlaceholder,
    wall: 0x8a7a52, roof: 0x6d8a3f, style: 'house',
    level: 1, effect: '+1 power per honest visit', upgrade: '350g',
  },
  {
    id: 'whale',
    name: 'Golden Whale Milking Station',
    description: 'Totally fair. Totally optional. Totally milking. Trust sold separately.',
    x: 1030, y: 320, w: 200, h: 150,
    assetKey: 'building_golden_whale',
    fallback: makeBuildingPlaceholder,
    wall: 0xf2c744, roof: 0xd99a1f, style: 'whale',
    level: 'MAX (paid)', effect: 'Prints gold. Trust -, Corruption +', upgrade: 'Your dignity',
  },
  {
    id: 'dungeon',
    name: 'Dungeon Gate',
    description: 'The dungeon hums below. Threat rises when nobody goes in.',
    x: 1165, y: 490, w: 150, h: 120,
    assetKey: 'building_dungeon_gate',
    fallback: makeBuildingPlaceholder,
    wall: 0x5c5f6e, roof: 0x3a3d49, style: 'gate',
    level: '???', effect: 'Threat -4 per veteran clear', upgrade: 'Sealed by the ancients',
  },
];
