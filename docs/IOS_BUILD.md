# iOS 版をビルドして App Store に出す手順（Mac での作業）

ちゃぶ台返しリメンバーの iOS 版は、Android 版と同じ Capacitor で作っています（`ios/` フォルダ）。
コードの準備はできているので、Mac では「ビルドして App Store Connect にアップロードする」作業だけを行います。

- Bundle ID：`jp.techgym.chabudai`（Android と同じ）
- チーム：Team ID `GNM3VTX9YG`（Xcode の設定に入れてあります）。Apple Developer には**個人で登録**しています（App Store の販売元は個人名になります）
- 対応端末：iPhone（横画面固定）。iPad では iPhone 用の画面で動きます
- ホーム画面の名前：日本語の端末では「ちゃぶ台返し」、それ以外では「Table Flip」（長いと途中で切れるので短くしています）
- 広告：AdMob（iOS 用のアプリと広告ユニット）。起動時に「トラッキングの許可」の確認画面が出ます
- センサー：加速度・ジャイロ・コンパスは確認なしで使えます。**マイク**は初回の「はじめる」で確認画面が出ます（叫び声の大きさを測るだけで、録音・送信はしません）

---

## 0. ブラウザで先にやること（Apple Developer・App Store Connect・AdMob）

1. **Apple Developer**（developer.apple.com）→「Certificates, Identifiers & Profiles」→「Identifiers」→「＋」→「App IDs」→「App」
   - Description：`Table Flip Remember`（英数字で）
   - Bundle ID：「Explicit」で `jp.techgym.chabudai`
   - Capabilities：何もチェックしない
2. **App Store Connect**（appstoreconnect.apple.com）→「マイ App」→「＋」→「新規 App」
   - プラットフォーム：iOS ／ 名前：`ちゃぶ台返しリメンバー`（App Store 全体で重複不可。使われていたら少し変える）／ プライマリ言語：日本語
   - バンドル ID：1 で登録したもの ／ SKU：`chabudai`（あとから変更不可）／ ユーザアクセス：アクセス制限なし
3. **AdMob**
   - 「アプリを追加」→ **iOS** →「ストアに掲載されていない」で登録し、**インタースティシャル**と**リワード**の広告ユニットを作る
   - アプリ ID（`~` が入っているもの）と広告ユニット ID 2 つ（`/` が入っているもの）を Claude Code に渡す。
     `js/ads.js` の `ios.production` と `ios/App/App/Info.plist` の `GADApplicationIdentifier` に入ります。
     それまでは Google のテスト用 ID が入っていて、`npm run ios:release` はエラーで止まります（入れ忘れ防止）
   - 「プライバシーとメッセージ」→「欧州の規制」のメッセージに iOS アプリも追加する

---

## 1. Mac の準備（最初の1回だけ）

1. **Xcode** を App Store からインストールする（数十 GB あるので時間がかかります）。インストール後に一度起動し、追加コンポーネントのインストールを済ませる
2. Xcode の「Settings…」→「Accounts」→「＋」で、Apple Developer に登録している Apple ID でサインインする（チームが個人名で表示されれば OK）
3. **Node.js**（LTS 版）を https://nodejs.org/ からインストールする
4. ターミナルでリポジトリを取得する
   ```bash
   cd ~/Desktop   # 置きたい場所（どこでもよい）
   git clone https://github.com/techgymjp/chabudai.git
   cd chabudai
   npm ci
   ```
   `git` がないと言われたら、表示に従って「コマンドライン・デベロッパツール」をインストールしてから、もう一度実行します。

2回目以降は、`cd chabudai` のあと `git pull` と `npm ci` で最新にします。

---

## 2. 自分の iPhone で動作確認する（テスト広告）

```bash
npm run ios:sync    # ゲームのファイルを iOS のプロジェクトにコピー（テスト広告）
npm run ios:open    # Xcode で開く
```

