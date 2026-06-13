import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const regionRoot = resolve(process.cwd(), "public/assets/maps/tiled/regions");

const questLinesByRegion = {
  "shop-beauty-01": {
    available: [
      "想找旅行小物嗎？我準備了一條三店伴手禮巡禮。",
      "如果有興趣，可以從商店介面接受推薦。"
    ],
    active: [
      "目前要找旅行香水、台灣鳳梨酥和風景明信片。",
      "都買齊後再回來找我。"
    ],
    ready: [
      "三樣推薦商品都收進旅行袋了！",
      "打開商店介面向我回報，就能領取巡禮獎勵。"
    ],
    completed: [
      "恭喜完成三店伴手禮巡禮！",
      "機場購物達人徽章很適合你。"
    ]
  },
  "shop-liquor-food-01": {
    available: ["鳳梨酥方便攜帶，是很受旅客歡迎的台灣伴手禮。"],
    active: [
      "你正在進行三店伴手禮巡禮吧？",
      "記得挑一盒台灣鳳梨酥。"
    ],
    ready: ["看來鳳梨酥已經準備好了，祝你順利完成巡禮。"],
    completed: ["完成巡禮後，也別忘了把鳳梨酥分享給同行旅伴。"]
  },
  "shop-gift-01": {
    available: ["明信片組很適合替這趟免稅店巡禮留下紀念。"],
    active: [
      "巡禮需要一組台灣風景明信片。",
      "它就在店內的禮品展示櫃。"
    ],
    ready: ["明信片也收好了，現在可以回美妝店員那裡回報。"],
    completed: ["下次旅行時，也可以用明信片記錄新的機場回憶。"]
  }
};

for (const [regionId, questLines] of Object.entries(questLinesByRegion)) {
  const mapPath = resolve(regionRoot, `${regionId}.tmj`);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const npcLayer = map.layers.find((layer) => layer.name === "NPCs");
  const clerk = npcLayer?.objects?.find((object) => object.name.startsWith("clerk-"));
  if (!clerk) throw new Error(`${regionId} is missing its clerk NPC.`);

  clerk.properties = clerk.properties.filter(
    (property) => property.name !== "interactionQuestLines"
  );
  clerk.properties.push({
    name: "interactionQuestLines",
    type: "string",
    value: JSON.stringify(questLines)
  });
  writeFileSync(mapPath, `${JSON.stringify(map, null, 1)}\n`);
}

console.log("[quest-dialogue] updated 3 shop clerks");
