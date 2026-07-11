# Golden Whale Guild ā€” City-Builder Systems Plan

**This is the source-of-truth design document.** Future work (human, Claude, or
Codex) should check this plan before adding features, and update it when
direction changes. It exists because the game was drifting: roads, buildings,
map, UI, and systems were being added without one unified direction.

Related docs: [INSPIRATION_SYSTEMS.md](INSPIRATION_SYSTEMS.md) (system borrowing checklist + core loop), [VISUAL_DIRECTION.md](VISUAL_DIRECTION.md) (art specifics),
[ASSET_CATALOG.md](ASSET_CATALOG.md) (what art exists),
[ASSET_STYLE_GUIDE.md](ASSET_STYLE_GUIDE.md) (PixelLab prompts).

Hard constraints that apply to everything below: no backend, no accounts, no
analytics, no real payments ā€” every monetization mechanic is fictional in-game
satire. GitHub Pages deployment and save/load safety must survive every pass.

---

## 1. Core Identity

Golden Whale Guild is **a satirical fantasy city-building management game**:
the player builds an adventurer town and manages heroes, roads, shops,
services, missions, monsters, and a corrupt fictional pay-to-win economy.

Core fantasy:
- Empty land becomes a functioning adventurer town.
- Heroes arrive, rest, train, shop, explore, fight monsters, and complain.
- Buildings need roads and services to work.
- Premium/pay-to-win choices create power but destroy trust and cause envy.
- The town can be run fairly, badly, greedily, or as a full Whale-Optimized
  disaster ā€” all endings are valid content.

System-level inspirations (never copy assets/UI/names):
- **Caesar 3** ā€” roads, service walkers, building needs, advisors, overlays.
- **Settlers / Settlers Online** ā€” roads/logistics, visible workers,
  production chains, quests/adventures.
- **Anno** ā€” build categories, production chains, population-tier needs.
- **Age of Empires 2** ā€” readable terrain, forests/rocks, natural maps,
  exploration feel.
- **Pharaoh / Zeus / Emperor** ā€” walkers, favor/festivals, disasters.
- **Foundation** ā€” organic building growth/modules.
- **Against the Storm** ā€” fog exploration, risk/reward events.
- **Kingdoms and Castles** ā€” readable defense/waves/safety pressure.
- **RimWorld-lite** ā€” named NPCs, social drama, item envy, emergent stories.

---

## 2. Visual Direction

Target: **isometric / angled fantasy city-builder**, readable browser-scale
pixel art, cozy but satirical. Buildings sit on angled foundations, roads
match the building perspective, terrain feels natural, UI feels like a game.

The core visual problem this plan resolves: the logic grid is square, road
rendering started flat horizontal/vertical, buildings are angled ā€” the
mismatch broke immersion.

**Chosen solution (decided 2026-07):**
- Keep the **square logical grid** internally for placement, occupancy,
  roads, save/load, and pathing. It is stable and save-compatible.
- Render an increasingly angled/isometric **view** on top of it, gradually.
- All grid<->world conversion goes through the centralized helpers in
  `src/data/grid.js`: `gridToWorldIso`, `worldToGridIso`, `getIsoTileCenter`,
  `getIsoFootprintBounds`. Today they delegate to the orthogonal versions; a
  future diamond projection changes only that file.
- **Do not let PixelLab top-down assets dictate style.** Every building/road
  prompt asks for isometric/angled city-builder art (see section 22).

Gradual conversion order: angled road tiles ā†’ isometric foundations (done) ā†’
proper building anchors (done) ā†’ road entrance connectors (done) ā†’ terrain
blending (done) ā†’ true diamond tiles last, only if worth it.

Current state (2026-07): terrain base + decal variety, procedural road depth
curbs (north lip / south face), diamond foundation pads, doorstep connectors,
and a full angled building set are in. Roads are the weakest remaining link;
future work should replace the rectangular fills with angled piece art.

---

## 3. Map and Starting Layout

The map is **large from the start** (56x32 tiles at 48px) with most of it
under fog of war.

Starting state (Option A ā€” implemented):
- One straight horizontal dirt road.
- Guild Hall beside it; Notice Board beside the Guild Hall.
- 2ā€“4 starting heroes.
- Mostly empty revealed clearing with buildable land.
- Enough gold to place a Tavern plus one service building (~650g).
- Low corruption, low/moderate threat, healthy trust.

