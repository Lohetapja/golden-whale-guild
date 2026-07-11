// All persistence for Golden Whale Guild lives behind this module: key
// constants, safe reads/writes, a rotating backup ring, atomic promotion,
// export/import, and corruption stashing. TownScene never touches localStorage
// keys directly anymore — it asks saveManager for the active key and hands it
// payloads. This keeps the production save key from being manipulated by ad-hoc
// code and gives automated tests a clean isolation seam.

import { migrateAndValidate, summarizeSave, SAVE_VERSION } from './saveMigrations.js';

export { SAVE_VERSION, summarizeSave, migrateAndValidate };

// --- storage keys -----------------------------------------------------------
// The one key real players use. Automated smoke tests MUST NOT touch this.
export const PROD_SAVE_KEY = 'golden-whale-guild-save-v2';
// Isolated key for automated / dev testing (see isTestSaveMode()).
export const TEST_SAVE_KEY = 'golden-whale-guild-test-save-v2';
// UI preferences (hero roster layout). Owned by UIScene; listed here so the
// export bundle and documentation stay complete.
export const UI_PREFS_KEY = 'gwg-hero-roster-ui-v1';
// Rotating backup ring (one key holding newest-first array, capped).
export const BACKUP_RING_KEY = 'golden-whale-guild-backups-v1';
// Where a save that failed to load is parked so it is recoverable, never wiped.
export const BROKEN_SAVE_KEY = 'golden-whale-guild-broken-save-v1';
// Scratch key used only during an atomic write; always cleaned up.
export const TEMP_SAVE_KEY = 'golden-whale-guild-save-tmp';
// Older keys we still read from when migrating a first-time-since-upgrade load.
export const LEGACY_SAVE_KEYS = ['golden-whale-guild-save', 'golden-whale-guild-save-v1'];

export const BACKUP_RING_SIZE = 3;

// --- test-save isolation ----------------------------------------------------
// Test mode is opt-in and obvious: a ?testSave=1 query param, or a global flag
// set by a test harness. Real players never enter it by accident.
export function isTestSaveMode() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.__GWG_USE_TEST_SAVE__) return true;
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('testSave') === '1') return true;
    }
  } catch {
    // location/search may be unavailable; default to production key.
  }
  return false;
}

export function getActiveSaveKey() {
  return isTestSaveMode() ? TEST_SAVE_KEY : PROD_SAVE_KEY;
}

// --- low-level storage guards -----------------------------------------------
function store() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Access can throw in privacy modes.
  }
  return null;
}

