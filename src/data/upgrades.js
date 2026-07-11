// Compact in-game upgrade rules.
// Costs are fictional fantasy gold only. No accounts, backend, or real payments.

export const UPGRADE_DEFS = {
  tavern: {
    baseCost: 250,
    costStep: 125,
    maxLevel: 5,
    effect: (level) => `Morale recovery +${level}; low morale complaints soften.`,
    flavor: [
      'Adds more chairs for heroes to complain in.',
      'Installs softer tables for dramatic quitting.',
      'Adds a premium chair nobody admits using.',
      'The ale gets warmer, somehow on purpose.',
      'Veterans now receive sigh-resistant mugs.',
    ],
    deltas: { gold: 0, morale: 4, trust: 1 },
    event: (name) => `${name} upgraded. Complaints now echo with better acoustics.`,
  },
  blacksmith: {
    baseCost: 300,
    costStep: 150,
    maxLevel: 5,
    effect: (level) => `Quest success +${level * 5}% for non-whale heroes.`,
    flavor: [
      'Now sells swords sharp enough to cut through denial.',
      'Adds a receipt anvil for smashing excuses.',
      'The forge judges whales in a warmer orange.',
      'Sparks now spell "try effort" if viewed honestly.',
      'Budget blades gain emotional durability.',
    ],
    deltas: { gold: 0, trust: 2, morale: 1 },
    event: (name) => `${name} upgraded. Hope is still sold separately, but cheaper.`,
  },
  guildhall: {
    baseCost: 400,
    costStep: 175,
    maxLevel: 5,
    effect: (level) => `Quest rewards +${level * 12}g and more daily hero actions.`,
    flavor: [
      'Improves quest paperwork and official excuses.',
      'Adds a clerk window for denying obvious problems.',
      'Stamp quality increased. Fairness unchanged.',
      'The complaint chute now points away from witnesses.',
      'Public trust gets a decorative ribbon.',
    ],
    deltas: { gold: 0, trust: 2, morale: 1 },
    event: (name) => `${name} upgraded. The forms look trustworthy from a distance.`,
  },
  market: {
    baseCost: 220,
    costStep: 110,
    maxLevel: 5,
    effect: (level) => `Steady income +${level * 18}g; level 4+ adds corruption.`,
    flavor: [
      'Adds dynamic pricing and static suffering.',
      'Mystery barrels now contain more mystery per barrel.',
      'The merchant smiles in smaller print.',
      'Dragon supply chains are blamed preemptively.',
      'Hope can now be bundled with onions.',
    ],
    deltas: { gold: 45, corruption: 1 },
    event: (name) => `${name} upgraded. The market blamed inflation on decorative dragons.`,
  },
  training: {
    baseCost: 350,
    costStep: 150,
    maxLevel: 5,
    effect: (level) => `Honest heroes train +${level} power and quest stability.`,
    flavor: [
      'For heroes still pretending effort scales.',
      'Adds another dummy to absorb economic despair.',
      'The push-up circle now has motivational chalk.',
      'Sweat output rises. Shareholder value confused.',
      'Starter swords receive a tiny morale lecture.',
    ],
    deltas: { gold: 0, morale: 2, trust: 2 },
    event: (name) => `${name} upgraded. Effort briefly looked competitive.`,
  },
  whale: {
    baseCost: 650,
    costStep: 320,
    maxLevel: 5,
    effect: (level) => `Fast gold scales with corruption. Trust damage ${level}.`,
    flavor: [
      'Increases revenue, glow intensity, and moral distance.',
      'Adds 40% more ethical fog.',
      'Fairness has been moved to the cosmetics tab.',
      'The Station does not sell power. It sells convenience shaped exactly like power.',
      'Premium access is available to everyone selected by destiny and liquidity.',
      'No refunds. No guilt. No balance patch.',
    ],
    deltas: { gold: 120, trust: -3, corruption: 4 },
    event: (name) => `${name} upgraded. The whale smiled. The economy did not.`,
  },
  dungeon: {
    baseCost: 480,
    costStep: 190,
    maxLevel: 5,
    effect: (level) => `Quest rewards +${level * 10}g; daily threat also rises.`,
    flavor: [
      'Lets danger enter the economy faster.',
      'The gate hinges now creak in surround sound.',
      'Bosses receive clearer instructions to be unfair.',
      'The dungeon recommends a minimum wallet level.',
      'Ancient seals replaced with newer liability stickers.',
    ],
    deltas: { gold: 0, threat: -2, morale: 1 },
    event: (name) => `${name} upgraded. The dungeon filed a concern and was ignored.`,
  },
  complaint_barrel: {
    baseCost: 180,
    costStep: 90,
    maxLevel: 5,
    effect: (level) => `Trust vents +${level}; protest morale damage reduced.`,
    flavor: [
      'Now reinforced against repeated truth.',
      'Adds a lid with denial hinges.',
      'Smoke output reduced by plausible deniability.',
      'Truth splinters less on impact.',
    ],
    deltas: { gold: 0, trust: 2 },
    event: (name) => `${name} upgraded. Feedback now lands with a professional thud.`,
  },
  debt_collector_booth: {
    baseCost: 260,
    costStep: 120,
    maxLevel: 5,
    effect: (level) => `Debt events produce ${level * 18}g and extra corruption.`,
    flavor: [
      'Adds friendlier ink to worse contracts.',
      'The small print learned cursive.',
      'Interest rates now wear little hats.',
      'The booth smiles without moving.',
    ],
    deltas: { gold: 45, morale: -1, corruption: 2 },
    event: (name) => `${name} upgraded. The interest rate gained confidence.`,
  },
  notice_board: {
    baseCost: 160,
    costStep: 80,
    maxLevel: 5,
    effect: (level) => `More quests, clearer excuses, +${level} gossip velocity.`,
    flavor: [
      'Pinned excuses now use bigger nails.',
      'Sponsored danger gets a tasteful border.',
      'Patch notes are arranged by emotional damage.',
      'The apology scroll is easier to ignore.',
    ],
    deltas: { gold: 20, trust: 1 },
    event: (name) => `${name} upgraded. Sponsored danger is now alphabetized.`,
  },
};

export function getUpgradeDef(id) {
  const baseId = String(id || '').split('__')[0];
  return UPGRADE_DEFS[id] || UPGRADE_DEFS[baseId] || null;
}

export function getUpgradeCost(def, level) {
  if (!def || level >= def.maxLevel) return null;
  return def.baseCost + (Math.max(1, level) - 1) * def.costStep;
}

export function getUpgradeFlavor(def, level) {
  if (!def) return 'No upgrade filed. Very mysterious.';
  return def.flavor[(Math.max(1, level) - 1) % def.flavor.length];
}

export function getUpgradeEffect(def, level) {
  if (!def) return null;
  return typeof def.effect === 'function' ? def.effect(level) : def.effect;
}
