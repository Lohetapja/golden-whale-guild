// ===========================================================================
// PLACEHOLDER / DEBUG ART — TEMPORARY, NOT FINAL
//
// Everything in this file draws stand-in pixel art at runtime with Phaser
// Graphics. It exists only so the game is playable before real assets land.
// Real sprites go in public/assets/** — see src/data/assetManifest.js for the
// expected keys and paths. When a real asset loads, the matching generator
// here is skipped automatically (src/assets.js decides).
//
// Placeholder texture keys are prefixed `ph-` so they are easy to spot.
// ===========================================================================
import Phaser from 'phaser';

function darken(color, amount = 20) {
  return Phaser.Display.Color.IntegerToColor(color).darken(amount).color;
}
function lighten(color, amount = 20) {
  return Phaser.Display.Color.IntegerToColor(color).lighten(amount).color;
}

// --- ambient world art (no asset slots yet; future tileset replaces these) --

export function makeAmbientTextures(scene) {
  makeGrass(scene);
  makeNature(scene);
  makeGlow(scene);
  makeProps(scene);
}

function makeGrass(scene) {
  const g = scene.add.graphics();
  const size = 64;
  g.fillStyle(0x6fae4e);
  g.fillRect(0, 0, size, size);
  // speckle with darker/lighter grass pixels for texture
  for (let i = 0; i < 60; i += 1) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    g.fillStyle(Math.random() < 0.5 ? 0x63a144 : 0x82c05e);
    g.fillRect(x, y, 2, 2);
  }
  g.generateTexture('grass', size, size);
  g.destroy();
}

function makeNature(scene) {
  // tree
  let g = scene.add.graphics();
  g.fillStyle(0x6b4a2b);
  g.fillRect(20, 44, 8, 18);
  g.fillStyle(0x2f6b33);
  g.fillCircle(24, 26, 18);
  g.fillCircle(12, 36, 12);
  g.fillCircle(36, 36, 12);
  g.fillStyle(0x3f8c42);
  g.fillCircle(20, 22, 10);
  g.generateTexture('tree', 48, 62);
  g.destroy();

  // rock
  g = scene.add.graphics();
  g.fillStyle(0x8a8f98);
  g.fillEllipse(16, 14, 30, 18);
  g.fillStyle(0x6f747d);
  g.fillEllipse(16, 18, 30, 10);
  g.fillStyle(0xa8adb5);
  g.fillRect(10, 7, 6, 3);
  g.generateTexture('rock', 32, 24);
  g.destroy();

  // flower patch
  g = scene.add.graphics();
  g.fillStyle(0xe86a92);
  g.fillRect(2, 2, 3, 3);
  g.fillStyle(0xf4e04d);
  g.fillRect(10, 6, 3, 3);
  g.fillStyle(0xffffff);
  g.fillRect(6, 10, 3, 3);
  g.generateTexture('flowers', 16, 16);
  g.destroy();

  // plaza fountain
  g = scene.add.graphics();
  g.fillStyle(0x9aa0aa);
  g.fillEllipse(30, 20, 60, 32);
  g.fillStyle(0x4d90d0);
  g.fillEllipse(30, 20, 44, 20);
  g.fillStyle(0x8fc6ee);
  g.fillEllipse(30, 18, 16, 8);
  g.generateTexture('fountain', 60, 40);
  g.destroy();

  // training dummy
  g = scene.add.graphics();
  g.fillStyle(0x8a6b3d);
  g.fillRect(10, 10, 4, 26);
  g.fillRect(2, 14, 20, 4);
  g.fillStyle(0xd8c49a);
  g.fillCircle(12, 7, 6);
  g.generateTexture('dummy', 24, 38);
  g.destroy();
}

