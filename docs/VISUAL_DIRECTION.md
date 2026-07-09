# Golden Whale Guild - Visual Direction

Updated 2026-07 for the isometric city-builder pivot.

## Target

An angled / isometric fantasy city-builder that is cozy but satirical, and
readable at browser scale.

- Grid-based city building on a large explorable map.
- Terrain feels like a natural map (meadows, dirt, clusters, wilderness),
  never flat debug grass.
- Roads sit in the world: shoulders, curb depth, doorstep connectors — they
  must match the buildings' angled perspective.
- Buildings are 3/4-angled, grounded on foundation pads with soft shadows.
  Nothing floats, nothing looks pasted on.
- Fog of war hides the unexplored world; expansion feels like exploration,
  not buying a rectangle.
- UI reads as a game interface (parchment, wood, brass, gold-trimmed
  bureaucracy), never an admin dashboard.

## Inspiration (high level only — never copy)

- **Age of Empires 2**: terrain readability, natural forests/rock clusters,
  map variety that stays legible when zoomed out.
- **Caesar 3**: service buildings that need road access; a city you read at
  a glance by its services.
- **Anno**: category-based economy and build menus; clear production/shop
  identity per building.
- **Settlers**: roads as living logistics; workers/heroes visibly moving
  through a believable settlement.

Do not copy assets, layouts, UI, names, or exact designs from any of these.

## Rendering model (current state)

The internal grid stays orthogonal (56x32 at 48px). The isometric feel comes
from layered rendering, in this order (back to front):

1. `terrain_grass_base` tiled meadow + one static RenderTexture of variety
   tiles (clover, dirt patches) and ground decals (tufts, flowers, stumps).
2. Road bed grounding (shoulders, flecks) + textured road fill + pseudo-depth
   curbs (light north lip, dark south face).
3. Building foundation pads (diamond), doorstep connectors to roads, then the
   angled building sprite anchored to the pad.
4. Wilderness props under fog; fog overlay with depth-tinted tiles, soft
   frontier skirts, and mist blobs.

All grid<->world conversions route through `src/data/grid.js`
(`gridToWorldIso`, `worldToGridIso`, `getIsoTileCenter`,
`getIsoFootprintBounds`) so a future true-diamond projection changes one file.

## Building art rules

- 160px source, 3/4 angled top-down, grounded base with shadow baked in.
- Clean pixel outline, readable silhouette at ~100px on screen.
- Transparent background, no text, no watermark.
- Reference set (2026-07): `building_tavern`, `building_inn`,
  `building_market`, `building_guild_hall`, `building_golden_whale`,
  `building_bank_debt_office`, `building_gem_exchange`.
- The Golden Whale stays the loudest building in town: white marble, gold
  trim, giant golden whale on the roof. Premium buildings may be overdone;
  that is the joke.

## Terrain / fog rules

- Fog is dark blue-grey with per-tile alpha variation and mist blobs — never
  a flat black rectangle.
- Revealed frontier tiles get a soft fog skirt so the boundary looks organic.
- Wilderness props (trees, rocks, bushes) live under the fog and become
  clearable land when revealed.

## PixelLab prompt template

"fantasy city-builder building, slightly angled top-down view, cozy detailed
pixel art matching a premium fantasy town, grounded base with shadow, clear
silhouette, transparent background, no text. 1). <building> 2). <building> ..."
at size 160 (buildings), 64 (props/decals), 48 tiles-pro (terrain).
