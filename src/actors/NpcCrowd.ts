import Phaser from 'phaser';
import { CONFIG } from '../config';

import type { Traveler } from '../api/travelers';

export type CrowdOptions = {
  count: number;
  area: { xMin: number; xMax: number; yMin: number; yMax: number };
  texture?: string;
  tint?: number;
  layer?: Phaser.Tilemaps.TilemapLayer;
  collideWith?: Phaser.Types.Physics.Arcade.GameObjectWithBody[];
  speed?: { vx: [number, number]; vy: [number, number] };
  bounce?: { x: number; y: number };
  travelers?: Traveler[]; // 提供可選旅客屬性清單
  texturesByGender?: { M?: string; F?: string; O?: string; default?: string };
};

type Meta = { state: 'walk' | 'pause'; nextAt: number };

export function createCrowd(
  scene: Phaser.Scene,
  opts: CrowdOptions
): Phaser.Physics.Arcade.Group {
  const physics = scene.physics as Phaser.Physics.Arcade.ArcadePhysics;
  const group = physics.add.group();
  const tex = opts.texture ?? 'sprite-npc';
  const tint = opts.tint ?? 0xffffff;
  const vx = opts.speed?.vx ?? [-35, 35];
  const vy = opts.speed?.vy ?? [-25, 25];
  const bx = opts.bounce?.x ?? 1;
  const by = opts.bounce?.y ?? 1;

  const meta = new Map<Phaser.GameObjects.Image, Meta>();
  (group as any).__meta = meta;

  const rnd = Phaser.Math.Between;
  const pick = (min: number, max: number, fallback: number) => {
    const v = rnd(min, max);
    return v === 0 ? fallback : v;
    };

  const pool = (opts.travelers && opts.travelers.length) ? opts.travelers.slice() : undefined;
  const pickTraveler = (): Traveler | undefined => {
    if (!pool || !pool.length) return undefined;
    const idx = Phaser.Math.Between(0, pool.length - 1);
    return pool.splice(idx, 1)[0];
  };

  for (let i = 0; i < opts.count; i++) {
    const x = rnd(opts.area.xMin, opts.area.xMax);
    const y = rnd(opts.area.yMin, opts.area.yMax);
    const tv = pickTraveler();
    const chosenTexture = tv ? (opts.texturesByGender?.[tv.gender as 'M' | 'F' | 'O'] || opts.texturesByGender?.default || tex) : tex;
    const chosenTint = tv ? (tv.gender === 'F' ? 0xcfa8ff : tv.gender === 'M' ? 0xa8d1ff : 0xa8ffc6) : tint;
    const npc = scene.add.image(x, y, chosenTexture).setTint(chosenTint);
    group.add(npc);
    physics.add.existing(npc);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(bx, by);
    body.setVelocity(pick(vx[0], vx[1], 20), pick(vy[0], vy[1], 15));
    meta.set(npc, { state: 'walk', nextAt: scene.time.now + rnd(900, 1600) });
    if (tv) npc.setData('traveler', tv);
  }

  if (opts.layer) physics.add.collider(group, opts.layer);
  physics.add.collider(group, group);
  (opts.collideWith ?? []).forEach((obj) => physics.add.collider(group, obj));

  return group;
}

export function updateCrowd(scene: Phaser.Scene, group?: Phaser.Physics.Arcade.Group) {
  if (!group) return;
  const meta: Map<Phaser.GameObjects.Image, Meta> = (group as any).__meta;
  if (!meta) return;
  const now = scene.time.now;
  group.children.iterate((obj: any) => {
    const npc = obj as Phaser.GameObjects.Image;
    const m = meta.get(npc);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    if (!m || !body) return undefined;
    if (now >= m.nextAt) {
      if (m.state === 'walk') {
        m.state = 'pause';
        m.nextAt = now + Phaser.Math.Between(500, 900);
        body.setVelocity(0, 0);
      } else {
        m.state = 'walk';
        m.nextAt = now + Phaser.Math.Between(900, 1600);
        const vx = Phaser.Math.Between(-35, 35) || 20;
        const vy = Phaser.Math.Between(-25, 25) || 15;
        body.setVelocity(vx, vy);
      }
    }
    return undefined;
  });
}

export function updateNameplates(
  scene: Phaser.Scene,
  group: Phaser.Physics.Arcade.Group | undefined,
  player: { x: number; y: number } | undefined,
  maxDistance: number = 42
) {
  if (!group || !player) return;
  const cam: any = (scene.cameras && (scene.cameras as any).main) ? (scene.cameras as any).main : null;
  const zoom = Math.max(0.0001, cam?.zoom || 1);
  const FS = CONFIG.ui.fontSize;
  const fsWorld = Math.max(8, Math.round(FS / zoom));
  const yOffset = Math.max(10, Math.round(fsWorld + 4));
  group.children.iterate((obj: any) => {
    const npc = obj as Phaser.GameObjects.Image & { getData: Function; setData: Function };
    if (!npc || !npc.active) return undefined;
    const tv = npc.getData?.('traveler') as any;
    if (!tv) {
      const lbl: Phaser.GameObjects.Text | undefined = npc.getData?.('nameLabel');
      if (lbl) { try { lbl.destroy(); } catch {} npc.setData('nameLabel', undefined); }
      return undefined;
    }
    const dist = Phaser.Math.Distance.Between(npc.x, npc.y, player.x, player.y);
    let lbl: Phaser.GameObjects.Text | undefined = npc.getData?.('nameLabel');
    if (dist <= maxDistance) {
      if (!lbl || !lbl.active) {
        const color = '#243b53';
        lbl = scene.add.text(npc.x, npc.y - yOffset, tv.name || '', {
          fontSize: `${fsWorld}px`,
          color,
          resolution: 2,
          fontFamily: 'HanPixel, system-ui, sans-serif',
        }).setOrigin(0.5, 1).setDepth((npc.depth || 0) + 5)
          .setStroke('#ffffff', 2);
        npc.setData('nameLabel', lbl);
      }
      // 若縮放變化，更新字級
      const want = `${fsWorld}px`;
      if ((lbl!.style.fontSize as any) !== want) lbl!.setFontSize(fsWorld);
      // 確保描邊存在（在某些 HMR 更新下可能丟失樣式）
      try { lbl!.setStroke('#ffffff', 2); } catch {}
      // 跟隨定位在頭上
      lbl!.setPosition(npc.x, npc.y - yOffset).setVisible(true);
    } else {
      if (lbl) lbl.setVisible(false);
    }
    return undefined;
  });
}

export function updateNameplateForSprite(
  scene: Phaser.Scene,
  sprite: (Phaser.GameObjects.Image & { getData?: Function; setData?: Function }) | undefined,
  player: { x: number; y: number } | undefined,
  maxDistance: number = 42
) {
  if (!sprite || !player) return;
  const grp = (scene.physics as Phaser.Physics.Arcade.ArcadePhysics).add.group();
  try { grp.add(sprite); } catch {}
  updateNameplates(scene, grp, player, maxDistance);
  try { grp.remove(sprite, false, false); } catch {}
}
