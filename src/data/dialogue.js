// All NPC speech lives here: idle chatter, event reactions, doorman lines.
// Scenes pick lines from these tables — never hardcode dialogue in scene logic.

// Short one-liners NPCs mutter while idling or walking around town.
export const IDLE_QUIPS = {
  'Honest Grinder': [
    'Grind is life.',
    'Earned, not bought.',
    'My starter sword has emotional value.',
    'One rep at a time.',
  ],
  'Noble Whale': [
    'My wallet, my rules.',
    'Is there a golder option?',
    'Chargeback? Never.',
    'I tip in gold bars.',
  ],
  'Lucky Idiot': [
    'Ooh, shiny!',
    'What does this do?',
    'The dungeon scales with rich people now?',
    'I found a bug! A real one.',
  ],
  Veteran: [
    'I remember when swords had to be earned.',
    'Back in patch 1.0...',
    'Balance is dead.',
  ],
  'Debt Goblin': [
    'I signed nothing. The contract signed me.',
    'Interest? Later.',
    'The VIP rope is just a suggestion, right?',
    'Technically not stealing.',
  ],
  Ragequitter: [
    "I'm SO done.",
    'One more day. ONE.',
    'This town is rigged.',
  ],
  'Whale Apprentice': [
    'I only bought one booster. This hour.',
    'Someday that rope will open for me.',
    'I practice swiping. For later.',
  ],
  'Broke Optimist': [
    'My build is free-to-play compatible. Mostly.',
    'Today feels lucky! Statistically it must.',
    'Free air. This town has free air!',
  ],
  'Angry Veteran': [
    'WHO BALANCED THIS?',
    'I remember when swords had to be earned.',
    'My rage is level-capped. Barely.',
  ],
  'Sponsored Hero': [
    'This quest was brought to you by MansaCola.',
    'Like and subscribe to my sword.',
    'Contractually, I love it here.',
  ],
  'Debt Collector': [
    'Everyone owes something.',
    'I can smell an overdue loan.',
    'Nice kneecaps. Metaphorically.',
  ],
  'Guild Clerk': [
    'This whale economy creates jobs. Bad ones.',
    'Form 7-B. In triplicate. In blood? No, ink.',
    'I file complaints. Into the fire.',
  ],
  'Suspicious Merchant': [
    'Debt collectors have better pathfinding than heroes.',
    'Genuine mystery barrels. Very genuine.',
    'No refunds. Pre-emptively.',
  ],
  'Tutorial Goblin': [
    'Press nothing to continue suffering!',
    'Step 3: acquire gold. Step 4: unclear.',
    'The VIP rope is just a suggestion, right?',
  ],
  'Balance Refugee': [
    'Balance died behind the tavern.',
    'My old server nerfed hope itself.',
    'I fled here. It was worse.',
  ],
  'Patch Notes Prophet': [
    'The notes foretold this nerf.',
    'REPENT: hotfix approaches.',
    'It is written: "minor adjustments."',
  ],
};

// What NPCs say when the Golden Whale Milking Station visibly cashes in.
export const WHALE_REACTIONS = {
  'Honest Grinder': ['That gold smells unearned.', 'I trained 6 years for what he swiped in 6 seconds.'],
  'Noble Whale': ['Music to my wallet.', 'The station provides.'],
  'Lucky Idiot': ['Free coins! ...no? Not free?', 'Ooh, it rains money there!'],
  Veteran: ['In my day the milking was metaphorical.', '*long, structural sigh*'],
  'Debt Goblin': ['I could owe THAT much someday.', 'Inspiring. Financially terrifying.'],
  Ragequitter: ['THAT\'S IT. I\'M... still here.', 'Unbelievable. Every day.'],
  'Whale Apprentice': ['Teach me, golden senpai.', 'One day, that will be my gold leaving me.'],
  'Broke Optimist': ['Trickle-down loot, any day now!', 'Some of that gold has to bounce, right?'],
  'Angry Veteran': ['MILK. MILK EVERYWHERE.', 'I am filing a rage complaint.'],
  'Sponsored Hero': ['Great engagement numbers today!', 'The brand loves this town.'],
  'Debt Collector': ['Fresh liquidity. Excellent.', 'New debtors incoming. I can feel it.'],
  'Guild Clerk': ['That income is 40% undocumented.', 'More gold, more forms.'],
  'Suspicious Merchant': ['Amateurs. Respectable amateurs.', 'I should sell whale insurance.'],
  'Tutorial Goblin': ['Lesson 12: this is fine, apparently.', 'New players, look away.'],
  'Balance Refugee': ['It follows me. The imbalance follows me.', 'Same whale, different town.'],
  'Patch Notes Prophet': ['As prophesied: the whale provides and takes.', 'The notes said "economy adjustments."'],
};

// Generic reactions when the Dungeon Gate rattles (threat very high).
export const THREAT_REACTIONS = [
  'Did the gate just... knock back?',
  'Someone should really go in there.',
  'Not it.',
  'The dungeon sounds hungry.',
];

// What the whale-station doorman communicates to the insufficiently wealthy.
export const DENIED_LINES = [
  'DENIED.',
  'VIPs only.',
  'Rope says no.',
  'Insufficient wallet.',
  'Come back richer.',
];

// Muttered by poor NPCs waiting at the Poor Hero Queue sign.
export const QUEUE_LINES = [
  'The queue builds character.',
  'Estimated wait: yes.',
  'I can see the gold from here.',
  'One day. One glorious day.',
];
