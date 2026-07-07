// Hero roster — the single source of truth for the town's NPC heroes.
//
// assetKey  -> real sprite slot per personality (src/data/assetManifest.js).
//              If missing, hero_default is tried, then the generated fallback.
// fallback  -> TEMPORARY debug-art generator; draws texture `ph-<id>` from the
//              skin/hair/tunic/legs palette below.
// prefers   -> building id the hero gravitates toward while wandering.
// stats     -> simple satire stats; the sim nudges power/spent over time.
import { makeHeroPlaceholder } from '../textures.js';

export const HEROES = [
  {
    id: 'hero-mira', name: 'Mira', personality: 'Honest Grinder',
    assetKey: 'hero_honest_grinder',
    fallback: makeHeroPlaceholder,
    skin: 0xf0c8a0, hair: 0x5c3a1e, tunic: 0x3f7fbf, legs: 0x34495e,
    speed: 46, prefers: 'training',
    stats: { power: 4, gold: 60, spent: 0 },
  },
  {
    id: 'hero-beefwallet', name: 'Lord Beefwallet', personality: 'Noble Whale',
    assetKey: 'hero_noble_whale',
    fallback: makeHeroPlaceholder,
    skin: 0xf0c8a0, hair: 0xd9b23a, tunic: 0x8e44ad, legs: 0x5b2c6f,
    speed: 34, prefers: 'whale',
    stats: { power: 2, gold: 99999, spent: 0 },
  },
  {
    id: 'hero-chad', name: 'Chad Fortuna', personality: 'Lucky Idiot',
    assetKey: 'hero_lucky_idiot',
    fallback: makeHeroPlaceholder,
    skin: 0xe8b98a, hair: 0xf4e04d, tunic: 0xe67e22, legs: 0x7d4b12,
    speed: 55, prefers: 'dungeon',
    stats: { power: 3, gold: 40, spent: 0 },
  },
  {
    id: 'hero-greg', name: 'Veteran Greg', personality: 'Veteran',
    assetKey: 'hero_veteran',
    fallback: makeHeroPlaceholder,
    skin: 0xd9b08c, hair: 0xbfc4c9, tunic: 0x707b7c, legs: 0x424949,
    speed: 38, prefers: 'tavern',
    stats: { power: 9, gold: 300, spent: 0 },
  },
  {
    id: 'hero-snik', name: 'Snik', personality: 'Debt Goblin',
    assetKey: 'hero_debt_goblin',
    fallback: makeHeroPlaceholder,
    skin: 0x7fb069, hair: 0x2d4a22, tunic: 0x936639, legs: 0x584426,
    speed: 52, prefers: 'market',
    stats: { power: 3, gold: -340, spent: 0 },
  },
  {
    id: 'hero-tim', name: 'Tilty Tim', personality: 'Ragequitter',
    assetKey: 'hero_ragequitter',
    fallback: makeHeroPlaceholder,
    skin: 0xf0c8a0, hair: 0xc0392b, tunic: 0xcb4335, legs: 0x78281f,
    speed: 50, prefers: 'tavern',
    stats: { power: 5, gold: 150, spent: 0 },
  },
  {
    id: 'hero-penny', name: 'Sister Penny', personality: 'Honest Grinder',
    assetKey: 'hero_honest_grinder',
    fallback: makeHeroPlaceholder,
    skin: 0xf5d7b5, hair: 0x1c2833, tunic: 0xf7f0dd, legs: 0x9c8b6e,
    speed: 42, prefers: 'guildhall',
    stats: { power: 5, gold: 80, spent: 0 },
  },
  {
    id: 'hero-goldmaw', name: 'Duchess Goldmaw', personality: 'Noble Whale',
    assetKey: 'hero_noble_whale',
    fallback: makeHeroPlaceholder,
    skin: 0xf0c8a0, hair: 0xe8e4d8, tunic: 0xf1c40f, legs: 0xb7950b,
    speed: 32, prefers: 'whale',
    stats: { power: 1, gold: 88888, spent: 0 },
  },
];
