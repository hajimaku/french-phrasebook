/*
 * フレーズデータの土台。
 * 各カテゴリーファイルは PB.addCategory(定義, 行配列) で登録する。
 *
 * 行の形式（コンパクトに書くための配列。読み込み時に名前付きオブジェクトへ変換する）:
 *   [ID, 場面ID, フラグ, 日本語, フランス語, カタカナ, 補足, 検索キーワード(空白区切り), 追加情報?]
 *
 * フラグ: 先頭の数字 = 重要度(3:最重要 2:よく使う 1:場合により)
 *         F = カテゴリー内の「まず使う表現」
 *         E = 「必須フレーズ」ページに載せる
 *         S = 看板・表示（読む用） / W = 単語・数字（話す文ではない）
 *
 * 追加情報:
 *   r    : 相手の返答 [[フランス語, 日本語, "次に言うフレーズID(空白区切り)"?], ...]
 *   alt  : 別の言い方 [[フランス語, カタカナ, 日本語], ...]
 *   reg  : 地域ラベル nice | mc
 *   slot : 入れ替え。{label, o:[[ラベル, フランス語完成文, カタカナ, 日本語完成文], ...]}
 *          冠詞・前置詞・性数一致が変わるため、各選択肢は「完成文」を個別に持つ。
 *          個数×品目は {label, order:[[ラベル, 単数(冠詞付き), 単数カナ, 複数形, 複数カナ, 日本語名, 助数詞], ...]}
 *
 * フランス語の「 ? 」「 ! 」「 : 」「 ; 」の前の空白は、読み込み時に改行しない空白に置き換える。
 */
(function (g) {
  "use strict";
  var PB = g.PB || (g.PB = {});
  PB.categories = PB.categories || [];
  PB.phrases = PB.phrases || [];
  PB.dialogues = PB.dialogues || [];
  PB.questions = PB.questions || [];

  PB.REGIONS = {
    nice: "ニース・南仏",
    mc: "モナコ"
  };

  /** フランス語の約物の前の空白を、行頭に記号だけが残らない空白（NBSP）にする */
  function T(s) {
    return String(s).replace(/ ([?!:;»])/g, "\u00a0$1").replace(/« /g, "«\u00a0");
  }
  PB.typo = T;

  // 個数×品目の組み立てに使う数詞（2以上）
  PB.COUNT_WORDS = {
    2: ["deux", "ドゥ"],
    3: ["trois", "トロワ"],
    4: ["quatre", "キャトル"]
  };

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /** 個数×品目の完成文を返す（item は正規化済みの品目） */
  PB.composeOrder = function (item, count) {
    var fr, kana;
    if (count === 1) {
      fr = cap(item.one) + ", s'il vous plaît.";
      kana = item.oneKana + " スィル ヴ プレ";
    } else {
      var w = PB.COUNT_WORDS[count];
      fr = cap(w[0]) + " " + item.pl + ", s'il vous plaît.";
      kana = w[1] + " " + item.plKana + " スィル ヴ プレ";
    }
    return { fr: fr, kana: kana, ja: item.ja + "を" + count + item.counter + "ください" };
  };

  function normSlot(s) {
    if (s.order) {
      return {
        kind: "order",
        label: s.label,
        counts: [1, 2, 3, 4],
        items: s.order.map(function (a) {
          return { label: a[0], one: a[1], oneKana: a[2], pl: a[3], plKana: a[4], ja: a[5], counter: a[6] };
        })
      };
    }
    return {
      kind: "choice",
      label: s.label,
      options: s.o.map(function (a) {
        return { label: a[0], fr: T(a[1]), kana: a[2], ja: a[3] };
      })
    };
  }

  PB.normalize = function (cat, r) {
    var flags = r[2] || "";
    var x = r[8] || {};
    return {
      id: r[0],
      category: cat.id,
      scene: r[1],
      ja: r[3],
      fr: T(r[4]),
      kana: r[5],
      note: r[6] || "",
      keywords: (r[7] || "").split(/\s+/).filter(Boolean),
      importance: parseInt(flags.charAt(0), 10),
      first: flags.indexOf("F") >= 0,
      essential: flags.indexOf("E") >= 0,
      type: flags.indexOf("S") >= 0 ? "sign" : flags.indexOf("W") >= 0 ? "word" : "phrase",
      region: x.reg || null,
      replies: (x.r || []).map(function (a) {
        return { fr: T(a[0]), ja: a[1], next: a[2] ? a[2].split(/\s+/) : [] };
      }),
      alternatives: (x.alt || []).map(function (a) {
        return { fr: T(a[0]), kana: a[1], ja: a[2] };
      }),
      slot: x.slot ? normSlot(x.slot) : null
    };
  };

  PB.addCategory = function (def, rows) {
    var cat = {
      id: def.id,
      no: def.no,
      title: def.title,
      short: def.short,
      intro: def.intro || "",
      scenes: def.scenes.map(function (s) {
        return { id: s[0], title: s[1] };
      })
    };
    PB.categories.push(cat);
    rows.forEach(function (r) {
      PB.phrases.push(PB.normalize(cat, r));
    });
  };

  /**
   * 会話例。lines: [[話者, フランス語, 日本語], ...]
   * 話者 "me" は旅行者（あなた）。それ以外は表示ラベル（店員・駅員など）。
   */
  PB.addDialogues = function (cat, list) {
    list.forEach(function (d) {
      PB.dialogues.push({
        id: d[0],
        category: cat,
        title: d[1],
        lines: d[2].map(function (l) {
          return { speaker: l[0], fr: T(l[1]), ja: l[2] };
        })
      });
    });
  };

  /**
   * 相手からよく聞かれること。answers は フレーズID か [フランス語, 日本語, カタカナ]。
   */
  PB.addQuestions = function (cat, list) {
    list.forEach(function (q) {
      PB.questions.push({
        id: q[0],
        category: cat,
        fr: T(q[1]),
        ja: q[2],
        answers: q[3].map(function (a) {
          return typeof a === "string" ? { ref: a } : { fr: T(a[0]), ja: a[1], kana: a[2] };
        }),
        note: q[4] || ""
      });
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
