// Lightweight guidance goals. Conditions receive a compact TownScene state
// snapshot and return true when complete. Keep this ordered: the HUD shows the
// first few unfinished entries as an early-game breadcrumb trail.

const has = (state, id) => state.completed?.has?.(id);
const fairBuildingIds = ['tavern', 'blacksmith', 'guildhall', 'training'];

export const OBJECTIVES = [
  {
    id: 'post-first-quest',
    text: 'Post your first quest',
    reward: { gold: 100, morale: 1 },
    complete: (state) => state.stats.questsPosted >= 1,
    event: 'Objective complete: the guild discovered outsourcing danger. +100g.',
  },
  {
    id: 'open-gates-once',
    text: 'Complete one town cycle',
    reward: { morale: 3, trust: 1 },
    complete: (state) => has(state, 'post-first-quest') && state.stats.cyclesOpened >= 1,
    event: 'Objective complete: the town survived its first business cycle. +Morale.',
  },
  {
    id: 'upgrade-fair-building',
    text: 'Upgrade a fair building',
    reward: { trust: 4, morale: 1 },
    complete: (state) => (
      has(state, 'open-gates-once')
      && fairBuildingIds.some((id) => (state.levels[id] || 1) >= 2)
    ),
    event: 'Objective complete: a citizen briefly believed in infrastructure. +Trust.',
  },
  {
    id: 'inspect-npc',
    text: 'Inspect any NPC hero',
    reward: { gold: 60 },
    complete: (state) => has(state, 'upgrade-fair-building') && state.stats.heroesInspected >= 1,
    event: 'Objective complete: you discovered heroes have feelings. This may be expensive. +60g.',
  },
  {
    id: 'choose-town-path',
    text: 'Choose fair infrastructure or Golden Whale',
    reward: (state) => ((state.levels.whale || 1) >= 2
      ? { gold: 180, corruption: 2, trust: -1 }
      : { trust: 3, morale: 3, gold: 80 }),
    complete: (state) => (
      has(state, 'inspect-npc')
      && (
        (state.levels.whale || 1) >= 2
        || (state.levels.training || 1) >= 2
        || (state.levels.blacksmith || 1) >= 2
      )
    ),
    event: (state) => ((state.levels.whale || 1) >= 2
      ? 'Objective complete: the whale temptation was accepted. The economy glittered and coughed.'
      : 'Objective complete: you rejected the whale temptation for now. Fairness looked startled.'),
  },
  {
    id: 'complete-three-quests',
    text: 'Complete 3 quests',
    reward: { gold: 220, trust: 2 },
    complete: (state) => has(state, 'choose-town-path') && state.stats.questsCompleted >= 3,
    event: 'Objective complete: three quests resolved. The Notice Board now has professional trauma. +220g.',
  },
  {
    id: 'reach-cycle-five',
    text: 'Reach Day 5',
    reward: { gold: 180, morale: 2 },
    complete: (state) => has(state, 'complete-three-quests') && state.day >= 5,
    event: 'Objective complete: Day 5 reached. The town unlocked recurring compromise. +180g.',
  },
  {
    id: 'survive-warning',
    text: 'Survive a warning event',
    reward: { gold: 160, trust: 1, morale: 1 },
    complete: (state) => has(state, 'reach-cycle-five') && state.stats.warningEvents >= 1,
    event: 'Objective complete: a warning arrived and the town kept standing. Reputation became plausible.',
  },
  {
    id: 'earn-1000',
    text: 'Earn 1000 total gold',
    reward: { gold: 220 },
    complete: (state) => state.stats.totalGoldEarned >= 1000,
    event: 'Objective complete: the accountant blinked first. +220g.',
  },
  {
    id: 'honest-quest',
    text: 'Have an honest hero complete a quest',
    reward: { gold: 160, trust: 2 },
    complete: (state) => state.stats.honestQuestSuccesses >= 1,
    event: 'Objective complete: effort produced a receipt. The town is confused.',
  },
  {
    id: 'trust-streak',
    text: 'Keep Trust above 50 for 5 cycles',
    reward: { gold: 180, trust: 3 },
    complete: (state) => state.stats.trustStreak >= 5,
    event: 'Objective complete: citizens briefly believed the brochure. +Trust.',
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
    id: 'reach-day-10',
    text: 'Reach Day 10',
    reward: { gold: 300, morale: 2 },
    complete: (state) => state.day >= 10,
    event: 'Objective complete: ten days survived. The economy calls this retention.',
  },
];
