// All NPC speech lives here: idle chatter, event reactions, doorman lines.
// Scenes pick lines from these tables — never hardcode dialogue in scene logic.

// Short one-liners NPCs mutter while idling or walking around town.
export const IDLE_QUIPS = {
  'Honest Grinder': [
    'Grind is life.',
    'Earned, not bought.',
    'My starter sword has emotional value.',
    'One rep at a time.',
    'I trained for three weeks and lost to a receipt.',
    'I respect the grind. The grind is undecided.',
    'My damage numbers are historically accurate.',
  ],
  'Noble Whale': [
    'My wallet, my rules.',
    'Is there a golder option?',
    'Chargeback? Never.',
    'I tip in gold bars.',
    'Personal growth has excellent exchange rates.',
    'The meta is whatever I fund.',
    'I prefer my challenge curated.',
  ],
  'Lucky Idiot': [
    'Ooh, shiny!',
    'What does this do?',
    'The dungeon scales with rich people now?',
    'I found a bug! A real one.',
    'I pressed buy and became folklore.',
    'Numbers are just vibes with swords.',
    'I accidentally skipped character development.',
  ],
  Veteran: [
    'I remember when swords had to be earned.',
    'Back in patch 1.0...',
    'Balance is dead.',
    'They nerfed effort again.',
    'The meta is now inheritance.',
    'This is power sprinting.',
  ],
  'Debt Goblin': [
    'I signed nothing. The contract signed me.',
    'Interest? Later.',
    'The VIP rope is just a suggestion, right?',
    'Technically not stealing.',
    'My debt has a health bar now.',
    'I am not broke. I am pre-monetized.',
    'My wallet entered a dungeon and did not return.',
  ],
  Ragequitter: [
    "I'm SO done.",
    'One more day. ONE.',
    'This town is rigged.',
    'A level 2 noble crit harder than my life choices.',
    'They patched skill out of my patience.',
    'I am uninstalling my expectations.',
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
  'Premium Monk': [
    'Fairness is attachment. Release it.',
    'Convenience is a sacred shortcut.',
    'I have transcended the free tier.',
    'The whale is generous to liquidity.',
    'Inner peace costs fantasy gold.',
  ],
  'Refund Seeker': [
    'I have a receipt and no leverage.',
    'The desk denied me preemptively.',
    'My claim was marked "skill issue."',
    'No refunds. No guilt. No balance patch.',
    'I would like to speak to the curse.',
  ],
  'Free Trial Paladin': [
    'My shield has limited-time courage.',
    'I am brave until the timer ends.',
    'The dungeon wants my billing address.',
    'My oath expires at sundown.',
    'My blessing has a cooldown and a clause.',
  ],
  'Overleveled Toddler': [
    'My sword is taller than consequences.',
    'I critted the tutorial.',
    'Bedtime is endgame content.',
    'The boss called my guardian.',
    'I bought the Deluxe Nap Removal Bundle.',
  ],
  'Lootbox Philosopher': [
    'Is disappointment random if expected?',
    'The crate opens us, really.',
    'Probability has a marketing department.',
    'I think, therefore I reroll.',
    'A hat recolor is just fate wearing beige.',
  ],
  'Bankrupt Bard': [
    'My ballad has a payment plan.',
    'I rhyme with insolvency now.',
    'The lute is collateral.',
    'Tip jar accepts apologies.',
    'My chorus is in collections.',
  ],
  'Quest Intern': [
    'I posted the dragon under "entry level."',
    'Exposure is not fireproof.',
    'The quest board says danger is sponsored.',
    'I filed the boss under deliverables.',
    'My mentor is a stamp.',
  ],
  'Disillusioned Blacksmith': [
    'I cannot temper a receipt.',
    'My best sword lost to a coupon.',
    'Craftsmanship needs a patch.',
    'Steel is honest. Markets are not.',
    'I forged effort. They bought numbers.',
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
  'Premium Monk': ['The whale provides convenience-shaped enlightenment.', 'Fairness is only a temporary debuff.'],
  'Refund Seeker': ['That glow voided another warranty.', 'The receipt is somehow laughing.'],
  'Free Trial Paladin': ['My trial ended before the loot dropped.', 'The whale skipped my oath cooldown.'],
  'Overleveled Toddler': ['I bought a nap and got a legendary.', 'Goo goo, great margins.'],
  'Lootbox Philosopher': ['The whale collapses all outcomes into profit.', 'Ah, ceremonial probability.'],
  'Bankrupt Bard': ['The Station converted shame into operating revenue.', 'I can sing for coins I will immediately owe.'],
  'Quest Intern': ['I need to update the quest risk disclosure.', 'Is this deliverable billable?'],
  'Disillusioned Blacksmith': ['I cannot forge against liquidity.', 'That sword never touched a grindstone.'],
};

// Generic reactions when the Dungeon Gate rattles (threat very high).
export const THREAT_REACTIONS = [
  'Did the gate just... knock back?',
  'Someone should really go in there.',
  'Not it.',
  'The dungeon sounds hungry.',
  'The dungeon now recommends a minimum wallet level.',
  'A free hero brought skill to a numbers fight.',
  'The boss asked for a nerf and was ignored.',
  'Someone tell the dungeon this is a prototype.',
];

// What the whale-station doorman communicates to the insufficiently wealthy.
export const DENIED_LINES = [
  'DENIED.',
  'VIPs only.',
  'Rope says no.',
  'Insufficient wallet.',
  'Come back richer.',
  'Liquidity check failed.',
  'Please acquire more destiny.',
  'Fairness is temporarily unavailable.',
];

// Muttered by poor NPCs waiting at the Poor Hero Queue sign.
export const QUEUE_LINES = [
  'The queue builds character.',
  'Estimated wait: yes.',
  'I can see the gold from here.',
  'One day. One glorious day.',
  'The queue builds character and resentment.',
  'My budget-friendly build is spiritually damaged.',
  'I am economically authentic.',
  'The line has lore now.',
];