1. iPhone を USB ケーブルで Mac につなぎ、iPhone で「このコンピュータを信頼」を許可する
2. iPhone の「設定」→「プライバシーとセキュリティ」→「デベロッパモード」をオンにする（再起動を求められます。項目がない場合は、Xcode で一度 iPhone を選ぶと表示されます）
3. Xcode の上部で、実行先に自分の iPhone を選ぶ
4. 左の「App」→「Signing & Capabilities」で、「Automatically manage signing」がオン、Team に自分（個人名）のチームが選ばれていることを確認する
5. ▶（Run）を押すと、iPhone にアプリが入って起動する

**確認すること**

| 項目 | 見るところ |
| --- | --- |
| 画面 | 横画面・全画面で表示される。ホーム画面の名前が「ちゃぶ台返し」 |
| 確認画面 | 起動時にトラッキングの確認、「はじめる」でマイクの確認が出る（説明文が日本語） |
| センサー | 構え画面の「加速度・ジャイロ・コンパス・マイク」が ● になる |
| 投てき | 回って振り上げると投げたことになる。叫ぶと「気合」のメーターが動く |
| 音 | 投げたあとの「ガシャーン」や歓声が、普通の大きさでスピーカーから鳴る（マイクを使っている間は iOS が音を小さくするので、投げた瞬間にマイクを閉じています） |
| 広告 | 「もう一度」2 回に 1 回と、「広告を見て、次の1投を追い風にする」で**テスト広告**が出る |
| その他 | シェアができる。タイトル画面の「English」で英語になる。アプリを切り替えて戻っても動く |

---

## 3. App Store 用にビルドしてアップロードする（本番広告）

```bash
git pull && npm ci
npm run ios:release   # 本番の広告 ID でコピーする（ここが ios:sync と違う）
npm run ios:open
```

1. Xcode の左で「App」→「General」→「Identity」を開き、**Build の番号を前回より大きくする**（初回は 1。アップロードのたびに 2、3…と上げる。同じ番号は二度アップロードできない）。Version はストアに表示されるバージョン（1.0.0）
2. 上部の実行先を「**Any iOS Device (arm64)**」にする
3. メニューの「Product」→「**Archive**」（メニューバーは画面の最上部。全画面表示だと隠れるので、マウスを上端に動かす）
4. 終わると Organizer が開くので、「**Distribute App**」→「**App Store Connect**」→「Upload」で進める（途中の確認は既定のまま「Next」でよい。「Xcode Cloud can automate…」は「Remind Me Later」で閉じる）
5. 10〜30 分ほどで、App Store Connect の「TestFlight」タブにビルドが表示される

輸出コンプライアンス（暗号化）の質問は、Info.plist で「独自の暗号化は使っていない」と設定済みなので、聞かれません。

**注意**：`ios:release` でビルドしたアプリは本番の広告が出ます。TestFlight で確認するときも、**本番の広告はタップしない**でください（AdMob のアカウント停止の対象）。Xcode から iPhone に直接入れて試すときは、`npm run ios:sync` でテスト広告に戻してから実行します。

---

## 4. TestFlight で確認し、審査用の画面録画を撮る

1. App Store Connect の「TestFlight」→「内部テスト」でグループを作り、自分を追加する
2. iPhone に「TestFlight」アプリを App Store から入れ、届いた招待からインストールする
3. **審査用の画面録画を撮る**（新しいアカウントは、初回の審査で実機の操作の録画を求められます。先に撮って、提出時に「App Review に関する情報」のメモとあわせて用意しておくと早く進みます）
   - iPhone の「設定」→「コントロールセンター」に「画面収録」を追加し、コントロールセンターから録画を始める
   - **アプリを起動するところから**撮る。最新の iOS で、次の順に操作する
     1. 起動 → トラッキングの確認画面（どちらを選んでもよい）
     2. 「はじめる」→ マイクの確認画面で「許可」
     3. 構え画面（センサーの表示）→「構える」→ クルッと回って叫びながら振り上げる（スマホが映っている画面なので、回るのは小さめで OK）
     4. ちゃぶ台が飛んで着地 → 結果画面
     5. 「もう一度」でもう 1 回投げる。2 回目の「もう一度」で全画面広告が出て閉じる
     6. 結果画面の「シェア」→ 共有シートを閉じる
   - 1〜2 分程度に収める。ファイルが大きいと App Review への返信に添付できないので、Finder で右クリック →「選択したビデオファイルをエンコード」→ 720p で小さくするか、Google ドライブの共有リンクを使う
   - TestFlight の版は本番の広告が出ます。録画で広告が出ても**タップしない**（閉じるボタンだけ押す）