Never start with a road maze ā€” misplaced complexity at minute zero reads as
a bug, not content.

"Buy map extension rectangle" is **removed** (2026-07). Expansion is
exploration: heroes reveal land, watchtowers reveal land, roads toward fog
reveal land, quests reveal points of interest, and the Premium Scout Report
reveals fog for money as satire.

---

## 4. Grid / Placement / Occupancy

The square grid is the logic foundation. Each tile tracks (current fields
first, planned fields marked *):

- grid x/y
- revealed / unrevealed (`cell.unlocked`, fog system)
- terrain type
- road type (+ variant derived from neighbor mask at render time)
- occupied by building (`occupiedBy`)
- walkable / blocked*
- decoration allowed*
- monster / fog / resource marker*

Placement rules:
- Buildings and roads snap to the grid; footprints reserve tiles.
- Buildings cannot overlap roads and vice versa.
- Props must not spawn on roads or block building entrances.
- Delete/demolish frees occupancy (section 6).
- Fogged land is not buildable.

---

## 5. Roads

Roads are central gameplay: they provide building access, guide heroes and
(future) service walkers, and are the town's visual skeleton.

Types: **Dirt** (cheap), **Stone** (faster movement, more reliable service),
**Premium Gold** (fast, shiny, corrupting: -trust +corruption on placement).

Rendering requirements (mostly met, keep true):
- Clean connections, no overlap seams, no donut holes in 2x2+ blocks.
- Keep clear of props; match the angled building style.
- Buildings connect via doorstep/entrance connectors.

Visual variant set to grow toward: straight A/B, corner, T-junction,
crossroad, plaza/fill, entrance connector, edge blend, dirtā†’stone and
stoneā†’premium transitions. (Autotile mask logic in
`src/systems/roadRenderer.js` already distinguishes these cases; art can be
attached per-variant later.)

Gameplay now: buildings without road access function poorly or not at all
(`roadRequired` + `getBuildingRoadAccess`).

Future: roadblocks/gates/queue ropes to steer walkers, route overlay, road
access overlay.

---

## 6. Delete / Remove / Demolish System

The player must be able to remove mistakes.

Tools: Delete Road (implemented 2026-07), Remove Decoration, Demolish
Building, Cancel Build Mode (implemented).

**Road deletion (implemented):**
- Allowed only on tiles with a road and no building.
- Refunds 50% of the road cost.
- Updates grid occupancy and re-runs the neighbor-mask autotile redraw.
- Warns when a placed building just lost its last road access.
- Cannot delete under building footprints (footprint tiles never hold roads).

**Decoration removal (planned):** currently decorations are auto-placed town
locations, not player-placed, so there is nothing player-removable yet. When
player-placed decor ships, removal frees the tile with small/no refund.

**Building demolition (planned, deliberately deferred):** buildings carry a
lot of live bookkeeping (sprites, labels, hit zones, door spots, hero
walk targets, runtime state). Safe implementation needs a single
`unrenderBuilding(id)` teardown mirroring `renderBuilding`. Rules when built:
- Non-core buildings: confirm dialog ā†’ free footprint, partial refund,
  log event with consequences.
- Core protected: **Guild Hall** not deletable; **Dungeon Gate** not
  deletable while quests depend on it; **Golden Whale** should be *closable*
  rather than deletable (too many systems reference it).
- Close/Reopen alternative: closed buildings stop functioning, reduce
  upkeep/corruption, may anger heroes. Inspector gets Close / Reopen /
  Demolish actions.

All destructive actions need confirmation (mobile-safe, like the two-tap
Reset).

---

## 7. Service Walkers (planned)

Inspired by Caesar 3: buildings should not magically serve the whole map.
Service buildings periodically send a walker from their entrance along roads
with limited range; heroes/buildings near the route receive the service.

| Building | Walker | Service |
| --- | --- | --- |
| Tavern | Tavern Keeper | morale/beds advertising |
| Blacksmith | Gear Runner | gear quality |
| Potion Shop | Potion Seller | potions/recovery |
| Guild Hall | Quest Clerk | quest access |
| Debt Office | Debt Collector | debt pressure |
| Golden Whale | Premium Evangelist | premium offers, envy |
| RNGesus Shrine | Drop Priest | RNG blessings |
| Watchtower | Patrol Guard | safety |
| Market | Merchant | goods/gold |

