# PixelLab Generation Report

## 2026-07 Roads, Monsters, Buildings, and Writing Pass

Starting balance: **1266 used / 733 remaining**. Verified checkpoint after
reviewed road, monster, lair, remains, building, and tier jobs:
**1569 used / 430 remaining**, or **303 actual generations consumed**. Later
animation completions may increase the final number; the final checkpoint below
is authoritative.

Completed and integrated:

- 48 road masks: 16 dirt, 16 stone, 16 restrained premium stone.
- 8 monster actors, 8 typed remains, and 8 family lair/source objects.
- 6 functional L1 buildings, 6 separate catalog previews, 6 L2 states, and
  6 L3 states.
- Recovered Golden Whale, VIP Lounge, Convenience Office, and Gem Exchange
  replacements from the prior unfinished PixelLab queue.
- Real cardinal monster sheets are imported through
  `scripts/pack-pixellab-monster-animations.ps1`; unfinished action jobs stay
  documented instead of being represented by fake motion.

Rejected:

- 2 generated building-preview candidates: nearly black and unreadable.
- 4 malformed stone-road candidates: exact missing masks were derived by
  lossless mirror/rotation from accepted family members.
- No unrelated decorative rerolls were accepted.

Final balance after submissions: **1758 used / 241 remaining**, or **492 actual
generations consumed** from the 1266 baseline. This is inside the requested
preferred 350-500 range, so generation stopped.

Approximate category attribution from job-returned costs (the 490 balance delta
is authoritative): roads 60; functional buildings and L2/L3 states 122;
monster actors, lairs, and remains 154; monster animation work 156. The final
Paywall Troll attack retry completed and was packed; no selected PixelLab jobs
remain in flight.

Writing coverage is code-generated and separately verified: 38 functional
building pools contain 735 contextual entries (minimum 19 per building), and
the 8 new monster families contain 96 family-specific entries. A 40-roll check
reported zero immediate repeats.

Live accounting for the breadth-first isometric asset production pass.
Generations are only counted as consumed when verified against `get_balance`.

## Balance

| Checkpoint | generations_remaining | generations_used | consumed since start |
| --- | --- | --- | --- |
| Pass start | 1277 | 722 | 0 |
| After mandatory + core buildings | 1103 | 896 | 174 |
| Session checkpoint (end) | 1099 | 900 | 178 |

## Continuation pass (target: generations_used >= 1372)

Continuation start: used 900 / remaining 1099. Hard target: **used >= 1372**.
(Billing lags job completion by a few minutes; track by later `get_balance`.)

### Buildings generated + downloaded to canonical `building_*.png` (this continuation)
inn `0f56108d`, training_yard `b84ccbfe`, sawmill `08c2630b`, lumber_camp
`da2ef499`, mining_camp `9bfc370f`, herbalist_hut `17e4f6b5`, salvage_camp
`9e5ef727`, guard_post `e7adc639`, premium_temple `977a49c6`, premium_lodge
`5c8652f4`, vip_lounge `b5bd10da`, golden_whale `3ec9681e`.
Catalog repointed: lumber/mining/herbalist/salvage camps + sawmill now use their
own `building_*` art instead of reused resource-node art.

### Building animations queued (v3; download frames from `objects` endpoint)
training_yard `b84ccbfe`, blacksmith `f4611c29`, golden_whale `3ec9681e`,
tavern `6034dd72`, potion_shop `0036963f`.

### Next categories in queue
scout_post + lootbox/dungeon buildings; road tiles (dirt/stone/premium); more
building animations; hero/worker/carrier + monster animations; resources/cargo/
POIs; decor; UI icons.

Cost note: at 160–176px, `create_map_object` and `create_object_state` average
~6–7 generations each (the pilot's 32px-equivalent estimate of 1/job did not
hold at building sizes). Budget math uses measured balance deltas, not per-job
guesses.

