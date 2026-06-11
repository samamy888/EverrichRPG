from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TILED_ROOT = ROOT / "public" / "assets" / "maps" / "tiled"
REGIONS_DIR = TILED_ROOT / "regions"
TILESETS_DIR = TILED_ROOT / "tilesets"
TILESET_IMAGES_DIR = TILESETS_DIR / "images"
TILE = 16

FLOORS = [
    ("floor-cream", "duty-free-terminal-v1/floor-cream.png"),
    ("floor-blue", "duty-free-terminal-v1/floor-blue.png"),
    ("floor-gold", "duty-free-terminal-v1/floor-gold.png"),
    ("floor-dark", "duty-free-terminal-v1/floor-dark.png"),
    ("floor-terrazzo", "airport-reference-v2/floor-terrazzo.png"),
    ("floor-ivory", "airport-reference-v2/floor-ivory.png"),
    ("floor-carpet-blue", "airport-reference-v2/floor-carpet-blue.png"),
    ("floor-navy-panel", "airport-reference-v2/floor-navy-panel.png"),
]

PROPS = [
    ("service-counter", "duty-free-terminal-v1/service-counter.png"),
    ("display-shelf", "duty-free-terminal-v1/display-shelf.png"),
    ("planter", "duty-free-terminal-v1/planter.png"),
    ("sign-pillar", "duty-free-terminal-v1/sign-pillar.png"),
    ("shop-doorway", "duty-free-terminal-v1/shop-doorway.png"),
    ("digital-map-kiosk-v2", "airport-reference-v2/digital-map-kiosk-v2.png"),
    (
        "curved-duty-free-storefront-v2",
        "airport-reference-v2/curved-duty-free-storefront-v2.png",
    ),
    ("luxury-storefront-v2", "airport-reference-v2/luxury-storefront-v2.png"),
    ("beauty-display-island-v2", "airport-reference-v2/beauty-display-island-v2.png"),
    ("airport-planter-south", "airport-directional-v1/planter-south.png"),
    ("airport-planter-west", "airport-directional-v1/planter-west.png"),
    ("airport-planter-east", "airport-directional-v1/planter-east.png"),
    ("airport-planter-north", "airport-directional-v1/planter-north.png"),
    (
        "airport-water-dispenser-south",
        "airport-directional-v1/water-dispenser-south.png",
    ),
    (
        "airport-water-dispenser-west",
        "airport-directional-v1/water-dispenser-west.png",
    ),
    (
        "airport-water-dispenser-east",
        "airport-directional-v1/water-dispenser-east.png",
    ),
    (
        "airport-water-dispenser-north",
        "airport-directional-v1/water-dispenser-north.png",
    ),
    (
        "airport-restroom-entrance-south",
        "airport-directional-v1/restroom-entrance-south.png",
    ),
    (
        "airport-restroom-entrance-west",
        "airport-directional-v1/restroom-entrance-west.png",
    ),
    (
        "airport-restroom-entrance-east",
        "airport-directional-v1/restroom-entrance-east.png",
    ),
    (
        "airport-restroom-entrance-north",
        "airport-directional-v1/restroom-entrance-north.png",
    ),
    ("airport-escalator-south", "airport-directional-v1/escalator-south.png"),
    ("airport-escalator-west", "airport-directional-v1/escalator-west.png"),
    ("airport-escalator-east", "airport-directional-v1/escalator-east.png"),
    ("airport-escalator-north", "airport-directional-v1/escalator-north.png"),
    (
        "dutyfree-curved-storefront-south",
        "legacy-directional-v1/dutyfree-curved-storefront-south.png",
    ),
    (
        "dutyfree-curved-storefront-west",
        "legacy-directional-v1/dutyfree-curved-storefront-west.png",
    ),
    (
        "dutyfree-curved-storefront-east",
        "legacy-directional-v1/dutyfree-curved-storefront-east.png",
    ),
    (
        "dutyfree-curved-storefront-north",
        "legacy-directional-v1/dutyfree-curved-storefront-north.png",
    ),
    (
        "dutyfree-luxury-storefront-south",
        "legacy-directional-v1/dutyfree-luxury-storefront-south.png",
    ),
    (
        "dutyfree-luxury-storefront-west",
        "legacy-directional-v1/dutyfree-luxury-storefront-west.png",
    ),
    (
        "dutyfree-luxury-storefront-east",
        "legacy-directional-v1/dutyfree-luxury-storefront-east.png",
    ),
    (
        "dutyfree-luxury-storefront-north",
        "legacy-directional-v1/dutyfree-luxury-storefront-north.png",
    ),
    (
        "dutyfree-display-island-south",
        "legacy-directional-v1/dutyfree-display-island-south.png",
    ),
    (
        "dutyfree-display-island-west",
        "legacy-directional-v1/dutyfree-display-island-west.png",
    ),
    (
        "dutyfree-display-island-east",
        "legacy-directional-v1/dutyfree-display-island-east.png",
    ),
    (
        "dutyfree-display-island-north",
        "legacy-directional-v1/dutyfree-display-island-north.png",
    ),
    (
        "dutyfree-display-shelf-south",
        "legacy-directional-v1/dutyfree-display-shelf-south.png",
    ),
    (
        "dutyfree-display-shelf-west",
        "legacy-directional-v1/dutyfree-display-shelf-west.png",
    ),
    (
        "dutyfree-display-shelf-east",
        "legacy-directional-v1/dutyfree-display-shelf-east.png",
    ),
    (
        "dutyfree-display-shelf-north",
        "legacy-directional-v1/dutyfree-display-shelf-north.png",
    ),
    (
        "dutyfree-service-counter-south",
        "legacy-directional-v1/dutyfree-service-counter-south.png",
    ),
    (
        "dutyfree-service-counter-west",
        "legacy-directional-v1/dutyfree-service-counter-west.png",
    ),
    (
        "dutyfree-service-counter-east",
        "legacy-directional-v1/dutyfree-service-counter-east.png",
    ),
    (
        "dutyfree-service-counter-north",
        "legacy-directional-v1/dutyfree-service-counter-north.png",
    ),
    (
        "dutyfree-shop-doorway-south",
        "legacy-directional-v1/dutyfree-shop-doorway-south.png",
    ),
    (
        "dutyfree-shop-doorway-west",
        "legacy-directional-v1/dutyfree-shop-doorway-west.png",
    ),
    (
        "dutyfree-shop-doorway-east",
        "legacy-directional-v1/dutyfree-shop-doorway-east.png",
    ),
    (
        "dutyfree-shop-doorway-north",
        "legacy-directional-v1/dutyfree-shop-doorway-north.png",
    ),
    (
        "airport-digital-map-kiosk-south",
        "legacy-directional-v1/airport-digital-map-kiosk-south.png",
    ),
    (
        "airport-digital-map-kiosk-west",
        "legacy-directional-v1/airport-digital-map-kiosk-west.png",
    ),
    (
        "airport-digital-map-kiosk-east",
        "legacy-directional-v1/airport-digital-map-kiosk-east.png",
    ),
    (
        "airport-digital-map-kiosk-north",
        "legacy-directional-v1/airport-digital-map-kiosk-north.png",
    ),
    (
        "airport-sign-pillar-south",
        "legacy-directional-v1/airport-sign-pillar-south.png",
    ),
    (
        "airport-sign-pillar-west",
        "legacy-directional-v1/airport-sign-pillar-west.png",
    ),
    (
        "airport-sign-pillar-east",
        "legacy-directional-v1/airport-sign-pillar-east.png",
    ),
    (
        "airport-sign-pillar-north",
        "legacy-directional-v1/airport-sign-pillar-north.png",
    ),
]

