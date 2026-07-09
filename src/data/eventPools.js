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
    {
      text: (n) => `${n} purchased a limited-time bundle that has been limited all month.`,
      bubble: 'Urgency achieved.',
      building: 'whale',
      d: { gold: 170, trust: -1, corruption: 3 },
    },
    {
      text: (n) => `${n} rolled the sacred banner and got duplicate boots with executive confidence.`,
      bubble: 'Duplicate destiny.',
      building: 'lootbox_kiosk',
      d: { gold: 120, morale: -1, corruption: 2 },
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

  refundDenials: [
    {
      text: (n) => `${n} presented a receipt. The Refund Denial Desk presented a smaller desk.`,
      bubble: 'Denied recursively.',
      building: 'refund_denial_desk',
      d: { trust: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} asked for a refund and received a lore explanation instead.`,
      bubble: 'That is not gold.',
      building: 'refund_denial_desk',
      d: { morale: -1, trust: -1 },
    },
    {
      text: (n) => `${n} learned "working as designed" is a complete sentence.`,
      bubble: 'Designed by who?',
      building: 'refund_denial_desk',
      d: { trust: -2 },
    },
    {
      text: (n) => `${n} filed a complaint so polite it was denied with manners.`,
      bubble: 'At least polite.',
      building: 'complaint_barrel',
      d: { trust: 1, morale: -1 },
    },
  ],

  premiumPilgrimage: [
    {
      text: (n) => `${n} meditated on the whale glow and called it balance.`,
      bubble: 'Fairness is attachment.',
      building: 'ethics_fountain',
      d: { corruption: 2 },
    },
    {
      text: (n) => `${n} donated fantasy gold to the sacred margin.`,
      bubble: 'Convenience blesses.',
      building: 'whale',
      d: { gold: 150, trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} achieved enlightenment by skipping the grind respectfully.`,
      bubble: 'I release effort.',
      building: 'vip_rope_entrance',
      d: { gold: 90, corruption: 2 },
    },
    {
      text: (n) => `${n} declared fairness a worldly attachment and bought better numbers.`,
      bubble: 'Numbers are dust.',
      building: 'whale',
      d: { gold: 175, trust: -2, corruption: 3 },
    },
  ],

  trialTroubles: [
    {
      text: (n) => `${n} blocked heroically until the free trial expired.`,
      bubble: 'Trial ended.',
      building: 'dungeon',
      d: { threat: 1, morale: -1 },
    },
    {
      text: (n) => `${n} trained honestly but the tooltip said "upgrade unavailable."`,
      bubble: 'Unavailable?',
      building: 'training',
      d: { morale: 1, trust: 1 },
    },
    {
      text: (n) => `${n} brought skill to a numbers fight and learned math is rude.`,
      bubble: 'Math parried me.',
      building: 'dungeon',
      d: { trust: -1, morale: -1 },
    },
    {
      text: (n) => `${n} stood in the Poor Hero Queue and gained lore.`,
      bubble: '+1 lore?',
      building: 'poor_hero_queue',
      d: { morale: -1 },
    },
  ],

  lootboxPhilosophy: [
    {
      text: (n) => `${n} asked whether a hat recolor can perceive suffering.`,
      bubble: 'The hat knows.',
      building: 'market',
      d: { corruption: 1 },
    },
    {
      text: (n) => `${n} concluded every mystery barrel is a mirror with splinters.`,
      bubble: 'Profound. Ouch.',
      building: 'market',
      d: { morale: 1 },
    },
    {
      text: (n) => `${n} opened no crate and still felt statistically disappointed.`,
      bubble: 'Expected value.',
      building: 'ethics_fountain',
      d: { morale: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} proved probability has a marketing department.`,
      bubble: 'Peer reviewed.',
      building: 'notice_board',
      d: { trust: -1 },
    },
  ],

  rngesusFaith: [
    {
      text: (n) => `${n} prayed to RNGesus and received a common hat with rare disappointment.`,
      bubble: 'Blessed be the pity timer.',
      building: 'premium_temple',
      d: { morale: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} lit a candle for a better roll. The candle had a drop rate.`,
      bubble: 'The flame was common.',
      building: 'patch_notes_shrine',
      d: { morale: 1, corruption: 1 },
    },
    {
      text: (n) => `${n} studied sacred odds written in enchanted small print.`,
      bubble: 'I believe. Sort of.',
      building: 'ethics_fountain',
      d: { trust: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} declared the next loot miss a spiritual growth opportunity.`,
      bubble: 'Growth hurts.',
      building: 'notice_board',
      d: { morale: -1 },
    },
    {
      text: (n) => `${n} asked RNGesus for mercy and received a receipt with wings.`,
      bubble: 'Blessed invoice.',
      building: 'premium_temple',
      d: { gold: 35, corruption: 2, trust: -1 },
    },
    {
      text: (n) => `${n} joined a pity-timer vigil. The timer filed for an extension.`,
      bubble: 'Any roll now.',
      building: 'patch_notes_shrine',
      d: { morale: -1, corruption: 1 },
    },
  ],

  fakeOddsGossip: [
    {
      text: (n) => `${n} found a "best value" bundle priced exactly like panic.`,
      bubble: 'Value is trembling.',
      building: 'market',
      d: { gold: 30, corruption: 1 },
    },
    {
      text: (n) => `${n} read fake odds so tiny the parchment needed glasses.`,
      bubble: 'Tiny numbers.',
      building: 'lootbox_kiosk',
      d: { trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} heard the lootbox bell and briefly became a business metric.`,
      bubble: 'Ding. Regret.',
      building: 'whale',
      d: { gold: 55, morale: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} bought urgency in bulk before the timer admitted it was decorative.`,
      bubble: 'Limited forever.',
      building: 'convenience_office',
      d: { gold: 70, trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} read "99% value" and asked what happened to the other percent. Security arrived.`,
      bubble: 'Math forbidden.',
      building: 'gem_exchange',
      d: { trust: -1, corruption: 2 },
    },
    {
      text: (n) => `${n} found a pity chart shaped exactly like a sales funnel.`,
      bubble: 'Funnels are holy?',
      building: 'lootbox_kiosk',
      d: { morale: -1, corruption: 2 },
    },
  ],

  bardDebt: [
    {
      text: (n) => `${n} performed a ballad titled "Owed To Joy."`,
      bubble: 'Please tip.',
      building: 'tavern',
      d: { gold: 8, morale: 1 },
    },
    {
      text: (n) => `${n} sang for debt relief and got exposure to interest.`,
      bubble: 'Exposure hurts.',
      building: 'debt_collector_booth',
      d: { morale: -1, corruption: 1 },
    },
    {
      text: (n) => `${n} pawned a chorus and kept the bridge.`,
      bubble: 'The bridge slaps.',
      building: 'market',
      d: { gold: 18, trust: -1 },
    },
    {
      text: (n) => `${n} played a premium lament outside the VIP rope.`,
      bubble: 'Sad in major key.',
      building: 'poor_hero_queue',
      d: { morale: 1, trust: -1 },
    },
  ],

  internErrors: [
    {
      text: (n) => `${n} posted a dragon quest under "beginner friendly."`,
      bubble: 'Growth role!',
      building: 'sponsored_quest_board',
      d: { threat: 2, gold: 20 },
    },
    {
      text: (n) => `${n} alphabetized danger by sponsor friendliness.`,
      bubble: 'Very tidy.',
      building: 'notice_board',
      d: { trust: -1 },
    },
    {
      text: (n) => `${n} learned exposure is not fireproof.`,
      bubble: 'Noted.',
      building: 'guildhall',
      d: { morale: -1, trust: 1 },
    },
    {
      text: (n) => `${n} put "defeat the economy" on the quest board. It was rejected as too hard.`,
      bubble: 'Too hard.',
      building: 'guildhall',
      d: { trust: -1 },
    },
  ],

  blacksmithDisillusion: [
    {
      text: (n) => `${n} forged honest steel for a dishonest meta.`,
      bubble: 'Steel tried.',
      building: 'blacksmith',
      d: { trust: 1, morale: 1 },
    },
    {
      text: (n) => `${n} watched a coupon outscale craftsmanship.`,
      bubble: 'That hurt.',
      building: 'balance_memorial',
      d: { morale: -1, trust: -1 },
    },
    {
      text: (n) => `${n} sharpened a sword until denial split cleanly in half.`,
      bubble: 'Clean edge.',
      building: 'blacksmith',
      d: { trust: 2 },
    },
    {
      text: (n) => `${n} added "anti-receipt" runes. Results pending.`,
      bubble: 'Maybe this time.',
      building: 'training',
      d: { morale: 1 },
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
  'Premium Monk': ['premiumPilgrimage', 'goldenWhalePurchases', 'corruptionGain'],
  'Refund Seeker': ['refundDenials', 'trustLoss', 'poorHeroFrustration'],
  'Free Trial Paladin': ['trialTroubles', 'honestTraining', 'dungeonResults'],
  'Overleveled Toddler': ['ridiculousWhaleSuccessStories', 'dungeonResults', 'goldenWhalePurchases'],
  'Lootbox Philosopher': ['lootboxPhilosophy', 'fakeOddsGossip', 'rngesusFaith', 'marketGossip', 'corruptionGain'],
  'Bankrupt Bard': ['bardDebt', 'debtEvents', 'poorHeroFrustration'],
  'Quest Intern': ['internErrors', 'clericalWork', 'sponsoredHeroics', 'fakeOddsGossip'],
  'Disillusioned Blacksmith': ['blacksmithDisillusion', 'honestTraining', 'veteranComplaints'],
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
  { text: 'Someone paid extra to skip the part where games are played.', d: { gold: 120, trust: -2, corruption: 2 } },
  { text: 'The Station converted shame into operating revenue.', d: { gold: 110, corruption: 2 } },
  { text: 'A lucky idiot unlocked the ancient technique of having better numbers.', d: { gold: 80, trust: -1 } },
  { text: 'The balance team was seen leaving town with packed bags.', d: { trust: -2, morale: -1 } },
  { text: 'A hero purchased the Deluxe Struggle Removal Bundle.', d: { gold: 160, corruption: 3, trust: -2 } },
  { text: 'A whale bought a legendary sword and called it personal growth.', d: { gold: 180, corruption: 2 } },
  { text: 'The ethics disclaimer gained another paragraph and no one read it.', d: { corruption: 1 } },
  { text: 'A VIP hero skipped the tutorial, the grind, and several moral lessons.', d: { gold: 140, trust: -2, corruption: 2 } },
  { text: 'Fairness has been moved to the cosmetics tab.', d: { trust: -2, corruption: 1 } },
  { text: 'Premium access was offered to everyone selected by destiny and liquidity.', d: { gold: 100, corruption: 2 } },
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
