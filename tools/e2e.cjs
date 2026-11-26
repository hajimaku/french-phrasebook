#!/usr/bin/env node
/*
 * ブラウザでの動作確認（Playwright / Chromium、iPhone 相当の画面）。
 *   node tools/e2e.cjs [スクリーンショット保存先]   （npm run test:e2e）
 * tools/server.cjs を localhost の空きポートで起動して検査する。失敗があれば終了コード 1。
 */
"use strict";
const path = require("path");
const { chromium, devices } = require("playwright");

const { createServer } = require("./server.cjs");
const SHOT_DIR = process.argv[2] || null;

function serve() {
  const server = createServer();
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || "" });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`);
}
async function noHorizontalOverflow(page) {
  return page.evaluate(() => {
    const w = window.innerWidth;
    const doc = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll("main *, .bottomnav, .topbar")]
      .filter((el) => el.getClientRects().length && el.getBoundingClientRect().right > w + 1)
      .slice(0, 3)
      .map((el) => el.className || el.tagName);
    return { ok: doc <= w && offenders.length === 0, doc, w, offenders };
  });
}
async function shot(page, name) {
  if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, name) });
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const pageErrors = [];

  // ---------- iPhone 13（390px） ----------
  const ctx = await browser.newContext({ ...devices["iPhone 13"], deviceScaleFactor: SHOT_DIR ? 2 : 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") pageErrors.push(m.text()); });

  await page.goto(base);
  await page.waitForSelector(".toc a");
  const cats = await page.$$eval(".toc a", (as) => as.map((a) => a.getAttribute("href")));
  check("目次に17カテゴリーが並ぶ", cats.length === 17, `${cats.length}件`);

  // オフライン準備完了の表示
  await page.waitForFunction(() => /オフライン準備完了/.test(document.getElementById("offline-status")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
  const offText = await page.textContent("#offline-status");
  check("オフライン準備完了が表示される", /オフライン準備完了/.test(offText), offText.trim().slice(0, 40));
  await shot(page, "01-toc.png");

  // 全カテゴリー：内容・はみ出し（詳細をすべて展開した状態でも）
  for (const href of cats) {
    await page.goto(base + href);
    await page.waitForSelector(".ph");
    const n = await page.$$eval("main .ph", (l) => l.length);
    const title = await page.textContent(".page-head h1");
    await page.$$eval('[data-act="more"]', (bs) => bs.forEach((b) => b.click()));
    await page.$$eval("details.dlg", (ds) => ds.forEach((d) => (d.open = true)));
    const ov = await noHorizontalOverflow(page);
    check(`カテゴリー「${title}」：表示 ${n}行・横はみ出しなし`, n > 0 && ov.ok, ov.ok ? "" : JSON.stringify(ov));
  }

  // 目次・緊急への移動
  await page.goto(base + "#/c/restaurant");
  await page.waitForSelector(".ph");
  await shot(page, "02-category.png");
  await page.click(".bottomnav .nav-sos");
  await page.waitForSelector(".sos-card");
  check("カテゴリー画面から緊急ページへ1タップで移動", (await page.textContent(".page-head h1")).includes("緊急"));
  await shot(page, "05-emergency.png");
  await page.click(".topbar-home");
  await page.waitForSelector(".toc");
  check("上部バーから目次へ戻れる", await page.isVisible(".toc"));

  // 見せるモードとスクロール位置の維持
  await page.goto(base + "#/c/restaurant");
  await page.waitForSelector(".ph");
  await page.evaluate(() => { document.querySelector('.ph[data-pid="r17"]').scrollIntoView({ block: "center" }); });
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.scrollY);
  const target = await page.$('.ph[data-pid="r17"] .ph-main');
  const targetDe = await target.evaluate((el) => el.querySelector(".ph-fr").textContent);
  await target.click();
  await page.waitForSelector("#show:not([hidden])");
  const shownDe = await page.textContent("#show-fr");
  const showFont = await page.$eval("#show-fr", (el) => parseFloat(getComputedStyle(el).fontSize));
  check("フレーズをタップすると見せるモードで大きく表示", shownDe === targetDe && showFont >= 28, `${shownDe}（${showFont}px）`);
  const jaSmall = await page.$eval("#show-ja", (el) => parseFloat(getComputedStyle(el).fontSize));
  check("見せるモードの日本語は補助として小さく表示", jaSmall < showFont, `${jaSmall}px`);
  await shot(page, "03-show.png");
  await page.click(".show-close");
  await page.waitForSelector("#show", { state: "hidden" });
  const after = await page.evaluate(() => window.scrollY);
  check("見せるモードから戻るとスクロール位置が同じ", Math.abs(after - before) < 4, `${before} → ${after}`);

  // ブラウザの「戻る」でも閉じる
  await target.click();
  await page.waitForSelector("#show:not([hidden])");
  await page.goBack();
  await page.waitForSelector("#show", { state: "hidden" });
  check("端末の戻る操作でも見せるモードを閉じられる", (await page.evaluate(() => location.hash)) === "#/c/restaurant");

  // 一覧 → 別ページ → 戻る でスクロール位置が戻る
  await page.evaluate(() => window.scrollTo(0, 2200));
  await page.waitForTimeout(150);
  const listPos = await page.evaluate(() => window.scrollY);
  await page.click('.bottomnav a[data-nav="toc"]');
  await page.waitForSelector(".toc");
  await page.goBack();
  await page.waitForSelector(".page-head");
  await page.waitForTimeout(100);
  const back = await page.evaluate(() => window.scrollY);
  check("目次へ移動して戻っても一覧の位置を維持", Math.abs(back - listPos) < 4, `${listPos} → ${back}`);

  // 長い文の見せるモード（最長フレーズ）
  const longest = await page.evaluate(() => {
    const all = [...window.PB.phrases].sort((a, b) => b.fr.length - a.fr.length);
    return all[0].id;
  });
  await page.evaluate((id) => { location.hash = "#/search?q=" + id; }, longest);
  const longP = await page.evaluate((id) => window.PB.phrases.find((p) => p.id === id), longest);
  await page.goto(base + "#/c/" + longP.category);
  await page.waitForSelector(".ph");
  await page.click(`.ph[data-pid="${longest}"] .ph-main >> nth=0`);
  await page.waitForSelector("#show:not([hidden])");
  const fits = await page.evaluate(() => {
    const de = document.getElementById("show-fr");
    const body = document.getElementById("show-body");
    return { right: de.getBoundingClientRect().right, w: window.innerWidth, sw: body.scrollWidth, cw: body.clientWidth, size: getComputedStyle(de).fontSize };
  });
  check("最長の文も見せるモードで横にはみ出さない", fits.right <= fits.w && fits.sw <= fits.cw, `${longP.fr.length}文字 / ${fits.size}`);
  await shot(page, "04-show-long.png");
  await page.click(".show-close");

  // 入れ替え表現
  await page.goto(base + "#/c/train");
  await page.waitForSelector(".ph");
  await page.click('.ph[data-pid="t01"] [data-act="more"] >> nth=0');
  await page.click('.ph[data-pid="t01"] .slot .chip:has-text("マントン") >> nth=0');
  const t01 = await page.$eval('.ph[data-pid="t01"] .slot-out', (el) => ({ fr: el.querySelector(".mini-fr").textContent, ja: el.querySelector(".mini-ja").textContent }));
  check("入れ替え：行き先「マントン」の完成文と日本語訳", t01.fr === "Un billet pour Menton, s'il vous plaît." && t01.ja === "マントンまでの切符を1枚ください", `${t01.fr} / ${t01.ja}`);
  await page.click('.ph[data-pid="t01"] [data-act="show-slot"] >> nth=0');
  check("入れ替えた完成文をそのまま見せられる", (await page.textContent("#show-fr")) === "Un billet pour Menton, s'il vous plaît.");
  await page.click(".show-close");

  await page.goto(base + "#/c/cafe");
  await page.waitForSelector(".ph");
  await page.click('.ph[data-pid="c01"] [data-act="more"] >> nth=0');
  await page.click('.ph[data-pid="c01"] .slot .chip:has-text("クロワッサン") >> nth=0');
  await page.click('.ph[data-pid="c01"] .slot [data-act="slot-count"][data-n="2"] >> nth=0');
  const c01 = await page.$eval('.ph[data-pid="c01"] .slot-out', (el) => ({ fr: el.querySelector(".mini-fr").textContent, ja: el.querySelector(".mini-ja").textContent }));
  check("入れ替え：クロワッサン×2 → Deux croissants（複数形）", c01.fr === "Deux croissants, s'il vous plaît." && c01.ja === "クロワッサンを2つください", `${c01.fr} / ${c01.ja}`);
  await page.click('.ph[data-pid="c01"] .slot .chip:has-text("ホットチョコレート") >> nth=0');
  const c01b = await page.$eval('.ph[data-pid="c01"] .slot-out .mini-fr', (el) => el.textContent);
  check("入れ替え：ホットチョコレート×2 → Deux chocolats chauds", c01b === "Deux chocolats chauds, s'il vous plaît.", c01b);
  await shot(page, "06-slot.png");

  // 検索
  await page.goto(base + "#/search");
  await page.waitForSelector("#q");
  const searches = [
    ["お会計", "r23"], ["支払い", "r24"], ["カード", "s18"], ["addition", "r23"],
    ["L'ADDITION", "r23"], ["s il vous plait", "b21"], ["cafe creme", "c01"], ["oeufs", "d01"], ["トイレ", "c15"], ["greve", "t23"]
  ];
  for (const [q, id] of searches) {
    await page.fill("#q", q);
    await page.waitForFunction((id) => !!document.querySelector(`#results .ph[data-pid="${id}"]`), id, { timeout: 3000 }).catch(() => {});
    const found = await page.$(`#results .ph[data-pid="${id}"]`);
    const count = await page.textContent(".result-count").catch(() => "0件");
    check(`検索「${q}」で ${id} が見つかる`, !!found, count);
  }
  await page.fill("#q", "お会計");
  await page.waitForSelector('#results .ph[data-pid="r23"]');
  await shot(page, "07-search.png");
  const searchOv = await noHorizontalOverflow(page);
  check("検索画面で横はみ出しなし", searchOv.ok, searchOv.ok ? "" : JSON.stringify(searchOv));

  // お気に入り（再読み込み後も残る）
  await page.goto(base + "#/c/restaurant");
  await page.waitForSelector(".ph");
  await page.click('.ph[data-pid="r23"] [data-act="fav"] >> nth=0');
  await page.click('.ph[data-pid="r15"] [data-act="fav"] >> nth=0');
  await page.reload();
  await page.goto(base + "#/favorites");
  await page.waitForSelector(".page-head");
  const favIds = await page.$$eval("main .ph", (l) => l.map((x) => x.getAttribute("data-pid")));
  check("お気に入りが再読み込み後も残る", favIds.includes("r23") && favIds.includes("r15"), favIds.join(","));
  await page.click('.ph[data-pid="r15"] [data-act="fav"]');
  await page.reload();
  await page.waitForSelector(".page-head");
  const favIds2 = await page.$$eval("main .ph", (l) => l.map((x) => x.getAttribute("data-pid")));
  check("お気に入りをワンタップで解除できる", favIds2.includes("r23") && !favIds2.includes("r15"), favIds2.join(","));

  // 必須・案内ページ
  await page.goto(base + "#/essentials");
  await page.waitForSelector(".ph");
  const essN = await page.$$eval("main .ph", (l) => l.length);
  check("必須フレーズページに20〜30件", essN >= 20 && essN <= 30, `${essN}件`);
  await page.goto(base + "#/guide");
  await page.waitForSelector("#voice-status");
  check("使い方ページに音声の状態とホーム画面追加の説明", /ホーム画面に追加/.test(await page.textContent("main")) && (await page.textContent("#voice-status")).length > 5);
  await page.click('.ph-main >> nth=0').catch(() => {});

  // 読み上げ（このテスト環境に音声がない場合でも、分かりやすいメッセージが出ること）
  await page.goto(base + "#/c/basic");
  await page.waitForSelector(".ph");
  await page.click('.ph[data-pid="b01"] [data-act="more"] >> nth=0');
  await page.click('.ph[data-pid="b01"] .ph-detail [data-act="speak-text"]');
  await page.waitForTimeout(300);
  const toast = await page.evaluate(() => { const t = document.getElementById("toast"); return t.hidden ? "" : t.textContent; });
  const vstat = await page.evaluate(() => (window.speechSynthesis ? window.speechSynthesis.getVoices().filter((v) => /^fr/i.test(v.lang)).length : -1));
  check("読み上げ：音声がない環境では案内を表示（ある環境では読み上げ）", vstat > 0 || /音声|読み上げ/.test(toast), vstat > 0 ? "フランス語音声あり" : toast);

  // ---------- オフライン ----------
  await page.goto(base);
  await page.waitForFunction(() => /オフライン準備完了/.test(document.getElementById("offline-status")?.textContent || ""), null, { timeout: 15000 });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector(".toc a", { timeout: 5000 }).catch(() => {});
  check("機内モード（オフライン）で再読み込みしても目次が出る", (await page.$$(".toc a")).length === 17);
  await page.goto(base + "#/c/beach");
  await page.waitForSelector(".ph", { timeout: 5000 }).catch(() => {});
  check("オフラインでカテゴリー本文を閲覧できる", (await page.$$("main .ph")).length > 5);
  await page.goto(base + "#/search");
  await page.waitForSelector("#q");
  await page.fill("#q", "addition");
  await page.waitForSelector('#results .ph[data-pid="r23"]', { timeout: 3000 }).catch(() => {});
  check("オフラインで検索できる", !!(await page.$('#results .ph[data-pid="r23"]')));
  await page.goto(base + "#/favorites");
  await page.waitForSelector(".page-head");
  check("オフラインでお気に入りを開ける", !!(await page.$('main .ph[data-pid="r23"]')));
  const ext = await page.evaluate(() => performance.getEntriesByType("resource").map((e) => e.name).filter((n) => !n.startsWith(location.origin)));
  check("外部への通信がない（フォント・アイコンも端末内）", ext.length === 0, ext.join(", "));
  await ctx.setOffline(false);
  await ctx.close();

  // ---------- 小さい画面（320px）・大きい文字 ----------
  const small = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const sp = await small.newPage();
  sp.on("pageerror", (e) => pageErrors.push(String(e)));
  await sp.goto(base);
  await sp.evaluate(() => localStorage.setItem("pb-fr.settings.v1", JSON.stringify({ large: true, kana: true })));
  for (const h of ["#/", "#/c/train", "#/c/diet", "#/c/numbers", "#/emergency", "#/guide", "#/essentials"]) {
    await sp.goto(base + h);
    await sp.waitForSelector("main > *");
    await sp.$$eval('[data-act="more"]', (bs) => bs.forEach((b) => b.click()));
    const ov = await noHorizontalOverflow(sp);
    check(`320px・文字大で ${h} の横はみ出しなし`, ov.ok, ov.ok ? "" : JSON.stringify(ov));
  }
  await sp.goto(base + "#/c/sos");
  await sp.waitForSelector(".ph");
  await sp.click('.ph[data-pid="e20"] .ph-main >> nth=0');
  const fit320 = await sp.evaluate(() => {
    const de = document.getElementById("show-fr");
    return { right: de.getBoundingClientRect().right, w: window.innerWidth, size: getComputedStyle(de).fontSize };
  });
  check("320px で長い文（被害届の控え）も見せるモードに収まる", fit320.right <= fit320.w, fit320.size);
  await small.close();

  check("ページ内のJavaScriptエラーなし", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 件 OK`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
