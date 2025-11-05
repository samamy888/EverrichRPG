import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 嘗試載入中文字型（位圖字）
    // 將字型檔放在 public/fonts/han.fnt 與 public/fonts/han.png
    // 若不存在，載入會失敗，但不影響後續流程（採用系統字/高解析 Text 作為後備）
    // 僅在 URL 顯式要求時載入位圖字型，避免沒有檔案時噴錯
    const url = new URL(window.location.href);
    const wantBitmap = url.searchParams.get('useBitmapFont') === '1' || url.hash.includes('useBitmapFont');
    if (wantBitmap) {
      // 注意順序：先貼圖 PNG，再 XML/FNT
      this.load.bitmapFont('han', 'fonts/han.png', 'fonts/han.fnt');
    }

    // 載入玩家 16x16 精靈圖（你放在 public/sprites/character/）
    try {
      // 玩家 spritesheet：每幀為 32x32（圖內角色為 16x16）
      this.load.spritesheet('player_idle', 'sprites/character/player.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('player_walk', 'sprites/character/player_walk.png', { frameWidth: 32, frameHeight: 32 });
      // 旅客（男/女）與店員（每幀 32x32）
      this.load.spritesheet('trav_m_idle', 'sprites/character/travelers_m.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('trav_m_walk', 'sprites/character/travelers_m_walk.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('trav_f_idle', 'sprites/character/travelers_f.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('trav_f_walk', 'sprites/character/travelers_f_walk.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('clerk_idle', 'sprites/character/clerk.png', { frameWidth: 32, frameHeight: 32 });
      this.load.spritesheet('clerk_walk', 'sprites/character/clerk_walk.png', { frameWidth: 32, frameHeight: 32 });
    } catch {}
  }

  create() {
    // 等待 WebFont（HanPixel）就緒，避免初次顯示/切換時字體跳動
    const waitWebFont = async () => {
      try {
        const fonts: any = (document as any).fonts;
        const ready = fonts?.ready;
        // 最多等 1200ms，超時就先啟動場景
        if (fonts?.load) { await fonts.load("12px \"HanPixel\""); } if (fonts?.ready) { await fonts.ready; }
      } catch {}
    };

    (async () => {
      await waitWebFont();
      // 建立方向動畫（若素材存在）
      try {
        const FW = 32;
        const buildRow = (texKey: string, row: number) => {
          const tex: any = this.textures.get(texKey);
          const img: HTMLImageElement | undefined = tex?.getSourceImage?.();
          const w = Number(img?.naturalWidth || img?.width || 0);
          const cols = w ? Math.floor(w / FW) : 0;
          if (!cols) return { start: 0, end: 0 };
          const start = row * cols;
          const end = start + cols - 1;
          return { start, end };
        };
        if (this.textures.exists('player_idle')) {
          const d = buildRow('player_idle', 0);
          const u = buildRow('player_idle', 1);
          const s = buildRow('player_idle', 2);
          this.anims.create({ key: 'player-idle-down', frames: [{ key: 'player_idle', frame: d.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'player-idle-up', frames: [{ key: 'player_idle', frame: u.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'player-idle-side', frames: [{ key: 'player_idle', frame: s.start }], frameRate: 1, repeat: -1 });
        }
        if (this.textures.exists('player_walk')) {
          const d = buildRow('player_walk', 0);
          const u = buildRow('player_walk', 1);
          const s = buildRow('player_walk', 2);
          this.anims.create({ key: 'player-walk-down', frames: this.anims.generateFrameNumbers('player_walk', { start: d.start, end: d.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'player-walk-up', frames: this.anims.generateFrameNumbers('player_walk', { start: u.start, end: u.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'player-walk-side', frames: this.anims.generateFrameNumbers('player_walk', { start: s.start, end: s.end }), frameRate: 8, repeat: -1 });
        }

        // 旅客（男）
        if (this.textures.exists('trav_m_idle')) {
          const d = buildRow('trav_m_idle', 0), u = buildRow('trav_m_idle', 1), s = buildRow('trav_m_idle', 2);
          this.anims.create({ key: 'npc-m-idle-down', frames: [{ key: 'trav_m_idle', frame: d.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'npc-m-idle-up', frames: [{ key: 'trav_m_idle', frame: u.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'npc-m-idle-side', frames: [{ key: 'trav_m_idle', frame: s.start }], frameRate: 1, repeat: -1 });
        }
        if (this.textures.exists('trav_m_walk')) {
          const d = buildRow('trav_m_walk', 0), u = buildRow('trav_m_walk', 1), s = buildRow('trav_m_walk', 2);
          this.anims.create({ key: 'npc-m-walk-down', frames: this.anims.generateFrameNumbers('trav_m_walk', { start: d.start, end: d.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'npc-m-walk-up', frames: this.anims.generateFrameNumbers('trav_m_walk', { start: u.start, end: u.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'npc-m-walk-side', frames: this.anims.generateFrameNumbers('trav_m_walk', { start: s.start, end: s.end }), frameRate: 8, repeat: -1 });
        }
        // 旅客（女）
        if (this.textures.exists('trav_f_idle')) {
          const d = buildRow('trav_f_idle', 0), u = buildRow('trav_f_idle', 1), s = buildRow('trav_f_idle', 2);
          this.anims.create({ key: 'npc-f-idle-down', frames: [{ key: 'trav_f_idle', frame: d.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'npc-f-idle-up', frames: [{ key: 'trav_f_idle', frame: u.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'npc-f-idle-side', frames: [{ key: 'trav_f_idle', frame: s.start }], frameRate: 1, repeat: -1 });
        }
        if (this.textures.exists('trav_f_walk')) {
          const d = buildRow('trav_f_walk', 0), u = buildRow('trav_f_walk', 1), s = buildRow('trav_f_walk', 2);
          this.anims.create({ key: 'npc-f-walk-down', frames: this.anims.generateFrameNumbers('trav_f_walk', { start: d.start, end: d.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'npc-f-walk-up', frames: this.anims.generateFrameNumbers('trav_f_walk', { start: u.start, end: u.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'npc-f-walk-side', frames: this.anims.generateFrameNumbers('trav_f_walk', { start: s.start, end: s.end }), frameRate: 8, repeat: -1 });
        }
        // 店員
        if (this.textures.exists('clerk_idle')) {
          const d = buildRow('clerk_idle', 0), u = buildRow('clerk_idle', 1), s = buildRow('clerk_idle', 2);
          this.anims.create({ key: 'clerk-idle-down', frames: [{ key: 'clerk_idle', frame: d.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'clerk-idle-up', frames: [{ key: 'clerk_idle', frame: u.start }], frameRate: 1, repeat: -1 });
          this.anims.create({ key: 'clerk-idle-side', frames: [{ key: 'clerk_idle', frame: s.start }], frameRate: 1, repeat: -1 });
        }
        if (this.textures.exists('clerk_walk')) {
          const d = buildRow('clerk_walk', 0), u = buildRow('clerk_walk', 1), s = buildRow('clerk_walk', 2);
          this.anims.create({ key: 'clerk-walk-down', frames: this.anims.generateFrameNumbers('clerk_walk', { start: d.start, end: d.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'clerk-walk-up', frames: this.anims.generateFrameNumbers('clerk_walk', { start: u.start, end: u.end }), frameRate: 8, repeat: -1 });
          this.anims.create({ key: 'clerk-walk-side', frames: this.anims.generateFrameNumbers('clerk_walk', { start: s.start, end: s.end }), frameRate: 8, repeat: -1 });
        }
      } catch {}
      this.scene.start('ConcourseScene');
      this.scene.launch('UIOverlay');
      try { (window as any).__applyCameraZoom?.(); } catch {}
    })();
  }
}

