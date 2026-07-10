export const GRID_CONFIG = {
  tileSize: 48,
  originX: 48,
  originY: 48,
  columns: 56,
  rows: 32,
  zones: {
    // west/east keep their original rectangles so existing saves stay valid.
    west: { minX: 0, maxX: 19, minY: 0, maxY: 14 },
    east: { minX: 20, maxX: 27, minY: 0, maxY: 14 },
    south: { minX: 0, maxX: 27, minY: 15, maxY: 31 },
    frontier: { minX: 28, maxX: 55, minY: 0, maxY: 14 },
    southeast: { minX: 28, maxX: 55, minY: 15, maxY: 31 },
  },
};

// Pixel size of the buildable world (grid plus a one-origin margin on each side).
export const GRID_WORLD = {
  width: GRID_CONFIG.originX * 2 + GRID_CONFIG.columns * GRID_CONFIG.tileSize,
  height: GRID_CONFIG.originY * 2 + GRID_CONFIG.rows * GRID_CONFIG.tileSize,
};

// Legacy purchasable land. Kept only so old saves that bought zones can be
// migrated into revealed fog tiles; new expansion happens through fog-of-war
// exploration (roads, watchtowers, and heroes lift the fog).
export const EXPANSION_ZONES = [
  { id: 'east', name: 'Eastern Lot', cost: 900, threat: 4, blurb: 'Room for shops and one questionable kiosk.' },
  { id: 'south', name: 'Southern Fields', cost: 1600, threat: 5, blurb: 'Flat, sunny, and zoned for future districts.' },
  { id: 'frontier', name: 'Eastern Frontier', cost: 2400, threat: 7, blurb: 'Far enough that the monsters call it their side.' },
  { id: 'southeast', name: 'Far Meadows', cost: 3200, threat: 8, blurb: 'Premium emptiness. The surveyor wept with joy.' },
];

// --- fog of war ------------------------------------------------------------
// The whole map exists from day one; only revealed tiles are visible and
// buildable. Reveal sources and their radii (in tiles):
export const FOG_REVEAL_RADIUS = {
  guildhall: 8,
  watchtower: 7,
  building: 4,
  road: 2,
  heroExplore: 3,
  premiumScout: 5,
};

// Reveal a rough circle around a grid cell. Mutates `revealedSet` (Set of
// gridKey strings) and returns the newly revealed cells.
export function revealCircle(revealedSet, centerX, centerY, radius) {
  const added = [];
  const limit = radius * radius + radius * 0.6; // soft edge, less perfect-circle
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(GRID_CONFIG.rows - 1, Math.ceil(centerY + radius));
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(GRID_CONFIG.columns - 1, Math.ceil(centerX + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy > limit) continue;
      const key = gridKey(x, y);
      if (revealedSet.has(key)) continue;
      revealedSet.add(key);
      added.push({ x, y });
    }
  }
  return added;
}

// Build the revealed-tiles set for a loaded/new city.
// - saves with a `revealed` array use it directly (new fog-era saves)
// - older saves migrate their purchased zones so paid land stays usable
// - both paths additionally reveal around existing buildings and roads so no
//   placed content can end up stranded inside fog
export function buildRevealedTiles(cityState, footprintById = {}) {
  const revealed = new Set();
  if (Array.isArray(cityState.revealed)) {
    for (const key of cityState.revealed) {
      if (typeof key !== 'string') continue;
      const [x, y] = key.split(',').map(Number);
      if (isInsideGrid(x, y)) revealed.add(gridKey(x, y));
    }
  } else {
    for (const zoneId of cityState.unlockedZones || []) {
      const zone = GRID_CONFIG.zones[zoneId];
      if (!zone) continue;
      for (let y = zone.minY; y <= zone.maxY; y += 1) {
        for (let x = zone.minX; x <= zone.maxX; x += 1) revealed.add(gridKey(x, y));
      }
    }
  }
  for (const building of cityState.placedBuildings || []) {
    const footprint = footprintById[building.id] || { w: 2, h: 2 };
    const radius = building.id === 'guildhall'
      ? FOG_REVEAL_RADIUS.guildhall
      : building.id === 'watchtower'
        ? FOG_REVEAL_RADIUS.watchtower
        : FOG_REVEAL_RADIUS.building;
    revealCircle(
      revealed,
      building.gridX + footprint.w / 2,
      building.gridY + footprint.h / 2,
      radius,
    );
  }
  for (const road of cityState.roads || []) {
    revealCircle(revealed, road.x, road.y, FOG_REVEAL_RADIUS.road);
  }
  return revealed;
}

