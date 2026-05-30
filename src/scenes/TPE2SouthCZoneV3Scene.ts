import * as Phaser from 'phaser';
import { BaseScene, BaseSceneData } from './BaseScene';
import { CONFIG } from '../config';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { attachOthers } from '../net/others';
import { Facility } from '../data/facilities';
import { T2_FACILITIES_V3_SOUTH_C } from '../data/facilitiesT2V3';
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
} from '../data/tpe2LayoutV3SouthC';
import { hideSceneLoadingOverlay, updateSceneLoadingOverlay } from '../ui/sceneLoadingOverlay';
import { t } from '../i18n';

export class TPE2SouthCZoneV3Scene extends BaseScene {
  private static readonly ZONES = [
    { key: 'north-gates', label: t('lobby.zone.northGates'), type: 'concourse', x1: 0, x2: 6000, y1: 0, y2: 520 },
    { key: 'west-concourse', label: t('lobby.zone.westConcourse'), type: 'concourse', x1: 0, x2: 2360, y1: 520, y2: 2820 },
    { key: 'checkin-hall', label: t('lobby.zone.checkinHall'), type: 'concourse', x1: 2100, x2: 3400, y1: 520, y2: 2500 },
    { key: 'security', label: t('lobby.zone.securityCustoms'), type: 'concourse', x1: 2920, x2: 3520, y1: 860, y2: 2320 },
    { key: 'dutyfree', label: t('lobby.zone.dutyFreeBoulevard'), type: 'concourse', x1: 3360, x2: 4260, y1: 1180, y2: 2720 },
    { key: 'east-concourse', label: t('lobby.zone.eastConcourse'), type: 'concourse', x1: 4260, x2: 6000, y1: 520, y2: 2820 },
    { key: 'south-gates', label: t('lobby.zone.southGates'), type: 'concourse', x1: 0, x2: 6000, y1: 2820, y2: 3472 },
  ] as const;
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private floorBase?: Phaser.GameObjects.Image;
  private crowd?: Phaser.Physics.Arcade.Group;
  private propsGroup!: Phaser.Physics.Arcade.StaticGroup;
  private propDebugMode = false;
  private propDebugToggleKey?: Phaser.Input.Keyboard.Key;
  private propDebugRows: { target: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private blockerDebugRows: { target: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];
  private interactables: { world: Phaser.Math.Vector2; label: string; radius: number; actionLabel: string; action: () => void }[] = [];
  private interactionLocked = false;
  private activeZoneKey = '';
  private activeZoneLabel = t('lobby.zone.t2Lobby');
  private interactFocusGfx?: Phaser.GameObjects.Graphics;
  private mapshotMode = false;
  private mapshotScrollX = 0;
  private mapshotScrollY = 0;
  private tilecapMode = false;
  private tilecapScrollX = 0;
  private tilecapScrollY = 0;
  private worldW = 0;
  private worldH = 0;
  private floorplanSlots: any = null;
  private escalatorFx: { strip: Phaser.GameObjects.TileSprite; speed: number }[] = [];
  private escalatorCarryLanes: { x: number; y: number; width: number; height: number; dy: number }[] = [];
  private microPulseTargets: { node: Phaser.GameObjects.Image; baseAlpha: number; amp: number; speed: number; phase: number }[] = [];

  private areaTransitionLock = false;
  constructor() { super('TPE2SouthCZoneV3Scene'); }

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
      ...T2_FACILITIES_V3_SOUTH_C.map(f => this.floorplanPropKey(f.texture.replace('prop-', ''))),
      ...TPE2_FLOORPLAN_PROP_KEYS,
      ...TPE2_ARCHITECTURE_PROPS.map(p => this.floorplanPropKey(p.key)),
      ...TPE2_DECOR_PROPS.map(p => this.floorplanPropKey(p.key)),
      ...TPE2_FEATURE_PROPS.map(p => this.floorplanPropKey(p.key)),
    ]));

    uniqueProps.forEach(p => {
      const key = `prop-${p}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `map/TPE2/props/${p}/prop.png`);
      }
    });

    if (!this.textures.exists('prop-escalator-frame')) {
      this.load.image('prop-escalator-frame', 'map/TPE2/props/escalator-frame/prop.png');
    }
    if (!this.textures.exists('prop-escalator-steps-strip')) {
      this.load.image('prop-escalator-steps-strip', 'map/TPE2/props/escalator-steps-strip/prop.png');
    }
    if (!this.textures.exists('prop-wall-block')) {
      this.load.image('prop-wall-block', 'map/TPE2/props/wall-block/prop.png');
    }
    if (!this.textures.exists('prop-wall-cap-block')) {
      this.load.image('prop-wall-cap-block', 'map/TPE2/props/wall-cap-block/prop.png');
    }
  }

  private addEscalatorModule({ x, y, scale = 0.14 }: Tpe2PropPlacement) {
    const frame = this.add.image(x, y, 'prop-escalator-frame')
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(y - 900);

    const lbl = this.add.text(x, y - Math.max(14, frame.displayHeight * 0.58), 'escalator-frame', {
      fontSize: '10px',
      color: '#ffe39b',
      resolution: 2,
      fontFamily: 'HanPixel, system-ui, sans-serif',
      backgroundColor: 'rgba(10,16,25,0.82)',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(30000).setVisible(false);
    try { lbl.setStroke('#1d2433', 2); } catch {}
    this.propDebugRows.push({ target: frame, label: lbl });

    const laneW = Math.max(14, Math.round(frame.displayWidth * 0.095));
    const laneH = Math.max(80, Math.round(frame.displayHeight * 0.72));
    const laneY = Math.round(y - frame.displayHeight * 0.86);
    const leftX = Math.round(x - frame.displayWidth * 0.12);
    const rightX = Math.round(x + frame.displayWidth * 0.03);
    const isTopHalf = y < (this.worldH > 0 ? this.worldH * 0.5 : 1736);
    const laneConfigs = [
      { x: leftX, y: laneY, w: laneW, h: laneH, speed: isTopHalf ? 16 : -16, carry: isTopHalf ? 18 : -18 },
      { x: rightX, y: laneY, w: laneW, h: laneH, speed: isTopHalf ? -16 : 16, carry: isTopHalf ? -18 : 18 },
    ];

    for (const lane of laneConfigs) {
      const strip = this.add.tileSprite(lane.x, lane.y, lane.w, lane.h, 'prop-escalator-steps-strip')
        .setOrigin(0, 0)
        .setAlpha(0.9)
        .setDepth(y - 899);
      this.escalatorFx.push({ strip, speed: lane.speed });
      this.escalatorCarryLanes.push({
        x: lane.x,
        y: lane.y,
        width: lane.w,
        height: lane.h,
        dy: lane.carry,
      });
    }
  }

  private addModularWall({ key, x, y, scale = 0.24, collide = false }: Tpe2PropPlacement) {
    const blockScale = Math.max(0.03, scale * 0.19);
    const blockSample = this.add.image(-9999, -9999, 'prop-wall-block').setOrigin(0.5, 1).setScale(blockScale).setVisible(false);
    const cellW = Math.max(14, blockSample.displayWidth * 0.96);
    const cellH = Math.max(10, blockSample.displayHeight * 0.78);
    blockSample.destroy();

    const cols = key === 'wall-column' ? 1 : 3;
    const bodyRows = key === 'wall-column' ? 4 : 1;
    const capRows = 1;
    const depthBase = y;
    let anchor: Phaser.GameObjects.Image | null = null;

    for (let row = 0; row < bodyRows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = Math.round(x + (col - (cols - 1) * 0.5) * cellW);
        const py = Math.round(y - row * cellH);
        const part = this.add.image(px, py, 'prop-wall-block')
          .setOrigin(0.5, 1)
          .setScale(blockScale)
          .setDepth(depthBase + row * 0.1);
        if (!anchor) anchor = part;
      }
    }

    for (let row = 0; row < capRows; row++) {
      for (let col = 0; col < cols; col++) {
        const px = Math.round(x + (col - (cols - 1) * 0.5) * cellW);
        const py = Math.round(y - (bodyRows + row) * cellH + cellH * 0.12);
        const cap = this.add.image(px, py, 'prop-wall-cap-block')
          .setOrigin(0.5, 1)
          .setScale(blockScale)
          .setDepth(depthBase + 0.5 + row * 0.1);
        if (!anchor) anchor = cap;
      }
    }

    if (anchor) {
      const approxHeight = (bodyRows + capRows) * cellH;
      const lbl = this.add.text(x, y - Math.max(14, approxHeight * 0.85), key, {
        fontSize: '10px',
        color: '#ffe39b',
        resolution: 2,
        fontFamily: 'HanPixel, system-ui, sans-serif',
        backgroundColor: 'rgba(10,16,25,0.82)',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 1).setDepth(30000).setVisible(false);
      try { lbl.setStroke('#1d2433', 2); } catch {}
      this.propDebugRows.push({ target: anchor, label: lbl });
    }

    if (collide) {
      const totalW = cols * cellW * 0.9;
      const totalH = (bodyRows + capRows) * cellH * 0.76;
      const collider = this.add.rectangle(
        x,
        y - totalH * 0.5 + 2,
        Math.max(18, totalW),
        Math.max(16, totalH),
        0x000000,
        0
      ).setVisible(false);
      this.physics.add.existing(collider, true);
      this.propsGroup.add(collider);
    }
  }

  create(data: BaseSceneData) {
    try {
      const u = new URL(window.location.href);
      const p = u.searchParams;
      this.mapshotMode = p.get('mapshot') === '1';
      this.mapshotScrollX = Math.max(0, Number(p.get('msx') || 0) || 0);
      this.mapshotScrollY = Math.max(0, Number(p.get('msy') || 0) || 0);
      this.tilecapMode = p.get('tilecap') === '1';
      this.tilecapScrollX = Math.max(0, Number(p.get('tcx') || 0) || 0);
      this.tilecapScrollY = Math.max(0, Number(p.get('tcy') || 0) || 0);
      const hash = (u.hash || '').replace(/^#/, '');
      if (hash.toLowerCase().startsWith('mapshot')) {
        this.mapshotMode = true;
        const parts = hash.split(',');
        if (parts.length >= 3) {
          this.mapshotScrollX = Math.max(0, Number(parts[1]) || 0);
          this.mapshotScrollY = Math.max(0, Number(parts[2]) || 0);
        }
      }
      if (hash.toLowerCase().startsWith('tilecap')) {
        this.tilecapMode = true;
        const parts = hash.split(',');
        if (parts.length >= 3) {
          this.tilecapScrollX = Math.max(0, Number(parts[1]) || 0);
          this.tilecapScrollY = Math.max(0, Number(parts[2]) || 0);
        }
      }
    } catch {}
    updateSceneLoadingOverlay(t('lobby.loading.buildingScene'));
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
    T2_FACILITIES_V3_SOUTH_C.forEach(fac => this.addFacility(fac));
    this.addLobbyDressing();

    const px = data?.spawnX ?? this.worldW / 2;
    const py = data?.spawnY ?? (this.worldH - 520);
    this.setupPlayer(px, py);
    this.physics.add.collider(this.player, this.propsGroup);
    if (this.mapshotMode || this.tilecapMode) {
      const capX = this.tilecapMode ? this.tilecapScrollX : this.mapshotScrollX;
      const capY = this.tilecapMode ? this.tilecapScrollY : this.mapshotScrollY;
      this.player.setVisible(false);
      this.cameras.main.stopFollow();
      this.cameras.main.setZoom(1);
      this.cameras.main.setScroll(capX, capY);
    }

    this.addPlayerNameplate();
    if (this.mapshotMode || this.tilecapMode) {
      try { (this as any).nameplate?.setVisible(false); } catch {}
    } else {
      this.spawnCrowd();
      attachOthers(this, { getArea: () => 't2_v3_south_c', crossArea: false });
    }

    this.setLocation('T2 重製 C 區', 'concourse');
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

    (this as any).__minimapTex = TPE2_FLOORPLAN_BG_KEY;
    (this as any).__minimapW = this.worldW;
    (this as any).__minimapH = this.worldH;
    (this as any).__minimapNatW = this.worldW;
    (this as any).__minimapNatH = this.worldH;
    try { (window as any).__rerenderMinimap?.(); } catch {}
    try { (window as any).__t2FloorplanSlots = this.floorplanSlots; } catch {}
    try {
      (window as any).__tilecapInfo = {
        worldW: this.worldW,
        worldH: this.worldH,
        ready: true,
      };
      (window as any).__tilecapSetCamera = (x: number, y: number) => {
        const nx = Math.max(0, Math.min(this.worldW - this.cameras.main.width, Number(x) || 0));
        const ny = Math.max(0, Math.min(this.worldH - this.cameras.main.height, Number(y) || 0));
        this.cameras.main.stopFollow();
        this.cameras.main.setZoom(1);
        this.cameras.main.setScroll(nx, ny);
        if (this.player) {
          this.player.setVisible(false);
          if (typeof (this.player as any).setVelocity === 'function') {
            (this.player as any).setVelocity(0, 0);
          }
        }
        try { (this as any).nameplate?.setVisible(false); } catch {}
        return { ok: true, x: nx, y: ny, worldW: this.worldW, worldH: this.worldH };
      };
    } catch {}
    if (!this.mapshotMode && !this.tilecapMode) this.interactFocusGfx = this.add.graphics().setDepth(24000);
    this.updateActiveZone(true);
    this.applyDebugMode(debugOn);
    this.time.delayedCall(80, () => hideSceneLoadingOverlay());
  }

  private addFacility(fac: Facility) {
    const propKey = fac.texture.replace('prop-', '');
    const collide = fac.collide ?? this.defaultCollideFor(propKey, fac.type);
    const bodyMode = this.defaultBodyModeFor(propKey, fac.type);
    const interactPoint = this.facilityInteractPoint(fac, propKey);
    let propHeight = 0;
    // Gate pillars should remain visible even when legacy data marks renderProp false.
    const shouldRenderProp = fac.renderProp !== false || fac.type === 'gate';
    if (shouldRenderProp) {
      const prop = this.addProp({
        key: propKey,
        x: fac.x,
        y: fac.y,
        scale: (fac.scale ?? this.defaultScaleFor(propKey)) * 1.9,
        collide,
        bodyMode,
      });
      propHeight = prop.displayHeight;
    }
    this.addFacilityLabel(fac, propHeight);

    this.interactables.push({
      world: interactPoint,
      label: fac.name,
      radius: fac.radius ?? this.defaultInteractRadiusFor(propKey, fac.type),
      actionLabel: this.defaultActionLabelFor(fac),
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
    this.setHint(t('lobby.hint.enteringShop'));

    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      try {
        if (this.scene.isActive('StoreScene') || this.scene.isSleeping('StoreScene') || this.scene.isPaused('StoreScene')) {
          this.scene.stop('StoreScene');
        }
      } catch {}

      this.scene.pause();
      this.scene.launch('StoreScene', { storeId, returnTo: this.scene.key });
    });
  }

  private addFacilityLabel(fac: Facility, propHeight: number) {
    if (!fac.shortName) return;
    const style = this.facilityLabelStyle(fac.type);
    const label = this.add.text(fac.x, fac.y - Math.max(22, propHeight * 0.72), fac.shortName, {
      fontSize: `${CONFIG.ui.small}px`,
      color: style.color,
      resolution: 2,
      fontFamily: 'HanPixel, system-ui, sans-serif',
      backgroundColor: style.backgroundColor,
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 1).setDepth(fac.y + 4);
    try { label.setStroke(style.stroke, 2); } catch {}
  }

  private floorplanPropKey(key: string) {
    return TPE2_FLOORPLAN_PROP_MAP[key] ?? key;
  }

  private addProp({ key, x, y, scale = this.defaultScaleFor(key), collide = false, bodyMode = 'feet' }: Tpe2PropPlacement) {
    const visualKey = this.floorplanPropKey(key);
    const depth = visualKey === 'escalator-module' ? y - 900 : y;
    const p = this.add.image(x, y, `prop-${visualKey}`).setOrigin(0.5, 1).setScale(scale).setDepth(depth);
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
    this.registerMicroPulseTarget(visualKey, p);

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

  private registerMicroPulseTarget(key: string, node: Phaser.GameObjects.Image) {
    if (key === 'flight-board') {
      this.microPulseTargets.push({ node, baseAlpha: 0.94, amp: 0.06, speed: 1.65, phase: node.x * 0.01 });
      return;
    }
    if (key === 'shopfront-module') {
      this.microPulseTargets.push({ node, baseAlpha: 0.9, amp: 0.08, speed: 1.05, phase: node.y * 0.008 });
    }
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

  private defaultBodyModeFor(key: string, type: Facility['type']): 'feet' | 'box' {
    if (type === 'shop' || type === 'counter') return 'box';
    if ([
      'security-scanner',
      'airport-atm',
      'self-checkin-kiosk',
      'info-counter',
      'checkin-counter-module',
      'dutyfree-shop-kiosk',
      'wall-column',
      'short-wall',
      'glass-partition',
      'airport-elevator',
    ].includes(key)) return 'box';
    return 'feet';
  }

  private defaultCollideFor(key: string, type: Facility['type']): boolean {
    if (type === 'gate') return false;
    if (['flight-board', 'signage-pillar'].includes(key)) return false;
    return true;
  }

  private defaultInteractRadiusFor(key: string, type: Facility['type']) {
    if (type === 'shop') return 78;
    if (type === 'counter') return 66;
    if (type === 'gate') return 80;
    if (key === 'security-scanner') return 72;
    if (key === 'flight-board') return 76;
    if (key === 'airport-atm') return 58;
    return 62;
  }

  private facilityInteractPoint(fac: Facility, key: string) {
    let x = fac.x;
    let y = fac.y;

    // Check-in counters are interacted from the corridor side.
    if (key === 'checkin-counter-module') x += 92;

    // Security scanner / counter are easier to trigger from queue approach.
    if (key === 'security-scanner' || key === 'info-counter') y += 26;
    if (fac.id === 'security-lane') {
      // Pull anchor toward the west queue corridor for smoother approach.
      x -= 44;
      y += 34;
    }
    if (fac.id === 'customs-main') {
      // Customs desk is approached from the central spine.
      x -= 52;
      y += 18;
    }

    // Shops are primarily approached from the left in current T2 layout.
    if (key === 'dutyfree-shop-kiosk') x -= 96;

    if (key === 'flight-board') y += 34;
    if (fac.id === 'flight-info-center') {
      // Keep interaction point below board near escalator exit flow.
      y += 14;
    }
    if (fac.type === 'gate') {
      // Top gates are approached from below; bottom gates are approached from above.
      const midY = this.worldH > 0 ? this.worldH * 0.5 : 1736;
      y += fac.y <= midY ? 42 : -52;
    }

    return new Phaser.Math.Vector2(x, y);
  }

  private defaultActionLabelFor(fac: Facility) {
    if (fac.targetScene === 'StoreScene') return t('lobby.action.enterShop');
    if (fac.type === 'gate') return t('lobby.action.viewGate');
    if (fac.type === 'counter') return t('lobby.action.checkCounter');
    return t('lobby.action.inspect');
  }

  private facilityLabelStyle(type: Facility['type']) {
    if (type === 'shop') {
      return {
        color: '#f9d58a',
        backgroundColor: 'rgba(10,16,25,0.8)',
        stroke: '#1d2433',
      };
    }
    if (type === 'gate') {
      return {
        color: '#8fd3ff',
        backgroundColor: 'rgba(10,18,28,0.74)',
        stroke: '#1a2b3d',
      };
    }
    if (type === 'counter') {
      return {
        color: '#d8e6ff',
        backgroundColor: 'rgba(17,29,44,0.74)',
        stroke: '#1d2d43',
      };
    }
    return {
      color: '#e8f0ff',
      backgroundColor: 'rgba(20,30,44,0.72)',
      stroke: '#ffffff',
    };
  }

  private addArchitectureDressing() {
    TPE2_ARCHITECTURE_PROPS.forEach(p => {
      if (p.key === 'wall-column' || p.key === 'short-wall') {
        this.addModularWall(p);
        return;
      }
      this.addProp(p);
    });
  }

  private addLobbyDressing() {
    TPE2_DECOR_PROPS.forEach(p => this.addProp(p));
  }

  private addFeatureDressing() {
    TPE2_FEATURE_PROPS.forEach(p => {
      if (p.key === 'escalator-module' && !this.mapshotMode && !this.tilecapMode) {
        this.addEscalatorModule(p);
        return;
      }
      this.addProp(p);
    });
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

  private updateDynamicDepths() {
    this.player.setDepth(this.player.y);

    if (this.crowd) {
      const children = this.crowd.getChildren() as Phaser.GameObjects.GameObject[];
      for (const child of children) {
        const sprite = child as Phaser.GameObjects.Sprite;
        if (typeof (sprite as any).y === 'number') sprite.setDepth((sprite as any).y);
      }
    }

    const othersState = (this as any).__others;
    const othersMap: Map<string, Phaser.GameObjects.Sprite> | undefined = othersState?.map;
    if (othersMap && othersMap.size) {
      for (const sprite of othersMap.values()) {
        sprite.setDepth(sprite.y);
      }
    }
  }

  private resolveZone(x: number, y: number) {
    const hits = TPE2SouthCZoneV3Scene.ZONES.filter((z) => (
      x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2
    ));
    if (hits.length) {
      // Prefer the most specific zone when rectangles overlap.
      hits.sort((a, b) => ((a.x2 - a.x1) * (a.y2 - a.y1)) - ((b.x2 - b.x1) * (b.y2 - b.y1)));
      return hits[0];
    }
    return { key: 't2-lobby', label: t('lobby.zone.t2Lobby'), type: 'concourse' as const };
  }

  private updateActiveZone(force = false) {
    const zone = this.resolveZone(this.player.x, this.player.y);
    if (!force && zone.key === this.activeZoneKey) return;
    this.activeZoneKey = zone.key;
    this.activeZoneLabel = zone.label;
    this.setLocation(zone.label, zone.type);
  }

  private handleAreaTransitions() {
    if (this.areaTransitionLock || !this.player) return false;
    if (this.player.y <= 88) {
      this.areaTransitionLock = true;
      this.changeScene('TPE2CentralHallV3Scene', {
        spawnX: Phaser.Math.Clamp(this.player.x, 180, this.worldW - 180),
        spawnY: this.worldH - 220,
      });
      return true;
    }
    return false;
  }

  private drawInteractFocus(target: Phaser.Math.Vector2, radius: number) {
    if (!this.interactFocusGfx) return;
    const pulse = (Math.sin(this.time.now / 180) + 1) * 0.5;
    const r = Math.max(14, Math.min(30, radius * 0.46));
    const y = target.y - 6;
    this.interactFocusGfx.clear();
    this.interactFocusGfx.lineStyle(2, 0xf6c067, 0.62 + pulse * 0.28);
    this.interactFocusGfx.strokeCircle(target.x, y, r);
    this.interactFocusGfx.lineStyle(1, 0xffffff, 0.28 + pulse * 0.18);
    this.interactFocusGfx.strokeCircle(target.x, y, r + 5 + pulse * 2);
    this.interactFocusGfx.fillStyle(0xf6c067, 0.82);
    this.interactFocusGfx.fillCircle(target.x, y, 1.8);
  }

  update() {
    if (!this.player) return;
    if (this.tilecapMode) {
      if (typeof (this.player as any).setVelocity === 'function') {
        (this.player as any).setVelocity(0, 0);
      }
      this.updateDynamicDepths();
      return;
    }
    this.updatePlayerMovement();
    this.updateNetworkMovement('t2_v3_south_c');
    this.updateActiveZone();
    if (this.handleAreaTransitions()) return;
    try { this.registry.set('playerPos', { x: this.player.x, y: this.player.y }); } catch {}

    if (this.propDebugToggleKey && Phaser.Input.Keyboard.JustDown(this.propDebugToggleKey)) {
      this.applyDebugMode(!this.propDebugMode);
      (window as any).__debugModeEnabled = this.propDebugMode;
      this.setHint(this.propDebugMode ? t('lobby.hint.propDebugOn') : t('lobby.hint.propDebugOff'));
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.applyDebugMode(!this.physics.world.drawDebug);
      (window as any).__debugModeEnabled = this.physics.world.drawDebug;
    }

    this.updateDynamicDepths();
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

    if (this.microPulseTargets.length) {
      const now = this.time.now * 0.001;
      for (const row of this.microPulseTargets) {
        if (!row.node.active) continue;
        const pulse = (Math.sin(now * row.speed + row.phase) + 1) * 0.5;
        row.node.setAlpha(Math.max(0.78, Math.min(1, row.baseAlpha + (pulse - 0.5) * row.amp)));
      }
    }

    // Escalator carry effect based on split step-lanes.
    const dt = Math.max(0.5, Math.min(2, this.game.loop.delta / 16.6667));
    for (const lane of this.escalatorCarryLanes) {
      const inLane = this.player.x >= lane.x && this.player.x <= lane.x + lane.width
        && this.player.y >= lane.y && this.player.y <= lane.y + lane.height;
      if (!inLane) continue;
      this.player.y += lane.dy * 0.08 * dt;
      break;
    }

    let nearest: { world: Phaser.Math.Vector2; label: string; radius: number; actionLabel: string; action: () => void } | null = null;
    let minDist = Infinity;
    for (const item of this.interactables) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.world.x, item.world.y);
      if (d < item.radius && d < minDist) { minDist = d; nearest = item; }
    }

    if (nearest) {
      this.drawInteractFocus(nearest.world, nearest.radius);
      if (!this.interactionLocked) {
        this.registry.set('interactOptions', [nearest.actionLabel]);
        this.registry.set('interactOpen', true);
      } else {
        this.registry.set('interactOpen', false);
      }
      this.setHint(t('lobby.hint.interactMenu', { zone: this.activeZoneLabel, target: nearest.label }));
      if (!this.interactionLocked && Phaser.Input.Keyboard.JustDown(this.keys.E)) nearest.action();
    } else {
      try { this.interactFocusGfx?.clear(); } catch {}
      this.registry.set('interactOpen', false);
      this.setHint(t('lobby.hint.moveMenuDebug', { zone: this.activeZoneLabel }));
    }

    try {
      (window as any).__playerLast = { x: this.player.x, y: this.player.y, w: this.worldW, h: this.worldH, scale: 1 };
    } catch {}
  }
}

