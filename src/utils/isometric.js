export const USE_ISO_RENDERING = true;

export const ISO_DEFAULTS = {
  originX: 0,
  originY: 0,
  tileWidth: 64,
  tileHeight: 32,
};

function normalizeIsoOptions(originX, originY, tileWidth, tileHeight) {
  if (originX && typeof originX === 'object') {
    return { ...ISO_DEFAULTS, ...originX };
  }
  return {
    originX: originX ?? ISO_DEFAULTS.originX,
    originY: originY ?? ISO_DEFAULTS.originY,
    tileWidth: tileWidth ?? ISO_DEFAULTS.tileWidth,
    tileHeight: tileHeight ?? ISO_DEFAULTS.tileHeight,
  };
}

export function gridToIso(gridX, gridY, originX, originY, tileWidth, tileHeight) {
  const opts = normalizeIsoOptions(originX, originY, tileWidth, tileHeight);
  return {
    x: opts.originX + (gridX - gridY) * opts.tileWidth / 2,
    y: opts.originY + (gridX + gridY) * opts.tileHeight / 2,
  };
}

export function isoToGrid(worldX, worldY, originX, originY, tileWidth, tileHeight) {
  const opts = normalizeIsoOptions(originX, originY, tileWidth, tileHeight);
  const isoX = (worldX - opts.originX) / (opts.tileWidth / 2);
  const isoY = (worldY - opts.originY) / (opts.tileHeight / 2);
  return {
    x: (isoX + isoY) / 2,
    y: (isoY - isoX) / 2,
  };
}

export function getIsoTileCenter(gridX, gridY, originX, originY, tileWidth, tileHeight) {
  return gridToIso(gridX + 0.5, gridY + 0.5, originX, originY, tileWidth, tileHeight);
}

export function getIsoDiamondPoints(gridX, gridY, originX, originY, tileWidth, tileHeight) {
  const opts = normalizeIsoOptions(originX, originY, tileWidth, tileHeight);
  return [
    gridToIso(gridX, gridY, opts),
    gridToIso(gridX + 1, gridY, opts),
    gridToIso(gridX + 1, gridY + 1, opts),
    gridToIso(gridX, gridY + 1, opts),
  ];
}

export function getIsoFootprintPolygon(gridX, gridY, width = 1, height = 1, originX, originY, tileWidth, tileHeight) {
  const opts = normalizeIsoOptions(originX, originY, tileWidth, tileHeight);
  return [
    gridToIso(gridX, gridY, opts),
    gridToIso(gridX + width, gridY, opts),
    gridToIso(gridX + width, gridY + height, opts),
    gridToIso(gridX, gridY + height, opts),
  ];
}

export function getIsoDepth(gridX, gridY) {
  return (gridX + gridY) * 100 + gridX;
}

export function getIsoFootprintAnchor(gridX, gridY, width = 1, height = 1, originX, originY, tileWidth, tileHeight) {
  const polygon = getIsoFootprintPolygon(gridX, gridY, width, height, originX, originY, tileWidth, tileHeight);
  return {
    x: (polygon[0].x + polygon[2].x) / 2,
    y: polygon[2].y,
  };
}