// --- isometric projection seam ----------------------------------------------
// The world currently renders on an orthogonal grid with angled building art.
// These helpers centralize every grid<->world conversion so a future full
// isometric (diamond) projection only has to change this one place. Today
// they delegate to the orthogonal versions.
export function gridToWorldIso(gridX, gridY, footprint = { w: 1, h: 1 }) {
  return gridToWorld(gridX, gridY, footprint);
}

export function worldToGridIso(worldX, worldY) {
  return worldToGrid(worldX, worldY);
}

export function getIsoTileCenter(gridX, gridY) {
  const world = gridToWorld(gridX, gridY);
  return { x: world.x, y: world.y - GRID_CONFIG.tileSize / 2 };
}

export function getIsoFootprintBounds(gridX, gridY, footprint = { w: 1, h: 1 }) {
  return {
    left: GRID_CONFIG.originX + gridX * GRID_CONFIG.tileSize,
    top: GRID_CONFIG.originY + gridY * GRID_CONFIG.tileSize,
    width: footprint.w * GRID_CONFIG.tileSize,
    height: footprint.h * GRID_CONFIG.tileSize,
  };
}

export const ROAD_TYPES = {
  dirt: {
    id: 'dirt',
    name: 'Dirt Road',
    cost: 8,
    color: 0xc7a06a,
    edgeColor: 0x8f6a46,
    speed: 1,
    description: 'Cheap access. Boots complain at normal speed.',
  },
  stone: {
    id: 'stone',
    name: 'Stone Road',
    cost: 22,
    color: 0xa9a5a0,
    edgeColor: 0x6f7076,
    speed: 1.18,
    description: 'Faster travel and fewer heroic ankle editorials.',
  },
  premium: {
    id: 'premium',
    name: 'Premium Gold Road',
    cost: 55,
    color: 0xf2c744,
    edgeColor: 0xa66f18,
    speed: 1.3,
    trust: -1,
    corruption: 1,
    description: 'Fast, shiny, and somehow a public policy.',
  },
};

export const DEFAULT_NEW_CITY = {
  mode: 'builder',
  unlockedZones: ['west'],
  // empty array = fog-era save: the starting clearing is derived from the
  // guild hall and starter roads instead of a whole zone rectangle
  revealed: [],
  // starting layout (see docs/CITY_BUILDER_SYSTEMS_PLAN.md section 3):
  // one clean straight dirt road with a small believable town core on it —
  // Guild Hall in the middle, Tavern to the west, Market to the east.
  // The player draws the rest of the town themselves.
  roads: Array.from({ length: 11 }, (_, x) => ({ x: x + 4, y: 7, type: 'dirt' })),
  placedBuildings: [
    { id: 'guildhall', gridX: 8, gridY: 4 },
    { id: 'tavern', gridX: 5, gridY: 5 },
    { id: 'market', gridX: 12, gridY: 5 },
  ],
  buildingRuntime: {
    guildhall: {
      usageCount: 0,
      visitorsTotal: 0,
      visitorsNow: 0,
      serviceQuality: 1,
      upgradeProgress: 0,
      capacity: 6,
    },
  },
  simulation: {
    speed: 1,
    elapsedMs: 0,
  },
};

// Safe anchor offsets for randomized new-game starts. The base layout above
// is authored at anchor (0,0) with a bounding box of roughly x4-14 / y4-7;
// every anchor keeps that box at least 3 tiles from all map edges and leaves
// buildable space around the settlement. Old saves are untouched — anchors
// only apply when a brand-new city state is created.
export const START_ANCHORS = [
  { dx: 0, dy: 0 },
  { dx: 12, dy: 4 },
  { dx: 24, dy: 1 },
  { dx: 6, dy: 13 },
  { dx: 20, dy: 11 },
  { dx: 32, dy: 6 },
  { dx: 12, dy: 19 },
  { dx: 28, dy: 16 },
];

export function createNewCityState(random = Math.random) {
  const anchor = START_ANCHORS[Math.floor(random() * START_ANCHORS.length)] || START_ANCHORS[0];
  const city = structuredClone(DEFAULT_NEW_CITY);
  city.roads = city.roads.map((road) => ({ ...road, x: road.x + anchor.dx, y: road.y + anchor.dy }));
  city.placedBuildings = city.placedBuildings.map((building) => ({
    ...building,
    gridX: building.gridX + anchor.dx,
    gridY: building.gridY + anchor.dy,
  }));
  return city;
}

export function gridKey(x, y) {
  return `${x},${y}`;
}

export function gridToWorld(gridX, gridY, footprint = { w: 1, h: 1 }) {
  return {
    x: GRID_CONFIG.originX + (gridX + footprint.w / 2) * GRID_CONFIG.tileSize,
    y: GRID_CONFIG.originY + (gridY + footprint.h) * GRID_CONFIG.tileSize,
  };
}

