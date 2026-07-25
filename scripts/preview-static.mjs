import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? "dist");
const port = Number(process.env.PREVIEW_PORT ?? 4322);
const host = process.env.PREVIEW_HOST ?? "127.0.0.1";
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webp": "image/webp"
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${host}:${port}`).pathname);
    let target = path.resolve(root, `.${pathname}`);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
      await stat(target);
    } catch {
      target = path.join(root, "404.html");
      response.statusCode = 404;
    }
    response.setHeader("Content-Type", mimeTypes[path.extname(target)] ?? "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(400).end("Bad Request");
  }
});

server.listen(port, host, () => {
  console.log(`静态预览：http://${host}:${port}/`);
});
