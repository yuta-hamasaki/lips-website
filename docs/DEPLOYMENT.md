# LIPS 公開手順書

作成日：2026年10月20日（America/Vancouver）

このプロジェクトを **GitHub → Vercel → 独自ドメイン** で公開する手順です。Vercelは手順書の前提で、接続・契約・デプロイ済みという意味ではありません。他のホスティングを使う場合も、サービス設定・DB更新・公開後確認は共通です。

関連資料：[公開前チェックリスト](RELEASE-CHECKLIST.md) / [監視・バックアップ・復旧](OPERATIONS.md)

## 1. 公開までの順序

1. 本番URL・返金条件・本番DBを決める。
2. Node.js 22で依存関係をインストールする。
3. PostgreSQL、microCMS、Stripe、Resendの本番設定を準備する。
4. ローカルの本番用設定ファイルと、VercelのProduction環境変数を登録する。
5. 設定チェックとテストを通す。
6. 本番DBをバックアップし、マイグレーションを適用する。
7. Vercelへデプロイし、ドメイン・HTTPS・Webhookの疎通を確認する。
8. 実機でログイン・購入・メール受信・入場・返金を確認する。
9. 最後に販売対象イベントを公開する。

コードの公開とチケット販売開始は別の作業です。確認中のイベントはmicroCMSで非公開または `draft` にしておきます。

## 2. 最初に決めること

| 項目 | 決める内容 |
| --- | --- |
| 正式URL | `https://` から始まるURL。wwwあり・なしをどちらかに統一する |
| 本番DB | 開発と分けたPostgreSQLのプロジェクト・DB名。実データを置く対象を明確にする |
| 返金条件 | 返金可否、開催中止・延期時の対応。`NEXT_PUBLIC_REFUND_POLICY` に設定する文面 |
| 入場条件 | 年齢・身分証・再入場など、イベント固有の案内 |
| メール送信元 | Resendで認証できる所有ドメインのアドレス |
| 公開担当者 | GitHub、Vercel、DB、DNS、Stripe、Resendを管理できる人 |

