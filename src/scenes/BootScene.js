import Phaser from 'phaser';
import { ASSET_MANIFEST } from '../data/assetManifest.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FONT = '"Courier New", monospace';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const loadingText = this.add.text(WIDTH / 2, HEIGHT / 2, 'Checking optional town sprites...', {
      fontFamily: FONT,
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff6dc',
      stroke: '#0c1118',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.findAvailableAssets()
      .then((availableAssets) => {
        this.registry.set('availableAssets', availableAssets);
      })
      .catch(() => {
        this.registry.set('availableAssets', []);
      })
      .finally(() => {
        loadingText.destroy();
        this.scene.start('TownScene');
      });
  }

  async findAvailableAssets() {
    const probes = ASSET_MANIFEST.map(async (entry) => {
      const url = new URL(entry.path, document.baseURI).toString();
      try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        const contentType = response.headers.get('content-type') || '';
        return response.ok && contentType.startsWith('image/') ? entry : null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(probes);
    return results.filter(Boolean);
  }
}
