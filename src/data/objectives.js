// Lightweight guidance goals. Conditions receive a compact TownScene state
// snapshot and return true when complete.

export const OBJECTIVES = [
  {
    id: 'upgrade-any-2',
    text: 'Upgrade any building to level 2',
    reward: { gold: 120, trust: 1 },
    complete: (state) => Object.values(state.levels).some((level) => level >= 2),
    event: 'Objective complete: a building became harder to ignore. +120g.',
  },
  {
    id: 'post-two-quests',
    text: 'Post 2 quests',
    reward: { gold: 140, morale: 1 },
    complete: (state) => state.stats.questsPosted >= 2,
    event: 'Objective complete: the quest board looks employable. +140g.',
  },
  {
    id: 'trust-streak',
    text: 'Keep Trust above 50 for 5 cycles',
    reward: { gold: 180, trust: 3 },
    complete: (state) => state.stats.trustStreak >= 5,
    event: 'Objective complete: citizens briefly believed the brochure. +Trust.',
  },
  {
    id: 'earn-1000',
    text: 'Earn 1000 total gold',
    reward: { gold: 220 },
    complete: (state) => state.stats.totalGoldEarned >= 1000,
    event: 'Objective complete: the accountant blinked first. +220g.',
  },
  {
    id: 'whale-level-3',
    text: 'Upgrade Golden Whale to level 3',
    reward: { gold: 250, corruption: 2, trust: -1 },
    complete: (state) => (state.levels.whale || 1) >= 3,
    event: 'Objective complete: the whale achieved suspicious maturity. +250g.',
  },
  {
    id: 'survive-threat',
    text: 'Survive a Threat 80+ event',
    reward: { gold: 200, morale: 3 },
    complete: (state) => state.stats.threatEventsSurvived >= 1,
    event: 'Objective complete: the dungeon complained in person and lost. +Morale.',
  },
  {
    id: 'honest-quest',
    text: 'Have an honest hero complete a quest',
    reward: { gold: 160, trust: 2 },
    complete: (state) => state.stats.honestQuestSuccesses >= 1,
    event: 'Objective complete: effort produced a receipt. The town is confused.',
  },
  {
    id: 'reach-day-10',
    text: 'Reach Day 10',
    reward: { gold: 300, morale: 2 },
    complete: (state) => state.day >= 10,
    event: 'Objective complete: ten days survived. The economy calls this retention.',
  },
];
