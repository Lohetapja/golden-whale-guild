# PixelLab Generation Report

Live accounting for the breadth-first isometric asset production pass.
Generations are only counted as consumed when verified against `get_balance`.

## Balance

| Checkpoint | generations_remaining | generations_used | consumed since start |
| --- | --- | --- | --- |
| Pass start | 1277 | 722 | 0 |
| After mandatory + core buildings | 1103 | 896 | 174 |
| Session checkpoint (end) | 1099 | 900 | **178** |

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
