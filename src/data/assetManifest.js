// Planned asset slots for Golden Whale Guild.
//
// HOW IT WORKS
//   Drop a PNG at `path` (under public/) and the game picks it up on the next
//   reload — no code changes needed. Until the file exists, the game draws the
//   `fallback` placeholder at runtime (see src/textures.js).
//
// ENTRY FIELDS
//   key         Phaser texture key. Game objects reference assets by this key.
//   path        expected file location under public/ (served from site root).
//   type        'image' for now; switch to 'spritesheet' + frameConfig when
//               animated character sheets arrive.
//   frameConfig only for spritesheets, e.g. { frameWidth: 16, frameHeight: 24 }.
//   fallback    what happens while the file is missing (all placeholder art is
//               generated in src/textures.js and clearly marked temporary).

export const ASSET_MANIFEST = [
  // --- buildings ---------------------------------------------------------
  { key: 'building_tavern', path: 'assets/buildings/building_tavern.png', type: 'image', fallback: 'generated ph-tavern' },
  { key: 'building_blacksmith', path: 'assets/buildings/building_blacksmith.png', type: 'image', fallback: 'generated ph-blacksmith' },
  { key: 'building_guild_hall', path: 'assets/buildings/building_guild_hall.png', type: 'image', fallback: 'generated ph-guildhall' },
  { key: 'building_training_yard', path: 'assets/buildings/building_training_yard.png', type: 'image', fallback: 'generated ph-training' },
  { key: 'building_market', path: 'assets/buildings/building_market.png', type: 'image', fallback: 'generated ph-market' },
  { key: 'building_golden_whale', path: 'assets/buildings/building_golden_whale.png', type: 'image', fallback: 'generated ph-whale' },
  { key: 'building_dungeon_gate', path: 'assets/buildings/building_dungeon_gate.png', type: 'image', fallback: 'generated ph-dungeon' },

  // --- characters ----------------------------------------------------------
  // hero_default is the shared stand-in used when a personality sheet is
  // missing but a generic hero sprite exists.
  { key: 'hero_default', path: 'assets/characters/hero_default.png', type: 'image', fallback: 'generated per-hero placeholder' },
  { key: 'hero_honest_grinder', path: 'assets/characters/hero_honest_grinder.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_noble_whale', path: 'assets/characters/hero_noble_whale.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_lucky_idiot', path: 'assets/characters/hero_lucky_idiot.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_veteran', path: 'assets/characters/hero_veteran.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_debt_goblin', path: 'assets/characters/hero_debt_goblin.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_ragequitter', path: 'assets/characters/hero_ragequitter.png', type: 'image', fallback: 'hero_default, then generated' },

  // --- icons ---------------------------------------------------------------
  { key: 'icon_coin', path: 'assets/icons/icon_coin.png', type: 'image', fallback: 'generated ph-icon_coin' },
  { key: 'icon_whale', path: 'assets/icons/icon_whale.png', type: 'image', fallback: 'whale sign baked into building placeholder' },

  // --- ui --------------------------------------------------------------------
  { key: 'ui_panel', path: 'assets/ui/ui_panel.png', type: 'image', fallback: 'generated rounded rect (tooltip/panels)' },
  { key: 'ui_button', path: 'assets/ui/ui_button.png', type: 'image', fallback: 'generated rectangle button' },
];
