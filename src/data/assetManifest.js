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
  { key: 'hero_whale_apprentice', path: 'assets/characters/hero_whale_apprentice.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_broke_optimist', path: 'assets/characters/hero_broke_optimist.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_angry_veteran', path: 'assets/characters/hero_angry_veteran.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_sponsored_hero', path: 'assets/characters/hero_sponsored_hero.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_debt_collector', path: 'assets/characters/hero_debt_collector.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_guild_clerk', path: 'assets/characters/hero_guild_clerk.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_suspicious_merchant', path: 'assets/characters/hero_suspicious_merchant.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_tutorial_goblin', path: 'assets/characters/hero_tutorial_goblin.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_balance_refugee', path: 'assets/characters/hero_balance_refugee.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_patch_notes_prophet', path: 'assets/characters/hero_patch_notes_prophet.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_premium_monk', path: 'assets/characters/hero_premium_monk.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_refund_seeker', path: 'assets/characters/hero_refund_seeker.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_free_trial_paladin', path: 'assets/characters/hero_free_trial_paladin.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_overleveled_toddler', path: 'assets/characters/hero_overleveled_toddler.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_lootbox_philosopher', path: 'assets/characters/hero_lootbox_philosopher.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_bankrupt_bard', path: 'assets/characters/hero_bankrupt_bard.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_quest_intern', path: 'assets/characters/hero_quest_intern.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_disillusioned_blacksmith', path: 'assets/characters/hero_disillusioned_blacksmith.png', type: 'image', fallback: 'hero_default, then generated' },

  // --- town dressing -------------------------------------------------------
  { key: 'decor_vip_rope_entrance', path: 'assets/decor/decor_vip_rope_entrance.png', type: 'image', fallback: 'generated vip_rope_entrance' },
  { key: 'decor_complaint_barrel', path: 'assets/decor/decor_complaint_barrel.png', type: 'image', fallback: 'generated complaint_barrel' },
  { key: 'decor_debt_collector_booth', path: 'assets/decor/decor_debt_collector_booth.png', type: 'image', fallback: 'generated debt_collector_booth' },
  { key: 'decor_notice_board', path: 'assets/decor/decor_notice_board.png', type: 'image', fallback: 'generated notice_board' },
  { key: 'decor_ethics_fountain', path: 'assets/decor/decor_ethics_fountain.png', type: 'image', fallback: 'generated ethics_fountain' },
  { key: 'decor_poor_hero_queue', path: 'assets/decor/decor_poor_hero_queue.png', type: 'image', fallback: 'generated poor_hero_queue' },
  { key: 'decor_sponsored_quest_board', path: 'assets/decor/decor_sponsored_quest_board.png', type: 'image', fallback: 'generated sponsored_quest_board' },
  { key: 'decor_balance_memorial', path: 'assets/decor/decor_balance_memorial.png', type: 'image', fallback: 'generated balance_memorial' },
  { key: 'decor_refund_denial_desk', path: 'assets/decor/decor_refund_denial_desk.png', type: 'image', fallback: 'generated refund_denial_desk' },
  { key: 'decor_ethics_laundromat', path: 'assets/decor/decor_ethics_laundromat.png', type: 'image', fallback: 'generated ethics_laundromat' },
  { key: 'decor_premium_temple', path: 'assets/decor/decor_premium_temple.png', type: 'image', fallback: 'generated premium_temple' },
  { key: 'decor_patch_notes_shrine', path: 'assets/decor/decor_patch_notes_shrine.png', type: 'image', fallback: 'generated patch_notes_shrine' },
  { key: 'decor_hero_union_tent', path: 'assets/decor/decor_hero_union_tent.png', type: 'image', fallback: 'generated hero_union_tent' },
  { key: 'prop_tree', path: 'assets/decor/prop_tree.png', type: 'image', fallback: 'generated tree' },
  { key: 'prop_rock', path: 'assets/decor/prop_rock.png', type: 'image', fallback: 'generated rock' },
  { key: 'prop_flowers', path: 'assets/decor/prop_flowers.png', type: 'image', fallback: 'generated flowers' },
  { key: 'prop_fence', path: 'assets/decor/prop_fence.png', type: 'image', fallback: 'generated fence_h' },
  { key: 'prop_barrel', path: 'assets/decor/prop_barrel.png', type: 'image', fallback: 'generated barrel' },
  { key: 'prop_crate', path: 'assets/decor/prop_crate.png', type: 'image', fallback: 'generated crate' },
  { key: 'prop_lamp', path: 'assets/decor/prop_lamp.png', type: 'image', fallback: 'generated lamp' },
  { key: 'prop_signpost', path: 'assets/decor/prop_signpost.png', type: 'image', fallback: 'generated signpost' },

  // --- icons ---------------------------------------------------------------
  { key: 'icon_coin', path: 'assets/icons/icon_coin.png', type: 'image', fallback: 'generated ph-icon_coin' },
  { key: 'icon_whale', path: 'assets/icons/icon_whale.png', type: 'image', fallback: 'whale sign baked into building placeholder' },

  // --- ui --------------------------------------------------------------------
  { key: 'ui_panel', path: 'assets/ui/ui_panel.png', type: 'image', fallback: 'generated rounded rect (tooltip/panels)' },
  { key: 'ui_button', path: 'assets/ui/ui_button.png', type: 'image', fallback: 'generated rectangle button' },
];