---

## 5. App Store Connect で審査に出す

「配信」タブ（iOS App のバージョン）で入力します。**バージョンの番号を 1.0.0 にする**（「1.0」のままだと、アップロードしたビルドが選べません）。

| 項目 | 入力内容 |
| --- | --- |
| スクリーンショット | 「Dynamic Island 搭載 iPhone（中型ディスプレイ）」の欄に、`docs/store/ios/6.3inch/` の 2622 × 1206（横向き）を入れる。日本語版（ja-）と英語版（en-）各 4 枚（1 回る → 2 ちゃぶ台返し → 3 大空へ → 4 結果） |
| ヘッダ・検索結果 | 「ヘッダと検索結果」タブに `docs/store/ios/appstore-header-3840x1646.png` と `appstore-search-3840x2560.png`（英語のローカライズには `-en` の付いたもの）。ヘッダを入れたら検索結果も必ず入れる |
| サブタイトル・プロモーション用テキスト・キーワード | `docs/store/listing.md` の「App Store（iOS）用の追加項目」 |
| 概要（説明文） | Google Play 用の「詳しい説明」（`docs/store/listing.md`）をそのまま使える |
| サポート URL | https://techgym.jp/ |
| プライバシーポリシー URL（App 情報） | https://techgym.jp/privacy-policy/ |
| 著作権 | 2026 TECH GYM K.K. |
| カテゴリ（App 情報） | ゲーム → スポーツ（セカンダリはカジュアル） |
| コンテンツの配信権（App 情報） | 第三者のコンテンツ：「いいえ」（絵・音はすべて自前） |
| ビルド | TestFlight で確認したビルドを選ぶ |
| 年齢制限 | 質問に答える。暴力・成人向けの表現はなし（ちゃぶ台と食器がひっくり返って割れる程度のコミカルな表現。人物のけが・流血なし） |
| App のプライバシー | 下記 |
| App Review に関する情報 | ログイン不要。連絡先を入力。メモに下の「審査メモ」を貼る |

**App のプライバシー（AdMob を使うアプリの目安）**
Google の「Apple の App Store のデータ開示要件への準備」（AdMob のヘルプ）に、AdMob が収集するデータの一覧があります。必ずそちらを見て最終確認してください。

- 収集する：ID（デバイス ID）、使用状況データ（広告データ、製品の操作）、診断（クラッシュデータ、パフォーマンスデータ、その他の診断データ）、位置情報（おおよその場所）
- 目的：サードパーティ広告、アナリティクス
- ユーザーに関連付け：しない
- トラッキングに使用：デバイス ID と広告データは「する」
- **マイク（音声データ）は「収集しない」**：音量を端末内で測るだけで、録音・保存・送信をしないため

**審査メモ（App Review に関する情報 → メモ。初回の「Guideline 2.1 - Information Needed」で聞かれる内容を先に書いておく）**

```
This is a casual sports game. Swing your iPhone upward to make a grumpy dad flip a chabudai (a low Japanese dining table) and see how far it flies across a shot put stadium.

1. Purpose and audience: A free entertainment game for general audiences (13+). No login or account is required.
2. How to use: Tap "Start" (allow the microphone), tap "Get set", then hold the iPhone firmly, spin around once and swing it upward while shouting. The motion sensors (accelerometer, gyroscope, compass) measure the swing, and the microphone measures only the loudness of the shout. Audio is never recorded, stored or sent. Devices without motion sensors can play with touch controls (circle a finger on the screen, then flick up and to the right).
3. External services: Google AdMob (interstitial ads and an optional rewarded ad that gives a tailwind on the next throw). The app asks for App Tracking Transparency permission at launch and shows the Google consent form in regions where it is required.
4. Regional differences: None, except the ad consent form shown by Google in the EEA/UK. The UI is in Japanese or English depending on the device language.
5. Regulated industries / third-party content: None. All graphics and sounds are original.
A screen recording on a physical iPhone is attached.
```

