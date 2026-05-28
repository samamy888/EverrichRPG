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

export const TPE2_FLOORPLAN_BG_KEY = 't2-lobby-floorplan-base';
export const TPE2_FLOORPLAN_BG_PATH = 'map/TPE2/tpe2_floorplan_base.png';

export const TPE2_FLOORPLAN_PROP_MAP: Record<string, string> = {
  'airport-atm': 'floorplan-atm',
  'airport-chairs': 'floorplan-chairs',
  'airport-elevator': 'floorplan-elevator',
  'checkin-counter-module': 'floorplan-checkin-counter',
  'checkin-kiosk': 'floorplan-self-checkin',
  'curved-info-desk': 'floorplan-info-counter',
  'dutyfree-shop-kiosk': 'floorplan-shop',
  'flight-board': 'floorplan-flight-board',
  'glass-partition': 'floorplan-glass-partition',
  'info-counter': 'floorplan-info-counter',
  'potted-palm': 'floorplan-plant',
  'security-partition': 'floorplan-security-partition',
  'security-scanner': 'floorplan-security-scanner',
  'self-checkin-kiosk': 'floorplan-self-checkin',
  'short-wall': 'floorplan-short-wall',
  'signage-pillar': 'floorplan-signage',
  'trash-bin': 'floorplan-trash-bin',
  'wall-column': 'floorplan-column',
};

export const TPE2_FLOORPLAN_PROP_KEYS = Array.from(new Set(Object.values(TPE2_FLOORPLAN_PROP_MAP)));

export const TPE2_BLOCKERS: Tpe2Blocker[] = [
  // World perimeter bounds
  { x: 0, y: 0, width: 6000, height: 24 },
  { x: 0, y: 3448, width: 6000, height: 24 },
  { x: 0, y: 0, width: 24, height: 3472 },
  { x: 5976, y: 0, width: 24, height: 3472 },

  // Upper and lower large gray zones (leave cyan lanes walkable)
  { x: 0, y: 410, width: 2370, height: 2620 },
  { x: 3360, y: 410, width: 2640, height: 2620 },

  // Central middle walls around white hall spine
  { x: 2368, y: 548, width: 95, height: 2470 },
  { x: 3020, y: 548, width: 118, height: 2470 },
  { x: 3168, y: 560, width: 232, height: 2430 },

  // Mid-right structural chunks
  { x: 2880, y: 1680, width: 230, height: 790 },
  { x: 3180, y: 1985, width: 175, height: 260 },
  { x: 3180, y: 2295, width: 175, height: 405 },

];

export const TPE2_ARCHITECTURE_PROPS: Tpe2PropPlacement[] = [
  { key: 'airport-elevator', x: 2880, y: 420, scale: 0.28, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 3140, y: 420, scale: 0.28, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 2920, y: 2912, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'airport-elevator', x: 3260, y: 2912, scale: 0.24, collide: true, bodyMode: 'box' },

  { key: 'wall-column', x: 2380, y: 700, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2380, y: 1140, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2380, y: 1580, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2380, y: 2020, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 2380, y: 2460, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3650, y: 700, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3650, y: 1160, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3650, y: 1620, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3650, y: 2080, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'wall-column', x: 3650, y: 2540, scale: 0.24, collide: true, bodyMode: 'box' },

  { key: 'short-wall', x: 2850, y: 520, scale: 0.26, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 3150, y: 520, scale: 0.26, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 2880, y: 2952, scale: 0.28, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 3220, y: 2952, scale: 0.28, collide: true, bodyMode: 'box' },

  { key: 'glass-partition', x: 3400, y: 940, scale: 0.28, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3400, y: 1180, scale: 0.28, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3400, y: 1420, scale: 0.28, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3400, y: 1660, scale: 0.28, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 2720, y: 980, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 2720, y: 1240, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 2720, y: 1860, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 2720, y: 2180, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3060, y: 980, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3060, y: 1240, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3060, y: 1860, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'glass-partition', x: 3060, y: 2180, scale: 0.24, collide: false, bodyMode: 'box' },

  { key: 'short-wall', x: 2880, y: 1540, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 3210, y: 1540, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 2880, y: 2360, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 3210, y: 2360, scale: 0.24, collide: false, bodyMode: 'box' },
  { key: 'short-wall', x: 2880, y: 2730, scale: 0.24, collide: true, bodyMode: 'box' },
  { key: 'short-wall', x: 3210, y: 2730, scale: 0.24, collide: false, bodyMode: 'box' },

  { key: 'self-checkin-kiosk', x: 2460, y: 980, scale: 0.17, collide: true, bodyMode: 'box' },
  { key: 'self-checkin-kiosk', x: 2460, y: 1260, scale: 0.17, collide: true, bodyMode: 'box' },
  { key: 'self-checkin-kiosk', x: 2460, y: 1540, scale: 0.17, collide: true, bodyMode: 'box' },
];

export const TPE2_FEATURE_PROPS: Tpe2PropPlacement[] = [
  // Escalator zone placeholders (replace with dedicated escalator art in next art pass)
  { key: 'escalator-module', x: 3030, y: 490, scale: 0.68, collide: false, bodyMode: 'box' },
  { key: 'escalator-module', x: 3030, y: 2868, scale: 0.64, collide: false, bodyMode: 'box' },

  // Customs / security entrance frontage
  { key: 'customs-gate-module', x: 3220, y: 1030, scale: 0.16, collide: false, bodyMode: 'box' },
  { key: 'info-counter', x: 3350, y: 1750, scale: 0.24, collide: true, bodyMode: 'box' },

  // Duty-free frontage rhythm
  { key: 'shopfront-module', x: 3540, y: 1360, scale: 0.16, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3540, y: 1640, scale: 0.16, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3540, y: 1920, scale: 0.16, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3540, y: 2200, scale: 0.16, collide: false, bodyMode: 'box' },
  { key: 'shopfront-module', x: 3540, y: 2480, scale: 0.16, collide: false, bodyMode: 'box' },
];

export const TPE2_DECOR_PROPS: Tpe2PropPlacement[] = [
  { key: 'airport-chairs', x: 1080, y: 2992, scale: 0.2, collide: true },
  { key: 'airport-chairs', x: 4920, y: 2992, scale: 0.2, collide: true },
  { key: 'potted-palm', x: 2360, y: 3052, scale: 0.2, collide: true },
  { key: 'potted-palm', x: 3760, y: 3052, scale: 0.2, collide: true },
  { key: 'trash-bin', x: 2220, y: 3102, scale: 0.14, collide: true },
  { key: 'trash-bin', x: 3900, y: 3102, scale: 0.14, collide: true },
  { key: 'security-partition', x: 3160, y: 1160, scale: 0.18, collide: true },
  { key: 'security-partition', x: 3300, y: 1160, scale: 0.18, collide: true },
];
