# System Functionality Audit

Classification of every player-facing system, based on runtime tracing (not
data existence). Verified 2026-07 against the live game (`?testSave=1`), the
headless suites (`npm run test:save` — 100 checks; `npm run test:buildings` —
431 checks), and a live build-every-building scenario.

Legend: **F** fully functional · **P** partially functional · **C** cosmetic
only · **X** fixed this pass.

## Buildings (38 catalog entries — all verified placeable live)

| Building | Status | Inputs → Outputs / Effect | Notes |
| --- | --- | --- | --- |
| guildhall | F | quests, hero capacity, shelter | unique (maxCount 1) |
| tavern | F | gold → beds, morale recovery | hostel unlock driver |
| blacksmith | F | iron → gear; hero power | workshop shares its art (flagged) |
| training | F | gold → hero power | |
| market | F | loot → gold; trade export hub | auto-export via tradeSettings |
| dungeon | F | quest access, threat control | unique |
| whale | F | gold/corruption engine; scout reveal | unique; all 5 actions carry real deltas |
| inn / hero_hostel / premium_lodge | F | capacity, morale, gold actions | premium_lodge gated Whale L3 |
| potion_shop | F | herbs → potions; recovery | |
| mentor_hall | F | gold → honest hero growth | trust>60 gate verified |
| watchtower / guard_post | F | gold → threat reduction, alerts | defence system hooks |
| arena | F | gold → power, tournaments | stage/power gate |
| bank_debt_office | F | debt engine (hero debt add/reduce/shuffle) | |
| gem_exchange / convenience_office / lootbox_kiosk / vip_lounge | F | premium gold/corruption engines | every action has real deltas |
| roadside_ad_board | C→P | tiny prestige/corruption; classified Decor | honestly labeled decoration |
| lumber/mining/herbalist/salvage camps | F | node → raw resource extraction | placement requires explored node in range (verified live incl. fog gate) |
| storehouse | F | +30 storage/level; carrier target | |
| frontier_outpost | F | territory projection + fog reveal | |
| sawmill | F | wood → planks | |
| workshop | F | planks+iron → tools | **uses blacksmith art** (known gap) |
| salvage_yard | F | loot → trade goods/weapons | **uses salvage_camp art** (known gap) |
| warehouse | F | +35 processed storage; routing | |
| premium_fabricator | F | premium salvage → components + corruption | rank3+corr40 gate |
| infirmary | F | potions → injury-day reduction (2+2/level slots, road-gated) | verified in day-cycle code |
| guard_barracks | F | guard capacity, defence response role | townDefense hooks |
| monster_hunter_lodge | F | reduces highest lair pressure by level | verified |
| gravekeeper_hut | F | lowers worst area danger; memorial care | verified |
| caravan_depot | F | carrier capacity/route reliability role | |
| loot_appraiser | F | loot → tradeGoods (1/appraiser/day) | verified |

Unique rule: `guildhall`, `whale`, `dungeon` are maxCount 1 (asserted in the
building matrix test). Everything else is repeatable (maxCount 99) and scales
by capacity/coverage/production; costs and upkeep are the duplication brake.

## Fixed this pass (X)

- **Catalog asset keys**: guildhall/training/dungeon/whale pointed at
  nonexistent manifest keys (`building_guildhall` etc.); build-menu previews
  and ghosts silently fell back. Repointed to the real art keys.
- **Road tile alignment**: every road stamp was drawn 2px larger than its tile
  (legacy anti-seam padding), overhanging 1px per side and reading as
  misaligned vs the hover diamond. Now exact-size, integer-centered; verified
  0 misaligned across all tiles incl. after save/reload.
- **Core-stat traceability**: `applyDeltas` now records a persisted, sourced
  ledger; Town Ledger shows a Core Statistics section with tier + recent
  causes. See docs/CORE_STAT_SYSTEM.md.

## Other systems

| System | Status | Notes |
| --- | --- | --- |
| Roads (dirt/stone/premium) | F | per-mask art, upgrades replace material + refresh neighbours; movement modifiers in routing |
| Fortifications (walls/gates/towers) | F | see FORTIFICATION_SYSTEM.md; siege/breach verified in prior pass |
| Resources (wood/iron/herbs/loot/premium salvage) | F | source: nodes/quests/monsters; sinks: production/repairs/trade |
| Processed goods (planks/tools/potions/gear/tradeGoods/components) | F | consumed by upgrades, heroes, infirmary, export |
| Carriers / service workers | F | visible transport; delivery credits inventory |
| Heroes (power/morale/debt/loyalty/envy/resentment/health) | F | social system, parties, injuries, deaths, memorials |
| Trust / Corruption / Morale / Threat | F | central mutation + ledger (this pass) |
| Town/area reputation, prestige/rank | F | rank gates production/premium tiers |
| Policies | F | choices + neglect drift both traced in ledger now |
| Quests / monster lairs / raids / aftermath | F | worldDanger + townDefense + aftermath systems |
| Objectives / tutorial | P | early chain functional; full obsolete-objective sweep not yet done this pass |
| Decorations | C | honestly classified; placeable/movable/removable, no fake economy role |
| Inspector actions | F | once-per-day cooldowns; costs deducted once; disabled states carry reasons |

## Known gaps / follow-ups (honest)

1. `workshop` and `salvage_yard` reuse other buildings' art — needs dedicated
   sprites (art gap, not functional).
2. Inspector fallback lines ("no urgent shortage" style) still appear where
   simulation state is thin; the worst offenders live in the ledger row
   builder. Partial cleanup only.
3. Only key `applyDeltas` sites are source-tagged (see CORE_STAT_SYSTEM.md).
4. Full objective sweep, road movement-speed measurement, and the 25-hero
   performance scenario were not exhaustively re-run this pass.
