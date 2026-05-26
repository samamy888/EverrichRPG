import { BaseScene, BaseSceneData } from './BaseScene';
import { CONFIG } from '../config';
import { getClient } from '../net/ws';

type EnterData = BaseSceneData & { id?: string };
type RectCollider = { type: 'rect'; x: number; y: number; width: number; height: number };
type CollidersFile = { version?: number; colliders: RectCollider[] };

export class TPEMapScene extends BaseScene {
  private mapId: string = '01';
  public layer!: Phaser.Tilemaps.TilemapLayer; // dummy minimap layer
  private collidersGroup?: Phaser.Physics.Arcade.StaticGroup;
  private collidersGfx?: Phaser.GameObjects.Graphics;

  constructor() { super('TPEMapScene'); }

  init(data: EnterData) {
    const id = (data?.id || '').toString().padStart(2, '0');
    this.mapId = (/^\d{2}$/.test(id) ? id : '01');
  }

  preload() {
    const texKey = `tpe-${this.mapId}`;
    if (!this.textures.exists(texKey)) {
      this.load.image(texKey, `/map/TPE/TPE-${this.mapId}.png`);
    }
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

  create(data: EnterData) {
    this.fadeIn();
    this.initInputs();

    // Background image and world bounds
    const texKey = `tpe-${this.mapId}`;
    const bg = this.add.image(0, 0, texKey).setOrigin(0, 0).setDepth(0);
    let mapScale = (CONFIG as any)?.maps?.tpeScale || 1;
    let natW = Number(bg.width) || 0, natH = Number(bg.height) || 0;
    try { const t: any = this.textures.get(texKey); const img: any = t?.getSourceImage?.(); if (img) { natW = Number(img.naturalWidth || img.width || natW); natH = Number(img.naturalHeight || img.height || natH); } } catch {}
    try { bg.setScale(mapScale); } catch {}
    const worldW = Math.max(1, Math.round(bg.displayWidth));
    const worldH = Math.max(1, Math.round(bg.displayHeight));
    ;(this as any).__minimapTex = texKey; (this as any).__minimapW = worldW; (this as any).__minimapH = worldH;
    ;(this as any).__minimapNatW = natW; (this as any).__minimapNatH = natH; (this as any).__mapScale = mapScale;
    try { (window as any).__rerenderMinimap?.(); } catch {}
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Dummy tilemap layer for minimap
    const mapW = Math.max(1, Math.ceil(worldW / 16));
    const mapH = Math.max(1, Math.ceil(worldH / 16));
    const map = this.make.tilemap({ width: mapW, height: mapH, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 0)!;
    const base = (tiles as any).firstgid ?? 1; const FLOOR_A = base + 0, FLOOR_B = base + 1;
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
    this.layer.setAlpha(0);

    // Player
    const defX = Math.round(worldW / 2); const defY = Math.round(worldH / 2);
    const px = typeof data?.spawnX === 'number' ? data!.spawnX : Math.min(worldW - 8, Math.max(8, defX));
    const py = typeof data?.spawnY === 'number' ? data!.spawnY : Math.min(worldH - 8, Math.max(8, defY));
    this.setupPlayer(px, py);

    // Optional colliders
    this.loadColliders(`/map/TPE/TPE-${this.mapId}.colliders.json`);

    this.setLocation(`TPE-${this.mapId}`, 'concourse');

    // Pointer helper
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      try { console.info(`[tpe-${this.mapId}] world`, Math.round(p.worldX), Math.round(p.worldY)); } catch {}
    });
  }

  private async loadColliders(path: string) {
    let data: CollidersFile | null = null;
    try { const res = await fetch(path, { cache: 'no-store' as any }); if (!res.ok) return; data = await res.json(); } catch { return; }
    if (!data || !Array.isArray((data as any).colliders)) return;
    const group = this.physics.add.staticGroup();
    for (const c of data.colliders) {
      if (!c || c.type !== 'rect') continue;
      const rect = this.add.rectangle(c.x + c.width / 2, c.y + c.height / 2, Math.max(1, c.width), Math.max(1, c.height), 0x000000, 0).setOrigin(0.5, 0.5);
      group.add(rect);
    }
    this.collidersGroup = group;
    try { this.physics.add.collider(this.player, group); } catch {}
    // Debug draw (hold C)
    this.collidersGfx = this.add.graphics().setDepth(999);
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.keys.C?.isDown) {
        this.collidersGfx!.clear(); this.collidersGfx!.lineStyle(1, 0xff3366, 1);
        const list: any[] = []; try { (group as any).children?.each?.((o: any) => list.push(o)); } catch {}
        for (const o of list) { const w = (o.width || 0), h = (o.height || 0); const x = (o.x || 0) - w / 2, y = (o.y || 0) - h / 2; this.collidersGfx!.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1)); }
      } else { this.collidersGfx!.clear(); }
    });
  }

  update() {
    if (!this.player) return;
    this.updatePlayerMovement();
    this.updateNetworkMovement(`tpe:${this.mapId}`);
    
    // Expose last known player pos for minimap
    try {
      const b = this.physics.world?.bounds as any;
      const ww = Number(b?.width) || Number(this.cameras?.main?.width) || 0;
      const hh = Number(b?.height) || Number(this.cameras?.main?.height) || 0;
      const sc = Number((this as any).__mapScale) || 1;
      (window as any).__playerLast = { x: this.player.x, y: this.player.y, w: ww, h: hh, scale: sc };
    } catch {}
  }
}

export default TPEMapScene;
