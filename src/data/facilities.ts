/**
 * 桃園機場 T2 設施配置數據庫
 * 採用數據驅動架構，方便未來輕鬆增減店面或櫃檯
 */

export interface Facility {
    id: string;
    name: string;
    type: 'shop' | 'counter' | 'info' | 'gate';
    x: number;
    y: number;
    texture: string;
    scale?: number;
    targetScene?: string; // 點擊後要切換到的場景 (例如 StoreScene)
    hint?: string;
}

export const T2_FACILITIES: Facility[] = [
    // --- 管制區外：報到大廳 (Landside) ---
    {
        id: 'checkin-island-1',
        name: '長榮航空報到櫃檯',
        type: 'counter',
        x: 1500, y: 3000,
        texture: 'prop-checkin-kiosk',
        hint: '請準備好護照進行報到。'
    },
    {
        id: 'checkin-island-2',
        name: '中華航空報到櫃檯',
        type: 'counter',
        x: 4500, y: 3000,
        texture: 'prop-checkin-kiosk',
        hint: '華航旅客請在此排隊。'
    },

    // --- 中段：安檢與海關 (Security) ---
    {
        id: 'customs-main',
        name: '證照查驗櫃檯',
        type: 'info',
        x: 3000, y: 1736,
        texture: 'prop-curved-info-desk',
        hint: '請取下帽子與眼鏡。'
    },

    // --- 管制區內：免稅商店街 (Airside) ---
    {
        id: 'everrich-cosmetics',
        name: '昇恆昌 - 彩妝香水免稅店',
        type: 'shop',
        x: 2000, y: 800,
        texture: 'prop-signage-pillar',
        targetScene: 'StoreScene',
        hint: '精品彩妝 8 折起，按 E 進入購物。'
    },
    {
        id: 'everrich-liquor',
        name: '昇恆昌 - 菸酒巧克力店',
        type: 'shop',
        x: 4000, y: 800,
        texture: 'prop-signage-pillar',
        targetScene: 'StoreScene',
        hint: '頂級威士忌免稅優惠中。'
    },
    {
        id: 'flight-info-center',
        name: '中央航班資訊大螢幕',
        type: 'info',
        x: 3000, y: 600,
        texture: 'prop-flight-board',
        hint: '查看最新起降動態。'
    }
];
