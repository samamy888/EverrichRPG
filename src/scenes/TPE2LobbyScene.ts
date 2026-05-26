import Phaser from 'phaser';
import { BaseScene, BaseSceneData } from './BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { attachOthers } from '../net/others';
import { T2_FACILITIES, Facility } from '../data/facilities';

export class TPE2LobbyScene extends BaseScene {
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private crowd?: Phaser.Physics.Arcade.Group;
  private propsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private interactables: { world: Phaser.Math.Vector2; label: string; action: () => void }[] = [];
  private worldW = 0;
  private worldH = 0;

  constructor() { super('TPE2LobbyScene'); }

  preload() {
    // 1. 載入自動生成的 Tilemap JSON 與高品質 Tileset V2
    this.load.tilemapTiledJSON('t2-lobby-map', 'map/TPE2/tpe2_lobby.json');
    this.load.image('pro-tiles-v2', 'map/TPE2/pro_tiles_v2.png');

    // 2. 載入對齊參考圖 (TPE-11)
    this.load.image('alignment-ref', 'map/TPE/TPE-11.png');

    // 3. 載入設施 (從數據庫動態讀取需要的素材)
    const uniqueProps = Array.from(new Set(T2_FACILITIES.map(f => f.texture.replace('prop-', ''))));
    ['airport-chairs', 'trash-bin', 'potted-palm'].forEach(p => { if(!uniqueProps.includes(p)) uniqueProps.push(p); });
    
    uniqueProps.forEach(p => {
      this.load.image(`prop-${p}`, `map/TPE2/props/${p}/prop.png`);
    });
  }

  create(data: BaseSceneData) {
    this.fadeIn();
    this.initInputs();
    this.cameras.main.setBackgroundColor('#2d3748'); 

    // --- 0. 建立對齊參考圖 (預設隱藏，按 V 開關) ---
    const ref = this.add.image(0, 0, 'alignment-ref').setOrigin(0, 0).setAlpha(0.5).setDepth(20000).setVisible(false);
    (this as any).refOverlay = ref;

    // --- 1. 建立 Tilemap ---
    const map = this.make.tilemap({ key: 't2-lobby-map' });
    const tileset = map.addTilesetImage('pro-tiles-v2', 'pro-tiles-v2');
    this.layer = map.createLayer('BaseArchitecture', tileset!)!;
    
    this.worldW = map.widthInPixels;
    this.worldH = map.heightInPixels;

    // 設定碰撞 (GID 3:建築, 4:窗戶/戶外, 5:店面, 6:柱子)
    this.layer.setCollision([3, 4, 5, 6]);
    
    // 初始化除錯繪圖
    this.physics.world.createDebugGraphic();
    this.physics.world.drawDebug = false;
    (this as any).tileDebugGraphics = this.add.graphics().setDepth(20000).setVisible(false);

    // 註冊 V 鍵切換對齊參考圖
    // (已移至 update 循環偵測，避免重複觸發)

    // --- 2. 自動化設施放置 (Data-Driven) ---
    this.propsGroup = this.physics.add.staticGroup();

    T2_FACILITIES.forEach(fac => {
        this.addFacility(fac);
    });

    // 隨機裝飾：在走廊放椅子
    for (let x = 500; x < this.worldW - 500; x += 1200) {
        this.addProp(x, this.worldH - 400, 'airport-chairs', true);
    }

    // 玩家重生點
    const px = data?.spawnX ?? this.worldW / 2;
    const py = data?.spawnY ?? (this.worldH - 300);
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

    // NPC
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

    this.setLocation('桃園 T2 大廳', 'concourse');
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    
    // 小地圖設定
    ;(this as any).__minimapW = this.worldW;
    ;(this as any).__minimapH = this.worldH;
    try { (window as any).__rerenderMinimap?.(); } catch {}
  }

  private addFacility(fac: Facility) {
    const p = this.addProp(fac.x, fac.y, fac.texture.replace('prop-', ''), true);
    if (fac.scale) p.setScale(fac.scale);
    
    this.interactables.push({ 
        world: new Phaser.Math.Vector2(fac.x, fac.y), 
        label: fac.name, 
        action: () => {
            if (fac.targetScene) {
                this.changeScene(fac.targetScene);
            } else if (fac.hint) {
                this.setHint(fac.hint);
            }
        } 
    });
  }

  private addProp(x: number, y: number, key: string, collide: boolean) {
    const p = this.add.image(x, y, `prop-${key}`).setOrigin(0.5, 1);
    p.setScale(0.18); 

    if (collide) {
      this.physics.add.existing(p, true);
      const body = p.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject(); 
      const sw = p.displayWidth;
      body.setSize(sw * 0.6, 12);
      body.setOffset((p.width - (sw * 0.6) / 0.18) / 2, p.height - 12 / 0.18);
      body.updateFromGameObject();
      this.propsGroup.add(p);
    }
    return p;
  }

  update() {
    if (!this.player) return;
    this.updatePlayerMovement();
    this.updateNetworkMovement('t2_lobby');

    // 1. 切換對齊參考圖 (按 V)
    if (Phaser.Input.Keyboard.JustDown(this.keys.V)) {
        const ref = (this as any).refOverlay;
        if (ref) {
            ref.setVisible(!ref.visible);
            this.setHint(`對齊模式: ${ref.visible ? '開啟' : '關閉'}`);
        }
    }

    // 2. 切換物理除錯 (按 C)
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
        this.physics.world.drawDebug = !this.physics.world.drawDebug;
        if (!this.physics.world.debugGraphic) this.physics.world.createDebugGraphic();
        this.physics.world.debugGraphic.setVisible(this.physics.world.drawDebug);
        
        // 同步切換 Tilemap 除錯顯示
        const tg = (this as any).tileDebugGraphics;
        if (tg) {
            tg.setVisible(this.physics.world.drawDebug);
            if (tg.visible) {
                tg.clear();
                this.layer.renderDebug(tg, {
                    tileColor: null, // 非碰撞瓦片不畫
                    collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128), // 碰撞瓦片用橘色
                    faceColor: new Phaser.Display.Color(40, 39, 37, 255) // 邊緣
                });
            }
        }
    }
    
    // Y-sorting
    this.children.each((child: any) => {
      if (child === this.layer || (this as any).refOverlay === child) return; 
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
