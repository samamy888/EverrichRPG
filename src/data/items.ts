export type Item = {
  id: string;
  name: string;
  price: number;
  store: 'cosmetics' | 'liquor';
};

export const items: Item[] = [
  { id: 'cos-01', name: '保濕精華 30ml', price: 120, store: 'cosmetics' },
  { id: 'cos-02', name: '護手霜', price: 40, store: 'cosmetics' },
  { id: 'cos-03', name: '香水 10ml', price: 90, store: 'cosmetics' },
  { id: 'liq-01', name: '威士忌 500ml', price: 300, store: 'liquor' },
  { id: 'liq-02', name: '紅酒', price: 220, store: 'liquor' },
  { id: 'liq-03', name: '高粱酒', price: 180, store: 'liquor' },
];

