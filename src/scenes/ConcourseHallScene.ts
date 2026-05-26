import { BaseScene, BaseSceneData } from './BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { CONFIG } from '../config';
import { fetchTravelers } from '../api/travelers';
import { t } from '../i18n';

// 中央大廳場景
export class ConcourseHallScene extends BaseScene {
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: { world: Phaser.Math.Vector2; id: string; label: string }[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private hubX!: number;
  private spawnPos?: Phaser.Math.Vector2;

  constructor() { super('ConcourseHallScene'); }

  preload() {
    if (!this.textures.exists('df-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      const TILE = 16;
      const palette = { floorA: 0xeaf2f9, floorB: 0xdfeaf5, border: 0xbdcfe1, stripe: 0xb3d4f0, facade: 0xe4f1fa, glass: 0x8ad4ff, door: 0x8bc34a, light: 0xfff7cc } as const;
      g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
      g.fillStyle(0x000000, 0.15); for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
      g.fillStyle(palette.border, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorA, 1); g.fillRect(3 * TILE, 0, TILE, TILE); g.fillStyle(palette.stripe, 1); g.fillRect(3 * TILE, TILE - 3, TILE, 2);
      g.fillStyle(palette.facade, 1); g.fillRect(4 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.glass, 1); g.fillRect(5 * TILE, 2, TILE, TILE - 4); g.fillStyle(0xffffff, 0.25); g.fillRect(5 * TILE + 2, 2, 3, TILE - 4);
      g.fillStyle(palette.door, 1); g.fillRect(6 * TILE + 3, 2, TILE - 6, TILE - 4);
      g.fillStyle(palette.light, 1); g.fillRect(7 * TILE + 4, 2, 8, 4);
      g.generateTexture('df-tiles', TILE * 8, TILE); g.destroy();
    }
  }

  create(data: BaseSceneData) {
    this.fadeIn();
    this.initInputs();

    const map = this.make.tilemap({ width: 32, height: 56, tileWidth: 16, tileHeight: 16 });
    this.hubX = Math.floor(map.width / 2);
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2)!;

    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;

    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
    this.layer.fill(BORDER, 0, 0, map.width, 1);
    this.layer.fill(BORDER, 0, map.height - 1, map.width, 1);
    this.layer.fill(STRIPE, 0, map.height - 2, map.width, 1);
    for (let y = 2; y <= map.height - 4; y += 7) this.layer.putTileAt(LIGHT, this.hubX, y);

    // A/B 廳指示
    const sA = t('concourse.signA'); const labelA = (sA === 'concourse.signA') ? 'A 廳' : sA;
    const signTop = this.add.text(this.hubX * 16, 2 * 16, labelA, { fontSize: `${Math.max(10, CONFIG.ui.fontSize)}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 0).setDepth(6);
    try { (signTop as any).setStroke?.('#ffffff', 2); } catch {}
    const sB = t('concourse.signB'); const labelB = (sB === 'concourse.signB') ? 'B 廳' : sB;
    const signBot = this.add.text(this.hubX * 16, map.height * 16 - 3 * 16, labelB, { fontSize: `${Math.max(10, CONFIG.ui.fontSize)}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 1).setDepth(6);
    try { (signBot as any).setStroke?.('#ffffff', 2); } catch {}

    const px = data?.spawnX ?? GAME_WIDTH / 2;
    const py = data?.spawnY ?? GAME_HEIGHT / 2;
    this.setupPlayer(px, py);

    const worldW = map.width * 16;
    const worldH = map.height * 16 + 2;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);

    fetchTravelers().then((list) => {
      const count = 8;
      this.crowd = createCrowd(this, {
        count,
        area: { xMin: 16 * (this.hubX - 3), xMax: 16 * (this.hubX + 3), yMin: 2 * 16, yMax: (map.height - 2) * 16 },
        texture: 'sprite-npc',
        tint: 0x8fd3ff,
        layer: this.layer,
        collideWith: [this.player as any],
        speed: { vx: [-40, 40], vy: [-20, 20] },
        bounce: { x: 1, y: 1 },
        travelers: list.slice(0, count),
        texturesByGender: { default: 'sprite-npc' },
      });
    });
  }

  update() {
    if (!this.player) return;
    this.updatePlayerMovement();

    if (this.crowd) updateCrowd(this, this.crowd as any);
    try { updateNameplates(this, this.crowd, this.player); } catch {}

    this.setLocation('大廳', 'concourse');

    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null; let nd = 1e9;
    for (const d of this.doors) { const dx = d.world.x - this.player.x; const dy = d.world.y - this.player.y; const dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; nearest = d; } }

    if (nearest && nd < 18) { 
      this.setHint(`${nearest.label}｜${t('concourse.hintEnter')}｜ESC 選單`); 
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) { 
        this.scene.pause(); 
        this.scene.launch('StoreScene', { storeId: nearest.id, returnTo: this.scene.key }); 
      } 
    } else { 
      this.setHint(`${t('concourse.hintMoveEnter')}｜ESC 選單`); 
    }
    
    this.updateNetworkMovement('hall');
  }
}
