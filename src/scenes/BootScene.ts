import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 嘗試載入中文字型（位圖字）
    // 將字型檔放在 public/fonts/han.fnt 與 public/fonts/han.png
    const url = new URL(window.location.href);
    const wantBitmap = url.searchParams.get('useBitmapFont') === '1' || url.hash.includes('useBitmapFont');
    if (wantBitmap) {
      this.load.bitmapFont('han', 'fonts/han.png', 'fonts/han.fnt');
    }

    // 載入角色 Texture Atlas
    this.load.atlas('characters', 'sprites/characters_atlas.png', 'sprites/characters_atlas.json');
    
    // 載入新角色（獨立加載作為展示）
    this.load.spritesheet('clerk_new', 'sprites/clerk_new/sheet-transparent.png', { frameWidth: 96, frameHeight: 96 });
  }

  create() {
    // 等待 WebFont（HanPixel）就緒
    const waitWebFont = async () => {
      try {
        const fonts: any = (document as any).fonts;
        if (fonts?.load) { await fonts.load("12px \"HanPixel\""); } if (fonts?.ready) { await fonts.ready; }
      } catch {}
    };

    (async () => {
      await waitWebFont();
      
      // 建立動畫集
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
            // Idle
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

            // Walk
            const walkFrames = [];
            if (sheet === 'clerk_new') {
              for (let c = 0; c < 4; c++) walkFrames.push({ key: 'clerk_new', frame: row * 4 + c });
            } else {
              const walkSheet = `${sheet}_walk`;
              for(let c = 0; c < 4; c++) {
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
