# City Builder Foundation

Golden Whale Guild now has an incremental city-builder mode for new saves.
Existing version 4 saves migrate to a `legacy` pre-built town so progression is
not discarded.

## Implemented

- 48px logical grid with unlocked/locked land state
- Mostly empty new-city start with Guild Camp, Notice Board, entrance road,
  three heroes, and 650 fictional gold
- Dirt, stone, and premium road placement
- Grid-snapped core building placement with footprint, cost, overlap, and
  adjacent-road validation
- Persistent roads, placements, unlocked land, simulation speed, and building
  runtime data
- Pause, 1x, 2x, 4x, and Skip Day controls around the existing cycle system
- Road-preferred hero routes with speed bonuses
- Generated hero names for new cities
- Tavern capacity controlling population growth and concurrent visits
- Building visit counts, capacity, quality, and organic upgrade progress
- Simple eastern land expansion and town-size Threat pressure
- Lightweight premium item, Envy, and item-conflict hooks

## Next Safe Steps

- TODO: add demolition and partial road refunds with a confirmation step
- TODO: support multiple instances of service buildings, especially Taverns
- TODO: move unlockable special locations into the placement catalog
- TODO: resolve missions through explicit travel timers and returning heroes
- TODO: add stock, upkeep, and service queues beyond Tavern beds
- TODO: add district-combination bonuses for nearby buildings of one type
- TODO: make monster attacks damage placed building runtime state
- TODO: add purchasable expansion markers for more than the eastern parcel

All city-builder visuals continue to resolve through `assetManifest`; generated
Phaser graphics remain fallback and interaction scaffolding.