Rules: start at entrance, follow roads only, limited range, quality scales
with road type, no road access = no walker. Roadblocks steer routes later.
Reuse the existing hero walk/path system (`buildGridRoadRoute`) for walker
movement ā€” do not build a second pathing system.

---

## 8. Hero Lodging / Capacity

Rest buildings: Campfire (starter), Tavern, Inn, Hero Hostel, Premium Lodge,
Whale Suite (future).

Each tracks: slots/beds, rest quality, price policy, morale recovery,
corruption/trust impact, usageCount, upgrade progress (runtime state already
exists per building: capacity/serviceQuality/usageCount/upgradeProgress).

Rules:
- No beds ā†’ heroes sleep outside, complain, lose morale, eventually leave.
- More rest buildings = more hero capacity.
- Premium lodging = better rest + envy/corruption.
- Hero Hostel = many cheap slots, lower morale.
- Premium Lodge = whales love it, honest heroes resent it.

---

## 9. Hero Needs (planned expansion)

Needs by tier/personality: bed, food/ale, gear, potions, training, quest
access, morale, fairness, safety, premium access (whale types), status/fame.

Hero types already in data: Honest Grinder, Rookie/Broke Optimist, Veteran,
Noble Whale, Debt Goblin, Sponsored Hero, Ragequitter, Refund Seeker, Guild
Clerk worker types, and more in `src/data/heroes.js` / `npcs.js`.

Needs should drive: morale, loyalty, envy, quest success, leaving town,
protests, premium purchases, monster defense. Today a subset exists
(morale/loyalty/envy/resentment/debt); formalize need satisfaction from
services rather than flat building levels.

---

## 10. Production Chains (planned, keep simple)

Readable early-game chains only:

- Wood ā†’ Beds ā†’ Hero capacity
- Iron ā†’ Swords/Gear ā†’ Quest success
- Herbs ā†’ Potions ā†’ Injury recovery
- Loot ā†’ Market ā†’ Gold
- Gold ā†’ Buildings ā†’ Growth
- Whale Tokens ā†’ Premium Items ā†’ Power + Envy
- Shame Coins ā†’ Shady Upgrades ā†’ Corruption
- Contracts ā†’ Debt Income ā†’ Corruption/Resentment
- Faith/RNG ā†’ Blessings ā†’ Loot chance / pity-timer jokes

Rule: a chain must be explainable in one sentence in the building inspector.
Do not overcomplicate the early game; resources can start as abstract
per-building stock (the potion shop already has `stock`).

---

## 11. Buildings and Categories

Build menu categories (target; current menu covers 8 of these 10):

1. Roads
2. Housing & Rest ā€” Campfire, Tavern, Inn, Hero Hostel, Premium Lodge, Whale Suite
3. Guild Services ā€” Guild Hall, Notice Board, Quest Office, Mission Cartographer, Scout Post
4. Shops & Supply ā€” Market, Blacksmith, Potion Shop, Provision House, Loot Warehouse, Gem Exchange
5. Training & Combat ā€” Training Yard, Mentor Hall, Arena, Archery Range, Hero Barracks
6. Defense ā€” Watchtower, Guard Post, Monster Warning Bell, Wall Gate, Trapmaker
7. Premium Nonsense ā€” Golden Whale Milking Station, Lootbox Kiosk, VIP Lounge, Refund Denial Desk, Convenience Bureau, Starter Pack Warehouse, Queue Skip Office, Premium Temple
8. Public Order ā€” Complaint Barrel, Hero Union Tent, Balance Memorial, Audit Office, Burnout Clinic
9. Faith & RNGesus ā€” RNGesus Shrine, Pity Timer Chapel, Blessed Drop Altar, Sacred Banner Pull, Probability Confessional
10. Decor ā€” trees, rocks, benches, lamps, fences, signs, statues, banners, flower patches, coin piles

Art already exists for RNGesus Shrine and Pity Timer Chapel
(`building_rngesus_shrine.png`, `building_pity_chapel.png`) ā€” wire them into
the catalog when the Faith category ships. Add new buildings via
`src/data/buildingCatalog.js` (cost/footprint/effects/actions) so content
additions stay data-driven.

