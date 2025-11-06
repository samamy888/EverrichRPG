import Phaser from 'phaser';
import { getClient } from './ws';
import { getApiBase } from './http';
import { CONFIG } from '../config';

type Facing = 'down'|'up'|'side';

type OthersState = {
  group: Phaser.GameObjects.Group;
  map: Map<string, Phaser.GameObjects.Sprite>;
  names: Map<string, Phaser.GameObjects.Text>;
  meta: Map<string, { name: string; gender: 'M'|'F'; lastX: number; lastY: number; facing?: Facing; locked?: boolean }>;
  pending: Set<string>;
}

export type AttachOthersOptions = {
  getArea: () => string;           // e.g. 'hall' or `store:cosmetics`
  crossArea?: boolean;             // if false, filter by same area
}

export function attachOthers(scene: Phaser.Scene, opts: AttachOthersOptions) {
  const state: OthersState = {
    group: scene.add.group(),
    map: new Map(),
    names: new Map(),
    meta: new Map(),
    pending: new Set(),
  };
  (scene as any).__others = state;

  const pickTextureKey = (gender: 'M'|'F') => {
    const okF = gender === 'F' && scene.textures.exists('player_f') && (scene.anims as any).exists?.('player-f-idle-down');
    if (okF) return 'player_f';
    const okM = scene.textures.exists('player_m') && (scene.anims as any).exists?.('player-m-idle-down');
    if (okM) return 'player_m';
    return undefined;
  };

  const ensure = (id: string, x: number, y: number, name?: string, gender?: 'M'|'F', aid?: string) => {
    // 避免把自己當成「他人」建立：比對 aid 或連線 cid
    try {
      const c = getClient();
      const isSelf = (aid && c.getAid && c.getAid() === aid) || (c.getCid && c.getCid() === id) || (c.getId && c.getId() === id);
      if (isSelf) return;
    } catch {}
    // 僅在有提供性別時更新，避免預設成 M 造成誤建
    const gMaybe = (typeof gender !== 'undefined' ? gender : state.meta.get(id)?.gender) as ('M'|'F'|undefined);
    const nm = name || (state.meta.get(id)?.name || '');
    const existing = state.meta.get(id);
    const meta = existing || { name: nm, gender: (gMaybe||'M'), lastX: x, lastY: y, facing: 'down' as Facing, locked: false } as any;
    if (aid) (meta.aid = aid);
    meta.name = nm;
    if (!meta.locked && typeof gMaybe !== 'undefined') meta.gender = gMaybe;
    meta.lastX = x; meta.lastY = y;
    state.meta.set(id, meta);
    if (state.map.has(id)) { move(id, x, y); return; }
    if (state.pending.has(id)) return;
    state.pending.add(id);
    const tryCreate = () => {
      if (state.map.has(id)) { state.pending.delete(id); return; }
      const g = state.meta.get(id)?.gender as ('M'|'F'|undefined);
      // 若尚未取得性別，延後建立，避免誤用預設 M 導致顯示錯誤
      if (!g) { scene.time.delayedCall(50, tryCreate); return; }
      const key = pickTextureKey(g);
      if (!key) { scene.time.delayedCall(50, tryCreate); return; }
      state.pending.delete(id);
      if (state.map.has(id)) return;
      const spr = scene.add.sprite(x, y, key).setOrigin(0.5, 1).setDepth(10);
      state.group.add(spr); state.map.set(id, spr);
      try {
        const pref = ((state.meta.get(id)?.gender || 'M') as 'M'|'F') === 'F' ? 'player-f' : 'player-m';
        const k = `${pref}-idle-down`; if ((scene.anims as any).exists?.(k)) (spr as any).anims?.play?.(k);
      } catch {}
      // 名牌
      try {
        if (nm) {
          const plate = scene.add.text(x, y - 20, nm, { fontSize: `${CONFIG.ui.small}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' })
            .setOrigin(0.5, 1).setDepth(11).setScrollFactor(1);
          try { plate.setStroke('#ffffff', 2); } catch {}
          state.names.set(id, plate);
        }
      } catch {}
    };
    tryCreate();
  };

  const move = (id: string, x: number, y: number, aid?: string) => {
    const spr = state.map.get(id); if (!spr) return;
    spr.setPosition(x, y);
    const meta = state.meta.get(id);
    // 若伺服器提供 aid，清理同 aid 的舊實體（避免重連殘留重影）
    if (aid) {
      try {
        for (const [oid, m] of Array.from(state.meta.entries())) {
          const sameAid = (m as any)?.aid && (m as any).aid === aid;
          if (sameAid && oid !== id) {
            const os = state.map.get(oid);
            if (os) { try { os.destroy(); } catch {} state.map.delete(oid); }
            const on = state.names.get(oid);
            if (on) { try { on.destroy(); } catch {} state.names.delete(oid); }
            state.meta.delete(oid);
          }
        }
      } catch {}
    }
    const g = (meta?.gender || 'M') as 'M'|'F';
    const pref = g === 'F' ? 'player-f' : 'player-m';
    // 若初次建立時使用了錯誤的貼圖，這裡在確認性別後強制切換一次貼圖
    try {
      const expectedTex = g === 'F' ? 'player_f' : 'player_m';
      if ((spr.texture?.key !== expectedTex) && scene.textures.exists(expectedTex)) {
        (spr as any).setTexture(expectedTex);
      }
    } catch {}
    const dx = meta ? x - meta.lastX : 0; const dy = meta ? y - meta.lastY : 0; const adx = Math.abs(dx), ady = Math.abs(dy);
    const moving = (adx + ady) > 0.1; let facing: Facing = meta?.facing || 'down'; let flipX = (spr as any).flipX || false;
    const current = ((spr as any).anims?.currentAnim?.key) || '';
    if (moving) {
      if (adx >= ady) { facing = 'side'; flipX = dx < 0; }
      else { facing = dy < 0 ? 'up' : 'down'; }
      (spr as any).setFlipX?.(facing === 'side' ? flipX : false);
      const key = (scene.anims as any).exists?.(`${pref}-walk-${facing}`) ? `${pref}-walk-${facing}` : undefined;
      if (key && current !== key) (spr as any).anims?.play?.(key, true);
    } else {
      const key = (scene.anims as any).exists?.(`${pref}-idle-${facing}`) ? `${pref}-idle-${facing}` : undefined;
      (spr as any).setFlipX?.(facing === 'side' ? flipX : false);
      if (key && current !== key) (spr as any).anims?.play?.(key, true);
    }
    if (meta) { meta.lastX = x; meta.lastY = y; meta.facing = facing; state.meta.set(id, meta); }
    try { const plate = state.names.get(id); if (plate) plate.setPosition(x, y - 20); } catch {}
  };

  const remove = (id: string) => {
    const spr = state.map.get(id); if (spr) { try { spr.destroy(); } catch {} state.map.delete(id); }
    const plate = state.names.get(id); if (plate) { try { plate.destroy(); } catch {} state.names.delete(id); }
    state.meta.delete(id); state.pending.delete(id);
  };

  // WS handlers
  try {
    const ws = getClient();
    const parseGender = (v: any): ('M'|'F'|undefined) => {
      const s = String(v ?? '').toUpperCase();
      if (s === 'F') return 'F';
      if (s === 'M') return 'M';
      return undefined;
    };
    ws.on('player-joined', (d: any) => {
      if (!opts.crossArea && !sameArea(d.area||'', opts.getArea())) return;
      ensure(d.id, 0, 0, d.name, parseGender(d.gender), d.aid);
    });
    ws.on('player-moved', (d: any) => {
      const g = parseGender(d.gender);
      if (!opts.crossArea && !sameArea(d.area||'', opts.getArea())) { remove(d.id); return; }
      // 避免把自己建立進來
      try {
        const c = getClient();
        const isSelf = (d.aid && c.getAid && c.getAid() === d.aid) || (c.getCid && c.getCid() === d.id) || (c.getId && c.getId() === d.id);
        if (isSelf) return;
      } catch {}
      if (!state.map?.has?.(d.id)) ensure(d.id, d.x, d.y, d.name, g, d.aid); else move(d.id, d.x, d.y, d.aid);
    });
    ws.on('player-left', (d: any) => { remove(d.id); });
    // Snapshot
    fetch(`${getApiBase()}/players`).then(r => r.json()).then((list: any[]) => {
      try {
        list.filter(p => opts.crossArea || sameArea(p.area||'', opts.getArea()))
            .forEach(p => ensure(p.id, p.x, p.y, p.name, parseGender(p.gender), p.aid));
      } catch {}
    }).catch(() => {});
  } catch {}
}
  const normArea = (s: any) => String(s ?? '').trim().toLowerCase();
  const sameArea = (a: any, b: any) => normArea(a) === normArea(b);
