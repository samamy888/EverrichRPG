export interface ShopSummary {
  id: string;
  name: string;
  welcome: string;
  clerkMessage: string;
  productIds: string[];
}

export interface ProductSummary {
  id: string;
  sku: string;
  storeId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  promotionPrice?: number | null;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  stockQuantity: number;
}

export interface ShopCatalogResponse {
  schemaVersion: number;
  shops: ShopSummary[];
  products: ProductSummary[];
}

export interface TravelerAppearance {
  gender: string;
  ageGroup: string;
  hairStyle: string;
  top: string;
  pants: string;
}

export interface TravelerSummary {
  id: string;
  name: string;
  variant: string;
  appearance: TravelerAppearance;
  dialogue: string;
  movementType: string;
  facing: string;
  speed: number;
}

export interface TravelerRosterResponse {
  schemaVersion: number;
  travelers: TravelerSummary[];
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? "http://127.0.0.1:5080/api/v1" : "/api/v1");

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchShopCatalog(): Promise<ShopCatalogResponse> {
  return fetchJson<ShopCatalogResponse>("/shops/catalog");
}

export function fetchTravelerRoster(): Promise<TravelerRosterResponse> {
  return fetchJson<TravelerRosterResponse>("/travelers");
}
