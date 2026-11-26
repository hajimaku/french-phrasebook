#!/usr/bin/env node
/*
 * フレーズデータと検索の検証。
 *   node tools/validate.cjs
 * 失敗があれば終了コード 1。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILES = ["data/core.js", "data/phrases-1.js", "data/phrases-2.js", "data/phrases-3.js", "data/phrases-4.js", "data/conversations.js", "js/search.js"];

function load() {
  const ctx = { console };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of DATA_FILES) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  }
  return ctx.PB;
}

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

const PB = load();
const { categories, phrases, dialogues, questions } = PB;
const byId = new Map();

// ---- 件数 ----
const total = phrases.length;
if (total < 250 || total > 350) err(`総フレーズ数 ${total} が 250〜350 の範囲外`);
if (categories.length !== 17) err(`カテゴリー数が17ではない: ${categories.length}`);

// ---- ID 重複 ----
const allIds = [...phrases.map((p) => p.id), ...dialogues.map((d) => d.id), ...questions.map((q) => q.id)];
const seen = new Set();
for (const id of allIds) {
  if (seen.has(id)) err(`ID重複: ${id}`);
  seen.add(id);
}
phrases.forEach((p) => byId.set(p.id, p));

// ---- 文字種チェック ----
const KANA_RE = /^[゠-ヿ\s]+$/; // カタカナ・長音・空白のみ
const JP_RE = /[぀-ヿ一-鿿]/;
function checkDe(s, where) {
  if (!s || !s.trim()) err(`${where}: フランス語が空`);
  else if (JP_RE.test(s)) err(`${where}: フランス語に日本語文字が混入: ${s}`);
}
function checkJa(s, where) {
  if (!s || !s.trim()) err(`${where}: 日本語が空`);
  else if (!JP_RE.test(s)) err(`${where}: 日本語に日本語文字がない: ${s}`);
}
function checkKana(s, where) {
  if (!s || !s.trim()) err(`${where}: カタカナが空`);
  else if (!KANA_RE.test(s)) err(`${where}: カタカナ以外の文字: ${s}`);
}

// ---- フレーズ必須項目 ----
const catMap = new Map(categories.map((c) => [c.id, c]));
for (const p of phrases) {
  const w = `[${p.id}]`;
  if (!catMap.has(p.category)) err(`${w} 不明なカテゴリー ${p.category}`);
  const c = catMap.get(p.category);
  if (c && !c.scenes.some((s) => s.id === p.scene)) err(`${w} 不明な場面 ${p.scene}`);
  checkJa(p.ja, w);
  checkDe(p.fr, w);
  checkKana(p.kana, w);
  if (!p.note || !p.note.trim()) err(`${w} 補足が空`);
  if (!p.keywords.length) err(`${w} 検索キーワードが空`);
  if (![1, 2, 3].includes(p.importance)) err(`${w} 重要度が不正: ${p.importance}`);
  if (p.region && !PB.REGIONS[p.region]) err(`${w} 不明な地域ラベル ${p.region}`);
  for (const r of p.replies) {
    checkDe(r.fr, `${w} 返答`);
    checkJa(r.ja, `${w} 返答`);
    for (const n of r.next) if (!byId.has(n) && !phrases.some((x) => x.id === n)) err(`${w} 返答の次フレーズ ${n} が存在しない`);
  }
  for (const a of p.alternatives) {
    checkDe(a.fr, `${w} 別表現`);
    checkKana(a.kana, `${w} 別表現`);
    checkJa(a.ja, `${w} 別表現`);
  }
  if (p.slot) {
    if (p.slot.kind === "choice") {
      if (p.slot.options.length < 2) err(`${w} 入れ替え候補が2つ未満`);
      p.slot.options.forEach((o, i) => {
        const ww = `${w} 入れ替え#${i}`;
        if (!o.label) err(`${ww} ラベルが空`);
        checkDe(o.fr, ww);
        checkKana(o.kana, ww);
        checkJa(o.ja, ww);
      });
      const first = p.slot.options[0];
      if (first.fr !== p.fr) err(`${w} 先頭の入れ替え候補と本文のフランス語が不一致: ${first.fr} / ${p.fr}`);
      if (first.ja !== p.ja) err(`${w} 先頭の入れ替え候補と本文の日本語が不一致: ${first.ja} / ${p.ja}`);
      if (first.kana !== p.kana) err(`${w} 先頭の入れ替え候補と本文のカタカナが不一致`);
      const des = new Set(p.slot.options.map((o) => o.fr));
      if (des.size !== p.slot.options.length) err(`${w} 入れ替え候補のフランス語が重複`);
    } else {
      if (p.slot.items.length < 2) err(`${w} 品目が2つ未満`);
      for (const it of p.slot.items) {
        for (const n of p.slot.counts) {
          const s = PB.composeOrder(it, n);
          checkDe(s.fr, `${w} ${it.label}×${n}`);
          checkKana(s.kana, `${w} ${it.label}×${n}`);
          checkJa(s.ja, `${w} ${it.label}×${n}`);
          if (!/^[A-ZÄÖÜ]/.test(s.fr)) err(`${w} 組み立て文が大文字で始まらない: ${s.fr}`);
        }
      }
      const b = PB.composeOrder(p.slot.items[0], 1);
      if (b.fr !== p.fr) err(`${w} 品目1つ目×1 と本文が不一致: ${b.fr} / ${p.fr}`);
      if (b.ja !== p.ja) err(`${w} 品目1つ目×1 と本文の日本語が不一致: ${b.ja} / ${p.ja}`);
      if (b.kana !== p.kana) err(`${w} 品目1つ目×1 と本文のカタカナが不一致`);
    }
  }
}

// ---- カテゴリーごとの充足 ----
for (const c of categories) {
  const list = phrases.filter((p) => p.category === c.id);
  if (!list.length) err(`カテゴリー ${c.title} にフレーズがない`);
  const first = list.filter((p) => p.first).length;
  if (first < 3 || first > 5) err(`カテゴリー ${c.title} の「まず使う表現」が ${first} 件（3〜5件にする）`);
  for (const s of c.scenes) {
    if (!list.some((p) => p.scene === s.id)) err(`カテゴリー ${c.title} の場面「${s.title}」にフレーズがない`);
  }
}

// ---- 必須フレーズ ----
const essentials = phrases.filter((p) => p.essential);
if (essentials.length < 20 || essentials.length > 30) err(`必須フレーズが ${essentials.length} 件（20〜30件にする）`);

// ---- 会話例 ----
for (const d of dialogues) {
  const w = `[${d.id}]`;
  if (!catMap.has(d.category)) err(`${w} 不明なカテゴリー`);
  const me = d.lines.filter((l) => l.speaker === "me").length;
  const other = d.lines.length - me;
  if (me < 1 || other < 1) err(`${w} 旅行者と相手の両方の発言が必要`);
  const exchanges = Math.min(me, other);
  if (d.lines.length < 3 || d.lines.length > 8) err(`${w} 行数 ${d.lines.length} が2〜4往復の範囲外`);
  if (exchanges > 4) err(`${w} 往復数が多すぎる`);
  d.lines.forEach((l, i) => {
    if (!l.speaker) err(`${w}#${i} 話者が空`);
    checkDe(l.fr, `${w}#${i}`);
    checkJa(l.ja, `${w}#${i}`);
  });
}
if (dialogues.length < 15) err(`会話例が少ない: ${dialogues.length}`);

// ---- よく聞かれること ----
const mustQuestions = [
  "Sur place ou à emporter ?",
  "Vous payez par carte ou en espèces ?",
  "Vous avez réservé ?",
  "Et avec ceci ?",
  "Vous voulez un sac ?",
  "Vous payez ensemble ou séparément ?"
].map(PB.typo);
for (const m of mustQuestions) if (!questions.some((q) => q.fr === m)) err(`重点の質問が未収録: ${m}`);
for (const q of questions) {
  const w = `[${q.id}]`;
  if (!catMap.has(q.category)) err(`${w} 不明なカテゴリー`);
  checkDe(q.fr, w);
  checkJa(q.ja, w);
  if (!q.answers.length) err(`${w} 答え方がない`);
  for (const a of q.answers) {
    if (a.ref) {
      if (!byId.has(a.ref)) err(`${w} 答えのフレーズ ${a.ref} が存在しない`);
    } else {
      checkDe(a.fr, `${w} 答え`);
      checkJa(a.ja, `${w} 答え`);
      checkKana(a.kana, `${w} 答え`);
    }
  }
}

// ---- 地域ラベル ----
if (!phrases.some((p) => p.region === "nice")) err("ニース・南仏の地域ラベルがない");
if (!phrases.some((p) => p.region === "mc")) err("モナコの地域ラベルがない");

// ---- 検索 ----
const index = PB.search.buildIndex(PB);
const ids = (q) => PB.search.query(index, q).map((it) => it.id);
const expectSearch = [
  ["お会計", "r23"],
  ["支払い", "r23"],
  ["支払い", "r24"],
  ["カード", "r24"],
  ["カード", "s18"],
  ["かーど", "r24"],
  ["addition", "r23"],
  ["L'addition", "r23"],
  ["ADDITION", "r23"],
  ["l addition", "r23"],
  ["s'il vous plait", "b21"],
  ["silvousplait", "b21"],
  ["plait", "b21"],
  ["cafe", "c01"],
  ["café crème", "c01"],
  ["oeufs", "d01"],
  ["œufs", "d01"],
  ["francais", "h08"],
  ["Bonjour", "b01"],
  ["toilettes", "c15"],
  ["トイレ", "c15"],
  ["お手洗い", "w09"],
  ["ｶｰﾄﾞ", "r24"],
  ["アレルギー ナッツ", "d01"],
  ["遅れ", "t20"],
  ["ストライキ", "t23"],
  ["grève", "t23"],
  ["greve", "t23"],
  ["持ち帰り", "c12"],
  ["テイクアウト", "c12"],
  ["emporter", "c12"],
  ["袋", "s19"],
  ["パスポート", "e14"],
  ["wifi", "o11"],
  ["ロゼ", "vn01"],
  ["socca", "m12"],
  ["ソッカ", "m12"],
  ["デッキチェア", "bc05"],
  ["transat", "bc05"],
  ["カジノ", "v12"],
  ["モナコ", "t01"],
  ["マルシェ", "m01"],
  ["Sur place ou à emporter", "q-cafe-1"]
];
for (const [q, id] of expectSearch) {
  const r = ids(q);
  if (!r.includes(id)) err(`検索「${q}」で ${id} が見つからない（上位: ${r.slice(0, 5).join(", ")}）`);
}
if (ids("zzzzqqq").length) err("無関係な語で結果が出た");

// ---- Service Worker のキャッシュ対象 ----
const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const m = sw.match(/const ASSETS = \[([\s\S]*?)\];/);
if (!m) err("sw.js の ASSETS が見つからない");
else {
  const listed = new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1].replace(/^\.\//, "")));
  const walk = (dir) =>
    fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.posix.join(dir, e.name);
      return e.isDirectory() ? walk(rel) : [rel];
    });
  const shipped = ["index.html", "manifest.webmanifest", ...["css", "js", "data", "icons"].flatMap(walk)];
  for (const f of shipped) if (!listed.has(f)) err(`sw.js の ASSETS に未登録: ${f}`);
  for (const f of listed) if (f && f !== "" && !fs.existsSync(path.join(ROOT, f))) err(`ASSETS のファイルが存在しない: ${f}`);
  // index.html が読み込むファイルがすべてキャッシュ対象か
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const [, src] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) {
    const f = src.replace(/^\.\//, "");
    if (f && !listed.has(f)) err(`index.html が参照する ${f} が ASSETS にない`);
  }
  if (/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, ""))) err("index.html に外部URLの参照がある");
}

// ---- 結果 ----
const perCat = categories.map((c) => `${String(c.no).padStart(2, "0")} ${c.title}: ${phrases.filter((p) => p.category === c.id).length}`);
console.log(perCat.join("\n"));
console.log(`---\nフレーズ ${total} 件 / 必須 ${essentials.length} 件 / 入れ替え ${phrases.filter((p) => p.slot).length} 件 / 返答付き ${phrases.filter((p) => p.replies.length).length} 件`);
console.log(`会話例 ${dialogues.length} 件 / よく聞かれること ${questions.length} 件 / 検索テスト ${expectSearch.length} 件`);
if (warn.length) console.log("警告:\n" + warn.join("\n"));
if (errors.length) {
  console.error(`\n✗ ${errors.length} 件の問題:\n` + errors.join("\n"));
  process.exit(1);
}
console.log("\n✓ データ検証 OK");
