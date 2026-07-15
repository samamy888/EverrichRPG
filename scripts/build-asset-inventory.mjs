import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectRoot, "backend", "src", "generated", "assetInventory.json");

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--", "public/assets", "game/assets"],
  { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
)
  .split("\0")
  .filter(Boolean)
  .sort((left, right) => left.localeCompare(right, "en"));

const records = [];
for (const repositoryPath of trackedFiles) {
  const absolutePath = path.join(projectRoot, repositoryPath);
  const [buffer, fileStat] = await Promise.all([readFile(absolutePath), stat(absolutePath)]);
  const normalizedPath = repositoryPath.replaceAll("\\", "/");
  const scope = normalizedPath.startsWith("public/assets/") ? "runtime" : "source";
  const relativePath = normalizedPath.replace(/^(public|game)\/assets\//, "");
  const extension = path.extname(relativePath).slice(1).toLowerCase() || "none";
  const hash = createHash("sha256").update(buffer).digest("hex");
  records.push({
    id: `${scope}:${relativePath}`,
    name: path.basename(relativePath),
    path: normalizedPath,
    relativePath,
    scope,
    category: classifyCategory(relativePath, extension),
    type: classifyType(extension),
    role: classifyRole(relativePath),
    extension,
    bytes: fileStat.size,
    sha256: hash,
    url: scope === "runtime" ? `/assets/${relativePath}` : null
  });
}

const hashes = new Map();
for (const record of records) {
  const matching = hashes.get(record.sha256) ?? [];
  matching.push(record);
  hashes.set(record.sha256, matching);
}

for (const matching of hashes.values()) {
  for (const record of matching) {
    record.duplicateCount = matching.length;
  }
}

const duplicateGroups = [...hashes.values()].filter((matching) => matching.length > 1);
const inventory = {
  schemaVersion: 1,
  roots: ["public/assets", "game/assets"],
  summary: {
    totalFiles: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    runtimeFiles: records.filter((record) => record.scope === "runtime").length,
    sourceFiles: records.filter((record) => record.scope === "source").length,
    duplicateGroups: duplicateGroups.length,
    duplicateFiles: duplicateGroups.reduce((sum, matching) => sum + matching.length, 0)
  },
  assets: records
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
console.log(`Asset inventory: ${records.length} files, ${duplicateGroups.length} duplicate groups.`);
console.log(path.relative(projectRoot, outputPath));

function classifyCategory(relativePath, extension) {
  const firstSegment = relativePath.split("/")[0]?.toLowerCase();
  if (["map", "maps"].includes(firstSegment)) return "maps";
  if (firstSegment === "sprites") return "sprites";
  if (firstSegment === "props") return "props";
  if (firstSegment === "tilesets") return "tilesets";
  if (firstSegment === "fonts") return "fonts";
  if (firstSegment === "audio" || ["wav", "mp3", "ogg", "m4a"].includes(extension)) return "audio";
  if (firstSegment === "previews") return "previews";
  if (firstSegment === "characters") return "characters";
  if (firstSegment?.startsWith("airport-reference")) return "reference";
  return firstSegment || "other";
}

function classifyType(extension) {
  if (["png", "jpg", "jpeg", "webp", "gif", "avif"].includes(extension)) return "image";
  if (["wav", "mp3", "ogg", "m4a"].includes(extension)) return "audio";
  if (["tmj", "tsj", "tsx", "tmx", "tiled-project"].includes(extension)) return "tiled";
  if (["woff", "woff2", "ttf", "otf", "xml"].includes(extension)) return "font";
  if (["json"].includes(extension)) return "data";
  if (["txt", "md"].includes(extension)) return "text";
  return "other";
}

function classifyRole(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.includes("/raw/") || /(?:^|[-_.])raw(?:[-_.]|$)/.test(lower)) return "raw";
  if (lower.includes("preview")) return "preview";
  if (lower.includes("prompt")) return "prompt";
  if (lower.includes("manifest") || lower.includes("meta.json")) return "manifest";
  if (lower.includes("source")) return "source";
  if (lower.endsWith(".gif")) return "animation";
  return "asset";
}
