# Golden Whale Guild Asset Style Guide

## Target Style

Golden Whale Guild uses detailed grounded isometric pixel art for world
buildings and readable low-2.5D pixel art for characters, props, and icons.
`BUILDING_ART_BIBLE.md` is the permanent authority for building perspective,
materials, footprint sizing, anchors, premium accents, and PixelLab prompts.

Primary world-building references are `building_hero_hostel.png`,
`building_watchtower.png`, the detailed Guild Hall, Tavern, and Inn. The Golden
Whale remains an identity reference, but its current sprite is not a style
reference because it is brighter and more icon-like than the permanent target.

## Perspective And Scale

- Use detailed isometric 2.5D perspective for world buildings. Props and NPCs
  use compatible angled top-down views.
- Standalone buildings, objects, characters, and icons should use transparent
  backgrounds.
- Buildings use the footprint target boxes documented in
  `BUILDING_ART_BIBLE.md`, generally 50-194 px wide in-game.
- Grid buildings should use clear 1x1, 2x2, 3x2, or 3x3 silhouettes and keep
  their entrance visually near the bottom edge for road access.
- Small locations and props should stay readable around 32-90 px wide in-game.
- NPCs should remain readable around 24-48 px tall in-game.
- Icons should read clearly at HUD size, usually 14-24 px in-game.

## UI Direction

- UI assets should feel like fantasy parchment, wood, brass, dark guild paper,
  or gold-trimmed satirical bureaucracy.
- Avoid modern dashboard styling, glassmorphism, SaaS cards, large admin
  panels, and generic mobile-app chrome.
- The map remains the primary interface. UI art supports inspector panels,
  Town Ledger, event ticker, quest cards, and small action buttons.

## Integration Rules

- Route every generated asset through `src/data/assetManifest.js`.
- Use normal `public/assets/**` paths only.
- Do not include local absolute paths, tokens, auth headers, or MCP config.
- Keep generated Phaser placeholder art as fallback/debug art.
- If an asset is missing, the game must still load and use the placeholder.

## 2026-07 Reference Additions

The July 2026 pass established these additional non-building anchors. Building
acceptance moved to the stricter `BUILDING_ART_BIBLE.md`; Gem Exchange and VIP
Lounge are specifically not permanent world-building references.

- Detailed world buildings: Hero Hostel, Watchtower, Guild Hall, Tavern, and
  Inn. These establish construction, material, angle, and pixel density.
- Road tiles: `tiles/road_dirt.png`, `road_stone.png`, `road_premium.png` -
  48px seamless top-down fills used by the textured road renderer.
- Items: 64px satirical shop icons in `items/` with a shared warm palette.
- Monsters: 64px cute-but-dangerous sprites in `monsters/`.
- UI icons: 40px warm gold/brown icons in `ui/`.

Use the shared world-building prompt in `BUILDING_ART_BIBLE.md`. The older
generic multi-object prompt remains suitable for small props and icons only.

## Golden Whale Rule

The Golden Whale Milking Station should remain the strongest visual identity in
the town: gold, glow, whale signage, coin particles, VIP ropes, and suspicious
premium polish. Other buildings can be charming, but the Whale should look like
the town's most profitable bad idea.

Its presentation is a layered landmark rather than one baked glow: foundation,
building, optional statue, soft aura, restrained coins, then the separately
owned VIP Queue. The aura must stay below actors and labels, reduce visual
weight at distance, and never cover nearby roads.

## Building Ownership And Cleanup

Every rendered building feature must belong to either a building ID or an
independent saved world-object ID. Building-owned visuals include foundations,
road connectors, sprites, labels, hit targets, upgrade accents, cargo anchors,
auras, particles, and attached props. Move and Delete use the same cleanup path
before rebuilding the stack at its new position.

Attached props need an owner ID, base-point depth, compact hitbox, explicit
hover/selection behavior, and a cleanup rule. Manually placed decor uses its
own persistent ID. Temporary effects are never saved as independent objects.

## Building Source Strategy

- A larger source image is useful only when its final nearest-neighbor export
  is prepared for the exact in-game footprint. Arbitrary browser downscaling
  softens pixel clusters and is not a substitute for a game-ready sprite.
- Every building asset needs a known footprint, visible entrance, grounded
  foundation, compact hover hitbox, selected highlight, and optional upgrade
  accents.
- Warehouse, Storehouse, Premium Temple, Premium Fabricator, and extraction
  camps must remain readable by silhouette and role props, not permanent text.
- Premium assets may use controlled gold and purple accents, but must not bake
  a giant aura into the sprite.

## Road Rendering Strategy

The square road PNGs are catalog previews and orthogonal fallbacks. The active
isometric world renders connected diamond shoulders, cores, edge connectors,
and type-specific surface details so straight pieces, corners, junctions, and
plazas share edges without stretching square art into the wrong perspective.
All road layers remain below actors and world objects.

## 2026-07 Isometric Building Pass

Proven PixelLab recipe for the coherent isometric building set (Storehouse,
Warehouse, Premium Fabricator, Guild Hall, Tavern, Market, Blacksmith, Potion
Shop, Watchtower, Hero Hostel, Frontier Outpost):

- Tool: `create_map_object`, `view: "low top-down"` (or `high top-down`),
  `detail: high`, `single color outline`, `medium shading`, 160-176px canvas.
- Prompt shape: "isometric fantasy city-builder <role>, angled view with two
  visible walls and a roof, <role props>, warm medieval palette, clean
  silhouette, transparent background, no text".
- Upgrade tiers via `create_object_state` from the chosen base ("upgrade to
  level N: add <architecture>, keep the same palette and isometric angle") so the
  building stays recognisable as it grows.

Naming / resolver:
- Base level-1 art: `building_<type>.png` (Phaser key `building_<type>`).
- Upgrade art: `building_<type>_l2` / `_l3` (manifest keys). `buildingTexture()`
  in `src/assets.js` resolves `${key}_l{level}` -> base -> placeholder, never an
  unrelated building. Upgrades swap the sprite + refresh scale/hitbox.
