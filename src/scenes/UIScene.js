// Minimal HUD overlay: top resource strip, bottom event ticker, and city controls.
// Deliberately small — this is a game scene, not a dashboard.
import Phaser from 'phaser';
import BuildMenuPanel from '../ui/BuildMenuPanel.js';
import { getResponsiveUi } from '../ui/responsive.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FONT = '"Courier New", monospace';
const MAX_TICKER_QUEUE = 6;
const MAX_TICKER_CHARS = 150;

// HUD icons resolve through manifest slots when present; placeholders remain fallback.
const RESOURCE_META = [
  {
    key: 'gold', label: 'Gold', icon: 'ph-icon_coin', asset: 'icon_coin', color: '#f6c945',
    help: 'Used for upgrades, quest bounties, roads, services, and bad ideas. Comes from quests, trade, taxes, loot, and premium abuse.',
    danger: (v) => (v < 120 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 120 ? 'Warning: low gold blocks upgrades, road planning, and quest bounties.' : 'Safe: enough gold to build, post quests, or make one suspicious decision.'),
  },
  {
    key: 'trust', label: 'Trust', icon: 'icon-trust', asset: 'icon_trust', color: '#7fdc93',
    help: 'Trust keeps honest heroes in town. It rises from fair quests, honest services, and public order; it falls when the town scams everyone.',
    danger: (v) => (v < 20 ? 'critical' : v < 30 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 20 ? 'Critical: trust collapse is close. Expect exits, protests, and dramatic barrel usage.' : v < 30 ? 'Warning: honest heroes are losing faith.' : 'Safe: citizens can still pretend the fairness brochure is real.'),
  },
  {
    key: 'corruption', label: 'Corruption', icon: 'icon-corruption', asset: 'icon_corruption', color: '#c99aec',
    help: 'Corruption comes from premium nonsense, loot boxes, shady finance, fake odds, and convenience abuse. It makes gold easier and consequences louder.',
    danger: (v) => (v > 86 ? 'critical' : v > 70 ? 'warning' : 'safe'),
    dangerText: (v) => (v > 86 ? 'Critical: scandal territory, now with sparkle effects.' : v > 70 ? 'Warning: debt, fake odds, and premium problems become more common.' : 'Safe-ish: the paperwork is only lightly cursed.'),
  },
  {
    key: 'morale', label: 'Morale', icon: 'icon-morale', asset: 'icon_morale', color: '#f0938f',
    help: 'Morale affects quest success and hero stamina. Rest, food, victories, and fair treatment help; losses, injuries, debt, and scams hurt.',
    danger: (v) => (v < 20 ? 'critical' : v < 30 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 20 ? 'Critical: morale crash is close. Ragequits and failures are lining up.' : v < 30 ? 'Warning: failures and ragequits are more likely.' : 'Safe: heroes are still making eye contact with danger.'),
  },
  {
    key: 'threat', label: 'Threat', icon: 'icon-threat', asset: 'icon_threat', color: '#d4dae2',
    help: 'Threat means monsters, dungeons, and expansion risks are gaining confidence. Quests, patrols, towers, and monster hunts reduce it.',
    danger: (v) => (v > 90 ? 'critical' : v > 80 ? 'warning' : 'safe'),
    dangerText: (v) => (v > 90 ? 'Critical: invasion is close. The dungeon is rehearsing its entrance.' : v > 80 ? 'Warning: town attack risk is high.' : 'Safe: the dungeon is only thinking loudly.'),
  },
];

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // compact = touch device where the FIT-scaled canvas makes the desktop
    // HUD unreadably small; sizes below are multiplied by rsp.size so buttons
    // keep roughly constant physical size on phones
    this.rsp = getResponsiveUi();
    this.buildTopBar();
    this.buildTownHint();
    this.buildObjectives();
    this.buildHelperText();
    this.buildTicker();
    this.buildBottomFrame();
    if (this.rsp.compact) {
      this.buildMobileBottomBar();
    } else {
      this.buildEndDayButton();
      this.buildUtilityButtons();
      this.buildTownLedgerButton();
      this.buildTimeControls();
    }
    this.buildHtmlPanels();
    this.buildHeroRoster();
    this.setupResponsiveRestart();

    this.registry.events.on('changedata-resources', (_p, value) => this.updateResources(value));
    this.registry.events.on('changedata-heroRoster', (_p, value) => this.updateHeroRoster(value));
    this.registry.events.on('changedata-objectives', (_p, value) => this.updateObjectives(value));
    this.registry.events.on('changedata-townHint', (_p, value) => this.updateTownHint(value));
    this.registry.events.on('changedata-townStage', (_p, value) => this.updateTownStage(value));
    this.registry.events.on('changedata-townIdentity', () => this.updateTownStage(this.registry.get('townStage')));
    this.registry.events.on('changedata-day', (_p, value) => {
      this.dayText.setText(`Day ${value}`);
      this.flashDayBanner(value);
    });
    this.registry.events.on('changedata-townNotice', (_p, value) => this.updateNoticeBadge(value));
    this.game.events.on('gwg-event', this.queueEvent, this);
    this.game.events.on('gwg-day-summary', this.showDaySummary, this);
    this.game.events.on('gwg-achievement', this.showAchievementToast, this);
    this.game.events.on('gwg-cycle-done', this.enableCycleButton, this);
    this.game.events.on('gwg-cycle-start', this.lockCycleButton, this);
    this.game.events.on('gwg-time-changed', this.updateTimeControls, this);
    this.game.events.on('gwg-build-mode', this.updateBuildMode, this);
    this.game.events.on('gwg-inspector-open', this.showInspectorPanel, this);
    this.game.events.on('gwg-ledger-open', this.showLedgerPanel, this);
    this.game.events.on('gwg-inspector-close', this.closeHtmlPanel, this);
    this.input.keyboard?.on('keydown-ESC', this.closeHtmlPanel, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('gwg-event', this.queueEvent, this);
      this.game.events.off('gwg-day-summary', this.showDaySummary, this);
      this.game.events.off('gwg-achievement', this.showAchievementToast, this);
      this.game.events.off('gwg-cycle-done', this.enableCycleButton, this);
      this.game.events.off('gwg-cycle-start', this.lockCycleButton, this);
      this.game.events.off('gwg-time-changed', this.updateTimeControls, this);
      this.game.events.off('gwg-build-mode', this.updateBuildMode, this);
      this.game.events.off('gwg-inspector-open', this.showInspectorPanel, this);
      this.game.events.off('gwg-ledger-open', this.showLedgerPanel, this);
      this.game.events.off('gwg-inspector-close', this.closeHtmlPanel, this);
      this.input.keyboard?.off('keydown-ESC', this.closeHtmlPanel, this);
    });

    this.updateResources(this.registry.get('resources'));
    this.updateHeroRoster(this.registry.get('heroRoster'));
    this.updateObjectives(this.registry.get('objectives'));
    this.updateTownHint(this.registry.get('townHint'));
    this.updateTownStage(this.registry.get('townStage'));
    this.dayText.setText(`Day ${this.registry.get('day')}`);
    this.updateNoticeBadge(this.registry.get('townNotice'));
    this.updateTimeControls(this.registry.get('simulationSpeed') ?? 1);
  }

  // --- top resource bar ------------------------------------------------

  buildTopBar() {
    const compact = this.rsp?.compact;
    const barHeight = compact ? 72 : 62;
    const barCenterY = barHeight / 2;
    this.add.rectangle(WIDTH / 2, barCenterY, WIDTH, barHeight, 0x0f1521, 0.94);
    this.add.rectangle(WIDTH / 2, barHeight, WIDTH, 2, 0xbf8a38, 0.68);
    this.resourceTexts = {};
    const slotW = compact ? 134 : 162;
    const slotH = compact ? 48 : 42;
    const startX = compact ? 10 : 14;
    const gap = compact ? 6 : 8;
    const labelFont = compact ? this.rsp.font(8) : '10px';
    const valueFont = compact ? this.rsp.font(12) : '18px';
    const iconTarget = compact ? Math.min(32, this.rsp.size(14)) : 20;
    for (const [index, meta] of RESOURCE_META.entries()) {
      const x = startX + index * (slotW + gap);
      const cx = x + slotW / 2;
      const iconKey = meta.asset && this.textures.exists(meta.asset) ? meta.asset : meta.icon;
      const bg = this.add.rectangle(cx, barCenterY, slotW, slotH, 0x17202d, 0.92)
        .setStrokeStyle(1, 0x31405a, 0.9)
        .setInteractive({ useHandCursor: true });
      const icon = this.add.image(x + (compact ? 21 : 18), barCenterY, iconKey)
        .setScale(this.getHudIconScale(iconKey, iconTarget))
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x + (compact ? 42 : 38), compact ? 24 : 19, meta.label.toUpperCase(), {
        fontFamily: FONT, fontSize: labelFont, fontStyle: 'bold', color: '#d4dae2',
        stroke: '#0c1118', strokeThickness: 2,
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      const value = this.add.text(x + (compact ? 42 : 38), compact ? 45 : 39, '0', {
        fontFamily: FONT, fontSize: valueFont, fontStyle: 'bold', color: meta.color,
        stroke: '#0c1118', strokeThickness: 2,
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      const openHelp = () => this.showResourceHelp(meta);
      bg.on('pointerup', openHelp);
      icon.on('pointerup', openHelp);
      label.on('pointerup', openHelp);
      value.on('pointerup', openHelp);
      this.resourceTexts[meta.key] = { bg, icon, label, value, meta };
    }

    // clicking the day counter opens the latest weekly report or pending policy
    this.dayText = this.add.text(WIDTH - 16, compact ? 22 : 25, 'Day 1', {
      fontFamily: FONT, fontSize: compact ? this.rsp.font(11) : '16px', fontStyle: 'bold', color: '#fff6dc',
      stroke: '#0c1118', strokeThickness: 2,
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    this.dayText.on('pointerover', () => this.dayText.setColor('#ffe08a'));
    this.dayText.on('pointerout', () => this.dayText.setColor('#fff6dc'));
    this.dayText.on('pointerup', () => this.game.events.emit('gwg-open-report'));

    this.warningText = this.add.text(16, compact ? 76 : 67, '', {
      fontFamily: FONT,
      fontSize: compact ? this.rsp.font(8) : '12px',
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#0c1118',
      strokeThickness: 3,
      wordWrap: { width: compact ? 650 : 520 },
    }).setDepth(6000);

    this.stageText = this.add.text(WIDTH - 16, compact ? 76 : 68, '', {
      fontFamily: FONT,
      fontSize: compact ? this.rsp.font(8) : '12px',
      fontStyle: 'bold',
      color: '#f6c945',
      stroke: '#0c1118',
      strokeThickness: 3,
      align: 'right',
      wordWrap: { width: 330 },
    }).setOrigin(1, 0).setDepth(6000);
  }

  getHudIconScale(iconKey, targetSize = 14) {
    const source = this.textures.get(iconKey)?.getSourceImage?.();
    const sourceSize = Math.max(source?.width || 0, source?.height || 0);
    if (!sourceSize) return 1;
    return Phaser.Math.Clamp(targetSize / sourceSize, 0.35, 1.5);
  }

  updateResources(res) {
    if (!res) return;
    for (const { key } of RESOURCE_META) {
      const slot = this.resourceTexts[key];
      const changed = this.lastRes && this.lastRes[key] !== res[key];
      const danger = (
        (key === 'trust' && res[key] < 30)
        || (key === 'corruption' && res[key] > 70)
        || (key === 'morale' && res[key] < 30)
        || (key === 'threat' && res[key] > 80)
      );
      const dangerState = slot.meta.danger?.(res[key]) || (danger ? 'warning' : 'safe');
      slot.value.setText(`${res[key]}${dangerState === 'critical' ? ' !!' : dangerState === 'warning' ? ' !' : ''}`);
      slot.value.setColor(dangerState === 'critical' ? '#ff6b5f' : dangerState === 'warning' ? '#ffe08a' : slot.meta.color);
      slot.bg.setFillStyle(
        dangerState === 'critical' ? 0x3f1e27 : dangerState === 'warning' ? 0x3a3020 : 0x17202d,
        0.94,
      );
      slot.bg.setStrokeStyle(1, dangerState === 'critical' ? 0xff6b5f : dangerState === 'warning' ? 0xf6c945 : 0x31405a, 0.92);
      if (changed) {
        // small pulse so the eye catches which resource just moved
        this.tweens.add({
          targets: slot.value, scale: { from: 1.18, to: 1 },
          duration: 260, ease: 'Cubic.easeOut',
        });
      }
    }
    const warnings = [];
    if (res.trust < 30) warnings.push('LOW TRUST');
    if (res.corruption > 70) warnings.push('HIGH CORRUPTION');
    if (res.morale < 30) warnings.push('LOW MORALE');
    if (res.threat > 80) warnings.push('THREAT CRITICAL');
    this.warningText.setText(warnings.slice(0, 3).join('   '));
    this.lastRes = { ...res };
  }

  buildObjectives() {
    this.objectiveText = this.add.text(WIDTH - 16, 152, '', {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 3,
      align: 'right',
      wordWrap: { width: 360 },
      lineSpacing: 3,
    }).setOrigin(1, 0).setDepth(6000);
  }

  updateObjectives(data) {
    if (!data) return;
    const active = data.active || [];
    const lines = [`Goal ${data.completed}/${data.total}`];
    if (active[0]) lines.push(`Now: ${active[0]}`);
    if (active[1]) lines.push(`Next: ${active[1]}`);
    this.objectiveText.setText(lines.join('\n'));
  }

  buildTownHint() {
    this.townHintText = this.add.text(WIDTH - 16, 108, '', {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#0c1118',
      strokeThickness: 3,
      align: 'right',
      wordWrap: { width: 390 },
    }).setOrigin(1, 0).setDepth(6000);
  }

  updateTownHint(text) {
    this.townHintText.setText(text || '');
  }

  updateTownStage(text) {
    if (!this.stageText) return;
    const identity = this.registry.get('townIdentity');
    this.stageText.setText(text ? `Stage: ${text}${identity ? `\nIdentity: ${identity}` : ''}` : '');
  }

  showResourceHelp(meta) {
    const res = this.registry.get('resources') || {};
    const value = res[meta.key] ?? 0;
    const state = meta.danger?.(value) || 'safe';
    this.showInspectorPanel({
      title: meta.label,
      subtitle: `Current: ${value} - ${state.toUpperCase()}`,
      sections: [
        { title: 'Meaning', lines: [meta.help] },
        {
          title: 'Current State',
          lines: [{
            text: meta.dangerText?.(value) || 'Safe: nothing is currently on fire in this category.',
            className: state === 'safe' ? 'gwg-good' : 'gwg-bad',
          }],
        },
      ],
    });
  }

  buildHelperText() {
    const hasTouch = this.sys.game.device.input.touch;
    const text = hasTouch
      ? 'Drag to pan - Pinch or +/- to zoom - Build roads/services - Tap heroes'
      : 'Drag/WASD to pan - Wheel to zoom - Build roads/services - Inspect heroes';
    this.helperText = this.add.text(WIDTH / 2, this.rsp?.compact ? 82 : 74, text, {
      fontFamily: FONT,
      fontSize: this.rsp?.compact ? this.rsp.font(8) : '12px',
      fontStyle: 'bold',
      color: '#d4dae2',
      stroke: '#0c1118',
      strokeThickness: 3,
      wordWrap: { width: this.rsp?.compact ? 760 : 900 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(6000);
    this.time.delayedCall(9000, () => {
      this.tweens.add({ targets: this.helperText, alpha: 0, duration: 800 });
    });
  }

  // --- bottom event ticker ----------------------------------------------

  addBottomGroupLabel(x, y, text, width) {
    this.add.text(x - width / 2 + 10, y - 30, text.toUpperCase(), {
      fontFamily: FONT,
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#d4dae2',
      stroke: '#0c1118',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
  }

  buildBottomFrame() {
    if (this.rsp?.compact) {
      const controlY = this.rsp.bottomBarY;
      this.add.rectangle(WIDTH / 2, controlY, WIDTH - 24, 92, 0x101721, 0.86)
        .setStrokeStyle(1, 0x31405a, 0.9);
      this.add.rectangle(324, controlY, 622, 70, 0x17202d, 0.72)
        .setStrokeStyle(1, 0x273244, 0.85);
      this.add.rectangle(856, controlY, 390, 70, 0x17202d, 0.7)
        .setStrokeStyle(1, 0x273244, 0.8);
      this.add.rectangle(WIDTH - 116, controlY, 224, 72, 0x231b13, 0.76)
        .setStrokeStyle(1, 0xbf8a38, 0.92);
      return;
    }
    const controlY = HEIGHT - 64;
    this.add.rectangle(WIDTH / 2, controlY, WIDTH - 28, 48, 0x101721, 0.84)
      .setStrokeStyle(1, 0x31405a, 0.9);
    this.add.rectangle(176, controlY, 330, 38, 0x17202d, 0.78)
      .setStrokeStyle(1, 0x273244, 0.9);
    this.addBottomGroupLabel(176, controlY, 'Info', 330);
    this.add.rectangle(474, controlY, 214, 38, 0x17202d, 0.78)
      .setStrokeStyle(1, 0x273244, 0.9);
    this.addBottomGroupLabel(474, controlY, 'Management', 214);
    this.add.rectangle(666, controlY, 150, 38, 0x17202d, 0.78)
      .setStrokeStyle(1, 0x273244, 0.9);
    this.addBottomGroupLabel(666, controlY, 'System', 150);
    this.add.rectangle(936, controlY, 430, 38, 0x17202d, 0.76)
      .setStrokeStyle(1, 0x273244, 0.9);
    this.addBottomGroupLabel(936, controlY, 'Time', 430);
    this.add.rectangle(WIDTH - 104, controlY, 184, 48, 0x231b13, 0.74)
      .setStrokeStyle(1, 0xbf8a38, 0.9);
  }

  buildTicker() {
    this.add.rectangle(WIDTH / 2, HEIGHT - 22, WIDTH, 44, 0x0f1521, 0.92);
    this.tickerText = this.add.text(16, HEIGHT - 22, '', {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 2,
      wordWrap: { width: WIDTH - 32 },
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
  // Skip Day remains the manual cycle trigger while the real-time clock runs.

  buildEndDayButton(options = {}) {
    const x = options.x ?? (WIDTH - 104);
    const y = options.y ?? (HEIGHT - 64);
    const width = options.width ?? 168;
    const height = options.height ?? 44;
    this.cycleReadyLabel = options.label ?? (this.rsp?.compact ? 'Skip Day' : 'Skip Day >');

    // ui_button asset replaces the drawn rectangle when present
    const useAsset = this.textures.exists('ui_button');
    if (useAsset) {
      this.cycleBg = this.add.image(x, y, 'ui_button')
        .setDisplaySize(width, height)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setTint(0xffe6b0);
        else if (state === 'locked') this.cycleBg.setTint(0x888888);
        else this.cycleBg.clearTint();
      };
    } else {
      this.cycleBg = this.add.rectangle(x, y, width, height, 0x8a5a2b)
        .setStrokeStyle(2, 0xf2c744)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setFillStyle(0xa66f38);
        else if (state === 'locked') this.cycleBg.setFillStyle(0x5c4423);
        else this.cycleBg.setFillStyle(0x8a5a2b);
      };
    }
    this.cycleLabel = this.add.text(x, y, this.cycleReadyLabel, {
      fontFamily: FONT,
      fontSize: this.rsp?.compact ? `${Math.min(30, Math.max(19, this.rsp.size(10)))}px` : '16px',
      fontStyle: 'bold',
      color: '#fff6dc',
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
      this.cycleLabel.setText('Resolving...').setAlpha(0.8);
      this.game.events.emit('gwg-end-day');
    });
  }

  buildUtilityButtons() {
    // row squeezed slightly to fit the Delete tool before the time controls
    this.makeUtilityButton(408, HEIGHT - 64, 'Build', 'gwg-open-build', 62);
    this.makeUtilityButton(474, HEIGHT - 64, 'Roads', 'gwg-open-roads', 58);
    this.makeUtilityButton(540, HEIGHT - 64, 'Delete', 'gwg-open-delete', 60);
    this.makeUtilityButton(630, HEIGHT - 64, 'Save', 'gwg-save');
    this.makeUtilityButton(702, HEIGHT - 64, 'Reset', 'gwg-reset', 58);
    // camera zoom lives on the right edge, clear of panels and the day button
    this.makeUtilityButton(WIDTH - 26, HEIGHT - 250, 'Home', 'gwg-camera-home', 46);
    const zoomIn = this.makeUtilityButton(WIDTH - 26, HEIGHT - 210, '+', 'gwg-zoom', 36, 1);
    const zoomOut = this.makeUtilityButton(WIDTH - 26, HEIGHT - 170, '-', 'gwg-zoom', 36, -1);
    for (const [button, iconKey] of [[zoomIn, 'ui_zoom_in'], [zoomOut, 'ui_zoom_out']]) {
      if (!this.textures.exists(iconKey)) continue;
      button.text.setVisible(false);
      this.add.image(button.bg.x, button.bg.y, iconKey).setScale(0.62).setDepth(button.text.depth);
    }
  }

  buildTownLedgerButton() {
    this.makeUtilityButton(42, HEIGHT - 64, 'Help', 'gwg-open-help', 54);
    this.makeUtilityButton(113, HEIGHT - 64, 'Town Log', 'gwg-open-town-log', 80);
    this.makeUtilityButton(188, HEIGHT - 64, 'Stores', 'gwg-open-stores', 62);
    this.makeUtilityButton(256, HEIGHT - 64, 'Policy', 'gwg-open-policies', 64);
    this.makeUtilityButton(330, HEIGHT - 64, 'Ledger', 'gwg-open-ledger', 74);
  }

  buildTimeControls() {
    const controls = [
      { x: 790, label: '||', speed: 0, width: 42 },
      { x: 836, label: '1x', speed: 1, width: 42 },
      { x: 882, label: '2x', speed: 2, width: 42 },
      { x: 928, label: '4x', speed: 4, width: 42 },
    ];
    this.timeButtons = {};
    for (const control of controls) {
      this.timeButtons[control.speed] = this.makeUtilityButton(
        control.x,
        HEIGHT - 64,
        control.label,
        'gwg-time-speed',
        control.width,
        control.speed,
      );
    }
    this.buildModeText = this.add.text(970, HEIGHT - 64, '', {
      fontFamily: FONT,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7fdc93',
      stroke: '#0c1118',
      strokeThickness: 2,
      lineSpacing: 2,
      wordWrap: { width: 118 },
    }).setOrigin(0, 0.5);
    this.cancelBuildButton = this.makeUtilityButton(
      1042,
      HEIGHT - 64,
      'Cancel',
      'gwg-cancel-build',
      72,
    );
    this.cancelBuildButton.bg.setVisible(false).disableInteractive();
    this.cancelBuildButton.text.setVisible(false);
    // road-plan confirm sits just above Cancel; visible only with a plan
    this.confirmBuildButton = this.makeUtilityButton(
      1042,
      HEIGHT - 104,
      'Confirm',
      'gwg-confirm-build',
      72,
    );
    this.confirmBuildButton.bg.setVisible(false).disableInteractive();
    this.confirmBuildButton.text.setVisible(false);
  }

  buildMobileBottomBar() {
    const y = this.rsp.bottomBarY;
    this.makeUtilityButton(54, y, 'More', 'gwg-open-more', 86, undefined, { height: 56 });
    this.makeUtilityButton(150, y, 'Build', 'gwg-open-build', 80, undefined, { height: 56 });
    this.makeUtilityButton(236, y, 'Roads', 'gwg-open-roads', 80, undefined, { height: 56 });
    this.makeUtilityButton(324, y, 'Delete', 'gwg-open-delete', 84, undefined, { height: 56 });

    const controls = [
      { x: 412, label: '||', speed: 0 },
      { x: 470, label: '1x', speed: 1 },
      { x: 528, label: '2x', speed: 2 },
      { x: 586, label: '4x', speed: 4 },
    ];
    this.timeButtons = {};
    for (const control of controls) {
      this.timeButtons[control.speed] = this.makeUtilityButton(
        control.x,
        y,
        control.label,
        'gwg-time-speed',
        52,
        control.speed,
        { height: 52 },
      );
    }

    this.buildModeText = this.add.text(646, y, '', {
      fontFamily: FONT,
      fontSize: this.rsp.font(8),
      fontStyle: 'bold',
      color: '#7fdc93',
      stroke: '#0c1118',
      strokeThickness: 2,
      lineSpacing: 2,
      wordWrap: { width: 224 },
    }).setOrigin(0, 0.5);
    this.cancelBuildButton = this.makeUtilityButton(
      936,
      y,
      'Cancel',
      'gwg-cancel-build',
      104,
      undefined,
      { height: 56 },
    );
    this.cancelBuildButton.bg.setVisible(false).disableInteractive();
    this.cancelBuildButton.text.setVisible(false);
    this.confirmBuildButton = this.makeUtilityButton(
      936,
      y - 66,
      'Confirm',
      'gwg-confirm-build',
      104,
      undefined,
      { height: 56 },
    );
    this.confirmBuildButton.bg.setVisible(false).disableInteractive();
    this.confirmBuildButton.text.setVisible(false);

    this.buildEndDayButton({
      x: WIDTH - 116,
      y,
      width: 206,
      height: 58,
      label: 'Skip Day',
    });

    this.makeUtilityButton(WIDTH - 40, HEIGHT - 304, 'Home', 'gwg-camera-home', 76, undefined, { height: 54 });
    this.makeUtilityButton(WIDTH - 40, HEIGHT - 244, '+', 'gwg-zoom', 58, 1, { height: 54 });
    this.makeUtilityButton(WIDTH - 40, HEIGHT - 184, '-', 'gwg-zoom', 58, -1, { height: 54 });
  }

  setupResponsiveRestart() {
    const refreshResponsiveState = () => {
      this.rsp = getResponsiveUi();
    };
    window.addEventListener('resize', refreshResponsiveState);
    window.addEventListener('orientationchange', refreshResponsiveState);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', refreshResponsiveState);
      window.removeEventListener('orientationchange', refreshResponsiveState);
    });
  }

  makeUtilityButton(x, y, label, eventName, width = 64, eventValue = undefined, options = {}) {
    const compact = this.rsp?.compact;
    const height = options.height ?? (compact ? Math.min(58, this.rsp.buttonHeight) : 34);
    const fontSize = options.fontSize ?? (compact
      ? `${Math.min(26, Math.max(17, this.rsp.size(8)))}px`
      : '13px');
    const bg = this.add.rectangle(x, y, width, height, 0x223047, 0.96)
      .setStrokeStyle(1, 0xbf8a38)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize,
      fontStyle: 'bold',
      color: '#fff6dc',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x344a67, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(0x223047, 0.96));
    bg.on('pointerup', () => {
      this.tweens.add({ targets: [bg, text], scale: 0.92, duration: 70, yoyo: true });
      if (eventName === 'gwg-reset') {
        if (!this.resetArmUntil || this.time.now > this.resetArmUntil) {
          this.resetArmUntil = this.time.now + 2600;
          text.setText('Reset?');
          this.time.delayedCall(2600, () => {
            if (this.time.now >= this.resetArmUntil) text.setText(label);
          });
          return;
        }
        this.resetArmUntil = 0;
        text.setText(label);
      }
      this.game.events.emit(eventName, eventValue);
    });
    return { bg, text, label };
  }

  buildHtmlPanels() {
    document.getElementById('gwg-inspector')?.remove();

    this.panelEl = document.createElement('div');
    this.panelEl.id = 'gwg-inspector';
    this.panelEl.className = 'gwg-panel gwg-hidden';
    this.panelEl.innerHTML = `
      <div class="gwg-panel-head">
        <div class="gwg-panel-title">
          <h2></h2>
          <p></p>
        </div>
        <button class="gwg-panel-close" type="button" aria-label="Close inspector">X</button>
      </div>
      <div class="gwg-panel-body"></div>
    `;
    document.body.appendChild(this.panelEl);
    this.panelTitleEl = this.panelEl.querySelector('h2');
    this.panelSubtitleEl = this.panelEl.querySelector('.gwg-panel-title p');
    this.panelBodyEl = this.panelEl.querySelector('.gwg-panel-body');
    this.buildMenuPanel = new BuildMenuPanel(this.panelBodyEl, {
      escapeHtml: this.escapeHtml.bind(this),
      renderAction: this.renderAction.bind(this),
    });
    this.currentHtmlPanelType = null;
    this.townLedgerScrollTop = 0;

    this.panelEl.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.registry.set('uiPointerBlocked', true);
    });
    const releaseUiPointer = () => {
      window.setTimeout(() => this.registry.set('uiPointerBlocked', false), 0);
    };
    this.panelEl.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      releaseUiPointer();
    });
    this.panelEl.addEventListener('pointercancel', releaseUiPointer);
    window.addEventListener('pointerup', releaseUiPointer);
    window.addEventListener('pointercancel', releaseUiPointer);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('pointerup', releaseUiPointer);
      window.removeEventListener('pointercancel', releaseUiPointer);
      this.registry.set('uiPointerBlocked', false);
    });
    this.panelEl.addEventListener('click', (event) => {
      event.stopPropagation();
      const close = event.target.closest('.gwg-panel-close');
      if (close) {
        this.closeHtmlPanel();
        return;
      }

      const action = event.target.closest('[data-gwg-event]');
      if (!action || action.disabled) return;
      const eventName = action.dataset.gwgEvent;
      const id = action.dataset.gwgId || '';
      if (eventName === 'gwg-build-category') this.buildMenuPanel.capture();
      this.game.events.emit(eventName, id);
      if (['gwg-select-build', 'gwg-cancel-build'].includes(eventName)) {
        this.panelEl.classList.add('gwg-hidden');
        this.heroRosterEl?.classList.remove('gwg-roster-shelved');
        this.setWorldInputBlocked(false);
      }
    });
  }

  buildHeroRoster() {
    document.getElementById('gwg-hero-roster')?.remove();
    let savedPrefs = {};
    try {
      savedPrefs = JSON.parse(window.localStorage.getItem('gwg-hero-roster-ui-v1') || '{}');
    } catch {
      savedPrefs = {};
    }
    this.heroRosterCollapsed = savedPrefs.collapsed ?? window.matchMedia('(max-width: 760px)').matches;
    this.heroRosterGroups = {
      Favorites: true,
      Parties: true,
      Assigned: true,
      Defending: true,
      Injured: true,
      Idle: false,
      Unhappy: true,
      Leaving: true,
      Retired: false,
      Dead: false,
      Reserve: false,
      ...(savedPrefs.groups || {}),
    };
    this.idleHeroCycleIndex = 0;
    this.heroRosterEl = document.createElement('aside');
    this.heroRosterEl.id = 'gwg-hero-roster';
    this.heroRosterEl.className = `gwg-hero-roster${this.heroRosterCollapsed ? ' collapsed' : ''}`;
    this.heroRosterEl.innerHTML = `
      <div class="gwg-hero-roster-head">
        <button class="gwg-roster-toggle" type="button" data-roster-toggle aria-expanded="${this.heroRosterCollapsed ? 'false' : 'true'}">Heroes</button>
        <span></span>
      </div>
      <div class="gwg-hero-roster-body"></div>
    `;
    document.body.appendChild(this.heroRosterEl);
    this.heroRosterCountEl = this.heroRosterEl.querySelector('.gwg-hero-roster-head span');
    this.heroRosterBodyEl = this.heroRosterEl.querySelector('.gwg-hero-roster-body');

    const releaseUiPointer = () => {
      window.setTimeout(() => this.registry.set('uiPointerBlocked', false), 0);
    };
    this.heroRosterEl.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      this.registry.set('uiPointerBlocked', true);
    });
    this.heroRosterEl.addEventListener('pointerup', (event) => {
      event.stopPropagation();
      releaseUiPointer();
    });
    this.heroRosterEl.addEventListener('pointercancel', releaseUiPointer);
    this.heroRosterEl.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target.closest('[data-roster-toggle]')) {
        this.heroRosterCollapsed = !this.heroRosterCollapsed;
        this.heroRosterEl.classList.toggle('collapsed', this.heroRosterCollapsed);
        this.heroRosterEl.querySelector('[data-roster-toggle]')?.setAttribute('aria-expanded', String(!this.heroRosterCollapsed));
        this.saveHeroRosterPreferences();
        return;
      }
      const favorite = event.target.closest('[data-hero-favorite]');
      if (favorite) {
        this.game.events.emit('gwg-toggle-hero-favorite', favorite.dataset.heroFavorite);
        return;
      }
      const cycle = event.target.closest('[data-idle-cycle]');
      if (cycle) {
        const idleHeroes = (this.lastHeroRosterPayload?.heroes || []).filter((hero) => hero.status === 'Idle');
        if (!idleHeroes.length) return;
        const direction = Number(cycle.dataset.idleCycle) || 1;
        this.idleHeroCycleIndex = (this.idleHeroCycleIndex + direction + idleHeroes.length) % idleHeroes.length;
        this.game.events.emit('gwg-focus-hero', idleHeroes[this.idleHeroCycleIndex].id);
        return;
      }
      const group = event.target.closest('[data-roster-group]');
      if (group) {
        const id = group.dataset.rosterGroup;
        this.heroRosterGroups[id] = !this.heroRosterGroups[id];
        this.saveHeroRosterPreferences();
        this.updateHeroRoster(this.lastHeroRosterPayload);
        return;
      }
      const row = event.target.closest('[data-hero-id]');
      if (!row) return;
      this.game.events.emit('gwg-focus-hero', row.dataset.heroId);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.heroRosterEl?.remove();
      this.registry.set('uiPointerBlocked', false);
    });
  }

  saveHeroRosterPreferences() {
    try {
      window.localStorage.setItem('gwg-hero-roster-ui-v1', JSON.stringify({
        collapsed: this.heroRosterCollapsed,
        groups: this.heroRosterGroups,
      }));
    } catch {
      // UI preferences are optional; gameplay save remains authoritative.
    }
  }

  renderHeroRosterRow(hero) {
    const statusClass = this.escapeHtml(String(hero.status || '').toLowerCase().replace(/\s+/g, '-'));
    const intent = hero.destination && hero.status !== 'Idle'
      ? `${hero.action || 'Going'} -> ${hero.destination}`
      : (hero.action || 'Idle');
    const meta = [hero.careerStage, hero.party, hero.urgent].filter(Boolean).join(' - ');
    const icon = hero.icon
      ? `<img class="gwg-hero-roster-icon" src="${this.escapeHtml(hero.icon)}" alt="" />`
      : `<span class="gwg-hero-roster-icon fallback">${this.escapeHtml((hero.name || '?').charAt(0))}</span>`;
    return `
      <div class="gwg-hero-row ${statusClass}${hero.favorite ? ' favorite' : ''}">
        <button class="gwg-hero-focus" type="button" data-hero-id="${this.escapeHtml(hero.id)}" title="${this.escapeHtml(intent)}">
          ${icon}
          <span class="gwg-hero-row-copy">
            <strong>${this.escapeHtml(hero.name)} <em>${this.escapeHtml(hero.careerStage || hero.tier || '')}</em></strong>
            <small>${this.escapeHtml(intent)}${meta ? `<br>${this.escapeHtml(meta)}` : ''}</small>
          </span>
          <span class="gwg-hero-status">${this.escapeHtml(hero.status || 'Idle')}</span>
        </button>
        <button class="gwg-hero-favorite" type="button" data-hero-favorite="${this.escapeHtml(hero.id)}" aria-label="${hero.favorite ? 'Remove favorite' : 'Favorite hero'}" title="${hero.favorite ? 'Remove favorite' : 'Favorite hero'}">${hero.favorite ? '&#9733;' : '&#9734;'}</button>
      </div>
    `;
  }

  renderHeroRosterGroup(name, heroes) {
    if (!heroes.length) return '';
    const expanded = Boolean(this.heroRosterGroups[name]);
    const idleControls = name === 'Idle'
      ? `<span class="gwg-idle-cycle"><button type="button" data-idle-cycle="-1" aria-label="Previous idle hero">&lt;</button><button type="button" data-idle-cycle="1" aria-label="Next idle hero">&gt;</button></span>`
      : '';
    return `
      <section class="gwg-roster-group${expanded ? ' expanded' : ''}">
        <div class="gwg-roster-group-head">
          <button type="button" data-roster-group="${this.escapeHtml(name)}" aria-expanded="${expanded}">
            <span>${expanded ? '-' : '+'}</span>${this.escapeHtml(name)} <b>${heroes.length}</b>
          </button>
          ${idleControls}
        </div>
        ${expanded ? `<div class="gwg-roster-group-list">${heroes.map((hero) => this.renderHeroRosterRow(hero)).join('')}</div>` : ''}
      </section>
    `;
  }

  updateHeroRoster(payload = {}) {
    if (!this.heroRosterEl || !this.heroRosterBodyEl) return;
    this.lastHeroRosterPayload = payload || {};
    const heroes = Array.isArray(payload?.heroes) ? payload.heroes : [];
    const activeCount = heroes.filter((hero) => !['Dead', 'Left', 'Reserve', 'Retired'].includes(hero.status)).length;
    if (this.heroRosterCountEl) this.heroRosterCountEl.textContent = `${activeCount}/${heroes.length || 0}`;
    const favoriteIds = new Set(heroes.filter((hero) => hero.favorite).map((hero) => hero.id));
    const remaining = heroes.filter((hero) => !favoriteIds.has(hero.id));
    const assignedStatuses = new Set(['Walking', 'Exploring', 'On Quest', 'Returning', 'Looting', 'Fighting', 'Resting', 'Away']);
    const leaving = remaining.filter((hero) => hero.leaving);
    const unhappy = remaining.filter((hero) => hero.unhappy && !hero.leaving);
    const injured = remaining.filter((hero) => ['Injured', 'Missing'].includes(hero.status) && !hero.leaving);
    const retired = remaining.filter((hero) => hero.status === 'Retired');
    const dead = remaining.filter((hero) => ['Dead', 'Left'].includes(hero.status));
    const reserve = remaining.filter((hero) => hero.status === 'Reserve');
    const excluded = new Set([...leaving, ...unhappy, ...injured, ...retired, ...dead, ...reserve].map((hero) => hero.id));
    const defending = remaining.filter((hero) => !excluded.has(hero.id) && (hero.status === 'Defending' || hero.status === 'Fighting'));
    defending.forEach((hero) => excluded.add(hero.id));
    const parties = remaining.filter((hero) => !excluded.has(hero.id) && hero.party);
    parties.forEach((hero) => excluded.add(hero.id));
    const assigned = remaining.filter((hero) => !excluded.has(hero.id) && assignedStatuses.has(hero.status));
    assigned.forEach((hero) => excluded.add(hero.id));
    const groups = [
      ['Favorites', heroes.filter((hero) => hero.favorite)],
      ['Parties', parties],
      ['Assigned', assigned],
      ['Defending', defending],
      ['Injured', injured],
      ['Leaving', leaving],
      ['Unhappy', unhappy],
      ['Idle', remaining.filter((hero) => !excluded.has(hero.id) && hero.status === 'Idle')],
      ['Retired', retired],
      ['Dead', dead],
      ['Reserve', reserve],
    ];
    this.heroRosterBodyEl.innerHTML = groups.map(([name, items]) => this.renderHeroRosterGroup(name, items.slice(0, 28))).join('')
      || '<p class="gwg-hero-roster-empty">No heroes available. Even the volunteers read the terms.</p>';
  }

  setWorldInputBlocked(blocked) {
    const town = this.scene.get('TownScene');
    if (town?.input) town.input.enabled = !blocked;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  renderLine(line) {
    if (typeof line === 'string') return `<p>${this.escapeHtml(line)}</p>`;
    const cls = line.className ? ` class="${this.escapeHtml(line.className)}"` : '';
    const icon = line.icon
      ? `<img class="gwg-inline-icon" src="${this.escapeHtml(line.icon)}" alt="" />`
      : '';
    return `<p${cls}>${icon}${this.escapeHtml(line.text)}</p>`;
  }

  renderAction(action) {
    const disabled = action.disabled ? ' disabled' : '';
    const className = action.className ? ` ${this.escapeHtml(action.className)}` : '';
    return `
      <button
        class="gwg-action${className}"
        type="button"
        data-gwg-event="${this.escapeHtml(action.event)}"
        data-gwg-id="${this.escapeHtml(action.id || '')}"${disabled}
      >${this.escapeHtml(action.label)}</button>
    `;
  }

  renderPanelPayload(payload = {}) {
    const tabs = payload.tabs?.length
      ? `<nav class="gwg-tabs" aria-label="Build categories">${payload.tabs.map((tab) => `
        <button
          class="gwg-tab${tab.active ? ' active' : ''}"
          type="button"
          data-gwg-event="${this.escapeHtml(tab.event)}"
          data-gwg-id="${this.escapeHtml(tab.id)}"
          aria-pressed="${tab.active ? 'true' : 'false'}"
        >${this.escapeHtml(tab.label)}</button>
      `).join('')}</nav>`
      : '';
    const sections = (payload.sections || []).map((section) => `
      <section class="gwg-section">
        ${section.title ? `<h3>${this.escapeHtml(section.title)}</h3>` : ''}
        ${(section.lines || []).map((line) => this.renderLine(line)).join('')}
      </section>
    `).join('');

    const primaryActions = payload.primaryActions?.length
      ? `<div class="gwg-primary-actions">${payload.primaryActions.map((action) => this.renderAction(action)).join('')}</div>`
      : '';

    const rows = (payload.rows || []).map((row) => `
      <div class="gwg-row ${this.escapeHtml(row.kind || '')}">
        <div class="gwg-row-layout">
          ${row.preview
            ? `<img class="gwg-build-preview" src="${this.escapeHtml(row.preview)}" alt="" />`
            : row.swatch
              ? `<span class="gwg-road-swatch" style="--gwg-swatch:${this.escapeHtml(row.swatch)}" aria-hidden="true"></span>`
              : '<span class="gwg-build-preview gwg-build-preview-fallback" aria-hidden="true">+</span>'}
          <div class="gwg-row-content">
            <div class="gwg-row-title">
              <span>${this.escapeHtml(row.title)}</span>
              <span>${this.escapeHtml(row.meta || '')}</span>
            </div>
            ${(row.lines || []).map((line) => this.renderLine(line)).join('')}
            ${row.actions?.length ? `<div class="gwg-actions">${row.actions.map((action) => this.renderAction(action)).join('')}</div>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    const actions = payload.actions?.length && !payload.primaryActions?.length
      ? `<div class="gwg-actions">${payload.actions.map((action) => this.renderAction(action)).join('')}</div>`
      : '';
    return `${tabs}${primaryActions}${sections}${rows}${actions}`;
  }

  renderTownLedger(payload = {}) {
    const sections = (payload.sections || []).map((section) => `
      <section class="gwg-section">
        ${section.title ? `<h3>${this.escapeHtml(section.title)}</h3>` : ''}
        ${(section.lines || []).map((line) => this.renderLine(line)).join('')}
      </section>
    `).join('');
    const rows = (payload.rows || []).map((row) => {
      const preview = row.preview
        ? `<img class="gwg-ledger-preview" src="${this.escapeHtml(row.preview)}" alt="" />`
        : `<span class="gwg-ledger-preview fallback" aria-hidden="true">${this.escapeHtml(row.title?.charAt(0) || '+')}</span>`;
      return `
        <article class="gwg-ledger-item ${this.escapeHtml(row.kind || '')} ${this.escapeHtml(row.state || '')}">
          ${preview}
          <div class="gwg-ledger-copy">
            <div class="gwg-ledger-title">
              <div>
                <h3>${this.escapeHtml(row.title)}</h3>
                <span>${this.escapeHtml(row.levelLabel)}</span>
              </div>
              <span class="gwg-state-badge ${this.escapeHtml(row.state || '')}">${this.escapeHtml(row.stateLabel)}</span>
            </div>
            <div class="gwg-ledger-effects">
              <p><strong>Current</strong>${this.escapeHtml(row.current)}</p>
              <p><strong>Next</strong>${this.escapeHtml(row.next)}</p>
            </div>
            <p class="gwg-ledger-flavor">"${this.escapeHtml(row.flavor)}"</p>
          </div>
          <div class="gwg-ledger-decision">
            <strong>${this.escapeHtml(row.costLabel)}</strong>
            <span>${this.escapeHtml(row.consequence)}</span>
            ${row.actions?.length ? row.actions.map((action) => this.renderAction(action)).join('') : ''}
          </div>
        </article>
      `;
    }).join('');
    return `
      <div class="gwg-ledger-summary">
        <div class="fair">
          <strong>Fair growth</strong>
          <span>Morale, trust, and heroes who still make eye contact.</span>
        </div>
        <div class="shady">
          <strong>Shady growth</strong>
          <span>Fast gold, premium glow, and invoices from ethics.</span>
        </div>
      </div>
      ${sections}
      <div class="gwg-ledger-list">${rows}</div>
    `;
  }

  showInspectorPanel(payload) {
    this.showHtmlPanel(payload, false);
  }

  showLedgerPanel(payload) {
    this.showHtmlPanel(payload, true);
  }

  showHtmlPanel(payload = {}, ledger = false) {
    if (!this.panelEl) return;
    this.heroRosterEl?.classList.add('gwg-roster-shelved');
    const isBuildCatalog = payload.panelType === 'build-catalog';
    const isTownLedger = payload.panelType === 'town-ledger';
    const isDayReport = payload.panelType === 'day-report' || payload.panelType === 'week-report';
    if (this.currentHtmlPanelType === 'town-ledger') {
      this.townLedgerScrollTop = this.panelBodyEl.scrollTop;
    }
    this.setWorldInputBlocked(isBuildCatalog || ledger || isDayReport);
    this.panelEl.className = `gwg-panel${ledger ? ' gwg-ledger' : ''}${isBuildCatalog ? ' gwg-build-catalog' : ''}${isTownLedger ? ' gwg-town-ledger' : ''}${isDayReport ? ' gwg-day-report' : ''}`;
    this.panelTitleEl.textContent = payload.title || 'Inspector';
    this.panelSubtitleEl.textContent = payload.subtitle || '';
    this.currentHtmlPanelType = payload.panelType || (ledger ? 'ledger' : 'inspector');
    if (isBuildCatalog) {
      this.buildMenuPanel.show(payload);
      return;
    }
    this.buildMenuPanel.clear();
    this.panelBodyEl.innerHTML = isTownLedger
      ? this.renderTownLedger(payload)
      : this.renderPanelPayload(payload);
    this.panelBodyEl.scrollTop = isTownLedger ? this.townLedgerScrollTop : 0;
  }

  closeHtmlPanel() {
    if (!this.panelEl) return;
    this.buildMenuPanel?.capture();
    if (this.currentHtmlPanelType === 'town-ledger') {
      this.townLedgerScrollTop = this.panelBodyEl.scrollTop;
    }
    this.panelEl.classList.add('gwg-hidden');
    this.heroRosterEl?.classList.remove('gwg-roster-shelved');
    this.setWorldInputBlocked(false);
    this.game.events.emit('gwg-selection-clear');
  }

  enableCycleButton() {
    if (!this.cycleBg || !this.cycleLabel) return;
    this.cycleBg.setInteractive({ useHandCursor: true });
    this.styleButton('normal');
    this.cycleLabel
      .setText(this.cycleReadyLabel || 'Skip Day >')
      .setAlpha(1);
  }

  lockCycleButton() {
    if (!this.cycleBg || !this.cycleLabel) return;
    this.cycleBg.disableInteractive();
    this.styleButton('locked');
    this.cycleLabel.setText('Resolving...').setAlpha(0.8);
  }

  updateTimeControls(speed) {
    if (!this.timeButtons) return;
    for (const [value, button] of Object.entries(this.timeButtons)) {
      const active = Number(value) === Number(speed);
      button.bg.setFillStyle(active ? 0x8a5a2b : 0x273244, 0.98);
      button.text.setColor(active ? '#ffe08a' : '#fff6dc');
    }
  }

  updateBuildMode(state = {}) {
    if (!this.buildModeText || !this.cancelBuildButton) return;
    // active tool is always explicit: ROAD / BUILD / DELETE prefix
    const kindPrefix = { road: 'ROAD: ', fortification: 'WALL: ', building: 'BUILD: ', delete: 'DELETE: ' }[state.kind] || '';
    const label = `${kindPrefix}${String(state.label || '')}`;
    const maxChars = this.rsp?.compact ? 20 : 24;
    const compactLabel = label.length > maxChars ? `${label.slice(0, maxChars - 1)}...` : label;
    const cost = Number.isFinite(state.cost) ? `${state.cost}g` : '';
    const footprint = state.footprint || '';
    this.buildModeText
      .setText(state.active ? `${compactLabel}\n${cost} - ${footprint}` : '')
      .setColor(state.valid === false ? '#f0938f' : '#7fdc93');
    this.cancelBuildButton.bg.setVisible(Boolean(state.active));
    this.cancelBuildButton.text.setVisible(Boolean(state.active));
    const showConfirm = Boolean(state.active) && ['road', 'fortification'].includes(state.kind) && (state.planCount || 0) > 0;
    if (this.confirmBuildButton) {
      this.confirmBuildButton.bg.setVisible(showConfirm);
      this.confirmBuildButton.text
        .setVisible(showConfirm)
        .setText(showConfirm ? `Confirm ${state.planCount}` : 'Confirm');
      if (showConfirm) this.confirmBuildButton.bg.setInteractive({ useHandCursor: true });
      else this.confirmBuildButton.bg.disableInteractive();
    }
    if (state.active) this.cancelBuildButton.bg.setInteractive({ useHandCursor: true });
    else this.cancelBuildButton.bg.disableInteractive();
  }

  showAchievementToast(text) {
    const toast = this.add.text(WIDTH / 2, 116, String(text).replace(/^Achievement:\s*/, ''), {
      fontFamily: FONT,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffe08a',
      stroke: '#0c1118',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: 520 },
      backgroundColor: '#0f1521dd',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 0).setDepth(7000).setAlpha(0);
    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: 106,
      duration: 220,
      yoyo: true,
      hold: 2100,
      onComplete: () => toast.destroy(),
    });
  }

  // compact end-of-day banner: only weekly boundaries offer a report link
  showDaySummary({ day, summary, reportReady = false } = {}) {
    this.daySummaryGroup?.destroy(true);
    const icon = this.textures.exists('ui_dayreport_icon') ? 'ui_dayreport_icon' : null;
    const container = this.add.container(WIDTH / 2, 132).setDepth(6800);
    const label = this.add.text(icon ? 14 : 0, reportReady ? -8 : 0, `Day ${day} complete   ${summary}`, {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#fff6dc',
      stroke: '#0c1118', strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    const open = this.add.text(icon ? 14 : 0, 12, '[ Open Week Report ]', {
      fontFamily: FONT, fontSize: '12px', fontStyle: 'bold', color: '#ffe08a',
      stroke: '#0c1118', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true }).setVisible(reportReady);
    const width = Math.max(label.width, reportReady ? open.width : 0) + (icon ? 58 : 24);
    const bg = this.add.rectangle(icon ? 7 : 0, reportReady ? 2 : 0, width, reportReady ? 52 : 34, 0x141a24, 0.92)
      .setStrokeStyle(1, 0xbf8a38, 0.9);
    container.add([bg, label, open]);
    if (icon) {
      container.add(this.add.image(-width / 2 + 26, 2, icon).setScale(0.7));
    }
    if (reportReady) {
      open.on('pointerup', () => {
        this.game.events.emit('gwg-open-report');
        this.daySummaryGroup?.destroy(true);
        this.daySummaryGroup = null;
      });
    }
    container.setAlpha(0);
    this.tweens.add({ targets: container, alpha: 1, duration: 220 });
    this.daySummaryGroup = container;
    this.time.delayedCall(8000, () => {
      if (this.daySummaryGroup !== container) return;
      this.tweens.add({
        targets: container,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          if (this.daySummaryGroup === container) this.daySummaryGroup = null;
          container.destroy(true);
        },
      });
    });
  }

  // compact clickable policy/report badges inside the top bar, left of the Day counter.
  updateNoticeBadge(value) {
    const notice = String(value || '');
    const M = this.rsp?.compact;
    const makeBadge = (key, eventName, color = '#f6c945') => {
      if (this[key]) return this[key];
      const badge = this.add.text(0, 0, '', {
        fontFamily: FONT,
        fontSize: M ? this.rsp.font(10) : '11px',
        fontStyle: 'bold',
        color: '#141a24',
        backgroundColor: color,
        padding: { x: 7, y: 4 },
      }).setOrigin(1, 0.5).setDepth(6900)
        .setInteractive({ useHandCursor: true })
        .setVisible(false);
      badge.on('pointerup', () => this.game.events.emit(eventName));
      this[key] = badge;
      return badge;
    };
    const policyBadge = makeBadge('policyNoticeBadge', 'gwg-open-policies', '#f0938f');
    const reportBadge = makeBadge('reportNoticeBadge', 'gwg-open-report', '#f6c945');
    const threatBadge = makeBadge('threatNoticeBadge', 'gwg-open-defense-alerts', '#e76f51');
    const hasPolicy = notice.includes('Policy');
    const hasReport = notice.includes('Week Report');
    const hasThreat = notice.includes('Threat Alert');
    let x = this.dayText.x - this.dayText.width - (M ? this.rsp.size(12) : 14);
    reportBadge.setVisible(hasReport);
    if (hasReport) {
      reportBadge.setText('! Week Report');
      reportBadge.setPosition(x, this.dayText.y);
      x -= reportBadge.width + (M ? this.rsp.size(6) : 8);
    }
    threatBadge.setVisible(hasThreat);
    if (hasThreat) {
      const count = notice.match(/Threat Alert (\d+)/)?.[1] || '';
      threatBadge.setText(`! Threat${count ? ` ${count}` : ''}`);
      threatBadge.setPosition(x, this.dayText.y);
      x -= threatBadge.width + (M ? this.rsp.size(6) : 8);
    }
    policyBadge.setVisible(hasPolicy);
    if (hasPolicy) {
      policyBadge.setText('! Policy');
      policyBadge.setPosition(x, this.dayText.y);
    }
    this.policyPending = notice.includes('Policy');
    if (this.cycleLabel && this.cycleLabel.text !== 'Resolving...') {
      this.cycleLabel.setText(this.cycleReadyLabel || 'Skip Day >');
    }
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