function makeGlow(scene) {
  // soft gold radial glow, faked with concentric circles
  const g = scene.add.graphics();
  const steps = 8;
  for (let i = steps; i > 0; i -= 1) {
    g.fillStyle(0xffd75e, 0.06 * (steps - i + 1));
    g.fillCircle(70, 70, (70 / steps) * i);
  }
  g.generateTexture('glow', 140, 140);
  g.destroy();
}

function makeProps(scene) {
  // walking destination marker (bouncing chevron)
  let g = scene.add.graphics();
  g.fillStyle(0xf6c945);
  g.fillTriangle(1, 0, 13, 0, 7, 9);
  g.lineStyle(1, 0x8a5a2b);
  g.strokeTriangle(1, 0, 13, 0, 7, 9);
  g.generateTexture('chevron', 14, 10);
  g.destroy();

  // VIP rope for the whale station entrance: two gold posts, sagging red rope
  g = scene.add.graphics();
  for (const px of [6, 90]) {
    g.fillStyle(0xd99a1f);
    g.fillRect(px - 4, 10, 8, 22);
    g.fillStyle(0xf6c945);
    g.fillCircle(px, 8, 5);
  }
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const x = 10 + 76 * t;
    const y = 12 + 13 * 4 * t * (1 - t); // parabola sag between the posts
    g.fillStyle(i % 4 === 0 ? 0xe74c3c : 0xc0392b);
    g.fillCircle(x, y, 3);
  }
  g.generateTexture('viprope', 96, 34);
  g.destroy();

  // premium red carpet leading to the whale station door
  g = scene.add.graphics();
  g.fillStyle(0xa93226);
  g.fillRect(0, 0, 40, 50);
  g.fillStyle(0xc0392b);
  g.fillRect(6, 4, 28, 42);
  g.lineStyle(2, 0xd99a1f);
  g.strokeRect(1, 1, 38, 48);
  g.generateTexture('carpet', 40, 50);
  g.destroy();

  // small town props
  g = scene.add.graphics();
  g.fillStyle(0x7a4a24);
  g.fillEllipse(12, 7, 20, 8);
  g.fillRect(2, 7, 20, 18);
  g.fillEllipse(12, 25, 20, 8);
  g.lineStyle(2, 0x3f2612);
  g.strokeEllipse(12, 7, 20, 8);
  g.strokeEllipse(12, 25, 20, 8);
  g.lineStyle(2, 0xc08a3c);
  g.lineBetween(4, 12, 20, 12);
  g.lineBetween(4, 21, 20, 21);
  g.generateTexture('barrel', 24, 32);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x9b6a3a);
  g.fillRect(2, 4, 24, 22);
  g.lineStyle(2, 0x4e2e16);
  g.strokeRect(2, 4, 24, 22);
  g.lineBetween(4, 6, 24, 24);
  g.lineBetween(24, 6, 4, 24);
  g.generateTexture('crate', 28, 30);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x8a5a2b);
  for (const px of [4, 24, 44]) {
    g.fillRect(px, 5, 6, 20);
    g.fillTriangle(px - 2, 5, px + 8, 5, px + 3, 0);
  }
  g.fillRect(0, 11, 50, 5);
  g.fillRect(0, 19, 50, 5);
  g.generateTexture('fence_h', 52, 28);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x6b4a2b);
  g.fillRect(14, 12, 5, 28);
  g.fillStyle(0xb88746);
  g.fillRect(3, 7, 26, 14);
  g.lineStyle(2, 0x3f2612);
  g.strokeRect(3, 7, 26, 14);
  g.fillStyle(0xf6c945);
  g.fillTriangle(22, 12, 27, 9, 27, 15);
  g.generateTexture('signpost', 34, 42);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xffd75e, 0.22);
  g.fillCircle(10, 16, 15);
  g.fillStyle(0x2c2a2a);
  g.fillRect(8, 18, 4, 30);
  g.fillStyle(0xf6c945);
  g.fillRect(5, 8, 10, 12);
  g.fillStyle(0xfff1a8);
  g.fillRect(8, 10, 4, 6);
  g.generateTexture('lamp', 22, 52);
  g.destroy();

  // special locations
  g = scene.add.graphics();
  g.fillStyle(0x1d2430);
  g.fillRect(16, 0, 80, 18);
  g.fillStyle(0xf6c945);
  g.fillRect(20, 3, 72, 3);
  g.fillRect(20, 10, 72, 3);
  for (const px of [12, 100]) {
    g.fillStyle(0xd99a1f);
    g.fillRect(px - 4, 16, 8, 24);
    g.fillStyle(0xf6c945);
    g.fillCircle(px, 14, 5);
  }
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const x = 16 + 80 * t;
    const y = 20 + 14 * 4 * t * (1 - t);
    g.fillStyle(i % 4 === 0 ? 0xe74c3c : 0xc0392b);
    g.fillCircle(x, y, 3);
  }
  g.generateTexture('vip_rope_entrance', 112, 44);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x7a4a24);
  g.fillEllipse(19, 9, 30, 10);
  g.fillRect(4, 9, 30, 28);
  g.fillEllipse(19, 37, 30, 10);
  g.fillStyle(0xf2ead8);
  g.fillRect(10, 12, 17, 12);
  g.lineStyle(2, 0x3f2612);
  g.strokeEllipse(19, 9, 30, 10);
  g.strokeEllipse(19, 37, 30, 10);
  g.generateTexture('complaint_barrel', 38, 46);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x3f2f2f);
  g.fillRect(5, 18, 68, 42);
  g.fillStyle(0x613f2c);
  g.fillTriangle(0, 20, 78, 20, 39, 2);
  g.fillStyle(0xf2ead8);
  g.fillRect(17, 28, 44, 18);
  g.lineStyle(2, 0x1d1414);
  g.strokeRect(5, 18, 68, 42);
  g.strokeRect(17, 28, 44, 18);
  g.fillStyle(0xc0392b);
  g.fillRect(25, 33, 28, 3);
  g.generateTexture('debt_collector_booth', 78, 66);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x6b4a2b);
  g.fillRect(7, 8, 44, 34);
  g.lineStyle(2, 0x3f2612);
  g.strokeRect(7, 8, 44, 34);
  g.fillStyle(0xf2ead8);
  g.fillRect(12, 13, 12, 10);
  g.fillRect(29, 14, 14, 8);
  g.fillRect(16, 27, 22, 8);
  g.fillStyle(0x6b4a2b);
  g.fillRect(15, 42, 6, 16);
  g.fillRect(37, 42, 6, 16);
  g.generateTexture('notice_board', 58, 60);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x8a8f98);
  g.fillEllipse(46, 34, 84, 28);
  g.fillStyle(0x4d90d0);
  g.fillEllipse(46, 33, 64, 18);
  g.fillStyle(0xd99a1f);
  g.fillCircle(46, 20, 12);
  g.fillStyle(0xf6c945);
  g.fillCircle(46, 20, 9);
  g.fillStyle(0x8fc6ee);
  g.fillRect(44, 7, 4, 15);
  g.fillRect(37, 4, 3, 8);
  g.fillRect(53, 4, 3, 8);
  g.fillStyle(0x3a2a1a);
  g.fillRect(28, 43, 36, 5);
  g.generateTexture('ethics_fountain', 92, 56);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x4a2f1b);
  g.fillRect(6, 26, 92, 10);
  for (const px of [10, 34, 58, 82]) {
    g.fillStyle(0x8a5a2b);
    g.fillRect(px, 18, 7, 26);
    g.fillStyle(0xd99a1f);
    g.fillCircle(px + 3, 17, 4);
  }
  g.fillStyle(0xf2ead8);
  g.fillRect(19, 4, 66, 16);
  g.lineStyle(2, 0x1d2430);
  g.strokeRect(19, 4, 66, 16);
  g.fillStyle(0xc0392b);
  g.fillRect(25, 10, 54, 3);
  g.generateTexture('poor_hero_queue', 104, 50);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x6b4a2b);
  g.fillRect(8, 12, 54, 36);
  g.lineStyle(2, 0x3f2612);
  g.strokeRect(8, 12, 54, 36);
  g.fillStyle(0xf6c945);
  g.fillRect(14, 18, 42, 6);
  g.fillStyle(0xfff6dc);
  g.fillRect(14, 28, 18, 12);
  g.fillRect(36, 28, 14, 10);
  g.fillStyle(0x6b4a2b);
  g.fillRect(16, 48, 6, 16);
  g.fillRect(48, 48, 6, 16);
  g.generateTexture('sponsored_quest_board', 70, 66);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x6f747d);
  g.fillRect(15, 14, 26, 26);
  g.fillStyle(0x8a8f98);
  g.fillRect(11, 10, 34, 8);
  g.fillRect(9, 38, 38, 6);
  g.fillStyle(0xf2ead8);
  g.fillRect(19, 23, 18, 3);
  g.fillRect(22, 29, 12, 3);
  g.fillStyle(0xe86a92);
  g.fillRect(4, 35, 4, 4);
  g.fillStyle(0xffffff);
  g.fillRect(48, 35, 4, 4);
  g.generateTexture('balance_memorial', 56, 46);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x5a3825);
  g.fillRect(6, 22, 62, 24);
  g.fillStyle(0x7a4a24);
  g.fillRect(2, 16, 70, 10);
  g.fillStyle(0xf2ead8);
  g.fillRect(16, 4, 42, 16);
  g.lineStyle(2, 0x1d1414);
  g.strokeRect(16, 4, 42, 16);
  g.fillStyle(0xc0392b);
  g.fillRect(23, 10, 28, 3);
  g.fillStyle(0x2c2a2a);
  g.fillRect(46, 28, 12, 5);
  g.generateTexture('refund_denial_desk', 74, 54);
  g.destroy();
}

