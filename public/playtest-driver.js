// Test-only automated playtest driver. Loaded manually from the console during
// ?testSave=1 playtesting: await import('/golden-whale-guild/playtest-driver.js')
// then __installDriver(). Never imported by the game itself.
/* eslint-disable no-console */
export function installDriver() {
  const g = window.game;
  if (!g) throw new Error('no game');
  const TEST_KEY = 'golden-whale-guild-test-save-v2';
  window.__errs = window.__errs || [];
  if (!window.__errHooked) {
    window.__errHooked = true;
    window.addEventListener('error', (e) => window.__errs.push(String(e.message).slice(0, 120)));
  }
  window.__pt = window.__pt || { days: [] };

  window.__snap = function snap() {
    const t = g.scene.getScene('TownScene');
    const inv = t.townInventory || {};
    const heroes = t.getActiveHeroes();
    return {
      day: t.day, gold: Math.round(t.resources.gold),
      tr: Math.round(t.resources.trust), co: Math.round(t.resources.corruption),
      mo: Math.round(t.resources.morale), th: Math.round(t.resources.threat),
      heroes: heroes.length, injured: heroes.filter((h) => t.isHeroInjured(h)).length,
      wood: inv.wood | 0, iron: inv.iron | 0, herbs: inv.herbs | 0, loot: inv.loot | 0, potions: inv.potions | 0,
      bCount: (t.cityState.placedBuildings || []).length,
      lairs: Object.values(t.monsterLairs || {}).filter((l) => l.discovered && !l.cleared).length,
      raids: (t.monsterState?.defence?.activeRaids || []).length,
      objective: t.getOnboardingStep?.()?.id || null,
    };
  };

  window.__ff = async function ff(maxIter = 600) {
    const t = g.scene.getScene('TownScene');
    let clk = t.time.now; let i = 0;
    while (t.cycleRunning && i < maxIter) {
      clk += 480; i += 1; g.loop.step(clk);
      if (i % 40 === 0) await new Promise((r) => setTimeout(r, 3));
    }
    for (let j = 0; j < 6; j += 1) { clk += 120; g.loop.step(clk); }
    return !t.cycleRunning;
  };

  window.__playDay = async function playDay(mode = 'fair') {
    const t = g.scene.getScene('TownScene');
    if (t.saveKey !== TEST_KEY) throw new Error('SAFETY ABORT: not on test key: ' + t.saveKey);
    const acts = []; let choices = 0;
    const inv = () => t.townInventory || {};
    const has = (id) => t.isBuildingPlaced(id);
    const gold = () => t.resources.gold;

    const unposted = (t.availableQuests || []).filter((q) => !q.posted);
    choices += unposted.length;
    const wanted = unposted.filter((q) => (mode === 'premium' ? true : q.type !== 'shady')).slice(0, 2);
    for (const q of wanted) { if (gold() >= q.cost) { t.postQuestFromUi(q.noticeId); acts.push('post'); } }

    const idle = t.getActiveHeroes().filter((h) => !t.isHeroInjured(h) && !(t.postedQuests || []).some((q) => q.assignedHeroId === h.def.id));
    for (const q of (t.postedQuests || []).filter((q) => !q.assignedHeroId)) {
      if (!idle.length) break;
      choices += 1;
      idle.sort((a, b) => (b.stats.power || 0) - (a.stats.power || 0));
      const pick = (q.risk >= 4) ? idle[0] : idle[Math.min(1, idle.length - 1)];
      t.assignQuestHeroFromUi(q.noticeId + ':' + pick.def.id);
      acts.push('assign'); idle.splice(idle.indexOf(pick), 1);
    }

    const catMod = await import('/golden-whale-guild/src/data/buildingCatalog.js');
    const unlocked = (id) => t.isCatalogUnlocked(catMod.getBuildingCatalogEntry(id));
    const tryBuild = (id) => {
      const entry = catMod.getBuildingCatalogEntry(id);
      if (!entry || gold() < entry.cost) return false;
      t.enterBuildMode('building', id);
      for (let r = 2; r < 26; r += 1) for (let dx = -r; dx <= r; dx += 1) for (const dy of [-r, r]) {
        for (const [x, y] of [[104 + dx, 73 + dy], [104 + dy, 73 + dx]]) {
          const v = t.validateBuildPlacement(x, y);
          if (v.valid) { t.placeCatalogBuilding(x, y, id, v.cost); if (t.cancelBuildMode) t.cancelBuildMode(); return true; }
        }
      }
      if (t.cancelBuildMode) t.cancelBuildMode();
      return false;
    };

    const injuredN = t.getActiveHeroes().filter((h) => t.isHeroInjured(h)).length;
    const buildWish = [];
    if (unlocked('potion_shop') && !has('potion_shop')) buildWish.push('potion_shop');
    if (unlocked('watchtower') && !has('watchtower')) buildWish.push('watchtower');
    if ((inv().wood | 0) < 6 && !has('lumber_camp')) buildWish.push('lumber_camp');
    if (!has('storehouse') && ((inv().wood | 0) > 20 || (inv().loot | 0) > 20)) buildWish.push('storehouse');
    if (!has('inn') && unlocked('inn') && t.getActiveHeroes().length >= 5) buildWish.push('inn');
    if (!has('infirmary') && injuredN >= 2) buildWish.push('infirmary');
    if (!has('herbalist_hut') && has('potion_shop') && (inv().herbs | 0) < 3) buildWish.push('herbalist_hut');
    if (!has('sawmill') && unlocked('sawmill') && (inv().wood | 0) >= 10) buildWish.push('sawmill');
    if (!has('guard_post') && unlocked('guard_post') && t.resources.threat >= 55) buildWish.push('guard_post');
    if (!has('monster_hunter_lodge') && unlocked('monster_hunter_lodge') && Object.values(t.monsterLairs || {}).some((l) => l.discovered && !l.cleared)) buildWish.push('monster_hunter_lodge');
    if (mode === 'premium' && unlocked('whale') && !has('whale')) buildWish.unshift('whale');
    choices += buildWish.length;
    for (const id of buildWish) { if (tryBuild(id)) { acts.push('build:' + id); break; } }

    const actWish = [];
    if (has('market') && (inv().loot | 0) >= 3) actWish.push('market:sell_loot');
    if (has('watchtower') && t.resources.threat >= 45 && gold() >= 70) actWish.push('watchtower:patrol');
    if (has('inn') && t.resources.morale < 45 && gold() >= 90) actWish.push('inn:comfort');
    if (has('potion_shop') && injuredN > 0 && gold() >= 70) actWish.push('potion_shop:healing');
    if (mode === 'premium' && has('whale')) actWish.unshift('whale:token_pack');
    choices += actWish.length;
    if (actWish.length) { t.runBuildingAction(actWish[0]); acts.push('act:' + actWish[0].split(':')[1]); }

    if (t.pendingPolicy && t.pendingPolicy.options?.length) {
      choices += 1;
      const opt = mode === 'premium' ? t.pendingPolicy.options[t.pendingPolicy.options.length - 1] : t.pendingPolicy.options[0];
      try { if (t.choosePolicyFromUi) { t.choosePolicyFromUi(opt.id); acts.push('policy'); } } catch (e) { /* noop */ }
    }

    t.runCycle();
    const done = await window.__ff();
    window.__pt.days.push({ ...window.__snap(), acts: acts.length, choices, a: acts.slice(0, 5) });
    return done;
  };

  window.__report = function report(n = 6) {
    return window.__pt.days.slice(-n).map((x) => [x.day, 'g' + x.gold, 'tr' + x.tr, 'co' + x.co, 'mo' + x.mo, 'th' + x.th, 'h' + x.heroes, 'inj' + x.injured, 'w' + x.wood, 'hb' + x.herbs, 'lt' + x.loot, 'po' + x.potions, 'L' + x.lairs, 'R' + x.raids, 'acts' + x.acts, 'ch' + x.choices, (x.a || []).join(',')].join('|'));
  };
  return 'driver installed';
}
