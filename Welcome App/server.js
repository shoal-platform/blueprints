// A minimal static file server for the files in ./public.
// Uses only Node.js built-ins, so there is nothing to install or build.

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

async function serveFile(res, urlPath) {
  const relativePath = urlPath === "/" ? "index.html" : urlPath;
  const filePath = path.join(PUBLIC_DIR, relativePath);

  // Never serve anything outside the public directory.
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain" }).end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const type = MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  serveFile(res, pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Welcome app listening on http://localhost:${PORT}`);
});
