import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const tiledRoot = resolve("public/assets/maps/tiled");
const shopSpecs = [
  {
    id: "shop-beauty-01",
    texture: "clerk-beauty-01",
    title: "美妝免稅店員",
    receptionLine: "歡迎光臨，需要找香氛、保養或彩妝商品都可以詢問我。",
    cashierLine: "選好商品後請到櫃台，我會為你確認優惠與庫存。"
  },
  {
    id: "shop-liquor-food-01",
    texture: "clerk-liquor-food-01",
    title: "酒食免稅店員",
    receptionLine: "歡迎光臨，酒類與伴手禮分別陳列在兩側櫃位。",
    cashierLine: "結帳前我會協助確認商品包裝與目前優惠。"
  },
  {
    id: "shop-gift-01",
    texture: "clerk-gift-01",
    title: "禮品免稅店員",
    receptionLine: "歡迎光臨，這裡有適合旅途中使用與送禮的商品。",
    cashierLine: "需要禮品包裝的話，結帳時可以告訴我。"
  }
];

const property = (name, value, type = "string") => ({ name, type, value });

for (const spec of shopSpecs) {
  const path = resolve(tiledRoot, `regions/${spec.id}.tmj`);
  const map = JSON.parse(await readFile(path, "utf8"));
  const npcLayer = map.layers.find((layer) => layer.name === "NPCs");
  const collisionLayer = map.layers.find((layer) => layer.name === "Collision");
  if (!npcLayer || !collisionLayer) {
    throw new Error(`${spec.id} is missing NPCs or Collision`);
  }

  const previousClerks = npcLayer.objects.filter((object) =>
    object.properties?.some(
      (entry) => entry.name === "texture" && entry.value === spec.texture
    )
  );
  if (previousClerks.length === 0) {
    throw new Error(`${spec.id} has no existing clerk template`);
  }

  const questProperty = previousClerks
    .flatMap((object) => object.properties ?? [])
    .find((entry) => entry.name === "interactionQuestLines");
  const gid = previousClerks[0].gid;
  npcLayer.objects = npcLayer.objects.filter(
    (object) =>
      !object.properties?.some(
        (entry) => entry.name === "texture" && entry.value === spec.texture
      )
  );
  collisionLayer.objects = collisionLayer.objects.filter(
    (object) => !String(object.name).startsWith(`${spec.texture}-`)
  );

  let nextId =
    Math.max(
      ...map.layers.flatMap((layer) => (layer.objects ?? []).map((object) => object.id)),
      0
    ) + 1;

  const staff = [
    {
      role: "reception-left",
      x: 54,
      y: 272,
      label: `${spec.title}・接待`,
      line: spec.receptionLine
    },
    {
      role: "reception-right",
      x: 390,
      y: 272,
      label: `${spec.title}・接待`,
      line: spec.receptionLine
    },
    {
      role: "cashier",
      x: 222,
      y: 96,
      label: `${spec.title}・收銀`,
      line: spec.cashierLine,
      questProperty
    }
  ];

  for (const member of staff) {
    const name = `${spec.texture}-${member.role}`;
    npcLayer.objects.push({
      gid,
      height: 36,
      id: nextId++,
      name,
      opacity: 1,
      properties: [
        property("texture", spec.texture),
        property("label", member.label),
        property("interactionTitle", member.label),
        property("interactionLines", JSON.stringify([member.line])),
        ...(member.questProperty ? [member.questProperty] : []),
        property("movementType", "idle"),
        property("facing", "down"),
        property("animationKey", spec.texture),
        property("speed", 0, "float"),
        property("foreground", true, "bool")
      ],
      rotation: 0,
      type: "",
      visible: true,
      width: 36,
      x: member.x,
      y: member.y
    });
    collisionLayer.objects.push({
      height: 24,
      id: nextId++,
      name: `${name}-collision`,
      opacity: 1,
      properties: [property("ownerId", name)],
      rotation: 0,
      type: "",
      visible: true,
      width: 24,
      x: member.x + 6,
      y: member.y - 24
    });
  }

  map.nextobjectid = Math.max(map.nextobjectid ?? 0, nextId);
  await writeFile(path, `${JSON.stringify(map, null, 1)}\n`);
}

console.log("[shop-staff] added two reception clerks and one cashier to each shop");
