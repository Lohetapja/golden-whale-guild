import { gridKey } from '../data/grid.js';

export const ROAD_DIRECTIONS = {
  north: { bit: 1, dx: 0, dy: -1 },
  east: { bit: 2, dx: 1, dy: 0 },
  south: { bit: 4, dx: 0, dy: 1 },
  west: { bit: 8, dx: -1, dy: 0 },
};

export function getRoadMask(cells, x, y) {
  return Object.values(ROAD_DIRECTIONS).reduce((mask, direction) => (
    cells.get(gridKey(x + direction.dx, y + direction.dy))?.road
      ? mask | direction.bit
      : mask
  ), 0);
}

export function getRoadVariant(mask) {
  const connections = Object.values(ROAD_DIRECTIONS)
    .filter((direction) => mask & direction.bit)
    .length;
  if (connections === 4) return 'crossroad';
  if (connections === 3) return 't-junction';
  if (connections === 2) {
    const vertical = (mask & 5) === 5;
    const horizontal = (mask & 10) === 10;
    return vertical || horizontal ? 'straight' : 'curve';
  }
  if (connections === 1) return 'end';
  return 'isolated';
}

export function getRoadSurfaceRect(left, top, tileSize, mask, inset = 7) {
  const west = Boolean(mask & ROAD_DIRECTIONS.west.bit);
  const east = Boolean(mask & ROAD_DIRECTIONS.east.bit);
  const north = Boolean(mask & ROAD_DIRECTIONS.north.bit);
  const south = Boolean(mask & ROAD_DIRECTIONS.south.bit);
  const x = left + (west ? 0 : inset);
  const y = top + (north ? 0 : inset);
  const right = left + tileSize - (east ? 0 : inset);
  const bottom = top + tileSize - (south ? 0 : inset);
  return { x, y, width: right - x, height: bottom - y };
}

export function isRoadPlazaTile(cells, x, y) {
  const origins = [
    { x: x - 1, y: y - 1 },
    { x, y: y - 1 },
    { x: x - 1, y },
    { x, y },
  ];
  return origins.some((origin) => (
    cells.get(gridKey(origin.x, origin.y))?.road
    && cells.get(gridKey(origin.x + 1, origin.y))?.road
    && cells.get(gridKey(origin.x, origin.y + 1))?.road
    && cells.get(gridKey(origin.x + 1, origin.y + 1))?.road
  ));
}

export function getRoadNeighborCells(x, y) {
  return [
    { x, y },
    ...Object.values(ROAD_DIRECTIONS).map((direction) => ({
      x: x + direction.dx,
      y: y + direction.dy,
    })),
  ];
}
