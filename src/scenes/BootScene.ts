import * as Phaser from 'phaser';
import { T2_FACILITIES } from '../data/facilities';
import {
  TPE2_FEATURE_PROPS,
  TPE2_FLOORPLAN_BG_KEY,
  TPE2_FLOORPLAN_BG_PATH,
  TPE2_FLOORPLAN_PROP_KEYS,
  TPE2_FLOORPLAN_PROP_MAP,
} from '../data/tpe2Layout';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const url = new URL(window.location.href);
    const wantBitmap = url.searchParams.get('useBitmapFont') === '1' || url.hash.includes('useBitmapFont');
    if (wantBitmap) {
      this.load.bitmapFont('han', 'fonts/han.png', 'fonts/han.fnt');
    }

    this.load.atlas('characters', 'sprites/characters_atlas.png', 'sprites/characters_atlas.json');
    this.load.spritesheet('clerk_new', 'sprites/clerk_new/sheet-transparent.png', { frameWidth: 96, frameHeight: 96 });

    // Preload key TPE2 assets to reduce first-enter gray flash.
    if (!this.cache.tilemap.exists('t2-lobby-map')) {
      this.load.tilemapTiledJSON('t2-lobby-map', 'map/TPE2/tpe2_lobby.json');
    }
    if (!this.cache.json.exists('t2-floorplan-slots')) {
      this.load.json('t2-floorplan-slots', 'map/TPE2/tpe2_floorplan_prop_slots.json');
    }
    if (!this.textures.exists('pro-tiles-v2')) {
      this.load.image('pro-tiles-v2', 'map/TPE2/pro_tiles_v2.png');
    }
    if (!this.textures.exists(TPE2_FLOORPLAN_BG_KEY)) {
      this.load.image(TPE2_FLOORPLAN_BG_KEY, TPE2_FLOORPLAN_BG_PATH);
    }

    const floorplanPropKey = (key: string) => TPE2_FLOORPLAN_PROP_MAP[key] ?? key;
    const uniqueProps = Array.from(new Set([
      ...T2_FACILITIES.map(f => floorplanPropKey(f.texture.replace('prop-', ''))),
      ...TPE2_FLOORPLAN_PROP_KEYS,
      ...TPE2_FEATURE_PROPS.map(p => floorplanPropKey(p.key)),
    ]));

    for (const key of uniqueProps) {
      const textureKey = `prop-${key}`;
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, `map/TPE2/props/${key}/prop.png`);
      }
    }
  }

  create() {
    const waitWebFont = async () => {
      try {
        const fonts: any = (document as any).fonts;
        if (fonts?.load) { await fonts.load("12px \"HanPixel\""); }
        if (fonts?.ready) { await fonts.ready; }
      } catch {}
    };

    (async () => {
      await waitWebFont();

      const buildAnimations = () => {
        const anims = this.anims;
        const keys = [
          { prefix: 'player-m', sheet: 'player_m' },
          { prefix: 'player-f', sheet: 'player_f' },
          { prefix: 'npc-m', sheet: 'travelers_m' },
          { prefix: 'npc-f', sheet: 'travelers_f' },
          { prefix: 'clerk', sheet: 'clerk' },
          { prefix: 'clerk-new', sheet: 'clerk_new' }
        ];

        keys.forEach(({ prefix, sheet }) => {
          const directions = ['down', 'up', 'side'];
          directions.forEach((dir, row) => {
            if (sheet === 'clerk_new') {
              anims.create({
                key: `${prefix}-idle-${dir}`,
                frames: [{ key: 'clerk_new', frame: row * 4 }],
                frameRate: 1,
                repeat: -1
              });
            } else {
              anims.create({
                key: `${prefix}-idle-${dir}`,
                frames: [{ key: 'characters', frame: `${sheet}_${row}_0` }],
                frameRate: 1,
                repeat: -1
              });
            }

            const walkFrames = [];
            if (sheet === 'clerk_new') {
              for (let c = 0; c < 4; c++) walkFrames.push({ key: 'clerk_new', frame: row * 4 + c });
            } else {
              const walkSheet = `${sheet}_walk`;
              for (let c = 0; c < 4; c++) {
                const frameName = `${walkSheet}_${row}_${c}`;
                if (this.textures.get('characters').has(frameName)) {
                  walkFrames.push({ key: 'characters', frame: frameName });
                }
              }
            }

            if (walkFrames.length > 0) {
              anims.create({
                key: `${prefix}-walk-${dir}`,
                frames: walkFrames,
                frameRate: 8,
                repeat: -1
              });
            }
          });
        });
      };

      try { buildAnimations(); } catch (e) { console.error('Failed to build animations', e); }

      this.scene.start('LoginScene');
      try { (window as any).__applyCameraZoom?.(); } catch {}
    })();
  }
}
