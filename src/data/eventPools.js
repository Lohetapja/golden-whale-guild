// Expanded daily-simulation event pools.
// Keep entries short enough for the bottom ticker and speech bubbles.

export const EVENT_POOLS = {
  goldenWhalePurchases: [
    {
      text: (n) => `${n} bought confidence in bulk.`,
      bubble: 'Skill sold separately?',
      building: 'whale',
      d: { gold: 180, trust: -2, corruption: 3 },
    },
    {
      text: (n) => `${n} bought the Sword of Unfair Advantage and waved the receipt like a banner.`,
      bubble: 'Receipt is my build.',
      building: 'whale',
      d: { gold: 240, trust: -2, corruption: 4 },
    },
    {
      text: (n) => `${n} paid for a premium tutorial that only said "pay again."`,
      bubble: 'Clear instructions.',
      building: 'whale',
      d: { gold: 95, corruption: 2 },
    },
    {
      text: (n) => `${n} bought a loot crate and received ceremonial disappointment.`,
      bubble: 'Rare sadness!',
      building: 'whale',
      d: { gold: 130, morale: -1, corruption: 2 },
    },
  ],

  honestTraining: [
    {
      text: (n) => `${n} trained honestly and gained +1 power.`,
      bubble: '+1 power. Earned.',
      building: 'training',
      d: { morale: 2, trust: 1 },
    },
    {
      text: (n) => `${n} drilled sword forms until the dummy apologized.`,
      bubble: 'Again.',
      building: 'training',
      d: { morale: 2, trust: 1 },
    },
    {
      text: (n) => `${n} helped a rookie learn blocking, also known as "not exploding."`,
      bubble: 'Shield first.',
      building: 'training',
      d: { trust: 2, morale: 1 },
    },
    {
      text: (n) => `${n} refused a whale coupon and stretched instead.`,
      bubble: 'My knees are free.',
      building: 'training',
      d: { trust: 2 },
    },
  ],

  debtEvents: [
    {
      text: (n) => `${n} refinanced a debt with a worse debt. Visionary.`,
      bubble: 'Visionary move.',
      building: 'debt_collector_booth',
      d: { gold: 20, trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} signed a loan contract written in cursed ink.`,
      bubble: 'The ink winked.',
      building: 'debt_collector_booth',
      d: { gold: 80, trust: -1, corruption: 3 },
    },
    {
      text: (n) => `${n} pawned armor that may have still contained a hero.`,
      bubble: 'Probably fine.',
      building: 'market',
      d: { gold: 45, trust: -2 },
    },
    {
      text: (n) => `${n} met a debt collector with better pathfinding than most heroes.`,
      bubble: 'They found me.',
      building: 'debt_collector_booth',
      d: { morale: -1, threat: 1 },
    },
  ],

  veteranComplaints: [
    {
      text: (n) => `${n} declared balance dead behind the tavern.`,
      bubble: 'Balance died here.',
      building: 'tavern',
      d: { morale: -1 },
    },
    {
      text: (n) => `${n} filed a complaint into the Complaint Barrel. It burped.`,
      bubble: 'It knows.',
      building: 'complaint_barrel',
      d: { trust: 1, morale: -1 },
    },
    {
      text: (n) => `${n} gave a lecture titled "Swords Used To Matter." Attendance: concerned.`,
      bubble: 'Chapter one...',
      building: 'training',
      d: { trust: 1 },
    },
    {
      text: (n) => `${n} sighed at the VIP rope for a full minute.`,
      bubble: '*premium sigh*',
      building: 'vip_rope_entrance',
      d: { trust: 1 },
    },
  ],

  dungeonResults: [
    {
      text: (n) => `${n} cleared a dungeon floor the old way: slowly and bitterly.`,
      bubble: 'Still got it.',
      building: 'dungeon',
      d: { threat: -4, trust: 1 },
    },
    {
      text: (n) => `${n} found a legendary belt in a suspiciously polite chest.`,
      bubble: 'Nice belt.',
      building: 'dungeon',
      d: { morale: 2, threat: -2 },
    },
    {
      text: (n) => `${n} learned the dungeon now scales with rich people.`,
      bubble: 'That explains it.',
      building: 'dungeon',
      d: { threat: 2, trust: -1 },
    },
    {
      text: (n) => `${n} escorted a lost slime back to the dungeon. It tipped nothing.`,
      bubble: 'No tip?',
      building: 'dungeon',
      d: { threat: -1, morale: 1 },
    },
  ],

  marketGossip: [
    {
      text: (n) => `${n} heard market gossip that the VIP rope is "just decorative."`,
      bubble: 'Decorative, right?',
      building: 'market',
      d: { corruption: 1 },
    },
    {
      text: (n) => `${n} bought a mystery barrel. The mystery was debt.`,
      bubble: 'Ah. Debt.',
      building: 'market',
      d: { gold: 25, morale: -1 },
    },
    {
      text: (n) => `${n} spread a rumor that patch notes are written after the bugs.`,
      bubble: 'Intended.',
      building: 'notice_board',
      d: { trust: -1 },
    },
    {
      text: (n) => `${n} traded three apples for one legally distinct apple.`,
      bubble: 'Market forces.',
      building: 'market',
      d: { morale: 1 },
    },
  ],

  poorHeroFrustration: [
    {
      text: (n) => `${n} asked if skill is sold separately. Nobody made eye contact.`,
      bubble: 'Is skill extra?',
      building: 'vip_rope_entrance',
      d: { trust: -1, morale: -1 },
    },
    {
      text: (n) => `${n} waited outside the VIP rope long enough to level patience.`,
      bubble: '+1 patience?',
      building: 'vip_rope_entrance',
      d: { trust: -1 },
    },
    {
      text: (n) => `${n} confirmed their starter sword has emotional value.`,
      bubble: 'Emotional DPS.',
      building: 'training',
      d: { morale: 1 },
    },
    {
      text: (n) => `${n} read the ethics disclaimer and became poorer somehow.`,
      bubble: 'How did reading cost?',
      building: 'ethics_fountain',
      d: { morale: -1, corruption: 1 },
    },
  ],

  corruptionGain: [
    {
      text: (n) => `${n} discovered a premium shortcut behind the guild hall.`,
      bubble: 'Shortcut unlocked.',
      building: 'guildhall',
      d: { corruption: 2, trust: -1 },
    },
    {
      text: (n) => `${n} watched the ethics plaque quietly rotate toward profit.`,
      bubble: 'It moved.',
      building: 'ethics_fountain',
      d: { corruption: 2 },
    },
    {
      text: (n) => `${n} polished the whale disclaimer until it reflected nobody's fault.`,
      bubble: 'Legally shiny.',
      building: 'whale',
      d: { corruption: 2 },
    },
  ],

  trustLoss: [
    {
      text: (n) => `${n} noticed the queue moved faster than the justice system.`,
      bubble: 'Justice has cooldown.',
      building: 'vip_rope_entrance',
      d: { trust: -2 },
    },
    {
      text: (n) => `${n} found complaints filed directly under "flammable."`,
      bubble: 'That tracks.',
      building: 'complaint_barrel',
      d: { trust: -2 },
    },
    {
      text: (n) => `${n} asked why the whale station has a profit moat.`,
      bubble: 'Is that moat legal?',
      building: 'whale',
      d: { trust: -1, corruption: 1 },
    },
  ],

  ridiculousWhaleSuccessStories: [
    {
      text: (n) => `${n} paid for a starter pack and accidentally became endgame.`,
      bubble: 'Beginner friendly.',
      building: 'whale',
      d: { gold: 160, trust: -2, corruption: 3 },
    },
    {
      text: (n) => `${n} won a duel by presenting a platinum receipt.`,
      bubble: 'Proof of skill.',
      building: 'whale',
      d: { gold: 140, trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} unlocked "humility" as a cosmetic emote.`,
      bubble: '/humble',
      building: 'whale',
      d: { gold: 80, morale: -1 },
    },
  ],

  sponsoredHeroics: [
    {
      text: (n) => `${n} completed a sponsored quest and thanked three brands.`,
      bubble: 'Use code SWORD.',
      building: 'market',
      d: { gold: 60, trust: -1 },
    },
    {
      text: (n) => `${n} paused mid-fight for an ad read. The slime waited politely.`,
      bubble: 'Quick word...',
      building: 'dungeon',
      d: { gold: 40, threat: 1 },
    },
  ],

  clericalWork: [
    {
      text: (n) => `${n} filed Form 7-B: Unexplained Whale Revenue.`,
      bubble: 'Triplicate.',
      building: 'guildhall',
      d: { trust: 1, morale: -1 },
    },
    {
      text: (n) => `${n} moved a complaint from the barrel to a smaller barrel.`,
      bubble: 'Progress.',
      building: 'complaint_barrel',
      d: { trust: 1 },
    },
  ],
};

export const PERSONALITY_POOLS = {
  'Honest Grinder': ['honestTraining', 'dungeonResults', 'poorHeroFrustration'],
  'Noble Whale': ['goldenWhalePurchases', 'ridiculousWhaleSuccessStories'],
  'Lucky Idiot': ['dungeonResults', 'marketGossip'],
  Veteran: ['veteranComplaints', 'dungeonResults'],
  'Debt Goblin': ['debtEvents', 'poorHeroFrustration', 'marketGossip'],
  Ragequitter: ['veteranComplaints', 'poorHeroFrustration', 'trustLoss'],
  'Whale Apprentice': ['goldenWhalePurchases', 'poorHeroFrustration', 'marketGossip'],
  'Broke Optimist': ['honestTraining', 'poorHeroFrustration', 'marketGossip'],
  'Angry Veteran': ['veteranComplaints', 'dungeonResults', 'trustLoss'],
  'Sponsored Hero': ['sponsoredHeroics', 'marketGossip', 'goldenWhalePurchases'],
  'Debt Collector': ['debtEvents', 'marketGossip', 'corruptionGain'],
  'Guild Clerk': ['clericalWork', 'trustLoss', 'marketGossip'],
  'Suspicious Merchant': ['marketGossip', 'debtEvents', 'corruptionGain'],
  'Tutorial Goblin': ['poorHeroFrustration', 'honestTraining', 'marketGossip'],
  'Balance Refugee': ['veteranComplaints', 'poorHeroFrustration', 'dungeonResults'],
  'Patch Notes Prophet': ['marketGossip', 'trustLoss', 'corruptionGain'],
};

export const WHALE_STATION_EVENTS = [
  { text: 'Lord Beefwallet bought confidence in bulk.', d: { gold: 130, trust: -1, corruption: 2 } },
  { text: 'A beginner asked if skill is sold separately.', d: { trust: -1 } },
  { text: 'The whale attendant polished the ethics disclaimer.', d: { corruption: 1 } },
  { text: 'Debt Goblin upgraded from poor to premium-poor.', d: { gold: 40, morale: -1, corruption: 1 } },
  { text: 'The VIP queue moved faster than the justice system.', d: { trust: -2, corruption: 1 } },
  { text: 'A bard was hired to sing about "surprise mechanics."', d: { corruption: 1, morale: -1 } },
  { text: 'The whale sign blinked PROFIT in a language nobody admitted reading.', d: { corruption: 1 } },
  { text: 'A starter pack became a finishing pack through aggressive accounting.', d: { gold: 90, trust: -1 } },
];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function rollNpcEvent(npc) {
  const poolNames = PERSONALITY_POOLS[npc.personality] || ['marketGossip'];
  const entries = poolNames.flatMap((name) => EVENT_POOLS[name] || []);
  const entry = pick(entries.length ? entries : EVENT_POOLS.marketGossip);
  return {
    text: entry.text(npc.name),
    bubble: entry.bubble,
    building: entry.building,
    d: { ...(entry.d || {}) },
  };
}
