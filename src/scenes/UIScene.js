// Minimal HUD overlay: top resource strip, bottom event ticker, and city controls.
// Deliberately small — this is a game scene, not a dashboard.
import Phaser from 'phaser';
import BuildMenuPanel from '../ui/BuildMenuPanel.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FONT = '"Courier New", monospace';
const MAX_TICKER_QUEUE = 6;
const MAX_TICKER_CHARS = 150;

// HUD icons resolve through manifest slots when present; placeholders remain fallback.
const RESOURCE_META = [
  {
    key: 'gold', label: 'Gold', icon: 'ph-icon_coin', asset: 'icon_coin', color: '#f6c945',
    help: 'Used for upgrades, quest bounties, and bad ideas.',
    danger: (v) => (v < 120 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 120 ? 'Warning: low gold limits upgrades and quests.' : 'Safe: enough gold to make at least one suspicious decision.'),
  },
  {
    key: 'trust', label: 'Trust', icon: 'icon-trust', asset: 'icon_trust', color: '#7fdc93',
    help: 'Trust keeps honest heroes from leaving. Below 30, expect protests and dramatic exits.',
    danger: (v) => (v < 20 ? 'critical' : v < 30 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 20 ? 'Critical: trust collapse is close.' : v < 30 ? 'Warning: honest heroes are losing faith.' : 'Safe: citizens can still pretend the brochure is real.'),
  },
  {
    key: 'corruption', label: 'Corruption', icon: 'icon-corruption', asset: 'icon_corruption', color: '#c99aec',
    help: 'Corruption increases shady profits and premium nonsense. Above 70, consequences begin filing paperwork.',
    danger: (v) => (v > 86 ? 'critical' : v > 70 ? 'warning' : 'safe'),
    dangerText: (v) => (v > 86 ? 'Critical: scandal territory, now with sparkle effects.' : v > 70 ? 'Warning: shady events become more common.' : 'Safe-ish: the paperwork is only lightly cursed.'),
  },
  {
    key: 'morale', label: 'Morale', icon: 'icon-morale', asset: 'icon_morale', color: '#f0938f',
    help: 'Morale affects quest success and whether heroes keep trying instead of becoming tavern furniture.',
    danger: (v) => (v < 20 ? 'critical' : v < 30 ? 'warning' : 'safe'),
    dangerText: (v) => (v < 20 ? 'Critical: morale crash is close.' : v < 30 ? 'Warning: failures and ragequits are more likely.' : 'Safe: heroes are still making eye contact with danger.'),
  },
  {
    key: 'threat', label: 'Threat', icon: 'icon-threat', asset: 'icon_threat', color: '#d4dae2',
    help: 'Threat means the dungeon is getting confident. At 100, it visits.',
    danger: (v) => (v > 90 ? 'critical' : v > 80 ? 'warning' : 'safe'),
    dangerText: (v) => (v > 90 ? 'Critical: invasion is close.' : v > 80 ? 'Warning: town attack risk is high.' : 'Safe: the dungeon is only thinking loudly.'),
  },
];

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.buildTopBar();
    this.buildTownHint();
    this.buildObjectives();
    this.buildHelperText();
    this.buildTicker();
    this.buildEndDayButton();
    this.buildUtilityButtons();
    this.buildTownLedgerButton();
    this.buildTimeControls();
    this.buildHtmlPanels();

    this.registry.events.on('changedata-resources', (_p, value) => this.updateResources(value));
    this.registry.events.on('changedata-objectives', (_p, value) => this.updateObjectives(value));
    this.registry.events.on('changedata-townHint', (_p, value) => this.updateTownHint(value));
    this.registry.events.on('changedata-townStage', (_p, value) => this.updateTownStage(value));
    this.registry.events.on('changedata-townIdentity', () => this.updateTownStage(this.registry.get('townStage')));
    this.registry.events.on('changedata-day', (_p, value) => {
      this.dayText.setText(`Day ${value}`);
      this.flashDayBanner(value);
    });
    this.game.events.on('gwg-event', this.queueEvent, this);
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
    this.updateObjectives(this.registry.get('objectives'));
    this.updateTownHint(this.registry.get('townHint'));
    this.updateTownStage(this.registry.get('townStage'));
    this.dayText.setText(`Day ${this.registry.get('day')}`);
    this.updateTimeControls(this.registry.get('simulationSpeed') ?? 1);
  }

  // --- top resource bar ------------------------------------------------

  buildTopBar() {
    this.add.rectangle(WIDTH / 2, 22, WIDTH, 44, 0x141a24, 0.9);

    this.resourceTexts = {};
    let x = 16;
    for (const meta of RESOURCE_META) {
      const iconKey = meta.asset && this.textures.exists(meta.asset) ? meta.asset : meta.icon;
      const icon = this.add.image(x + 6, 22, iconKey)
        .setScale(this.getHudIconScale(iconKey))
        .setInteractive({ useHandCursor: true });
      const text = this.add.text(x + 18, 22, `${meta.label} 0`, {
        fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: meta.color,
        stroke: '#0c1118', strokeThickness: 2,
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
      icon.on('pointerup', () => this.showResourceHelp(meta));
      text.on('pointerup', () => this.showResourceHelp(meta));
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

    this.stageText = this.add.text(WIDTH - 16, 72, '', {
      fontFamily: FONT,
      fontSize: '12px',
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
      slot.text.setText(`${slot.meta.label} ${res[key]}`);
      const danger = (
        (key === 'trust' && res[key] < 30)
        || (key === 'corruption' && res[key] > 70)
        || (key === 'morale' && res[key] < 30)
        || (key === 'threat' && res[key] > 80)
      );
      const dangerState = slot.meta.danger?.(res[key]) || (danger ? 'warning' : 'safe');
      slot.text.setText(`${slot.meta.label} ${res[key]}${dangerState === 'critical' ? ' !!' : dangerState === 'warning' ? ' !' : ''}`);
      slot.text.setColor(dangerState === 'critical' ? '#ff4f4f' : dangerState === 'warning' ? '#ffe08a' : slot.meta.color);
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
    this.objectiveText = this.add.text(WIDTH - 16, 92, '', {
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

  buildTownHint() {
    this.townHintText = this.add.text(WIDTH - 16, 50, '', {
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
      ? 'Drag to pan - Build roads/services - Tap heroes - Skip Day'
      : 'Drag/WASD to pan - Build roads/services - Inspect heroes - Skip Day';
    this.helperText = this.add.text(WIDTH / 2, 54, text, {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#d4dae2',
      stroke: '#0c1118',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(6000);
    this.time.delayedCall(9000, () => {
      this.tweens.add({ targets: this.helperText, alpha: 0, duration: 800 });
    });
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

  buildEndDayButton() {
    const x = WIDTH - 104;
    const y = HEIGHT - 64;

    // ui_button asset replaces the drawn rectangle when present
    const useAsset = this.textures.exists('ui_button');
    if (useAsset) {
      this.cycleBg = this.add.image(x, y, 'ui_button')
        .setDisplaySize(168, 44)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setTint(0xffe6b0);
        else if (state === 'locked') this.cycleBg.setTint(0x888888);
        else this.cycleBg.clearTint();
      };
    } else {
      this.cycleBg = this.add.rectangle(x, y, 168, 44, 0x8a5a2b)
        .setStrokeStyle(2, 0xf2c744)
        .setInteractive({ useHandCursor: true });
      this.styleButton = (state) => {
        if (state === 'hover') this.cycleBg.setFillStyle(0xa66f38);
        else if (state === 'locked') this.cycleBg.setFillStyle(0x5c4423);
        else this.cycleBg.setFillStyle(0x8a5a2b);
      };
    }
    this.cycleLabel = this.add.text(x, y, 'Skip Day >', {
      fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff6dc',
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
    this.add.rectangle(410, HEIGHT - 64, 772, 38, 0x0f1521, 0.5)
      .setStrokeStyle(1, 0x273244, 0.8);
    this.makeUtilityButton(386, HEIGHT - 64, 'Save', 'gwg-save');
    this.makeUtilityButton(466, HEIGHT - 64, 'Reset', 'gwg-reset', 70);
    this.makeUtilityButton(548, HEIGHT - 64, 'Build', 'gwg-open-build', 74);
    this.makeUtilityButton(626, HEIGHT - 64, 'Roads', 'gwg-open-roads', 70);
  }

  buildTownLedgerButton() {
    this.makeUtilityButton(58, HEIGHT - 64, 'Help', 'gwg-open-help', 72);
    this.makeUtilityButton(154, HEIGHT - 64, 'Town Log', 'gwg-open-town-log', 100);
    this.makeUtilityButton(278, HEIGHT - 64, 'Town Ledger', 'gwg-open-ledger', 122);
  }

  buildTimeControls() {
    const controls = [
      { x: 704, label: '||', speed: 0, width: 42 },
      { x: 750, label: '1x', speed: 1, width: 42 },
      { x: 796, label: '2x', speed: 2, width: 42 },
      { x: 842, label: '4x', speed: 4, width: 42 },
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
    this.buildModeText = this.add.text(874, HEIGHT - 64, '', {
      fontFamily: FONT,
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#7fdc93',
      stroke: '#0c1118',
      strokeThickness: 2,
      lineSpacing: 2,
      wordWrap: { width: 126 },
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
  }

  makeUtilityButton(x, y, label, eventName, width = 64, eventValue = undefined) {
    const bg = this.add.rectangle(x, y, width, 32, 0x273244, 0.94)
      .setStrokeStyle(1, 0xf6c945)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: FONT,
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#fff6dc',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x3a4a63, 0.98));
    bg.on('pointerout', () => bg.setFillStyle(0x273244, 0.94));
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
        this.setWorldInputBlocked(false);
      }
    });
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

    const actions = payload.actions?.length
      ? `<div class="gwg-actions">${payload.actions.map((action) => this.renderAction(action)).join('')}</div>`
      : '';
    return `${tabs}${sections}${rows}${actions}`;
  }

  renderTownLedger(payload = {}) {
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
    const isBuildCatalog = payload.panelType === 'build-catalog';
    const isTownLedger = payload.panelType === 'town-ledger';
    if (this.currentHtmlPanelType === 'town-ledger') {
      this.townLedgerScrollTop = this.panelBodyEl.scrollTop;
    }
    this.setWorldInputBlocked(isBuildCatalog || ledger);
    this.panelEl.className = `gwg-panel${ledger ? ' gwg-ledger' : ''}${isBuildCatalog ? ' gwg-build-catalog' : ''}${isTownLedger ? ' gwg-town-ledger' : ''}`;
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
    this.setWorldInputBlocked(false);
    this.game.events.emit('gwg-selection-clear');
  }

  enableCycleButton() {
    this.cycleBg.setInteractive({ useHandCursor: true });
    this.styleButton('normal');
    this.cycleLabel.setText('Skip Day >').setAlpha(1);
  }

  lockCycleButton() {
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
    const label = String(state.label || '');
    const compactLabel = label.length > 17 ? `${label.slice(0, 16)}...` : label;
    const cost = Number.isFinite(state.cost) ? `${state.cost}g` : '';
    const footprint = state.footprint || '';
    this.buildModeText
      .setText(state.active ? `${compactLabel}\n${cost} - ${footprint}` : '')
      .setColor(state.valid === false ? '#f0938f' : '#7fdc93');
    this.cancelBuildButton.bg.setVisible(Boolean(state.active));
    this.cancelBuildButton.text.setVisible(Boolean(state.active));
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