// --- icon placeholders -------------------------------------------------------

export function makeIconPlaceholders(scene) {
  // coin doubles as the HUD gold icon and the whale-station particle
  let g = scene.add.graphics();
  g.fillStyle(0xd99a1f);
  g.fillCircle(5, 5, 5);
  g.fillStyle(0xf6c945);
  g.fillCircle(5, 5, 4);
  g.fillStyle(0xffe08a);
  g.fillRect(3, 3, 2, 2);
  g.generateTexture('ph-icon_coin', 10, 10);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0x4d90d0);
  g.fillEllipse(15, 10, 24, 12);
  g.fillTriangle(26, 10, 36, 3, 36, 17);
  g.fillStyle(0xfff1c4);
  g.fillRect(9, 12, 9, 2);
  g.fillStyle(0x14101c);
  g.fillRect(8, 8, 2, 2);
  g.fillStyle(0x8fc6ee);
  g.fillRect(16, 1, 2, 7);
  g.fillRect(12, 0, 2, 4);
  g.fillRect(20, 0, 2, 4);
  g.generateTexture('ph-icon_whale', 38, 20);
  g.destroy();

  // remaining HUD icons have no asset slot yet — future icon set replaces them
  g = scene.add.graphics();
  g.fillStyle(0x58c470);
  g.fillRect(2, 1, 8, 6);
  g.fillTriangle(2, 7, 10, 7, 6, 11);
  g.generateTexture('icon-trust', 12, 12);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xb069d8);
  g.fillCircle(6, 5, 5);
  g.fillRect(3, 8, 6, 3);
  g.fillStyle(0x2a1436);
  g.fillRect(3, 4, 2, 2);
  g.fillRect(7, 4, 2, 2);
  g.generateTexture('icon-corruption', 12, 12);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xe86a6a);
  g.fillCircle(4, 4, 3);
  g.fillCircle(8, 4, 3);
  g.fillTriangle(1, 5, 11, 5, 6, 11);
  g.generateTexture('icon-morale', 12, 12);
  g.destroy();

  g = scene.add.graphics();
  g.fillStyle(0xc4cbd4);
  g.fillRect(5, 0, 3, 8);
  g.fillStyle(0x8a5a2b);
  g.fillRect(3, 8, 7, 2);
  g.fillRect(5, 10, 3, 2);
  g.generateTexture('icon-threat', 12, 12);
  g.destroy();
}

