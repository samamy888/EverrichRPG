import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(`[shop:verify] ${message}`);
  process.exit(1);
}

const root = process.cwd();
const catalog = JSON.parse(
  readFileSync(resolve(root, "game/content/shops/shop-catalog.json"), "utf8")
);
const shops = catalog.shops;
const products = catalog.products;
const shopIds = new Set(shops.map((shop) => shop.id));
const productIds = new Set();

if (catalog.schemaVersion !== 1) fail("Unsupported schema version");
if (shops.length !== 3) fail(`Expected 3 shops, received ${shops.length}`);

for (const product of products) {
  if (productIds.has(product.id)) fail(`Duplicate product id: ${product.id}`);
  productIds.add(product.id);
  if (!shopIds.has(product.storeId)) fail(`${product.id} references unknown shop ${product.storeId}`);
  if (!Number.isInteger(product.price) || product.price <= 0) fail(`Invalid price: ${product.id}`);
  if (!product.name || !product.description) fail(`Missing product copy: ${product.id}`);
}

for (const shop of shops) {
  if (!shop.name || !shop.welcome || !shop.clerkMessage) fail(`Missing shop copy: ${shop.id}`);
  if (shop.productIds.length !== 4) fail(`${shop.id} must list exactly four products`);
  for (const productId of shop.productIds) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) fail(`${shop.id} references unknown product ${productId}`);
    if (product.storeId !== shop.id) fail(`${productId} is assigned to a different shop`);
  }
}

console.log(`[shop:verify] OK (${shops.length} shops, ${products.length} products)`);
