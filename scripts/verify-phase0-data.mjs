import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const inventoryPath = join(root, "migration", "inventory.json");
const decisionsPath = join(root, "migration", "decisions.json");
const topologyPath = join(root, "game", "content", "world", "world-topology.json");
const schemasDir = join(root, "game", "schemas");
const brandsPath = join(root, "game", "content", "brands", "brand-review.json");
const shopsPath = join(root, "game", "content", "shops", "shops.draft.json");
const itemsPath = join(root, "game", "content", "items", "items.draft.json");
const charactersPath = join(root, "game", "content", "characters", "characters.draft.json");
const idMapPath = join(root, "migration", "id-map.json");
const aGradeReviewPath = join(root, "migration", "a-grade-review.json");

const errors = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function requireFile(path) {
  if (!existsSync(path)) {
    errors.push(`Missing required file: ${path}`);
    return false;
  }
  return true;
}

function verifySchemas() {
  const expectedSchemas = [
    "region.schema.json",
    "portal.schema.json",
    "entity.schema.json",
    "item.schema.json",
    "quest.schema.json",
    "world-topology.schema.json"
  ];

  for (const filename of expectedSchemas) {
    const path = join(schemasDir, filename);
    if (!requireFile(path)) {
      continue;
    }
    const schema = readJson(path);
    if (!schema) {
      continue;
    }
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      errors.push(`${filename}: unsupported or missing $schema`);
    }
    if (!schema.$id || !schema.title || schema.type !== "object") {
      errors.push(`${filename}: missing $id, title, or object type`);
    }
  }

  for (const filename of readdirSync(schemasDir)) {
    if (extname(filename) === ".json") {
      readJson(join(schemasDir, filename));
    }
  }
}

function verifyInventory() {
  if (!requireFile(inventoryPath) || !requireFile(decisionsPath)) {
    return;
  }

  const inventory = readJson(inventoryPath);
  const decisions = readJson(decisionsPath);
  if (!inventory || !decisions) {
    return;
  }

  const inventoryPaths = inventory.records.map((record) => record.path);
  const decisionPaths = decisions.decisions.map((decision) => decision.path);
  const inventorySet = new Set(inventoryPaths);
  const decisionSet = new Set(decisionPaths);

  if (inventorySet.size !== inventoryPaths.length) {
    errors.push("migration/inventory.json contains duplicate paths");
  }
  if (decisionSet.size !== decisionPaths.length) {
    errors.push("migration/decisions.json contains duplicate paths");
  }
  if (inventorySet.size !== decisionSet.size) {
    errors.push("Inventory and decision record counts differ");
  }

  for (const path of inventorySet) {
    if (!decisionSet.has(path)) {
      errors.push(`Missing decision row: ${path}`);
    }
  }
  for (const path of decisionSet) {
    if (!inventorySet.has(path)) {
      errors.push(`Decision row has no inventory record: ${path}`);
    }
  }

  const countedTotal = Object.values(inventory.summary.byPresence).reduce((sum, value) => sum + value, 0);
  if (countedTotal !== inventory.summary.total || inventory.summary.total !== inventory.records.length) {
    errors.push("Inventory summary total does not match records");
  }
}

function verifyTopology() {
  if (!requireFile(topologyPath)) {
    return;
  }
  const topology = readJson(topologyPath);
  if (!topology) {
    return;
  }

  if (topology.schemaVersion !== 1) {
    errors.push("World topology schemaVersion must be 1");
  }

  const regionIds = topology.regions.map((region) => region.id);
  const regionSet = new Set(regionIds);
  if (regionSet.size !== regionIds.length) {
    errors.push("World topology contains duplicate region ids");
  }
  if (!regionSet.has(topology.startRegionId)) {
    errors.push(`Start region does not exist: ${topology.startRegionId}`);
  }

  const connectionIds = new Set();
  const adjacency = new Map(regionIds.map((id) => [id, new Set()]));
  for (const connection of topology.connections) {
    if (connectionIds.has(connection.id)) {
      errors.push(`Duplicate connection id: ${connection.id}`);
    }
    connectionIds.add(connection.id);

    if (!regionSet.has(connection.fromRegionId)) {
      errors.push(`${connection.id}: missing from region ${connection.fromRegionId}`);
      continue;
    }
    if (!regionSet.has(connection.toRegionId)) {
      errors.push(`${connection.id}: missing to region ${connection.toRegionId}`);
      continue;
    }

    adjacency.get(connection.fromRegionId).add(connection.toRegionId);
    if (connection.bidirectional) {
      adjacency.get(connection.toRegionId).add(connection.fromRegionId);
    }
  }

  const visited = new Set();
  const queue = [topology.startRegionId];
  while (queue.length > 0) {
    const regionId = queue.shift();
    if (visited.has(regionId)) {
      continue;
    }
    visited.add(regionId);
    for (const neighbor of adjacency.get(regionId) ?? []) {
      queue.push(neighbor);
    }
  }

  for (const region of topology.regions) {
    if (region.enabledInMvp && !visited.has(region.id)) {
      errors.push(`MVP region is unreachable from start: ${region.id}`);
    }
  }
}

