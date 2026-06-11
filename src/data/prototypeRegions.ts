export type Facing = "up" | "down" | "left" | "right";

export type RegionId =
  | "duty-free-entrance"
  | "duty-free-central"
  | "shop-beauty-01"
  | "shop-liquor-food-01"
  | "shop-gift-01";

export interface RectData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpawnData {
  id: string;
  x: number;
  y: number;
  facing: Facing;
}

export interface PortalData {
  id: string;
  bounds: RectData;
  destinationRegionId: RegionId;
  destinationSpawnId: string;
}

export interface BoundaryData extends RectData {
  texture: "floor-dark" | "floor-navy-panel";
}

export type FloorTexture =
  | "floor-cream"
  | "floor-blue"
  | "floor-gold"
  | "floor-dark"
  | "floor-terrazzo"
  | "floor-ivory"
  | "floor-carpet-blue"
  | "floor-navy-panel";

export type MapObjectTexture =
  | "service-counter"
  | "display-shelf"
  | "planter"
  | "sign-pillar"
  | "shop-doorway"
  | "digital-map-kiosk-v2"
  | "curved-duty-free-storefront-v2"
  | "luxury-storefront-v2"
  | "beauty-display-island-v2"
  | "checkout-counter-base"
  | "checkout-equipment-pos"
  | "checkout-items-beauty"
  | "checkout-items-liquor-food"
  | "checkout-items-gift"
  | "beauty-display-base"
  | "beauty-products-perfume"
  | "beauty-products-skincare"
  | "beauty-products-cosmetics"
  | "beauty-products-gift-set"
  | "liquor-products-whisky"
  | "liquor-products-chocolate"
  | "food-products-pineapple-cake"
  | "liquor-products-mini-tasting"
  | "gift-products-keychains"
  | "gift-products-neck-pillows"
  | "gift-products-postcards"
  | "gift-products-organizers"
  | "airport-planter-south"
  | "airport-planter-west"
  | "airport-planter-east"
  | "airport-planter-north"
  | "airport-water-dispenser-south"
  | "airport-water-dispenser-west"
  | "airport-water-dispenser-east"
  | "airport-water-dispenser-north"
  | "airport-restroom-entrance-south"
  | "airport-restroom-entrance-west"
  | "airport-restroom-entrance-east"
  | "airport-restroom-entrance-north"
  | "airport-escalator-south"
  | "airport-escalator-west"
  | "airport-escalator-east"
  | "airport-escalator-north"
  | "dutyfree-curved-storefront-south"
  | "dutyfree-curved-storefront-west"
  | "dutyfree-curved-storefront-east"
  | "dutyfree-curved-storefront-north"
  | "dutyfree-luxury-storefront-south"
  | "dutyfree-luxury-storefront-west"
  | "dutyfree-luxury-storefront-east"
  | "dutyfree-luxury-storefront-north"
  | "dutyfree-display-island-south"
  | "dutyfree-display-island-west"
  | "dutyfree-display-island-east"
  | "dutyfree-display-island-north"
  | "dutyfree-display-shelf-south"
  | "dutyfree-display-shelf-west"
  | "dutyfree-display-shelf-east"
  | "dutyfree-display-shelf-north"
  | "dutyfree-service-counter-south"
  | "dutyfree-service-counter-west"
  | "dutyfree-service-counter-east"
  | "dutyfree-service-counter-north"
  | "dutyfree-shop-doorway-south"
  | "dutyfree-shop-doorway-west"
  | "dutyfree-shop-doorway-east"
  | "dutyfree-shop-doorway-north"
  | "airport-digital-map-kiosk-south"
  | "airport-digital-map-kiosk-west"
  | "airport-digital-map-kiosk-east"
  | "airport-digital-map-kiosk-north"
  | "airport-sign-pillar-south"
  | "airport-sign-pillar-west"
  | "airport-sign-pillar-east"
  | "airport-sign-pillar-north"
  | "clerk-beauty-01"
  | "clerk-liquor-food-01"
  | "clerk-gift-01"
  | "traveler-male-npc"
  | "traveler-female-npc";

export interface TileLayerData {
  name: string;
  width: number;
  height: number;
  tiles: Array<FloorTexture | null>;
  opacity: number;
}

export type NpcMovementType = "idle" | "wander" | "patrol";

export interface NpcBehaviorData {
  movementType: NpcMovementType;
  facing: Facing;
  speed: number;
  animationKey: string;
}

export interface MapObjectData {
  id: string;
  texture: MapObjectTexture;
  x: number;
  baselineY: number;
  displayWidth: number;
  collision: RectData;
  label?: string;
  interaction?: {
    title: string;
    lines: string[];
  };
  foreground?: boolean;
  decorative?: boolean;
  depthOffset?: number;
  npcBehavior?: NpcBehaviorData;
}

export interface RegionData {
  id: RegionId;
  name: string;
  width: number;
  height: number;
  floorTexture: "floor-cream" | "floor-blue" | "floor-terrazzo" | "floor-carpet-blue";
  accentFloorTexture?: "floor-gold" | "floor-ivory";
  spawns: SpawnData[];
  portals: PortalData[];
  boundaries: BoundaryData[];
  objects: MapObjectData[];
  tileLayers?: TileLayerData[];
}
