// Centralized responsive/mobile constants.
//
// The game canvas is a fixed 1280x720 world scaled with Phaser.Scale.FIT, so
// on a phone every in-canvas HUD element shrinks with the canvas. `hudScale`
// converts "desired physical pixels" into canvas units: multiply any HUD
// size/font by it and the element keeps roughly constant physical size on
// small screens. HTML panels are handled separately via CSS media queries.

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

export function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0 || 'ontouchstart' in window;
}

// CSS width the canvas actually gets under Scale.FIT letterboxing
function canvasCssWidth() {
  const w = window.innerWidth || GAME_WIDTH;
  const h = window.innerHeight || GAME_HEIGHT;
  return Math.min(w, h * (GAME_WIDTH / GAME_HEIGHT));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getResponsiveUi() {
  const viewportWidth = window.innerWidth || GAME_WIDTH;
  const viewportHeight = window.innerHeight || GAME_HEIGHT;
  // canvas units per physical CSS pixel (1 on desktop, ~1.9 on a phone)
  const unit = GAME_WIDTH / Math.max(1, canvasCssWidth());
  const hudScale = clamp(unit, 1, 2.6);
  const touchUnit = clamp(unit, 1, 3.35);
  const touch = isTouchDevice();
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || false;
  const portrait = viewportHeight > viewportWidth;
  const mobile = viewportWidth < 768 || (touch && Math.min(viewportWidth, viewportHeight) < 900);
  const smallScreen = viewportWidth < 900 || viewportHeight < 520;
  // compact = touch device where the desktop HUD would render too small
  const compact = (touch || coarse) && (hudScale >= 1.3 || smallScreen);
  const size = (px) => Math.round(px * hudScale);
  return {
    touch,
    coarse,
    mobile,
    smallScreen,
    portrait,
    compact,
    unit,
    hudScale,
    size,
    font: (px) => `${size(px)}px`,
    touchSize: (px) => Math.round(px * touchUnit),
    buttonHeight: compact ? clamp(Math.round(44 * touchUnit), 56, 112) : 32,
    bottomBarY: compact ? GAME_HEIGHT - 108 : GAME_HEIGHT - 64,
    panelMaxVh: compact ? (portrait ? 82 : 88) : 76,
    buildMenuColumns: compact ? 1 : 2,
    // finger jitter is measured in physical pixels; taps need a larger
    // slack in canvas units on small screens or every tap becomes a drag
    tapThreshold: Math.round(13 * clamp(unit, 1, 2.6)),
    // performance caps: fewer live text objects on phones
    maxIdleBubbles: compact ? 1 : 2,
    maxImportantBubbles: compact ? 2 : 3,
    maxFloatingTexts: compact ? 6 : 12,
    maxParticleBurst: compact ? 34 : 64,
  };
}
