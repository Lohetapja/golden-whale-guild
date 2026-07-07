// The town map: terrain, buildings, wandering heroes, and the day simulation.
// All important game objects resolve their texture through src/assets.js so
// real sprites can replace placeholder art without touching this file.
import Phaser from 'phaser';
import { BUILDINGS } from '../data/buildings.js';
import { HEROES } from '../data/heroes.js';
import { rollHeroEvent, IDLE_QUIPS, WHALE_FLAVOR, DENIED_LINES } from '../data/events.js';
import { loadAssets, ensureFallbacks, resolveTexture, buildingTexture, heroTexture } from '../assets.js';

const WIDTH = 1280;
const HEIGHT = 720;
const PLAZA = { x: 610, y: 410 };
const STEP_MS = 1600; // pacing of the day-cycle playback

const RES_COLORS = {
  gold: '#f6c945',
  trust: '#7fdc93',
  corruption: '#c99aec',
  morale: '#f0938f',
  threat: '#d4dae2',
};
const RES_SHORT = { gold: 'g', trust: ' Trust', corruption: ' Corr', morale: ' Morale', threat: ' Threat' };

export default class TownScene extends Phaser.Scene {
  constructor() {
    super('TownScene');
  }

  preload() {
    loadAssets(this);
  }

  create() {
    ensureFallbacks(this);

    this.day = 1;
    this.resources = { gold: 500, trust: 50, corruption: 10, morale: 60, threat: 20 };
    this.cycleRunning = false;

    this.buildTerrain();
    this.buildBuildings();
    this.buildTooltip();
    this.buildHeroes();
    this.startIdleChatter();

    // shared state for the UI scene
    this.registry.set('day', this.day);
    this.registry.set('resources', { ...this.resources });

    this.scene.launch('UIScene');
    this.game.events.on('gwg-end-day', this.runCycle, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-end-day', this.runCycle, this);
    });

