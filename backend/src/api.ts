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
  displayOrder: number;
}

export interface ProductInput {
  shopId: string;
  name: string;
  description: string;
  category: string;
  sku: string;
  price: number;
  promotionPrice: number | null;
  promotionStartAt: string | null;
  promotionEndAt: string | null;
  stockQuantity: number;
  displayOrder: number;
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

export interface TravelerInput {
  name: string;
  variant: string;
  gender: string;
  ageGroup: string;
  hairStyle: string;
  top: string;
  pants: string;
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

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers
    }
  });

  if (!response.ok) {
    const problem = await response.json().catch(() => null) as {
      detail?: string;
      title?: string;
      errors?: Record<string, string[]>;
    } | null;
    const validation = problem?.errors
      ? Object.values(problem.errors).flat().join(" ")
      : null;
    throw new Error(validation || problem?.detail || problem?.title || `API ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function sendWithoutResponse(path: string, method: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`API ${path} failed with ${response.status}`);
}

export function fetchShopCatalog(): Promise<ShopCatalogResponse> {
  return fetchJson<ShopCatalogResponse>("/shops/catalog");
}

export function fetchTravelerRoster(): Promise<TravelerRosterResponse> {
  return fetchJson<TravelerRosterResponse>("/travelers");
}

export function createProduct(input: ProductInput): Promise<ProductSummary> {
  return fetchJson<ProductSummary>("/products", { method: "POST", body: JSON.stringify(input) });
}

export function updateProduct(id: string, input: ProductInput): Promise<ProductSummary> {
  return fetchJson<ProductSummary>(`/products/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteProduct(id: string): Promise<void> {
  return sendWithoutResponse(`/products/${encodeURIComponent(id)}`, "DELETE");
}

export function createTraveler(input: TravelerInput): Promise<TravelerSummary> {
  return fetchJson<TravelerSummary>("/travelers", { method: "POST", body: JSON.stringify(input) });
}

export function updateTraveler(id: string, input: TravelerInput): Promise<TravelerSummary> {
  return fetchJson<TravelerSummary>(`/travelers/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteTraveler(id: string): Promise<void> {
  return sendWithoutResponse(`/travelers/${encodeURIComponent(id)}`, "DELETE");
}