入力が終わったら「審査用に追加」→「審査へ提出」。「審査用に追加できません」と出たら、コンテンツの配信権とプライバシーポリシー URL が入っているか確かめる。

---

## 6. 公開後にやること

- AdMob で iOS アプリを App Store のアプリに紐づける（「アプリ」→ iOS のアプリ →「アプリの設定」）
- App Store からインストールして、起動・同意画面・トラッキングとマイクの確認・広告を確認する

---

## 7. 自動化の準備（2回目以降を GitHub Actions に任せる場合）

JET STRIKE で API キーと証明書を作ってあれば、それを使い回せます（Apple Developer のチーム共通）。
**Secrets はリポジトリごとに登録が必要**なので、このリポジトリにも次の 5 つを登録します。

| 名前 | 内容 |
| --- | --- |
| `IOS_DIST_CERT_P12_BASE64` | 配布用の証明書（.p12）を `base64 -i 証明書.p12 \| tr -d '\n' \| pbcopy` で変換した文字列 |
| `IOS_DIST_CERT_PASSWORD` | .p12 を書き出したときのパスワード |
| `ASC_KEY_ID` | App Store Connect API キーのキー ID |
| `ASC_ISSUER_ID` | Issuer ID |
| `ASC_KEY_P8_BASE64` | API キー（.p8）を `base64 -i AuthKey_XXXXXXXXXX.p8 \| tr -d '\n' \| pbcopy` で変換した文字列 |

登録画面：https://github.com/techgymjp/chabudai/settings/secrets/actions

まだ作っていない場合の作り方は、JET STRIKE の `docs/IOS_BUILD.md` の 7 章（API キーの作成、証明書の書き出し）と同じです。
登録が終わったら、Claude Code に「iOS の自動アップロードのワークフローを作って」と頼みます。

**注意**：証明書（.p12）、そのパスワード、API キー（.p8）は、チャット・AI へのアップロード・リポジトリへのコミットで**絶対に共有しない**でください。

---

## GitHub Actions のビルド確認

`.github/workflows/ios.yml` が、push のたびに GitHub の Mac で「署名なしでシミュレーター向けにビルドできるか」を確かめます。
ここが失敗しているときは、Mac で Archive しても失敗するので、先に Claude Code に直してもらいます。

## つまずきやすいところ

| 症状 | 対処 |
| --- | --- |
| アップロードで「同じビルド番号がすでにある」 | General の Build の番号を上げてから Archive し直す |
| Signing でエラー（チームが選べない、証明書がない） | Xcode の Accounts で Apple ID にサインインし直し、Team に自分のチームを選ぶ。「Automatically manage signing」をオンにする |
| 実行先に iPhone が出ない | ケーブルをつなぎ直し、iPhone で「信頼」を許可。デベロッパモードをオンにする |
| 実行先に「iOS 26.x Not Installed」 | 「Get」で iOS のシミュレーターと部品をダウンロードする（8 GB ほど。Archive にも必要） |
| ビルドが古いゲームのまま | `npm run ios:sync`（または `ios:release`）を実行し忘れている。`git pull` してから実行し直す |
| `npm run ios:release` が「本番の AdMob の ID が設定されていません」で止まる | iOS 用の AdMob の ID がまだ入っていない。0 章の 3 を済ませて Claude Code に ID を渡す |
| アップロードしたビルドが選べない | バージョンのページの「バージョン」を 1.0.0 にして保存する |
| マイクの確認画面が出ない・気合のメーターが動かない | iPhone の「設定」→ ちゃぶ台返し →「マイク」をオンにする |
| 投げたあとの効果音が小さい | 本体の消音スイッチ（着信/消音）がオフか確認する。それでも小さいときは Claude Code に伝える |
| App Store の審査で「Xcode が古い」と言われる | Xcode を最新版に更新してから Archive し直す |
| 本番広告とテスト広告の取り違え | App Store 用は必ず `npm run ios:release`。Xcode から実機で試すときは `npm run ios:sync` に戻す |
