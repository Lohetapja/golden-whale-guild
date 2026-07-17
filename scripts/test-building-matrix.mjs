// Building catalog matrix tests. Run: node scripts/test-building-matrix.mjs
//
// Validates every catalog building's static contract: definition shape, build
// menu membership, unlock keys, action definitions, asset resolution to real
// files on disk, and unique/repeatable count rules. Failures name the exact
// building. (Runtime placement/upgrade behaviour is exercised in the browser
// with ?testSave=1 — this file covers everything verifiable headlessly.)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const { BUILDING_CATALOG, BUILD_MENU_CATEGORIES } = await import('../src/data/buildingCatalog.js');
const { ASSET_MANIFEST } = await import('../src/data/assetManifest.js');

let passed = 0; let failed = 0; const failures = [];
function check(name, cond) {
  if (cond) { passed += 1; } else { failed += 1; failures.push(name); console.log(`FAIL  ${name}`); }
}

const manifestByKey = Object.fromEntries(ASSET_MANIFEST.map((a) => [a.key, a]));
const menuIds = new Set(BUILD_MENU_CATEGORIES.flatMap((c) => c.buildingIds));

// Unlock keys the runtime switch in TownScene.isCatalogUnlocked understands.
// Keep in sync when adding unlock conditions (unknown keys unlock by default,
// which would silently ignore a typo — so we assert membership here).
const KNOWN_UNLOCK_KEYS = new Set(['tavern', 'hostel', 'failedQuest', 'watchtower', 'bank', 'mentor',
  'arena', 'whale2', 'whale3', 'lootbox', 'premiumItems', 'stage2', 'rank1', 'rank2', 'premiumProduction']);

// Explicit unique-building rule (design intent: singular civic/premium landmarks).
const EXPECTED_UNIQUE = new Set(['guildhall', 'whale', 'dungeon']);

const seenIds = new Set();
for (const b of BUILDING_CATALOG) {
  const tag = `[${b.id}]`;
  check(`${tag} unique id`, !seenIds.has(b.id)); seenIds.add(b.id);
  check(`${tag} has name/category/cost`, Boolean(b.name && b.category) && Number.isFinite(b.cost) && b.cost >= 0);
  check(`${tag} footprint valid`, Number.isInteger(b.footprint?.w) && Number.isInteger(b.footprint?.h) && b.footprint.w >= 1 && b.footprint.h >= 1);
  check(`${tag} in a build menu category`, menuIds.has(b.id));
  check(`${tag} unlock key known`, !b.unlockKey || KNOWN_UNLOCK_KEYS.has(b.unlockKey));
  check(`${tag} locked entries explain themselves`, !b.unlockKey || Boolean(b.lockReason));
  check(`${tag} maxCount sane`, Number.isInteger(b.maxCount) && b.maxCount >= 1);
  if (EXPECTED_UNIQUE.has(b.id)) check(`${tag} unique landmark maxCount=1`, b.maxCount === 1);

  // Asset must resolve to a real file on disk (manifest path exists), or be a
  // known generated-placeholder fallback pattern.
  const asset = manifestByKey[b.assetKey];
  const assetFile = asset ? join(root, 'public', asset.path) : null;
  check(`${tag} world asset '${b.assetKey}' in manifest`, Boolean(asset));
  if (asset) check(`${tag} world asset file exists`, existsSync(assetFile));

  // Every declared action has id/label/summary and numeric cost + delta object.
  for (const a of (b.actions || [])) {
    check(`${tag} action '${a.id}' shape`, Boolean(a.id && a.label && a.summary) && Number.isFinite(a.cost) && a.deltas && typeof a.deltas === 'object');
    // consumes (inventory sink) must be a map of positive integers when present
    if (a.consumes !== undefined) {
      check(`${tag} action '${a.id}' consumes shape`, a.consumes && typeof a.consumes === 'object'
        && Object.values(a.consumes).every((n) => Number.isInteger(n) && n > 0));
    }
  }
  // Trade-style actions must actually consume inventory (regression: sell_loot
  // once printed gold while loot piled up).
  if (b.id === 'market') {
    const sell = (b.actions || []).find((a) => a.id === 'sell_loot');
    check('[market] sell_loot consumes loot', Boolean(sell?.consumes?.loot >= 1));
  }
}

// Menu references must all exist in the catalog.
const catalogIds = new Set(BUILDING_CATALOG.map((b) => b.id));
for (const cat of BUILD_MENU_CATEGORIES) {
  for (const id of cat.buildingIds) {
    check(`menu '${cat.id}' references real building '${id}'`, catalogIds.has(id));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) { console.log('Failures:', failures.join(' | ')); process.exit(1); }
