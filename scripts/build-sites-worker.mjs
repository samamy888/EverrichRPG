import { mkdir, readdir, rename, writeFile } from "node:fs/promises";

const clientDirectory = "dist/client";
await mkdir(clientDirectory, { recursive: true });

for (const entry of await readdir("dist", { withFileTypes: true })) {
  if (entry.name === "client" || entry.name === "server") continue;
  await rename(`dist/${entry.name}`, `${clientDirectory}/${entry.name}`);
}

const workerSource = `const withSecurityHeaders = (response) => {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};

export default {
  async fetch(request, env) {
    if (!env.ASSETS) {
      return new Response("EVERRICH RPG is starting up.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return withSecurityHeaders(response);

    const url = new URL(request.url);
    if (request.method === "GET" && !url.pathname.includes(".")) {
      url.pathname = "/index.html";
      return withSecurityHeaders(
        await env.ASSETS.fetch(new Request(url, { method: "GET", headers: request.headers }))
      );
    }

    return withSecurityHeaders(response);
  }
};
`;

await mkdir("dist/server", { recursive: true });
await writeFile("dist/server/index.js", workerSource, "utf8");