// --- building placeholder ------------------------------------------------------
// Generates `ph-<def.id>` from the def's colors and style. Referenced as the
// `fallback` function on each entry in src/data/buildings.js.

export function makeBuildingPlaceholder(scene, def) {
  const { w, h } = def;
  const g = scene.add.graphics();
  const roofH = Math.floor(h * 0.38);

  if (def.style === 'gate') {
    drawGate(g, def);
  } else if (def.style === 'stall') {
    drawStall(g, def);
  } else {
    drawHouse(g, def, roofH);
    if (def.style === 'whale') drawWhaleSign(g, def, roofH);
  }

  g.generateTexture(`ph-${def.id}`, w, h);
  g.destroy();
}

function drawHouse(g, b, roofH) {
  const { w, h } = b;
  // walls
  g.fillStyle(b.wall);
  g.fillRect(6, roofH, w - 12, h - roofH);
  g.lineStyle(2, darken(b.wall, 30));
  g.strokeRect(6, roofH, w - 12, h - roofH);
  // roof
  g.fillStyle(b.roof);
  g.fillTriangle(0, roofH, w, roofH, w / 2, 0);
  g.fillStyle(lighten(b.roof, 12));
  g.fillTriangle(10, roofH, w / 2, 8, w / 2, roofH);
  // door
  g.fillStyle(0x4a2f1b);
  g.fillRect(w / 2 - 10, h - 28, 20, 28);
  g.fillStyle(0xf4d47a);
  g.fillRect(w / 2 + 4, h - 16, 3, 3);
  // windows
  g.fillStyle(0xffe9a0);
  g.fillRect(18, roofH + 14, 14, 14);
  g.fillRect(w - 32, roofH + 14, 14, 14);
  g.lineStyle(1, darken(b.wall, 40));
  g.strokeRect(18, roofH + 14, 14, 14);
  g.strokeRect(w - 32, roofH + 14, 14, 14);
}