function uniqueIds(records, label) {
  const ids = records.map((record) => record.id);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    errors.push(`${label} contains duplicate ids`);
  }
  return unique;
}

function verifyDraftContent() {
  const requiredPaths = [
    brandsPath,
    shopsPath,
    itemsPath,
    charactersPath,
    idMapPath,
    aGradeReviewPath
  ];
  if (!requiredPaths.every(requireFile)) {
    return;
  }

  const brands = readJson(brandsPath);
  const shops = readJson(shopsPath);
  const items = readJson(itemsPath);
  const characters = readJson(charactersPath);
  const idMap = readJson(idMapPath);
  const aGradeReview = readJson(aGradeReviewPath);
  const topology = readJson(topologyPath);
  if (!brands || !shops || !items || !characters || !idMap || !aGradeReview || !topology) {
    return;
  }

  const brandIds = uniqueIds(brands.brands, "Brand review");
  const shopIds = uniqueIds(shops.shops, "Shop draft");
  const characterIds = uniqueIds(characters.characters, "Character draft");
  uniqueIds(items.items, "Item draft");

  const regionIds = new Set(topology.regions.map((region) => region.id));
  for (const shop of shops.shops) {
    if (!regionIds.has(shop.regionId)) {
      errors.push(`${shop.id}: missing region ${shop.regionId}`);
    }
    if (!characterIds.has(shop.clerkCharacterId)) {
      errors.push(`${shop.id}: missing clerk ${shop.clerkCharacterId}`);
    }
    if (!brandIds.has(shop.brandId)) {
      errors.push(`${shop.id}: missing brand ${shop.brandId}`);
    }
  }

  for (const item of items.items) {
    if (item.schemaVersion !== 1) {
      errors.push(`${item.id}: schemaVersion must be 1`);
    }
    if (!brandIds.has(item.brandId)) {
      errors.push(`${item.id}: missing brand ${item.brandId}`);
    }
    for (const storeId of item.storeIds) {
      if (!shopIds.has(storeId)) {
        errors.push(`${item.id}: missing shop ${storeId}`);
      }
    }
    if (item.licenseStatus === "approved" && item.brandId === "brand-unassigned") {
      errors.push(`${item.id}: unassigned brand cannot be approved`);
    }
  }

  const reviewedPaths = new Set(aGradeReview.reviewedSources.map((source) => source.path));
  const expectedLegacyPaths = [
    "src/data/content.ts",
    "src/data/facilities.ts",
    "src/data/facilitiesT2V3.ts",
    "src/data/items.ts",
    "src/data/terminalMap.ts",
    "src/data/tpe2Layout.ts",
    "src/data/tpe2LayoutV2.ts",
    "src/data/tpe2LayoutV3Central.ts",
    "src/data/tpe2LayoutV3NorthD.ts",
    "src/data/tpe2LayoutV3SouthC.ts",
    "src/data/travelers.ts"
  ];
  for (const path of expectedLegacyPaths) {
    if (!reviewedPaths.has(path)) {
      errors.push(`A-grade source not reviewed: ${path}`);
    }
  }

  if (!idMap.mappings?.stores || !idMap.mappings?.characters || !idMap.mappings?.worldData) {
    errors.push("ID map is missing a required mapping group");
  }
}

verifySchemas();
verifyInventory();
verifyTopology();
verifyDraftContent();

if (errors.length > 0) {
  console.error("Phase 0 verification failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Phase 0 data verification passed.");
