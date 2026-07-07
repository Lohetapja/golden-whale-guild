// Daily-simulation event tables, keyed by hero personality.
// Each entry: text(name) -> ticker line, bubble -> short speech-bubble line,
// building -> where the hero walks to act it out, d -> resource deltas.
// Deltas: gold (unbounded), trust/corruption/morale/threat (clamped 0-100).

const TABLES = {
  'Honest Grinder': [
    { text: (n) => `${n} trained honestly and gained +1 power.`, bubble: '+1 power. Earned.', building: 'training', d: { morale: 2, trust: 1 } },
    { text: (n) => `${n} completed a fetch quest for 12 gold and a firm handshake.`, bubble: "A fair day's pay.", building: 'guildhall', d: { gold: 12, trust: 1 } },
    { text: (n) => `${n} refused a discount whale coupon on principle.`, bubble: 'No. Coupons.', building: 'market', d: { trust: 2 } },
    { text: (n) => `${n} polished the guild floor. Nobody asked. Morale +2.`, bubble: 'Sparkling!', building: 'guildhall', d: { morale: 2 } },
  ],
  'Noble Whale': [
    { text: (n) => `${n} bought the Sword of Unfair Advantage.`, bubble: 'Worth. Every. Coin.', building: 'whale', d: { gold: 220, corruption: 3, trust: -2 } },
    { text: (n) => `${n} tipped the milking attendant 50 gold "for the ambience."`, bubble: 'For the ambience.', building: 'whale', d: { gold: 50, corruption: 1 } },
    { text: (n) => `${n} bought 9 loot crates and got 9 hat recolors.`, bubble: '...nine hats.', building: 'whale', d: { gold: 130, corruption: 2, morale: -1 } },
    { text: (n) => `${n} demanded a statue. Offered to fund it. Twice.`, bubble: 'Make it golder.', building: 'guildhall', d: { gold: 90, corruption: 2 } },
  ],
  'Lucky Idiot': [
    { text: (n) => `${n} fell into the dungeon and came back with a legendary belt.`, bubble: 'Cool belt!', building: 'dungeon', d: { morale: 2, threat: -2 } },
    { text: (n) => `${n} won the market raffle. Again. Nobody knows how.`, bubble: 'Again?!', building: 'market', d: { gold: 40, morale: 1 } },
    { text: (n) => `${n} licked a cursed altar. Nothing happened. Probably.`, bubble: 'Tastes purple.', building: 'dungeon', d: { corruption: 1 } },
    { text: (n) => `${n} tripped over a rock and dodged an assassination attempt.`, bubble: 'Whoops!', building: 'tavern', d: { threat: -1, morale: 1 } },
  ],
  Veteran: [
    { text: (n) => `${n} says balance is dead.`, bubble: 'Balance is dead.', building: 'tavern', d: { morale: -1 } },
    { text: (n) => `${n} cleared a dungeon floor the old way: slowly and bitterly.`, bubble: 'Still got it.', building: 'dungeon', d: { threat: -4, trust: 1 } },
    { text: (n) => `${n} taught recruits at the Training Yard. Attendance: 2.`, bubble: 'Two showed up.', building: 'training', d: { morale: 1 } },
    { text: (n) => `${n} sighed at the whale station for a full minute.`, bubble: '*long sigh*', building: 'whale', d: { trust: 1 } },
  ],
  'Debt Goblin': [
    { text: (n) => `${n} signed a loan contract written in cursed ink.`, bubble: 'Fine print? Skip.', building: 'market', d: { gold: 80, corruption: 2, trust: -1 } },
    { text: (n) => `${n} pawned someone's armor. Possibly their own.`, bubble: 'Was it mine?', building: 'blacksmith', d: { gold: 25, trust: -2 } },
    { text: (n) => `${n} is 340 gold deep and "has a system."`, bubble: 'I have a system.', building: 'tavern', d: { corruption: 1 } },
    { text: (n) => `${n} refinanced a debt with a worse debt. Visionary.`, bubble: 'Visionary move.', building: 'market', d: { gold: 15, corruption: 2 } },
  ],
  Ragequitter: [
    { text: (n) => `${n} flipped a tavern table, stormed out, then came back for their coat.`, bubble: "I'M DONE! ...my coat.", building: 'tavern', d: { morale: -2 } },
    { text: (n) => `${n} quit the guild forever. Rejoined 10 minutes later.`, bubble: 'I QUIT. (brb)', building: 'guildhall', d: { trust: -1 } },
    { text: (n) => `${n} smashed a training dummy and felt nothing.`, bubble: '...nothing.', building: 'training', d: { morale: -1, threat: 1 } },
    { text: (n) => `${n} uninstalled their sword. Reinstalled it by dinner.`, bubble: 'Sword 2.0.', building: 'blacksmith', d: { morale: -1 } },
  ],
};

// Pick a random daily event for a hero definition.
export function rollHeroEvent(hero) {
  const table = TABLES[hero.personality];
  const entry = table[Math.floor(Math.random() * table.length)];
  return { text: entry.text(hero.name), bubble: entry.bubble, building: entry.building, d: entry.d };
}

// Short ambient one-liners heroes mutter while idling around town.
export const IDLE_QUIPS = {
  'Honest Grinder': ['Grind is life.', 'Earned, not bought.', 'One rep at a time.'],
  'Noble Whale': ['My wallet, my rules.', 'Is there a golder option?', 'Chargeback? Never.'],
  'Lucky Idiot': ['Ooh, shiny!', 'What does this do?', 'I found a bug! A real one.'],
  Veteran: ['Back in patch 1.0...', 'Balance is dead.', 'Kids these days buy power.'],
  'Debt Goblin': ['Interest? Later.', 'Shiny now, pay never.', 'Technically not stealing.'],
  Ragequitter: ["I'm SO done.", 'One more day. ONE.', 'This town is rigged.'],
};

// Occasional flavor events from the Golden Whale Milking Station itself.
export const WHALE_FLAVOR = [
  { text: 'The Milking Station installed a second, golder door.', d: { corruption: 1 } },
  { text: 'A bard was hired to sing about "surprise mechanics."', d: { corruption: 1, morale: -1 } },
  { text: 'The VIP rope was polished. Twice. It gleams with menace.', d: {} },
  { text: 'The whale statue received a smaller whale statue. Synergy.', d: { corruption: 1 } },
];

// What the doorman says when a non-whale gets bounced off the VIP rope.
export const DENIED_LINES = ['DENIED.', 'VIPs only.', 'Rope says no.', 'Insufficient wallet.'];
