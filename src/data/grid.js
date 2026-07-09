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

// Purchasable land, in the order the town is expected to grow.
export const EXPANSION_ZONES = [
  { id: 'east', name: 'Eastern Lot', cost: 900, threat: 4, blurb: 'Room for shops and one questionable kiosk.' },
  { id: 'south', name: 'Southern Fields', cost: 1600, threat: 5, blurb: 'Flat, sunny, and zoned for future districts.' },
  { id: 'frontier', name: 'Eastern Frontier', cost: 2400, threat: 7, blurb: 'Far enough that the monsters call it their side.' },
  { id: 'southeast', name: 'Far Meadows', cost: 3200, threat: 8, blurb: 'Premium emptiness. The surveyor wept with joy.' },
];

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
  roads: [
    ...Array.from({ length: 15 }, (_, x) => ({ x: x + 1, y: 7, type: 'dirt' })),
    ...Array.from({ length: 7 }, (_, y) => ({ x: 8, y: y + 4, type: 'dirt' })),
    ...Array.from({ length: 5 }, (_, x) => ({ x: x + 6, y: 10, type: 'dirt' })),
    ...Array.from({ length: 4 }, (_, x) => ({ x: x + 10, y: 5, type: 'dirt' })),
    { x: 5, y: 6, type: 'dirt' },
    { x: 6, y: 6, type: 'dirt' },
    { x: 7, y: 6, type: 'dirt' },
    { x: 13, y: 6, type: 'dirt' },
    { x: 14, y: 6, type: 'dirt' },
  ].filter((road, index, roads) => roads.findIndex((item) => item.x === road.x && item.y === road.y) === index),
  placedBuildings: [
    { id: 'guildhall', gridX: 8, gridY: 4 },
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
  if (!raw) return structuredClone(DEFAULT_NEW_CITY);
  if (!raw.cityBuilder) return legacyFactory();

  const incoming = raw.cityBuilder;
  return {
    mode: incoming.mode === 'legacy' ? 'legacy' : 'builder',
    unlockedZones: Array.isArray(incoming.unlockedZones) && incoming.unlockedZones.length
      ? [...incoming.unlockedZones]
      : ['west'],
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
