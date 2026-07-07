// The town map: terrain, buildings, wandering heroes, and the day simulation.
// All important game objects resolve their texture through src/assets.js so
// real sprites can replace placeholder art without touching this file.
import Phaser from 'phaser';
import { BUILDINGS } from '../data/buildings.js';
import { DECORATIONS, PATH_NODES } from '../data/decorations.js';
import { HEROES } from '../data/heroes.js';
import { rollHeroEvent, WHALE_FLAVOR } from '../data/events.js';
import {
  DENIED_LINES,
  IDLE_QUIPS,
  QUEUE_LINES,
  THREAT_REACTIONS,
  WHALE_REACTIONS,
} from '../data/dialogue.js';
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
    this.buildDecorations();
    this.doorById = Object.fromEntries(this.doorSpots.map((s) => [s.id, s]));
    this.placeById = { ...this.buildingById, ...this.decorationById };
    this.activeBubbles = 0;
    this.importantChatterUntil = 0;
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
    for (const d of DECORATIONS) {
      this.decorationById[d.id] = d;
      const key = resolveTexture(this, d.assetKey, d.fallbackKey);
      if (!key) continue;

      const img = this.add.image(d.x, d.y, key)
        .setOrigin(0.5, 1)
        .setDepth(d.y + (d.depthOffset || 0));

      if (d.scale) img.setScale(d.scale);

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
        img.on('pointerover', () => img.setTint(0xfff3c0));
        img.on('pointerout', () => img.clearTint());
        img.on('pointerup', () => this.showTooltip(d));
      }

      if (d.label) {
        this.add.text(d.x, d.y + 4, d.name, {
          fontFamily: '"Courier New", monospace',
          fontSize: '10px',
          fontStyle: 'bold',
          color: '#fff6dc',
          stroke: '#0c1118',
          strokeThickness: 2,
          backgroundColor: '#0f1521cc',
          padding: { x: 4, y: 2 },
        }).setOrigin(0.5, 0).setDepth(2000);
      }

      if (d.spot) {
        this.doorSpots.push({ id: d.id, x: d.x, y: d.y + 8 });
      }
    }
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
      frequency: 140,
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
    this.hideTooltip();

    // clicking empty ground dismisses the tooltip
    this.input.on('pointerdown', (pointer, over) => {
      if (over.length === 0) this.hideTooltip();
    });
  }

  showTooltip(b) {
    const level = b.level !== undefined ? `Level: ${b.level}` : null;
    const effect = b.effect ? `Effect: ${b.effect}` : null;
    const upgrade = b.upgrade ? `Upgrade: ${b.upgrade}` : 'Upgrade: decorative, probably';

    this.tooltipTitle.setText(b.name);
    this.tooltipText.setText(b.description || 'A suspiciously undocumented town object.');
    this.tooltipEffects.setText([level, effect].filter(Boolean).join('\n'));
    this.tooltipUpgrade.setText(upgrade);

    const pad = 12;
    const gap = 7;
    const contentW = Math.max(
      220,
      this.tooltipTitle.width,
      this.tooltipText.width,
      this.tooltipEffects.width,
      this.tooltipUpgrade.width,
    );
    const tw = Math.min(340, contentW + pad * 2);
    const effectsH = this.tooltipEffects.text ? this.tooltipEffects.height + gap : 0;
    const th = pad
      + this.tooltipTitle.height + gap
      + this.tooltipText.height + gap
      + effectsH
      + this.tooltipUpgrade.height
      + pad;
    const x = Phaser.Math.Clamp(b.x - tw / 2, 8, WIDTH - tw - 8);
    const y = Phaser.Math.Clamp(b.y - (b.h || 60) - th - 10, 48, HEIGHT - th - 52);

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

    if (this.tooltipTimer) this.tooltipTimer.remove();
    this.tooltipTimer = this.time.delayedCall(5200, () => this.hideTooltip());
  }

  hideTooltip() {
    if (this.tooltipPanel) this.tooltipPanel.setVisible(false);
    this.tooltipBg.setVisible(false);
    this.tooltipTitle.setVisible(false);
    this.tooltipText.setVisible(false);
    this.tooltipEffects.setVisible(false);
    this.tooltipUpgrade.setVisible(false);
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
        this.say(hero, hero.def.statLine || `PWR ${hero.stats.power} - ${hero.stats.gold}g - spent ${hero.stats.spent}g`, true);
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
    // heroes drift toward their preferred hangouts most of the time
    let spot;
    const preferredIds = hero.def.preferredDestinations || [hero.def.prefers].filter(Boolean);
    const preferredSpots = preferredIds
      .map((id) => this.doorById[id])
      .filter((s) => s && s.id !== hero.at);
    if (Math.random() < 0.62 && preferredSpots.length > 0) {
      spot = Phaser.Utils.Array.GetRandom(preferredSpots);
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

  say(hero, text, important = false) {
    if (!hero || !text) return;
    if (!important && this.activeBubbles >= 3) return;
    if (important) this.importantChatterUntil = this.time.now + 2800;

    if (hero.bubble) {
      hero.bubble.destroy();
      hero.bubble = null;
      this.activeBubbles = Math.max(0, this.activeBubbles - 1);
    }
    if (hero.bubbleTimer) { hero.bubbleTimer.remove(); hero.bubbleTimer = null; }
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

    const edgeOffset = hero.container.x < 130 ? 54 : hero.container.x > WIDTH - 130 ? -54 : 0;
    const bubble = this.add.container(edgeOffset, -64, [g, txt]).setScale(0);
    hero.container.add(bubble);
    hero.bubble = bubble;
    this.activeBubbles += 1;

    this.tweens.add({ targets: bubble, scale: 1, duration: 180, ease: 'Back.easeOut' });
    hero.bubbleTimer = this.time.delayedCall(important ? 3400 : 2800, () => {
      this.tweens.add({
        targets: bubble, alpha: 0, duration: 220,
        onComplete: () => {
          if (hero.bubble === bubble) hero.bubble = null;
          this.activeBubbles = Math.max(0, this.activeBubbles - 1);
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
      const candidates = this.heroes.filter((h) => (
        (h.state === 'idle' || h.state === 'walking') && !h.bubble
      ));
      if (
        candidates.length > 0
        && !this.cycleRunning
        && this.activeBubbles < 3
        && this.time.now > this.importantChatterUntil
      ) {
        const hero = Phaser.Utils.Array.GetRandom(candidates);
        const lines = [
          ...(IDLE_QUIPS[hero.def.personality] || []),
          ...(hero.def.idleLines || []),
        ];
        this.say(hero, Phaser.Utils.Array.GetRandom(lines));
      }
      this.time.delayedCall(Phaser.Math.Between(4200, 8200), chatter);
    };
    this.time.delayedCall(2600, chatter);
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

  runCycle() {
    if (this.cycleRunning) return;
    this.cycleRunning = true;

    this.day += 1;
    this.registry.set('day', this.day);

    const steps = [];
    steps.push(() => {
      this.game.events.emit('gwg-event', `Day ${this.day}: the gates open.`);
    });

    // the whale station always earns; whales in town make it earn harder
    steps.push(() => {
      const whale = this.buildingById.whale;
      const whaleCount = this.heroes.filter((h) => h.def.personality === 'Noble Whale').length;
      const income = 300 + whaleCount * 180 + Phaser.Math.Between(0, 160);
      const d = { gold: income, trust: -Phaser.Math.Between(3, 6), corruption: Phaser.Math.Between(4, 8) };
      this.applyDeltas(d);
      this.coinBurst.explode(42);
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
    const actors = Phaser.Utils.Array.Shuffle([...this.heroes]).slice(0, 7);
    for (const hero of actors) {
      const ev = rollHeroEvent(hero.def);
      steps.push(() => {
        const b = this.placeById[ev.building] || this.buildingById.guildhall;
        const spot = this.doorById[ev.building] || this.doorById.guildhall;
        this.applyDeltas(ev.d);
        this.floatDeltas(b.x, b.y - (b.h || 58) - 10, ev.d);
        this.game.events.emit('gwg-event', ev.text);

        // satire stat bookkeeping
        if (ev.building === 'training') hero.stats.power += 1;
        if (ev.d.gold > 0) hero.stats.spent += ev.d.gold;

        this.walkTo(hero, spot, () => {
          this.say(hero, ev.bubble, true);
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
        const candidates = this.heroes.filter((h) => h.state !== 'inside' && !h.bubble);
        if (candidates.length > 0) {
          this.say(
            Phaser.Utils.Array.GetRandom(candidates),
            Phaser.Utils.Array.GetRandom(THREAT_REACTIONS),
            true,
          );
        }
      }
    });

    steps.push(() => {
      this.cycleRunning = false;
      this.game.events.emit('gwg-cycle-done');
    });

    steps.forEach((fn, i) => this.time.delayedCall(i * STEP_MS, fn));
  }
}
