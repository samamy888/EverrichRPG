import { copyFile } from "node:fs/promises";

await copyFile("web.config", "dist/web.config");
