const item = (
  id,
  name,
  type,
  rarity,
  powerBonus,
  flavour,
  options = {},
) => ({
  id,
  name,
  type,
  rarity,
  assetKey: options.assetKey || `item_${id}`,
  powerBonus,
  moraleEffect: options.moraleEffect || 0,
  debtEffect: options.debtEffect || 0,
  corruptionEffect: options.corruptionEffect || 0,
  envyValue: options.envyValue ?? Math.max(2, powerBonus * 4),
  premiumSource: Boolean(options.premiumSource),
  canBeStolen: options.canBeStolen !== false,
  destroyChance: options.destroyChance ?? 0.5,
  flavour,
});

export const ITEM_CATALOG = [
  // Basic and fair items.
  item('starter_sword', 'Starter Sword', 'weapon', 'common', 1, 'Emotionally valuable because it is all you own.', {
    canBeStolen: false,
    destroyChance: 0.15,
  }),
  item('basic_armor', 'Basic Armor', 'armor', 'common', 1, 'Protects the torso and a modest amount of optimism.', {
    moraleEffect: 1,
  }),
  item('healing_potion', 'Healing Potion', 'potion', 'common', 0, 'A practical bottle of not becoming a cautionary tale.', {
    moraleEffect: 6,
    destroyChance: 0.85,
  }),
  item('morale_stew', 'Morale Stew', 'food', 'common', 0, 'Hot stew for heroes who still believe in lunch breaks.', {
    moraleEffect: 9,
    canBeStolen: false,
    destroyChance: 0.9,
  }),
  item('honest_training_scroll', 'Honest Training Scroll', 'scroll', 'uncommon', 2, 'Contains the forbidden technique of trying repeatedly.', {
    moraleEffect: 2,
    envyValue: 8,
  }),
  item('wooden_shield', 'Wooden Shield', 'shield', 'common', 1, 'Blocks arrows, disappointment, and very small invoices.', {
    destroyChance: 0.35,
  }),
  item('iron_sword', 'Iron Sword', 'weapon', 'uncommon', 3, 'Sharp enough to cut through monsters, less so excuses.', {
    envyValue: 12,
  }),
  item('adventurer_boots', 'Adventurer Boots', 'gear', 'common', 1, 'For walking uphill both ways through patch notes.', {
    moraleEffect: 2,
    destroyChance: 0.3,
  }),

  // Premium and pay-to-win satire items.
  item('premium_knees', 'Premium Knees', 'premium', 'legendary', 4, 'The dungeon now expects everyone to own a pair.', {
    premiumSource: true,
    moraleEffect: 4,
    envyValue: 28,
  }),
  item('sponsored_armor', 'Sponsored Armor of Plausible Skill', 'armor', 'premium', 5, 'Every plate carries an invisible ad read.', {
    premiumSource: true,
    corruptionEffect: 3,
    envyValue: 30,
  }),
  item('sword_of_unfair_advantage', 'Sword of Unfair Advantage', 'weapon', 'legendary', 8, 'Perfectly balanced around the owner.', {
    premiumSource: true,
    corruptionEffect: 5,
    envyValue: 48,
    destroyChance: 0.62,
  }),
  item('queue_skip_relic', 'Queue Skip Relic', 'trinket', 'premium', 3, 'Skips the queue and several moral lessons.', {
    premiumSource: true,
    corruptionEffect: 2,
    envyValue: 24,
  }),
  item('revive_insurance_scroll', 'Revive Insurance Scroll', 'scroll', 'premium', 3, 'Coverage excludes acts of balance.', {
    premiumSource: true,
    debtEffect: 50,
    envyValue: 20,
  }),
  item('loot_priority_blessing', 'Loot Priority Blessing', 'scroll', 'premium', 4, 'The gods sort drops by liquidity.', {
    premiumSource: true,
    corruptionEffect: 3,
    envyValue: 30,
  }),
  item('legendary_receipt', 'Legendary Receipt', 'trinket', 'legendary', 6, 'Proof that numbers happened for a reason.', {
    premiumSource: true,
    debtEffect: 80,
    envyValue: 38,
  }),
  item('deluxe_struggle_bundle', 'Deluxe Struggle Removal Bundle', 'premium', 'legendary', 7, 'Removes the part where games are played.', {
    premiumSource: true,
    corruptionEffect: 5,
    envyValue: 44,
  }),
  item('confidence_booster_soup', 'Confidence Booster Soup', 'potion', 'uncommon', 2, 'Tastes like broth and projected competence.', {
    premiumSource: true,
    moraleEffect: 8,
    corruptionEffect: 1,
    destroyChance: 0.8,
  }),
  item('premium_dust', 'Premium Dust', 'currency', 'premium', 0, 'Sparkles where a complete item might have been.', {
    premiumSource: true,
    canBeStolen: true,
    destroyChance: 0.9,
    envyValue: 8,
  }),
  item('whale_token_pack', 'Whale Token Pack', 'currency', 'premium', 1, 'Fictional currency with very real confidence.', {
    premiumSource: true,
    corruptionEffect: 2,
    envyValue: 16,
  }),
  item('shame_coin_pouch', 'Shame Coin Pouch', 'currency', 'uncommon', 0, 'Jingles louder near ethical ambiguity.', {
    premiumSource: true,
    corruptionEffect: 1,
    envyValue: 6,
  }),
  item('best_value_bundle', 'Best Value Bundle', 'premium', 'premium', 4, 'Best value according to the person selling it.', {
    premiumSource: true,
    corruptionEffect: 4,
    debtEffect: 40,
    envyValue: 26,
  }),
  item('starter_pack_day_7', 'Starter Pack Day 7', 'premium', 'premium', 3, 'Only urgent because the sign says so.', {
    premiumSource: true,
    corruptionEffect: 3,
    envyValue: 20,
  }),
  item('pity_timer_charm', 'Pity Timer Charm', 'trinket', 'premium', 2, 'Eventually rewards persistence, or something shaped like it.', {
    premiumSource: true,
    moraleEffect: 3,
    envyValue: 18,
  }),
  item('rngesus_blessing', 'RNGesus Blessing', 'trinket', 'legendary', 5, 'A tiny miracle with suspicious conversion rates.', {
    premiumSource: true,
    corruptionEffect: 3,
    envyValue: 34,
  }),
  item('fake_odds_flyer', 'Fake Odds Flyer', 'scroll', 'premium', 0, 'The numbers are decorative. The confidence is not.', {
    premiumSource: true,
    corruptionEffect: 3,
    canBeStolen: false,
    destroyChance: 0.75,
    envyValue: 10,
  }),
  item('cursed_coupon', 'Cursed Coupon', 'coupon', 'premium', 1, 'Saves ten percent now and costs peace later.', {
    premiumSource: true,
    debtEffect: 35,
    corruptionEffect: 2,
    envyValue: 12,
  }),
  item('convenience_permit', 'Convenience Permit', 'permit', 'premium', 0, 'Legalizes impatience for a small fictional fee.', {
    premiumSource: true,
    corruptionEffect: 2,
    canBeStolen: false,
    envyValue: 9,
  }),

  // Shady economy and loot box items.
  item('debt_contract', 'Debt Contract', 'contract', 'shady', 0, 'The small print has initiative.', {
    debtEffect: 140,
    corruptionEffect: 4,
    canBeStolen: false,
    destroyChance: 0.25,
    envyValue: 4,
  }),
  item('refund_denial_stamp', 'Refund Denial Stamp', 'tool', 'shady', 0, 'A tiny hammer for hope.', {
    corruptionEffect: 3,
    moraleEffect: -2,
    canBeStolen: false,
    envyValue: 5,
  }),
  item('dynamic_pricing_scroll', 'Dynamic Pricing Scroll', 'scroll', 'shady', 0, 'Prices move because feelings are a market signal.', {
    corruptionEffect: 4,
    envyValue: 6,
  }),
  item('interest_rate_totem', 'Interest Rate Totem', 'trinket', 'shady', 1, 'Watches debt grow with parental pride.', {
    debtEffect: 90,
    corruptionEffect: 3,
    envyValue: 12,
  }),
  item('complaint_ticket', 'Complaint Ticket', 'ticket', 'common', 0, 'Valid at approved barrels during approved despair hours.', {
    moraleEffect: 2,
    canBeStolen: false,
    destroyChance: 0.7,
    envyValue: 2,
  }),
  item('audit_scarecrow', 'Audit Scarecrow', 'tool', 'shady', 0, 'Placed in fields to frighten regulators and crows with clipboards.', {
    corruptionEffect: 2,
    canBeStolen: false,
    envyValue: 5,
  }),
  item('gem_bag', 'Gem Bag', 'currency', 'uncommon', 1, 'Pretty rocks with unsettling liquidity.', {
    envyValue: 14,
  }),
  item('mystery_chest', 'Mystery Chest', 'lootbox', 'premium', 2, 'Contains excitement, regret, and probably dust.', {
    premiumSource: true,
    corruptionEffect: 2,
    destroyChance: 0.8,
    envyValue: 18,
  }),
  item('shiny_disappointment_box', 'Shiny Disappointment Box', 'lootbox', 'premium', 1, 'Looks legendary from exactly one angle.', {
    premiumSource: true,
    moraleEffect: -2,
    corruptionEffect: 2,
    destroyChance: 0.85,
    envyValue: 15,
  }),

  // Existing supporting shop items kept cataloged for current hooks.
  item('bent_sword', 'Bent Sword', 'weapon', 'common', 1, 'Curves around both armor and expectations.', {
    destroyChance: 0.3,
  }),
  item('deluxe_potion', 'Deluxe Potion', 'potion', 'premium', 2, 'Healing, but with a velvet rope around the bottle.', {
    premiumSource: true,
    moraleEffect: 7,
    corruptionEffect: 1,
    destroyChance: 0.8,
    envyValue: 18,
  }),
  item('herb_bundle', 'Herb Bundle', 'potion', 'common', 0, 'Smells like honest healthcare and damp forests.', {
    moraleEffect: 4,
    destroyChance: 0.85,
  }),
  item('risky_potion', 'Risky Potion', 'potion', 'shady', 2, 'The label has more confidence than the alchemist.', {
    corruptionEffect: 2,
    moraleEffect: -1,
    destroyChance: 0.9,
    envyValue: 10,
  }),
  item('dragon_mount_trial', 'Dragon Mount Trial', 'premium', 'legendary', 7, 'The dragon expires after the introductory period.', {
    premiumSource: true,
    debtEffect: 120,
    envyValue: 42,
  }),
  item('contract_bundle', 'Contract Bundle', 'contract', 'shady', 0, 'Several decisions stapled together before anyone can object.', {
    assetKey: 'item_contract_bundle',
    debtEffect: 100,
    corruptionEffect: 3,
    canBeStolen: false,
    envyValue: 5,
  }),
  item('gem_pack', 'Gem Pack', 'currency', 'premium', 1, 'A bag of gems marketed as a personality upgrade.', {
    premiumSource: true,
    corruptionEffect: 2,
    envyValue: 16,
  }),
  item('lootbox', 'Lootbox', 'lootbox', 'premium', 1, 'A box that turns suspense into accounting.', {
    premiumSource: true,
    corruptionEffect: 2,
    destroyChance: 0.85,
    envyValue: 14,
  }),
  item('luxury_pillow', 'Luxury Pillow', 'rest', 'premium', 0, 'Sleep quality improved by social inequality.', {
    premiumSource: true,
    moraleEffect: 5,
    corruptionEffect: 1,
    envyValue: 12,
  }),
  item('budget_bunk_pass', 'Budget Bunk Pass', 'rest', 'common', 0, 'A bed, if you define bed generously.', {
    moraleEffect: 1,
    canBeStolen: false,
    envyValue: 2,
  }),
];

export const ITEM_BY_ID = Object.fromEntries(ITEM_CATALOG.map((entry) => [entry.id, entry]));

const LEGACY_ITEM_IDS = {
  sword_unfair_advantage: 'sword_of_unfair_advantage',
};

export function getItem(id) {
  return ITEM_BY_ID[id] || ITEM_BY_ID[LEGACY_ITEM_IDS[id]] || null;
}

export function getItemByName(name) {
  return ITEM_CATALOG.find((entry) => entry.name === name) || null;
}

export function getRandomPremiumItem(random = Math.random) {
  const premium = ITEM_CATALOG.filter((entry) => entry.premiumSource && entry.powerBonus > 0);
  return premium[Math.floor(random() * premium.length)] || ITEM_CATALOG[0];
}
