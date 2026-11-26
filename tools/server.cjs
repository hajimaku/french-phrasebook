#!/usr/bin/env node
/*
 * 開発・確認用の静的サーバー（依存なし）。
 *   node tools/server.cjs [ポート] [--host 0.0.0.0]
 * 既定は http://127.0.0.1:8000/ 。オフライン保存（Service Worker）は localhost か https でのみ有効。
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json; charset=utf-8"
};
// アプリとして配信するもの（tools/ や README は配信しない）
const PUBLIC = /^\/(index\.html|sw\.js|manifest\.webmanifest|(css|js|data|icons)\/[\w.-]+)$/;

function createServer() {
  return http.createServer((req, res) => {
    let p;
    try {
      p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch (e) {
      res.writeHead(400);
      return res.end("bad request");
    }
    if (p === "/") p = "/index.html";
    const file = path.join(ROOT, path.normalize(p));
    if (!PUBLIC.test(p) || !file.startsWith(ROOT + path.sep) || !fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

module.exports = { createServer, ROOT };

if (require.main === module) {
  const args = process.argv.slice(2);
  const hostIdx = args.indexOf("--host");
  const host = hostIdx >= 0 ? args[hostIdx + 1] : "127.0.0.1";
  const port = Number(args.find((a, i) => /^\d+$/.test(a) && args[i - 1] !== "--host") || 8000);
  createServer().listen(port, host, () => {
    console.log(`フランス語 旅の会話帳: http://${host === "0.0.0.0" ? "localhost" : host}:${port}/`);
  });
}