function drawStall(g, b) {
  const { w, h } = b;
  const roofH = 34;
  // counter + legs
  g.fillStyle(b.wall);
  g.fillRect(8, h - 40, w - 16, 40);
  g.lineStyle(2, darken(b.wall, 30));
  g.strokeRect(8, h - 40, w - 16, 40);
  g.fillStyle(darken(b.wall, 25));
  g.fillRect(10, roofH, 6, h - roofH - 40);
  g.fillRect(w - 16, roofH, 6, h - roofH - 40);
  // striped awning
  const stripes = 6;
  const sw = (w - 4) / stripes;
  for (let i = 0; i < stripes; i += 1) {
    g.fillStyle(i % 2 === 0 ? b.roof : 0xf2ead8);
    g.fillRect(2 + i * sw, 10, sw, roofH - 10);
  }
  g.fillStyle(darken(b.roof, 20));
  g.fillRect(2, 8, w - 4, 4);
  // goods on the counter
  g.fillStyle(0xc0392b); g.fillCircle(w / 2 - 20, h - 44, 5);
  g.fillStyle(0x27ae60); g.fillCircle(w / 2, h - 44, 5);
  g.fillStyle(0xf1c40f); g.fillCircle(w / 2 + 20, h - 44, 5);
}

function drawGate(g, b) {
  const { w, h } = b;
  // stone wall
  g.fillStyle(b.wall);
  g.fillRect(4, 20, w - 8, h - 20);
  g.lineStyle(2, darken(b.wall, 30));
  g.strokeRect(4, 20, w - 8, h - 20);
  // battlements
  g.fillStyle(b.roof);
  for (let x = 4; x < w - 8; x += 24) g.fillRect(x, 8, 14, 16);
  // brick lines
  g.lineStyle(1, darken(b.wall, 20));
  for (let y = 40; y < h; y += 18) g.lineBetween(6, y, w - 6, y);
  // dark arch entrance
  g.fillStyle(0x14101c);
  g.fillRect(w / 2 - 22, h - 44, 44, 44);
  g.fillCircle(w / 2, h - 44, 22);
  // ominous purple glow inside
  g.fillStyle(0x7a4bd0, 0.7);
  g.fillRect(w / 2 - 10, h - 12, 20, 6);
  // torches
  g.fillStyle(0xf39c12);
  g.fillRect(w / 2 - 34, h - 52, 4, 6);
  g.fillRect(w / 2 + 30, h - 52, 4, 6);
}