    this.game.events.emit('gwg-event', 'Welcome to Golden Whale Guild. Click buildings to inspect. Open Gates to run a town cycle.');
  }

  // --- world ------------------------------------------------------------

  buildTerrain() {
    this.add.tileSprite(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 'grass');

    // dirt paths: plaza circle + stamped cobble trails to every building door
    const path = this.add.graphics();
    path.fillStyle(0xd9bc85);
    path.fillCircle(PLAZA.x, PLAZA.y, 62);
    for (const b of BUILDINGS) {
      this.stampPath(path, PLAZA.x, PLAZA.y, b.x, b.y + 8);
    }

    this.add.image(PLAZA.x, PLAZA.y, 'fountain').setDepth(PLAZA.y - 14);

    // decorations — positions picked to stay clear of buildings and paths
    const trees = [
      [70, 150], [160, 120], [60, 440], [120, 690], [470, 140],
      [860, 130], [1225, 170], [1240, 680], [790, 700], [150, 560],
      [520, 700], [905, 340], [420, 400],
    ];
    for (const [x, y] of trees) {
      const tree = this.add.image(x, y, 'tree').setOrigin(0.5, 1).setDepth(y);
      // lazy breeze sway
      this.tweens.add({
        targets: tree, angle: { from: -1.2, to: 1.2 },
        duration: Phaser.Math.Between(1800, 3200), yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1500),
      });
    }
    const rocks = [[220, 460], [980, 160], [1120, 640], [340, 190], [720, 160]];
    for (const [x, y] of rocks) {
      this.add.image(x, y, 'rock').setOrigin(0.5, 1).setDepth(y);
    }
    for (let i = 0; i < 18; i += 1) {
      const x = Phaser.Math.Between(30, WIDTH - 30);
      const y = Phaser.Math.Between(90, HEIGHT - 60);
      this.add.image(x, y, 'flowers').setDepth(1).setAlpha(0.9);
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

    for (const b of BUILDINGS) {
      this.buildingById[b.id] = b;
      const img = this.add.image(b.x, b.y, buildingTexture(this, b))
        .setOrigin(0.5, 1)
        .setDepth(b.y)
        .setInteractive({ useHandCursor: true });

      // hover/click feedback: tint plus a small grow pop
      img.on('pointerover', () => {
        img.setTint(0xfff3c0);
        this.tweens.add({ targets: img, scale: 1.03, duration: 90 });
      });
      img.on('pointerout', () => {
        img.clearTint();
        this.tweens.add({ targets: img, scale: 1, duration: 90 });
      });
      img.on('pointerup', () => this.showTooltip(b));

      // name plate under each building keeps the map readable
      this.add.text(b.x, b.y + 4, b.name, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fff6dc',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 1 },
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

  buildWhaleStationDressing() {
    // Golden Whale Milking Station: glow, coins, carpet, VIP rope. Peak premium.
    const whale = this.buildingById.whale;
    const coinKey = resolveTexture(this, 'icon_coin', 'ph-icon_coin');

    const glow = this.add.image(whale.x, whale.y - 60, 'glow')
      .setDepth(whale.y - whale.h - 1)
      .setScale(2.2)
      .setAlpha(0.5);
    this.tweens.add({
      targets: glow, alpha: 0.9, scale: 2.5,
      duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // real whale sign asset floats above the door once it exists
    if (resolveTexture(this, 'icon_whale')) {
      this.add.image(whale.x, whale.y - whale.h * 0.45, 'icon_whale').setDepth(whale.y + 1);
    }

    // steady trickle of coins rising out of the chimney region
    this.add.particles(whale.x, whale.y - whale.h + 20, coinKey, {
      x: { min: -70, max: 70 },
      speedY: { min: -45, max: -20 },
      speedX: { min: -8, max: 8 },
      alpha: { start: 1, end: 0 },
      scale: { min: 0.7, max: 1.1 },
      lifespan: 1600,
      frequency: 260,
    }).setDepth(whale.y + 1);

    // burst emitter fired when the station cashes in during a cycle
    this.coinBurst = this.add.particles(whale.x, whale.y - 90, coinKey, {
      speed: { min: 70, max: 180 },
      angle: { min: 210, max: 330 },
      gravityY: 220,
      lifespan: 1000,
      scale: { start: 1.2, end: 0.5 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(whale.y + 2);

    // premium entrance: red carpet + velvet rope in front of the door
    this.add.image(whale.x, whale.y + 22, 'carpet').setDepth(2);
    this.add.image(whale.x, whale.y + 30, 'viprope').setOrigin(0.5, 1).setDepth(whale.y + 30);
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
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#f6c945',
    }).setDepth(5001);
    this.tooltipText = this.add.text(0, 0, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#fff6dc',
      wordWrap: { width: 240 },
      lineSpacing: 3,
    }).setDepth(5001);
    this.hideTooltip();

    // clicking empty ground dismisses the tooltip
    this.input.on('pointerdown', (pointer, over) => {
      if (over.length === 0) this.hideTooltip();
    });
  }

  showTooltip(b) {
    this.tooltipTitle.setText(b.name);
    this.tooltipText.setText([
      b.description,
      `Lv ${b.level}  ·  ${b.effect}`,
      `Upgrade: ${b.upgrade} (soon™)`,
    ].join('\n'));

    const tw = Math.max(this.tooltipTitle.width, this.tooltipText.width) + 18;
    const th = this.tooltipTitle.height + this.tooltipText.height + 16;
    const x = Phaser.Math.Clamp(b.x - tw / 2, 8, WIDTH - tw - 8);
    const y = Math.max(52, b.y - b.h - th - 8);

    if (this.tooltipPanel) {
      this.tooltipPanel.setPosition(x, y).setDisplaySize(tw, th).setVisible(true);
    } else {
      this.tooltipBg.clear();
      this.tooltipBg.fillStyle(0x1d2430, 0.94);
      this.tooltipBg.fillRoundedRect(x, y, tw, th, 5);
      this.tooltipBg.lineStyle(1, 0xf2c744, 0.9);
      this.tooltipBg.strokeRoundedRect(x, y, tw, th, 5);
      this.tooltipBg.setVisible(true);
    }
    this.tooltipTitle.setPosition(x + 9, y + 6).setVisible(true);
    this.tooltipText.setPosition(x + 9, y + 8 + this.tooltipTitle.height).setVisible(true);

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(4000, () => this.hideTooltip());
  }

  hideTooltip() {
    if (this.tooltipPanel) this.tooltipPanel.setVisible(false);
    this.tooltipBg.setVisible(false);
    this.tooltipTitle.setVisible(false);
    this.tooltipText.setVisible(false);
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
        fontSize: '10px',
        color: '#ffffff',
        backgroundColor: '#00000066',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 1);

      const container = this.add.container(x, y, [sprite, label]).setDepth(y);
      const hero = {
        def, container, sprite, label,
        stats: { ...def.stats },
        at: spot.id, destination: null, state: 'idle',
        moveTween: null, bobTween: null, timer: null,
        destMarker: null, bubble: null, bubbleTimer: null,
      };

      // clicking a hero shows their satire stat line
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerup', () => {
        this.say(hero, `PWR ${hero.stats.power} · ${hero.stats.gold}g · spent ${hero.stats.spent}g`);
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
  }

  scheduleAmbient(hero, delay) {
    hero.timer = this.time.delayedCall(delay, () => this.ambientMove(hero));
  }

  ambientMove(hero) {
    // heroes drift toward their preferred hangout ~45% of the time
    let spot;
    if (Math.random() < 0.45 && hero.def.prefers !== hero.at) {
      spot = this.doorById[hero.def.prefers];
    } else {
      spot = Phaser.Utils.Array.GetRandom(this.doorSpots.filter((s) => s.id !== hero.at));
    }
    this.walkTo(hero, spot, () => this.onAmbientArrive(hero, spot));
  }

  walkTo(hero, spot, onArrive) {
    this.interruptHero(hero);
    hero.state = 'walking';
    hero.destination = spot.id;

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
        onArrive();
      },
    });
  }

  onAmbientArrive(hero, spot) {
    // non-whales get bounced off the VIP rope more often than not
    if (spot.id === 'whale' && hero.def.personality !== 'Noble Whale') {
      if (hero.def.personality === 'Debt Goblin' && Math.random() < 0.35) {
        this.say(hero, 'Snuck in. Shh.');
        this.enterBuilding(hero);
        return;
      }
      if (Math.random() < 0.6) {
        this.say(hero, Phaser.Utils.Array.GetRandom(DENIED_LINES));
        this.floatText(spot.x, spot.y - 34, 'VIPs ONLY', '#e74c3c');
        hero.timer = this.time.delayedCall(900, () => this.ambientMove(hero));
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
    this.tweens.add({ targets: hero.container, alpha: 0, duration: 250 });
    hero.timer = this.time.delayedCall(Phaser.Math.Between(1500, 4000), () => {
      this.tweens.add({ targets: hero.container, alpha: 1, duration: 250 });
      hero.state = 'idle';
      this.scheduleAmbient(hero, Phaser.Math.Between(800, 3000));
    });
  }

  // --- speech bubbles & floating text --------------------------------------

  say(hero, text) {
    if (hero.bubble) { hero.bubble.destroy(); hero.bubble = null; }
    if (hero.bubbleTimer) { hero.bubbleTimer.remove(); hero.bubbleTimer = null; }
    hero.container.setAlpha(1);

    const txt = this.add.text(0, -4, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#1d2430',
    }).setOrigin(0.5, 1);

    const bw = txt.width + 12;
    const bh = txt.height + 8;
    const g = this.add.graphics();
    g.fillStyle(0xfff6dc, 0.97);
    g.fillRoundedRect(-bw / 2, -bh - 2, bw, bh, 4);
    g.fillTriangle(-4, -3, 4, -3, 0, 3); // tail
    g.lineStyle(1, 0x1d2430, 0.5);
    g.strokeRoundedRect(-bw / 2, -bh - 2, bw, bh, 4);

    const bubble = this.add.container(0, -58, [g, txt]).setScale(0);
    hero.container.add(bubble);
    hero.bubble = bubble;

    this.tweens.add({ targets: bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    hero.bubbleTimer = this.time.delayedCall(2400, () => {
      this.tweens.add({
        targets: bubble, alpha: 0, duration: 220,
        onComplete: () => {
          if (hero.bubble === bubble) hero.bubble = null;
          bubble.destroy();
        },
      });
    });
  }

  floatText(x, y, str, color) {
    const t = this.add.text(x, y, str, {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color,
      stroke: '#141a24',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4000);
    this.tweens.add({
      targets: t, y: y - 38, alpha: 0,
      duration: 1500, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
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
      const candidates = this.heroes.filter((h) => h.state === 'idle' && !h.bubble);
      if (candidates.length > 0 && !this.cycleRunning) {
        const hero = Phaser.Utils.Array.GetRandom(candidates);
        this.say(hero, Phaser.Utils.Array.GetRandom(IDLE_QUIPS[hero.def.personality]));
      }
      this.time.delayedCall(Phaser.Math.Between(5000, 10000), chatter);
    };
    this.time.delayedCall(3500, chatter);
  }

  update() {
    // depth-sort heroes by their feet; talking heroes pop above rooftops
    for (const hero of this.heroes) {
      hero.container.setDepth(hero.container.y + (hero.bubble ? 800 : 0));
    }
  }

  // --- daily simulation ----------------------------------------------------

  applyDeltas(deltas) {
    const R = this.resources;
    for (const [key, value] of Object.entries(deltas)) R[key] += value;
    for (const key of ['trust', 'corruption', 'morale', 'threat']) {
      R[key] = Phaser.Math.Clamp(R[key], 0, 100);
    }
    R.gold = Math.max(0, R.gold);
    this.registry.set('resources', { ...R });
  }

  runCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;

    this.day += 1;
    this.registry.set('day', this.day);

    const steps = [];
    steps.push(() => {
      this.game.events.emit('gwg-event', `☀ Day ${this.day}: the gates open.`);
    });

    // the whale station always earns; whales in town make it earn harder
    steps.push(() => {
      const whale = this.buildingById.whale;
      const whaleCount = HEROES.filter((h) => h.personality === 'Noble Whale').length;
      const income = 300 + whaleCount * 180 + Phaser.Math.Between(0, 160);
      const d = { gold: income, trust: -Phaser.Math.Between(3, 6), corruption: Phaser.Math.Between(4, 8) };
      this.applyDeltas(d);
      this.coinBurst.explode(26);
      this.floatDeltas(whale.x, whale.y - whale.h - 10, d);
      this.game.events.emit('gwg-event',
        `Golden Whale Milking Station earned ${income} gold. Trust ${d.trust}, Corruption +${d.corruption}.`);
    });

    // occasional flavor from the station itself
    if (Math.random() < 0.5) {
      steps.push(() => {
        const whale = this.buildingById.whale;
        const flavor = Phaser.Utils.Array.GetRandom(WHALE_FLAVOR);
        this.applyDeltas(flavor.d);
        this.floatDeltas(whale.x, whale.y - whale.h - 10, flavor.d);
        this.game.events.emit('gwg-event', flavor.text);
      });
    }

    // a handful of heroes act out their day: walk to the building, then speak
    const actors = Phaser.Utils.Array.Shuffle([...this.heroes]).slice(0, 5);
    for (const hero of actors) {
      const ev = rollHeroEvent(hero.def);
      steps.push(() => {
        const b = this.buildingById[ev.building];
        this.applyDeltas(ev.d);
        this.floatDeltas(b.x, b.y - b.h - 10, ev.d);
        this.game.events.emit('gwg-event', ev.text);

        // satire stat bookkeeping
        if (ev.building === 'training') hero.stats.power += 1;
        if (ev.d.gold > 0) hero.stats.spent += ev.d.gold;

        this.walkTo(hero, this.doorById[ev.building], () => {
          this.say(hero, ev.bubble);
          this.scheduleAmbient(hero, Phaser.Math.Between(3000, 6000));
        });
      });
    }

    // world pressure
    steps.push(() => {
      const R = this.resources;
      this.applyDeltas({ threat: Phaser.Math.Between(2, 5) });
      if (R.corruption >= 60) {
        this.applyDeltas({ morale: -3 });
        this.game.events.emit('gwg-event', 'Rumors of rigged loot tables spread through town. Morale -3.');
      }
      if (R.trust <= 20) {
        this.game.events.emit('gwg-event', 'Townsfolk eye the Guild Hall with open suspicion.');
      }
      if (R.threat >= 80) {
        const gate = this.buildingById.dungeon;
        this.floatText(gate.x, gate.y - gate.h - 14, 'THE GATE RATTLES', '#e74c3c');
        this.game.events.emit('gwg-event', 'The Dungeon Gate rattles. Something big wants out.');
      }
    });

    steps.push(() => {
      this.cycleRunning = false;
      this.game.events.emit('gwg-cycle-done');
    });

    steps.forEach((fn, i) => this.time.delayedCall(i * STEP_MS, fn));
  }
}
