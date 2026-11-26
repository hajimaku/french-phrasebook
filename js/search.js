/*
 * 全文検索。日本語（ひらがな／カタカナ／全角半角）とフランス語（大文字小文字・アクセント記号の省略・œ/oe・アポストロフィ）を
 * 正規化し、関連語（お会計 ≒ 支払い ≒ addition など）でも見つかるようにする。
 * ブラウザでは PB.search、Node では module.exports として使う。
 */
(function (g) {
  "use strict";
  var PB = g.PB || (g.PB = {});

  // 関連語グループ。どれか1語で検索すると、グループ全体で探す。
  var SYNONYMS = [
    ["会計", "お会計", "勘定", "お勘定", "支払", "支払い", "払う", "払い", "精算", "addition", "payer", "paiement", "régler"],
    ["カード", "クレジット", "クレカ", "デビット", "キャッシュレス", "carte", "carte bancaire", "carte de crédit"],
    ["現金", "キャッシュ", "お札", "小銭", "espèces", "liquide", "monnaie"],
    ["トイレ", "お手洗い", "手洗い", "便所", "化粧室", "wc", "toilettes"],
    ["駅", "ホーム", "番線", "gare", "quai", "voie", "arrêt", "station"],
    ["電車", "列車", "鉄道", "train", "ter", "tram", "tramway"],
    ["バス", "bus", "autobus"],
    ["切符", "チケット", "乗車券", "入場券", "billet", "ticket", "titre de transport"],
    ["荷物", "スーツケース", "バッグ", "かばん", "鞄", "bagage", "bagages", "valise", "sac"],
    ["予約", "リザーブ", "réservation", "réservé", "réserver"],
    ["病気", "体調", "具合", "気分が悪い", "病院", "医者", "malade", "médecin", "hôpital"],
    ["薬", "薬局", "pharmacie", "médicament"],
    ["水", "お水", "ミネラルウォーター", "eau", "carafe"],
    ["ワイン", "ロゼ", "vin", "rosé", "verre de vin"],
    ["ビール", "bière", "pression", "demi"],
    ["持ち帰り", "お持ち帰り", "テイクアウト", "emporter"],
    ["店内", "イートイン", "sur place"],
    ["袋", "レジ袋", "ビニール袋", "sac", "sachet"],
    ["レシート", "領収書", "ticket de caisse", "reçu", "facture"],
    ["警察", "交番", "police", "commissariat"],
    ["なくした", "無くした", "失くした", "紛失", "落とし物", "忘れ物", "perdu", "objets trouvés"],
    ["盗難", "盗まれた", "スリ", "泥棒", "volé", "vol"],
    ["アレルギー", "allergie", "allergique"],
    ["写真", "撮影", "撮る", "カメラ", "photo", "photos"],
    ["遅延", "遅れ", "遅れる", "運休", "欠航", "retard", "supprimé", "annulé", "grève"],
    ["ストライキ", "スト", "grève"],
    ["ありがとう", "お礼", "感謝", "merci"],
    ["すみません", "ごめん", "謝罪", "pardon", "excusez-moi"],
    ["英語", "english", "anglais"],
    ["値段", "価格", "いくら", "料金", "金額", "prix", "combien"],
    ["wi-fi", "wifi", "ワイファイ", "インターネット", "ネット", "wi fi"],
    ["席", "座席", "テーブル", "place", "table"],
    ["注文", "オーダー", "頼む", "commander", "commande"],
    ["乗り換え", "乗換", "correspondance", "changer"],
    ["こんにちは", "挨拶", "bonjour", "salut"],
    ["コーヒー", "カフェ", "café", "expresso"],
    ["パン", "パン屋", "バゲット", "クロワッサン", "pain", "baguette", "boulangerie", "croissant"],
    ["道", "迷った", "道案内", "行き方"],
    ["出口", "sortie"],
    ["入口", "entrée"],
    ["ビーチ", "海", "海辺", "浜", "plage", "mer"],
    ["市場", "マルシェ", "marché"],
    ["ノンアルコール", "アルコールなし", "sans alcool"],
    ["モナコ", "monaco", "monte-carlo", "モンテカルロ"]
  ];

  /** 日本語向けの正規化：NFKC・小文字・カタカナ→ひらがな・記号除去 */
  function base(s) {
    s = String(s == null ? "" : s).normalize("NFKC").toLowerCase();
    // カタカナ → ひらがな（ー は残す）
    s = s.replace(/[\u30a1-\u30f6]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
    // 記号・句読点・アポストロフィを空白に
    s = s.replace(/[.,!?;:'"’‘«»()［］\[\]「」『』、。・…！？／/＝=＋+\-–—€%°]/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }
  /** アクセント記号を外す（é→e, à→a, ç→c, œ→oe）。日本語の濁点は保つ */
  function v1(s) {
    return base(s).replace(/œ/g, "oe").replace(/æ/g, "ae")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  }
  /** さらに空白も詰める（「silvousplait」「laddition」のような入力に対応） */
  function v2(s) {
    return v1(s).replace(/ /g, "");
  }
  function forms(s) {
    return { a: v1(s), b: v2(s) };
  }

  var SYN = SYNONYMS.map(function (group) {
    return group.map(forms);
  });

  var SHORT_LATIN = /^[a-z0-9]{1,3}$/;
  function hasWord(text, w) {
    var i = text.indexOf(w);
    while (i >= 0) {
      var before = i === 0 ? " " : text.charAt(i - 1);
      var after = i + w.length >= text.length ? " " : text.charAt(i + w.length);
      if (/[\s|]/.test(before) && /[\s|]/.test(after)) return true;
      i = text.indexOf(w, i + 1);
    }
    return false;
  }
  function matchesForm(hay, f) {
    // 3文字以下の欧文（eau・vin など）は、別の単語の一部（beaucoup・vingt）に当たらないよう単語単位で探す
    if (SHORT_LATIN.test(f.a)) return hasWord(hay.a, f.a);
    return (f.a && hay.a.indexOf(f.a) >= 0) || (f.b && hay.b.indexOf(f.b) >= 0);
  }

  /** 1語に対する検索候補（本人＋関連語） */
  function expandToken(tok) {
    var t = forms(tok);
    var out = [t];
    SYN.forEach(function (group) {
      var hit = group.some(function (m) {
        if (m.a === t.a || m.b === t.b) return true;
        // 「お会計お願い」のように関連語を含む入力にも反応させる
        var minLen = /^[a-z0-9 ]+$/.test(m.a) ? 5 : 2; // 短い欧文（eau など）は別の語の一部に反応させない
        if (m.a.length >= minLen && (t.a.indexOf(m.a) >= 0 || t.b.indexOf(m.b) >= 0)) return true;
        return false;
      });
      if (hit) out = out.concat(group);
    });
    return out;
  }

  function phraseText(p, ctx) {
    var parts = { primary: [p.ja, p.fr], keywords: p.keywords.slice(), other: [p.kana, p.note] };
    if (ctx) {
      parts.other.push(ctx.categoryTitle, ctx.sceneTitle);
    }
    p.alternatives.forEach(function (a) { parts.other.push(a.fr, a.ja, a.kana); });
    p.replies.forEach(function (r) { parts.other.push(r.fr, r.ja); });
    if (p.slot) {
      if (p.slot.kind === "choice") {
        p.slot.options.forEach(function (o) { parts.other.push(o.label, o.fr, o.ja); });
      } else {
        p.slot.items.forEach(function (i) { parts.other.push(i.label, i.one, i.pl, i.ja); });
      }
    }
    return parts;
  }

  function makeHay(list) {
    var joined = list.filter(Boolean).join(" | ");
    return { a: v1(joined), b: v2(joined) };
  }

  /**
   * 検索インデックスを作る。
   * items: [{ kind, id, ref, primary:[...], keywords:[...], other:[...], importance }]
   */
  function buildIndex(data) {
    var cats = {};
    data.categories.forEach(function (c) { cats[c.id] = c; });
    var items = [];
    data.phrases.forEach(function (p) {
      var c = cats[p.category];
      var scene = c.scenes.filter(function (s) { return s.id === p.scene; })[0];
      var t = phraseText(p, { categoryTitle: c.title, sceneTitle: scene ? scene.title : "" });
      items.push({
        kind: "phrase", id: p.id, ref: p, importance: p.importance,
        primary: makeHay(t.primary), keywords: makeHay(t.keywords), other: makeHay(t.other)
      });
    });
    (data.questions || []).forEach(function (q) {
      items.push({
        kind: "question", id: q.id, ref: q, importance: 2,
        primary: makeHay([q.fr, q.ja]), keywords: makeHay([]), other: makeHay([q.note])
      });
    });
    return items;
  }

  function query(index, q, limit) {
    var tokens = base(q).split(" ").filter(Boolean);
    if (!tokens.length) return [];
    var expanded = tokens.map(expandToken);
    var results = [];
    index.forEach(function (it) {
      var score = 0;
      for (var i = 0; i < expanded.length; i++) {
        var variants = expanded[i];
        var own = variants[0];
        var best = 0;
        // 入力そのものの一致を最優先
        if (matchesForm(it.primary, own)) best = 10;
        else if (matchesForm(it.keywords, own)) best = 7;
        else if (matchesForm(it.other, own)) best = 4;
        if (best < 4) {
          for (var j = 1; j < variants.length; j++) {
            var v = variants[j];
            if (matchesForm(it.primary, v)) { best = Math.max(best, 6); break; }
            if (matchesForm(it.keywords, v)) best = Math.max(best, 5);
            else if (matchesForm(it.other, v)) best = Math.max(best, 2);
          }
        }
        if (!best) return; // すべての語が一致する必要がある
        score += best;
      }
      score += it.importance; // 重要な表現を上に
      if (it.ref.first) score += 1;
      results.push({ item: it, score: score });
    });
    results.sort(function (x, y) { return y.score - x.score; });
    return results.slice(0, limit || 80).map(function (r) { return r.item; });
  }

  PB.search = { buildIndex: buildIndex, query: query, normalize: { base: base, v1: v1, v2: v2 } };
  if (typeof module !== "undefined" && module.exports) module.exports = PB.search;
})(typeof window !== "undefined" ? window : globalThis);
