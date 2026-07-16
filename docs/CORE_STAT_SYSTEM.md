# Core Stat System — Trust, Corruption, Morale, Threat

Definitions, ranges, sources, effects, and traceability for the four core town
statistics. All four are stored in `resources`, clamped 0–100, and mutated only
through `TownScene.applyDeltas(deltas, meta)` — the single central mutation
point. Every applied change is recorded in `statLedger` (persisted, capped at
120 entries) with `{ day, stat, amount, source }` and surfaced in the Town
Ledger's **Core Statistics** section.

## Shared threshold bands (`getStatTier`)

| Range | Trust | Corruption | Morale | Threat |
| --- | --- | --- | --- | --- |
| 0–19 | Hostile | Clean | Broken | Quiet |
| 20–39 | Distrustful | Compromised | Low | Watched |
| 40–59 | Cautious | Corrupt | Uneasy | Dangerous |
| 60–79 | Trusted | Captured | Motivated | Severe |
| 80–100 | Respected | Premium Institution | Inspired | Critical |

Tiers are the interface for effects and warnings — a one-point change never
silently flips gameplay; band changes do.

## TRUST — starting 66

Confidence that the town and Guild behave fairly, competently, predictably.

**Rises from:** fair building actions (Stock Fair Equipment, Improve Comfort,
Cheap Rest, Forgive Debt, Fair Tournament, Fair Training Grant, escorts),
honest policies, successful rescues/defence, mentor grants.
**Falls from:** premium favouritism (whale bundles, VIP galas, pillow fees),
raised prices, cut maintenance, fake odds, rigged matches, ignored policies,
abandoned heroes, unburied remains fallout.
**Effects (implemented):** unlock gates (Mentor Hall at >60), hero
loyalty/resentment responses to fair vs shady actions, arrival quality via town
reputation inputs, policy option availability.

## CORRUPTION — starting 8

Institutional reliance on unfair, exploitative, or compromised systems.

**Rises from:** every Golden Whale/VIP/lootbox/gem-exchange/debt action (each
premium action carries an explicit corruption delta in its catalog definition —
short-term gold, long-term cost), premium salvage processing, urgent stamps.
**Falls from:** rare cleanup policies and fair-path choices (deltas < 0).
**Effects (implemented):** unlock gates (Bank at >30, Lootbox at >35, Premium
Fabricator requires ≥40), premium monster/event pressure via world danger,
hero envy/resentment reactions, town reputation penalties.

## MORALE — starting 62

Willingness and emotional capacity of the population and heroes to function.

**Rises from:** rest services (taverns/inns/hostels), comfort/supply actions,
victories, treatment, memorial care, fair policies.
**Falls from:** deaths, injuries, failed quests, attacks and damage,
overcrowded/cut-maintenance housing, exclusion actions, shiny disappointment.
**Effects (implemented):** hero recovery and visit routing (low-morale heroes
seek rest services), quest performance inputs, desertion/retirement pressure in
the hero social system.

## THREAT — starting 18

Active hostile pressure against the town — not generic difficulty.

**Rises from:** active/uncleared lairs (lair pressure), raids, urgent-stamp
shortcuts, expansion into dangerous areas, premium activity attracting enemies.
**Falls from:** patrols (Watchtower/Guard Post actions), clearing lairs
(Monster Hunter Lodge pressure suppression + hero hunts), surviving/defeating
raids, alarm responses.
**Effects (implemented):** unlock gates (Watchtower at ≥40 or first attack),
raid probability/composition in `worldDanger`, guard readiness and alerts in
`townDefense`, civilian shelter routing during attacks.

## Traceability rules

- `applyDeltas(deltas, meta)` — pass `meta.source` (e.g. `"Market: Stock Fair
  Equipment"`, `"Policy: <label>"`, `"Crisis: <title>"`). Untagged callers are
  recorded as `"town activity"` rather than dropped.
- The ledger records **post-clamp** amounts, so a change absorbed by the 0/100
  clamp is shown at its real effect size.
- Exploit guards: building actions are once-per-day per action
  (`runtime.actionDays`), upgrade requirements track usage, and the clamp
  prevents runaway accumulation. Save/reload does not reset action cooldowns
  (they persist in building runtime).

## Known limitations (honest)

- Only the highest-traffic call sites are source-tagged so far (building
  actions, policy choices, ignored-policy drift, crises). Remaining
  `applyDeltas` callers (day-cycle drift, quest resolutions, raids) currently
  log as "town activity" — tag them opportunistically when touched.
- Threshold bands are defined and shown in the ledger; only pre-existing
  threshold effects (unlock gates, warnings) consume them so far. New band
  effects should read `getStatTier` rather than raw values.