Throughput note: early jobs completed in 30–90s. Mid-pass the PixelLab queue
backed up and ETAs rose to ~450s/job (5–8× slower), which is the main pacing
constraint on reaching the full 650 in a single session.

## Pipeline (proven end-to-end)

1. `create_map_object` (basic, `low top-down`/`high top-down`, transparent bg) →
   proper 2-sided isometric buildings. `create_object_state` → coherent upgrade
   tiers from a chosen base (keeps the building recognisable as it grows).
2. Review returned images at game scale; reject failures.
3. `scripts/pixellab-download.sh` (public download URLs, no auth) writes PNGs to
   `public/assets/**`. State objects use the `objects` endpoint; base objects use
   `map-objects`.
4. Wire into `src/data/assetManifest.js`; buildings resolve level art via
   `buildingTexture()` in `src/assets.js`.

## Integrated this session (downloaded + wired + build-verified + rendered)

### Mandatory buildings — 3 tiers each
- **Storehouse**: L1 `cc7b4fd8`, L2 `3f4aad83`, L3 `52b1c827` (state)
- **Warehouse**: L1 `64c72ded`, L2 `683369eb`, L3 `e021dcac` (state)
- **Premium Fabricator**: L1 `74bf0985`, L2 `62f02b66` (state), L3 `85cd79c8` (state)
- Fabricator alt `e4084238` (kept as alternate), `706b0be8` rejected (reads as a house)

### Core buildings (canonical art replaced with coherent isometric versions)
- **Guild Hall** `fc293849`, **Tavern** `6034dd72`, **Market** `050dad86`,
  **Blacksmith** `f4611c29` — all live in the starting town, verified rendering.
- Core L2 upgrade states in flight: guildhall `1ea20832`, tavern `bb95dd3f`,
  market `734b5552`, blacksmith `d3928e5f`.

### In flight (queued, will download on completion)
- Buildings: potion shop `0036963f`, watchtower `250d4852`, hero hostel
  `2f5d5683`, frontier outpost `4b72f53c`. Sawmill rate-limited (retry pending).

## Engineering integration
- `src/assets.js` `buildingTexture()` now resolves `${assetKey}_l{level}` →
  base → placeholder (never an unrelated building). Capped at tier 3 art.
- Upgrade handler swaps the sprite texture + rescales hitbox on level-up.
- `src/data/assetManifest.js`: added level-tier entries for storehouse,
  warehouse, premium fabricator, and core-building `_l2` slots.
- Verified: build passes; test-key game boots RUNNING; placed buildings use the
  new textures; no console errors; **production save key untouched**.

## Running tally by category

| Category | Jobs submitted | Completed | Failed/queued | Integrated | Rejected |
| --- | --- | --- | --- | --- | --- |
| Mandatory buildings + tiers | 14 | 14 | 0 | 12 | 2 (1 rej, 1 alt) |
| Core buildings + upgrade states | 8 | 4 | 4 queued | 4 | 0 |
| Other buildings (cat 1/2) | 5 | 0 | 5 queued/limited | 0 | 0 |
| Roads | 0 | 0 | 0 | 0 | 0 |
| Animations | 0 | 0 | 0 | 0 | 0 |
| Props / heroes / UI | 0 | 0 | 0 | 0 | 0 |
| **Total (≈174 generations)** | **27** | **18** | **9** | **16** | **2** |

## Remaining budget (breadth-first plan, ~476 generations to reach 650)

Per the agreed allocation, still to do across follow-up work:
category 1 remaining tiers, category 2 landmarks/premium (Golden Whale, Premium
Temple, Lodge, VIP Lounge, Training Yard, extraction camps), category 3 roads
(dirt/stone/premium adjacency + transitions), category 4 building animations,
category 5 hero/worker/carrier/monster animations, category 6 resources/POIs,
category 7 decor/props, category 8 UI, category 9 retries.

