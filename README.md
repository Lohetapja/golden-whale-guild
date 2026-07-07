# Golden Whale Guild

A cozy pixel fantasy management game - run a small adventurer town where NPC
heroes drink, train, take quests, and some *unfairly* use the Golden Whale
Milking Station. A satire of pay-to-win economies, using only fictional
fantasy gold. No real money, no backend, no accounts.

Live URL placeholder: https://lohetapja.github.io/golden-whale-guild/

## Run locally

```sh
npm install
npm run dev
```

Open the printed local URL.

- Click buildings for tooltips.
- Press **End Day** (bottom right) to run the daily simulation - watch the
  resource bar (Gold / Trust / Corruption / Morale / Threat) and the event
  ticker at the bottom.

## Build

```sh
npm run build
```

Outputs a static site to `dist/`.

## GitHub Pages

The Vite base path is configured for this repository:

```js
base: '/golden-whale-guild/'
```

Pushes to `main` run the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which builds the game and deploys `dist/` to
GitHub Pages.

## Tech

Phaser 3 + Vite, plain JavaScript, 1280x720 canvas. All art is runtime-generated
placeholder pixel graphics - drop real sprites into `public/assets/**` at the
paths listed in `src/data/assetManifest.js` and they replace the placeholders
automatically. See `docs/VISUAL_DIRECTION.md` for the art direction and rules.
