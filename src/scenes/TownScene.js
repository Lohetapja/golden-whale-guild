// The town map: terrain, buildings, wandering heroes, and the day simulation.
// All important game objects resolve their texture through src/assets.js so
// real sprites can replace placeholder art without touching this file.
import Phaser from 'phaser';
import { BUILDINGS } from '../data/buildings.js';
import { DECORATIONS, PATH_NODES } from '../data/decorations.js';
import { HEROES } from '../data/heroes.js';
import { rollHeroEvent, WHALE_FLAVOR } from '../data/events.js';
import { OBJECTIVES } from '../data/objectives.js';
import { rollQuestNotices } from '../data/quests.js';
import {
  DENIED_LINES,
  IDLE_QUIPS,
  QUEUE_LINES,
  THREAT_REACTIONS,
  WHALE_REACTIONS,
} from '../data/dialogue.js';
import {
  getUpgradeCost,
  getUpgradeDef,
  getUpgradeEffect,
  getUpgradeFlavor,
} from '../data/upgrades.js';
import { loadAssets, ensureFallbacks, resolveTexture, buildingTexture, heroTexture } from '../assets.js';

const WIDTH = 1280;
const HEIGHT = 720;
const WORLD_WIDTH = 1480;
const WORLD_HEIGHT = 860;
const PLAZA = { x: 610, y: 410 };
const STEP_MS = 950; // pacing of the day-cycle playback
const MAX_IDLE_BUBBLES = 2;
const MAX_IMPORTANT_BUBBLES = 4;
const BUBBLE_MIN_SPACING = 150;
const MAX_FLOATING_TEXTS = 12;
const COIN_BURST_COOLDOWN_MS = 450;
const SAVE_KEY = 'golden-whale-guild-save-v2';
const TAP_MOVE_THRESHOLD = 14;

const QUEST_NOTICE_SPOTS = [
  { x: 318, y: 182 },
  { x: 532, y: 182 },
  { x: 426, y: 296 },
];

const HERO_GROUPS = {
  honest: ['Honest Grinder', 'Broke Optimist', 'Free Trial Paladin', 'Disillusioned Blacksmith'],
  whale: ['Noble Whale', 'Whale Apprentice', 'Premium Monk', 'Overleveled Toddler'],
  debt: ['Debt Goblin', 'Debt Collector', 'Bankrupt Bard', 'Refund Seeker'],
  veteran: ['Veteran', 'Angry Veteran', 'Balance Refugee', 'Ragequitter'],
};

const RES_COLORS = {
  gold: '#f6c945',
  trust: '#7fdc93',
  corruption: '#c99aec',
  morale: '#f0938f',
  threat: '#d4dae2',
};
const RES_SHORT = { gold: 'g', trust: ' Trust', corruption: ' Corr', morale: ' Morale', threat: ' Threat' };

const LOCKABLE_LOCATION_IDS = new Set([
  'complaint_barrel',
  'debt_collector_booth',
  'balance_memorial',
  'refund_denial_desk',
  'sponsored_quest_board',
  'ethics_fountain',
]);

const START_UNLOCKED_LOCATIONS = [
  'notice_board',
  'vip_rope_entrance',
  'poor_hero_queue',
];

