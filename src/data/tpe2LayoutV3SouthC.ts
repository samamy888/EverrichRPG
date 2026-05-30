export type Tpe2BodyMode = 'feet' | 'box';
export interface Tpe2PropPlacement { key: string; x: number; y: number; scale?: number; collide?: boolean; bodyMode?: Tpe2BodyMode; }
export interface Tpe2Blocker { x: number; y: number; width: number; height: number; }

export const TPE2_FLOORPLAN_BG_KEY = 't2-v3-south-c-base';
export const TPE2_FLOORPLAN_BG_PATH = 'map/TPE2_v3/tpe2_v3_south_c_base.png';
export const TPE2_FLOORPLAN_PROP_MAP: Record<string, string> = {};
export const TPE2_FLOORPLAN_PROP_KEYS: string[] = [];

export const TPE2_BLOCKERS: Tpe2Blocker[] = [
  { x: 0, y: 0, width: 6000, height: 24 }, { x: 0, y: 3448, width: 6000, height: 24 }, { x: 0, y: 0, width: 24, height: 3472 }, { x: 5976, y: 0, width: 24, height: 3472 },
  { x: 0, y: 0, width: 1900, height: 1232 }, { x: 4100, y: 0, width: 1900, height: 1232 },
  { x: 2700, y: 0, width: 180, height: 1212 }, { x: 3120, y: 0, width: 180, height: 1212 },
];

export const TPE2_ARCHITECTURE_PROPS: Tpe2PropPlacement[] = [
  { key: 'wall-column', x: 2720, y: 1920, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 2380, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 2840, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 1920, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 2380, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 2840, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 2920, y: 2900, scale: 0.68, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 3120, y: 2900, scale: 0.68, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3520, y: 2140, scale: 0.42, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3520, y: 2620, scale: 0.42, collide: false, bodyMode: 'box' },
];

export const TPE2_FEATURE_PROPS: Tpe2PropPlacement[] = [
  { key: 'flight-board', x: 3000, y: 2380, scale: 0.5, collide: false, bodyMode: 'box' },
];

export const TPE2_DECOR_PROPS: Tpe2PropPlacement[] = [
  { key: 'airport-chairs', x: 2400, y: 1600, scale: 0.34, collide: true },
  { key: 'airport-chairs', x: 3660, y: 1600, scale: 0.34, collide: true },
  { key: 'potted-palm', x: 2900, y: 1500, scale: 0.34, collide: true },
  { key: 'potted-palm', x: 3140, y: 1500, scale: 0.34, collide: true },
];