NPCS = [
    ("clerk-beauty-01", "duty-free-clerks-v1/clerk-1.png"),
    ("clerk-liquor-food-01", "duty-free-clerks-v1/clerk-2.png"),
    ("clerk-gift-01", "duty-free-clerks-v1/clerk-3.png"),
    ("traveler-male-npc", "player-traveler-male-v1/traveler-male-1.png"),
    ("traveler-female-npc", "player-traveler-female-v1/traveler-female-1.png"),
]

REGION_NAMES = {
    "duty-free-entrance": "免稅商店入口區",
    "duty-free-central": "中央免稅商店街",
    "shop-beauty-01": "美妝香氛免稅店",
    "shop-liquor-food-01": "酒類食品免稅店",
    "shop-gift-01": "台灣禮品免稅店",
}

CLERK_COPY = {
    "shop-beauty-01": ("美妝店員", "想找旅行小物嗎？我有一個三店伴手禮巡禮可以推薦你。"),
    "shop-liquor-food-01": ("食品店員", "鳳梨酥方便攜帶，是很受旅客歡迎的台灣伴手禮。"),
    "shop-gift-01": ("禮品店員", "明信片組很適合替這趟免稅店巡禮留下紀念。"),
}

OBJECT_COPY = {
    "traveler-info-sign": ("旅客資訊", "旅客資訊", ["前方是中央免稅商店街。", "靠近物件時，出現 A 提示即可互動。"]),
    "shopping-guide-sign": ("購物指南", "購物指南", ["三間商店分別提供美妝、食品與台灣禮品。"]),
    "entrance-service-counter": ("入口服務台", "入口服務台", ["歡迎光臨，祝你有一趟愉快的免稅店旅程。"]),
    "liquor-food-doorway": ("酒類食品", "酒類食品免稅店", ["往左側通道可以進入酒類食品免稅店。"]),
    "gift-doorway": ("台灣禮品", "台灣禮品免稅店", ["往右側通道可以進入台灣禮品免稅店。"]),
    "central-digital-map": ("樓層導覽", "中央商店街導覽", ["上方是美妝香氛店，左右兩側分別是食品與禮品店。"]),
    "beauty-feature-store": ("香氛專區", "美妝香氛推薦", ["旅行香水是店員推薦任務的第一件商品。"]),
    "beauty-left-island-top": ("旅行香水", "旅行香水 10ml", ["清新淡香，適合作為旅程的開始。"]),
    "beauty-right-island-top": ("旅行護手霜", "旅行護手霜 30ml", ["輕巧容量，適合放進隨身行李。"]),
    "beauty-left-island-bottom": ("旅行面膜", "旅行面膜組", ["三片入的簡便保養組合。"]),
    "beauty-right-island-bottom": ("香氛禮盒", "香氛雙入禮盒", ["兩款迷你香氛，適合送禮。"]),
    "beauty-directory": ("店內導覽", "美妝店導覽", ["四座展示台都能開啟商品介面。"]),
    "liquor-feature-store": ("食品專區", "酒類食品推薦", ["鳳梨酥是三店巡禮的指定商品。"]),
    "liquor-clerk-counter": ("食品服務櫃台", "食品服務櫃台", ["靠近店員或展示台即可開啟購物介面。"]),
    "liquor-left-island-top": ("精選威士忌", "精選威士忌 500ml", ["免稅限定容量，風味溫潤。"]),
    "liquor-right-island-top": ("巧克力禮盒", "巧克力禮盒", ["適合與親友分享的綜合口味。"]),
    "liquor-left-island-bottom": ("台灣鳳梨酥", "台灣鳳梨酥", ["經典伴手禮，小盒裝方便攜帶。"]),
    "liquor-right-island-bottom": ("迷你品飲組", "迷你品飲組", ["三瓶小容量組合，適合收藏。"]),
    "gift-feature-store": ("台灣禮品", "台灣禮品推薦", ["明信片組是三店巡禮的指定商品。"]),
    "gift-clerk-counter": ("禮品服務櫃台", "禮品服務櫃台", ["靠近店員或展示台即可開啟購物介面。"]),
    "gift-left-island-top": ("台灣鑰匙圈", "台灣造型鑰匙圈", ["簡單醒目的旅行紀念品。"]),
    "gift-right-island-top": ("旅行頸枕", "旅行頸枕", ["柔軟支撐，適合長途旅程。"]),
    "gift-left-island-bottom": ("風景明信片", "台灣風景明信片組", ["收錄機場與城市風景的紀念套組。"]),
    "gift-right-island-bottom": ("旅行收納包", "旅行收納包", ["整理護照、票券與小物的輕便收納包。"]),
}

