/* 相手からよく聞かれること（→ こう答える）と、場面ごとの短い会話例 */
(function (PB) {
  "use strict";

  /* ---------- よく聞かれること ---------- */
  PB.addQuestions("airport", [
    ["q-air-1", "Vous avez des bagages à enregistrer ?", "預ける荷物はありますか？", ["a02", "a03"]],
    ["q-air-2", "Vous avez des liquides ?", "液体物はお持ちですか？", [["Non.", "いいえ。", "ノン"], ["Oui, seulement ça.", "はい、これだけです。", "ウィ スルマン サ"]], "保安検査で。"]
  ]);
  PB.addQuestions("train", [
    ["q-train-1", "Aller simple ou aller-retour ?", "片道ですか、往復ですか？", ["t02"]],
    ["q-train-2", "Contrôle des billets, s'il vous plaît !", "切符を拝見します。", ["t18", "t19"], "車内の検札で。"]
  ]);
  PB.addQuestions("hotel", [
    ["q-hotel-1", "À quel nom ?", "どなたのお名前ですか？", ["o05"]],
    ["q-hotel-2", "Vous restez combien de nuits ?", "何泊されますか？", [["Deux nuits.", "2泊です。", "ドゥ ニュイ"], ["Trois nuits.", "3泊です。", "トロワ ニュイ"]]]
  ]);
  PB.addQuestions("restaurant", [
    ["q-res-1", "Vous êtes combien ?", "何名様ですか？", ["n07", "r01"]],
    ["q-res-2", "Vous avez réservé ?", "ご予約はされていますか？", ["r02", "r03"]],
    ["q-res-3", "Vous avez choisi ?", "ご注文はお決まりですか？", ["r12", "r13", ["Pas encore, un instant.", "まだです、少し待ってください。", "パ ザンコール アン ナンスタン"]]],
    ["q-res-4", "Et comme boisson ?", "お飲み物は？", ["r15", "vn01"]],
    ["q-res-5", "Quelle cuisson ?", "焼き加減はどうしますか？", ["r14"]],
    ["q-res-6", "Et avec ceci ?", "ほかにご注文は？", ["r16", "b19"], "「Ce sera tout ?（以上でよろしいですか？）」とも言う。"],
    ["q-res-7", "Tout s'est bien passé ?", "お食事はいかがでしたか？", [["Oui, c'était délicieux, merci !", "はい、とてもおいしかったです！", "ウィ セテ デリスィユ メルスィ"]]],
    ["q-res-8", "Vous payez ensemble ou séparément ?", "ご一緒ですか、別々ですか？", ["r25"]],
    ["q-res-9", "Vous payez par carte ou en espèces ?", "カードですか、現金ですか？", ["r26"]]
  ]);
  PB.addQuestions("cafe", [
    ["q-cafe-1", "Sur place ou à emporter ?", "店内でお召し上がりですか、お持ち帰りですか？", ["c12"]],
    ["q-cafe-2", "Petit ou grand ?", "小さいサイズですか、大きいサイズですか？", ["c04"]],
    ["q-cafe-3", "Avec du lait ?", "ミルクは入れますか？", ["b18", "c07"]]
  ]);
  PB.addQuestions("wine", [
    ["q-wine-1", "Blanc, rouge ou rosé ?", "白、赤、ロゼのどれにしますか？", ["vn01"]],
    ["q-wine-2", "Un verre ou une bouteille ?", "グラスですか、ボトルですか？", [["Un verre, s'il vous plaît.", "グラスでお願いします。", "アン ヴェール スィル ヴ プレ"]]]
  ]);
  PB.addQuestions("diet", [
    ["q-diet-1", "Vous avez des allergies ?", "アレルギーはありますか？", ["d01", ["Non, aucune.", "いいえ、ありません。", "ノン オキュヌ"]]]
  ]);
  PB.addQuestions("shop", [
    ["q-shop-1", "Je peux vous aider ?", "何かお探しですか？", ["s01", "s02"]],
    ["q-shop-2", "Vous voulez un sac ?", "袋は必要ですか？", ["s19"]],
    ["q-shop-3", "Vous avez la carte de fidélité ?", "ポイントカードはお持ちですか？", ["b19"], "スーパーのレジでよく聞かれる。"],
    ["q-shop-4", "Vous voulez le ticket ?", "レシートは要りますか？", ["b18", "b19"]]
  ]);
  PB.addQuestions("sight", [
    ["q-sight-1", "Vous avez réservé en ligne ?", "オンラインで予約されましたか？", ["v06", ["Non, pas encore.", "いいえ、まだです。", "ノン パ ザンコール"]]]
  ]);
  PB.addQuestions("beach", [
    ["q-beach-1", "Vous avez une réservation pour un transat ?", "デッキチェアの予約はありますか？", ["r02", "bc05"]]
  ]);
  PB.addQuestions("market", [
    ["q-market-1", "Je vous en mets combien ?", "どのくらい入れますか？", ["m01", "m02"], "量り売りで。"],
    ["q-market-2", "Ce sera tout ?", "以上でよろしいですか？", [["Oui, c'est tout, merci.", "はい、以上です。", "ウィ セ トゥ メルスィ"]]]
  ]);
  PB.addQuestions("street", [
    ["q-street-1", "Vous cherchez quelque chose ?", "何かお探しですか？（道で）", ["w01", "w03"]]
  ]);
  PB.addQuestions("sos", [
    ["q-sos-1", "Qu'est-ce qui s'est passé ?", "何がありましたか？", ["e15", "e14", "e06"]],
    ["q-sos-2", "Vous avez une ordonnance ?", "処方箋はありますか？", [["Non, je n'ai pas d'ordonnance.", "いいえ、処方箋はありません。", "ノン ジュ ネ パ ドルドナンス"]], "薬局で。処方箋が必要な薬もある。"]
  ]);
  PB.addQuestions("social", [
    ["q-social-1", "Vous venez d'où ?", "どちらから来たのですか？", ["k01"]],
    ["q-social-2", "Vous restez combien de temps ?", "どのくらい滞在しますか？", ["k08"]]
  ]);

  /* ---------- 会話例（2〜4往復） ---------- */
  PB.addDialogues("airport", [
    ["dl-air-1", "荷物が出てこない", [
      ["me", "Bonjour, ma valise n'est pas arrivée.", "こんにちは、スーツケースが出てきません。"],
      ["係員", "Vous avez l'étiquette de bagage ?", "手荷物の控え（タグ）はありますか？"],
      ["me", "Oui, la voici.", "はい、これです。"],
      ["係員", "Remplissez ce formulaire, s'il vous plaît. Vous logez où ?", "この用紙に記入してください。どちらにお泊まりですか？"],
      ["me", "Dans cet hôtel. Vous pouvez livrer la valise à mon hôtel ?", "このホテルです。スーツケースをホテルに届けていただけますか？"]
    ]]
  ]);
  PB.addDialogues("train", [
    ["dl-train-1", "窓口でモナコまでの切符を買う", [
      ["me", "Bonjour, un billet pour Monaco, s'il vous plaît.", "こんにちは、モナコまでの切符を1枚ください。"],
      ["駅員", "Aller simple ou aller-retour ?", "片道ですか、往復ですか？"],
      ["me", "Un aller-retour, s'il vous plaît. Je reviens ce soir.", "往復でお願いします。今晩戻ります。"],
      ["駅員", "Le prochain train part à dix heures douze, voie B.", "次の電車は10時12分、B番線から出ます。"],
      ["me", "Vous pouvez l'écrire, s'il vous plaît ?", "書いていただけますか？"]
    ]],
    ["dl-train-2", "この電車でいいか確かめる", [
      ["me", "Excusez-moi, ce train va à Monaco ?", "すみません、この電車はモナコに行きますか？"],
      ["乗客", "Non, celui-ci va à Cannes. Le vôtre arrive voie A.", "いいえ、これはカンヌ行きです。あなたの電車はA番線に来ますよ。"],
      ["me", "Voie A ? Merci beaucoup !", "A番線ですね？ありがとうございます！"]
    ]],
    ["dl-train-3", "トラムの検札", [
      ["検札係", "Bonjour, contrôle des titres de transport.", "こんにちは、乗車券を確認します。"],
      ["me", "Voici mon ticket.", "これが切符です。"],
      ["検札係", "Vous l'avez validé ?", "機械に通しましたか？"],
      ["me", "Oui, en montant.", "はい、乗ったときに。"],
      ["検札係", "Merci, bonne journée !", "ありがとうございます、良い一日を！"]
    ]],
    ["dl-train-4", "ストライキで電車が少ない", [
      ["me", "Excusez-moi, il y a une grève aujourd'hui ?", "すみません、今日はストライキですか？"],
      ["駅員", "Oui, il y a peu de trains ce matin.", "はい、今朝は本数が少ないです。"],
      ["me", "Qu'est-ce que je peux prendre pour aller à Monaco ?", "モナコへ行くには何に乗ればいいですか？"],
      ["駅員", "Prenez le bus. L'arrêt est juste devant la gare.", "バスに乗ってください。停留所は駅のすぐ前です。"]
    ]]
  ]);
  PB.addDialogues("hotel", [
    ["dl-hotel-1", "チェックイン前に荷物を預ける", [
      ["me", "Bonjour ! J'arrive aujourd'hui. Je peux laisser mes bagages ici ?", "こんにちは！今日チェックインします。荷物を預かっていただけますか？"],
      ["受付", "Bien sûr. La chambre sera prête à quinze heures.", "もちろんです。お部屋は15時にご用意できます。"],
      ["me", "Je reviens vers quinze heures.", "15時ごろ取りに戻ります。"],
      ["受付", "Très bien. Voici votre ticket.", "かしこまりました。こちらが預かり札です。"]
    ]],
    ["dl-hotel-2", "チェックイン", [
      ["me", "Bonjour, j'ai une réservation.", "こんにちは、予約しています。"],
      ["受付", "À quel nom ?", "どなたのお名前ですか？"],
      ["me", "Au nom de Tanaka.", "田中です。"],
      ["受付", "Trois nuits avec petit-déjeuner. Votre passeport, s'il vous plaît.", "朝食付きで3泊ですね。パスポートをお願いします。"],
      ["me", "Voilà. Le petit-déjeuner est à partir de quelle heure ?", "はい、どうぞ。朝食は何時からですか？"],
      ["受付", "De sept heures à dix heures, au rez-de-chaussée.", "7時から10時まで、地上階（日本の1階）です。"]
    ]]
  ]);
  PB.addDialogues("restaurant", [
    ["dl-res-1", "入店して席に着く", [
      ["店員", "Bonsoir ! Vous avez réservé ?", "こんばんは！ご予約はされていますか？"],
      ["me", "Non. Une table pour une personne, s'il vous plaît.", "いいえ。1人です、テーブルをお願いします。"],
      ["店員", "En terrasse ou à l'intérieur ?", "テラス席ですか、店内ですか？"],
      ["me", "En terrasse, s'il vous plaît.", "テラス席でお願いします。"],
      ["店員", "Très bien, suivez-moi.", "かしこまりました、こちらへどうぞ。"],
      ["me", "Merci beaucoup.", "ありがとうございます。"]
    ]],
    ["dl-res-2", "おすすめを聞いて注文する", [
      ["店員", "Vous avez choisi ?", "ご注文はお決まりですか？"],
      ["me", "Qu'est-ce que vous me conseillez ?", "おすすめは何ですか？"],
      ["店員", "Le plat du jour, c'est un loup grillé.", "本日の料理はスズキのグリルです。"],
      ["me", "Très bien, je vais prendre le plat du jour.", "いいですね、本日の料理にします。"],
      ["店員", "Et comme boisson ?", "お飲み物は？"],
      ["me", "Une carafe d'eau et un verre de rosé, s'il vous plaît.", "水道水とロゼワインを1杯お願いします。"]
    ]],
    ["dl-res-3", "席で会計する", [
      ["me", "L'addition, s'il vous plaît.", "お会計をお願いします。"],
      ["店員", "Tout s'est bien passé ?", "お食事はいかがでしたか？"],
      ["me", "Oui, c'était délicieux, merci !", "はい、とてもおいしかったです！"],
      ["店員", "Vous payez par carte ou en espèces ?", "カードですか、現金ですか？"],
      ["me", "Par carte, s'il vous plaît.", "カードでお願いします。"],
      ["店員", "Merci, bonne soirée !", "ありがとうございます、良い夜を！"]
    ]],
    ["dl-res-4", "別々に会計する", [
      ["me", "Excusez-moi, on peut payer ?", "すみません、お会計できますか？"],
      ["店員", "Vous payez ensemble ou séparément ?", "ご一緒ですか、別々ですか？"],
      ["me", "Séparément, s'il vous plaît. Je paie seulement pour moi.", "別々でお願いします。私の分だけ払います。"],
      ["店員", "Vous aviez la salade niçoise et un verre de blanc, c'est ça ?", "ニース風サラダと白ワインでしたね？"],
      ["me", "Oui, c'est ça.", "はい、そうです。"]
    ]],
    ["dl-res-5", "注文した料理が来ない", [
      ["me", "Excusez-moi, mon plat n'est pas encore arrivé.", "すみません、料理がまだ来ていません。"],
      ["店員", "Oh, désolé. Qu'est-ce que vous aviez commandé ?", "申し訳ありません。何をご注文でしたか？"],
      ["me", "Les moules-frites.", "ムール貝とフライドポテトです。"],
      ["店員", "Je vais voir tout de suite.", "すぐに確認します。"]
    ]]
  ]);
  PB.addDialogues("cafe", [
    ["dl-cafe-1", "カフェで注文（店内／持ち帰り）", [
      ["店員", "Bonjour ! Qu'est-ce que je vous sers ?", "こんにちは！何にしますか？"],
      ["me", "Bonjour ! Un café crème, s'il vous plaît.", "こんにちは！カフェ・クレームを1杯ください。"],
      ["店員", "Sur place ou à emporter ?", "店内でお召し上がりですか、お持ち帰りですか？"],
      ["me", "À emporter, s'il vous plaît.", "持ち帰りでお願いします。"],
      ["店員", "Et avec ceci ?", "ほかにご注文は？"],
      ["me", "Un croissant, s'il vous plaît. C'est tout.", "クロワッサンを1つください。以上です。"],
      ["店員", "Ça fait cinq euros vingt.", "5ユーロ20セントです。"],
      ["me", "Par carte, s'il vous plaît.", "カードでお願いします。"]
    ]],
    ["dl-cafe-2", "パン屋でバゲットを買う", [
      ["店員", "Bonjour ! Vous désirez ?", "こんにちは！何にしますか？"],
      ["me", "Bonjour ! Une baguette, s'il vous plaît.", "こんにちは！バゲットを1本ください。"],
      ["店員", "Bien cuite ou pas trop ?", "よく焼けたものがいいですか、焼きすぎていないものがいいですか？"],
      ["me", "Pas trop cuite, s'il vous plaît.", "焼きすぎていないものをお願いします。"],
      ["店員", "Et avec ceci ?", "ほかには？"],
      ["me", "Deux comme ça, s'il vous plaît.", "（指さして）これと同じものを2つください。"]
    ]]
  ]);
  PB.addDialogues("wine", [
    ["dl-wine-1", "地元のワインを頼む", [
      ["店員", "Bonsoir ! Qu'est-ce que je vous sers ?", "こんばんは！何にしますか？"],
      ["me", "Qu'est-ce que vous avez comme vin de la région ?", "地元のワインは何がありますか？"],
      ["店員", "Un rosé de Provence ou un blanc de Bellet.", "プロヴァンスのロゼか、ベレの白です。"],
      ["me", "Un verre de rosé, s'il vous plaît. Et des olives.", "ロゼを1杯ください。それとオリーブを。"],
      ["店員", "Très bien, je vous apporte ça.", "かしこまりました、すぐお持ちします。"]
    ]],
    ["dl-wine-2", "バーで相席して話す", [
      ["me", "Excusez-moi, cette table est libre ?", "すみません、この席は空いていますか？"],
      ["隣の客", "Oui, allez-y !", "ええ、どうぞ！"],
      ["me", "Merci ! Santé !", "ありがとう！乾杯！"],
      ["隣の客", "Santé ! Vous venez d'où ?", "乾杯！どちらから？"],
      ["me", "Je viens du Japon.", "日本から来ました。"]
    ]]
  ]);
  PB.addDialogues("diet", [
    ["dl-diet-1", "ナッツアレルギーを伝える", [
      ["me", "Je suis allergique aux fruits à coque. Il y a des fruits à coque dedans ?", "私はナッツアレルギーです。これにナッツは入っていますか？"],
      ["店員", "Je vais demander en cuisine.", "厨房に確認してきます。"],
      ["店員", "Il y a des pignons dans la sauce.", "ソースに松の実が入っています。"],
      ["me", "Même une petite quantité est dangereuse pour moi. Qu'est-ce que vous me conseillez ?", "少量でも危険です。何がおすすめですか？"],
      ["店員", "Le poisson grillé est sans fruits à coque.", "魚のグリルはナッツなしです。"]
    ]]
  ]);
  PB.addDialogues("shop", [
    ["dl-shop-1", "スーパーのレジ（袋とレシート）", [
      ["店員", "Bonjour ! Vous avez la carte de fidélité ?", "こんにちは！ポイントカードはお持ちですか？"],
      ["me", "Non, merci.", "いいえ。"],
      ["店員", "Vous voulez un sac ?", "袋は必要ですか？"],
      ["me", "Non, je n'ai pas besoin de sac, merci.", "いいえ、袋は要りません。"],
      ["店員", "Ça fait huit euros quatre-vingt-dix. Vous voulez le ticket ?", "8ユーロ90セントです。レシートは要りますか？"],
      ["me", "Oui, s'il vous plaît.", "はい、お願いします。"]
    ]],
    ["dl-shop-2", "現金のみの店", [
      ["me", "Bonjour ! C'est combien ?", "こんにちは！いくらですか？"],
      ["店員", "Quinze euros.", "15ユーロです。"],
      ["me", "Vous acceptez la carte ?", "カードは使えますか？"],
      ["店員", "Non, désolé, seulement en espèces.", "すみません、現金のみです。"],
      ["me", "Pas de problème. Voilà.", "大丈夫です。はい、どうぞ。"],
      ["店員", "Merci. Et voilà cinq euros.", "ありがとうございます。5ユーロのお返しです。"]
    ]]
  ]);
  PB.addDialogues("sight", [
    ["dl-sight-1", "入場券を買う", [
      ["me", "Bonjour, un billet d'entrée, s'il vous plaît.", "こんにちは、入場券を1枚ください。"],
      ["係員", "Vous avez réservé en ligne ?", "オンラインで予約されましたか？"],
      ["me", "Non. Il faut réserver à l'avance ?", "いいえ。事前の予約は必要ですか？"],
      ["係員", "Pas aujourd'hui. Ça fait douze euros.", "今日は大丈夫です。12ユーロです。"],
      ["me", "Vous êtes ouvert jusqu'à quelle heure ?", "何時まで開いていますか？"],
      ["係員", "Jusqu'à dix-huit heures.", "18時までです。"]
    ]],
    ["dl-sight-2", "写真を撮ってもらう", [
      ["me", "Excusez-moi, vous pouvez me prendre en photo, s'il vous plaît ?", "すみません、写真を撮っていただけますか？"],
      ["通行人", "Avec plaisir ! Où est-ce qu'il faut appuyer ?", "喜んで！どこを押せばいいですか？"],
      ["me", "Il suffit d'appuyer ici. Avec la mer derrière, s'il vous plaît.", "ここを押すだけです。海を背景に入れてください。"],
      ["通行人", "Comme ça ? Regardez.", "こんな感じ？見てください。"],
      ["me", "C'est parfait, merci beaucoup !", "完璧です、ありがとうございます！"]
    ]],
    ["dl-sight-3", "モナコのカジノで入場条件を聞く（条件は一例）", [
      ["me", "Bonjour, tout le monde peut entrer au casino ?", "こんにちは、カジノには誰でも入れますか？"],
      ["係員", "Oui, à partir de dix-huit ans, avec une pièce d'identité.", "はい、18歳以上で身分証明書があれば入れます。"],
      ["me", "Il y a un code vestimentaire ?", "服装の決まりはありますか？"],
      ["係員", "Oui, pas de short ni de tongs.", "はい、短パンとビーチサンダルは禁止です。"]
    ]]
  ]);
  PB.addDialogues("beach", [
    ["dl-beach-1", "プライベートビーチでデッキチェアを借りる", [
      ["係員", "Bonjour ! Vous avez une réservation ?", "こんにちは！ご予約はありますか？"],
      ["me", "Non. Je voudrais louer un transat. C'est combien pour la journée ?", "いいえ。デッキチェアを借りたいです。1日いくらですか？"],
      ["係員", "Vingt-cinq euros, avec la serviette.", "タオル込みで25ユーロです。"],
      ["me", "D'accord. On peut se baigner ici ?", "わかりました。ここで泳いでもいいですか？"],
      ["係員", "Oui, la plage est surveillée jusqu'à dix-huit heures.", "はい、18時まで監視員がいます。"]
    ]]
  ]);
  PB.addDialogues("market", [
    ["dl-market-1", "マルシェで量り売りの野菜を買う", [
      ["店の人", "Bonjour ! Qu'est-ce que je vous mets ?", "こんにちは！何にしますか？"],
      ["me", "Bonjour ! C'est de la région ?", "こんにちは！これは地元産ですか？"],
      ["店の人", "Oui, ce sont des tomates de Provence.", "はい、プロヴァンスのトマトです。"],
      ["me", "Un demi-kilo, s'il vous plaît.", "500グラムください。"],
      ["店の人", "Et avec ceci ?", "ほかには？"],
      ["me", "C'est tout, merci. Ça fait combien en tout ?", "以上です。全部でいくらですか？"],
      ["店の人", "Deux euros cinquante.", "2ユーロ50セントです。"]
    ]],
    ["dl-market-2", "屋台でソッカを買う", [
      ["me", "Bonjour ! Une part de socca, s'il vous plaît.", "こんにちは！ソッカを1切れください。"],
      ["店の人", "Avec du poivre ?", "こしょうをかけますか？"],
      ["me", "Oui, s'il vous plaît.", "はい、お願いします。"],
      ["店の人", "Attention, c'est chaud ! Trois euros.", "熱いので気をつけて！3ユーロです。"]
    ]]
  ]);
  PB.addDialogues("street", [
    ["dl-street-1", "道を尋ねる", [
      ["me", "Bonjour, excusez-moi, où est la place Masséna ?", "こんにちは、すみません、マセナ広場はどこですか？"],
      ["通行人", "Allez tout droit, puis à gauche.", "まっすぐ行って、それから左です。"],
      ["me", "On peut y aller à pied ?", "歩いて行けますか？"],
      ["通行人", "Oui, environ dix minutes.", "はい、10分くらいです。"],
      ["me", "Merci beaucoup !", "ありがとうございます！"]
    ]]
  ]);
  PB.addDialogues("sos", [
    ["dl-sos-1", "薬局で症状を伝える", [
      ["薬剤師", "Bonjour, je peux vous aider ?", "こんにちは、どうされましたか？"],
      ["me", "J'ai mal à la tête et j'ai de la fièvre.", "頭が痛くて、熱があります。"],
      ["薬剤師", "Vous êtes allergique à des médicaments ?", "薬のアレルギーはありますか？"],
      ["me", "Non, aucun.", "いいえ、ありません。"],
      ["薬剤師", "Prenez un comprimé trois fois par jour.", "1日3回、1錠ずつ飲んでください。"]
    ]],
    ["dl-sos-2", "警察で盗難を届け出る", [
      ["警察官", "Qu'est-ce qui s'est passé ?", "何がありましたか？"],
      ["me", "On m'a volé mon portefeuille.", "財布を盗まれました。"],
      ["警察官", "Quand et où ?", "いつ、どこでですか？"],
      ["me", "Il y a une heure, dans le tram.", "1時間前、トラムの中です。"],
      ["警察官", "D'accord, je prends votre plainte.", "わかりました、被害届を受け付けます。"],
      ["me", "J'ai besoin d'une copie de la plainte pour mon assurance.", "保険用に被害届の控えが必要です。"]
    ]]
  ]);
})(PB);
