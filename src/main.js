import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TownScene from './scenes/TownScene.js';
import UIScene from './scenes/UIScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#6fae4e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, TownScene, UIScene],
});

// dev convenience: poke at the game from the browser console
window.game = game;
