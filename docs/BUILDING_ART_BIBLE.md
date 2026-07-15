# Golden Whale Guild Building Art Bible

This document is the permanent source of truth for building art, sizing, and
integration. It supersedes older prompts that describe world buildings as
simple top-down objects or mobile-game icons.

## Permanent World Style

World buildings use detailed, grounded medieval-fantasy isometric pixel art in
a 2.5D town-builder presentation. `building_hero_hostel.png`,
`building_watchtower.png`, the detailed Guild Hall, Tavern, and Inn are the
primary references.

- Show two walls and a visible, function-appropriate roof.
- Use the same camera angle, top-left light, pixel density, and dark readable
  outline weight across the town.
- Prefer believable timber, stone, plaster, metal, tile, thatch, and cloth.
- Use a warm restrained palette, moderate contrast, and grounded shadows.
- Make the role legible through architecture and equipment before a label is
  read.
- Keep contact points inside the logical footprint and keep the entrance near
  a valid footprint edge.
- Use transparent backgrounds. Do not bake labels, UI, giant glows, or square
  decorative islands into the sprite.

World buildings must not be photorealistic, flat, front-facing, pure top-down,
toy-like, plastic, chibi, overly bright, or shaped like mobile reward icons.

## Premium Buildings

Premium art uses the same masonry, timber, perspective, lighting, outline, and
pixel density as fair buildings. Purple cloth, gold trim, polished windows,
banners, and subtle magic are accents, normally no more than 15-25% of the
visible structure. A Premium Lodge remains visibly lodging; a Premium
Fabricator remains visibly a workshop. The Golden Whale may be exaggerated,
but its whale identity must be integrated into coherent town architecture.

## Preview And World Assets

Build-menu previews and world sprites have separate asset roles:

- `building_<id>_preview.png`: small, centered, quickly readable catalog art.
- `building_<id>_l1.png` through `_l5.png`: detailed world tiers with identical
  canvas dimensions and anchors.
- Existing `building_<id>.png` remains the compatible level-one world key while
  the tiered naming migration is gradual.

The catalog resolves `previewAssetKey` first and safely falls back to the world
asset. A simplified preview must never be enlarged into the world sprite.

## Isometric Projection And Footprints

The live map uses 64x32 isometric tiles. `src/utils/buildingVisuals.js` owns the
projected bounds, anchor, scale, entrance, and hit geometry. Do not add renderer
offsets to compensate for a poorly prepared sprite.

| Footprint | World target box | Intended use |
| --- | --- | --- |
| 1x1 | 50x72 px | Board, kiosk, shrine, tiny utility |
| 2x1 | 78x98 px | Narrow stall or compact office |
| 2x2 | 108x132 px | House, shop, compact service building |
| 3x2 | 138x160 px | Inn, workshop, production/service building |
| 3x3 | 166x184 px | Major civic, training, defense, or premium building |
| 4x3 | 194x208 px | Large landmark with justified yard/support mass |

The table specifies an in-game bounding target, not source-canvas dimensions.
Larger source art is acceptable when exported with nearest-neighbor sampling
and verified at the final target size.

### Anchor Contract

- Every world sprite uses origin `(0.5, 1)` at the footprint's bottom-center
  anchor.
- `getBuildingWorldAnchor()` is the only source for world placement.
- `getBuildingSpriteScale()` fits the sprite inside the footprint target box.
- `getBuildingEntranceAnchor()` chooses the near/bottom footprint edge.
- Hover and selection use `getBuildingHitPolygon()` plus a restrained upper
  silhouette, never a giant full-canvas rectangle.
- Upgrade frames keep identical canvas dimensions, transparent margins, ground
  contact, and anchor so changing texture cannot wobble the building.

## Functional Readability

- Sawmill: logs, cut planks, saw frame, loading/work area, wood debris.
- Training Yard: weapon racks, armor/dummies, archery target, sparring area;
  never playground equipment.
- Salvage Yard: scrap, broken equipment/carts, sorting bench, hoist, covered
  work area.
- Notice Board: compact 1x1 wooden civic board with parchment notices.
- Premium Lodge: porch, rooms, balcony/sign, warm hospitality windows.
- Premium Fabricator: workshop mass plus machinery, forge/reactor, apparatus.
- VIP Lounge: exclusive but believable hospitality entrance and social cues.
- Convenience Office: clerk window, counter, permits, paperwork, queue cues.
- Gem Exchange: secure counter, reinforced windows, scales/vault/guard cues.

## Architectural Upgrade Rules

- L1: modest structure and limited functional equipment.
- L2: improved walls/roof plus functional capacity detail.
- L3: coherent wing, upper floor, chimney, crane, yard, or equipment expansion.
- L4-L5: mature architecture and specialization detail without changing the
  footprint or anchor unless gameplay explicitly changes the footprint.

Do not represent levels with floating bars, roof strips, rectangles, detached
ropes, duplicate props, or a larger sprite scale. Tier art replaces tier art;
all temporary overlays remain owned and cleaned by the building renderer.

## PixelLab World-Building Prompt

Use this shared base for every future world-building generation. Change only
the role, materials, footprint, functional equipment, and fair/shady/premium
accent description.

> Detailed grounded medieval-fantasy isometric pixel-art [BUILDING TYPE] for a browser city-builder. Exact [WIDTH]x[HEIGHT] logical tile footprint using the project's established 64x32 isometric projection. Two visible walls and a pitched or function-appropriate roof. Believable [MATERIALS]. Clearly communicates [FUNCTION] through [FUNCTIONAL DETAILS]. Warm restrained palette, moderate contrast, dark readable outlines, consistent top-left lighting, rich world-sprite detail, transparent background. Building centred over its full footprint with stable bottom-centre anchor and all ground contact points inside the footprint. No text, no UI, no floating labels, no square icon base, no permanent decorative island, no toy style, no mobile-game style, no chibi proportions, no front-facing view, no pure top-down view, and no unrelated scenery.

Generate several candidates, inspect at actual gameplay scale, and reject any
candidate that is too bright, simple, cartoon-like, icon-like, badly angled,
functionally unclear, off-center, mostly empty, or inconsistent with the
reference buildings. Integration is not complete until move, delete, upgrade,
save, reload, normal zoom, and far zoom have been checked with `?testSave=1`.

## Labels And Interaction

Names and levels are hidden during normal play. They appear on hover,
selection, build mode, accessibility mode, or relevant alerts. NPCs, monsters,
loot/remains, and small props keep priority over buildings. Building selection
uses the footprint diamond and visible lower silhouette so an NPC in front of a
roof remains clickable.
