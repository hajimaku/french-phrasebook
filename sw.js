/*
 * オフライン用 Service Worker。
 * アプリを構成するファイルをすべて事前にキャッシュし、以後はキャッシュから返す（外部通信なし）。
 * ファイルを変更したら VERSION を上げること（tools/validate.cjs が ASSETS の漏れを検査する）。
 */
// ドイツ語版と同じドメインで公開しても互いのキャッシュを消さないよう、名前に "pb-fr-" を付けて区別する
const PREFIX = "pb-fr-";
const VERSION = PREFIX + "2026-11-26-1";
const ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "js/search.js",
  "data/core.js",
  "data/phrases-1.js",
  "data/phrases-2.js",
  "data/phrases-3.js",
  "data/phrases-4.js",
  "data/conversations.js",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ includeUncontrolled: true }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: "cached", version: VERSION })))
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // ページ本体は常にキャッシュの index.html を返す（ハッシュで画面を切り替えるため）
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match("index.html").then((hit) => hit || fetch(req))
      )
    );
    return;
  }

  event.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        });
      })
    )
  );
});

// 画面側からの「オフライン準備はできているか」の問い合わせに答える
self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "status") return;
  const port = event.ports && event.ports[0];
  if (!port) return;
  caches.open(VERSION)
    .then((cache) => Promise.all(ASSETS.map((u) => cache.match(u).then((r) => (r ? 0 : 1)))))
    .then((miss) => port.postMessage({ version: VERSION, total: ASSETS.length, missing: miss.reduce((a, b) => a + b, 0) }))
    .catch(() => port.postMessage({ version: VERSION, total: ASSETS.length, missing: ASSETS.length }));
});
