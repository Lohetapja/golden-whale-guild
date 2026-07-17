# Playtest Balance Report (2026-07, ?testSave=1)

Automated-player playthrough driven through the real browser game (real
placement, quest posting, hero assignment, building actions, policy choices,
day cycles). Telemetry snapshots per played day. Driver:
`public/playtest-driver.js` (test-only; never imported by the game).

## Playthrough shape

- Fresh town → day 9 played fair-mode with telemetry.
- Days 10–37 ran **unattended** (real-time auto-simulation while the tab sat
  open) — an accidental but valuable "total neglect" experiment.
- Day 38 checkpointed; fair branch played to day 49; premium branch replayed
  from the same checkpoint (whale + token packs).

## Key telemetry

| Day | Mode | Gold | Trust | Corr | Morale | Threat | Heroes | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | — | 650 | 66 | 8 | 62 | 18 | 3 | 3 buildings, 3 quests, objective clear |
| 2 | fair | 862 | 67 | 10 | 62 | 24 | 3 | 4 actions (2 posts + 2 assigns) |
| 9 | fair | 3101 | 73 | ~14 | 66 | 52 | 9 | 5 acts / 9 choices |
| 38 | neglected | 1266 | **0** | **84** | ~10 | ~55 | 18 | 28 days unattended |
| 41–49 | fair | 1953→4935 | 0→4 | 84→97 | 1–14 | 42–78 | 18–22 | 2 lairs + 1 raid persist |
| 40 | premium | 2029 | 0 | **100** | 9 | 60 | 17 | whale built, token pack +4 corr (traced) |

## Findings (measured)

1. **Decision density is healthy when systems are alive**: 4–6 actions from
   9–15 available choices every played day (posts, assigns, builds, building
   actions, policies). No played day was skip-only. Early objectives are clear
   and immediately actionable.
2. **Neglect death-spiral (fixed)**: 28 unattended days drove Trust 66→0,
   Corruption 8→84, Morale 62→~10, mostly via per-2-day ignored-policy
   penalties with no cap. FIX: neglect penalties cap at 3 ticks, then the
   policy is shelved (one-time −2 Trust, traced). Ignoring is still punished
   but no longer bottomless.
3. **Corruption ratchet in honest play (fixed)**: danger-quest outcomes carry
   +1–2 corruption; fair play had no sink, so corruption climbed 84→97 over 8
   fair days. FIX: "Honest bookkeeping" — a day with zero premium actions
   decays corruption by 1 (floor 12, traced in ledger). Premium play keeps the
   ratchet; honest towns can recover.
4. **Sell Hero Loot didn't consume loot (fixed)**: loot piled 31→46 while the
   market printed flat gold. FIX: building actions support `consumes`;
   sell_loot now requires and consumes 3 stored loot, with a specific refusal
   message when stock is short.
5. **Quest stat changes untraced (fixed)**: quest outcomes logged as "town
   activity". FIX: tagged `Quest: <name>` / `Quest unstaffed: <name>` —
   verified live (`d40 −1 Quest: Refund Riot Patrol`).
6. **Two live crashes found by playing** (both fixed): extraction inspector and
   `getRoadTransportMultiplier` dereferenced `roadCell.x` when a building is
   road-connected without a specific road cell (gate/territory fallback).
7. **Save-overwrite hazard (fixed with save shield)**: a stale tab reload
   booted a fresh town on the production key and autosaved over an existing
   playthrough. FIX: a fresh boot (no save loaded) refuses to save over an
   existing save whose day > 3; it takes a ring backup and points to the Save
   Manager reset. Verified live (blocked fresh-boot save, allowed normal save).
8. **Trust floor lacks bite**: at Trust 0 the town still fields 20+ heroes and
   wins quests. Retention/contract consequences are too weak — documented as
   an open balance item (no change this pass; needs design decision).
9. **Medical chain rarely self-activates**: potions stayed 0 all game; herbs
   ~0–1. Herb node access requires exploration+camp the automated player only
   sometimes achieved. Needs a nudge (e.g., potion shop stocking from market
   supply) — open item.
10. **Threat oscillates meaningfully** (42→78→42) with raids and patrols, and 2
    discovered lairs kept pressure on for 11+ days — lair clearing is a real
    standing goal. Monster Hunter Lodge gating (rank2) arrives later than the
    pressure does — open pacing item.
11. **Gold is not scarce midgame** (+330–380/day vs occasional 400–800 spends).
    Repeatable guard posts (420g) were affordable daily. Economy tension is
    soft once quests scale — open item; candidate sinks: upkeep, repairs,
    wages.
12. **Premium vs honest is differentiated and traced**: premium = faster gold,
    instant corruption ceiling, named ledger causes; honest = slow trust
    recovery (0→8 over days via fair actions) — now recoverable thanks to
    fixes 2–3.

## Building desirability (from this playthrough)

Built and pulled their weight: guildhall, tavern, market (with real loot sink
now), potion shop, watchtower, guard post (repeat copies while threat >55),
inn, whale (premium branch). Justified but blocked by driver limits: lumber
camp/herbalist (need explored nodes — correct gameplay), infirmary (needs 2+
injured), monster hunter lodge (rank2 gate vs early lair pressure — see #10).
Not reached in 49 days at rank 1: sawmill+, workshop, warehouse, caravan
depot, premium fabricator, arena, mentor hall (rank/stage gates) — consistent
with intended late-game placement, but rank progression speed deserves a look.

## Verification

Build ✓, test:save 100/0 ✓, test:buildings ✓ after every change. Production
save key untouched by the playtest (driver hard-aborts off the test key; the
in-app pane's prod key was damaged by the pre-fix hazard — see finding 7 —
which is exactly what the new save shield prevents).
