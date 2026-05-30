export type Tpe2BodyMode = 'feet' | 'box';

export interface Tpe2PropPlacement {
  key: string;
  x: number;
  y: number;
  scale?: number;
  collide?: boolean;
  bodyMode?: Tpe2BodyMode;
}

export interface Tpe2Blocker {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TPE2_FLOORPLAN_BG_KEY = 't2-v2-lobby-base';
export const TPE2_FLOORPLAN_BG_PATH = 'map/TPE2_v2/tpe2_v2_base.png';

export const TPE2_FLOORPLAN_PROP_MAP: Record<string, string> = {
  'checkin-kiosk': 'floorplan-self-checkin',
  'curved-info-desk': 'floorplan-info-counter',
};

export const TPE2_FLOORPLAN_PROP_KEYS = Array.from(new Set(Object.values(TPE2_FLOORPLAN_PROP_MAP)));

export const TPE2_BLOCKERS: Tpe2Blocker[] = [
  { x: 0, y: 0, width: 6000, height: 24 },
  { x: 0, y: 3448, width: 6000, height: 24 },
  { x: 0, y: 0, width: 24, height: 3472 },
  { x: 5976, y: 0, width: 24, height: 3472 },

  { x: 0, y: 560, width: 1920, height: 2320 },
  { x: 4080, y: 560, width: 1920, height: 2320 },

  { x: 2760, y: 560, width: 120, height: 2320 },
  { x: 3120, y: 560, width: 120, height: 2320 },
];

export const TPE2_ARCHITECTURE_PROPS: Tpe2PropPlacement[] = [
  { key: 'airport-elevator', x: 2860, y: 520, scale: 0.44, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 3180, y: 520, scale: 0.44, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 2860, y: 2876, scale: 0.44, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 3180, y: 2876, scale: 0.44, collide: true, bodyMode: 'box' },

  { key: 'wall-column', x: 2720, y: 760, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 1240, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 1720, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 2200, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2720, y: 2680, scale: 0.68, collide: true, bodyMode: 'box' },

  { key: 'wall-column', x: 3240, y: 760, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 1240, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 1720, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 2200, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3240, y: 2680, scale: 0.68, collide: true, bodyMode: 'box' },

  { key: 'short-wall', x: 2880, y: 620, scale: 0.68, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 3080, y: 620, scale: 0.68, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 2880, y: 2800, scale: 0.68, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 3080, y: 2800, scale: 0.68, collide: true, bodyMode: 'box' },

  { key: 'glass-partition', x: 3540, y: 1160, scale: 0.42, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3540, y: 1700, scale: 0.42, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3540, y: 2240, scale: 0.42, collide: false, bodyMode: 'box' },

  { key: 'self-checkin-kiosk', x: 2460, y: 1180, scale: 0.30, collide: true, bodyMode: 'box' },
  { key: 'self-checkin-kiosk', x: 2460, y: 1520, scale: 0.30, collide: true, bodyMode: 'box' },
  { key: 'self-checkin-kiosk', x: 2460, y: 1860, scale: 0.30, collide: true, bodyMode: 'box' },
];

export const TPE2_FEATURE_PROPS: Tpe2PropPlacement[] = [
  { key: 'escalator-module', x: 3030, y: 700, scale: 0.26, collide: false, bodyMode: 'box' },
  { key: 'escalator-module', x: 3030, y: 2740, scale: 0.26, collide: false, bodyMode: 'box' },

  { key: 'customs-gate-module', x: 3400, y: 1120, scale: 0.30, collide: false, bodyMode: 'box' },

  { key: 'shopfront-module', x: 3840, y: 1280, scale: 0.30, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3840, y: 1560, scale: 0.30, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3840, y: 1840, scale: 0.30, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3840, y: 2120, scale: 0.30, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3840, y: 2400, scale: 0.30, collide: false, bodyMode: 'box' },
];

export const TPE2_DECOR_PROPS: Tpe2PropPlacement[] = [
  { key: 'airport-chairs', x: 1120, y: 2960, scale: 0.36, collide: true },
  { key: 'airport-chairs', x: 4880, y: 2960, scale: 0.36, collide: true },
  { key: 'potted-palm', x: 2360, y: 3000, scale: 0.34, collide: true },
  { key: 'potted-palm', x: 3760, y: 3000, scale: 0.34, collide: true },
  { key: 'trash-bin', x: 2240, y: 3040, scale: 0.26, collide: true },
  { key: 'trash-bin', x: 3880, y: 3040, scale: 0.26, collide: true },
  { key: 'security-partition', x: 2960, y: 1320, scale: 0.32, collide: true },
  { key: 'security-partition', x: 3280, y: 1320, scale: 0.32, collide: true },
];
