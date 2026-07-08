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
  { key: 'hero_angry_veteran', path: 'assets/characters/hero_veteran.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_sponsored_hero', path: 'assets/characters/hero_sponsored_hero.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_debt_collector', path: 'assets/characters/hero_debt_collector.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_guild_clerk', path: 'assets/characters/hero_guild_clerk.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_suspicious_merchant', path: 'assets/characters/hero_suspicious_merchant.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_tutorial_goblin', path: 'assets/characters/hero_tutorial_goblin.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_balance_refugee', path: 'assets/characters/hero_balance_refugee.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_patch_notes_prophet', path: 'assets/characters/hero_patch_notes_prophet.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_premium_monk', path: 'assets/characters/hero_premium_monk.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_refund_seeker', path: 'assets/characters/hero_refund_seeker.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_free_trial_paladin', path: 'assets/characters/hero_honest_grinder.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_overleveled_toddler', path: 'assets/characters/hero_noble_whale.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_lootbox_philosopher', path: 'assets/characters/hero_suspicious_merchant.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_bankrupt_bard', path: 'assets/characters/hero_bankrupt_bard.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_quest_intern', path: 'assets/characters/hero_quest_intern.png', type: 'image', fallback: 'hero_default, then generated' },
  { key: 'hero_disillusioned_blacksmith', path: 'assets/characters/hero_disillusioned_blacksmith.png', type: 'image', fallback: 'hero_default, then generated' },

  // --- town dressing -------------------------------------------------------
  { key: 'decor_vip_rope_entrance', path: 'assets/objects/location_vip_rope.png', type: 'image', fallback: 'generated vip_rope_entrance' },
  { key: 'decor_complaint_barrel', path: 'assets/objects/location_complaint_barrel.png', type: 'image', fallback: 'generated complaint_barrel' },
  { key: 'decor_debt_collector_booth', path: 'assets/objects/location_debt_collector_booth.png', type: 'image', fallback: 'generated debt_collector_booth' },
  { key: 'decor_notice_board', path: 'assets/objects/location_notice_board.png', type: 'image', fallback: 'generated notice_board' },
  { key: 'decor_ethics_fountain', path: 'assets/objects/location_fountain_questionable_ethics.png', type: 'image', fallback: 'generated ethics_fountain' },
  { key: 'decor_poor_hero_queue', path: 'assets/objects/location_poor_hero_queue.png', type: 'image', fallback: 'generated poor_hero_queue' },
  { key: 'decor_sponsored_quest_board', path: 'assets/objects/location_sponsored_quest_board.png', type: 'image', fallback: 'generated sponsored_quest_board' },
  { key: 'decor_balance_memorial', path: 'assets/objects/location_balance_memorial.png', type: 'image', fallback: 'generated balance_memorial' },
  { key: 'decor_refund_denial_desk', path: 'assets/objects/location_refund_denial_desk.png', type: 'image', fallback: 'generated refund_denial_desk' },
  { key: 'decor_ethics_laundromat', path: 'assets/objects/location_ethics_laundromat.png', type: 'image', fallback: 'generated ethics_laundromat' },
  { key: 'decor_premium_temple', path: 'assets/objects/location_premium_temple.png', type: 'image', fallback: 'generated premium_temple' },
  { key: 'decor_patch_notes_shrine', path: 'assets/objects/location_patch_notes_shrine.png', type: 'image', fallback: 'generated patch_notes_shrine' },
  { key: 'decor_hero_union_tent', path: 'assets/objects/location_hero_union_tent.png', type: 'image', fallback: 'generated hero_union_tent' },
  { key: 'prop_tree', path: 'assets/objects/object_tree_01.png', type: 'image', fallback: 'generated tree' },
  { key: 'prop_rock', path: 'assets/objects/object_rock_01.png', type: 'image', fallback: 'generated rock' },
  { key: 'prop_flowers', path: 'assets/objects/object_flower_patch.png', type: 'image', fallback: 'generated flowers' },
  { key: 'prop_fence', path: 'assets/objects/object_fence_short.png', type: 'image', fallback: 'generated fence_h' },
  { key: 'prop_barrel', path: 'assets/objects/object_barrel.png', type: 'image', fallback: 'generated barrel' },
  { key: 'prop_crate', path: 'assets/objects/object_crate.png', type: 'image', fallback: 'generated crate' },
  { key: 'prop_lamp', path: 'assets/objects/object_lamp.png', type: 'image', fallback: 'generated lamp' },
  { key: 'prop_signpost', path: 'assets/objects/object_signpost.png', type: 'image', fallback: 'generated signpost' },
  { key: 'object_tree_02', path: 'assets/objects/object_tree_02.png', type: 'image', fallback: 'alternate tree prop' },
  { key: 'object_fence_corner', path: 'assets/objects/object_fence_corner.png', type: 'image', fallback: 'generated fence corner' },
  { key: 'object_bench', path: 'assets/objects/object_bench.png', type: 'image', fallback: 'generated bench prop' },
  { key: 'object_table', path: 'assets/objects/object_table.png', type: 'image', fallback: 'generated table prop' },
  { key: 'object_coin_pile', path: 'assets/objects/object_coin_pile.png', type: 'image', fallback: 'generated coin pile prop' },
  { key: 'object_contract_stack', path: 'assets/objects/object_contract_stack.png', type: 'image', fallback: 'generated contract stack prop' },
  { key: 'object_anvil', path: 'assets/objects/object_anvil.png', type: 'image', fallback: 'generated anvil prop' },
  { key: 'object_training_dummy', path: 'assets/objects/object_training_dummy.png', type: 'image', fallback: 'generated training dummy prop' },
  { key: 'object_target', path: 'assets/objects/object_target.png', type: 'image', fallback: 'generated target prop' },

  // --- icons ---------------------------------------------------------------
  { key: 'icon_coin', path: 'assets/icons/icon_coin.png', type: 'image', fallback: 'generated ph-icon_coin' },
  { key: 'icon_gold', path: 'assets/icons/icon_coin.png', type: 'image', fallback: 'generated ph-icon_coin' },
  { key: 'icon_trust', path: 'assets/icons/icon_trust.png', type: 'image', fallback: 'generated icon-trust' },
  { key: 'icon_corruption', path: 'assets/icons/icon_corruption.png', type: 'image', fallback: 'generated icon-corruption' },
  { key: 'icon_morale', path: 'assets/icons/icon_morale.png', type: 'image', fallback: 'generated icon-morale' },
  { key: 'icon_threat', path: 'assets/icons/icon_threat.png', type: 'image', fallback: 'generated icon-threat' },
  { key: 'icon_upgrade', path: 'assets/icons/icon_upgrade.png', type: 'image', fallback: 'upgrade text/icon fallback' },
  { key: 'icon_quest', path: 'assets/icons/icon_quest.png', type: 'image', fallback: 'quest notice fallback' },
  { key: 'icon_warning', path: 'assets/icons/icon_warning.png', type: 'image', fallback: 'warning text fallback' },
  { key: 'icon_whale', path: 'assets/icons/icon_whale.png', type: 'image', fallback: 'whale sign baked into building placeholder' },
  { key: 'icon_debt', path: 'assets/icons/icon_corruption.png', type: 'image', fallback: 'debt text/icon fallback' },
  { key: 'icon_protest', path: 'assets/icons/icon_warning.png', type: 'image', fallback: 'protest marker fallback' },
  { key: 'icon_locked', path: 'assets/icons/icon_warning.png', type: 'image', fallback: 'locked text fallback' },
  { key: 'icon_max', path: 'assets/icons/icon_upgrade.png', type: 'image', fallback: 'MAX text fallback' },

  // --- tiles ---------------------------------------------------------------
  { key: 'tileset_town_basic', path: 'assets/tiles/tileset_town_basic.png', type: 'image', fallback: 'generated terrain graphics' },

  // --- ui --------------------------------------------------------------------
  { key: 'ui_panel', path: 'assets/ui/ui_panel_parchment.png', type: 'image', fallback: 'generated rounded rect (tooltip/panels)' },
  { key: 'ui_panel_dark', path: 'assets/ui/ui_panel_dark.png', type: 'image', fallback: 'generated dark panel' },
  { key: 'ui_button', path: 'assets/ui/ui_button_normal.png', type: 'image', fallback: 'generated rectangle button' },
  { key: 'ui_close_x', path: 'assets/ui/ui_close_x.png', type: 'image', fallback: 'HTML close button text' },
];
