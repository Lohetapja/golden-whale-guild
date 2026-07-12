// Lightweight guidance goals. Conditions receive a compact TownScene state
// snapshot and return true when complete. Keep this ordered: the HUD shows the
// first few unfinished entries as an early-game breadcrumb trail.

const has = (state, id) => state.completed?.has?.(id);
const fairBuildingIds = ['tavern', 'blacksmith', 'guildhall', 'training'];

export const OBJECTIVES = [
  {
    id: 'inspect-guildhall',
    text: 'Inspect the Guild Hall',
    reward: { morale: 1 },
    complete: (state) => state.stats.guildHallInspected >= 1,
    event: 'Objective complete: the Guild Hall admitted it is mostly paperwork. +Morale.',
  },
  {
    id: 'post-first-quest',
    text: 'Post your first quest',
    reward: { gold: 100, morale: 1 },
    complete: (state) => has(state, 'inspect-guildhall') && state.stats.questsPosted >= 1,
    event: 'Objective complete: the guild discovered outsourcing danger. +100g.',
  },
  {
    id: 'assign-first-hero',
    text: 'Assign a hero to a quest',
    reward: { trust: 1, morale: 1 },
    complete: (state) => has(state, 'post-first-quest') && state.stats.questsAssigned >= 1,
    event: 'Objective complete: a hero volunteered before reading the footnote. +Trust.',
  },
  {
    id: 'open-gates-once',
    text: 'Complete one town cycle',
    reward: { morale: 3, trust: 1 },
    complete: (state) => has(state, 'assign-first-hero') && state.stats.cyclesOpened >= 1,
    event: 'Objective complete: the town survived its first business cycle. +Morale.',
  },
  {
    id: 'confirm-tavern-beds',
    text: 'Check Tavern beds',
    reward: { gold: 60, morale: 1 },
    complete: (state) => (
      has(state, 'open-gates-once')
      && (
        state.stats.lodgingChecked >= 1
        || (state.beds && state.beds.beds >= state.beds.used)
      )
    ),
    event: 'Objective complete: the town confirmed indoor sleeping exists, mostly. +60g.',
  },
  {
    id: 'explore-first-poi',
    text: 'Send a hero to a nearby POI',
    reward: { trust: 1, morale: 1 },
    complete: (state) => has(state, 'confirm-tavern-beds') && state.stats.poiActions >= 1,
    event: 'Objective complete: exploration began. The fog looked legally nervous.',
  },
  {
    id: 'discover-resource-node',
    text: 'Discover a resource node',
    reward: { gold: 40 },
    complete: (state) => has(state, 'explore-first-poi') && ((state.stats.resourceNodesDiscovered || 0) >= 1 || (state.extraction?.discoveredNodes || 0) >= 1),
    event: 'Objective complete: the map admitted it contains materials. +40g.',
  },
  {
    id: 'survey-resource-node',
    text: 'Survey the discovered resource node',
    reward: { trust: 1 },
    complete: (state) => has(state, 'discover-resource-node') && ((state.stats.resourceNodesSurveyed || 0) >= 1 || (state.extraction?.surveyedNodes || 0) >= 1),
    event: 'Objective complete: quantity and danger acquired official numbers.',
  },
  {
    id: 'build-extraction-camp',
    text: 'Build the matching extraction camp',
    reward: { gold: 80 },
    complete: (state) => has(state, 'survey-resource-node') && ((state.stats.extractionCampsBuilt || 0) >= 1 || (state.extraction?.camps || 0) >= 1),
    event: 'Objective complete: the frontier received a workplace. +80g.',
  },
  {
    id: 'connect-extraction-road',
    text: 'Connect the extraction camp by road',
    reward: { morale: 1 },
    complete: (state) => has(state, 'build-extraction-camp') && Boolean(state.extraction?.connected),
    event: 'Objective complete: cargo can now travel without conceptual wheels.',
  },
  {
    id: 'build-resource-storehouse',
    text: 'Build or use a Storehouse',
    reward: { gold: 60 },
    complete: (state) => has(state, 'connect-extraction-road') && (state.extraction?.storehouses || 0) >= 1,
    event: 'Objective complete: shelves entered the economy. +60g.',
  },
  {
    id: 'assign-extraction-worker',
    text: 'Assign a worker to the extraction camp',
    reward: { morale: 1, trust: 1 },
    complete: (state) => has(state, 'build-resource-storehouse') && ((state.stats.extractionWorkersAssigned || 0) >= 1 || (state.extraction?.assigned || 0) >= 1),
    event: 'Objective complete: somebody finally picked up the pickaxe.',
  },
  {
    id: 'deliver-first-resource',
    text: 'Deliver the first resource package',
    reward: { gold: 90 },
    complete: (state) => has(state, 'assign-extraction-worker') && ((state.stats.resourceDeliveries || 0) >= 1 || (state.extraction?.delivered || 0) >= 1),
    event: 'Objective complete: visible cargo became visible inventory. +90g.',
  },
  {
    id: 'spend-first-resource',
    text: 'Spend a resource on production or an upgrade',
    reward: { trust: 2, morale: 1 },
    complete: (state) => has(state, 'deliver-first-resource') && (state.stats.resourcesSpent || 0) >= 1,
    event: 'Objective complete: the resource became something useful instead of a number.',
  },
  {
    id: 'collect-first-loot',
    text: 'Collect first loot or resource',
    reward: { gold: 80 },
    complete: (state) => (
      has(state, 'explore-first-poi')
      && ((state.stats.lootCollected || 0) + (state.stats.resourcesCollected || 0)) >= 1
    ),
    event: 'Objective complete: loot entered storage and immediately requested accounting. +80g.',
  },
  {
    id: 'upgrade-road-or-building',
    text: 'Upgrade a road or building',
    reward: { trust: 2, morale: 1 },
    complete: (state) => (
      has(state, 'collect-first-loot')
      && ((state.stats.roadUpgrades || 0) + (state.stats.fairUpgrades || 0) + (state.stats.shadyUpgrades || 0)) >= 1
    ),
    event: 'Objective complete: infrastructure improved. Citizens briefly stopped squinting. +Trust.',
  },
  {
    id: 'read-week-report',
    text: 'Read your first Week Report',
    reward: { gold: 120, morale: 1 },
    complete: (state) => has(state, 'upgrade-road-or-building') && state.stats.weekReportsRead >= 1,
    event: 'Objective complete: you read the report. Accountability survived contact with satire. +120g.',
  },
  {
    id: 'upgrade-fair-building',
    text: 'Upgrade a fair building',
    reward: { trust: 4, morale: 1 },
    complete: (state) => (
      has(state, 'read-week-report')
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
