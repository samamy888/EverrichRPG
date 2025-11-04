import Phaser from 'phaser';

export type CrowdOptions = {
  count: number;
  area: { xMin: number; xMax: number; yMin: number; yMax: number };
  texture?: string;
  tint?: number;
  layer?: Phaser.Tilemaps.TilemapLayer;
  collideWith?: Phaser.Types.Physics.Arcade.GameObjectWithBody[];
  speed?: { vx: [number, number]; vy: [number, number] };
  bounce?: { x: number; y: number };
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

  for (let i = 0; i < opts.count; i++) {
    const x = rnd(opts.area.xMin, opts.area.xMax);
    const y = rnd(opts.area.yMin, opts.area.yMax);
    const npc = scene.add.image(x, y, tex).setTint(tint);
    group.add(npc);
    physics.add.existing(npc);
    const body = npc.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setBounce(bx, by);
    body.setVelocity(pick(vx[0], vx[1], 20), pick(vy[0], vy[1], 15));
    meta.set(npc, { state: 'walk', nextAt: scene.time.now + rnd(900, 1600) });
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

