import type { MapObjectData, RegionId } from "../data/prototypeRegions";
import type { ShopId } from "../data/shopCatalog";

const SHOP_PRODUCT_BY_OBJECT_ID: Readonly<Record<string, string>> = {
  "beauty-left-island-top": "perfume-travel-10ml",
  "beauty-right-island-top": "beauty-hand-cream-30ml",
  "beauty-left-island-bottom": "beauty-mask-travel-set",
  "beauty-right-island-bottom": "perfume-gift-duo",
  "liquor-left-island-top": "liquor-whisky-500ml",
  "liquor-right-island-top": "food-chocolate-gift-box",
  "liquor-left-island-bottom": "food-pineapple-cake-box",
  "liquor-right-island-bottom": "liquor-mini-tasting-set",
  "gift-left-island-top": "souvenir-taiwan-keychain",
  "gift-right-island-top": "travel-neck-pillow",
  "gift-left-island-bottom": "souvenir-postcard-set",
  "gift-right-island-bottom": "travel-organizer-pouch"
};

const SHOP_REGION_IDS: readonly ShopId[] = [
  "shop-beauty-01",
  "shop-liquor-food-01",
  "shop-gift-01"
];

export function getShopIdForRegion(regionId: RegionId): ShopId | undefined {
  return SHOP_REGION_IDS.find((shopId) => shopId === regionId);
}

export function getShopProductId(objectId: string): string | undefined {
  return SHOP_PRODUCT_BY_OBJECT_ID[objectId];
}

export function getInteractionLabel(
  object: MapObjectData,
  regionId: RegionId
): string {
  if (object.texture === "checkout-counter-base") return "結帳";
  if (getShopIdForRegion(regionId)) return "選購";
  if (
    object.texture === "shop-doorway" ||
    object.texture === "curved-duty-free-storefront-v2" ||
    object.texture === "luxury-storefront-v2"
  ) {
    return "進入";
  }
  if (object.texture === "service-counter") return "詢問";
  return "互動";
}
