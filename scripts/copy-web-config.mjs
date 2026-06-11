import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const source = resolve(root, "web.config");
const distDir = resolve(root, "dist");
const dest = resolve(distDir, "web.config");

if (!existsSync(source)) {
  throw new Error("web.config not found in project root.");
}

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

copyFileSync(source, dest);
console.log("Copied web.config to dist/web.config");

