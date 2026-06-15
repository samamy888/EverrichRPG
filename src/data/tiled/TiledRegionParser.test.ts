import { describe, expect, it } from "vitest";
import { TiledRegionParser } from "./TiledRegionParser";
import type {
  TiledMap,
  TiledObject,
  TiledProperty,
  TiledTilesetCollection,
} from "./TiledTypes";

const parser = new TiledRegionParser();
const source = "../tilesets/airport-floors.tsj";

function property(
  name: string,
  value: TiledProperty["value"],
): TiledProperty {
  return { name, value };
}

function object(
  name: string,
  properties: TiledProperty[],
  overrides: Partial<TiledObject> = {},
): TiledObject {
  return {
    id: 1,
    name,
    x: 16,
    y: 32,
    width: 32,
    height: 16,
    properties,
    ...overrides,
  };
}

function mapWith(layers: TiledMap["layers"]): TiledMap {
  return {
    width: 10,
    height: 8,
    tilewidth: 16,
    tileheight: 16,
    layers,
    tilesets: [{ firstgid: 1, source }],
    properties: [property("name", "測試區域")],
  };
}

function tilesets(): TiledTilesetCollection {
  return new Map([
    [
      source,
      {
        tiles: [
          {
            id: 0,
            properties: [property("texture", "floor-blue")],
          },
        ],
      },
    ],
  ]);
}

describe("TiledRegionParser", () => {
  it("converts map dimensions and flipped tile gids", () => {
    const region = parser.parse(
      "departure-hall",
      mapWith([
        {
          name: "Ground",
          type: "tilelayer",
          width: 2,
          height: 1,
          opacity: 0.75,
          data: [0x80000001, 0],
        },
      ]),
      tilesets(),
    );

    expect(region.name).toBe("測試區域");
    expect(region.width).toBe(160);
    expect(region.height).toBe(128);
    expect(region.floorTexture).toBe("floor-blue");
    expect(region.tileLayers?.[0]).toEqual({
      name: "Ground",
      width: 2,
      height: 1,
      opacity: 0.75,
      tiles: ["floor-blue", null],
    });
  });

  it("converts collisions, interactions, npc behavior, and effects", () => {
    const prop = object("guide", [
      property("texture", "traveler-a"),
      property("label", "旅客服務員"),
      property("interactionTitle", "您好"),
      property("interactionLines", '["歡迎光臨"]'),
      property(
        "interactionChoices",
        '[{"label":"詢問","responseLines":["請往前走"]}]',
      ),
      property("movementType", "patrol"),
      property("facing", "left"),
      property("speed", 40),
      property("animationKey", "guide-walk"),
      property("visualEffect", "kioskPulse"),
      property("effectColor", "#123456"),
      property("effectDurationMs", 300),
    ]);
    const collision = object(
      "guide-collision",
      [property("ownerId", "guide")],
      { x: 20, y: 36, width: 24, height: 12 },
    );

    const region = parser.parse(
      "departure-hall",
      mapWith([
        { name: "NPCs", type: "objectgroup", objects: [prop] },
        { name: "Collision", type: "objectgroup", objects: [collision] },
      ]),
      tilesets(),
    );

    expect(region.objects[0]).toMatchObject({
      id: "guide",
      x: 32,
      baselineY: 32,
      collision: { x: 20, y: 36, width: 24, height: 12 },
      interaction: {
        title: "您好",
        lines: ["歡迎光臨"],
        choices: [{ label: "詢問", responseLines: ["請往前走"] }],
      },
      npcBehavior: {
        movementType: "patrol",
        facing: "left",
        speed: 40,
        animationKey: "guide-walk",
      },
      visualEffect: {
        style: "kioskPulse",
        color: 0x123456,
        durationMs: 500,
      },
    });
  });

  it("rejects non-decorative objects without collision data", () => {
    const map = mapWith([
      {
        name: "Props",
        type: "objectgroup",
        objects: [object("counter", [property("texture", "service-counter")])],
      },
    ]);

    expect(() => parser.parse("departure-hall", map, tilesets())).toThrow(
      'Tiled object "counter" is missing collision data.',
    );
  });
});