export function readRawSave(key) {
  const s = store();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  const s = store();
  if (!s) return false;
  try {
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key) {
  const s = store();
  if (!s) return false;
  try {
    s.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// --- load -------------------------------------------------------------------
// Parse + migrate + validate a raw string. Returns { ok, data, warnings, reason }.
export function loadAndMigrate(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return { ok: false, reason: 'empty' };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, reason: `invalid-json:${err?.message || 'parse'}` };
  }
  return migrateAndValidate(parsed);
}

// Read whichever key is active (or a legacy key on first upgrade), migrate it.
// Returns { ok, data, raw, key, warnings, reason }. `raw` is always the original
// string so the caller can stash it verbatim on failure.
export function loadActiveSave(key = getActiveSaveKey()) {
  let raw = readRawSave(key);
  let sourceKey = key;
  if (!raw && key === PROD_SAVE_KEY) {
    for (const legacy of LEGACY_SAVE_KEYS) {
      const legacyRaw = readRawSave(legacy);
      if (legacyRaw) {
        raw = legacyRaw;
        sourceKey = legacy;
        break;
      }
    }
  }
  if (!raw) return { ok: false, reason: 'no-save', raw: null, key: sourceKey };
  const result = loadAndMigrate(raw);
  return { ...result, raw, key: sourceKey };
}

// --- atomic write -----------------------------------------------------------
// Serialize -> validate -> write temp -> read-back verify -> promote. The
// existing production save is never removed unless a validated replacement is
// confirmed in place first. Returns { ok, error }.
export function writeSaveAtomic(key, payloadObj) {
  let serialized;
  try {
    serialized = JSON.stringify(payloadObj);
  } catch (err) {
    return { ok: false, error: `serialize:${err?.message || 'stringify'}` };
  }

  // Confirm the bytes we are about to persist can be re-loaded.
  const check = loadAndMigrate(serialized);
  if (!check.ok) return { ok: false, error: `validate:${check.reason}` };

  if (!writeRaw(TEMP_SAVE_KEY, serialized)) return { ok: false, error: 'temp-write-failed' };
  const readback = readRawSave(TEMP_SAVE_KEY);
  if (readback !== serialized) {
    removeRaw(TEMP_SAVE_KEY);
    return { ok: false, error: 'temp-verify-failed' };
  }

  if (!writeRaw(key, serialized)) {
    removeRaw(TEMP_SAVE_KEY);
    return { ok: false, error: 'promote-failed' };
  }
  removeRaw(TEMP_SAVE_KEY);
  return { ok: true };
}

// --- backup ring ------------------------------------------------------------
export function readBackupRing() {
  const raw = readRawSave(BACKUP_RING_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackupRing(ring) {
  return writeRaw(BACKUP_RING_KEY, JSON.stringify(ring.slice(0, BACKUP_RING_SIZE)));
}

// Snapshot whatever valid save currently sits at `sourceKey` into the ring.
// Deduped against the newest entry so a repeated identical (or identically
// corrupt) payload does not evict good history. Returns { ok, skipped, reason }.
export function createBackup(sourceKey = getActiveSaveKey(), reason = 'manual') {
  const raw = readRawSave(sourceKey);
  if (!raw) return { ok: false, reason: 'nothing-to-back-up' };

  const ring = readBackupRing();
  if (ring[0] && ring[0].payload === raw) return { ok: true, skipped: true, reason: 'duplicate' };

  const loaded = loadAndMigrate(raw);
  const meta = loaded.ok ? summarizeSave(loaded.data) : { corrupt: true };
  const entry = {
    payload: raw,
    meta: {
      ...meta,
      reason,
      timestamp: new Date().toISOString(),
      valid: loaded.ok,
    },
  };
  ring.unshift(entry);
  writeBackupRing(ring);
  return { ok: true, meta: entry.meta };
}

// Create at most one automatic backup per in-game day to avoid write spam.
export function maybeCreateDailyBackup(sourceKey = getActiveSaveKey(), day = 1) {
  const ring = readBackupRing();
  const newest = ring[0];
  if (newest && newest.meta && newest.meta.reason === 'daily' && Number(newest.meta.day) === Number(day)) {
    return { ok: true, skipped: true };
  }
  return createBackup(sourceKey, 'daily');
}

export function listBackups() {
  return readBackupRing().map((entry, index) => ({ index, meta: entry.meta || {} }));
}

// Restore ring[index] into destKey. The current save is snapshotted first so a
// restore is itself undoable. Returns { ok, error, meta }.
export function restoreBackup(index, destKey = getActiveSaveKey()) {
  const ring = readBackupRing();
  const entry = ring[index];
  if (!entry) return { ok: false, error: 'no-such-backup' };
  const loaded = loadAndMigrate(entry.payload);
  if (!loaded.ok) return { ok: false, error: `backup-invalid:${loaded.reason}` };

  createBackup(destKey, 'pre-restore');
  const result = writeSaveAtomic(destKey, loaded.data);
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, meta: entry.meta };
}

// --- broken-save stash ------------------------------------------------------
// Park a save that failed to load so a new game does not destroy it.
export function stashBrokenSave(raw, reason = 'unknown') {
  if (typeof raw !== 'string' || !raw) return { ok: false };
  const wrapper = JSON.stringify({ reason, timestamp: new Date().toISOString(), payload: raw });
  const ok = writeRaw(BROKEN_SAVE_KEY, wrapper);
  return { ok };
}

export function readBrokenSave() {
  const raw = readRawSave(BROKEN_SAVE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { reason: 'unreadable', payload: raw };
  }
}

// --- export / import (DOM helpers) ------------------------------------------
export function buildExportBundle(payloadObj, preferences = null) {
  const summary = summarizeSave(payloadObj);
  return {
    format: 'golden-whale-guild-save',
    exportedAt: new Date().toISOString(),
    saveVersion: summary.saveVersion,
    town: { rank: summary.rank, day: summary.day, buildings: summary.buildings, heroes: summary.heroes },
    save: payloadObj,
    preferences: preferences || undefined,
  };
}

export function exportFilename(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return `golden-whale-guild-save-${iso}.json`;
}

export function downloadTextFile(filename, text) {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

// Open a file picker and resolve with the file's text (or null if cancelled).
export function pickSaveFile() {
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.style.display = 'none';
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(value);
      };
      input.addEventListener('change', () => {
        const file = input.files && input.files[0];
        if (!file) return finish(null);
        const reader = new FileReader();
        reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => finish(null);
        reader.readAsText(file);
      });
      // If the dialog is cancelled there is no reliable event; a focus fallback
      // resolves null so callers never hang.
      window.addEventListener('focus', () => setTimeout(() => finish(null), 500), { once: true });
      document.body.appendChild(input);
      input.click();
    } catch {
      resolve(null);
    }
  });
}

// Parse imported text (accepts a full export bundle or a bare save), migrate and
// validate it. Returns { ok, data, meta, preferences, reason }.
export function parseImportedSave(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'empty-file' };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, reason: `invalid-json:${err?.message || 'parse'}` };
  }
  const candidate = parsed && typeof parsed === 'object' && parsed.save && typeof parsed.save === 'object'
    ? parsed.save
    : parsed;
  const result = migrateAndValidate(candidate);
  if (!result.ok) return { ok: false, reason: result.reason };
  return {
    ok: true,
    data: result.data,
    meta: summarizeSave(result.data),
    preferences: parsed && typeof parsed === 'object' ? (parsed.preferences || null) : null,
    warnings: result.warnings,
  };
}

// --- reset ------------------------------------------------------------------
// Safe reset: back up the current town, then remove ONLY the active save key
// (never localStorage.clear()). The pre-reset backup and any broken stash
// survive for recovery. UI prefs are intentionally preserved.
export function safeReset(key = getActiveSaveKey()) {
  createBackup(key, 'pre-reset');
  removeRaw(key);
  return { ok: true };
}

// Apply an imported/validated save object to the active key atomically, backing
// up the current save first. Returns { ok, error }.
export function applyImportedSave(data, key = getActiveSaveKey()) {
  createBackup(key, 'pre-import');
  return writeSaveAtomic(key, data);
}
