/* フランス語 旅の会話帳 — 画面と操作。外部通信なし。 */
(function () {
  "use strict";

  var PB = window.PB;
  var main = document.getElementById("main");
  var topTitle = document.getElementById("topbar-title");
  var APP_NAME = "仏語 会話帳";

  /* ---------- 小道具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name) {
    return '<svg class="ic" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  }
  var store = {
    get: function (k, def) {
      try {
        var v = window.localStorage.getItem(k);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set: function (k, v) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // 同じドメインのドイツ語版（pb.*）と混ざらないよう、保存キーを分ける
  var FAV_KEY = "pb-fr.favorites.v1";
  var SET_KEY = "pb-fr.settings.v1";
  var favs = store.get(FAV_KEY, []);
  if (!Array.isArray(favs)) favs = [];
  var settings = Object.assign({ kana: false, large: false, rate: 0.85, theme: "auto" }, store.get(SET_KEY, {}));

  var byId = new Map(PB.phrases.map(function (p) { return [p.id, p]; }));
  var catById = new Map(PB.categories.map(function (c) { return [c.id, c]; }));
  var searchIndex = PB.search.buildIndex(PB);

  function sceneOf(p) {
    var c = catById.get(p.category);
    return c.scenes.filter(function (s) { return s.id === p.scene; })[0];
  }
  function isFav(id) {
    return favs.indexOf(id) >= 0;
  }

  function applySettings() {
    document.body.classList.toggle("show-kana", !!settings.kana);
    document.documentElement.classList.toggle("large", !!settings.large);
    if (settings.theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", settings.theme);
  }
  function saveSettings() {
    store.set(SET_KEY, settings);
    applySettings();
  }

  /* ---------- トースト ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 3500);
  }

  /* ---------- 音声読み上げ ---------- */
  var speech = {
    supported: "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function",
    voices: function () {
      try { return window.speechSynthesis.getVoices() || []; } catch (e) { return []; }
    },
    frenchVoice: function () {
      var de = this.voices().filter(function (v) { return /^fr([-_]|$)/i.test(v.lang); });
      return de.filter(function (v) { return /^fr[-_]FR/i.test(v.lang); })[0] || de[0] || null;
    },
    /** "ok" | "none" | "unknown" | "unsupported" */
    status: function () {
      if (!this.supported) return "unsupported";
      var all = this.voices();
      if (!all.length) return "unknown";
      return this.frenchVoice() ? "ok" : "none";
    }
  };
  if (speech.supported) {
    speech.voices();
    try {
      window.speechSynthesis.addEventListener("voiceschanged", function () {
        var el = document.getElementById("voice-status");
        if (el) el.innerHTML = voiceStatusHTML();
      });
    } catch (e) { /* 古いブラウザ */ }
  }
  function speak(text) {
    if (!speech.supported) {
      toast("この端末・ブラウザは音声読み上げに対応していません。表示したフランス語を見せて伝えてください。");
      return;
    }
    var st = speech.status();
    if (st === "none") {
      toast("フランス語の音声が端末に見つかりません。「使い方」ページで追加方法を確認できます。", 5000);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(text.replace(/\s\/\s/g, ". "));
      u.lang = "fr-FR";
      var v = speech.frenchVoice();
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = settings.rate;
      u.onerror = function (e) {
        if (e && (e.error === "interrupted" || e.error === "canceled")) return;
        toast("読み上げできませんでした。端末の音声設定を確認してください。");
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      toast("読み上げできませんでした。");
    }
  }
  function voiceStatusHTML() {
    var st = speech.status();
    if (st === "unsupported") return '<span class="status error"><span class="status-dot"></span>このブラウザは読み上げに対応していません</span>';
    if (st === "ok") {
      var v = speech.frenchVoice();
      return '<span class="status ready"><span class="status-dot"></span>フランス語の音声を利用できます（' + esc(v.name) + "）</span>";
    }
    if (st === "none") return '<span class="status error"><span class="status-dot"></span>フランス語の音声が見つかりません（下の手順で追加できます）</span>';
    return '<span class="status pending"><span class="status-dot"></span>音声の一覧を確認中です（読み上げボタンを押すと試せます）</span>';
  }

  /* ---------- オフライン準備の状態 ---------- */
  var offline = { state: "checking", cached: 0, total: 0 };
  function offlineHTML() {
    var s = offline.state;
    if (s === "ready") {
      return '<div class="status ready"><span class="status-dot"></span><div><strong>オフライン準備完了</strong><br>全' + PB.phrases.length +
        "フレーズ・検索・お気に入りを通信なしで使えます。" + (navigator.onLine ? "" : "（現在オフライン）") + "</div></div>";
    }
    if (s === "unsupported") {
      return '<div class="status error"><span class="status-dot"></span><div><strong>オフライン保存は未対応の開き方です</strong><br>https のURL（または localhost）で開くと、端末に保存されます。</div></div>';
    }
    if (s === "partial") {
      return '<div class="status pending"><span class="status-dot"></span><div><strong>オフライン準備中</strong>（' + offline.cached + "/" + offline.total +
        "）<br>通信できる場所でこのページを開いたままお待ちください。</div></div>";
    }
    return '<div class="status pending"><span class="status-dot"></span><div><strong>オフライン準備を確認中…</strong><br>初回は通信できる場所で開いてください。</div></div>';
  }
  function paintOffline() {
    var el = document.getElementById("offline-status");
    if (el) el.innerHTML = offlineHTML();
  }
  function checkOffline() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol) || !window.isSecureContext) {
      offline.state = "unsupported";
      paintOffline();
      return;
    }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg || !reg.active) {
        offline.state = "checking";
        paintOffline();
        return;
      }
      var ch = new MessageChannel();
      var timer = setTimeout(function () { paintOffline(); }, 3000);
      ch.port1.onmessage = function (e) {
        clearTimeout(timer);
        var d = e.data || {};
        offline.state = d.missing === 0 ? "ready" : "partial";
        offline.cached = d.total - d.missing;
        offline.total = d.total;
        paintOffline();
      };
      reg.active.postMessage({ type: "status" }, [ch.port2]);
    }).catch(function () {
      offline.state = "checking";
      paintOffline();
    });
  }
  function registerSW() {
    if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol) || !window.isSecureContext) {
      checkOffline();
      return;
    }
    navigator.serviceWorker.register("sw.js").then(function () {
      return navigator.serviceWorker.ready;
    }).then(checkOffline).catch(function () {
      offline.state = "unsupported";
      paintOffline();
    });
    navigator.serviceWorker.addEventListener("message", function (e) {
      if (e.data && e.data.type === "cached") checkOffline();
    });
    navigator.serviceWorker.addEventListener("controllerchange", checkOffline);
    window.addEventListener("online", paintOffline);
    window.addEventListener("offline", paintOffline);
  }

  /* ---------- フレーズ行 ---------- */
  var uid = 0;
  function tagsHTML(p, opt) {
    var tags = [];
    if (opt.showCat) {
      var sc = sceneOf(p);
      tags.push('<span class="tag cat">' + esc(catById.get(p.category).short) + "・" + esc(sc ? sc.title : "") + "</span>");
    }
    if (opt.markFirst && p.first) tags.push('<span class="tag first">まず使う</span>');
    if (p.region) tags.push('<span class="tag region">' + esc(PB.REGIONS[p.region]) + "</span>");
    if (p.slot) tags.push('<span class="tag slot">入れ替え可</span>');
    if (p.type === "sign") tags.push('<span class="tag">表示</span>');
    if (p.type === "word") tags.push('<span class="tag">単語・数</span>');
    return tags.length ? '<span class="ph-meta">' + tags.join("") + "</span>" : "";
  }
  function phraseRow(p, opt) {
    opt = opt || {};
    var id = "ph" + ++uid;
    return (
      '<li class="ph" data-pid="' + p.id + '" data-ctx="' + (opt.showCat ? "other" : "cat") + '">' +
      '<div class="ph-row">' +
      '<button type="button" class="ph-main" data-act="show" data-id="' + p.id + '">' +
      '<span class="ph-ja">' + esc(p.ja) + "</span>" +
      '<span class="ph-fr" lang="fr">' + esc(p.fr) + "</span>" +
      '<span class="ph-kana">' + esc(p.kana) + "</span>" +
      tagsHTML(p, opt) +
      "</button>" +
      '<div class="ph-actions">' +
      '<button type="button" class="iconbtn" data-act="fav" data-id="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="お気に入り：' + esc(p.ja) + '">' + icon("star") + "</button>" +
      '<button type="button" class="iconbtn" data-act="more" data-id="' + p.id + '" aria-expanded="false" aria-controls="' + id + '" aria-label="読み方と補足">' + icon("chev") + "</button>" +
      "</div></div>" +
      '<div class="ph-detail" id="' + id + '" hidden></div>' +
      "</li>"
    );
  }
  function textBtnAttrs(de, ja, kana) {
    return ' data-fr="' + esc(de) + '" data-ja="' + esc(ja || "") + '" data-kana="' + esc(kana || "") + '"';
  }

  function slotValue(p, i, n) {
    if (p.slot.kind === "choice") return p.slot.options[i];
    return PB.composeOrder(p.slot.items[i], n);
  }
  function slotHTML(p) {
    var s = p.slot;
    var chips = "";
    if (s.kind === "choice") {
      chips = s.options.map(function (o, i) {
        return '<button type="button" class="chip" data-act="slot-opt" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(o.label) + "</button>";
      }).join("");
      chips = '<div class="chips" role="group" aria-label="' + esc(s.label) + '">' + chips + "</div>";
    } else {
      chips = '<div class="chips" role="group" aria-label="' + esc(s.label) + '">' + s.items.map(function (it, i) {
        return '<button type="button" class="chip" data-act="slot-opt" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(it.label) + "</button>";
      }).join("") + "</div>";
      chips += '<p class="d-label">個数</p><div class="chips" role="group" aria-label="個数">' + s.counts.map(function (n) {
        return '<button type="button" class="chip" data-act="slot-count" data-n="' + n + '" aria-pressed="' + (n === 1) + '">' + n + "</button>";
      }).join("") + "</div>";
    }
    var v = slotValue(p, 0, 1);
    return (
      '<div class="slot" data-slot="' + p.id + '" data-i="0" data-n="1">' +
      '<p class="d-label">入れ替え：' + esc(s.label) + "を選ぶ</p>" + chips +
      '<div class="slot-out"><span class="mini-fr" lang="fr">' + esc(v.fr) + '</span><span class="mini-kana">' + esc(v.kana) +
      '</span><span class="mini-ja">' + esc(v.ja) + "</span></div>" +
      '<div class="d-actions"><button type="button" class="btn primary" data-act="show-slot">' + icon("show") + "この文を見せる</button>" +
      '<button type="button" class="btn" data-act="speak-slot">' + icon("speaker") + "読み上げ</button></div>" +
      "</div>"
    );
  }

  function detailHTML(p, ctx) {
    var h = "";
    h += '<div class="d-block"><p class="d-label">読み方の目安</p><p class="d-kana">' + esc(p.kana) + "</p></div>";
    h += '<div class="d-block"><p class="d-label">使い方</p><p class="d-note">' + esc(p.note) + "</p></div>";
    if (p.region) {
      h += '<div class="d-block"><p class="d-note"><span class="tag region">' + esc(PB.REGIONS[p.region]) + "</span> で見聞きする言い方です。</p></div>";
    }
    if (p.slot) h += slotHTML(p);
    if (p.alternatives.length) {
      h += '<div class="d-block"><p class="d-label">ほかの言い方</p><ul class="alt-list">' + p.alternatives.map(function (a) {
        return '<li><button type="button" class="linkish" data-act="show-text"' + textBtnAttrs(a.fr, a.ja, a.kana) + '><span class="mini-fr" lang="fr">' + esc(a.fr) +
          '</span><span class="mini-kana">' + esc(a.kana) + '</span><span class="mini-ja">' + esc(a.ja) + "</span></button></li>";
      }).join("") + "</ul></div>";
    }
    if (p.replies.length) {
      h += '<div class="d-block"><p class="d-label">相手からの返事の例 → 次に言うこと</p><ul class="reply-list">' + p.replies.map(function (r) {
        var next = r.next.map(function (id) {
          var q = byId.get(id);
          return q ? '<button type="button" class="next-chip" data-act="show" data-id="' + q.id + '">' + esc(q.ja) + "</button>" : "";
        }).join("");
        return '<li><button type="button" class="linkish" data-act="speak-text" data-fr="' + esc(r.fr) + '" aria-label="読み上げ：' + esc(r.fr) + '"><span class="mini-fr" lang="fr">' + esc(r.fr) +
          '</span><span class="mini-ja">' + esc(r.ja) + "</span></button>" + (next ? '<div class="next">' + next + "</div>" : "") + "</li>";
      }).join("") + "</ul></div>";
    }
    h += '<div class="d-actions">';
    h += '<button type="button" class="btn primary" data-act="show" data-id="' + p.id + '">' + icon("show") + "見せる</button>";
    h += '<button type="button" class="btn" data-act="speak-text" data-fr="' + esc(p.fr) + '">' + icon("speaker") + "読み上げ</button>";
    if (ctx === "other") {
      h += '<a class="btn" href="#/c/' + p.category + "?s=" + p.scene + '">' + icon("book") + esc(catById.get(p.category).short) + "のページへ</a>";
    }
    h += "</div>";
    return h;
  }

  /* ---------- よく聞かれること・会話例 ---------- */
  function questionHTML(q) {
    var ans = q.answers.map(function (a) {
      if (a.ref) {
        var p = byId.get(a.ref);
        return '<button type="button" class="next-chip" data-act="show" data-id="' + p.id + '">' + esc(p.ja) + "</button>";
      }
      return '<button type="button" class="next-chip" data-act="show-text"' + textBtnAttrs(a.fr, a.ja, a.kana) + ">" + esc(a.ja) + "（" + esc(a.fr) + "）</button>";
    }).join("");
    return (
      '<li class="q"><div class="q-head">' +
      '<button type="button" class="linkish" data-act="speak-text" data-fr="' + esc(q.fr) + '" aria-label="読み上げ：' + esc(q.fr) + '">' +
      '<span class="q-fr" lang="fr">' + esc(q.fr) + '</span><span class="q-ja">' + esc(q.ja) + "</span></button>" +
      '<button type="button" class="iconbtn" data-act="speak-text" data-fr="' + esc(q.fr) + '" aria-label="読み上げ">' + icon("speaker") + "</button>" +
      "</div>" + (q.note ? '<p class="q-note">' + esc(q.note) + "</p>" : "") +
      '<div class="q-ans"><span class="q-ans-label">こう答える</span><div class="next">' + ans + "</div></div></li>"
    );
  }
  function dialogueHTML(d) {
    var lines = d.lines.map(function (l) {
      var me = l.speaker === "me";
      return (
        '<li class="line' + (me ? " me" : "") + '"><span class="who">' + (me ? "あなた" : esc(l.speaker)) + "</span>" +
        '<button type="button" class="bubble" data-act="show-text"' + textBtnAttrs(l.fr, l.ja, "") + ">" +
        '<span class="mini-fr" lang="fr">' + esc(l.fr) + '</span><span class="mini-ja">' + esc(l.ja) + "</span></button>" +
        '<button type="button" class="iconbtn" data-act="speak-text" data-fr="' + esc(l.fr) + '" aria-label="読み上げ">' + icon("speaker") + "</button></li>"
      );
    }).join("");
    return '<details class="dlg"><summary>' + esc(d.title) + icon("chev") + '</summary><ol class="dlg-lines">' + lines + "</ol></details>";
  }

  /* ---------- ページ ---------- */
  function setTitle(t) {
    topTitle.textContent = t || APP_NAME;
    document.title = t ? t + "｜" + APP_NAME : "フランス語 " + APP_NAME;
  }

  function renderToc() {
    setTitle("");
    var cats = PB.categories.map(function (c) {
      var n = PB.phrases.filter(function (p) { return p.category === c.id; }).length;
      return '<li><a href="#/c/' + c.id + '"><span class="no">' + String(c.no).padStart(2, "0") + "</span><span><span class=\"t\">" + esc(c.title) +
        '</span><span class="s">' + esc(c.scenes.map(function (s) { return s.title; }).join("・")) + '</span></span><span class="c">' + n + "</span></a></li>";
    }).join("");
    main.innerHTML =
      '<div class="hero"><h1>フランス語 旅の会話帳</h1><p>ニース・モナコ一人旅のための、場面別フレーズ集（全' + PB.phrases.length + "表現）</p></div>" +
      '<div class="notice" id="offline-status">' + offlineHTML() + "</div>" +
      '<div class="notice"><strong>カタカナは発音の目安です。</strong>フランス語の音を正確には表せないので、通じないときは画面を見せるか、読み上げを使ってください。</div>' +
      '<div class="quick">' +
      '<a href="#/essentials"><b>必須フレーズ</b><span>厳選' + PB.phrases.filter(function (p) { return p.essential; }).length + "表現</span></a>" +
      '<a href="#/emergency" class="sos"><b>緊急・トラブル</b><span>助けを呼ぶ・病院・紛失</span></a>' +
      '<a href="#/favorites"><b>お気に入り</b><span>保存した表現（' + favs.filter(function (id) { return byId.has(id); }).length + "）</span></a>" +
      '<a href="#/guide"><b>使い方・設定</b><span>ホーム画面に追加・音声</span></a>' +
      "</div>" +
      '<h2 class="section-title">目次<small>場面を選ぶ</small></h2><ul class="toc">' + cats + "</ul>";
  }

  function renderCategory(id, params) {
    var c = catById.get(id);
    if (!c) return renderNotFound();
    setTitle(c.title);
    var list = PB.phrases.filter(function (p) { return p.category === id; });
    var firsts = list.filter(function (p) { return p.first; });
    var qs = PB.questions.filter(function (q) { return q.category === id; });
    var ds = PB.dialogues.filter(function (d) { return d.category === id; });

    var jumps = ['<button type="button" class="jump is-first" data-act="jump" data-target="sec-first">まず使う</button>'];
    c.scenes.forEach(function (s) {
      jumps.push('<button type="button" class="jump" data-act="jump" data-target="sec-' + s.id + '">' + esc(s.title) + "</button>");
    });
    if (qs.length) jumps.push('<button type="button" class="jump" data-act="jump" data-target="sec-q">よく聞かれること</button>');
    if (ds.length) jumps.push('<button type="button" class="jump" data-act="jump" data-target="sec-dlg">会話例</button>');

    var h =
      '<div class="page-head"><div class="no">' + String(c.no).padStart(2, "0") + "</div><h1>" + esc(c.title) + "</h1><p>" + esc(c.intro) + "</p></div>" +
      '<div class="jumps">' + jumps.join("") + "</div>";
    h += '<section class="section"><h2 class="section-title is-first" id="sec-first">まず使う表現</h2><ul class="list">' +
      firsts.map(function (p) { return phraseRow(p); }).join("") + "</ul></section>";
    if (qs.length) {
      h += '<section class="section"><h2 class="section-title" id="sec-q">よく聞かれること<small>聞き取り → こう答える</small></h2><ul class="list">' +
        qs.map(questionHTML).join("") + "</ul></section>";
    }
    c.scenes.forEach(function (s) {
      var items = list.filter(function (p) { return p.scene === s.id; });
      h += '<section class="section"><h2 class="section-title" id="sec-' + s.id + '">' + esc(s.title) + "<small>" + items.length + "</small></h2><ul class=\"list\">" +
        items.map(function (p) { return phraseRow(p, { markFirst: true }); }).join("") + "</ul></section>";
    });
    if (ds.length) {
      h += '<section class="section"><h2 class="section-title" id="sec-dlg">会話例<small>タップで開く</small></h2>' + ds.map(dialogueHTML).join("") + "</section>";
    }
    main.innerHTML = h;
    return params.get("s") ? "sec-" + params.get("s") : null;
  }

  function renderEssentials() {
    setTitle("必須フレーズ");
    var ess = PB.phrases.filter(function (p) { return p.essential; });
    var h = '<div class="page-head"><h1>必須フレーズ</h1><p>旅のどこでも使う' + ess.length + "表現。迷ったらまずここから。</p></div>";
    PB.categories.forEach(function (c) {
      var items = ess.filter(function (p) { return p.category === c.id; });
      if (!items.length) return;
      h += '<section class="section"><h2 class="section-title">' + esc(c.title) + '</h2><ul class="list">' +
        items.map(function (p) { return phraseRow(p, { showCat: true }); }).join("") + "</ul></section>";
    });
    main.innerHTML = h;
  }

  function renderFavorites() {
    setTitle("お気に入り");
    var items = favs.map(function (id) { return byId.get(id); }).filter(Boolean);
    var h = '<div class="page-head"><h1>お気に入り</h1><p>☆をタップした表現が、この端末に保存されます。</p></div>';
    if (!items.length) {
      h += '<p class="empty">まだありません。<br>よく使う表現の ☆ をタップすると、ここに集まります。</p>';
    } else {
      h += '<ul class="list">' + items.map(function (p) { return phraseRow(p, { showCat: true }); }).join("") + "</ul>";
    }
    main.innerHTML = h;
  }

  function renderEmergency() {
    setTitle("緊急・トラブル");
    var c = catById.get("sos");
    var list = PB.phrases.filter(function (p) { return p.category === "sos"; });
    var h =
      '<div class="page-head"><h1>緊急・トラブル</h1><p>タップすると大きく表示します。周りの人に見せてください。</p></div>' +
      '<div class="sos-card"><h2>緊急電話番号</h2><dl>' +
      "<dt>112</dt><dd>救急・消防・警察（ヨーロッパ共通。フランス・モナコとも）</dd>" +
      "<dt>15</dt><dd>救急医療（SAMU・フランス）</dd>" +
      "<dt>17</dt><dd>警察（フランス・モナコ）</dd>" +
      "<dt>18</dt><dd>消防（フランス・モナコ。けが人の救助も）</dd>" +
      "</dl><p>迷ったら 112 にかけてください。ニース・モナコを管轄する在マルセイユ日本国総領事館、カード会社、保険会社の連絡先は、出発前に控えておきましょう。</p></div>";
    h += '<section class="section"><h2 class="section-title is-sos">まず使う表現</h2><ul class="list">' +
      list.filter(function (p) { return p.first; }).map(function (p) { return phraseRow(p); }).join("") + "</ul></section>";
    c.scenes.forEach(function (s) {
      h += '<section class="section"><h2 class="section-title">' + esc(s.title) + '</h2><ul class="list">' +
        list.filter(function (p) { return p.scene === s.id; }).map(function (p) { return phraseRow(p, { markFirst: true }); }).join("") + "</ul></section>";
    });
    var helpIds = ["h01", "h05", "h10", "e05"];
    h += '<section class="section"><h2 class="section-title">伝わらないとき</h2><ul class="list">' +
      helpIds.map(function (id) { return byId.get(id); }).filter(Boolean).map(function (p) { return phraseRow(p, { showCat: true }); }).join("") + "</ul></section>";
    var qs = PB.questions.filter(function (q) { return q.category === "sos"; });
    h += '<section class="section"><h2 class="section-title">よく聞かれること</h2><ul class="list">' + qs.map(questionHTML).join("") + "</ul></section>";
    h += '<section class="section"><h2 class="section-title">会話例</h2>' + PB.dialogues.filter(function (d) { return d.category === "sos"; }).map(dialogueHTML).join("") + "</section>";
    main.innerHTML = h;
  }

  var SUGGEST = ["お会計", "トイレ", "カード", "切符", "ストライキ", "アレルギー", "持ち帰り", "ビーチ", "addition", "s'il vous plait"];
  function renderSearch(params) {
    setTitle("検索");
    var q = params.get("q") || "";
    main.innerHTML =
      '<div class="searchbox"><input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"' +
      ' placeholder="日本語・フランス語で検索（例：お会計、addition）" aria-label="フレーズを検索" value="' + esc(q) + '"></div>' +
      '<div id="results"></div>';
    var input = document.getElementById("q");
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var v = input.value;
        var url = "#/search" + (v ? "?q=" + encodeURIComponent(v) : "");
        history.replaceState(history.state, "", url);
        paintResults(v);
      }, 120);
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") input.blur();
    });
    paintResults(q);
    return input;
  }
  function paintResults(q) {
    var box = document.getElementById("results");
    if (!box) return;
    if (!q.trim()) {
      box.innerHTML =
        '<p class="hint">日本語・フランス語・読み方・補足から探します。é・à・ç などのアクセント記号を省いても、œ を oe と入力しても見つかります。</p>' +
        '<div class="jumps">' + SUGGEST.map(function (s) {
          return '<button type="button" class="jump" data-act="suggest" data-q="' + esc(s) + '">' + esc(s) + "</button>";
        }).join("") + "</div>";
      return;
    }
    var res = PB.search.query(searchIndex, q, 80);
    if (!res.length) {
      box.innerHTML = '<p class="empty">「' + esc(q) + "」に合う表現は見つかりませんでした。<br>短い言葉や別の言い方で試してください。</p>";
      return;
    }
    var phrases = res.filter(function (r) { return r.kind === "phrase"; });
    var qs = res.filter(function (r) { return r.kind === "question"; });
    var h = '<p class="result-count">' + res.length + "件</p>";
    if (phrases.length) h += '<ul class="list">' + phrases.map(function (r) { return phraseRow(r.ref, { showCat: true }); }).join("") + "</ul>";
    if (qs.length) {
      h += '<section class="section"><h2 class="section-title">相手からよく聞かれること</h2><ul class="list">' + qs.map(function (r) { return questionHTML(r.ref); }).join("") + "</ul></section>";
    }
    box.innerHTML = h;
  }

  function renderGuide() {
    setTitle("使い方・設定");
    var counts = PB.phrases.length + "表現・" + PB.categories.length + "カテゴリー・会話例" + PB.dialogues.length + "件・よく聞かれること" + PB.questions.length + "件";
    function sw(key, label, onLabel, offLabel) {
      return '<div class="setting"><span>' + label + '</span><button type="button" class="btn switch' + (settings[key] ? " primary" : "") + '" data-act="setting" data-key="' + key + '" aria-pressed="' + !!settings[key] + '">' +
        (settings[key] ? onLabel : offLabel) + "</button></div>";
    }
    var rateBtn = '<div class="setting"><span>読み上げの速さ</span><button type="button" class="btn switch" data-act="rate">' + (settings.rate < 1 ? "ゆっくり" : "ふつう") + "</button></div>";
    var themeLabel = { auto: "端末に合わせる", light: "明るい", dark: "暗い" }[settings.theme] || "端末に合わせる";
    var themeBtn = '<div class="setting"><span>配色</span><button type="button" class="btn switch" data-act="theme">' + themeLabel + "</button></div>";
    main.innerHTML =
      '<div class="page-head"><h1>使い方・設定</h1><p>' + counts + "</p></div>" +
      '<div class="prose">' +
      "<h2>設定</h2>" +
      sw("kana", "一覧でも読み方（カタカナ）を表示", "表示する", "表示しない") +
      sw("large", "文字を大きくする", "大きい", "標準") +
      rateBtn + themeBtn +
      "<h2>基本の使い方</h2><ol>" +
      "<li><b>目次</b>から場面を選び、<b>まず使う表現</b>を見ます。</li>" +
      "<li>フレーズを<b>タップ</b>すると、フランス語を大きく表示します（相手に見せるモード）。左上の<b>「戻る」</b>で一覧の同じ位置に戻ります。</li>" +
      "<li>右側の <b>∨</b> で、読み方・使い方・相手の返事・単語の入れ替えを開きます。</li>" +
      "<li><b>☆</b> でお気に入りに保存。保存先はこの端末の中だけです。</li>" +
      "<li>画面下の<b>「緊急」</b>はどの画面からでも開けます。</li></ol>" +
      "<h2>カタカナの読み方について</h2><p>カタカナはあくまで発音の目安です。フランス語の r、u、鼻母音（an・on・in）などの音はカタカナで正確に表せません。また、つづりの最後の子音は読まないことが多いので、読み方の目安を参考にしてください。伝わらないときは、ためらわず画面を見せてください。</p>" +
      "<h2>オフラインで使うには</h2><ol>" +
      "<li>通信できる場所で、Safari でこのページを開きます。</li>" +
      "<li>目次の上に<b>「オフライン準備完了」</b>と表示されるまで待ちます。</li>" +
      "<li>下の手順で<b>ホーム画面に追加</b>し、ホーム画面のアイコンから一度開きます。</li>" +
      "<li>念のため<b>機内モード</b>にして、目次・検索が動くことを確かめておくと安心です。</li></ol>" +
      '<div id="offline-status" class="notice" style="margin:8px 0 0">' + offlineHTML() + "</div>" +
      "<h2>iPhone のホーム画面に追加する</h2><ol>" +
      "<li>Safari でこのページを開きます。</li>" +
      "<li>画面下（または上）の<b>共有ボタン</b>（四角から上向き矢印のマーク）をタップします。</li>" +
      "<li>メニューから<b>「ホーム画面に追加」</b>を選び、右上の<b>「追加」</b>をタップします。</li></ol>" +
      "<p>ホーム画面から開くと、アプリのように全画面で使えます。iPhone では、ホーム画面のアプリと Safari でお気に入りが別々に保存されることがあるため、追加したあとはホーム画面のアイコンから使うのがおすすめです。</p>" +
      "<h2>音声読み上げについて</h2>" +
      '<p id="voice-status">' + voiceStatusHTML() + "</p>" +
      "<p>読み上げは iPhone に入っているフランス語の音声を使います。音声が見つからない場合は、<b>設定 → アクセシビリティ → 読み上げコンテンツ → 声</b> から「フランス語」の声を追加できます（iOS のバージョンにより表記が異なることがあります）。</p>" +
      "<p><b>本文・検索・お気に入りのオフライン対応とは別</b>です。音声が機内モードでも使えるかどうかは、端末に音声データがダウンロード済みかによります。旅行前に機内モードで一度試しておくと確実です。</p>" +
      '<p><button type="button" class="btn" data-act="speak-text" data-fr="Bonjour ! L\'addition, s\'il vous plaît.">' + icon("speaker") + "読み上げを試す</button></p>" +
      "<h2>ラベルの意味</h2><ul>" +
      '<li><span class="tag first">まず使う</span> その場面で最初に覚えたい表現</li>' +
      '<li><span class="tag region">ニース・南仏</span>・<span class="tag region">モナコ</span>：その土地の料理名や言い方、その場所ならではの表現です。</li>' +
      '<li><span class="tag slot">入れ替え可</span> 品物・数・行き先などを選ぶと、文法の合った完成文を表示します。</li></ul>' +
      "<h2>ご注意</h2><p>料金・営業時間・持ち込み規則・デポジットの額などは、店や施設、時期によって変わります。本書の例は目安として使い、現地の表示や係員の案内を優先してください。緊急時は迷わず 112 へ。</p>" +
      "</div>";
  }

  function renderNotFound() {
    setTitle("");
    main.innerHTML = '<p class="empty">ページが見つかりません。<br><a href="#/">目次へ戻る</a></p>';
  }

  /* ---------- ルーティングとスクロール位置 ---------- */
  history.scrollRestoration = "manual";
  var scrollPos = {};
  var currentKey = null;
  var navByLink = false;

  function parseHash() {
    var h = location.hash.replace(/^#/, "") || "/";
    var parts = h.split("?");
    return { path: parts[0], params: new URLSearchParams(parts[1] || "") };
  }
  function keyOf(route) {
    return route.path;
  }
  function markNav(path) {
    var name = path === "/" ? "toc" : path.replace(/^\//, "").split("/")[0];
    document.querySelectorAll(".bottomnav a").forEach(function (a) {
      if (a.getAttribute("data-nav") === name) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function render() {
    if (showEl && !showEl.hidden) hideShow();
    var route = parseHash();
    var path = route.path;
    currentKey = keyOf(route);
    uid = 0;
    var anchor = null;
    var focusEl = null;
    var m;
    if (path === "/" || path === "") renderToc();
    else if ((m = path.match(/^\/c\/([a-z]+)$/))) anchor = renderCategory(m[1], route.params);
    else if (path === "/search") focusEl = renderSearch(route.params);
    else if (path === "/essentials") renderEssentials();
    else if (path === "/favorites") renderFavorites();
    else if (path === "/emergency") renderEmergency();
    else if (path === "/guide") renderGuide();
    else renderNotFound();
    markNav(path);

    if (navByLink) {
      var target = anchor && document.getElementById(anchor);
      if (target) target.scrollIntoView({ block: "start" });
      else window.scrollTo(0, 0);
      if (focusEl && !route.params.get("q")) focusEl.focus();
    } else {
      window.scrollTo(0, scrollPos[currentKey] || 0);
    }
    navByLink = false;
  }

  var scrollTick = false;
  window.addEventListener("scroll", function () {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(function () {
      scrollTick = false;
      if (currentKey && (!showEl || showEl.hidden)) scrollPos[currentKey] = window.scrollY;
    });
  }, { passive: true });

  /* ---------- 見せるモード ---------- */
  var showEl = document.getElementById("show");
  var showDe = document.getElementById("show-fr");
  var showJa = document.getElementById("show-ja");
  var showKana = document.getElementById("show-kana");
  var showLead = document.getElementById("show-lead");
  var showBody = document.getElementById("show-body");
  var showFav = document.getElementById("show-fav");
  var showState = null;
  var lastFocus = null;

  function fitShow() {
    var len = showDe.textContent.length;
    var size = len <= 12 ? 76 : len <= 28 ? 60 : len <= 50 ? 50 : 42;
    var w = window.innerWidth;
    if (w < 360) size = Math.round(size * 0.82);
    // まずは単語を途中で切らずに、横にも縦にも収まる大きさを探す（最小 24px）
    showDe.style.overflowWrap = "normal";
    showDe.style.hyphens = "manual";
    showDe.style.webkitHyphens = "manual";
    showDe.style.fontSize = size + "px";
    var guard = 0;
    while (size > 24 && guard < 60 &&
      (showDe.scrollWidth > showDe.clientWidth + 1 || showBody.scrollHeight > showBody.clientHeight + 1)) {
      size -= 2;
      showDe.style.fontSize = size + "px";
      guard++;
    }
    // それでも収まらない長い単語だけ折り返す（縦に長い場合は画面内でスクロール）
    if (showDe.scrollWidth > showDe.clientWidth + 1) {
      showDe.style.overflowWrap = "anywhere";
      showDe.style.hyphens = "auto";
      showDe.style.webkitHyphens = "auto";
    }
  }
  function openShow(o) {
    showState = o;
    var isSign = o.type === "sign";
    showLead.textContent = isSign ? "この表示の意味" : "フランス語でこう伝えたいです";
    showDe.textContent = o.fr;
    showKana.textContent = o.kana || "";
    showKana.hidden = !o.kana;
    showJa.textContent = o.ja || "";
    showJa.hidden = !o.ja;
    showEl.classList.toggle("sign", isSign);
    if (o.id) {
      showFav.hidden = false;
      showFav.setAttribute("aria-pressed", String(isFav(o.id)));
    } else {
      showFav.hidden = true;
    }
    lastFocus = document.activeElement;
    showEl.hidden = false;
    document.body.classList.add("show-open");
    showBody.scrollTop = 0;
    fitShow();
    history.pushState({ show: true }, "", location.href);
    var btn = showEl.querySelector(".show-close");
    if (btn) btn.focus({ preventScroll: true });
  }
  function hideShow() {
    showEl.hidden = true;
    document.body.classList.remove("show-open");
    showState = null;
    if (lastFocus && document.contains(lastFocus)) {
      try { lastFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
    }
  }
  function closeShow() {
    if (history.state && history.state.show) history.back();
    else hideShow();
  }
  window.addEventListener("popstate", function (e) {
    if (!showEl.hidden && !(e.state && e.state.show)) hideShow();
  });
  window.addEventListener("resize", function () {
    if (!showEl.hidden) fitShow();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !showEl.hidden) closeShow();
  });

  /* ---------- お気に入り ---------- */
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1);
    else favs.unshift(id);
    var ok = store.set(FAV_KEY, favs);
    var on = isFav(id);
    document.querySelectorAll('[data-act="fav"][data-id="' + id + '"]').forEach(function (b) {
      b.setAttribute("aria-pressed", String(on));
    });
    if (showState && showState.id === id) showFav.setAttribute("aria-pressed", String(on));
    if (!ok) toast("この端末に保存できませんでした（プライベートブラウズでは保存されないことがあります）。");
    else toast(on ? "お気に入りに保存しました" : "お気に入りから外しました", 1800);
  }

  /* ---------- 操作（イベント委譲） ---------- */
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (a) {
      navByLink = true;
      if (a.getAttribute("href") === location.hash || (a.getAttribute("href") === "#/" && !location.hash)) {
        // 同じページへのリンク：先頭へ戻る
        navByLink = false;
        e.preventDefault();
        window.scrollTo(0, 0);
      }
      return;
    }
    var el = e.target.closest("[data-act]");
    if (!el) return;
    var act = el.getAttribute("data-act");
    var p;
    switch (act) {
      case "show":
        p = byId.get(el.getAttribute("data-id"));
        if (p) openShow({ fr: p.fr, ja: p.ja, kana: p.kana, id: p.id, type: p.type });
        break;
      case "show-text":
        openShow({ fr: el.getAttribute("data-fr"), ja: el.getAttribute("data-ja"), kana: el.getAttribute("data-kana") });
        break;
      case "close-show":
        closeShow();
        break;
      case "speak-show":
        if (showState) speak(showState.fr);
        break;
      case "fav-show":
        if (showState && showState.id) toggleFav(showState.id);
        break;
      case "fav":
        toggleFav(el.getAttribute("data-id"));
        break;
      case "more": {
        var li = el.closest(".ph");
        var d = li.querySelector(".ph-detail");
        var open = el.getAttribute("aria-expanded") === "true";
        if (!open && !d.innerHTML) d.innerHTML = detailHTML(byId.get(el.getAttribute("data-id")), li.getAttribute("data-ctx"));
        d.hidden = open;
        el.setAttribute("aria-expanded", String(!open));
        break;
      }
      case "speak-text":
        speak(el.getAttribute("data-fr"));
        break;
      case "slot-opt":
      case "slot-count": {
        var box = el.closest(".slot");
        p = byId.get(box.getAttribute("data-slot"));
        if (act === "slot-opt") box.setAttribute("data-i", el.getAttribute("data-i"));
        else box.setAttribute("data-n", el.getAttribute("data-n"));
        el.parentNode.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === el)); });
        var v = slotValue(p, +box.getAttribute("data-i"), +box.getAttribute("data-n"));
        box.querySelector(".slot-out .mini-fr").textContent = v.fr;
        box.querySelector(".slot-out .mini-kana").textContent = v.kana;
        box.querySelector(".slot-out .mini-ja").textContent = v.ja;
        break;
      }
      case "show-slot":
      case "speak-slot": {
        var sb = el.closest(".slot");
        p = byId.get(sb.getAttribute("data-slot"));
        var sv = slotValue(p, +sb.getAttribute("data-i"), +sb.getAttribute("data-n"));
        if (act === "show-slot") openShow({ fr: sv.fr, ja: sv.ja, kana: sv.kana, id: p.id });
        else speak(sv.fr);
        break;
      }
      case "jump": {
        var t = document.getElementById(el.getAttribute("data-target"));
        if (t) t.scrollIntoView({ block: "start" });
        break;
      }
      case "suggest": {
        var input = document.getElementById("q");
        input.value = el.getAttribute("data-q");
        history.replaceState(history.state, "", "#/search?q=" + encodeURIComponent(input.value));
        paintResults(input.value);
        break;
      }
      case "setting":
        settings[el.getAttribute("data-key")] = !settings[el.getAttribute("data-key")];
        saveSettings();
        renderGuide();
        break;
      case "rate":
        settings.rate = settings.rate < 1 ? 1 : 0.85;
        saveSettings();
        renderGuide();
        break;
      case "theme":
        settings.theme = { auto: "light", light: "dark", dark: "auto" }[settings.theme] || "auto";
        saveSettings();
        renderGuide();
        break;
    }
  });

  window.addEventListener("hashchange", render);

  applySettings();
  render();
  registerSW();
})();
