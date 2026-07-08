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
- Read the compact **Day Report** after Open Gates to see resource deltas,
  quest results, unlocks, warnings, NPC changes, and suspicious accountant
  notes.
- Use **Town Log** to review important past upgrades, stage changes, quest
  results, policies, crises, unlocks, and hero spirals.
- Press **Open Gates** (bottom right) to run the daily simulation - watch the
  resource bar (Gold / Trust / Corruption / Morale / Threat) and the event
  ticker at the bottom.
- Drag the map with mouse/touch, or use WASD/arrow keys on desktop.
- Use the small **Save** / **Reset** buttons for localStorage-only browser
  saves. Reset requires a second tap and clears local browser progress. No
  backend, accounts, or real payments are involved.

## Current gameplay loop

Earn fictional gold, choose between fair infrastructure upgrades and faster
Golden Whale profits, post safe or risky quests, then open the gates and watch
heroes react. Trust, Corruption, Morale, and Threat now affect hero behaviour,
quest results, protests, debt events, and town attacks.

The town now has a stronger progression arc: staged growth from **Garage
Guild** toward **Premium Kingdom Problem**, unlockable locations, soft crises,
achievement-style milestones, policy choices every few cycles, and a local Town
Log that remembers the important disasters.

NPC heroes now keep short personal histories and can drift into new statuses
such as Protest Leader, Debt Spiral, Whale Champion, Mentor, Contract Victim,
or Left Town based on what the economy does to them. Heroes can also form light
rivalries or mentorships when the town economy makes someone impossible to
ignore.

Local saves include versioned progression state, building levels, unlocked
locations, objectives, town log entries, crises, achievements, and NPC evolution
data. Reset clears that localStorage progress.

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

All current art is runtime-generated placeholder/debug pixel graphics - drop
real sprites into `public/assets/**` at the paths listed in
`src/data/assetManifest.js` and they replace the placeholders automatically.
See `docs/VISUAL_DIRECTION.md` for the art direction and rules.
