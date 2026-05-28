import * as Phaser from 'phaser';
import { BaseScene, BaseSceneData } from './BaseScene';
import { CONFIG } from '../config';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { attachOthers } from '../net/others';
import { T2_FACILITIES, Facility } from '../data/facilities';
import {
  TPE2_ARCHITECTURE_PROPS,
  TPE2_BLOCKERS,
  TPE2_DECOR_PROPS,
  TPE2_FEATURE_PROPS,
  TPE2_FLOORPLAN_BG_KEY,
  TPE2_FLOORPLAN_BG_PATH,
  TPE2_FLOORPLAN_PROP_KEYS,
  TPE2_FLOORPLAN_PROP_MAP,
  Tpe2PropPlacement,
} from '../data/tpe2Layout';
import { hideSceneLoadingOverlay, updateSceneLoadingOverlay } from '../ui/sceneLoadingOverlay';

export class TPE2LobbyScene extends BaseScene {
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private floorBase?: Phaser.GameObjects.Image;
  private crowd?: Phaser.Physics.Arcade.Group;
  private propsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private propDebugMode = false;
  private propDebugToggleKey?: Phaser.Input.Keyboard.Key;
  private propDebugRows: { target: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private blockerDebugRows: { target: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private interactables: { world: Phaser.Math.Vector2; label: string; radius: number; action: () => void }[] = [];
  private interactionLocked = false;
  private worldW = 0;
  private worldH = 0;
  private floorplanSlots: any = null;
  private escalatorFx: { strip: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private escalatorLanes = [
    // top escalator: left lane down, right lane up
    { x: 2986, y: 170, width: 34, height: 600, dy: 18 },
    { x: 3040, y: 170, width: 34, height: 600, dy: -18 },
    // bottom escalator: left lane up, right lane down
    { x: 2986, y: 2520, width: 34, height: 520, dy: -18 },
    { x: 3040, y: 2520, width: 34, height: 520, dy: 18 },
  ];

  constructor() { super('TPE2LobbyScene'); }

  public applyDebugMode(enabled: boolean) {
    this.propDebugMode = enabled;
    this.propDebugRows.forEach(r => r.label.setVisible(enabled));
    this.blockerDebugRows.forEach(r => r.label.setVisible(enabled));
    this.physics.world.drawDebug = enabled;
    if (!this.physics.world.debugGraphic) this.physics.world.createDebugGraphic();
    this.physics.world.debugGraphic.setVisible(enabled);
    const tg = (this as any).tileDebugGraphics;
    if (tg) {
      tg.setVisible(enabled);
      if (enabled) {
        tg.clear();
        this.layer.renderDebug(tg, {
          tileColor: null,
          collidingTileColor: new Phaser.Display.Color(243, 134, 48, 128),
          faceColor: new Phaser.Display.Color(40, 39, 37, 255)
        });
      }
    }
  }

  preload() {
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

    const uniqueProps = Array.from(new Set([
      ...T2_FACILITIES.map(f => this.floorplanPropKey(f.texture.replace('prop-', ''))),
      ...TPE2_FLOORPLAN_PROP_KEYS,
      ...TPE2_FEATURE_PROPS.map(p => this.floorplanPropKey(p.key)),
    ]));

    uniqueProps.forEach(p => {
      const key = `prop-${p}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `map/TPE2/props/${p}/prop.png`);
      }
    });
  }

  private ensureEscalatorFlowTexture() {
    const key = 'fx-escalator-flow';
    if (this.textures.exists(key)) return;
    const g = this.add.graphics();
    g.clear();
    g.fillStyle(0x111318, 0.0).fillRect(0, 0, 16, 32);
    g.fillStyle(0xffffff, 0.18).fillRect(0, 0, 16, 4);
    g.fillStyle(0xffffff, 0.08).fillRect(0, 8, 16, 3);
    g.fillStyle(0xffffff, 0.16).fillRect(0, 16, 16, 4);
    g.fillStyle(0xffffff, 0.08).fillRect(0, 24, 16, 3);
    g.generateTexture(key, 16, 32);
    g.destroy();
  }

  private addEscalatorFx() {
    this.ensureEscalatorFlowTexture();
    const lanes = [
      { x: 2986, y: 170, w: 34, h: 600, speed: 18 },
      { x: 3040, y: 170, w: 34, h: 600, speed: -18 },
      { x: 2986, y: 2520, w: 34, h: 520, speed: -18 },
      { x: 3040, y: 2520, w: 34, h: 520, speed: 18 },
    ];
    for (const l of lanes) {
      const strip = this.add.tileSprite(l.x, l.y, l.w, l.h, 'fx-escalator-flow')
        .setOrigin(0, 0)
        .setAlpha(0.42)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(l.y + l.h - 899);
      this.escalatorFx.push({ strip, speed: l.speed });
    }
  }

  create(data: BaseSceneData) {
    updateSceneLoadingOverlay('Building T2 scene...');
    this.fadeIn();
    this.initInputs();
    this.events.off(Phaser.Scenes.Events.RESUME);
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.interactionLocked = false;
      this.fadeIn();
      try { (window as any).__applyCameraZoom?.(); } catch {}
    });
    this.cameras.main.setBackgroundColor('#f1e8db');
    this.cameras.main.roundPixels = true;

    const map = this.make.tilemap({ key: 't2-lobby-map' });
    const tileset = map.addTilesetImage('pro-tiles-v2', 'pro-tiles-v2');
    this.layer = map.createLayer('BaseArchitecture', tileset!)!;

    this.worldW = map.widthInPixels;
    this.worldH = map.heightInPixels;
    this.floorplanSlots = this.cache.json.get('t2-floorplan-slots') ?? null;

    this.floorBase = this.add.image(0, 0, TPE2_FLOORPLAN_BG_KEY)
      .setOrigin(0, 0)
      .setDisplaySize(this.worldW, this.worldH)
      .setPosition(Math.round(0), Math.round(0))
      .setDepth(-100)
      .setTint(0xfff4e6);

    // Warm floor-light overlay to approach real duty-free terminal ambience.
    this.add.rectangle(0, 0, this.worldW, this.worldH, 0xfff0dc, 0.1)
      .setOrigin(0, 0)
      .setDepth(-95);

    this.layer.setAlpha(0).setDepth(-40);

    this.physics.world.createDebugGraphic();
    const debugOn = (window as any).__debugModeEnabled !== false;
    this.physics.world.drawDebug = debugOn;
    (this as any).tileDebugGraphics = this.add.graphics().setDepth(20000).setVisible(false);

    this.propsGroup = this.physics.add.staticGroup();
    this.propDebugToggleKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
    this.addTpe11Blockers();
    this.addArchitectureDressing();
    this.addFeatureDressing();
    T2_FACILITIES.forEach(fac => this.addFacility(fac));
    this.addLobbyDressing();
    this.addEscalatorFx();

    const px = data?.spawnX ?? this.worldW / 2;
    const py = data?.spawnY ?? (this.worldH - 520);
    this.setupPlayer(px, py);
    this.physics.add.collider(this.player, this.propsGroup);

    this.addPlayerNameplate();
    this.spawnCrowd();
    attachOthers(this, { getArea: () => 't2_lobby', crossArea: false });

    this.setLocation('桃園 T2 大廳', 'concourse');
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    (this as any).__minimapTex = TPE2_FLOORPLAN_BG_KEY;
    (this as any).__minimapW = this.worldW;
    (this as any).__minimapH = this.worldH;
    (this as any).__minimapNatW = this.worldW;
    (this as any).__minimapNatH = this.worldH;
    try { (window as any).__rerenderMinimap?.(); } catch {}
    try { (window as any).__t2FloorplanSlots = this.floorplanSlots; } catch {}
    this.applyDebugMode(debugOn);
    this.time.delayedCall(80, () => hideSceneLoadingOverlay());
  }

  private addFacility(fac: Facility) {
    let propHeight = 0;
    if (fac.renderProp !== false) {
      const prop = this.addProp({
        key: fac.texture.replace('prop-', ''),
        x: fac.x,
        y: fac.y,
        scale: fac.scale ?? this.defaultScaleFor(fac.texture.replace('prop-', '')),
        collide: fac.collide ?? true,
      });
      propHeight = prop.displayHeight;
    }
    this.addFacilityLabel(fac, propHeight);

    this.interactables.push({
      world: new Phaser.Math.Vector2(fac.x, fac.y),
      label: fac.name,
      radius: fac.radius ?? 50,
      action: () => {
        if (fac.targetScene === 'StoreScene' && fac.storeId) {
          this.openStore(fac.storeId);
        } else if (fac.hint) {
          this.setHint(fac.hint);
        }
      }
    });
  }

  private openStore(storeId: string) {
    if (this.interactionLocked) return;
    this.interactionLocked = true;
    this.registry.set('interactOpen', false);
    this.registry.set('dialogOpen', false);
    this.registry.set('listingOpen', false);
    this.setHint('正在進入商店...');

    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      try {
        if (this.scene.isActive('StoreScene') || this.scene.isSleeping('StoreScene') || this.scene.isPaused('StoreScene')) {
          this.scene.stop('StoreScene');
        }
      } catch {}

      this.scene.pause();
      this.scene.launch('StoreScene', { storeId, returnTo: 'TPE2LobbyScene' });
    });
  }

  private addFacilityLabel(fac: Facility, propHeight: number) {
    if (!fac.shortName) return;
    if (fac.type === 'gate') return;
    const isShop = fac.type === 'shop';
    const label = this.add.text(fac.x, fac.y - Math.max(22, propHeight * 0.72), fac.shortName, {
      fontSize: `${CONFIG.ui.small}px`,
      color: isShop ? '#f9d58a' : '#e8f0ff',
      resolution: 2,
      fontFamily: 'HanPixel, system-ui, sans-serif',
      backgroundColor: isShop ? 'rgba(10,16,25,0.8)' : 'rgba(20,30,44,0.72)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(fac.y + 4);
    try { label.setStroke(isShop ? '#1d2433' : '#ffffff', 2); } catch {}
  }

  private floorplanPropKey(key: string) {
    return TPE2_FLOORPLAN_PROP_MAP[key] ?? key;
  }

  private addProp({ key, x, y, scale = this.defaultScaleFor(key), collide = false, bodyMode = 'feet' }: Tpe2PropPlacement) {
    const visualKey = this.floorplanPropKey(key);
    const p = this.add.image(x, y, `prop-${visualKey}`).setOrigin(0.5, 1).setScale(scale);
    const lbl = this.add.text(x, y - Math.max(14, p.displayHeight * 0.58), visualKey, {
      fontSize: '10px',
      color: '#ffe39b',
      resolution: 2,
      fontFamily: 'HanPixel, system-ui, sans-serif',
      backgroundColor: 'rgba(10,16,25,0.82)',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(30000).setVisible(false);
    try { lbl.setStroke('#1d2433', 2); } catch {}
    this.propDebugRows.push({ target: p, label: lbl });

    if (collide) {
      this.physics.add.existing(p, true);
      const body = p.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      const bodyW = bodyMode === 'box'
        ? Math.max(18, p.displayWidth * 0.82)
        : Math.max(18, p.displayWidth * 0.62);
      const bodyH = bodyMode === 'box'
        ? Math.max(18, p.displayHeight * 0.55)
        : Math.max(10, Math.min(26, p.displayHeight * 0.12));
      body.setSize(bodyW, bodyH);
      const offsetY = bodyMode === 'box'
        ? p.height - bodyH / scale - Math.max(0, p.height * 0.06)
        : p.height - bodyH / scale;
      body.setOffset((p.width - bodyW / scale) / 2, offsetY);
      body.updateFromGameObject();
      this.propsGroup.add(p);
    }

    return p;
  }

  private addBlocker(x: number, y: number, width: number, height: number, labelText?: string) {
    const blocker = this.add.rectangle(x, y, width, height, 0x000000, 0).setVisible(false);
    this.physics.add.existing(blocker, true);
    this.propsGroup.add(blocker);
    const lbl = this.add.text(x, y - Math.max(12, height * 0.5), labelText || 'blocker', {
      fontSize: '9px',
      color: '#9fd3ff',
      resolution: 2,
      fontFamily: 'HanPixel, system-ui, sans-serif',
      backgroundColor: 'rgba(8,12,18,0.8)',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(30000).setVisible(false);
    this.blockerDebugRows.push({ target: blocker, label: lbl });
  }

  private addTpe11Blockers() {
    TPE2_BLOCKERS.forEach((r, idx) => this.addBlocker(
      r.x + r.width / 2,
      r.y + r.height / 2,
      r.width,
      r.height,
      `blk-${idx}`
    ));
  }

  private defaultScaleFor(key: string) {
    const scales: Record<string, number> = {
      'flight-board': 0.28,
      'curved-info-desk': 0.3,
      'security-partition': 0.22,
      'checkin-kiosk': 0.24,
      'signage-pillar': 0.22,
      'airport-elevator': 0.3,
      'info-counter': 0.24,
      'checkin-counter-module': 0.2,
      'dutyfree-shop-kiosk': 0.2,
      'glass-partition': 0.22,
      'wall-column': 0.22,
      'short-wall': 0.24,
      'security-scanner': 0.2,
      'self-checkin-kiosk': 0.18,
      'airport-chairs': 0.24,
      'airport-atm': 0.22,
      'potted-palm': 0.22,
      'trash-bin': 0.16,
    };
    return scales[key] ?? 0.2;
  }

  private addArchitectureDressing() {
    TPE2_ARCHITECTURE_PROPS.forEach(p => this.addProp(p));
  }

  private addLobbyDressing() {
    TPE2_DECOR_PROPS.forEach(p => this.addProp(p));
  }

  private addFeatureDressing() {
    TPE2_FEATURE_PROPS.forEach(p => this.addProp(p));
  }

  private addPlayerNameplate() {
    try {
      const nm = (localStorage.getItem('pname') || '').trim();
      if (nm) {
        (this as any).nameplate = this.add.text(this.player.x, this.player.y - 22, nm, {
          fontSize: `${CONFIG.ui.small}px`,
          color: '#243b53',
          resolution: 2,
          fontFamily: 'HanPixel, system-ui, sans-serif'
        }).setOrigin(0.5, 1).setDepth(20000).setScrollFactor(1);
        try { (this as any).nameplate.setStroke('#ffffff', 2); } catch {}
      }
    } catch {}
  }

  private spawnCrowd() {
    fetchTravelers().then((list) => {
      this.crowd = createCrowd(this, {
        count: 15,
        area: { xMin: 180, xMax: this.worldW - 180, yMin: 340, yMax: this.worldH - 360 },
        texture: 'sprite-npc',
        layer: this.layer,
        collideWith: [this.player as any],
        speed: { vx: [-30, 30], vy: [-20, 20] },
        bounce: { x: 1, y: 1 },
        travelers: list.slice(0, 15),
        texturesByGender: { default: 'sprite-npc' }
      });
    });
  }

  update() {
    if (!this.player) return;
    this.updatePlayerMovement();
    this.updateNetworkMovement('t2_lobby');

    if (this.propDebugToggleKey && Phaser.Input.Keyboard.JustDown(this.propDebugToggleKey)) {
      this.applyDebugMode(!this.propDebugMode);
      (window as any).__debugModeEnabled = this.propDebugMode;
      this.setHint(this.propDebugMode ? 'Prop Debug：顯示名稱（F2 關閉）' : 'Prop Debug：已關閉（F2 開啟）');
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.applyDebugMode(!this.physics.world.drawDebug);
      (window as any).__debugModeEnabled = this.physics.world.drawDebug;
    }

    this.children.each((child: any) => {
      if (child === this.layer || child.texture?.key === TPE2_FLOORPLAN_BG_KEY) return;
      if (child.texture && (child.texture.key.startsWith('prop-') || child.texture.key === 'characters' || child.texture.key === 'sprite-npc')) {
        if (child.texture.key === 'prop-escalator-module') {
          child.setDepth(child.y - 900);
        } else {
          child.setDepth(child.y);
        }
      }
    });
    this.player.setDepth(this.player.y);
    try { if ((this as any).nameplate) (this as any).nameplate.setPosition(this.player.x, this.player.y - 22); } catch {}
    if (this.propDebugRows.length) {
      for (const row of this.propDebugRows) {
        row.label.setVisible(this.propDebugMode);
        row.label.setPosition(row.target.x, row.target.y - Math.max(14, row.target.displayHeight * 0.58));
      }
    }
    if (this.blockerDebugRows.length) {
      for (const row of this.blockerDebugRows) {
        row.label.setVisible(this.propDebugMode);
        row.label.setPosition(row.target.x, row.target.y - Math.max(12, row.target.height * 0.5));
      }
    }

    if (this.crowd) {
      updateCrowd(this, this.crowd);
      updateNameplates(this, this.crowd, this.player);
    }

    if (this.escalatorFx.length) {
      const dt = Math.max(0.5, Math.min(2, this.game.loop.delta / 16.6667));
      for (const fx of this.escalatorFx) {
        fx.strip.tilePositionY += fx.speed * 0.18 * dt;
      }
    }

    // Escalator carry effect (both directions available by lane).
    const dt = Math.max(0.5, Math.min(2, this.game.loop.delta / 16.6667));
    for (const lane of this.escalatorLanes) {
      const inLane = this.player.x >= lane.x && this.player.x <= lane.x + lane.width
        && this.player.y >= lane.y && this.player.y <= lane.y + lane.height;
      if (!inLane) continue;
      this.player.y += lane.dy * 0.08 * dt;
      break;
    }

    let nearest: { world: Phaser.Math.Vector2; label: string; radius: number; action: () => void } | null = null;
    let minDist = Infinity;
    for (const item of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.world.x, item.world.y);
      if (d < item.radius && d < minDist) { minDist = d; nearest = item; }
    }

    if (nearest) {
      this.setHint(`${nearest.label}｜按 E 互動｜ESC 選單`);
      if (!this.interactionLocked && Phaser.Input.Keyboard.JustDown(this.keys.E)) nearest.action();
    } else {
      this.setHint('WASD/方向鍵移動｜ESC 選單｜C 碰撞偵錯');
    }

    try {
      (window as any).__playerLast = { x: this.player.x, y: this.player.y, w: this.worldW, h: this.worldH, scale: 1 };
    } catch {}
  }
}