ORIENTED_PROP_OVERRIDES = {
    "traveler-info-sign": ("airport-sign-pillar-east", (1, 1)),
    "shopping-guide-sign": ("airport-sign-pillar-west", (1, 1)),
    "entrance-service-counter": ("dutyfree-service-counter-north", (6, 2)),
    "entrance-planter": ("airport-planter-west", (1, 1)),
    "liquor-food-doorway": ("dutyfree-curved-storefront-east", (11, 9)),
    "gift-doorway": ("dutyfree-luxury-storefront-west", (11, 9)),
    "left-display-shelf": ("dutyfree-display-island-east", (2, 6)),
    "right-display-shelf": ("dutyfree-display-island-west", (2, 6)),
    "central-digital-map": ("airport-digital-map-kiosk-east", (2, 5)),
    "right-planter": ("airport-planter-west", (1, 1)),
    "beauty-feature-store": ("dutyfree-luxury-storefront-south", (16, 2)),
    "beauty-left-island-top": ("dutyfree-display-island-east", (2, 6)),
    "beauty-right-island-top": ("dutyfree-display-island-west", (2, 6)),
    "beauty-left-island-bottom": ("dutyfree-display-island-east", (2, 6)),
    "beauty-right-island-bottom": ("dutyfree-display-island-west", (2, 6)),
    "beauty-directory": ("airport-digital-map-kiosk-west", (2, 5)),
    "liquor-feature-store": ("dutyfree-curved-storefront-south", (16, 2)),
    "liquor-left-island-top": ("dutyfree-display-island-east", (2, 6)),
    "liquor-right-island-top": ("dutyfree-display-island-west", (2, 6)),
    "liquor-left-island-bottom": ("dutyfree-display-island-east", (2, 6)),
    "liquor-right-island-bottom": ("dutyfree-display-island-west", (2, 6)),
    "liquor-clerk-counter": ("dutyfree-service-counter-west", (2, 5)),
    "gift-feature-store": ("dutyfree-luxury-storefront-south", (16, 2)),
    "gift-left-island-top": ("dutyfree-display-island-east", (2, 6)),
    "gift-right-island-top": ("dutyfree-display-island-west", (2, 6)),
    "gift-left-island-bottom": ("dutyfree-display-island-east", (2, 6)),
    "gift-right-island-bottom": ("dutyfree-display-island-west", (2, 6)),
    "gift-clerk-counter": ("dutyfree-service-counter-west", (2, 5)),
}


