# Golden Whale Guild — Inspiration Systems

System-level borrowing only. We never copy assets, UI layouts, names, or exact
designs from these games — we borrow the *reasons they are fun*. This file is
the checklist future prompts should follow when adding gameplay.

## The core loop (the sentence every feature must serve)

**Build town → attract heroes → satisfy needs → send heroes to
quests/exploration → bring back resources/loot → upgrade services → reveal
more map → face bigger risks → manage trust/corruption/premium temptation.**

If a proposed feature doesn't push one of these arrows, it's decoration.

## From Caesar 3

- Road access matters: buildings without a road connection serve nobody.
  *(implemented: `roadRequired` + road-access checks + advisor warnings)*
- Service walkers provide coverage by physically walking routes.
  *(implemented: seven walker types dispatched from road-connected buildings)*
- Buildings need services to function and evolve.
- Overlays/advisors explain problems instead of hiding math.
  *(implemented: Guild Advisor notes; overlays still to come)*
- The city can fail from ignored needs — pressure is legitimate.

## From Settlers / Settlers Online

- Workers visibly move between buildings; the economy is watchable.
- Resources and goods matter: wood/iron/herbs/loot/potions/gear.
  *(implemented: town stores + conversions)*
- Map expansion creates new opportunities, not just space.
- Production chains are visible and understandable at a glance.
- Exploration targets (camps, ruins, caves) create adventure value.
  *(implemented: POIs with harvest/clear/investigate actions)*

## From Anno

- Population/hero tiers have different needs (Rookie → Champion → Whale).
  *(implemented: tiered hero arrivals via town rank)*
- More advanced buildings require better support around them.
- Production chains unlock higher prosperity stages.
- Satisfaction/trust affects growth speed directly.
- Trade/resource conversion is a core verb, not a menu footnote.

## From Age of Empires 2

- Clear exploration: fog and shroud, revealed land stays readable.
  *(implemented: layered fog-of-war)*
- Resources, camps, and ruins live on the map itself.
- Terrain is readable at a glance — meadow, wilds, danger.
- Danger lives outside the safe town core and creeps inward.

## From Foundation

- Buildings evolve through usage, not only through purchase.
  *(implemented: usage/upgrade progress, specializations)*
- The town grows organically around paths the player draws.
- Districts and service areas matter. *(implemented: district bonuses)*
- Visual settlement growth is its own reward.

## From Against the Storm

- Exploration is risky but rewarding — every glade is a gamble.
  *(implemented: POI risk tiers, injuries on failed clears)*
- Dangerous points of interest force decisions: clear, harvest, or ignore.
- Player choices create trade-offs, not free value.
- Pressure rises over time; comfort is temporary.

## From RimWorld (lite)

- Named heroes matter: histories, moods, evolution stages.
- Injury and drama create stories the player retells.
  *(implemented: injuries, potions, hero histories, town log)*
- Greed, envy, item stealing, and grudges are simulation fuel.
  *(implemented: envy/resentment/item conflict)*

## The Extraction & Frontier Loop (2026-07)

The larger world and resource nodes now drive a real expansion loop:

**Explore → discover node → secure area → build extraction camp → connect road
→ transport goods (carriers) → store resources → supply town buildings →
attract better heroes → expand farther → face stronger hazards.**

Implemented pieces:
- **Resource nodes** (`src/systems/extraction.js` + POI inspector): finite
  amount, danger, distance, road access, gatherer, regen. Actions: Survey,
  Establish Access, Assign Gatherer, Collect (send hero), Abandon. Unclaimed
  distant nodes are slow and can injure gatherers.
- **Extraction buildings**: Lumber/Mining/Herbalist/Salvage camps extract a
  matching resource from a node within 16 tiles; Storehouse raises storage
  caps and receives deliveries; Frontier Outpost projects safe territory.
- **Carriers** (Settlers-style): visible workers haul packages from camp to
  the nearest Storehouse/Market/Guild Hall; delivery credits town inventory.
- **Storage & bottlenecks**: per-resource caps (base 24 + 30/storehouse
  level). Full storage pauses extraction; the advisor and Town Stores panel
  explain it; resources never silently vanish (leftovers stay pending).
- **Territory**: Guild Hall + Outposts + Watchtowers + Storehouses project
  influence radii. Building outside territory costs +35% gold (frontier
  toolkit exempt so you can bootstrap outward).
- **Forest gameplay**: dense forest blocks building (roads can cut through);
  Lumber Camps thin nearby forest tiles into wood; harvested tiles regrow
  after ~12 days.

Design guardrails: gold stays the main construction cost; resources are a
parallel pressure, not an early-game paywall. Everything is deterministic on
the day cycle so headless verification stays possible.

## The Production And Hero Supply Loop (2026-07)

**Extract -> carry -> store -> process -> carry finished goods -> equip heroes
or trade -> improve reputation/rank -> attract harder-to-please heroes.**

- Settlers influence: raw and finished goods are physically carried. A
  blocked producer retains its output instead of silently teleporting it.
- Anno influence: readable two-step chains and simple reserves create supply
  pressure without dozens of item types.
- Caesar influence: road access, storage access, and local district partners
  determine whether a building works well.
- Foundation influence: each building instance tracks batches and use, so
  duplicate producers can choose different recipes and specializations.
- Against the Storm influence: rare incidents are caused by active systems
  (fire, shortages, theft, obsolete premium components), not random flavor
  detached from play.

Implemented goods are intentionally capped at twelve. Equipment uses quality
labels rather than a slot-grid RPG inventory. Town Rank uses multiple healthy
town signals, so neither raw gold nor premium corruption can solve progression
alone.

## The satire layer (uniquely ours)

Everything above runs under a fictional pay-to-win economy: the Golden Whale
sells power, corruption buys speed, trust pays for it, and the town log
remembers every "optional" purchase. No real payments, ever — the joke only
works because it's fake.
