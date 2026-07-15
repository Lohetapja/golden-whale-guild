# Fortification System

## World Scale

- Current logical map: **216 x 120 tiles** (25,920 tiles).
- Previous logical map: **144 x 80 tiles** (11,520 tiles).
- The new map has **2.25x** the buildable/explorable tile area while retaining the existing projection and tile dimensions.
- Old saves keep their existing coordinates and revealed tiles. The additional land begins unrevealed.

## Build Types

The Fortifications build category contains connected Wooden Palisades, Stone Walls, road-compatible Gates, Guard Towers, and Reinforced Gatehouses. Walls support drag planning and batch confirmation. Adjacent sections derive endpoint, straight, corner, T-junction, and crossroad topology from a four-neighbor mask.

Fortification tuning lives in `src/systems/fortifications.js`:

- gold and material costs
- health and armor
- tower detection radii
- maximum segment count
- retained attack and repair history
- perimeter recalculation cooldown

## Topology And Performance

`computePerimeter` flood-fills from the map boundary only when fortification topology or gate passability changes. Rendering uses dirty updates for the edited section and its four neighbors rather than rebuilding the complete wall network. The supported cap is 600 sections.

Vision-driven wilderness changes are coalesced through a delayed refresh. The isometric renderer no longer allocates the legacy rectangular terrain render texture, which would exceed common GPU texture limits on the expanded map.

## Gates And Perimeters

- Intact closed gates block hostile movement.
- Open gates preserve road access but make an otherwise closed perimeter traversable.
- Civilian evacuation can schedule open gates to close after outside units begin returning.
- A closed perimeter identifies protected interior cells, protected buildings, exposed buildings, breaches, gate count, and aggregate integrity.

## Siege Behaviour

Monsters keep their intended town target but choose an open passage or a weak nearby wall/gate when a perimeter blocks it. Attacks reduce health after armor and stationed-defender mitigation. At zero health, the section becomes a passable breach and the monster resumes its original objective.

Heroes can be physically assigned to repair or station at eligible fortifications. Repairs consume gold and wood or iron after the hero reaches the section. Towers and gatehouses extend detection; damage reduces their effective radius.

## Save Compatibility

Save version 16 adds:

- map version 3 and current map dimensions
- normalized fortification records
- optional monster siege destination references

Transient graphics, path objects, particles, and hover state are not persisted.

## Known Follow-Ups

- Dedicated connected wall sprites would improve corner and gate visuals; the current pass reuses manifest-backed fallback assets.
- Pathfinding remains lightweight. Units receive passability checks and siege interception, but do not yet use a full navigation mesh around very large irregular walls.
- A compact town-wide defence summary can be expanded into a richer overlay after the core topology has more playtesting.