const WHALE_PURCHASES = [
  'Sword of Unfair Advantage',
  'Deluxe Struggle Removal Bundle',
  'Premium Knees',
  'Loot Priority Blessing',
  'Revive Insurance Scroll',
  'Dragon Mount Trial',
  'Confidence Booster Soup',
  'Legendary Receipt',
  'Sponsored Armor of Plausible Skill',
  'Queue Skip Relic',
];

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    loadAssets(this);
  }

  create() {
    ensureFallbacks(this);
    this.input.mouse?.disableContextMenu();
    this.input.addPointer(2);
    this.setupCameraControls();

    const saved = this.loadSavedState();
    this.day = saved?.day || 1;
    this.resources = saved?.resources || { gold: 500, trust: 50, corruption: 10, morale: 60, threat: 20 };
    this.upgradeLevels = saved?.upgradeLevels || {};
    this.stats = {
      questsPosted: 0,
      questsCompleted: 0,
      totalGoldEarned: 0,
      honestQuestSuccesses: 0,
      threatEventsSurvived: 0,
      trustStreak: 0,
      whaleEvents: 0,
      ...(saved?.stats || {}),
    };
    this.completedObjectives = new Set(saved?.completedObjectives || []);
    this.unlockedLocations = new Set([
      ...START_UNLOCKED_LOCATIONS,
      ...(saved?.unlockedLocations || []),
    ]);
    this.availableQuests = saved?.availableQuests?.length ? saved.availableQuests : rollQuestNotices(this.day);
    this.postedQuests = saved?.postedQuests || [];
    this.savedHeroStats = saved?.heroStats || {};
    this.cycleRunning = false;
    this.lastUpgradeAt = 0;

    this.buildTerrain();
    this.buildBuildings();
    this.buildDecorations();
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));
    this.placeById = { ...this.buildingById, ...this.decorationById };
    this.upgradeVisualsById = {};
    this.refreshAllUpgradeVisuals();
    this.activeBubbles = 0;
    this.importantChatterUntil = 0;
    this.floaters = [];
    this.lastCoinBurstAt = -COIN_BURST_COOLDOWN_MS;
    this.buildTooltip();
    this.buildHeroes();
    this.buildQuestNotices();
    this.startIdleChatter();

    // shared state for the UI scene
    this.registry.set('day', this.day);
    this.registry.set('resources', { ...this.resources });
    this.publishObjectives();
    this.publishTownHint();
    this.checkUnlocks(true);

    this.scene.launch('UIScene');
    this.game.events.on('gwg-end-day', this.runCycle, this);
    this.game.events.on('gwg-save', this.saveGame, this);
    this.game.events.on('gwg-reset', this.resetGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-end-day', this.runCycle, this);
      this.game.events.off('gwg-save', this.saveGame, this);
      this.game.events.off('gwg-reset', this.resetGame, this);
    });

    this.game.events.emit('gwg-event', 'Welcome to Golden Whale Guild. Post quests, inspect heroes, upgrade buildings, then Open Gates.');
  }

  loadSavedState() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setupCameraControls() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.setScroll(0, 0);

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');
    this.cameraDrag = { active: false, moved: false, lastX: 0, lastY: 0 };

    this.input.on('pointerdown', (pointer) => {
      if (!pointer.primaryDown) return;
      this.cameraDrag.active = true;
      this.cameraDrag.moved = false;
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.cameraDrag.active || !pointer.primaryDown) return;
      const dx = pointer.x - this.cameraDrag.lastX;
      const dy = pointer.y - this.cameraDrag.lastY;
      const total = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
      if (total > TAP_MOVE_THRESHOLD) this.cameraDrag.moved = true;
      if (this.cameraDrag.moved) {
        cam.scrollX = Phaser.Math.Clamp(cam.scrollX - dx, 0, WORLD_WIDTH - WIDTH);
        cam.scrollY = Phaser.Math.Clamp(cam.scrollY - dy, 0, WORLD_HEIGHT - HEIGHT);
      }
      this.cameraDrag.lastX = pointer.x;
      this.cameraDrag.lastY = pointer.y;
    });

    this.input.on('pointerup', () => {
      if (this.cameraDrag.moved) this.suppressTapUntil = this.time.now + 120;
      this.cameraDrag.active = false;
    });
  }

  wasDragGesture(pointer) {
    if (!pointer) return this.time.now < (this.suppressTapUntil || 0);
    const dist = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
    return dist > TAP_MOVE_THRESHOLD || this.time.now < (this.suppressTapUntil || 0);
  }

  getVisibleWorldRect() {
    const cam = this.cameras.main;
    return {
      left: cam.scrollX,
      top: cam.scrollY,
      right: cam.scrollX + WIDTH,
      bottom: cam.scrollY + HEIGHT,
    };
  }

  getSavePayload() {
    return {
      day: this.day,
      resources: { ...this.resources },
      upgradeLevels: { ...this.upgradeLevels },
      availableQuests: this.availableQuests,
      postedQuests: this.postedQuests,
      unlockedLocations: [...this.unlockedLocations],
      completedObjectives: [...this.completedObjectives],
      stats: { ...this.stats },
      heroStats: Object.fromEntries((this.heroes || []).map((hero) => [hero.def.id, {
        power: hero.stats.power,
        gold: hero.stats.gold,
        spent: hero.stats.spent,
        morale: hero.stats.morale,
        debt: hero.stats.debt,
        loyalty: hero.stats.loyalty,
        whaleAccess: hero.stats.whaleAccess,
        awayUntil: hero.awayUntil || 0,
      }])),
    };
  }

  saveGame(showEvent = true) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.getSavePayload()));
      if (showEvent) {
        this.game.events.emit('gwg-event', 'Guild records saved locally. No cloud. No account. Just paperwork.');
      }
      return true;
    } catch {
      if (showEvent) this.game.events.emit('gwg-event', 'The save clerk dropped the ledger. Local save failed politely.');
      return false;
    }
  }

  resetGame() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Local storage may be blocked; reloading still returns to the default state.
    }
    window.location.reload();
  }

  isHonestHero(def) {
    return HERO_GROUPS.honest.includes(def.personality);
  }

  isWhaleHero(def) {
    return HERO_GROUPS.whale.includes(def.personality);
  }

  isDebtHero(def) {
    return HERO_GROUPS.debt.includes(def.personality);
  }

  isVeteranHero(def) {
    return HERO_GROUPS.veteran.includes(def.personality);
  }

  getActiveHeroes() {
    return this.heroes.filter((hero) => hero.awayUntil <= this.day && hero.state !== 'away');
  }

  returnAwayHeroes() {
    for (const hero of this.heroes) {
      if (hero.state === 'away' && hero.awayUntil <= this.day) {
        hero.state = 'idle';
        hero.container.setAlpha(1);
        hero.stats.loyalty = Math.max(25, hero.stats.loyalty - 8);
        this.say(hero, 'I came back. The economy did not improve.', true);
        this.scheduleAmbient(hero, Phaser.Math.Between(900, 2400));
      }
    }
  }

  getObjectiveState() {
    return {
      day: this.day,
      resources: this.resources,
      levels: Object.fromEntries(Object.values(this.placeById || {}).map((place) => [
        place.id,
        this.getPlaceLevel(place),
      ])),
      stats: this.stats,
    };
  }

  publishObjectives() {
    const active = OBJECTIVES
      .filter((objective) => !this.completedObjectives.has(objective.id))
      .slice(0, 3)
      .map((objective) => objective.text);
    this.registry.set('objectives', {
      active,
      completed: this.completedObjectives.size,
      total: OBJECTIVES.length,
    });
    this.publishTownHint();
  }

  getTownHint() {
    const R = this.resources;
    if (this.cycleRunning) return 'Town Problem: gates are open. Watch the consequences.';
    if (R.threat >= 76) return 'Warning: Threat is rising. Post safer quests.';
    if (R.trust < 34) return 'Warning: Trust is low. Honest heroes may leave.';
    if (R.morale < 34) return 'Town Problem: heroes are losing morale.';
    if (R.corruption >= 66) return 'Warning: Corruption is profitable and very awake.';
    if (this.postedQuests.length === 0) return 'Goal: Post a quest near the Guild Hall.';

    const whale = this.buildingById?.whale;
    const whaleInfo = whale ? this.getUpgradeInfo(whale) : null;
    if (whaleInfo?.cost && this.resources.gold >= whaleInfo.cost) {
      return 'Temptation: Golden Whale upgrade available.';
    }

    const canUpgrade = Object.values(this.placeById || {}).some((place) => {
      if (!this.isLocationUnlocked(place.id)) return false;
      const info = this.getUpgradeInfo(place);
      return info.cost && !info.maxed && R.gold >= info.cost;
    });
    if (canUpgrade) return 'Goal: Upgrade a building before opening gates.';
    return 'Goal: Open Gates when your bad choices are ready.';
  }

  publishTownHint() {
    if (!this.registry) return;
    this.registry.set('townHint', this.getTownHint());
  }

  checkObjectives() {
    if (this.checkingObjectives || !this.placeById) return;
    this.checkingObjectives = true;
    const state = this.getObjectiveState();
    for (const objective of OBJECTIVES) {
      if (this.completedObjectives.has(objective.id)) continue;
      if (!objective.complete(state)) continue;

      this.completedObjectives.add(objective.id);
      this.applyDeltas(objective.reward || {});
      this.game.events.emit('gwg-event', objective.event);
    }
    this.checkingObjectives = false;
    this.publishObjectives();
  }

  isLocationUnlocked(id) {
    if (!id || !LOCKABLE_LOCATION_IDS.has(id)) return true;
    return this.unlockedLocations?.has(id);
  }

  getMaxHeroDebt() {
    return Math.max(0, ...(this.heroes || []).map((hero) => hero.stats?.debt || 0));
  }

  checkUnlocks(silent = false) {
    if (!this.unlockedLocations) return;
    const whaleLevel = this.buildingById?.whale ? this.getPlaceLevel(this.buildingById.whale) : 1;
    const guildLevel = this.buildingById?.guildhall ? this.getPlaceLevel(this.buildingById.guildhall) : 1;
    const rules = [
      ['complaint_barrel', this.day >= 3 || this.resources.trust < 60, 'Complaint Barrel unlocked. The town discovered official yelling.'],
      ['debt_collector_booth', this.resources.corruption > 40 || this.getMaxHeroDebt() > 500, 'Debt Collector Booth unlocked. The small print found a desk.'],
      ['sponsored_quest_board', this.day >= 4 || guildLevel >= 2, 'Sponsored Quest Board unlocked. Danger now has tasteful branding.'],
      ['balance_memorial', this.stats.whaleEvents > 0 || this.resources.corruption > 55, 'Balance Memorial unlocked. Veterans requested a place to sigh.'],
      ['ethics_fountain', this.resources.corruption >= 55, 'Fountain of Questionable Ethics unlocked. Coins enter. Principles get wet.'],
      ['refund_denial_desk', whaleLevel >= 3, 'Refund Denial Desk unlocked. Hope now has business hours.'],
    ];

    for (const [id, condition, text] of rules) {
      if (!condition || this.unlockedLocations.has(id)) continue;
      this.unlockedLocations.add(id);
      this.updateDecorationLockState(id);
      if (!silent) {
        const place = this.decorationById?.[id];
        if (place) this.floatText(place.x, place.y - (place.h || 48) - 14, 'UNLOCKED', '#ffe08a');
        this.game.events.emit('gwg-event', text);
      }
    }
    this.publishTownHint();
  }

  // --- world ------------------------------------------------------------

  buildTerrain() {
    this.add.tileSprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 'grass');

    const path = this.add.graphics();
    path.fillStyle(0xd9bc85);
    path.fillCircle(PLAZA.x, PLAZA.y, 76);

    const pathTargets = [
      ...BUILDINGS.map((b) => ({ x: b.x, y: b.y + 8 })),
      ...DECORATIONS.filter((d) => d.path).map((d) => ({ x: d.x, y: d.y })),
      ...PATH_NODES,
    ];
    for (const target of pathTargets) {
      this.stampPath(path, PLAZA.x, PLAZA.y, target.x, target.y);
    }

    const nodeById = Object.fromEntries(PATH_NODES.map((n) => [n.id, n]));
    const pathLinks = [
      ['path-west-curve', 'path-south-west'],
      ['path-south-west', 'path-market-bend'],
      ['path-market-bend', 'path-training-bend'],
      ['path-training-bend', 'path-dungeon-bend'],
      ['path-dungeon-bend', 'path-whale'],
      ['path-north', 'path-whale'],
    ];
    for (const [from, to] of pathLinks) {
      this.stampPath(path, nodeById[from].x, nodeById[from].y, nodeById[to].x, nodeById[to].y);
    }
  }

  stampPath(g, x1, y1, x2, y2) {
    // stamped circles read as a hand-laid dirt trail
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const steps = Math.ceil(dist / 9);
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const x = Phaser.Math.Linear(x1, x2, t) + Phaser.Math.Between(-3, 3);
      const y = Phaser.Math.Linear(y1, y2, t) + Phaser.Math.Between(-3, 3);
      g.fillStyle(Math.random() < 0.15 ? 0xc3a76f : 0xd9bc85);
      g.fillCircle(x, y, 10);
    }
  }

  buildBuildings() {
    this.doorSpots = [];
    this.buildingById = {};
    this.placeSpriteById = {};

    for (const b of BUILDINGS) {
      this.buildingById[b.id] = b;
      this.add.ellipse(b.x, b.y - 8, b.w * 0.8, 26, 0x10151d, 0.22).setDepth(b.y - 2);
      const img = this.add.image(b.x, b.y, buildingTexture(this, b))
        .setOrigin(0.5, 1)
        .setDepth(b.y)
        .setInteractive({ useHandCursor: true });
      img.setData('baseScaleX', img.scaleX);
      img.setData('baseScaleY', img.scaleY);
      this.placeSpriteById[b.id] = img;

      // hover/click feedback: tint plus a small grow pop
      img.on('pointerover', () => {
        img.setTint(0xfff3c0);
        this.tweens.add({ targets: img, scale: 1.03, duration: 90 });
      });
      img.on('pointerout', () => {
        img.clearTint();
        this.tweens.add({ targets: img, scale: 1, duration: 90 });
      });
      img.on('pointerup', (pointer) => {
        if (this.wasDragGesture(pointer)) return;
        this.showTooltip(b);
      });

      // name plate under each building keeps the map readable
      this.add.text(b.x, b.y + 4, b.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fff6dc',
        stroke: '#0c1118',
        strokeThickness: 2,
        backgroundColor: '#0f1521cc',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5, 0).setDepth(2000);

      // whale door spot sits in front of the VIP rope, not on the doorstep
      const doorY = b.id === 'whale' ? b.y + 44 : b.y + 18;
      this.doorSpots.push({ id: b.id, x: b.x, y: doorY });
    }
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));

    this.buildWhaleStationDressing();

    // training yard props
    const yard = this.buildingById.training;
    this.add.image(yard.x - 90, yard.y - 8, 'dummy').setOrigin(0.5, 1).setDepth(yard.y - 8);
    this.add.image(yard.x + 88, yard.y - 2, 'dummy').setOrigin(0.5, 1).setDepth(yard.y - 2);
  }

  buildDecorations() {
    this.decorationById = {};
    this.decorationObjectsById = {};
    for (const d of DECORATIONS) {
      this.decorationById[d.id] = d;
      const key = resolveTexture(this, d.assetKey, d.fallbackKey);
      if (!key) continue;

      this.decorationObjectsById[d.id] = [];
      const shadow = this.add.ellipse(d.x, d.y - 5, (d.w || 42) * 0.72, 15, 0x10151d, 0.16)
        .setDepth(d.y - 2);
      this.decorationObjectsById[d.id].push(shadow);
      const img = this.add.image(d.x, d.y, key)
        .setOrigin(0.5, 1)
        .setDepth(d.y + (d.depthOffset || 0));
      this.placeSpriteById[d.id] = img;
      this.decorationObjectsById[d.id].push(img);

      if (d.scale) img.setScale(d.scale);
      img.setData('baseScaleX', img.scaleX);
      img.setData('baseScaleY', img.scaleY);

      if (d.fallbackKey === 'tree') {
        this.tweens.add({
          targets: img,
          angle: { from: -1.2, to: 1.2 },
          duration: Phaser.Math.Between(1800, 3200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 1500),
        });
      }

      if (d.interactive) {
        img.setInteractive({ useHandCursor: true });
        img.on('pointerover', () => img.setTint(this.isLocationUnlocked(d.id) ? 0xfff3c0 : 0x9aa3b5));
        img.on('pointerout', () => {
          if (this.isLocationUnlocked(d.id)) img.clearTint();
          else img.setTint(0x6f7787);
        });
        img.on('pointerup', (pointer) => {
          if (this.wasDragGesture(pointer)) return;
          if (!this.isLocationUnlocked(d.id)) {
            this.game.events.emit('gwg-event', `${d.name} is still locked. The town has not earned that problem yet.`);
            this.floatText(d.x, d.y - (d.h || 44) - 10, 'LOCKED', '#d4dae2');
            return;
          }
          this.showTooltip(d);
        });
      }

      if (d.label) {
        const label = this.add.text(d.x, d.y + 4, d.name, {
          fontFamily: '"Courier New", monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fff6dc',
          stroke: '#0c1118',
          strokeThickness: 2,
          backgroundColor: '#0f1521cc',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 0).setDepth(2000);
        this.decorationObjectsById[d.id].push(label);
      }

      if (d.spot) {
        this.doorSpots.push({ id: d.id, x: d.x, y: d.y + 8 });
      }
      this.updateDecorationLockState(d.id);
    }
  }

  updateDecorationLockState(id) {
    const objects = this.decorationObjectsById?.[id];
    if (!objects) return;
    const unlocked = this.isLocationUnlocked(id);
    for (const obj of objects) {
      obj.setAlpha(unlocked ? 1 : 0.34);
      if (obj.setTint) {
        if (unlocked) obj.clearTint?.();
        else obj.setTint(0x6f7787);
      }
    }
  }

  clearQuestNotices() {
    for (const container of this.questNoticeContainers || []) container.destroy();
    this.questNoticeContainers = [];
  }

  buildQuestNotices() {
    this.clearQuestNotices();
    this.questNoticeContainers = [];

    this.availableQuests.forEach((quest, index) => {
      const spot = QUEST_NOTICE_SPOTS[index] || QUEST_NOTICE_SPOTS[0];
      const container = this.createQuestNotice(quest, spot.x, spot.y);
      this.questNoticeContainers.push(container);
    });
  }

  createQuestNotice(quest, x, y) {
    quest.noticeX = x;
    quest.noticeY = y;
    const w = 182;
    const h = 96;
    const container = this.add.container(x, y).setDepth(3600);
    const bg = this.add.graphics();
    const drawBg = (hover = false) => {
      bg.clear();
      bg.fillStyle(quest.posted ? 0x4c3a20 : hover ? 0xfff1c4 : 0xf2ead8, 0.96);
      bg.fillRoundedRect(0, 0, w, h, 4);
      bg.lineStyle(2, quest.posted ? 0xf6c945 : 0x6b4a2b, 0.95);
      bg.strokeRoundedRect(0, 0, w, h, 4);
      bg.fillStyle(0x6b4a2b, 0.22);
      bg.fillRect(8, 8, w - 16, 3);
    };
    drawBg();

    const title = this.add.text(8, 10, quest.name, {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: quest.posted ? '#ffe08a' : '#1d2430',
      wordWrap: { width: w - 16 },
    });
    const body = this.add.text(8, 35, [
      `${quest.type.toUpperCase()} | Cost ${quest.cost}g -> ${quest.reward}g`,
      `Diff ${quest.difficulty}  Risk ${quest.risk}  Threat -${quest.threatReduction}`,
      quest.description,
      quest.posted ? 'POSTED: resolves next cycle' : 'Tap to post bounty',
    ].join('\n'), {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      fontStyle: 'bold',
      color: quest.posted ? '#fff6dc' : '#243042',
      lineSpacing: 2,
      wordWrap: { width: w - 16 },
    });
    body.setMaxLines(4);
    container.add([bg, title, body]);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => {
      if (!quest.posted) drawBg(true);
    });
    container.on('pointerout', () => drawBg(false));
    container.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.postQuest(quest);
    });
    return container;
  }

  postQuest(quest) {
    if (this.cycleRunning || quest.posted) return;
    if (this.resources.gold < quest.cost) {
      this.floatText(quest.noticeX || 500, quest.noticeY || 250, 'NOT ENOUGH GOLD', '#f0938f');
      this.game.events.emit('gwg-event', Phaser.Utils.Array.GetRandom([
        'Not enough gold. Please exploit responsibly.',
        'The accountant suggests more whales.',
        'Try selling fairness. It was decorative anyway.',
      ]));
      return;
    }

    this.applyDeltas({ gold: -quest.cost });
    const postedQuest = { ...quest, posted: true, status: 'posted' };
    this.postedQuests.push(postedQuest);
    this.availableQuests = this.availableQuests.map((item) => (
      item.noticeId === quest.noticeId ? postedQuest : item
    ));
    this.stats.questsPosted += 1;
    this.game.events.emit('gwg-event', `Posted ${quest.name} for ${quest.cost}g. Heroes will make it worse shortly.`);
    this.floatText(QUEST_NOTICE_SPOTS[0].x + 80, QUEST_NOTICE_SPOTS[0].y - 8, 'QUEST POSTED', '#ffe08a');
    this.buildQuestNotices();
    this.checkObjectives();
    this.publishTownHint();
    this.saveGame(false);

    const clerk = this.heroes?.find((hero) => hero.def.personality === 'Guild Clerk');
    if (clerk) this.say(clerk, 'Quest posted. Liability pending.', true);
  }

  refreshQuestNotices() {
    this.availableQuests = rollQuestNotices(this.day);
    this.postedQuests = [];
    this.buildQuestNotices();
  }

  buildWhaleStationDressing() {
    // Golden Whale Milking Station: glow, coins, carpet, VIP rope. Peak premium.
    const whale = this.buildingById.whale;
    const coinKey = resolveTexture(this, 'icon_coin', 'ph-icon_coin');

    const glow = this.add.image(whale.x, whale.y - 60, 'glow')
      .setDepth(whale.y - whale.h - 1)
      .setScale(2.6)
      .setAlpha(0.62);
    this.tweens.add({
      targets: glow, alpha: 0.95, scale: 2.95,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const profitHalo = this.add.image(whale.x, whale.y - 18, 'glow')
      .setDepth(whale.y - 2)
      .setScale(1.45)
      .setAlpha(0.35);
    this.tweens.add({
      targets: profitHalo, angle: 360, alpha: 0.62,
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // real whale sign asset floats above the door once it exists
    const signKey = resolveTexture(this, 'icon_whale', 'ph-icon_whale');
    this.add.image(whale.x, whale.y - whale.h * 0.55, signKey)
      .setScale(1.8)
      .setDepth(whale.y + 2);

    // steady trickle of coins rising out of the chimney region
    this.add.particles(whale.x, whale.y - whale.h + 20, coinKey, {
      x: { min: -70, max: 70 },
      speedY: { min: -45, max: -20 },
      speedX: { min: -16, max: 16 },
      alpha: { start: 1, end: 0 },
      scale: { min: 0.8, max: 1.35 },
      lifespan: 1900,
      frequency: 170,
      maxParticles: 34,
    }).setDepth(whale.y + 2);

    // burst emitter fired when the station cashes in during a cycle
    this.coinBurst = this.add.particles(whale.x, whale.y - 90, coinKey, {
      speed: { min: 85, max: 210 },
      angle: { min: 210, max: 330 },
      gravityY: 260,
      lifespan: 1200,
      scale: { start: 1.45, end: 0.45 },
      alpha: { start: 1, end: 0 },
      emitting: false,
      maxParticles: 80,
    }).setDepth(whale.y + 2);

    // premium entrance: red carpet + velvet rope in front of the door
    this.add.image(whale.x, whale.y + 22, 'carpet').setDepth(2);
    this.add.image(whale.x, whale.y + 30, 'viprope').setOrigin(0.5, 1).setDepth(whale.y + 30);
    this.add.text(whale.x, whale.y + 45, 'VIP QUEUE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f6c945',
      stroke: '#141a24',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(whale.y + 40);
  }

  burstCoins(count = 42) {
    if (!this.coinBurst) return;
    if (this.time.now - this.lastCoinBurstAt < COIN_BURST_COOLDOWN_MS) return;
    this.lastCoinBurstAt = this.time.now;
    this.coinBurst.explode(Math.min(count, 64));
  }

  refreshAllUpgradeVisuals() {
    for (const place of Object.values(this.placeById || {})) {
      this.refreshUpgradeVisual(place);
    }
  }

  refreshUpgradeVisual(place) {
    const existing = this.upgradeVisualsById?.[place.id];
    if (existing) existing.destroy();

    const level = this.getPlaceLevel(place);
    const sprite = this.placeSpriteById?.[place.id];
    if (sprite) {
      const baseX = sprite.getData('baseScaleX') || 1;
      const baseY = sprite.getData('baseScaleY') || 1;
      const scaleBoost = Math.min(0.14, Math.max(0, level - 1) * 0.035);
      sprite.setScale(baseX * (1 + scaleBoost), baseY * (1 + scaleBoost));
    }
    if (level <= 1) return;

    const w = place.w || 70;
    const h = place.h || 60;
    const container = this.add.container(place.x, place.y).setDepth((place.y || 0) + 6);
    const g = this.add.graphics();
    container.add(g);

    g.fillStyle(0x141a24, 0.9);
    g.fillRoundedRect(-w / 2 + 8, -h - 18, 44, 17, 4);
    g.lineStyle(1, 0xf6c945, 0.9);
    g.strokeRoundedRect(-w / 2 + 8, -h - 18, 44, 17, 4);
    const badge = this.add.text(-w / 2 + 14, -h - 17, `Lv ${level}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffe08a',
    });
    container.add(badge);

    const addImage = (lx, ly, key, scale = 1, depthOffset = 0) => {
      if (!this.textures.exists(key)) return;
      const img = this.add.image(lx, ly, key).setScale(scale).setDepth((place.y || 0) + depthOffset);
      container.add(img);
    };

    const addSparkles = (count, color = 0xffe08a) => {
      g.fillStyle(color, 0.9);
      for (let i = 0; i < count; i += 1) {
        const lx = Phaser.Math.Between(-Math.floor(w / 2), Math.floor(w / 2));
        const ly = Phaser.Math.Between(-h, -20);
        g.fillRect(lx, ly, 3, 3);
      }
    };

    if (place.id === 'tavern') {
      addImage(-w / 2 - 10, -8, 'barrel', 0.85);
      if (level >= 3) addImage(w / 2 + 10, -10, 'lamp', 0.8);
      g.fillStyle(0xf6c945);
      g.fillRect(-26, -h + 22, 52, 7);
      if (level >= 4) {
        g.fillStyle(0xd9bc85, 0.75);
        g.fillCircle(8, -h - 18, 8);
        g.fillCircle(21, -h - 28, 6);
      }
    } else if (place.id === 'blacksmith') {
      g.fillStyle(0xff7a2f, 0.55 + level * 0.06);
      g.fillRoundedRect(-20, -46, 40, 28, 4);
      g.fillStyle(0xf6c945, 0.75);
      g.fillRect(-13, -39, 26, 12);
      if (level >= 3) addImage(-w / 2 - 10, -7, 'crate', 0.9);
      if (level >= 4) addSparkles(8, 0xffa04d);
    } else if (place.id === 'guildhall') {
      g.fillStyle(0x3e6db5);
      g.fillRect(-w / 2 + 18, -h + 18, 12, 42);
      g.fillRect(w / 2 - 30, -h + 18, 12, 42);
      g.fillStyle(0xf2ead8);
      for (let i = 0; i < level; i += 1) g.fillRect(w / 2 - 18, -30 - i * 5, 18, 4);
      if (level >= 4) addImage(w / 2 + 12, -10, 'signpost', 0.75);
    } else if (place.id === 'training') {
      if (level >= 2) addImage(-w / 2 - 10, -8, 'dummy', 0.9);
      if (level >= 3) addImage(w / 2 + 10, -8, 'dummy', 0.9);
      g.lineStyle(3, 0x8a5a2b);
      g.strokeCircle(0, -36, 14 + level * 2);
      g.lineStyle(2, 0xf6c945);
      g.strokeCircle(0, -36, 6 + level);
    } else if (place.id === 'market') {
      addImage(-w / 2 - 8, -8, 'crate', 0.85);
      addImage(w / 2 + 8, -8, 'barrel', 0.8);
      if (level >= 3) {
        g.fillStyle(0xf6c945);
        for (let i = 0; i < level + 2; i += 1) g.fillCircle(-26 + i * 12, -44, 4);
      }
      if (level >= 4) addImage(0, -h - 8, 'signpost', 0.8);
    } else if (place.id === 'whale') {
      addImage(0, -h * 0.52, 'glow', 1.15 + level * 0.18);
      addImage(0, -h * 0.58, 'ph-icon_whale', 1.3 + level * 0.15);
      addImage(0, 20, 'viprope', 1 + level * 0.05);
      addSparkles(10 + level * 3, 0xffe08a);
      for (let i = 0; i < level + 2; i += 1) addImage(-52 + i * 22, -h - 4 - (i % 2) * 8, 'ph-icon_coin', 1.15);
    } else if (place.id === 'dungeon') {
      g.fillStyle(0x7a4bd0, 0.24 + level * 0.08);
      g.fillEllipse(0, -32, w * 0.55, 34 + level * 5);
      g.fillStyle(0xe74c3c);
      g.fillRect(-30, -58, 5, 5);
      g.fillRect(25, -58, 5, 5);
      if (level >= 3) {
        g.fillStyle(0xf2ead8);
        g.fillCircle(-w / 2 - 6, -24, 8);
        g.fillRect(-w / 2 - 10, -20, 8, 5);
      }
    } else if (place.id === 'debt_collector_booth') {
      g.fillStyle(0xf2ead8);
      for (let i = 0; i < level + 1; i += 1) g.fillRect(-w / 2 + 6 + i * 13, -h - 6, 10, 14);
      g.fillStyle(0x14101c);
      g.fillRect(w / 2 + 4, -32, 7, 22);
      g.fillRect(w / 2 + 16, -32, 7, 22);
    } else if (place.id === 'complaint_barrel') {
      g.fillStyle(0x6b4a2b);
      g.fillRect(-w / 2 - 8, -18, 6, 28);
      g.fillRect(w / 2 + 4, -18, 6, 28);
      g.fillStyle(0xf2ead8);
      g.fillRect(-w / 2 - 14, -38, w + 28, 16);
      g.fillStyle(0xc0392b);
      g.fillRect(-w / 2 - 8, -31, w + 16, 3);
    } else if (place.id === 'notice_board') {
      g.fillStyle(0xfff6dc);
      for (let i = 0; i < level + 2; i += 1) g.fillRect(-24 + i * 13, -h + 8 + (i % 2) * 10, 10, 12);
      if (level >= 3) addSparkles(4, 0x7fdc93);
    }

    this.upgradeVisualsById[place.id] = container;
  }

  // --- tooltip ------------------------------------------------------------

  buildTooltip() {
    // ui_panel asset (nine-patch-ish stretch) replaces the drawn box when present
    this.tooltipPanelKey = resolveTexture(this, 'ui_panel');
    if (this.tooltipPanelKey) {
      this.tooltipPanel = this.add.image(0, 0, this.tooltipPanelKey)
        .setOrigin(0, 0).setDepth(5000);
    }
    this.tooltipBg = this.add.graphics().setDepth(5000);
    this.tooltipTitle = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f6c945',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setDepth(5001);
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#fff6dc',
      wordWrap: { width: 300 },
      lineSpacing: 5,
    }).setDepth(5001);
    this.tooltipEffects = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#d7f3d0',
      wordWrap: { width: 300 },
      lineSpacing: 4,
    }).setDepth(5001);
    this.tooltipUpgrade = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffe08a',
      wordWrap: { width: 300 },
      lineSpacing: 4,
    }).setDepth(5001);
    this.tooltipButton = this.add.rectangle(0, 0, 190, 36, 0x8a5a2b, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xf6c945)
      .setDepth(5001)
      .setInteractive({ useHandCursor: true });
    this.tooltipButtonLabel = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(5002);
    this.tooltipButton.on('pointerover', () => this.tooltipButton.setFillStyle(0xa66f38));
    this.tooltipButton.on('pointerout', () => this.tooltipButton.setFillStyle(0x8a5a2b));
    this.tooltipButton.on('pointerup', (pointer) => {
      if (this.wasDragGesture(pointer)) return;
      this.tryUpgradeTooltipTarget();
    });
    this.hideTooltip();

    // clicking empty ground dismisses the tooltip
    this.input.on('pointerdown', (pointer, over) => {
      const b = this.tooltipBounds;
      const px = pointer.worldX ?? pointer.x;
      const py = pointer.worldY ?? pointer.y;
      const insideTooltip = b
        && px >= b.x && px <= b.x + b.w
        && py >= b.y && py <= b.y + b.h;
      if (!this.cameraDrag?.moved && over.length === 0 && !insideTooltip) this.hideTooltip();
    });
  }

  getPlaceLevel(place) {
    if (!place) return 1;
    if (this.upgradeLevels[place.id]) return this.upgradeLevels[place.id];
    const parsed = Number(place.level);
    return Number.isFinite(parsed) ? parsed : 1;
  }

  getUpgradeInfo(place) {
    const def = getUpgradeDef(place.id);
    const level = this.getPlaceLevel(place);
    const baseCost = place.upgradeCost ?? null;
    const cost = def ? getUpgradeCost(def, level) : (baseCost ? baseCost + (level - 1) * 80 : null);
    const flavor = def ? getUpgradeFlavor(def, level) : (place.upgradeFlavor || place.upgrade || null);
    const effect = def ? getUpgradeEffect(def, level) : place.effect;
    const nextEffect = def ? getUpgradeEffect(def, level + 1) : null;
    const maxed = def ? level >= def.maxLevel : (!cost || level >= 3);
    return { def, level, cost, flavor, effect, nextEffect, maxed };
  }

  getTooltipPosition(anchorX, anchorY, anchorH, tw, th) {
    const view = this.getVisibleWorldRect();
    const maxX = Math.max(view.left + 8, view.right - tw - 8);
    const maxY = Math.max(view.top + 48, view.bottom - th - 52);
    const x = Phaser.Math.Clamp(anchorX - tw / 2, view.left + 8, maxX);
    const preferredY = anchorY - anchorH - th - 10;
    const belowY = anchorY + 24;
    const y = preferredY < view.top + 48
      ? Phaser.Math.Clamp(belowY, view.top + 48, maxY)
      : Phaser.Math.Clamp(preferredY, view.top + 48, maxY);
    return { x, y };
  }

  showTooltip(b) {
    if (!this.isLocationUnlocked(b.id)) {
      this.game.events.emit('gwg-event', `${b.name} is still locked. The town has not earned that problem yet.`);
      return;
    }
    this.heroTooltipTarget = null;
    this.tooltipTarget = b;
    const info = this.getUpgradeInfo(b);
    const level = `Level: ${info.level}${info.maxed ? ' (max)' : ''}`;
    const effect = info.effect ? `Effect: ${info.effect}` : null;
    const detailLines = [b.description, ...(b.tooltipLines || [])].filter(Boolean).slice(0, 4);
    const upgradeText = info.maxed
      ? 'Upgrade: maxed, allegedly balanced'
      : `Upgrade: ${info.cost}g - ${info.flavor || 'questionable improvements'}${info.nextEffect ? `\nNext: ${info.nextEffect}` : ''}`;

    this.tooltipTitle.setText(b.name);
    this.tooltipText.setText(detailLines.join('\n'));
    this.tooltipEffects.setText([level, effect].filter(Boolean).join('\n'));
    this.tooltipUpgrade.setText(upgradeText);

    const canUpgrade = Boolean(info.cost && !info.maxed);
    const canAfford = canUpgrade && this.resources.gold >= info.cost;
    this.tooltipButton.setVisible(canUpgrade);
    this.tooltipButtonLabel.setVisible(canUpgrade);
    if (canUpgrade) {
      this.tooltipButtonLabel.setText(canAfford ? `Upgrade ${info.cost}g` : `Need ${info.cost}g`);
      this.tooltipButton.setAlpha(canAfford ? 1 : 0.62);
      this.tooltipButtonLabel.setAlpha(canAfford ? 1 : 0.72);
    }

    const pad = 12;
    const gap = 7;
    const contentW = Math.max(
      220,
      this.tooltipTitle.width,
      this.tooltipText.width,
      this.tooltipEffects.width,
      this.tooltipUpgrade.width,
      canUpgrade ? this.tooltipButton.width : 0,
    );
    const tw = Math.min(340, contentW + pad * 2);
    const effectsH = this.tooltipEffects.text ? this.tooltipEffects.height + gap : 0;
    const buttonH = canUpgrade ? this.tooltipButton.height + gap : 0;
    const th = pad
      + this.tooltipTitle.height + gap
      + this.tooltipText.height + gap
      + effectsH
      + this.tooltipUpgrade.height
      + buttonH
      + pad;
    const { x, y } = this.getTooltipPosition(b.x, b.y, b.h || 60, tw, th);
    this.tooltipBounds = { x, y, w: tw, h: th };

    if (this.tooltipPanel) {
      this.tooltipPanel.setPosition(x, y).setDisplaySize(tw, th).setVisible(true);
    } else {
      this.tooltipBg.clear();
      this.tooltipBg.fillStyle(0x05070c, 0.42);
      this.tooltipBg.fillRoundedRect(x + 4, y + 4, tw, th, 6);
      this.tooltipBg.fillStyle(0x121a25, 0.98);
      this.tooltipBg.fillRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.lineStyle(2, 0xf6c945, 0.95);
      this.tooltipBg.strokeRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.setVisible(true);
    }

    let ty = y + pad;
    this.tooltipTitle.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipTitle.height + gap;
    this.tooltipText.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipText.height + gap;
    this.tooltipEffects.setPosition(x + pad, ty).setVisible(Boolean(this.tooltipEffects.text));
    ty += effectsH;
    this.tooltipUpgrade.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipUpgrade.height + gap;
    if (canUpgrade) {
      this.tooltipButton.setPosition(x + pad, ty).setVisible(true);
      this.tooltipButtonLabel.setPosition(x + pad + this.tooltipButton.width / 2, ty + this.tooltipButton.height / 2).setVisible(true);
    }

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(6500, () => this.hideTooltip());
  }

  hideTooltip() {
    if (this.tooltipPanel) this.tooltipPanel.setVisible(false);
    this.tooltipBg.setVisible(false);
    this.tooltipTitle.setVisible(false);
    this.tooltipText.setVisible(false);
    this.tooltipEffects.setVisible(false);
    this.tooltipUpgrade.setVisible(false);
    this.tooltipButton.setVisible(false);
    this.tooltipButtonLabel.setVisible(false);
    this.tooltipTarget = null;
    this.heroTooltipTarget = null;
    this.tooltipBounds = null;
  }

  getHeroThought(hero) {
    const lines = [
      ...(hero.def.idleLines || []),
      hero.def.statLine,
    ].filter(Boolean);
    if (this.resources.trust < 30 && this.isHonestHero(hero.def)) return 'Thought: "Trust is not a purchasable stat."';
    if (this.resources.corruption > 70 && this.isDebtHero(hero.def)) return 'Thought: "My debt has a health bar now."';
    if (hero.stats.whaleAccess) return 'Thought: "Progression is a mindset, and mine is funded."';
    return `Thought: "${Phaser.Utils.Array.GetRandom(lines) || 'The economy is making eye contact.'}"`;
  }

  getHeroActionText(hero) {
    if (hero.currentAction) return hero.currentAction;
    if (hero.state === 'away') return `Away until Day ${hero.awayUntil}`;
    if (hero.destination) return `Walking to ${this.getPlaceName(hero.destination)}`;
    return `Idle near ${this.getPlaceName(hero.at)}`;
  }

  getPlaceName(id) {
    return this.placeById?.[id]?.name || this.decorationById?.[id]?.name || id || 'town';
  }

  showHeroTooltip(hero) {
    if (!hero || hero.state === 'away') return;
    this.tooltipTarget = null;
    this.heroTooltipTarget = hero;

    const whaleAccess = hero.stats.whaleAccess ? 'Yes' : (hero.stats.debt > 250 ? 'Technically' : 'No');
    this.tooltipTitle.setText(hero.def.name);
    this.tooltipText.setText(hero.def.personality);
    this.tooltipEffects.setText([
      `Power: ${hero.stats.power}`,
      `Morale: ${hero.stats.morale}`,
      `Debt: ${hero.stats.debt}`,
      `Loyalty: ${hero.stats.loyalty}`,
      `Whale Access: ${whaleAccess}`,
      `Action: ${this.getHeroActionText(hero)}`,
    ].join('\n'));
    this.tooltipUpgrade.setText(this.getHeroThought(hero));
    this.tooltipButton.setVisible(false);
    this.tooltipButtonLabel.setVisible(false);

    const pad = 12;
    const gap = 7;
    const contentW = Math.max(
      230,
      this.tooltipTitle.width,
      this.tooltipText.width,
      this.tooltipEffects.width,
      this.tooltipUpgrade.width,
    );
    const tw = Math.min(350, contentW + pad * 2);
    const th = pad
      + this.tooltipTitle.height + gap
      + this.tooltipText.height + gap
      + this.tooltipEffects.height + gap
      + this.tooltipUpgrade.height
      + pad;
    const { x, y } = this.getTooltipPosition(hero.container.x, hero.container.y, 58, tw, th);
    this.tooltipBounds = { x, y, w: tw, h: th };

    if (this.tooltipPanel) {
      this.tooltipPanel.setPosition(x, y).setDisplaySize(tw, th).setVisible(true);
    } else {
      this.tooltipBg.clear();
      this.tooltipBg.fillStyle(0x05070c, 0.42);
      this.tooltipBg.fillRoundedRect(x + 4, y + 4, tw, th, 6);
      this.tooltipBg.fillStyle(0x121a25, 0.98);
      this.tooltipBg.fillRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.lineStyle(2, 0xf6c945, 0.95);
      this.tooltipBg.strokeRoundedRect(x, y, tw, th, 6);
      this.tooltipBg.setVisible(true);
    }

    let ty = y + pad;
    this.tooltipTitle.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipTitle.height + gap;
    this.tooltipText.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipText.height + gap;
    this.tooltipEffects.setPosition(x + pad, ty).setVisible(true);
    ty += this.tooltipEffects.height + gap;
    this.tooltipUpgrade.setPosition(x + pad, ty).setVisible(true);

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(7000, () => this.hideTooltip());
  }

  tryUpgradeTooltipTarget() {
    const place = this.tooltipTarget;
    if (!place) return;
    if (this.time.now - this.lastUpgradeAt < 450) return;
    this.lastUpgradeAt = this.time.now;

    const info = this.getUpgradeInfo(place);
    if (!info.cost || info.maxed) {
      this.game.events.emit('gwg-event', `${place.name} is already as questionable as allowed.`);
      return;
    }
    if (this.resources.gold < info.cost) {
      this.floatText(place.x, place.y - (place.h || 50) - 8, 'NOT ENOUGH GOLD', '#f0938f');
      this.game.events.emit('gwg-event', `${place.name} demanded ${info.cost}g. ${Phaser.Utils.Array.GetRandom([
        'Not enough gold. Please exploit responsibly.',
        'The accountant suggests more whales.',
        'Try selling fairness. It was decorative anyway.',
      ])}`);
      return;
    }

    const bonus = info.def?.deltas || {};
    const deltas = {
      ...bonus,
      gold: -info.cost + (bonus.gold || 0),
    };
    this.applyDeltas(deltas);
    const nextLevel = info.level + 1;
    this.upgradeLevels[place.id] = nextLevel;
    this.refreshUpgradeVisual(place);
    this.checkObjectives();

    const sprite = this.placeSpriteById[place.id];
    if (sprite) {
      const baseScaleX = sprite.scaleX;
      const baseScaleY = sprite.scaleY;
      this.tweens.add({
        targets: sprite,
        scaleX: baseScaleX * 1.08,
        scaleY: baseScaleY * 1.08,
        duration: 140,
        yoyo: true,
        ease: 'Back.easeOut',
      });
      sprite.setTint(0xfff3c0);
      this.time.delayedCall(220, () => sprite.clearTint());
    }

    if (place.id === 'whale') {
      this.burstCoins(64);
      this.triggerWhaleReaction();
    }

    this.floatDeltas(place.x, place.y - (place.h || 58) - 10, deltas);
    const eventText = info.def?.event
      ? info.def.event(place.name, nextLevel)
      : `${place.name} upgraded. The town pretends this was wise.`;
    this.game.events.emit('gwg-event', `${eventText} Level ${nextLevel}.`);
    this.checkUnlocks();
    this.publishTownHint();
    this.saveGame(false);
    this.showTooltip(place);
  }

  // --- heroes -------------------------------------------------------------

  buildHeroes() {
    this.heroes = HEROES.map((def, i) => {
      const spot = this.doorSpots[i % this.doorSpots.length];
      const x = spot.x + Phaser.Math.Between(-40, 40);
      const y = spot.y + Phaser.Math.Between(0, 20);

      const sprite = this.add.image(0, 0, heroTexture(this, def)).setScale(2).setOrigin(0.5, 1);
      const label = this.add.text(0, -40, def.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#0c1118',
        strokeThickness: 2,
        backgroundColor: '#0f1521cc',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5, 1);

      const container = this.add.container(x, y, [sprite, label]).setDepth(y);
      const savedStats = this.savedHeroStats?.[def.id] || {};
      const hero = {
        def, container, sprite, label,
        stats: {
          morale: 60,
          debt: Math.max(0, -(def.stats?.gold || 0)),
          loyalty: this.isHonestHero(def) ? 72 : 50,
          whaleAccess: HERO_GROUPS.whale.includes(def.personality),
          ...def.stats,
          ...savedStats,
        },
        at: spot.id, destination: null, state: 'idle',
        currentAction: `Idle near ${this.getPlaceName(spot.id)}`,
        moveTween: null, bobTween: null, timer: null,
        destMarker: null, bubble: null, bubbleTimer: null,
        awayUntil: savedStats.awayUntil || 0,
      };
      if (hero.awayUntil > this.day) {
        hero.state = 'away';
        hero.container.setAlpha(0.28);
        hero.currentAction = `Away until Day ${hero.awayUntil}`;
      }

      // clicking/tapping a hero shows their compact detail sheet; the invisible
      // hit rectangle is larger than the placeholder sprite for mobile fingers.
      const hit = this.add.rectangle(0, -34, 58, 72, 0xffffff, 0.001)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      container.add(hit);
      hero.hit = hit;
      hit.on('pointerover', () => sprite.setTint(0xfff3c0));
      hit.on('pointerout', () => sprite.clearTint());
      hit.on('pointerup', (pointer) => {
        if (this.wasDragGesture(pointer)) return;
        this.showHeroTooltip(hero);
      });

      // idle breathing — replace with a real idle animation later
      this.tweens.add({
        targets: sprite, scaleY: { from: 2, to: 2.08 },
        duration: Phaser.Math.Between(700, 1000), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 600),
      });

      this.scheduleAmbient(hero, Phaser.Math.Between(300, 2500));
      return hero;
    });
  }

  // stop whatever the hero is doing so a new order can take over cleanly
  interruptHero(hero) {
    if (hero.moveTween) { hero.moveTween.stop(); hero.moveTween = null; }
    if (hero.bobTween) { hero.bobTween.stop(); hero.bobTween = null; }
    if (hero.timer) { hero.timer.remove(); hero.timer = null; }
    if (hero.destMarker) { hero.destMarker.destroy(); hero.destMarker = null; }
    hero.sprite.setAngle(0);
    hero.container.setAlpha(1);
    hero.destination = null;
    hero.state = 'idle';
    hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
  }

  scheduleAmbient(hero, delay) {
    if (hero.state === 'away') return;
    hero.timer = this.time.delayedCall(delay, () => this.ambientMove(hero));
  }

  ambientMove(hero) {
    // heroes drift toward their preferred hangouts most of the time
    let spot;
    const preferredIds = hero.def.preferredDestinations || [hero.def.prefers].filter(Boolean);
    const preferredSpots = preferredIds
      .map((id) => this.doorById[id])
      .filter((s) => s && s.id !== hero.at && this.isLocationUnlocked(s.id));
    if (Math.random() < 0.62 && preferredSpots.length > 0) {
      spot = Phaser.Utils.Array.GetRandom(preferredSpots);
    } else {
      spot = Phaser.Utils.Array.GetRandom(this.doorSpots.filter((s) => s.id !== hero.at && this.isLocationUnlocked(s.id)));
    }
    this.walkTo(hero, spot, () => this.onAmbientArrive(hero, spot));
  }

  walkTo(hero, spot, onArrive) {
    if (!hero || !spot) {
      if (hero) this.scheduleAmbient(hero, Phaser.Math.Between(1200, 3000));
      return;
    }
    this.interruptHero(hero);
    hero.state = 'walking';
    hero.destination = spot.id;
    hero.currentAction = `Walking to ${this.getPlaceName(spot.id)}`;

    const tx = spot.x + Phaser.Math.Between(-38, 38);
    const ty = spot.y + Phaser.Math.Between(-4, 18);
    const dist = Phaser.Math.Distance.Between(hero.container.x, hero.container.y, tx, ty);
    const duration = Math.max(300, (dist / hero.def.speed) * 1000);

    // destination indicator: a small chevron bouncing where the hero is headed
    hero.destMarker = this.add.image(tx, ty - 12, 'chevron').setDepth(3500).setAlpha(0.85);
    this.tweens.add({
      targets: hero.destMarker, y: ty - 4,
      duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    hero.sprite.setFlipX(tx < hero.container.x);
    // waddle while walking — replace with a real walk animation later
    hero.bobTween = this.tweens.add({
      targets: hero.sprite, angle: { from: -4, to: 4 },
      duration: 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    hero.moveTween = this.tweens.add({
      targets: hero.container,
      x: tx, y: ty, duration,
      onComplete: () => {
        if (hero.bobTween) { hero.bobTween.stop(); hero.bobTween = null; }
        if (hero.destMarker) { hero.destMarker.destroy(); hero.destMarker = null; }
        hero.sprite.setAngle(0);
        hero.moveTween = null;
        hero.at = spot.id;
        hero.destination = null;
        hero.state = 'idle';
        hero.currentAction = `Idle near ${this.getPlaceName(spot.id)}`;
        onArrive();
      },
    });
  }

  onAmbientArrive(hero, spot) {
    // non-whales get bounced off the VIP rope more often than not
    if ((spot.id === 'whale' || spot.id === 'vip_rope_entrance') && hero.def.personality !== 'Noble Whale') {
      if (hero.def.personality === 'Debt Goblin' && Math.random() < 0.35) {
        this.say(hero, 'Snuck in. Shh.');
        this.enterBuilding(hero);
        return;
      }
      if (Math.random() < 0.6) {
        const line = Phaser.Utils.Array.GetRandom([...DENIED_LINES, ...QUEUE_LINES]);
        this.say(hero, line);
        this.floatText(spot.x, spot.y - 34, 'VIPs ONLY', '#e74c3c');
        hero.timer = this.time.delayedCall(900, () => this.ambientMove(hero));
        return;
      }
    }
    if ((spot.id === 'whale' || spot.id === 'vip_rope_entrance') && hero.def.personality === 'Noble Whale') {
      if (Math.random() < 0.85) {
        this.say(hero, 'Premium pathing.', true);
        this.enterBuilding(hero);
        return;
      }
    }

    if (Math.random() < 0.55) {
      this.enterBuilding(hero);
    } else {
      this.scheduleAmbient(hero, Phaser.Math.Between(1200, 5000));
    }
  }

  // hero slips inside the building for a moment, then pops back out
  enterBuilding(hero) {
    hero.state = 'inside';
    hero.currentAction = `Visiting ${this.getPlaceName(hero.at)}`;
    this.tweens.add({ targets: hero.container, alpha: 0, duration: 250 });
    hero.timer = this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
      this.tweens.add({ targets: hero.container, alpha: 1, duration: 250 });
      hero.state = 'idle';
      hero.currentAction = `Idle near ${this.getPlaceName(hero.at)}`;
      this.scheduleAmbient(hero, Phaser.Math.Between(800, 3000));
    });
  }

  // --- speech bubbles & floating text --------------------------------------

  hasNearbyBubble(hero, minDistance = BUBBLE_MIN_SPACING) {
    return this.heroes.some((other) => (
      other !== hero
      && other.bubble
      && Phaser.Math.Distance.Between(
        other.container.x,
        other.container.y,
        hero.container.x,
        hero.container.y,
      ) < minDistance
    ));
  }

  clearHeroBubble(hero, fade = false) {
    if (!hero?.bubble) return;
    const bubble = hero.bubble;
    hero.bubble = null;
    if (hero.bubbleTimer) {
      hero.bubbleTimer.remove();
      hero.bubbleTimer = null;
    }
    this.activeBubbles = Math.max(0, this.activeBubbles - 1);

    if (fade && bubble.active) {
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 220,
        onComplete: () => bubble.destroy(),
      });
    } else {
      bubble.destroy();
    }
  }

  clearOldestBubble() {
    const bubbled = this.heroes
      .filter((h) => h.bubble)
      .sort((a, b) => (a.bubbleStartedAt || 0) - (b.bubbleStartedAt || 0));
    if (bubbled.length > 0) this.clearHeroBubble(bubbled[0]);
  }

  say(hero, text, important = false) {
    if (!hero || !text) return;
    const maxBubbles = important ? MAX_IMPORTANT_BUBBLES : MAX_IDLE_BUBBLES;
    if (!important && this.activeBubbles >= maxBubbles) return;
    if (!important && this.hasNearbyBubble(hero)) return;
    if (important && this.activeBubbles >= maxBubbles) this.clearOldestBubble();
    if (important) this.importantChatterUntil = this.time.now + 2800;

    this.clearHeroBubble(hero);
    hero.container.setAlpha(1);

    const txt = this.add.text(0, -4, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#141a24',
      wordWrap: { width: 190 },
      lineSpacing: 3,
    }).setOrigin(0.5, 1);

    const bw = txt.width + 18;
    const bh = txt.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0xfff6dc, 0.97);
    g.fillRoundedRect(-bw / 2, -bh - 2, bw, bh, 5);
    g.fillTriangle(-4, -3, 4, -3, 0, 3); // tail
    g.lineStyle(2, 0x1d2430, 0.65);
    g.strokeRoundedRect(-bw / 2, -bh - 2, bw, bh, 5);

    const view = this.getVisibleWorldRect();
    const left = hero.container.x - bw / 2;
    const right = hero.container.x + bw / 2;
    let edgeOffset = 0;
    if (left < view.left + 12) edgeOffset = view.left + 12 - left;
    if (right > view.right - 12) edgeOffset = view.right - 12 - right;

    let localY = -64;
    const top = hero.container.y + localY - bh - 2;
    if (top < view.top + 52) localY += view.top + 52 - top;

    const bubble = this.add.container(edgeOffset, localY, [g, txt]).setScale(0);
    hero.container.add(bubble);
    hero.bubble = bubble;
    hero.bubbleStartedAt = this.time.now;
    this.activeBubbles += 1;

    this.tweens.add({ targets: bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    hero.bubbleTimer = this.time.delayedCall(
      important ? 3400 : 2600,
      () => this.clearHeroBubble(hero, true),
    );
  }

  floatText(x, y, str, color) {
    this.floaters = this.floaters.filter((item) => item.active);
    while (this.floaters.length >= MAX_FLOATING_TEXTS) {
      const oldest = this.floaters.shift();
      if (oldest?.active) oldest.destroy();
    }

    const view = this.getVisibleWorldRect();
    const safeX = Phaser.Math.Clamp(x, view.left + 58, view.right - 58);
    const safeY = Phaser.Math.Clamp(y, view.top + 60, view.bottom - 72);
    const t = this.add.text(safeX, safeY, str, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      fontStyle: 'bold',
      color,
      stroke: '#141a24',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(4000);
    this.floaters.push(t);
    this.tweens.add({
      targets: t, y: safeY - 38, alpha: 0,
      duration: 1500, ease: 'Cubic.easeOut',
      onComplete: () => {
        this.floaters = this.floaters.filter((item) => item !== t);
        t.destroy();
      },
    });
  }

  // pop the resource deltas of an event above a building, staggered
  floatDeltas(x, y, deltas) {
    let i = 0;
    for (const [key, value] of Object.entries(deltas)) {
      if (!value) continue;
      const label = `${value > 0 ? '+' : ''}${value}${RES_SHORT[key]}`;
      this.time.delayedCall(i * 260, () => this.floatText(x, y - i * 6, label, RES_COLORS[key]));
      i += 1;
    }
  }

  // --- ambient chatter -------------------------------------------------------

  startIdleChatter() {
    const chatter = () => {
      const candidates = this.heroes.filter((h) => (
        (h.state === 'idle' || h.state === 'walking') && !h.bubble
      ));
      if (
        candidates.length > 0
        && !this.cycleRunning
        && this.activeBubbles < MAX_IDLE_BUBBLES
        && this.time.now > this.importantChatterUntil
      ) {
        const hero = Phaser.Utils.Array.GetRandom(candidates);
        const lines = [
          ...(IDLE_QUIPS[hero.def.personality] || []),
          ...(hero.def.idleLines || []),
        ];
        if (lines.length > 0) this.say(hero, Phaser.Utils.Array.GetRandom(lines));
      }
      this.time.delayedCall(Phaser.Math.Between(4200, 8200), chatter);
    };
    this.time.delayedCall(2600, chatter);
  }

  update() {
    const cam = this.cameras.main;
    const speed = 6;
    const left = this.cursors?.left?.isDown || this.wasd?.A?.isDown;
    const right = this.cursors?.right?.isDown || this.wasd?.D?.isDown;
    const up = this.cursors?.up?.isDown || this.wasd?.W?.isDown;
    const down = this.cursors?.down?.isDown || this.wasd?.S?.isDown;
    if (left) cam.scrollX = Phaser.Math.Clamp(cam.scrollX - speed, 0, WORLD_WIDTH - WIDTH);
    if (right) cam.scrollX = Phaser.Math.Clamp(cam.scrollX + speed, 0, WORLD_WIDTH - WIDTH);
    if (up) cam.scrollY = Phaser.Math.Clamp(cam.scrollY - speed, 0, WORLD_HEIGHT - HEIGHT);
    if (down) cam.scrollY = Phaser.Math.Clamp(cam.scrollY + speed, 0, WORLD_HEIGHT - HEIGHT);

    // depth-sort heroes by their feet; talking heroes pop above rooftops
    for (const hero of this.heroes) {
      hero.container.setDepth(hero.container.y + (hero.bubble ? 800 : 0));
    }

  }

  // --- daily simulation ----------------------------------------------------

  applyDeltas(deltas) {
    const R = this.resources;
    for (const [key, value] of Object.entries(deltas)) {
      R[key] += value;
      if (key === 'gold' && value > 0 && this.stats) this.stats.totalGoldEarned += value;
    }
    for (const key of ['trust', 'corruption', 'morale', 'threat']) {
      R[key] = Phaser.Math.Clamp(R[key], 0, 100);
    }
    R.gold = Math.max(0, R.gold);
    this.registry.set('resources', { ...R });
    if (this.tooltipTarget) this.showTooltip(this.tooltipTarget);
    if (this.heroTooltipTarget) this.showHeroTooltip(this.heroTooltipTarget);
    this.checkUnlocks();
    this.publishTownHint();
    if (!this.checkingObjectives) this.checkObjectives();
  }

  triggerWhaleReaction() {
    const candidates = this.heroes.filter((h) => h.state !== 'inside' && !h.bubble);
    if (candidates.length === 0) return;
    const hero = Phaser.Utils.Array.GetRandom(candidates);
    const lines = [
      ...(hero.def.reactionLines || []),
      ...(WHALE_REACTIONS[hero.def.personality] || []),
    ];
    if (lines.length > 0) {
      this.say(hero, Phaser.Utils.Array.GetRandom(lines), true);
    }
  }

  maybeBlockPoorHero() {
    if (Math.random() > 0.55) return;
    const ropeSpot = this.doorById.vip_rope_entrance || this.doorById.whale;
    const candidates = this.heroes.filter((h) => (
      h.state !== 'inside'
      && h.def.personality !== 'Noble Whale'
      && (h.stats.gold < 500 || h.def.personality !== 'Sponsored Hero')
    ));
    if (!ropeSpot || candidates.length === 0) return;

    const hero = Phaser.Utils.Array.GetRandom(candidates);
    this.walkTo(hero, ropeSpot, () => {
      this.say(hero, Phaser.Utils.Array.GetRandom([...DENIED_LINES, ...QUEUE_LINES]), true);
      this.floatText(ropeSpot.x, ropeSpot.y - 38, 'VIPs ONLY', '#e74c3c');
      this.scheduleAmbient(hero, Phaser.Math.Between(2000, 4200));
    });
  }

  pickQuestHero(quest) {
    const active = this.getActiveHeroes();
    if (active.length === 0) return null;

    const preferred = active.filter((hero) => quest.preferred.includes(hero.def.personality));
    if (preferred.length > 0) return Phaser.Utils.Array.GetRandom(preferred);

    if (quest.type === 'fair') {
      const honest = active.filter((hero) => this.isHonestHero(hero.def));
      if (honest.length > 0) return Phaser.Utils.Array.GetRandom(honest);
    }
    if (quest.type === 'sponsored' || quest.type === 'shady') {
      const whales = active.filter((hero) => this.isWhaleHero(hero.def));
      if (whales.length > 0) return Phaser.Utils.Array.GetRandom(whales);
    }
    if (quest.type === 'trust') {
      const veterans = active.filter((hero) => this.isVeteranHero(hero.def));
      if (veterans.length > 0) return Phaser.Utils.Array.GetRandom(veterans);
    }
    return Phaser.Utils.Array.GetRandom(active);
  }

  getQuestSuccessChance(hero, quest) {
    const R = this.resources;
    const blacksmith = this.getPlaceLevel(this.buildingById.blacksmith);
    const training = this.getPlaceLevel(this.buildingById.training);
    const guildhall = this.getPlaceLevel(this.buildingById.guildhall);
    const whale = this.getPlaceLevel(this.buildingById.whale);
    const honestBonus = this.isHonestHero(hero.def) ? training * 4 : 0;
    const whaleBonus = this.isWhaleHero(hero.def) ? whale * 6 : 0;
    const corruptionBias = quest.type === 'fair' ? -R.corruption * 0.08 : R.corruption * 0.06;

    return Phaser.Math.Clamp(
      34
      + hero.stats.power * 4
      + R.morale * 0.22
      + R.trust * 0.12
      + blacksmith * 5
      + guildhall * 4
      + honestBonus
      + whaleBonus
      + corruptionBias
      - quest.difficulty * 12
      - Math.max(0, R.threat - 50) * 0.18,
      12,
      92,
    );
  }

  resolvePostedQuest(quest) {
    const hero = this.pickQuestHero(quest);
    const dungeon = this.buildingById.dungeon;
    const spotId = quest.type === 'trust' ? 'complaint_barrel' : 'dungeon';
    const place = this.placeById[spotId] || dungeon;
    const spot = this.doorById[spotId] || this.doorById.dungeon;

    if (!hero) {
      const d = { gold: -Math.ceil(quest.cost / 2), threat: quest.difficulty * 2, morale: -2 };
      this.applyDeltas(d);
      this.floatDeltas(place.x, place.y - (place.h || 58) - 10, d);
      this.game.events.emit('gwg-event', `${quest.name} expired. Nobody volunteered, which is technically feedback.`);
      return;
    }

    const chance = this.getQuestSuccessChance(hero, quest);
    const whaleSolve = this.isWhaleHero(hero.def) && Math.random() < 0.22 + this.getPlaceLevel(this.buildingById.whale) * 0.06;
    const success = whaleSolve || Math.random() * 100 <= chance;
    const guildBonus = this.getPlaceLevel(this.buildingById.guildhall) * 12;
    const dungeonBonus = this.getPlaceLevel(this.buildingById.dungeon) * 10;
    let text;
    let bubble;
    let deltas;

    if (whaleSolve) {
      const reward = quest.reward + guildBonus + dungeonBonus + this.getPlaceLevel(this.buildingById.whale) * 35;
      deltas = {
        gold: reward,
        trust: -Math.max(2, quest.difficulty),
        corruption: quest.difficulty + 3,
        morale: -Math.max(1, Math.floor(quest.risk / 2)),
        threat: -Math.max(2, Math.floor(quest.threatReduction / 2)),
      };
      text = `${hero.def.name} solved ${quest.name} by applying superior purchasing decisions. ${quest.whale}`;
      bubble = 'Receipt victory.';
      hero.stats.spent += Math.ceil(reward / 4);
      hero.stats.power += 2 + this.getPlaceLevel(this.buildingById.whale);
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 3, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - 3, 0, 100);
      this.stats.whaleEvents += 1;
      this.burstCoins(44);
    } else if (success) {
      const honest = this.isHonestHero(hero.def);
      deltas = {
        gold: quest.reward + guildBonus + dungeonBonus,
        trust: quest.trust + (honest ? 2 : 0),
        morale: quest.morale + 1,
        corruption: quest.corruption,
        threat: -quest.threatReduction,
      };
      text = `${hero.def.name} completed ${quest.name}. ${quest.success}`;
      bubble = honest ? 'Earned loot.' : quest.bubble;
      hero.stats.power += honest ? 1 : 0;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 8, 0, 100);
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + (honest ? 5 : 2), 0, 100);
      this.stats.questsCompleted += 1;
      if (honest) this.stats.honestQuestSuccesses += 1;
    } else {
      deltas = {
        gold: Math.floor(quest.reward * 0.2),
        trust: -Math.max(1, Math.floor(quest.risk / 2)),
        morale: -quest.risk,
        corruption: quest.type === 'shady' ? 2 : 0,
        threat: quest.difficulty * 3,
      };
      text = `${hero.def.name} failed ${quest.name}. ${quest.failure}`;
      bubble = 'This scaled badly.';
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale - quest.risk * 4, 0, 100);
      hero.stats.debt += quest.risk * 8;
      hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty - quest.risk, 0, 100);
    }

    this.applyDeltas(deltas);
    this.floatDeltas(place.x, place.y - (place.h || 58) - 10, deltas);
    this.game.events.emit('gwg-event', text);
    this.checkObjectives();
    this.checkUnlocks();
    this.walkTo(hero, spot, () => {
      this.say(hero, bubble, true);
      this.scheduleAmbient(hero, Phaser.Math.Between(2500, 5200));
    });
  }

  sendHeroAway(hero, cycles = 2) {
    this.interruptHero(hero);
    hero.awayUntil = this.day + cycles;
    hero.state = 'away';
    hero.currentAction = `Away until Day ${hero.awayUntil}`;
    hero.container.setAlpha(0.28);
    hero.stats.loyalty = Math.max(0, hero.stats.loyalty - 18);
    this.floatText(hero.container.x, hero.container.y - 36, 'LEFT TOWN', '#f0938f');
  }

  chooseHeroAction(hero) {
    const R = this.resources;
    const tavern = this.getPlaceLevel(this.buildingById.tavern);
    const training = this.getPlaceLevel(this.buildingById.training);
    const blacksmith = this.getPlaceLevel(this.buildingById.blacksmith);
    const whale = this.getPlaceLevel(this.buildingById.whale);
    const complaint = this.getPlaceLevel(this.decorationById.complaint_barrel);
    const debtBooth = this.getPlaceLevel(this.decorationById.debt_collector_booth);
    const market = this.getPlaceLevel(this.buildingById.market);

    if (R.trust < 30 && this.isHonestHero(hero.def) && Math.random() < 0.34) {
      return {
        building: 'complaint_barrel',
        text: `${hero.def.name} left town after discovering the fairness brochure was decorative.`,
        bubble: 'I need honest air.',
        d: { trust: -1, morale: -2 + Math.min(2, complaint) },
        leave: true,
      };
    }

    if (R.morale < 30 && (hero.def.personality === 'Ragequitter' || Math.random() < 0.25)) {
      return {
        building: 'tavern',
        text: `${hero.def.name} ragequit into a tavern chair. The chair requested hazard pay.`,
        bubble: 'I retire loudly.',
        d: { morale: -2 + Math.min(2, tavern), trust: -1 },
      };
    }

    if (R.corruption > 70 && this.isDebtHero(hero.def) && Math.random() < 0.58) {
      hero.stats.debt += 18 + debtBooth * 6;
      return {
        building: 'debt_collector_booth',
        text: `${hero.def.name} became a debt problem with legs. The booth applauded internally.`,
        bubble: 'My debt leveled up.',
        d: { gold: 35 + debtBooth * 18, corruption: 2 + debtBooth, morale: -2 },
      };
    }

    if (this.isWhaleHero(hero.def) && Math.random() < 0.48 + whale * 0.05) {
      const purchase = Phaser.Utils.Array.GetRandom(WHALE_PURCHASES);
      const income = 100 + whale * 75 + Math.floor(R.corruption * 1.4);
      hero.stats.spent += Math.floor(income / 3);
      hero.stats.power += 1 + whale;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 5, 0, 100);
      this.stats.whaleEvents += 1;
      return {
        building: 'whale',
        text: `${hero.def.name} bought ${purchase} and called it mastery.`,
        bubble: purchase,
        d: { gold: income, trust: -2 - Math.floor(whale / 2), corruption: 2 + whale },
        whale: true,
      };
    }

    if (R.threat > 65 && hero.stats.power >= 7 && Math.random() < 0.45) {
      return {
        building: 'dungeon',
        text: `${hero.def.name} pushed back the dungeon before it billed the town.`,
        bubble: 'Gate handled.',
        d: { threat: -(5 + blacksmith), morale: 1, trust: this.isHonestHero(hero.def) ? 1 : 0 },
      };
    }

    if (this.isHonestHero(hero.def) && Math.random() < 0.58) {
      const gain = training + Math.floor(blacksmith / 2);
      hero.stats.power += gain;
      hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + 4, 0, 100);
      return {
        building: Math.random() < 0.55 ? 'training' : 'blacksmith',
        text: `${hero.def.name} trained honestly and gained ${gain} power. A slow miracle.`,
        bubble: `+${gain} power. Earned.`,
        d: { trust: 1, morale: 1 + Math.floor(training / 2) },
      };
    }

    if (hero.def.personality === 'Suspicious Merchant' && market >= 3 && Math.random() < 0.55) {
      return {
        building: 'market',
        text: `${hero.def.name} optimized prices until the price tags looked guilty.`,
        bubble: 'Dynamic suffering.',
        d: { gold: 40 + market * 18, corruption: market >= 4 ? 2 : 1, trust: market >= 4 ? -1 : 0 },
      };
    }

    const rolled = rollHeroEvent(hero.def);
    return {
      ...rolled,
      d: { ...rolled.d },
    };
  }

  runCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;
    this.publishTownHint();

    this.day += 1;
    this.registry.set('day', this.day);
    this.returnAwayHeroes();

    const steps = [];
    steps.push(() => {
      this.game.events.emit('gwg-event', `Day ${this.day}: the gates open.`);
    });

    const questsToResolve = [...this.postedQuests];
    if (questsToResolve.length > 0) {
      for (const quest of questsToResolve) {
        steps.push(() => this.resolvePostedQuest(quest));
      }
    } else {
      steps.push(() => {
        const d = { gold: -35, morale: -2, threat: 7 };
        this.applyDeltas(d);
        this.floatDeltas(this.buildingById.guildhall.x, this.buildingById.guildhall.y - this.buildingById.guildhall.h - 10, d);
        this.game.events.emit('gwg-event', 'No quest bounties were posted. Heroes improvise, which is rarely cheaper.');
      });
    }

    // the whale station always earns; whales in town make it earn harder
    steps.push(() => {
      const whale = this.buildingById.whale;
      const whaleCount = this.heroes.filter((h) => h.def.personality === 'Noble Whale').length;
      const whaleLevel = this.getPlaceLevel(whale);
      const income = 180 + whaleLevel * 95 + whaleCount * 155 + Math.floor(this.resources.corruption * 2.2) + Phaser.Math.Between(0, 120);
      const d = {
        gold: income,
        trust: -Phaser.Math.Between(3, 5 + whaleLevel),
        corruption: Phaser.Math.Between(3 + whaleLevel, 7 + whaleLevel),
      };
      this.applyDeltas(d);
      this.stats.whaleEvents += 1;
      this.burstCoins(42);
      this.floatDeltas(whale.x, whale.y - whale.h - 10, d);
      this.game.events.emit('gwg-event',
        `Golden Whale Milking Station earned ${income} gold. Trust ${d.trust}, Corruption +${d.corruption}.`);
      this.triggerWhaleReaction();
      this.maybeBlockPoorHero();
    });

    // occasional flavor from the station itself
    if (Math.random() < 0.5) {
      steps.push(() => {
        const whale = this.buildingById.whale;
        const flavor = Phaser.Utils.Array.GetRandom(WHALE_FLAVOR);
        this.applyDeltas(flavor.d);
        this.floatDeltas(whale.x, whale.y - whale.h - 10, flavor.d);
        this.game.events.emit('gwg-event', flavor.text);
        this.triggerWhaleReaction();
      });
    }

    // a handful of heroes act out their day: walk to the building, then speak
    const actorCount = Phaser.Math.Clamp(5 + this.getPlaceLevel(this.buildingById.guildhall), 6, 11);
    const actors = Phaser.Utils.Array.Shuffle([...this.getActiveHeroes()]).slice(0, actorCount);
    for (const hero of actors) {
      const ev = this.chooseHeroAction(hero);
      steps.push(() => {
        const b = this.placeById[ev.building] || this.buildingById.guildhall;
        const spot = this.doorById[ev.building] || this.doorById.guildhall;
        hero.currentAction = ev.whale ? 'Buying premium advantage' : `Acting at ${this.getPlaceName(ev.building)}`;
        this.applyDeltas(ev.d);
        hero.stats.morale = Phaser.Math.Clamp(hero.stats.morale + (ev.d.morale || 0) * 2, 0, 100);
        hero.stats.loyalty = Phaser.Math.Clamp(hero.stats.loyalty + (ev.d.trust || 0) * 2, 0, 100);
        if (ev.d.corruption > 0 && !hero.stats.whaleAccess && this.resources.corruption > 55) {
          hero.stats.debt += ev.d.corruption * 12;
        }
        this.floatDeltas(b.x, b.y - (b.h || 58) - 10, ev.d);
        this.game.events.emit('gwg-event', ev.text);

        // satire stat bookkeeping
        if (ev.building === 'training') hero.stats.power += this.getPlaceLevel(this.buildingById.training);
        if (ev.d.gold > 0) hero.stats.spent += ev.d.gold;
        if (ev.whale) {
          this.burstCoins(34);
          this.triggerWhaleReaction();
          this.checkUnlocks();
        }

        this.walkTo(hero, spot, () => {
          this.say(hero, ev.bubble, true);
          if (ev.leave) this.sendHeroAway(hero, 2);
          else this.scheduleAmbient(hero, Phaser.Math.Between(3000, 6000));
        });
      });
    }

    // world pressure
    steps.push(() => {
      const R = this.resources;
      const marketLevel = this.getPlaceLevel(this.buildingById.market);
      const tavernLevel = this.getPlaceLevel(this.buildingById.tavern);
      const dungeonLevel = this.getPlaceLevel(this.buildingById.dungeon);
      const complaintLevel = this.getPlaceLevel(this.decorationById.complaint_barrel);
      const debtLevel = this.getPlaceLevel(this.decorationById.debt_collector_booth);
      const passive = {
        gold: marketLevel * 18 + this.getPlaceLevel(this.buildingById.guildhall) * 6,
        morale: Math.max(0, tavernLevel + complaintLevel - 2),
        corruption: marketLevel >= 4 ? 1 : 0,
        threat: Phaser.Math.Between(4, 8) + dungeonLevel - Math.floor(complaintLevel / 2),
      };
      this.applyDeltas(passive);
      this.floatDeltas(PLAZA.x, PLAZA.y - 64, passive);
      if (passive.gold || passive.morale) {
        this.game.events.emit('gwg-event', `Town upgrades paid off: +${passive.gold}g, +${passive.morale} Morale.`);
      }
      if (R.trust < 30) {
        const barrel = this.decorationById.complaint_barrel;
        const d = { trust: -1, morale: -Math.max(1, 4 - complaintLevel) };
        this.applyDeltas(d);
        this.floatDeltas(barrel.x, barrel.y - 44, d);
        this.game.events.emit('gwg-event', 'Citizens discovered the fairness brochure was decorative.');
        const honest = this.getActiveHeroes().filter((hero) => this.isHonestHero(hero.def));
        if (honest.length > 0 && Math.random() < 0.5) {
          const hero = Phaser.Utils.Array.GetRandom(honest);
          this.say(hero, 'Decorative fairness?', true);
          this.sendHeroAway(hero, 2);
        }
      }
      if (R.corruption >= 70) {
        const booth = this.decorationById.debt_collector_booth;
        const d = { gold: 45 + debtLevel * 22, corruption: 2, trust: -2, morale: -1 };
        this.applyDeltas(d);
        this.floatDeltas(booth.x, booth.y - 62, d);
        this.game.events.emit('gwg-event', 'The town accountant renamed corruption to strategic sparkle.');
      }
      if (R.morale < 30) {
        const tavern = this.buildingById.tavern;
        const d = { morale: -1, trust: -1 };
        this.applyDeltas(d);
        this.floatDeltas(tavern.x, tavern.y - tavern.h - 10, d);
        this.game.events.emit('gwg-event', 'A hero retired to become a tutorial warning.');
      }
      if (R.threat >= 80) {
        const gate = this.buildingById.dungeon;
        const d = { gold: -Math.min(260, Math.floor(R.gold * 0.16)), trust: -4, morale: -5, threat: -22 };
        this.applyDeltas(d);
        this.floatDeltas(gate.x, gate.y - gate.h - 14, d);
        this.floatText(gate.x, gate.y - gate.h - 34, 'TOWN ATTACK', '#e74c3c');
        this.stats.threatEventsSurvived += 1;
        this.game.events.emit('gwg-event', 'The dungeon sent a complaint in person.');
        const candidates = this.heroes.filter((h) => h.state !== 'inside' && !h.bubble);
        if (candidates.length > 0) {
          this.say(
            Phaser.Utils.Array.GetRandom(candidates),
            Phaser.Utils.Array.GetRandom(THREAT_REACTIONS),
            true,
          );
        }
      }
      this.stats.trustStreak = this.resources.trust > 50 ? this.stats.trustStreak + 1 : 0;
      this.checkObjectives();
    });

    steps.push(() => {
      this.cycleRunning = false;
      this.refreshQuestNotices();
      this.checkObjectives();
      this.checkUnlocks();
      this.publishTownHint();
      this.saveGame(false);
      this.game.events.emit('gwg-cycle-done');
    });

    steps.forEach((fn, i) => this.time.delayedCall(i * STEP_MS, fn));
  }
}
