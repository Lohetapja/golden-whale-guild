// Minimal HUD overlay: top resource strip, bottom event ticker, Open Gates button.
// Deliberately small — this is a game scene, not a dashboard.
import Phaser from 'phaser';

const WIDTH = 1280;
const HEIGHT = 720;
const FONT = '"Courier New", monospace';
const MAX_TICKER_QUEUE = 6;
const MAX_TICKER_CHARS = 150;

// gold icon resolves through the icon_coin asset slot at create time;
// the rest are placeholder HUD icons with no asset slot yet
const RESOURCE_META = [
  { key: 'gold', label: 'Gold', icon: 'ph-icon_coin', asset: 'icon_coin', color: '#f6c945' },
  { key: 'trust', label: 'Trust', icon: 'icon-trust', color: '#7fdc93' },
  { key: 'corruption', label: 'Corruption', icon: 'icon-corruption', color: '#c99aec' },
  { key: 'morale', label: 'Morale', icon: 'icon-morale', color: '#f0938f' },
  { key: 'threat', label: 'Threat', icon: 'icon-threat', color: '#d4dae2' },
];

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.buildTopBar();
    this.buildObjectives();
    this.buildTicker();
    this.buildEndDayButton();
    this.buildUtilityButtons();

    this.registry.events.on('changedata-resources', (_p, value) => this.updateResources(value));
    this.registry.events.on('changedata-objectives', (_p, value) => this.updateObjectives(value));
    this.registry.events.on('changedata-day', (_p, value) => {
      this.dayText.setText(`Day ${value}`);
      this.flashDayBanner(value);
    });
    this.game.events.on('gwg-event', this.queueEvent, this);
    this.game.events.on('gwg-cycle-done', this.enableCycleButton, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-event', this.queueEvent, this);
      this.game.events.off('gwg-cycle-done', this.enableCycleButton, this);
    });

    this.updateResources(this.registry.get('resources'));
    this.updateObjectives(this.registry.get('objectives'));
    this.dayText.setText(`Day ${this.registry.get('day')}`);
  }

  // --- top resource bar ------------------------------------------------

  buildTopBar() {
    this.add.rectangle(WIDTH / 2, 22, WIDTH, 44, 0x141a24, 0.9);

    this.resourceTexts = {};
    let x = 16;
    for (const meta of RESOURCE_META) {
      const iconKey = meta.asset && this.textures.exists(meta.asset) ? meta.asset : meta.icon;
      this.add.image(x + 6, 22, iconKey).setScale(1.4);
      const text = this.add.text(x + 18, 22, `${meta.label} 0`, {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: meta.color,
        stroke: '#0c1118', strokeThickness: 2,
      }).setOrigin(0, 0.5);
      this.resourceTexts[meta.key] = { text, meta };
      x += 30 + text.width + 120; // generous fixed spacing; text length varies little
    }

    this.dayText = this.add.text(WIDTH - 16, 22, 'Day 1', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff6dc',
      stroke: '#0c1118', strokeThickness: 2,
    }).setOrigin(1, 0.5);

    this.warningText = this.add.text(16, 50, '', {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#0c1118',
      strokeThickness: 3,
    }).setDepth(6000);
  }

  updateResources(res) {
    if (!res) return;
    for (const { key } of RESOURCE_META) {
      const slot = this.resourceTexts[key];
      const changed = this.lastRes && this.lastRes[key] !== res[key];
      slot.text.setText(`${slot.meta.label} ${res[key]}`);
      const danger = (
        (key === 'trust' && res[key] < 30)
        || (key === 'corruption' && res[key] > 70)
        || (key === 'morale' && res[key] < 30)
        || (key === 'threat' && res[key] > 80)
      );
      slot.text.setColor(danger ? '#ff6b6b' : slot.meta.color);
      if (changed) {
        // small pulse so the eye catches which resource just moved
        this.tweens.add({
          targets: slot.text, scale: { from: 1.25, to: 1 },
          duration: 260, ease: 'Cubic.easeOut',
        });
      }
    }
    const warnings = [];
    if (res.trust < 30) warnings.push('LOW TRUST');
    if (res.corruption > 70) warnings.push('HIGH CORRUPTION');
    if (res.morale < 30) warnings.push('LOW MORALE');
    if (res.threat > 80) warnings.push('THREAT CRITICAL');
    this.warningText.setText(warnings.join('  /  '));
    this.lastRes = { ...res };
  }

  buildObjectives() {
    this.objectiveText = this.add.text(WIDTH - 16, 52, '', {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 3,
      align: 'right',
      wordWrap: { width: 340 },
      lineSpacing: 2,
    }).setOrigin(1, 0).setDepth(6000);
  }

  updateObjectives(data) {
    if (!data) return;
    const lines = [`Objectives ${data.completed}/${data.total}`];
    for (const item of data.active || []) lines.push(`- ${item}`);
    this.objectiveText.setText(lines.join('\n'));
  }

  // --- bottom event ticker ----------------------------------------------

  buildTicker() {
    this.add.rectangle(WIDTH / 2, HEIGHT - 22, WIDTH, 44, 0x0f1521, 0.92);
    this.tickerText = this.add.text(16, HEIGHT - 22, '', {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 2,
      wordWrap: { width: WIDTH - 205 },
      lineSpacing: 3,
    }).setOrigin(0, 0.5);
    this.tickerText.setMaxLines(2);

    this.eventQueue = [];
    this.tickerBusy = false;
  }

  queueEvent(text) {
    const cleanText = this.formatTickerText(text);
    if (!cleanText) return;
    while (this.eventQueue.length >= MAX_TICKER_QUEUE) this.eventQueue.shift();
    this.eventQueue.push(cleanText);
    if (!this.tickerBusy) this.showNextEvent();
  }

  formatTickerText(text) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (cleanText.length <= MAX_TICKER_CHARS) return cleanText;
    return `${cleanText.slice(0, MAX_TICKER_CHARS - 3)}...`;
  }

  showNextEvent() {
    const next = this.eventQueue.shift();
    if (next === undefined) {
      this.tickerBusy = false;
      return;
    }
    this.tickerBusy = true;
    this.tickerText.setText(`> ${next}`).setAlpha(0);
    this.tweens.add({ targets: this.tickerText, alpha: 1, duration: 180 });
    this.time.delayedCall(2700, () => this.showNextEvent());
  }

  // --- cycle button ---------------------------------------------------------
  // "Open Gates" is the town-cycle trigger; internally still a day tick.

  buildEndDayButton() {
    const x = WIDTH - 80;
    const y = HEIGHT - 60;

    // ui_button asset replaces the drawn rectangle when present
    const useAsset = this.textures.exists('ui_button');
    if (useAsset) {
      this.cycleBg = this.add.image(x, y, 'ui_button')
        .setDisplaySize(132, 34)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setTint(0xffe6b0);
        else if (state === 'locked') this.cycleBg.setTint(0x888888);
        else this.cycleBg.clearTint();
      };
    } else {
      this.cycleBg = this.add.rectangle(x, y, 128, 32, 0x8a5a2b)
        .setStrokeStyle(2, 0xf2c744)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setFillStyle(0xa66f38);
        else if (state === 'locked') this.cycleBg.setFillStyle(0x5c4423);
        else this.cycleBg.setFillStyle(0x8a5a2b);
      };
    }
    this.cycleLabel = this.add.text(x, y, 'Open Gates >', {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#fff6dc',
    }).setOrigin(0.5);

    this.cycleBg.on('pointerover', () => this.styleButton('hover'));
    this.cycleBg.on('pointerout', () => this.styleButton('normal'));
    this.cycleBg.on('pointerup', () => {
      // relative scaling so an asset-backed button (setDisplaySize) pops correctly
      this.tweens.add({
        targets: this.cycleBg,
        scaleX: this.cycleBg.scaleX * 0.92, scaleY: this.cycleBg.scaleY * 0.92,
        duration: 70, yoyo: true,
      });
      this.tweens.add({ targets: this.cycleLabel, scale: 0.92, duration: 70, yoyo: true });
      // locked until TownScene reports the cycle playback has finished
      this.cycleBg.disableInteractive();
      this.styleButton('locked');
      this.cycleLabel.setText('The town stirs...').setAlpha(0.8);
      this.game.events.emit('gwg-end-day');
    });
  }

  buildUtilityButtons() {
    this.makeUtilityButton(WIDTH - 182, HEIGHT - 60, 'Save', 'gwg-save');
    this.makeUtilityButton(WIDTH - 240, HEIGHT - 60, 'Reset', 'gwg-reset');
  }

  makeUtilityButton(x, y, label, eventName) {
    const bg = this.add.rectangle(x, y, 52, 24, 0x273244, 0.94)
      .setStrokeStyle(1, 0xf6c945)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#fff6dc',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3a4a63, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(0x273244, 0.94));
    bg.on('pointerup', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.92, duration: 70, yoyo: true });
      this.game.events.emit(eventName);
    });
  }

  enableCycleButton() {
    this.cycleBg.setInteractive({ useHandCursor: true });
    this.styleButton('normal');
    this.cycleLabel.setText('Open Gates >').setAlpha(1);
  }

  flashDayBanner(day) {
    const banner = this.add.text(WIDTH / 2, 200, `Day ${day}`, {
      fontFamily: FONT, fontSize: '34px', fontStyle: 'bold',
      color: '#fff6dc', stroke: '#141a24', strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({
      targets: banner, alpha: 1, y: 190, duration: 350, yoyo: true, hold: 900,
      onComplete: () => banner.destroy(),
    });
  }
}