def tiled_property(name: str, value: Any, value_type: str = "string") -> dict[str, Any]:
    return {"name": name, "type": value_type, "value": value}


def rect(x: float, y: float, width: float, height: float) -> dict[str, float]:
    return {"x": x * TILE, "y": y * TILE, "width": width * TILE, "height": height * TILE}


def object_defaults() -> dict[str, Any]:
    return {"type": "", "rotation": 0, "visible": True}


def spawn(name: str, x: float, y: float, facing: str) -> dict[str, Any]:
    return {
        "name": name,
        **object_defaults(),
        "point": True,
        "x": x * TILE,
        "y": y * TILE,
        "width": 0,
        "height": 0,
        "properties": [tiled_property("facing", facing)],
    }


def portal(
    name: str,
    bounds: tuple[float, float, float, float],
    destination_region_id: str,
    destination_spawn_id: str,
) -> dict[str, Any]:
    return {
        "name": name,
        **object_defaults(),
        **rect(*bounds),
        "properties": [
            tiled_property("destinationRegionId", destination_region_id),
            tiled_property("destinationSpawnId", destination_spawn_id),
        ],
    }


def wall(bounds: tuple[float, float, float, float], texture: str = "floor-navy-panel") -> dict[str, Any]:
    return {
        "name": f"wall-{bounds[0]}-{bounds[1]}-{bounds[2]}-{bounds[3]}",
        **object_defaults(),
        **rect(*bounds),
        "properties": [tiled_property("texture", texture)],
    }


def prop(
    name: str,
    texture: str,
    x: float,
    baseline_y: float,
    display_width: int,
    collision: tuple[float, float, float, float],
    label: str | None = None,
    interaction: tuple[str, list[str]] | None = None,
    foreground: bool = False,
) -> dict[str, Any]:
    source_path = ROOT / "public" / "assets" / "props" / dict(PROPS)[texture]
    with Image.open(source_path) as image:
        display_height = round(image.height * display_width / image.width)
    properties = [tiled_property("texture", texture)]
    if label:
        properties.append(tiled_property("label", label))
    if interaction:
        properties.extend(
            [
                tiled_property("interactionTitle", interaction[0]),
                tiled_property("interactionLines", json.dumps(interaction[1], ensure_ascii=False)),
            ]
        )
    if foreground:
        properties.append(tiled_property("foreground", True, "bool"))
    return {
        "name": name,
        **object_defaults(),
        "gid": 100 + [item[0] for item in PROPS].index(texture),
        "x": x * TILE - display_width / 2,
        "y": baseline_y * TILE,
        "width": display_width,
        "height": display_height,
        "properties": properties,
        "_collision": collision,
    }


def npc(
    name: str,
    texture: str,
    x: float,
    baseline_y: float,
    collision: tuple[float, float, float, float],
    label: str,
    interaction: tuple[str, list[str]],
) -> dict[str, Any]:
    source_path = ROOT / "public" / "assets" / "sprites" / dict(NPCS)[texture]
    with Image.open(source_path) as image:
        source_width, source_height = image.size
    display_width = 36
    display_height = round(source_height * display_width / source_width)
    is_traveler = texture in {"traveler-male-npc", "traveler-female-npc"}
    animation_key = (
        "traveler-male" if texture == "traveler-male-npc" else "traveler-female"
    ) if is_traveler else texture
    return {
        "name": name,
        **object_defaults(),
        "gid": 200 + [item[0] for item in NPCS].index(texture),
        "x": x * TILE - display_width / 2,
        "y": baseline_y * TILE,
        "width": display_width,
        "height": display_height,
        "properties": [
            tiled_property("texture", texture),
            tiled_property("label", label),
            tiled_property("interactionTitle", interaction[0]),
            tiled_property("interactionLines", json.dumps(interaction[1], ensure_ascii=False)),
            tiled_property("foreground", True, "bool"),
            tiled_property("movementType", "wander" if is_traveler else "idle"),
            tiled_property("facing", "down"),
            tiled_property("speed", 52 if is_traveler else 0, "float"),
            tiled_property("animationKey", animation_key),
        ],
        "_collision": collision,
    }


