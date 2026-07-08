# Golden Whale Guild — Visual Direction

## Status: placeholder graphics are temporary

Everything currently on screen is **runtime-generated debug art** drawn with
Phaser Graphics (see `src/textures.js`, all keys prefixed `ph-`). It exists so
the game is playable and the layout is readable — it is not the art direction.
Do not polish the generated shapes further; effort goes into systems and
asset-readiness instead.

## Final target

A **cozy, colorful top-down / 2.5D pixel fantasy town**:

- warm palette, readable silhouettes, chunky pixel proportions
- map-first: the town *is* the interface; minimal UI floats on top
- small-scale charm (Stardew-adjacent), not gritty or realistic
- satire tone carried by animation and signage, not UI text walls

Current prototype priorities:

- keep the town readable at 1280x720 without zoom
- preserve the map-first design: the town is the interface
- use only small HUD elements, compact tooltips, and short speech bubbles
- no dashboard panels, admin screens, tabs, or card layouts
- keep all Golden Whale economy jokes fictional and in-game only
- upgrade/progression visuals should be small map changes, pulses, glow, signs,
  or particles rather than management UI
- quest posting and objectives should stay as small notices/signage layered on
  the town, not as a separate quest-log dashboard
- responsive/mobile play should preserve the same map-first canvas: scale the
  game, support drag panning, and keep touch targets readable without adding
  dashboard UI
- NPC hero detail belongs in compact tooltips anchored to the map, not in a
  roster screen; current implementation uses one fixed inspector panel so
  detailed stats do not clutter the roads
- Town Ledger is an in-world guild planning board, not an admin dashboard:
  compact rows, upgrade trade-offs, and immediate map feedback
- Day Reports, policy choices, and Town Log are compact guild paperwork
  overlays. They should explain consequences and history without becoming
  analytics screens, tabs, or full management dashboards
- Town stages, crises, and unlocks should be visible through small map pulses,
  labels, signs, glow, and report lines instead of large modal spectacle
- NPC status changes should remain readable with tiny placeholder markers
  above sprites until real character/status assets exist

## Asset-replaceable architecture

All important game objects resolve their texture at runtime through
`src/assets.js` + `src/data/assetManifest.js`:

1. Drop a PNG at the manifest `path` under `public/assets/**`.
2. Reload. The game uses it automatically. No code changes.
3. If the file is missing, the generated placeholder is used. The boot scene
   skips missing optional files before Phaser's loader runs, then a console info
   line lists which generated placeholders are active.

Folder layout (all under `public/assets/`):

| Folder        | Contents                                          |
| ------------- | ------------------------------------------------- |
| `tiles/`      | ground/terrain tilesets (grass, paths, water)     |
| `characters/` | hero sprites — later spritesheets with walk/idle  |
| `buildings/`  | one sprite per building, ground-anchored          |
| `decor/`      | special locations, props, signs, fences, lamps    |
| `ui/`         | panel, button, frame nine-patches                 |
| `icons/`      | resource + misc icons (coin, whale, …)            |
| `particles/`  | particle textures (coin sparkle, glow, dust)      |
| `maps/`       | Tiled/LDtk map exports when the town gets a map   |

When character spritesheets arrive, change the manifest entry `type` to
`'spritesheet'` and add a `frameConfig` — the loader already supports it.

## Rules for Claude (and other tooling)

- **Integrate assets, do not invent final art.** When real sprites are
  provided, wire them in via the manifest; never spend cycles hand-crafting
  elaborate Graphics art beyond quick readable placeholders.
- Keep every new visible game object behind an asset key + fallback, following
  the existing pattern in `src/data/buildings.js` / `src/data/heroes.js`.
- Mark any new generated art clearly as temporary (`ph-` key prefix + comment).

## The Golden Whale Milking Station rule

The station must remain **the strongest visual identity in the scene**, in
placeholder and final art alike: gold/glowing, whale signage, coin particles,
red carpet + VIP rope, suspiciously premium. If a visual pass makes another
building compete with it for attention, the pass is wrong.

Future Golden Whale assets should exaggerate:

- cursed-profit glow
- whale iconography
- premium rope/carpet entrance
- coin/sparkle particles
- nearby poor-hero queue and refund denial signage
- a tone of "technically optional, obviously unfair"
