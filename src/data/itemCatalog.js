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
  assetKey: `item_${id}`,
  powerBonus,
  moraleEffect: options.moraleEffect || 0,
  debtEffect: options.debtEffect || 0,
  corruptionEffect: options.corruptionEffect || 0,
  envyValue: options.envyValue || Math.max(2, powerBonus * 4),
  premiumSource: Boolean(options.premiumSource),
  canBeStolen: options.canBeStolen !== false,
  destroyChance: options.destroyChance ?? 0.5,
  flavour,
});

export const ITEM_CATALOG = [
  item('starter_sword', 'Starter Sword', 'weapon', 'common', 1, 'Emotionally valuable because it is all you own.', {
    canBeStolen: false,
    destroyChance: 0.15,
  }),
  item('bent_sword', 'Bent Sword', 'weapon', 'common', 1, 'Curves around both armor and expectations.', {
    destroyChance: 0.3,
  }),
  item('basic_armor', 'Basic Armor', 'armor', 'common', 1, 'Protects the torso and a modest amount of optimism.', {
    moraleEffect: 1,
  }),
  item('sponsored_armor', 'Sponsored Armor of Plausible Skill', 'armor', 'premium', 5, 'Every plate carries an invisible ad read.', {
    premiumSource: true,
    corruptionEffect: 3,
    envyValue: 30,
  }),
  item('premium_knees', 'Premium Knees', 'premium', 'legendary', 4, 'The dungeon now expects everyone to own a pair.', {
    premiumSource: true,
    moraleEffect: 4,
    envyValue: 28,
  }),
  item('legendary_receipt', 'Legendary Receipt', 'trinket', 'legendary', 6, 'Proof that numbers happened for a reason.', {
    premiumSource: true,
    debtEffect: 80,
    envyValue: 38,
  }),
  item('queue_skip_relic', 'Queue Skip Relic', 'trinket', 'premium', 3, 'Skips the queue and several moral lessons.', {
    premiumSource: true,
    corruptionEffect: 2,
    envyValue: 24,
  }),
  item('sword_unfair_advantage', 'Sword of Unfair Advantage', 'weapon', 'legendary', 8, 'Perfectly balanced around the owner.', {
    premiumSource: true,
    corruptionEffect: 5,
    envyValue: 48,
    destroyChance: 0.62,
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
  item('confidence_booster_soup', 'Confidence Booster Soup', 'potion', 'uncommon', 2, 'Tastes like broth and projected competence.', {
    moraleEffect: 8,
    destroyChance: 0.8,
  }),
  item('dragon_mount_trial', 'Dragon Mount Trial', 'premium', 'legendary', 7, 'The dragon expires after the introductory period.', {
    premiumSource: true,
    debtEffect: 120,
    envyValue: 42,
  }),
  item('deluxe_struggle_bundle', 'Deluxe Struggle Removal Bundle', 'premium', 'legendary', 7, 'Removes the part where games are played.', {
    premiumSource: true,
    corruptionEffect: 5,
    envyValue: 44,
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
    corruptionEffect: 1,
    envyValue: 6,
  }),
];

export const ITEM_BY_ID = Object.fromEntries(ITEM_CATALOG.map((entry) => [entry.id, entry]));

export function getItem(id) {
  return ITEM_BY_ID[id] || null;
}

export function getItemByName(name) {
  return ITEM_CATALOG.find((entry) => entry.name === name) || null;
}

export function getRandomPremiumItem(random = Math.random) {
  const premium = ITEM_CATALOG.filter((entry) => entry.premiumSource && entry.powerBonus > 0);
  return premium[Math.floor(random() * premium.length)] || ITEM_CATALOG[0];
}