REGIONS: list[dict[str, Any]] = [
    {
        "id": "duty-free-entrance",
        "name": "綜合免稅店入口",
        "size": (40, 26),
        "floor": "floor-terrazzo",
        "accent": "floor-ivory",
        "spawns": [spawn("start", 20, 22, "up"), spawn("from-central", 20, 5, "down")],
        "portals": [portal("to-central", (18, 1, 4, 2), "duty-free-central", "from-entrance")],
        "walls": [
            wall((0, 0, 18, 3)),
            wall((22, 0, 18, 3)),
            wall((0, 23, 40, 3)),
            wall((0, 0, 2, 26)),
            wall((38, 0, 2, 26)),
        ],
        "props": [
            prop(
                "traveler-info-sign",
                "sign-pillar",
                8,
                14,
                28,
                (7, 12, 2, 2),
                "旅客服務",
                ("旅客服務", ["歡迎來到綜合免稅店。", "往上可前往中央商店街。"]),
            ),
            prop(
                "shopping-guide-sign",
                "sign-pillar",
                32,
                14,
                28,
                (31, 12, 2, 2),
                "購物指南",
                ("購物指南", ["店舖與商品資訊將在後續階段加入。"]),
            ),
            prop(
                "entrance-service-counter",
                "service-counter",
                20,
                20,
                160,
                (15, 18, 10, 2),
                "入口服務台",
                ("入口服務台", ["需要協助時，可以向服務人員詢問。"]),
                True,
            ),
            prop("entrance-planter", "planter", 35, 19, 42, (34, 17, 2, 2)),
        ],
    },
    {
        "id": "duty-free-central",
        "name": "中央免稅商店街",
        "size": (48, 30),
        "floor": "floor-terrazzo",
        "accent": "floor-ivory",
        "spawns": [
            spawn("from-entrance", 24, 25, "up"),
            spawn("from-beauty", 24, 3, "down"),
            spawn("from-liquor-food", 16, 15, "right"),
            spawn("from-gift", 32, 15, "left"),
        ],
        "portals": [
            portal("to-entrance", (21, 27, 6, 2), "duty-free-entrance", "from-central"),
            portal("to-beauty-corridor", (21, 0, 6, 2), "shop-beauty-01", "from-central"),
            portal(
                "to-liquor-food",
                (6, 12, 8, 2),
                "shop-liquor-food-01",
                "from-central",
            ),
            portal("to-gift", (34, 12, 8, 2), "shop-gift-01", "from-central"),
        ],
        "walls": [
            wall((0, 0, 21, 2)),
            wall((27, 0, 21, 2)),
            wall((0, 0, 2, 30)),
            wall((46, 0, 2, 30)),
            wall((0, 29, 21, 1)),
            wall((27, 29, 21, 1)),
        ],
        "props": [
            prop(
                "liquor-food-doorway",
                "curved-duty-free-storefront-v2",
                10,
                12,
                256,
                (2, 10, 16, 2),
                "菸酒食品",
                ("菸酒食品", ["目前先展示店面，商品系統稍後加入。"]),
                True,
            ),
            prop(
                "gift-doorway",
                "luxury-storefront-v2",
                38,
                12,
                256,
                (30, 10, 16, 2),
                "精品禮品",
                ("精品禮品", ["目前先展示店面，商品系統稍後加入。"]),
                True,
            ),
            prop("left-display-shelf", "beauty-display-island-v2", 11, 21, 144, (6.5, 19.5, 9, 1.5)),
            prop("right-display-shelf", "beauty-display-island-v2", 37, 21, 144, (32.5, 19.5, 9, 1.5)),
            prop(
                "central-digital-map",
                "digital-map-kiosk-v2",
                6,
                26,
                128,
                (2, 24, 8, 2),
                "區域導覽",
                ("區域導覽", ["上方通往美妝店，下方返回入口。"]),
            ),
            prop("right-planter", "planter", 44, 26, 42, (43, 24, 2, 2)),
        ],
    },
    {
        "id": "shop-beauty-01",
        "name": "美妝免稅店",
        "size": (32, 26),
        "floor": "floor-carpet-blue",
        "accent": None,
        "spawns": [spawn("from-central", 16, 22, "up")],
        "portals": [portal("to-central", (13, 24, 6, 2), "duty-free-central", "from-beauty")],
        "walls": [
            wall((0, 0, 32, 2)),
            wall((0, 0, 2, 26)),
            wall((30, 0, 2, 26)),
            wall((0, 24, 13, 2)),
            wall((19, 24, 13, 2)),
        ],
        "props": [
            prop(
                "beauty-feature-store",
                "luxury-storefront-v2",
                16,
                8,
                256,
                (8, 6, 16, 2),
                "美妝專區",
                ("美妝專區", ["這裡未來會加入品牌櫃位與試用品互動。"]),
                True,
            ),
            prop(
                "beauty-left-island-top",
                "beauty-display-island-v2",
                7,
                13,
                128,
                (3, 11.5, 8, 1.5),
                interaction=("香氛展示", ["陳列熱門香氛與旅行限定組。"]),
            ),
            prop(
                "beauty-right-island-top",
                "beauty-display-island-v2",
                25,
                13,
                128,
                (21, 11.5, 8, 1.5),
                interaction=("保養展示", ["陳列保養品與機場限定組合。"]),
            ),
            prop("beauty-left-island-bottom", "beauty-display-island-v2", 7, 19, 128, (3, 17.5, 8, 1.5)),
            prop("beauty-right-island-bottom", "beauty-display-island-v2", 25, 19, 128, (21, 17.5, 8, 1.5)),
            prop(
                "beauty-directory",
                "digital-map-kiosk-v2",
                28,
                23,
                96,
                (25, 21, 6, 2),
                "美妝導覽",
                ("美妝導覽", ["下方出口可返回中央免稅商店街。"]),
            ),
        ],
    },
    {
        "id": "shop-liquor-food-01",
        "name": "菸酒食品免稅店",
        "size": (32, 26),
        "floor": "floor-cream",
        "accent": "floor-gold",
        "spawns": [spawn("from-central", 16, 22, "up")],
        "portals": [
            portal("to-central", (13, 24, 6, 2), "duty-free-central", "from-liquor-food")
        ],
        "walls": [
            wall((0, 0, 32, 2)),
            wall((0, 0, 2, 26)),
            wall((30, 0, 2, 26)),
            wall((0, 24, 13, 2)),
            wall((19, 24, 13, 2)),
        ],
        "props": [
            prop(
                "liquor-feature-store",
                "curved-duty-free-storefront-v2",
                16,
                8,
                256,
                (8, 6, 16, 2),
                "菸酒食品專區",
                ("菸酒食品專區", ["精選酒款、點心與旅行限定禮盒。"]),
                True,
            ),
            prop(
                "liquor-left-island-top",
                "beauty-display-island-v2",
                7,
                13,
                128,
                (3, 11.5, 8, 1.5),
                interaction=("精選酒款", ["旅行限定容量酒款。"]),
            ),
            prop(
                "liquor-right-island-top",
                "beauty-display-island-v2",
                25,
                13,
                128,
                (21, 11.5, 8, 1.5),
                interaction=("巧克力禮盒", ["適合分享與送禮。"]),
            ),
            prop(
                "liquor-left-island-bottom",
                "beauty-display-island-v2",
                7,
                19,
                128,
                (3, 17.5, 8, 1.5),
            ),
            prop(
                "liquor-right-island-bottom",
                "beauty-display-island-v2",
                25,
                19,
                128,
                (21, 17.5, 8, 1.5),
            ),
            prop(
                "liquor-clerk-counter",
                "service-counter",
                27,
                23,
                80,
                (24.5, 21.5, 5, 1.5),
                "店員推薦",
                ("店員推薦", ["巧克力禮盒與迷你酒款組很適合送禮。"]),
            ),
        ],
    },
    {
        "id": "shop-gift-01",
        "name": "精品禮品免稅店",
        "size": (32, 26),
        "floor": "floor-blue",
        "accent": "floor-gold",
        "spawns": [spawn("from-central", 16, 22, "up")],
        "portals": [
            portal("to-central", (13, 24, 6, 2), "duty-free-central", "from-gift")
        ],
        "walls": [
            wall((0, 0, 32, 2)),
            wall((0, 0, 2, 26)),
            wall((30, 0, 2, 26)),
            wall((0, 24, 13, 2)),
            wall((19, 24, 13, 2)),
        ],
        "props": [
            prop(
                "gift-feature-store",
                "luxury-storefront-v2",
                16,
                8,
                256,
                (8, 6, 16, 2),
                "精品禮品專區",
                ("精品禮品專區", ["旅行用品與台灣紀念禮品。"]),
                True,
            ),
            prop(
                "gift-left-island-top",
                "beauty-display-island-v2",
                7,
                13,
                128,
                (3, 11.5, 8, 1.5),
                interaction=("台灣紀念品", ["輕巧好攜帶的旅行紀念品。"]),
            ),
            prop(
                "gift-right-island-top",
                "beauty-display-island-v2",
                25,
                13,
                128,
                (21, 11.5, 8, 1.5),
                interaction=("旅行用品", ["讓候機與飛行更舒服。"]),
            ),
            prop(
                "gift-left-island-bottom",
                "beauty-display-island-v2",
                7,
                19,
                128,
                (3, 17.5, 8, 1.5),
            ),
            prop(
                "gift-right-island-bottom",
                "beauty-display-island-v2",
                25,
                19,
                128,
                (21, 17.5, 8, 1.5),
            ),
            prop(
                "gift-clerk-counter",
                "service-counter",
                27,
                23,
                80,
                (24.5, 21.5, 5, 1.5),
                "店員推薦",
                ("店員推薦", ["頸枕適合長途旅行，明信片是輕巧的小禮物。"]),
            ),
        ],
    },
]


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def apply_clean_copy(region: dict[str, Any]) -> None:
    region["name"] = REGION_NAMES[region["id"]]
    for item in region["props"]:
        copy = OBJECT_COPY.get(item["name"])
        if not copy:
            continue
        label, title, lines = copy
        item["properties"] = [
            prop
            for prop in item["properties"]
            if prop["name"] not in {"label", "interactionTitle", "interactionLines"}
        ]
        item["properties"].extend(
            [
                tiled_property("label", label),
                tiled_property("interactionTitle", title),
                tiled_property("interactionLines", json.dumps(lines, ensure_ascii=False)),
            ]
        )


