import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const outputDir = join(root, "migration");
const inventoryPath = join(outputDir, "inventory.json");
const decisionsPath = join(outputDir, "decisions.json");
const reportPath = join(outputDir, "reports", "inventory-summary.json");

const ignoredRoots = new Set([".git", "node_modules", "dist", "logs"]);
const ignoredNestedSegments = [join("tools", "agent-sprite-forge")];
const ignoredGeneratedFiles = new Set([
  "migration/inventory.json",
  "migration/decisions.json",
  "migration/reports/inventory-summary.json"
]);

function normalizePath(path) {
  return path.split(sep).join("/");
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function walkFiles(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (directory === root && ignoredRoots.has(entry.name)) {
      continue;
    }

    const absolutePath = join(directory, entry.name);
    const projectPath = normalizePath(relative(root, absolutePath));
    if (ignoredGeneratedFiles.has(projectPath)) {
      continue;
    }
    if (ignoredNestedSegments.some((segment) => projectPath.startsWith(normalizePath(segment)))) {
      continue;
    }

    if (entry.isDirectory()) {
      walkFiles(absolutePath, files);
    } else if (entry.isFile()) {
      files.push(projectPath);
    }
  }
  return files;
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function readPngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) {
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function categoryFor(path) {
  const extension = extname(path).toLowerCase();
  if (path.startsWith("public/map/") || path.startsWith("public/assets/map/") || path.startsWith("assets/map/")) {
    return "map-asset";
  }
  if (
    path.startsWith("public/sprites/") ||
    path.startsWith("public/assets/sprites/") ||
    path.startsWith("assets/sprites/")
  ) {
    return "sprite-asset";
  }
  if (path.startsWith("src/data/") || path.includes("/data/")) {
    return "game-data";
  }
  if (path.startsWith("src/")) {
    return "source-code";
  }
  if (path.startsWith("server/")) {
    return "legacy-server";
  }
  if (path.startsWith("scripts/")) {
    return "tooling";
  }
  if (path.startsWith("docs/") || extension === ".md") {
    return "documentation";
  }
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(extension)) {
    return "visual-reference";
  }
  if ([".json", ".txt", ".yaml", ".yml"].includes(extension)) {
    return "metadata";
  }
  return "project-file";
}

function suggestedGrade(path, category) {
  const lower = path.toLowerCase();
  if (
    lower.includes("/raw/") ||
    lower.includes("prompt.") ||
    lower.includes("extract-report") ||
    lower.includes("pipeline-meta") ||
    lower.includes("concept") ||
    lower.includes("preview")
  ) {
    return "D";
  }
  if (
    lower.includes("placeholder") ||
    lower.endsWith("patch.diff") ||
    lower === "1" ||
    lower.includes("/debug/")
  ) {
    return "E";
  }
  if (category === "game-data") {
    return "A";
  }
  if (category === "map-asset" || category === "sprite-asset") {
    return "B";
  }
  if (category === "visual-reference" || category === "documentation") {
    return "C";
  }
  if (category === "source-code" || category === "legacy-server") {
    return "D";
  }
  return "C";
}

function defaultReason(grade) {
  const reasons = {
    A: "結構化遊戲資料，優先轉換至新版內容格式。",
    B: "可能可重用的 runtime 素材，需進行視覺、尺寸與授權審核。",
    C: "保留作設計或空間參考，不直接打包進遊戲。",
    D: "來源、中間產物或舊程式，保留於 archive 供追溯。",
    E: "疑似重複、失敗或暫存產物，確認無依賴後才可淘汰。"
  };
  return reasons[grade];
}

function loadHeadEntries() {
  const output = runGit(["ls-tree", "-r", "-l", "HEAD"]);
  const entries = new Map();
  if (!output) {
    return entries;
  }

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t(.+)$/);
    if (!match) {
      continue;
    }
    entries.set(normalizePath(match[3]), {
      objectId: match[1],
      size: Number(match[2])
    });
  }
  return entries;
}

function loadExistingDecisions() {
  if (!existsSync(decisionsPath)) {
    return new Map();
  }
  const document = JSON.parse(readFileSync(decisionsPath, "utf8"));
  return new Map((document.decisions ?? []).map((decision) => [decision.path, decision]));
}

