export type Item = {
  id: string;
  name: string;
  price: number;
  store: 'cosmetics' | 'liquor' | 'snacks' | 'tobacco' | 'perfume';
};

export const items: Item[] = [
  { id: 'cos-01', name: '護手霜 30ml', price: 120, store: 'cosmetics' },
  { id: 'cos-02', name: '化妝棉', price: 40, store: 'cosmetics' },
  { id: 'cos-03', name: '香氛 10ml', price: 90, store: 'cosmetics' },
  { id: 'liq-01', name: '威士忌 500ml', price: 300, store: 'liquor' },
  { id: 'liq-02', name: '紅酒一支', price: 220, store: 'liquor' },
  { id: 'liq-03', name: '啤酒六入', price: 180, store: 'liquor' },
  { id: 'snk-01', name: '巧克力禮盒', price: 150, store: 'snacks' },
  { id: 'snk-02', name: '餅乾家族包', price: 90, store: 'snacks' },
  { id: 'tob-01', name: '雪茄（小支）', price: 260, store: 'tobacco' },
  { id: 'tob-02', name: '紙菸一條', price: 1200, store: 'tobacco' },
  { id: 'per-01', name: '淡香水 50ml', price: 480, store: 'perfume' },
  { id: 'per-02', name: '香水 100ml', price: 980, store: 'perfume' },
];