def build_tilesets() -> None:
    floor_tiles = []
    for tile_id, (texture, relative_source) in enumerate(FLOORS):
        source = ROOT / "public" / "assets" / "tilesets" / relative_source
        target = TILESET_IMAGES_DIR / f"{texture}.png"
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as image:
            image.convert("RGBA").resize((TILE, TILE), Image.Resampling.LANCZOS).save(target)
        floor_tiles.append(
            {
                "id": tile_id,
                "image": f"images/{texture}.png",
                "imagewidth": TILE,
                "imageheight": TILE,
                "properties": [tiled_property("texture", texture)],
            }
        )

    write_json(
        TILESETS_DIR / "airport-floors.tsj",
        {
            "type": "tileset",
            "version": "1.10",
            "tiledversion": "1.11.2",
            "name": "airport-floors",
            "tilewidth": TILE,
            "tileheight": TILE,
            "tilecount": len(floor_tiles),
            "columns": 0,
            "grid": {"orientation": "orthogonal", "width": TILE, "height": TILE},
            "tiles": floor_tiles,
        },
    )

    prop_tiles = []
    for tile_id, (texture, relative_source) in enumerate(PROPS):
        source = ROOT / "public" / "assets" / "props" / relative_source
        with Image.open(source) as image:
            width, height = image.size
        prop_tiles.append(
            {
                "id": tile_id,
                "image": f"../../../props/{relative_source}",
                "imagewidth": width,
                "imageheight": height,
                "properties": [tiled_property("texture", texture)],
            }
        )

    write_json(
        TILESETS_DIR / "airport-props.tsj",
        {
            "type": "tileset",
            "version": "1.10",
            "tiledversion": "1.11.2",
            "name": "airport-props",
            "tilecount": len(prop_tiles),
            "columns": 0,
            "grid": {"orientation": "orthogonal", "width": TILE, "height": TILE},
            "tiles": prop_tiles,
        },
    )

    npc_tiles = []
    for tile_id, (texture, filename) in enumerate(NPCS):
        source = ROOT / "public" / "assets" / "sprites" / filename
        with Image.open(source) as image:
            width, height = image.size
        npc_tiles.append(
            {
                "id": tile_id,
                "image": f"../../../sprites/{filename}",
                "imagewidth": width,
                "imageheight": height,
                "properties": [tiled_property("texture", texture)],
            }
        )

    write_json(
        TILESETS_DIR / "airport-npcs.tsj",
        {
            "type": "tileset",
            "version": "1.10",
            "tiledversion": "1.11.2",
            "name": "airport-npcs",
            "tilecount": len(npc_tiles),
            "columns": 0,
            "grid": {"orientation": "orthogonal", "width": TILE, "height": TILE},
            "tiles": npc_tiles,
        },
    )