問い合わせ先は `yutahamasaki.official@gmail.com`、Instagramは [@lips_event_vancouver](https://www.instagram.com/lips_event_vancouver/) です。
Privacy本文に記載されたサイトURLも、確定した正式URLと一致しているか確認してください。

## 3. パソコン側の準備

### 3-1. プロジェクトへ移動

この手順書のコマンドは、すべて `lips-website` ディレクトリで実行します。

```bash
cd /Users/hamasakiyuta/Desktop/lips-homepage/lips-website
node --version
npm --version
```

Node.jsは **22系、22.13.0以上** を使用します。22系に付属するnpmも使用してください。nvmを導入済みの場合は次のコマンドで `.nvmrc` を利用できます。

```bash
nvm install
nvm use
npm ci
```

nvmを利用しない場合はNode.js 22をインストールしてから `npm ci` を実行します。`npm ci` はlockfileどおりに依存関係を入れ直すので、実行中は開発サーバーを停止してください。

このプロジェクトはNext.js 15、React 19、Prisma 6を使用します。公開作業中に `npx prisma@latest` などで別のメジャーバージョンへ変更しないでください。

### 3-2. 本番用ファイルを用意

開発用の `.env` はそのままにし、本番作業用として `.env.production.local` を作ります。すでに存在する場合は上書きせず内容を確認してください。

```bash
cp -n .env.example .env.production.local
chmod 600 .env.production.local
```

エディタで `.env.production.local` を開き、次の章の値を設定します。秘密情報はチャット・スクリーンショット・Gitへ掲載しないでください。

**重要：Prisma CLIは `.env.production.local` を自動で選びません。** 本書のDBコマンドはNode.js 22の `--env-file` で明示的に読み込みます。すでにターミナルへexportされた同名の変数はファイルより優先されるため、DB操作前に接続先のプロジェクト・DB名を確認します。

## 4. 本番サービスを準備する

### 4-1. PostgreSQL

1. 本番用DBを用意し、開発DBと区別できる名前を付ける。
2. アプリ接続用URLを `DATABASE_URL` に設定する。
3. DB管理・マイグレーション用の直接接続URLを `DIRECT_URL` に設定する。
4. URLのユーザー名・パスワードは、プロバイダーの接続画面から取得する。
5. 自動バックアップと復旧先を用意する。

接続プールを使用する場合も、`DATABASE_URL` と `DIRECT_URL` は同じ本番DBを指すようにします。開発DBのURLをそのまま本番へコピーしないでください。

### 4-2. microCMS

1. events / artistsのAPIを準備する。既存のサービスを本番にも使う場合はテスト記事の公開状態を確認する。
2. APIキーに、使用する各APIのGET権限を付ける。
3. `MICROCMS_SERVICE_DOMAIN` にサービス名を設定する。
4. `MICROCMS_EVENTS_ENDPOINT` / `MICROCMS_ARTISTS_ENDPOINT` に実際のAPI IDを設定する。
5. イベントの必須項目 `title` / `slug` / `date` / `venue` を入力する。
6. `date` はタイムゾーンを含む日時で設定する。画面ではVancouver時間に変換される。
7. Stripe本番Price IDを `stripePriceId` に設定する。
8. 必要に応じて `ticketSalesStart` / `ticketSalesEnd` を設定する。

`status` 未設定の公開記事は販売対象になり得ます。テスト記事はmicroCMS自体で非公開にするか、カスタムstatusを `draft` にしてください。イベント開始時刻に達すると新規購入は停止します。

詳しいフィールド仕様は [TICKETING.md](../TICKETING.md#microcms-event-schema) を参照します。

### 4-3. Stripe

1. Stripeアカウントで本番決済に必要な登録を完了する。
2. **本番モード**で商品と1回払いのPriceを作成する。
3. 通貨・販売金額を確認する。本番の `price_...` をmicroCMSへ設定する。
4. 本番シークレットキー `sk_live_...` を `STRIPE_SECRET_KEY` に設定する。
5. 正式URLに対し、次のWebhook送信先を登録する。

```text
https://正式ドメイン/api/stripe/webhook
```

受信するイベント：

- `checkout.session.completed`
- `charge.refunded`

この送信先の署名シークレット `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定します。ローカルの `stripe listen` が表示した署名キーとは別です。

この実装の決済手段はカードです。Stripe Dashboardの汎用テストイベントには、このアプリが設定するイベントmetadataが入らないことがあり、発券までの確認には使えません。実アプリから開始したCheckoutで確認します。

WebhookにはHTTPSが必要です。Vercelの認証保護やWAFでStripeからのアクセスを止めていないことも確認します。[Stripe公式：Webhook](https://docs.stripe.com/webhooks)

### 4-4. Resend

1. 所有する送信ドメインをResendへ追加する。
2. Resendが指定するDNSレコードをDNS管理画面へ登録する。
3. Resend側でドメインが認証済みになったことを確認する。
4. APIキーを発行し `RESEND_API_KEY` に設定する。
5. `RESEND_FROM_EMAIL` に認証済みドメインの送信元を設定する。

問い合わせ用Gmailと、チケットメールの送信元は別です。`RESEND_FROM_EMAIL` にGmailアドレスを入れず、所有・認証したドメインを使います。[Resend公式：ドメイン認証](https://resend.com/docs/dashboard/domains/introduction)

## 5. 本番環境変数一覧

`.env.production.local` とVercelの **Production** に、同じ本番設定を登録します。
Vercelへ登録するときは通常、値を囲む `.env` の引用符を含めず、値そのものを入力します。

| 環境変数 | 内容 | 公開される値か |
| --- | --- | --- |
| `DATABASE_URL` | 本番アプリ用DB接続URL | 秘密 |
| `DIRECT_URL` | 同じ本番DBの直接接続URL | 秘密 |
| `MICROCMS_SERVICE_DOMAIN` | microCMSのサービス名 | サーバー用 |
| `MICROCMS_API_KEY` | events / artistsのGET権限付きキー | 秘密 |
| `MICROCMS_EVENTS_ENDPOINT` | events API ID。通常 `events` | サーバー用 |
| `MICROCMS_ARTISTS_ENDPOINT` | artists API ID。通常 `artists` | サーバー用 |
| `STRIPE_SECRET_KEY` | 本番の `sk_live_...` | 秘密 |
| `STRIPE_WEBHOOK_SECRET` | 本番Webhook送信先の `whsec_...` | 秘密 |
| `RESEND_API_KEY` | ResendのAPIキー | 秘密 |
| `RESEND_FROM_EMAIL` | `LIPS Tickets <認証済み送信元>` | サーバー用 |
| `NEXT_PUBLIC_APP_URL` | 正式なHTTPSオリジン。パス・クエリなし | 公開 |
| `ADMIN_1_USERNAME` | 管理者1のユーザー名 | サーバー用 |
| `ADMIN_1_PASSWORD` | 管理者1のパスワード | 秘密 |
| `ADMIN_2_USERNAME` | 管理者2のユーザー名 | サーバー用 |
| `ADMIN_2_PASSWORD` | 管理者2のパスワード | 秘密 |
| `ADMIN_SESSION_SECRET` | 32文字以上のランダムな署名用秘密 | 秘密 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `yutahamasaki.official@gmail.com` | 公開 |
| `NEXT_PUBLIC_REFUND_POLICY` | 確定した返金・中止・延期条件 | 公開 |

管理者パスワードは各16文字以上、32文字以上のランダムな値を推奨します。2名のパスワードは別々にします。
`ADMIN_2_PASSWORD_HASH` が残っていても、`ADMIN_2_PASSWORD` が設定されていればパスワード欄が優先されます。本書では両名ともパスワード欄へ設定する運用に統一します。

`NEXT_PUBLIC_` の付く変数はビルドへ埋め込まれます。**正式URL・問い合わせ先・返金条件を変更したら再ビルド・再デプロイします。** 秘密の変数へ `NEXT_PUBLIC_` を付けてはいけません。

`LIPS_BUILD_DIR` はローカル検証用です。本番Vercelには登録せず、既定の `.next` を使います。

## 6. 公開前チェック

### 6-1. コードの確認

```bash
npm run lint
npm run typecheck
npm test
```

### 6-2. 本番設定の確認

```bash
node --env-file=.env.production.local scripts/check-production-config.mjs
```

成功時は `Production configuration format checks passed` と表示されます。
このコマンドは設定形式の検証で、DB疎通・Stripe審査・Resend認証やメール受信まで保証するものではありません。

### 6-3. 本番用ビルドの確認

開発サーバーを止めてから実行します。

```bash
npm run check:release
```

このコマンドは本番設定チェック、Lint、テスト、ビルドを順に実行します。Next.jsと設定チェックは `.env.production.local` を読み込みます。本番DBへのマイグレーションや、テスト決済・メール送信は行いません。ただし、ビルドでmicroCMSの公開コンテンツ取得が発生することがあります。

新しいコードのビルドが通ったことを確認してから、本番DBの更新へ進みます。

## 7. 本番DBを更新する

この章だけは **本番DBへ変更を加える操作** です。接続先、バックアップ、適用SQLを確認してから進めます。以下のコマンドは手順の説明で、本書の作成時には実行していません。

### 7-1. 適用状況を確認

```bash
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate status
```

確認対象のマイグレーション：

- `20260909213000_add_ticketing`
- `20261016000000_ticket_holder_refund_security`
- `20261020000000_admin_login_rate_limit`

未適用があれば `migrate status` が非ゼロ終了する場合があります。接続失敗・失敗済みマイグレーションと、単なる未適用を区別してください。
既存テーブルがあるのに移行履歴がない場合は、その場で `reset` や `resolve` を実行せず、DBの状態と既存SQLを照合します。

### 7-2. 既存DBならバックアップ

pg_dumpをインストールし、接続先Postgresと互換性のあるバージョンを使います。

```bash
node --env-file=.env.production.local scripts/backup-database.mjs
```

`.local/backups` に保存されたファイルを確認し、暗号化した別保管先へコピーします。新規の空DBなら、まだ保存データがないことを確認した上でバックアップ工程を省略できます。

### 7-3. マイグレーションを適用

既存サイトが稼働している場合は、購入・発券・受付の旧処理を止めてから適用します。まだ初回公開前なら販売を始めないまま適用します。

```bash
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.production.local node_modules/prisma/build/index.js migrate status
```

成功後、すべての移行が適用済みと確認します。今回のコードには `AdminLoginRateLimit` テーブルと `Order.ticketEmailClaimedAt` 列が必要です。

本番では `prisma migrate dev` / `prisma migrate reset` / `prisma db push --accept-data-loss` を使用しません。`migrate deploy` はアプリのビルドやPrisma Clientの生成とは別の処理です。[Prisma公式：CLIリファレンス](https://www.prisma.io/docs/orm/v7/reference/prisma-cli-reference#migrate-deploy)

## 8. GitHubへ公開対象を送る

現在のリポジトリは `yuta-hamasaki/lips-website` です。Gitルートは `lips-website` 自体で、親の `lips-homepage` ではありません。

```bash
git status --short
git diff --check
git ls-files .env .env.local .env.production.local '.local/*'
```

最後のコマンドで秘密ファイルが表示されないことを確認します。変更・新規ファイルの一覧を確認し、公開対象だけをコミットします。

```bash
git add .
git diff --cached --stat
git commit -m "Prepare LIPS website for launch"
git push -u origin HEAD
```

上記は現在のブランチを送ります。VercelのProduction Branchと一致しているか確認してください。
すでにVercelが連携済みの場合、Production Branchへのpushはデプロイを開始し得るため、**DB更新・環境設定を先に完了させます**。本書ではDB更新後にpushする順序です。

## 9. Vercelへデプロイ

### 9-1. プロジェクト設定

VercelでGitHubリポジトリをImportし、次を設定します。[Vercel公式：Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs)

| 設定 | 値 |
| --- | --- |
| Repository | `yuta-hamasaki/lips-website` |
| Framework Preset | Next.js |
| Root Directory | `.`。`lips-website` を重ねて指定しない |
| Node.js | 22.x |
| Install Command | `npm ci` |
| Output Directory | Next.jsの既定値。`out` にしない |
| Production Branch | 公開に使用するブランチを指定 |

Productionでは公開前チェックも走らせ、Previewではテストキーを使えるよう、Build Commandは次の条件式を使います。

```sh
if [ "$VERCEL_ENV" = "production" ]; then npm run check:release; else npm run build; fi
```

DBマイグレーションはこのBuild Commandへ入れません。Previewのビルドや並行デプロイが、本番DBを書き換えるのを防ぐためです。

### 9-2. 環境変数

Project SettingsのEnvironment Variablesで、5章の設定をProductionへ登録します。
Previewには別DB・Stripeテストキー・テスト用Webhook・別の管理者秘密を設定します。本番DBと本番キーをPreviewへ共有しないでください。

Preview上でログインや購入まで確認する場合は、その環境専用の固定HTTPSドメインを用意し、そのURLをPreviewの `NEXT_PUBLIC_APP_URL` にしてビルドします。毎回変わるデプロイURLと設定URLが食い違うと、認証・受付POSTが403になります。

環境変数を変更したら、新しくデプロイし直します。[Vercel公式：環境変数](https://vercel.com/docs/environment-variables)

### 9-3. デプロイとドメイン

1. デプロイし、Build Logsが成功していることを確認する。
2. Project SettingsのDomainsで正式ドメインを追加する。
3. DNS管理画面で、Vercelが表示するレコードを登録する。IPやレコード値は本書の固定値を使わず、実際の案内に従う。
4. wwwあり・なしの両方を使う場合は、正式な方へ転送する設定にする。
5. DNSとHTTPSの設定が有効になったことを確認する。
6. 正式なURLでホーム・Privacy・Termsを開く。

正式ドメインの準備が済むまでは販売を開始しません。設定と異なる `vercel.app` のURLで管理画面を操作すると403になる場合があります。[Vercel公式：独自ドメイン](https://vercel.com/docs/domains/working-with-domains/add-a-domain)

## 10. 公開後の確認表

### サイト・管理画面

- [ ] 正式URLがHTTPSで開く。wwwの扱いが統一されている。
- [ ] スマートフォンでレイアウトとリンクを確認する。
- [ ] Instagramと問い合わせメールが正しい。
- [ ] Privacy全文とチケット案内・返金条件を確認する。
- [ ] `/admin` から管理者1・2それぞれでログインできる。
- [ ] ログアウトするとホームへ移動し、再び管理画面を開くとログインが必要になる。
- [ ] ログアウト後にブラウザの戻る操作で管理操作を再開できない。
- [ ] ログイン失敗を短時間に繰り返すと制限される。制限確認はスタッフ業務外で実施する。
- [ ] `/robots.txt` / `/sitemap.xml` / OGP画像が正しい。

### 購入・メール・入場

まず本番と分離したテスト環境で実施します。本番で少額の確認決済を行う場合は、金額・返金方法・担当者を先に決めます。テストカードはStripe本番モードでは使用しません。

- [ ] アプリのイベントページからCheckoutを開始できる。
- [ ] Stripe画面の金額・通貨が販売内容と一致する。
- [ ] 決済後、完了ページにチケットが表示される。
- [ ] Stripe Webhookの配送が2xxで成功している。
- [ ] チケットメールを実際の受信箱で受信できる。迷惑メールフォルダーも確認する。
- [ ] `/admin/operations` に未送信・停止注文が残っていない。
- [ ] iPhone/AndroidのカメラでQRを読み取り、対象イベント・保持者名を確認できる。
- [ ] 入場確定が成功し、2回目は使用済みと表示される。
- [ ] 未ログイン状態でQR受付URLを開き、ログイン後もトークンが残る。
- [ ] 全額返金後、チケットで入場できなくなる。
- [ ] 売上・注文数に反映され、返金分が売上から除外される。
- [ ] 販売終了・開催開始後・sold-outの新規購入が拒否される。

売り切れ制御は現在手動です。microCMSのstatusを `sold-out` に変更しても、作成済みStripe Checkout Sessionは自動で消えません。厳密な定員保証が必要なら、販売開始前に [満席時の運用](OPERATIONS.md#満席時) を確認してください。

## 11. 問題が起きたとき

| 症状 | 確認すること |
| --- | --- |
| ビルド失敗 | Node.js 22、`npm ci`、Build Logs、環境変数のProduction対象 |
| 本番設定チェック失敗 | エラーに出た変数名。値をログやチャットへ貼らず修正する |
| ログイン503 | DB接続と `AdminLoginRateLimit` の移行適用状況 |
| ログイン・ログアウト・受付が403 | 開いているURLとビルド時の `NEXT_PUBLIC_APP_URL` が一致するか |
| 既存ログインが突然無効 | 管理者設定・署名秘密の更新後は再ログインが必要 |
| イベントが出ない | CMSのGET権限・必須項目・公開状態・Vancouver基準の開催日時 |
| 決済できない | 本番Price ID、販売期間、イベントstatus、Stripeの本番登録 |
| 決済後に発券されない | Webhook署名キー、配送ログ、CMSのPrice IDを決済後に変更していないか |
| メールが来ない | Resend認証・送信元・配信ログ、`/admin/operations` の送信状態 |
| QRが動かない | HTTPS、カメラ許可、受付イベント、支払/使用/取消状態 |
| Prismaの移行が失敗 | 失敗したSQLとDB状態を確認。resetや履歴の手動書換えで回避しない |

Stripeでは、先に失敗原因を直してから必要なWebhookを再送します。Resendの再試行には24時間の冪等キーの期限があるため、古い注文は送信履歴を確認します。

## 12. 次回以降の更新と復旧

1. 開発環境で修正し、Lint・型チェック・テストを通す。
2. DB変更があるか確認し、ある場合は対象DBのバックアップと移行計画を準備する。
3. Preview環境で確認する。本番の秘密・DBを使用しない。
4. 必要なDB移行を先に行い、Production Branchへ反映する。
5. デプロイ後、正式ドメインで主要動作を確認する。
6. URL・返金条件など `NEXT_PUBLIC_` の変更を含む場合は必ず再ビルドする。

Vercelのデプロイを前の版へ戻しても、DB変更やStripeの決済は戻りません。復旧時は購入・発券・受付を止め、DB互換性と支払い済み注文の照合を先に行います。具体的なバックアップ・復旧訓練は [OPERATIONS.md](OPERATIONS.md) を参照してください。

## 公開完了の記録

完了後、秘密の値を含めず担当者が記入します。

| 項目 | 記録 |
| --- | --- |
| 正式URL | 未記入 |
| 公開日時・タイムゾーン | 未記入 |
| デプロイID / コミット | 未記入 |
| 対象DBのプロジェクト・DB名 | 未記入（接続URL・パスワードは記載しない） |
| マイグレーション結果 | 未記入 |
| Webhook確認 | 未記入 |
| メール実受信確認 | 未記入 |
| 実機・入場・返金確認 | 未記入 |
| 確認担当者 | 未記入 |

本書の作成は公開作業の実施を意味しません。本番へのデプロイ、DB適用、実決済、メール送信は、本書作成のためには実行していません。
