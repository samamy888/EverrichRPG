import { readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const allowedExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".tmj",
  ".tsj",
  ".txt",
  ".xml",
  ".yml"
]);
const suspiciousPatterns = [
  /\uFFFD/u,
  /鈭|嚗|蝣|摰|撌|隞|璈|頝|甇|銝|閮|暺|蝘/u
];

const files = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8"
})
  .split(/\r?\n/u)
  .filter(Boolean)
  .filter((file) => allowedExtensions.has(extname(file)));

const findings = [];

for (const file of files) {
  const path = resolve(root, file);
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (suspiciousPatterns.some((pattern) => pattern.test(line))) {
      findings.push({
        file: relative(root, path),
        line: index + 1,
        text: line.trim().slice(0, 160)
      });
    }
  });
}

if (findings.length > 0) {
  console.warn(`[text:scan] Found ${findings.length} potentially garbled lines.`);
  for (const finding of findings.slice(0, 80)) {
    console.warn(`${finding.file}:${finding.line} ${finding.text}`);
  }
  if (findings.length > 80) {
    console.warn(`[text:scan] ${findings.length - 80} additional findings omitted.`);
  }
  process.exitCode = 1;
} else {
  console.log("[text:scan] OK");
}
