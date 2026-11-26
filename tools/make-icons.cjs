#!/usr/bin/env node
/* icons/icon.svg から PNG アイコンを生成する（Playwright の Chromium を使用）。 node tools/make-icons.cjs */
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const dir = path.resolve(__dirname, "../icons");
const svg = fs.readFileSync(path.join(dir, "icon.svg"), "utf8");
// 角丸なし・全面塗り（iOS とマスカブル用）
const square = svg.replace('rx="112" ', "");
const maskable = square.replace(/(<rect width="512" height="512" fill="#15456b"\/>)([\s\S]*)(<\/svg>)/, '$1<g transform="translate(51.2 51.2) scale(.8)">$2</g>$3');
const jobs = [
  ["icon-192.png", svg, 192],
  ["icon-512.png", svg, 512],
  ["icon-maskable-512.png", maskable, 512],
  ["apple-touch-icon.png", square, 180]
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [name, src, size] of jobs) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log("wrote", name);
  }
  await browser.close();
})();