Blocker note: not a hard failure — PixelLab remains available — but queue
throughput (~450s/job) plus single-session context limits mean the full 650 is a
multi-session effort. This report is the durable continuation point.

### Progress log (continuation, rolling)
- Buildings integrated (canonical + catalog repoint): inn, training_yard, sawmill,
  lumber/mining/herbalist/salvage camps, guard_post, premium_temple, premium_lodge,
  vip_lounge, golden_whale — all verified loading in test-key browser, no errors.
- Building animation frames downloaded to public/assets/animations/buildings/:
  blacksmith_active (5), golden_whale_idle (5), tavern_active (9). More queued:
  storehouse (fd1e7502), premium_fabricator (f4180b4b), potion_shop, training_yard.
- Road iso tiles staged (public/assets/roads/{dirt,stone,premium}/*_iso.png). NOTE:
  world road renderer crops SQUARE textures (tile_road_*); iso diamond tiles don't
  drop in, so roads are generated+staged, not swapped into the autotiler (deferred).
- Cargo: cargo_loot_chest.png downloaded (public/assets/objects/cargo/). ore crate +
  log bundle in flight.
- Balance at ~933 used (billing lags completion by minutes; target 1372).

### Rolling tally (continuation, updated)
- Balance: 948 used / 1051 remaining (billing lags; target 1372).
- Buildings integrated: 12 (camps repointed + landmarks) + earlier mandatory/core.
- Building animations downloaded (frames in public/assets/animations/buildings/):
  blacksmith(5), golden_whale(5), tavern(9), potion_shop(9), training_yard(5),
  storehouse(9), fabricator(9) = 7 buildings. warehouse + herbalist in flight.
- Resource nodes regenerated (overwrote placeholders): resource_wood_grove,
  resource_iron_outcrop, resource_herb_patch.
- Cargo: cargo_loot_chest, cargo_ore_crate, cargo_log_bundle (public/assets/objects/cargo/).
- POIs: poi_goblin_camp, poi_skeleton_ruins, poi_loot_cave (public/assets/objects/).
- Decor: decor_market_stall.
- Road iso tiles staged (dirt/stone/premium) — not swapped into square-crop autotiler.
- Characters (v3, 8-dir) in flight: wood_carrier faac613c, ore_carrier 303833ee,
  quest_clerk 2232cbd1, guard_patrol d95984e5 — animate on completion.
- ~101 asset PNGs added/modified this pass. Build passing; prod save untouched.
- CONTINUATION STRATEGY: loop fire→long-wait→bulk-download across categories;
  expensive char/monster animations to drive budget toward 1372. Trackers in
  scratchpad gwg_inflight.tsv. Not stopping — throughput is slow, not blocked.

### Art-direction reworks (2nd continuation — richer/functional per feedback)
The newer simple/bright/icon-like buildings were reworked toward the older
detailed, grounded, functional style (high detail + detailed shading + richer
functional prompts). Integrated at canonical paths (overwrote the simple ones),
verified loading in test-key browser (no errors, prod save untouched):
- Premium Lodge 15c7cc11 — now a warm timber+stone guesthouse (dormers, porch,
  balcony, glowing windows). Reads as premium lodging.
- Sawmill a96dccd0 — now a real timber mill (water wheel, saw platform, plank/log
  stacks, ramp). Reads as wood processing.
- Inn 19376ef2 — detailed half-timbered 2.5-storey inn (dormers, sign, chimney
  smoke, barrels, ivy). Reads as cozy lodging.
- Salvage Yard a10dbeeb — gritty scrapyard (scrap piles, sorting workshop, crane,
  forge). Reads as reclamation. Catalog salvage_yard also repointed to this art.
- Balance: 1010 used / 989 remaining (target 1372). Building animation batches +
  worker characters continuing.
- Roads: still procedural+working in-world; iso surface tiles staged only. Safe
  live swap needs seamless SQUARE road textures (renderer crops squares) or a
  sprite autotiler — NOT done, honestly staged/deferred.