function buildInventory() {
  const headEntries = loadHeadEntries();
  const workingPaths = walkFiles(root);
  const allPaths = new Set([...headEntries.keys(), ...workingPaths]);
  const records = [];

  for (const path of [...allPaths].sort((a, b) => a.localeCompare(b, "en"))) {
    const absolutePath = join(root, ...path.split("/"));
    const presentInWorkingTree = existsSync(absolutePath);
    const trackedInHead = headEntries.has(path);
    const category = categoryFor(path);
    const grade = suggestedGrade(path, category);
    let workingTree = null;

    if (presentInWorkingTree) {
      const buffer = readFileSync(absolutePath);
      workingTree = {
        size: statSync(absolutePath).size,
        sha256: sha256(buffer),
        dimensions: extname(path).toLowerCase() === ".png" ? readPngDimensions(buffer) : null
      };
    }

    records.push({
      path,
      extension: extname(path).toLowerCase() || null,
      category,
      presence:
        trackedInHead && presentInWorkingTree
          ? "head-and-working-tree"
          : trackedInHead
            ? "head-only"
            : "working-tree-only",
      trackedInHead,
      presentInWorkingTree,
      head: trackedInHead
        ? {
            objectId: headEntries.get(path).objectId,
            size: headEntries.get(path).size
          }
        : null,
      workingTree,
      suggestedGrade: grade,
      suggestedReason: defaultReason(grade),
      licenseStatus:
        category === "map-asset" || category === "sprite-asset" || category === "visual-reference"
          ? "review-required"
          : "not-applicable"
    });
  }

  return records;
}

function summarize(records) {
  const summary = {
    total: records.length,
    byPresence: {},
    byCategory: {},
    bySuggestedGrade: {},
    headBytes: 0,
    workingTreeBytes: 0
  };

  for (const record of records) {
    summary.byPresence[record.presence] = (summary.byPresence[record.presence] ?? 0) + 1;
    summary.byCategory[record.category] = (summary.byCategory[record.category] ?? 0) + 1;
    summary.bySuggestedGrade[record.suggestedGrade] =
      (summary.bySuggestedGrade[record.suggestedGrade] ?? 0) + 1;
    summary.headBytes += record.head?.size ?? 0;
    summary.workingTreeBytes += record.workingTree?.size ?? 0;
  }

  return summary;
}

function writeJson(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const generatedAt = new Date().toISOString();
const records = buildInventory();
const summary = summarize(records);
const existingDecisions = loadExistingDecisions();

writeJson(inventoryPath, {
  schemaVersion: 1,
  generatedAt,
  sourceRevision: runGit(["rev-parse", "HEAD"]),
  rules: {
    ignoredRoots: [...ignoredRoots],
    ignoredGeneratedFiles: [...ignoredGeneratedFiles],
    note: "此清冊為唯讀盤點結果，不代表任何檔案已獲准搬遷或刪除。"
  },
  summary,
  records
});

writeJson(decisionsPath, {
  schemaVersion: 1,
  updatedAt: generatedAt,
  allowedDecisions: ["adopt", "candidate", "reference", "archive", "remove-after-review"],
  decisions: records.map((record) => {
    const existing = existingDecisions.get(record.path);
    return {
      path: record.path,
      decision: existing?.decision ?? null,
      targetPath: existing?.targetPath ?? null,
      reason: existing?.reason ?? null,
      reviewedBy: existing?.reviewedBy ?? null,
      reviewedAt: existing?.reviewedAt ?? null
    };
  })
});

writeJson(reportPath, {
  generatedAt,
  sourceRevision: runGit(["rev-parse", "HEAD"]),
  summary
});

console.log(`Migration inventory generated: ${records.length} records`);
console.log(`HEAD-only: ${summary.byPresence["head-only"] ?? 0}`);
console.log(`Working-tree-only: ${summary.byPresence["working-tree-only"] ?? 0}`);
console.log(`Shared paths: ${summary.byPresence["head-and-working-tree"] ?? 0}`);
