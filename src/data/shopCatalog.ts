import catalog from "../../game/content/shops/shop-catalog.json";
import { CONFIG } from "../config";

export type ProductCategory =
  | "beauty"
  | "perfume"
  | "liquor"
  | "food"
  | "souvenir"
  | "travel";

export type ShopId = "shop-beauty-01" | "shop-liquor-food-01" | "shop-gift-01";

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  sku: string;
  price: number;
  promotionPrice: number | null;
  promotionStartAt: string | null;
  promotionEndAt: string | null;
  stockQuantity: number;
  storeId: ShopId;
}

export interface ShopDefinition {
  id: ShopId;
  name: string;
  welcome: string;
  clerkMessage: string;
  productIds: string[];
}

export interface ShopCatalog {
  schemaVersion: 1;
  shops: ShopDefinition[];
  products: ShopProduct[];
}

const runtimeCatalog = catalog as ShopCatalog;

export const SHOPS = [...runtimeCatalog.shops];
export const SHOP_PRODUCTS = [...runtimeCatalog.products];

export type ShopCatalogSource = "api" | "local";

let catalogSource: ShopCatalogSource = "local";

export function getShopCatalogSource(): ShopCatalogSource {
  return catalogSource;
}

export async function syncShopCatalog(): Promise<ShopCatalogSource> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(`${CONFIG.apiBaseUrl}/shops/catalog`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Shop catalog request failed with ${response.status}.`);
    }

    const remoteCatalog = (await response.json()) as ShopCatalog;
    if (!isShopCatalog(remoteCatalog)) {
      throw new Error("Shop catalog response is invalid.");
    }

    SHOPS.splice(0, SHOPS.length, ...remoteCatalog.shops);
    SHOP_PRODUCTS.splice(0, SHOP_PRODUCTS.length, ...remoteCatalog.products);
    catalogSource = "api";
  } catch (error) {
    catalogSource = "local";
    console.warn("Shop catalog API unavailable; using local fallback.", error);
  } finally {
    window.clearTimeout(timeout);
  }

  window.dispatchEvent(
    new CustomEvent("prototype:shop-catalog", { detail: { source: catalogSource } })
  );
  return catalogSource;
}

export function getShop(shopId: string): ShopDefinition | undefined {
  return SHOPS.find((shop) => shop.id === shopId);
}

export function getShopProducts(shopId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter((product) => product.storeId === shopId);
}

function isShopCatalog(value: ShopCatalog): boolean {
  if (
    value?.schemaVersion !== 1 ||
    !Array.isArray(value.shops) ||
    !Array.isArray(value.products)
  ) {
    return false;
  }

  return value.shops.every(
    (shop) =>
      typeof shop.id === "string" &&
      typeof shop.name === "string" &&
      Array.isArray(shop.productIds)
  ) &&
    value.products.every((product) => {
      const hasNoPromotion =
        product.promotionPrice === null &&
        product.promotionStartAt === null &&
        product.promotionEndAt === null;
      const hasValidPromotion =
        Number.isInteger(product.promotionPrice) &&
        product.promotionPrice! >= 0 &&
        product.promotionPrice! < product.price &&
        product.promotionStartAt !== null &&
        product.promotionEndAt !== null &&
        !Number.isNaN(Date.parse(product.promotionStartAt)) &&
        !Number.isNaN(Date.parse(product.promotionEndAt)) &&
        Date.parse(product.promotionStartAt) < Date.parse(product.promotionEndAt);

      return (
        typeof product.id === "string" &&
        typeof product.storeId === "string" &&
        typeof product.sku === "string" &&
        Number.isInteger(product.price) &&
        product.price >= 0 &&
        (hasNoPromotion || hasValidPromotion) &&
        Number.isInteger(product.stockQuantity) &&
        product.stockQuantity >= 0
      );
    });
}

export function isProductPromotionActive(
  product: ShopProduct,
  now = new Date()
): boolean {
  if (
    product.promotionPrice === null ||
    product.promotionPrice >= product.price ||
    product.promotionStartAt === null ||
    product.promotionEndAt === null
  ) {
    return false;
  }

  const timestamp = now.getTime();
  return (
    timestamp >= Date.parse(product.promotionStartAt) &&
    timestamp <= Date.parse(product.promotionEndAt)
  );
}

export function getProductSalePrice(product: ShopProduct, now = new Date()): number {
  return isProductPromotionActive(product, now)
    ? product.promotionPrice!
    : product.price;
}