def build_region(region: dict[str, Any]) -> None:
    apply_clean_copy(region)
    apply_oriented_prop_overrides(region)
    width, height = region["size"]
    floor_gid = 1 + [item[0] for item in FLOORS].index(region["floor"])
    ground = [floor_gid] * (width * height)
    accent = [0] * (width * height)
    if region["accent"]:
        accent_gid = 1 + [item[0] for item in FLOORS].index(region["accent"])
        for y in range(height):
            for x in range(width // 2 - 3, width // 2 + 3):
                accent[y * width + x] = accent_gid

    props = region["props"]
    npc_config = {
        "shop-beauty-01": (
            "clerk-beauty-01",
            "clerk-beauty-01",
            "美妝店員",
            "今天的旅行香水與面膜組很適合放進隨身行李。",
        ),
        "shop-liquor-food-01": (
            "clerk-liquor-food-01",
            "clerk-liquor-food-01",
            "菸酒食品店員",
            "巧克力禮盒與迷你酒款組很適合送禮。",
        ),
        "shop-gift-01": (
            "clerk-gift-01",
            "clerk-gift-01",
            "精品禮品店員",
            "頸枕適合長途旅行，明信片是輕巧的小禮物。",
        ),
    }
    config = npc_config.get(region["id"])
    clerk_copy = CLERK_COPY.get(region["id"])
    npcs = (
        [
            npc(
                config[0],
                config[1],
                5,
                23,
                (4.25, 21.5, 1.5, 1.5),
                clerk_copy[0],
                (clerk_copy[0], [clerk_copy[1]]),
            )
        ]
        if config and clerk_copy
        else []
    )
    if region["id"] == "duty-free-entrance":
        npcs.append(
            npc(
                "waiting-traveler-01",
                "traveler-female-npc",
                11,
                18,
                (10.4, 16.8, 1.2, 1.2),
                "候機旅客",
                ("候機旅客", ["我正準備進去逛逛，聽說三間店各有不同的旅行好物。"]),
            )
        )
    if region["id"] == "duty-free-central":
        npcs.extend(
            [
                npc(
                    "browsing-traveler-01",
                    "traveler-male-npc",
                    20,
                    18,
                    (19.4, 16.8, 1.2, 1.2),
                    "逛街旅客",
                    ("逛街旅客", ["我先去左邊找鳳梨酥，你也可以看看。"]),
                ),
                npc(
                    "browsing-traveler-02",
                    "traveler-female-npc",
                    28,
                    18,
                    (27.4, 16.8, 1.2, 1.2),
                    "逛街旅客",
                    ("逛街旅客", ["右邊的台灣禮品店有很適合收藏的明信片。"]),
                ),
            ]
        )
    collisions = []
    for item in [*props, *npcs]:
        collision = item.pop("_collision")
        collisions.append(
            {
                "name": f"{item['name']}-collision",
                **object_defaults(),
                **rect(*collision),
                "properties": [tiled_property("ownerId", item["name"])],
            }
        )

    visible_layer = {"opacity": 1, "visible": True, "locked": False}
    layers = [
        {
            "name": "Ground",
            "type": "tilelayer",
            "width": width,
            "height": height,
            **visible_layer,
            "data": ground,
        },
        {
            "name": "Accent",
            "type": "tilelayer",
            "width": width,
            "height": height,
            "opacity": 0.55,
            "visible": True,
            "locked": False,
            "data": accent,
        },
        {
            "name": "Walls",
            "type": "objectgroup",
            **visible_layer,
            "objects": region["walls"],
        },
        {
            "name": "Props",
            "type": "objectgroup",
            "draworder": "topdown",
            **visible_layer,
            "objects": props,
        },
        {
            "name": "NPCs",
            "type": "objectgroup",
            "draworder": "topdown",
            **visible_layer,
            "objects": npcs,
        },
        {
            "name": "Collision",
            "type": "objectgroup",
            "opacity": 1,
            "visible": False,
            "locked": False,
            "objects": collisions,
        },
        {
            "name": "Portals",
            "type": "objectgroup",
            **visible_layer,
            "objects": region["portals"],
        },
        {
            "name": "Spawns",
            "type": "objectgroup",
            **visible_layer,
            "objects": region["spawns"],
        },
    ]

    next_id = 1
    for layer_id, layer in enumerate(layers, 1):
        layer["id"] = layer_id
        for item in layer.get("objects", []):
            item["id"] = next_id
            next_id += 1

    write_json(
        REGIONS_DIR / f"{region['id']}.tmj",
        {
            "type": "map",
            "version": "1.10",
            "tiledversion": "1.11.2",
            "orientation": "orthogonal",
            "renderorder": "right-down",
            "width": width,
            "height": height,
            "tilewidth": TILE,
            "tileheight": TILE,
            "infinite": False,
            "nextlayerid": len(layers) + 1,
            "nextobjectid": next_id,
            "properties": [
                tiled_property("regionId", region["id"]),
                tiled_property("name", region["name"]),
            ],
            "tilesets": [
                {"firstgid": 1, "source": "../tilesets/airport-floors.tsj"},
                {"firstgid": 100, "source": "../tilesets/airport-props.tsj"},
                {"firstgid": 200, "source": "../tilesets/airport-npcs.tsj"},
            ],
            "layers": layers,
        },
    )


def apply_oriented_prop_overrides(region: dict[str, Any]) -> None:
    for object_data in region["props"]:
        override = ORIENTED_PROP_OVERRIDES.get(object_data["name"])
        if not override:
            continue
        texture, collision_size = override
        center_x = object_data["x"] + object_data["width"] / 2
        source_path = ROOT / "public" / "assets" / "props" / dict(PROPS)[texture]
        with Image.open(source_path) as image:
            width, height = image.size
        object_data["gid"] = 100 + [item[0] for item in PROPS].index(texture)
        object_data["x"] = center_x - width / 2
        object_data["width"] = width
        object_data["height"] = height
        for property_data in object_data["properties"]:
            if property_data["name"] == "texture":
                property_data["value"] = texture
                break
        collision_width, collision_height = collision_size
        object_data["_collision"] = (
            center_x / TILE - collision_width / 2,
            object_data["y"] / TILE - collision_height,
            collision_width,
            collision_height,
        )
    if region["id"] == "duty-free-central":
        object_by_name = {object_data["name"]: object_data for object_data in region["props"]}
        object_by_name["liquor-food-doorway"]["y"] = 25 * TILE
        object_by_name["gift-doorway"]["y"] = 25 * TILE
        object_by_name["liquor-food-doorway"]["_collision"] = (7, 6, 4, 18)
        object_by_name["gift-doorway"]["_collision"] = (37, 6, 4, 18)
        portal_by_name = {portal_data["name"]: portal_data for portal_data in region["portals"]}
        portal_by_name["to-liquor-food"].update(rect(12, 13, 3, 5))
        portal_by_name["to-gift"].update(rect(33, 13, 3, 5))


def main() -> None:
    build_tilesets()
    for region in REGIONS:
        build_region(region)
    write_json(
        TILED_ROOT / "EverrichRPG.tiled-project",
        {
            "type": "project",
            "folders": ["."],
            "propertyTypes": [],
        },
    )
    print(f"[tiled:bootstrap] Created {len(REGIONS)} maps in {TILED_ROOT}")


if __name__ == "__main__":
    main()