---

## 12. Building Usage and Evolution

Buildings improve through use. Tracked per building (exists): visitors,
usageCount, serviceQuality, level, stock, capacity, road access,
upgradeProgress.

Rules: more use ā†’ upgrade progress ā†’ upgrade available; heavy use adds
visual flair (the upgrade-visual container system already exists). Adjacent
same-type buildings can grant district bonuses later.

Flavor targets: Tavern gains lanterns/rooms, Blacksmith glows when busy,
Market gains stalls, Golden Whale gains VIP nonsense, Watchtower gains
banners/fire, RNGesus Shrine gets more ridiculous after many bad rolls.

---

## 13. Fog of War / Exploration (implemented 2026-07)

- Large map exists from the start; only the starting clearing is revealed.
- Unrevealed tiles are dark/fogged (depth-tinted, mist blobs, soft frontier
  skirts) and not buildable.
- Reveal sources: roads (r2), new buildings (r4), Watchtower (r7, +1 per
  level), hero expeditions (r3 at the frontier they walk to), Premium Scout
  Report (r5, 150g, +3 corruption ā€” "The fog lifted after being monetized.").
- Revealed tiles stay revealed; state persists in `cityBuilder.revealed`;
  pre-fog saves migrate purchased zones exactly.

Planned discovery content in fog: monster camps, resource nodes, ruins,
premium relic sites, NPC arrivals, loot caves, wild RNGesus shrines. Scout
Post building as a dedicated revealer.

---

## 14. Monsters and Threat

Threat sources: dungeon activity, map expansion, ignored monster camps,
corruption, town size, poor defenses.

Monster roster exists (16 sprites): goblin raider, skeleton, slime, bat,
debt wraith, refund ghost, premium goblin, loot mimic, queue demon, audit
imp, rat, mushroom, spider, bandit, wolf, coin golem.

Planned monster-camp flow: heroes explore ā†’ discover camp in fog ā†’ player
chooses attack/ignore ā†’ threat rises if ignored ā†’ camps raid districts ā†’
watchtowers/guards reduce damage ā†’ heroes defend. Camp flavor sites: Goblin
Camp, Skeleton Ruins, Slime Pit, Debt Wraith Nest, Refund Ghost House, Loot
Mimic Cave, Audit Imp Bureau.

---

## 15. Pay-to-Win Satire Systems

The unique hook. All fictional, in-game only ā€” no real payments, accounts,
or checkout, ever.

Existing: Whale Tokens, Shame Coins, Premium Dust (items), Golden Whale
premium shop actions, Lootbox Kiosk, Mystery Chest, Queue Skip, Revive
Insurance, Premium Scout Report, Fake Odds Flyer, "Optional" Convenience
Bundle.

Planned: Guild Pass (battle pass satire), Daily Tribute, limited-time
offers, Starter Pack that only appears *after* the start, Best Value Bundle,
Pity Timer mechanics.

Systemic effects: premium gives power fast, raises corruption, lowers trust,
creates envy and item conflict; the town can become rich but unstable.

---

## 16. Envy / Item Conflict

Heroes who use pay-to-win gain power/fame/premium items/whale tier ā€” and
generate envy. Other heroes become resentful, may steal/swap/destroy premium
items, protest, leave, or become anti-whale heroes.

Item conflict resolution (partially implemented via envy/resentment stats and
item `canBeStolen`/`destroyChance`): ~50% the item changes owner, ~50% it is
destroyed; morale/trust/corruption update; the town log records the drama.
Canonical tone: "Premium Knees were destroyed during a balance discussion."

---

## 17. RNGesus Faith

Satirical RNG religion layered into events, NPC barks, premium buildings,
lootbox outcomes, and day reports.

Buildings/flavor: RNGesus Shrine, Pity Timer Chapel, Blessed Drop Altar,
Sacred Banner Pull, Probability Confessional, lootbox prayers, bad-roll
rituals, fake luck blessings.

Tone: cringe, satirical, funny ā€” never hateful, never referencing real
religions or real gambling brands.

---

## 18. City Overlays / Advisors (planned)

Overlays: Road Access, Beds, Morale, Corruption, Threat, Hero Appeal,
Service Coverage, Envy, Fog/Exploration, Monster Risk, Premium Dependency.

