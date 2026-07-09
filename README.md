# Golden Whale Guild

A cozy pixel fantasy management game - run a small adventurer town where NPC
heroes drink, train, take quests, and some *unfairly* use the Golden Whale
Milking Station. A satire of pay-to-win economies, using only fictional
fantasy gold/tokens. No real money, no backend, no accounts, no real payments.

Live URL placeholder: https://lohetapja.github.io/golden-whale-guild/

## Run locally

```sh
npm install
npm run dev
```

Open the printed local URL.

On Windows PowerShell, if script execution policy blocks `npm`, use:

```sh
npm.cmd run dev
```

## How to play

The first session is guided by small in-game hints, not a long tutorial. If you
skip them, use **Help** to reopen the short rules.

1. Open **Roads** and extend the dirt entrance, then use **Build** to place a
   service beside it. Buildings snap to the grid and require road access.
2. Click the Guild Camp / Notice Board and post a quest.
3. Let the town clock run at 1x, 2x, or 4x, or press **Skip Day** to resolve
   hero actions, quest results, town nonsense, and consequences immediately.
4. Use **Town Ledger** to compare upgrades. Fair buildings stabilize Trust and
   Morale; Golden Whale upgrades pay faster and make the town worse in funnier
   ways.
5. Click NPC heroes to inspect power, inventory, morale, debt, loyalty, whale
   access, envy, resentment, history, and their current thought.
6. Watch Gold, Trust, Corruption, Morale, and Threat. Warning icons mean the
   town is drifting toward protests, scandals, ragequits, or dungeon visits.

- Click buildings for tooltips.
- Click buildings or special locations to open the fixed inspector panel.
- Use the compact **Upgrade** action in the inspector to spend fictional gold
  on a building improvement. Upgrades change both effects and placeholder
  visuals.
- Tap/click NPC heroes to inspect power, morale, debt, loyalty, whale access,
  resentment, fame, current action, recent history, and their latest suspicious
  thought.
- Click the small quest marker near the Guild Hall / Notice Board to review and
  post bounty quests in the inspector. Posted quests resolve during the next
  town cycle.
- Open **Town Ledger** to compare all upgradeable buildings and special
  locations in one in-game planning board.
- Read the compact **Day Report** after each town cycle to see resource deltas,
  quest results, unlocks, warnings, NPC changes, and suspicious accountant
  notes.
- Use **Town Log** to review important past upgrades, stage changes, quest
  results, policies, crises, unlocks, and hero spirals.
- Press **Skip Day** (bottom right) to run the daily simulation immediately -
  otherwise the real-time clock advances it automatically. Watch the
  resource bar (Gold / Trust / Corruption / Morale / Threat) and the event
  ticker at the bottom.
- Drag the map with mouse/touch, or use WASD/arrow keys on desktop.
- Use the small **Save** / **Reset** buttons for localStorage-only browser
  saves. Reset requires a second tap and clears local browser progress. No
  backend, accounts, or real payments are involved.

## Current gameplay loop

Start with mostly empty land, place grid roads and connected buildings, earn
fictional gold, and choose between fair infrastructure and faster Golden Whale
profits. Tavern capacity limits population growth, buildings track visits and
organic upgrade progress, and larger towns attract more Threat. Trust,
Corruption, Morale, and Threat affect hero behaviour, quest results, protests,
debt events, item envy, and town attacks.

Current features include responsive browser play, first-time onboarding, compact
Help, resource explainers, early objective chains, quest posting, building
upgrades, Town Ledger, fixed inspector panels, evolving NPCs, policy choices,
soft crises, town identity labels, local achievement toasts, and a capped Town
Log.

The build catalog also includes unlockable Inns, Hero Hostels, Potion Shops,
Watchtowers, Mentor Halls, an Arena, a Bank / Debt Office, VIP Lounge, Premium
Lodge, Lootbox Kiosk, Gem Exchange, and Convenience Office. Their compact
inspector actions can change resources, hero stats, debt, capacity, service
quality, premium items, and town stability once per cycle.

The town now has a stronger progression arc: staged growth from **Garage
Guild** toward **Premium Kingdom Problem**, unlockable locations, soft crises,
achievement-style milestones, policy choices every few cycles, and a local Town
Log that remembers the important disasters.

NPC heroes now keep short personal histories and can drift into new statuses
such as Protest Leader, Debt Spiral, Whale Champion, Mentor, Contract Victim,
or Left Town based on what the economy does to them. Heroes can also form light
rivalries or mentorships when the town economy makes someone impossible to
ignore.

Local saves include versioned progression state, placed roads/buildings,
unlocked land, building usage, simulation speed, building levels, objectives,
town log entries, crises, achievements, and NPC evolution/inventory data. Older
saves load as legacy pre-built towns; new/reset saves use city-builder mode.

The canvas uses Phaser Scale Manager `FIT` mode against a stable 1280x720
logical game size, with mobile-safe page CSS to prevent accidental scrolling
while playing.

## Build

```sh
npm run build
```

Outputs a static site to `dist/`.

Windows PowerShell fallback:

```sh
npm.cmd run build
```

## GitHub Pages

The Vite base path is configured for this repository:

```js
base: '/golden-whale-guild/'
```

Pushes to `main` run the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which builds the game and deploys `dist/` to
GitHub Pages.

## Tech

Phaser 3 + Vite, plain JavaScript, 1280x720 canvas. The game is map-first with
minimal UI: top resources, compact goal hints, fixed inspector panel, Town
Ledger, bottom ticker, and no dashboard.

PixelLab sprites in `public/assets/**` are routed through
`src/data/assetManifest.js`; runtime-generated placeholder/debug art remains as
a fallback when an asset is missing. See `docs/VISUAL_DIRECTION.md` and
`docs/ASSET_STYLE_GUIDE.md` for the art direction and replacement rules.