function drawWhaleSign(g, b, roofH) {
  const { w, h } = b;
  // extra gold trim on the walls — this place is suspiciously premium
  g.fillStyle(0xffe08a);
  g.fillRect(6, roofH + 2, w - 12, 4);
  g.fillRect(6, h - 6, w - 12, 4);
  // hanging sign board
  const sx = w / 2 - 34;
  const sy = roofH + 12;
  g.fillStyle(0xfff1c4);
  g.fillRect(sx, sy, 68, 34);
  g.lineStyle(2, 0xb8860b);
  g.strokeRect(sx, sy, 68, 34);
  // the golden whale itself
  g.fillStyle(0x4d90d0);
  g.fillEllipse(sx + 30, sy + 18, 40, 18);
  g.fillTriangle(sx + 50, sy + 18, sx + 62, sy + 8, sx + 62, sy + 26);
  g.fillStyle(0x14101c);
  g.fillRect(sx + 16, sy + 14, 3, 3);
  // water spout
  g.fillStyle(0x8fc6ee);
  g.fillRect(sx + 26, sy + 4, 2, 6);
  g.fillRect(sx + 22, sy + 2, 2, 4);
  g.fillRect(sx + 30, sy + 2, 2, 4);
  // coin decorations along the base
  g.fillStyle(0xd99a1f);
  for (let x = 16; x < w - 16; x += 22) g.fillCircle(x, h - 12, 5);
  g.fillStyle(0xf6c945);
  for (let x = 16; x < w - 16; x += 22) g.fillCircle(x, h - 12, 3);
}

// --- hero placeholder ---------------------------------------------------------
// Generates `ph-<def.id>`: a 14x18 pixel person from the def's palette,
// rendered at 2x in the scene. Referenced as `fallback` in src/data/heroes.js.

export function makeHeroPlaceholder(scene, def) {
  const g = scene.add.graphics();
  // legs
  g.fillStyle(def.legs);
  g.fillRect(3, 13, 3, 5);
  g.fillRect(8, 13, 3, 5);
  // tunic
  g.fillStyle(def.tunic);
  g.fillRect(2, 7, 10, 6);
  // arms
  g.fillStyle(darken(def.tunic, 15));
  g.fillRect(1, 8, 2, 5);
  g.fillRect(11, 8, 2, 5);
  // head
  g.fillStyle(def.skin);
  g.fillRect(3, 2, 8, 6);
  // hair
  g.fillStyle(def.hair);
  g.fillRect(3, 0, 8, 3);
  g.fillRect(2, 1, 2, 4);
  g.fillRect(10, 1, 2, 4);
  // eyes
  g.fillStyle(0x1c2833);
  g.fillRect(5, 5, 1, 2);
  g.fillRect(9, 5, 1, 2);
  g.generateTexture(`ph-${def.id}`, 14, 18);
  g.destroy();
}