Advisor reports (extend the existing Day Report/Town Ledger panels): Guild
Clerk Report, Debt Office Report, Hero Morale Report, Threat Report, Premium
Economy Report, RNGesus Omens, Public Order Report.

Purpose: stats must have understandable causes. Overlays answer "why is this
number moving" visually; advisors answer it verbally.

---

## 19. Stat Logic

- **Gold**: quests, trade, taxes, services, premium exploitation, loot.
- **Trust**: fair prices, successful quests, safety, honest services, debt
  forgiveness.
- **Corruption**: premium actions, lootboxes, fake odds, debt abuse,
  convenience fees.
- **Morale**: beds, tavern, potions, victories, fair treatment, safety.
- **Threat**: map expansion, monsters, dungeon activity, poor defense,
  corruption.
- **Hero Appeal** (planned): beds, safety, services, low corruption, roads,
  fairness ā€” drives hero arrival rate.
- **Whale Dependency** (planned): share of income from premium sources ā€”
  high dependency makes the economy fragile.

Every stat change should be visible: float text at the source, ticker line,
and/or town log entry.

---

## 20. UI Direction

Game-like, readable, pixel/fantasy themed ā€” never debug/admin/SaaS.

- Build menu: categories, item cards, stable scroll, detail pane, no list
  jumping, lock reasons, built status, clear cost/effects. (Current menu
  meets this; keep polishing card visuals.)
- Top HUD: clean stat cards, readable warnings, no overlap.
- Bottom bar: grouped controls ā€” Build / Roads / **Delete** / time controls /
  Skip Day; mobile-safe.
- Panels (inspector, town ledger, day report, build menu, premium shop, hero
  sheet): closable, scrollable, mobile-safe, never permanently covering the
  game.
- Zoom: HUD text is screen-fixed (separate UI scene); map labels may
  scale/hide with zoom.

---

## 21. Mobile Direction

Requirements (largely implemented 2026-07): touch pan, pinch + zoom buttons,
large tap targets (~44px physical), bottom-sheet build menu, compact HUD with
More menu, scrollable panels, two-tap reset confirmation, reduced labels, no
page scroll, no tiny buttons. Constants centralized in
`src/ui/responsive.js` ā€” do not scatter mobile magic numbers.

---

## 22. PixelLab Asset Rules

Every future prompt must ask for:
- **isometric / angled fantasy city-builder pixel art** (never generic
  top-down for buildings/roads),
- transparent background (buildings/items/objects), clean outline, grounded
  base/shadow, readable at small scale, consistent palette,
- no text unless requested, no watermark, no real-money symbols.

Proven workflow: numbered multi-object descriptions in one
`create_1_direction_object` call (4x160px buildings ā‰ 25 gens; 16x64px
props/items ā‰ 20 gens), contact-sheet review, `select_object_frames` keepers.
See the reference prompt in VISUAL_DIRECTION.md.

Priority asset needs: isometric road pieces, foundations, terrain blends,
fog edges, UI panels/buttons, RNGesus set, monster camps. Terrain fills via
`create_tiles_pro` must avoid baked tile-edge borders/curbs (they seam).

---

## 23. Implementation Order

1. ~~Clean starting layout (one straight road)~~ ā€” done 2026-07
2. ~~Delete/remove tool foundation (roads)~~ ā€” done 2026-07
3. Road access reliability + access overlay
4. Isometric road piece art pass (replace rectangular fills)
5. ~~Fog of war instead of buy-extension~~ ā€” done 2026-07
6. Tavern beds / hero capacity as a real constraint
7. Service walkers (section 7)
8. Hero needs (section 9)
9. Simple production chains (section 10)
10. Monster camps / fog discovery content
11. Building usage evolution visuals
12. Pay-to-win envy/item conflict expansion
13. RNGesus faith systems + Faith build category
14. Advisors/overlays
15. Building demolition + close/reopen (section 6)
16. Mobile polish round 2, then more buildings/content

Rule of thumb for every pass: pick the highest item that is safe, keep saves
compatible, update this plan when reality changes.

---

## Extraction & Frontier Loop (implemented 2026-07)

Config lives in `src/systems/extraction.js`; runtime in TownScene. See
[INSPIRATION_SYSTEMS.md](INSPIRATION_SYSTEMS.md) for the loop diagram.