export function worldToGrid(worldX, worldY) {
  return {
    x: Math.floor((worldX - GRID_CONFIG.originX) / GRID_CONFIG.tileSize),
    y: Math.floor((worldY - GRID_CONFIG.originY) / GRID_CONFIG.tileSize),
  };
}

export function getFootprintCells(gridX, gridY, footprint = { w: 1, h: 1 }) {
  const cells = [];
  for (let y = gridY; y < gridY + footprint.h; y += 1) {
    for (let x = gridX; x < gridX + footprint.w; x += 1) cells.push({ x, y });
  }
  return cells;
}

export function isInsideGrid(x, y) {
  return x >= 0 && y >= 0 && x < GRID_CONFIG.columns && y < GRID_CONFIG.rows;
}

export function isTileUnlocked(x, y, unlockedZones = ['west']) {
  return unlockedZones.some((zoneId) => {
    const zone = GRID_CONFIG.zones[zoneId];
    return zone && x >= zone.minX && x <= zone.maxX && y >= zone.minY && y <= zone.maxY;
  });
}

export function createGridState(cityState) {
  const cells = new Map();
  for (let y = 0; y < GRID_CONFIG.rows; y += 1) {
    for (let x = 0; x < GRID_CONFIG.columns; x += 1) {
      cells.set(gridKey(x, y), {
        x,
        y,
        terrain: 'grass',
        occupiedBy: null,
        road: null,
        unlocked: isTileUnlocked(x, y, cityState.unlockedZones),
      });
    }
  }

  for (const road of cityState.roads || []) {
    const cell = cells.get(gridKey(road.x, road.y));
    if (cell) cell.road = road.type || 'dirt';
  }

  return cells;
}

export function occupyBuildingCells(cells, placement, footprint) {
  for (const cellPos of getFootprintCells(placement.gridX, placement.gridY, footprint)) {
    const cell = cells.get(gridKey(cellPos.x, cellPos.y));
    if (cell) cell.occupiedBy = placement.id;
  }
}

export function makeLegacyCityState(buildings, layout) {
  const placedBuildings = buildings.map((building) => {
    const footprint = building.footprint || { w: 2, h: 2 };
    const patch = layout[building.id] || building;
    const gridX = Math.max(
      0,
      Math.min(
        GRID_CONFIG.columns - footprint.w,
        Math.round((patch.x - GRID_CONFIG.originX) / GRID_CONFIG.tileSize - footprint.w / 2),
      ),
    );
    const gridY = Math.max(
      0,
      Math.min(
        GRID_CONFIG.rows - footprint.h,
        Math.round((patch.y - GRID_CONFIG.originY) / GRID_CONFIG.tileSize - footprint.h),
      ),
    );
    return { id: building.id, gridX, gridY, legacyPosition: true };
  });

  return {
    mode: 'legacy',
    unlockedZones: ['west', 'east'],
    roads: [],
    placedBuildings,
    buildingRuntime: {},
    simulation: { speed: 1, elapsedMs: 0 },
  };
}

export function normalizeCityState(raw, legacyFactory) {
  if (!raw) return createNewCityState();
  if (!raw.cityBuilder) return legacyFactory();

  const incoming = raw.cityBuilder;
  return {
    mode: incoming.mode === 'legacy' ? 'legacy' : 'builder',
    unlockedZones: Array.isArray(incoming.unlockedZones) && incoming.unlockedZones.length
      ? [...incoming.unlockedZones]
      : ['west'],
    // null = pre-fog save; buildRevealedTiles migrates purchased zones
    revealed: Array.isArray(incoming.revealed)
      ? incoming.revealed.filter((key) => typeof key === 'string')
      : null,
    roads: Array.isArray(incoming.roads)
      ? incoming.roads
        .filter((road) => Number.isInteger(road.x) && Number.isInteger(road.y) && isInsideGrid(road.x, road.y))
        .map((road) => ({ x: road.x, y: road.y, type: ROAD_TYPES[road.type] ? road.type : 'dirt' }))
      : [],
    placedBuildings: Array.isArray(incoming.placedBuildings)
      ? incoming.placedBuildings
        .filter((building) => building?.id && Number.isInteger(building.gridX) && Number.isInteger(building.gridY))
        .map((building) => ({ ...building }))
      : [],
    buildingRuntime: incoming.buildingRuntime && typeof incoming.buildingRuntime === 'object'
      ? structuredClone(incoming.buildingRuntime)
      : {},
    simulation: {
      speed: [0, 1, 2, 4].includes(incoming.simulation?.speed) ? incoming.simulation.speed : 1,
      elapsedMs: Math.max(0, Number(incoming.simulation?.elapsedMs) || 0),
    },
  };
}
