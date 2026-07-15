import { getIsoFootprintAnchor, getIsoFootprintPolygon } from './isometric.js';

export const BUILDING_FOOTPRINT_VISUALS = Object.freeze({
  '1x1': { targetWidth: 50, targetHeight: 72, hitInset: 0.12 },
  '2x1': { targetWidth: 78, targetHeight: 98, hitInset: 0.1 },
  '2x2': { targetWidth: 108, targetHeight: 132, hitInset: 0.08 },
  '3x2': { targetWidth: 138, targetHeight: 160, hitInset: 0.07 },
  '3x3': { targetWidth: 166, targetHeight: 184, hitInset: 0.06 },
  '4x3': { targetWidth: 194, targetHeight: 208, hitInset: 0.05 },
});

function normalizeFootprint(value = {}) {
  return {
    w: Math.max(1, Math.round(Number(value.w) || 1)),
    h: Math.max(1, Math.round(Number(value.h) || 1)),
  };
}

export function getBuildingFootprintMetrics(buildingOrFootprint = {}, isoOptions = {}) {
  const footprint = normalizeFootprint(buildingOrFootprint.footprint || buildingOrFootprint);
  const tileWidth = Number(isoOptions.tileWidth) || 64;
  const tileHeight = Number(isoOptions.tileHeight) || 32;
  const key = `${footprint.w}x${footprint.h}`;
  const preset = BUILDING_FOOTPRINT_VISUALS[key];
  const projectedWidth = (footprint.w + footprint.h) * tileWidth / 2;
  const projectedDepth = (footprint.w + footprint.h) * tileHeight / 2;
  const largestSide = Math.max(footprint.w, footprint.h);
  const targetWidth = preset?.targetWidth || Math.round(projectedWidth * 0.86);
  const targetHeight = preset?.targetHeight || Math.round(projectedDepth * 0.82 + 64 + largestSide * 10);
  const hasPosition = Number.isFinite(buildingOrFootprint.gridX) && Number.isFinite(buildingOrFootprint.gridY);
  const polygon = hasPosition
    ? getIsoFootprintPolygon(buildingOrFootprint.gridX, buildingOrFootprint.gridY, footprint.w, footprint.h, isoOptions)
    : null;
  const anchor = hasPosition
    ? getIsoFootprintAnchor(buildingOrFootprint.gridX, buildingOrFootprint.gridY, footprint.w, footprint.h, isoOptions)
    : null;

  return {
    key,
    footprint,
    polygon,
    anchor,
    projectedWidth,
    projectedDepth,
    targetWidth,
    targetHeight,
    visualInset: 0.86,
    hitInset: preset?.hitInset ?? 0.08,
    groundContactY: anchor?.y ?? 0,
  };
}

export function getBuildingWorldAnchor(building, isoOptions = {}) {
  return getBuildingFootprintMetrics(building, isoOptions).anchor;
}

export function getBuildingSpriteScale(sourceWidth, sourceHeight, metrics, maxScale = 1.12) {
  if (!sourceWidth || !sourceHeight || !metrics) return 1;
  return Math.max(0.18, Math.min(maxScale, metrics.targetWidth / sourceWidth, metrics.targetHeight / sourceHeight));
}

export function getBuildingHitPolygon(metrics, inset = null) {
  if (!metrics?.polygon?.length) return null;
  const ratio = 1 - (inset ?? metrics.hitInset ?? 0.08);
  const center = metrics.polygon.reduce((sum, point) => ({
    x: sum.x + point.x / metrics.polygon.length,
    y: sum.y + point.y / metrics.polygon.length,
  }), { x: 0, y: 0 });
  return metrics.polygon.map((point) => ({
    x: center.x + (point.x - center.x) * ratio,
    y: center.y + (point.y - center.y) * ratio,
  }));
}

export function getBuildingEntranceAnchor(metrics) {
  if (!metrics?.polygon?.length) return metrics?.anchor || { x: 0, y: 0 };
  const bottom = metrics.polygon.reduce((best, point) => (point.y > best.y ? point : best), metrics.polygon[0]);
  return { x: bottom.x, y: bottom.y + 2 };
}