Core loop: **explore → discover node → secure area → build extraction camp →
connect road → carriers transport goods → Storehouse stores them → town
buildings consume them → attract better heroes → expand farther → bigger
hazards.**

- **Resource nodes**: every resource POI has runtime state (finite amount,
  regen, danger, surveyed/access/gatherer). Inspector actions: Survey,
  Establish Access, Assign Gatherer, Collect, Abandon. Persisted in
  `save.resourceNodes`.
- **Extraction buildings** (Frontier & Supply build category): lumber_camp,
  mining_camp, herbalist_hut, salvage_camp (extract a matching resource from a
  node within `EXTRACTION_RANGE_TILES`), storehouse (storage caps + delivery
  target), frontier_outpost (territory anchor + reveal). All reuse existing
  node/prop art — no new PixelLab assets.
- **Carriers**: `spawnCarrier` reuses the walker/animation system; delivers a
  node's `pending` package to the nearest Storehouse/Market/Guild Hall and
  credits `townInventory` on arrival.
- **Storage**: `getStorageCap(resource)` = base + storehouse levels; STORED
  resources (wood/iron/herbs/loot) are capped, outputs (gold/potions/gear)
  are not. Full storage pauses extraction (surfaced in advisor + Town Stores).
- **Territory**: `getTerritoryAnchors` / `isInTerritory`; `getEffectiveBuildCost`
  applies `FRONTIER_BUILD_SURCHARGE` outside territory (frontier toolkit
  exempt).
- **Forest**: `forestBlockedCells` block building; `harvestForestFromCamps`
  moves cells into `harvestedForestCells` (persisted, with regrow day);
  `regrowForest` restores them. `redrawWildernessDressing` skips harvested
  cells.
- **Save/load**: `resourceNodes`, `harvestedForest`, and hero
  `gatheringNodeId` persist; old saves hydrate safe defaults from
  `POI_RESOURCE_YIELDS`.

Next candidates: road-quality transport speed, depletion-driven camp
relocation, cursed-forest POIs, and per-district storage.

---

## Production, Supply, And Rank Loop (implemented 2026-07)

Canonical loop:

**Raw resources -> transport -> storage -> processing -> finished goods ->
hero supply -> quests and exploration -> reputation and town rank -> stronger
heroes and larger threats -> expanded production and districts.**

- `src/systems/production.js` is the canonical data source for the 12-item
  inventory, recipes, priorities, trade prices, equipment quality, and six
  Town Ranks. `townEconomy.js` retains walkers, beds, and POI yields.
- Raw stock: wood, iron, herbs, loot, premium salvage. Finished stock:
  planks, tools, weapons, armor, potions, trade goods, premium components.
- Producers: Sawmill, Workshop, Blacksmith, Potion Shop, Salvage Yard,
  Market, and Premium Fabricator. A producer keeps one selected recipe,
  progress, priority, pause state, completed batches, and an output buffer.
- Goods wait in the producer output buffer until a visible carrier can reach
  a Warehouse, Storehouse, Market, or Guild Hall. Finished storage comes from
  Warehouses; raw storage remains the Storehouse's main job.
- Heroes have simple weapon/armor quality, carried potions, and readiness.
  The Guild Hall can equip one hero or distribute available supplies. This is
  intentionally not an RPG inventory grid.
- Production batches improve building efficiency and upgrade progress.
  Later upgrades also require a small amount of planks/tools, making the
  processed economy useful without blocking the first upgrade.
- Commercial, Industrial, and Frontier districts join the existing Rest,
  Defense, Premium, and Civic districts. District identity is inferred from
  nearby contributing buildings; there is no zone-painting UI.
- External trade uses a preferred export and minimum reserve. Prices are
  stable and deliberately simple. Imports are available at bad prices.
- Town Rank is a computed score using reputation, prestige, heroes, quests,
  production, beds, safety, revealed territory, and trust/corruption balance.
  Rank gates production buildings and stronger hero arrivals.
- Production incidents are low-frequency, system-linked consequences and are
  recorded in the town log/week report.

Planned, not implemented: furniture/remedies as extra goods, per-carrier
manual route editing, a full worker job market, production graphs, and a
real-time external commodity simulation.
