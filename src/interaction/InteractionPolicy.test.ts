import { describe, expect, it } from "vitest";
import type { MapObjectData } from "../data/prototypeRegions";
import {
  getInteractionLabel,
  getShopIdForRegion,
  getShopProductId
} from "./InteractionPolicy";

const createObject = (texture: MapObjectData["texture"]): MapObjectData => ({
  id: "object",
  texture,
  x: 0,
  baselineY: 0,
  displayWidth: 16,
  collision: { x: 0, y: 0, width: 16, height: 16 }
});

describe("InteractionPolicy", () => {
  it("resolves shop regions and shelf products", () => {
    expect(getShopIdForRegion("shop-gift-01")).toBe("shop-gift-01");
    expect(getShopIdForRegion("departure-hall")).toBeUndefined();
    expect(getShopProductId("gift-left-island-top")).toBe(
      "souvenir-taiwan-keychain"
    );
  });

  it("provides interaction labels by context", () => {
    expect(
      getInteractionLabel(createObject("checkout-counter-base"), "shop-beauty-01")
    ).toBe("結帳");
    expect(
      getInteractionLabel(createObject("service-counter"), "departure-hall")
    ).toBe("詢問");
    expect(
      getInteractionLabel(createObject("shop-doorway"), "departure-hall")
    ).toBe("進入");
  });
});
