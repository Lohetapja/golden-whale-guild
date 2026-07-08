// Asset pipeline: the boot scene probes every optional manifest slot first.
// Only files that actually exist are queued in Phaser's loader; anything
// missing falls back to generated placeholder art (src/textures.js).
//
// FALLBACK RULES
//   1. If the file at manifest `path` loaded, its texture key wins.
//   2. Heroes: if the personality sheet is missing but hero_default exists,
//      hero_default is used.
//   3. Otherwise the generated `ph-*` placeholder (temporary debug art) is used.
import { BUILDINGS } from './data/buildings.js';
import { HEROES } from './data/heroes.js';
import { makeAmbientTextures, makeIconPlaceholders } from './textures.js';

// call from scene.preload(): queue the manifest slots confirmed by BootScene.
export function loadAssets(scene) {
  const availableAssets = scene.registry.get('availableAssets') || [];
  for (const entry of availableAssets) {
    if (entry.type === 'spritesheet') {
      scene.load.spritesheet(entry.key, entry.path, entry.frameConfig);
    } else {
      scene.load.image(entry.key, entry.path);
    }
  }
}

// call from scene.create(): generate placeholder art for every slot that
// didn't load, and log one summary line so it's obvious what's still fake
export function ensureFallbacks(scene) {
  makeAmbientTextures(scene);
  makeIconPlaceholders(scene);

  const placeholders = [];
  for (const b of BUILDINGS) {
    if (!scene.textures.exists(b.assetKey)) {
      b.fallback(scene, b);
      placeholders.push(b.assetKey);
    }
  }
  const hasDefaultHero = scene.textures.exists('hero_default');
  for (const h of HEROES) {
    if (!scene.textures.exists(h.assetKey) && !hasDefaultHero) {
      h.fallback(scene, h);
      placeholders.push(`${h.assetKey} (${h.id})`);
    }
  }

  if (placeholders.length > 0) {
    // eslint-disable-next-line no-console
    console.info(`[GWG assets] placeholder art in use for: ${placeholders.join(', ')}`);
  }
}

// resolve a manifest key to itself or a fallback texture key
export function resolveTexture(scene, assetKey, fallbackKey = null) {
  return scene.textures.exists(assetKey) ? assetKey : fallbackKey;
}

export function buildingTexture(scene, def) {
  return resolveTexture(scene, def.assetKey, `ph-${def.id}`);
}

export function heroTexture(scene, def) {
  if (scene.textures.exists(def.assetKey)) return def.assetKey;
  if (scene.textures.exists('hero_default')) return 'hero_default';
  return `ph-${def.id}`;
}
