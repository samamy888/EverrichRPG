import Phaser from 'phaser';
import { BaseScene, BaseSceneData } from './BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { attachOthers } from '../net/others';

export class TPE2LobbyScene extends BaseScene {
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private crowd?: Phaser.Physics.Arcade.Group;
  private propsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: { world: Phaser.Math.Vector2; label: string; action: () => void }[] = [];
  private worldW = 0;
  private worldH = 0;

  constructor() { super('TPE2LobbyScene'); }

  preload() {
    // 1. 建立高對比程序化瓦片
    if (!this.textures.exists('clean-airport-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const TILE = 16;
      // Index 0: Floor (Light Gray with Grid)
      g.fillStyle(0xf0f4f8, 1); g.fillRect(0, 0, TILE, TILE);
      g.lineStyle(1, 0xccd5db, 1); g.strokeRect(0, 0, TILE, TILE);
      // Index 1: Wall (Dark Steel Gray)
      g.fillStyle(0x2d3748, 1); g.fillRect(TILE, 0, TILE, TILE);
      g.fillStyle(0x1a202c, 1); g.fillRect(TILE, TILE-2, TILE, 2);
      g.generateTexture('clean-airport-tiles', TILE * 2, TILE); g.destroy();
    }

    // 2. 載入高品質物件 (Props)
    const props = [
      'curved-info-desk', 'security-partition', 'airport-chairs', 
      'flight-board', 'checkin-kiosk', 'potted-palm', 
      'trash-bin', 'airport-atm', 'signage-pillar'
    ];
    props.forEach(p => {
      this.load.image(`prop-${p}`, `map/TPE2/props/${p}/prop.png`);
    });
  }

  create(data: BaseSceneData) {
    this.fadeIn();
    this.initInputs();
    this.cameras.main.setBackgroundColor('#1a202c'); 

    // 建立 16x16 的 Tilemap (120x80 格，仿照 3F 的寬度)
    const map = this.make.tilemap({ width: 120, height: 80, tileWidth: 16, tileHeight: 16 });
    const tileset = map.addTilesetImage('clean-airport-tiles', 'clean-airport-tiles', 16, 16, 0, 0);
    this.layer = map.createBlankLayer('BaseArchitecture', tileset!)!;
    this.layer.setDepth(-1); 
    
    this.worldW = map.widthInPixels;
    this.worldH = map.heightInPixels;

    // --- 鋪設「工」字型地圖 ---
    const FLOOR = 1; const WALL = 2;
    // 先填滿牆壁
    this.layer.fill(WALL, 0, 0, map.width, map.height);

    const putFloor = (x: number, y: number, w: number, h: number) => {
        this.layer.fill(FLOOR, x, y, w, h);
    };

    // 1. 上方橫向走廊 (A 區)
    putFloor(0, 5, map.width, 12);
    // 2. 下方橫向走廊 (B 區)
    putFloor(0, map.height - 17, map.width, 12);
    // 3. 中央垂直大廳 (H 區)
    const hallW = 30;
    const midX = Math.floor(map.width / 2);
    putFloor(midX - Math.floor(hallW / 2), 17, hallW, map.height - 34);

    this.layer.setCollision(WALL);

    // --- 建立物件群組 ---
    this.propsGroup = this.physics.add.staticGroup();

    // 在中央大廳放置高品質物件
    const centerX = midX * 16;
    const centerY = (map.height / 2) * 16;

    this.addInteractable(centerX, centerY, 'curved-info-desk', '服務台', () => {
      this.setHint('歡迎來到桃園機場 T2！');
    }, true);
    
    this.addInteractable(centerX, 18 * 16, 'flight-board', '大螢幕看板', () => {
      this.setHint('顯示全航站班機資訊。');
    }, true);

    // 在橫向走廊佈置椅子
    for (let x = 200; x < this.worldW - 200; x += 300) {
        this.addProp(x, 15 * 16, 'airport-chairs', true);
        this.addProp(x, (map.height - 15) * 16, 'airport-chairs', true);
    }
    
    // 大廳角落裝飾
    this.addProp(centerX - 200, centerY - 100, 'airport-atm', true);
    this.addProp(centerX + 200, centerY - 100, 'checkin-kiosk', true);
    this.addProp(centerX - 200, centerY + 100, 'potted-palm', true);
    this.addProp(centerX + 200, centerY + 100, 'potted-palm', true);

    // 玩家重生點 (大廳中央下方)
    const px = data?.spawnX ?? centerX;
    const py = data?.spawnY ?? centerY + 100;
    this.setupPlayer(px, py); 
    this.physics.add.collider(this.player, this.layer);
    this.physics.add.collider(this.player, this.propsGroup);

    // 自己的名牌
    try {
      const nm = (localStorage.getItem('pname') || '').trim();
      if (nm) {
        (this as any).nameplate = this.add.text(this.player.x, this.player.y - 22, nm, { fontSize: `${CONFIG.ui.small}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' })
          .setOrigin(0.5, 1).setDepth(20000).setScrollFactor(1);
        try { (this as any).nameplate.setStroke('#ffffff', 2); } catch {}
      }
    } catch {}

    // NPC (分散在工字型區域)
    fetchTravelers().then((list) => {
      this.crowd = createCrowd(this, {
        count: 15,
        area: { xMin: 100, xMax: this.worldW - 100, yMin: 100, yMax: this.worldH - 100 },
        texture: 'sprite-npc',
        layer: this.layer,
        collideWith: [this.player as any],
        speed: { vx: [-30, 30], vy: [-20, 20] },
        bounce: { x: 1, y: 1 },
        travelers: list.slice(0, 15),
        texturesByGender: { default: 'sprite-npc' }
      });
    });

    attachOthers(this, { getArea: () => 't2_lobby', crossArea: false });

    this.setLocation('T2 大廳 (工字型)', 'concourse');
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    
    // 小地圖設定
    ;(this as any).__minimapW = this.worldW;
    ;(this as any).__minimapH = this.worldH;
    try { (window as any).__rerenderMinimap?.(); } catch {}
  }

  private addProp(x: number, y: number, key: string, collide: boolean) {
    // 1. 先建立圖片並縮放
    const p = this.add.image(x, y, `prop-${key}`).setOrigin(0.5, 1);
    p.setScale(0.18); 

    if (collide) {
      // 2. 加入物理引擎 (靜態)
      this.physics.add.existing(p, true);
      const body = p.body as Phaser.Physics.Arcade.StaticBody;

      // 3. 關鍵：refreshBody 會根據目前的 displayWidth/Height 重設物理箱
      // 我們先呼叫它，然後再手動縮小碰撞箱到「腳下」
      body.updateFromGameObject(); 
      
      // 獲取縮放後的尺寸
      const sw = p.displayWidth;
      const sh = p.displayHeight;

      // 設定極小的碰撞面積（只佔物件底部的 10 像素高，且寬度稍微收縮）
      // 注意：StaticBody 的 setSize 是以「像素」為單位，不受 scale 影響
      body.setSize(sw * 0.6, 12);
      body.setOffset((p.width - (sw * 0.6) / 0.18) / 2, p.height - 12 / 0.18);
      
      // 再次刷新確保位置正確
      body.updateFromGameObject();
      
      this.propsGroup.add(p);
    }
    return p;
  }

  private addInteractable(x: number, y: number, key: string, label: string, action: () => void, collide: boolean) {
    const p = this.addProp(x, y, key, collide);
    this.interactables.push({ world: new Phaser.Math.Vector2(x, y), label, action });
    return p;
  }

  update() {
    if (!this.player) return;
    this.updatePlayerMovement();
    this.updateNetworkMovement('t2_lobby');
    
    // Y-sorting
    this.children.each((child: any) => {
      // 確保只對有紋理且不是底層 Layer 的物件進行深度排序
      if (child === this.layer) return; 
      if (child.texture && (child.texture.key.startsWith('prop-') || child.texture.key === 'characters' || child.texture.key === 'sprite-npc')) {
        child.setDepth(child.y);
      }
    });
    this.player.setDepth(this.player.y);
    try { if ((this as any).nameplate) (this as any).nameplate.setPosition(this.player.x, this.player.y - 22); } catch {}

    if (this.crowd) {
      updateCrowd(this, this.crowd);
      updateNameplates(this, this.crowd, this.player);
    }

    // 互動
    let nearest = null; let minDist = 35;
    for (const item of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.world.x, item.world.y);
      if (d < minDist) { minDist = d; nearest = item; }
    }
    if (nearest) {
      this.setHint(`${nearest.label}｜按 E 互動｜ESC 選單`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) nearest.action();
    } else {
      this.setHint(`WASD/方向鍵移動｜ESC 選單`);
    }

    try {
      (window as any).__playerLast = { x: this.player.x, y: this.player.y, w: this.worldW, h: this.worldH, scale: 1 };
    } catch {}
  }
}
