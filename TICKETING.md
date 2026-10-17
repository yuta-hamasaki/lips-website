# LIPS ticketing setup

## Services

- **microCMS** owns event content. Create an `events` endpoint with the fields represented by `CmsEvent` in `lib/events/types.ts`. `stripePriceId` is only a reference; Stripe Price owns the charged unit amount.
- **Stripe** owns payment. Configure the production webhook URL as `/api/stripe/webhook` and subscribe to `checkout.session.completed` and `charge.refunded`.
- **Neon/PostgreSQL** owns customers, orders, issued tickets, and check-in state.
- **Resend** sends the ticket after the database transaction commits.

Copy `.env.example` to `.env.local` and set every credential. `ADMIN_API_KEY` is an intentionally small MVP Basic Auth boundary: use username `admin` and the configured key as the password. Replace `lib/admin-auth.ts` and `middleware.ts` with the project's identity provider before adding multiple staff roles.

## microCMS event schema

Create a **list** API whose API ID matches `MICROCMS_EVENTS_ENDPOINT` (`events` by default). Required field IDs are `title`, `slug`, `date` (date/time), and `venue`. The implementation also accepts `eventTitle`/`eventDate` as aliases. Optional field IDs are `description`, `doorsOpen`, `startTime`, `address`, `heroImage`, `artists`, `djs`, `ticketSalesStart`, `ticketSalesEnd`, `stripePriceId`, `ticketLabel`, and `status`.

Published microCMS records are treated as `published` when the optional custom `status` field is omitted. If provided, its supported values are `published`, `draft`, `sold-out`, and `cancelled`. Both a single-select array such as `["published"]` and a plain string are accepted. Empty, unknown, or multiple selections are treated as `draft`. A title such as `見本（公開しないこと）` does not prevent publication: unpublish test content in microCMS or set its custom status to `["draft"]`.

`date` is the authoritative event timestamp, including its timezone (for example, `2026-10-01T06:30:00.000Z` is September 30 at 23:30 in Vancouver). Homepage dates and times are derived from this timestamp in `America/Vancouver`. `doorsOpen` and `startTime` are display strings and accept values such as `21:30` and `22:00:00`; they do not override `date`. Set `date` to the actual event start instant. `heroImage` accepts the microCMS image object (`url`, `width`, `height`). `artists` and `djs` accept repeated custom-field objects with `name`; extra metadata such as `fieldId` is ignored.

Give `MICROCMS_API_KEY` GET permission for the events endpoint; do not expose it with a `NEXT_PUBLIC_` name. Set `MICROCMS_SERVICE_DOMAIN` to only the service name—not a full URL. Both `lips` and an accidentally pasted `https://lips.microcms.io` are normalized, but `lips` is preferred.

If no events appear, check the server log for `MICROCMS_CONFIG_MISSING`, `MICROCMS_AUTH_FAILED`, or `microCMS request failed`. Invalid records are logged with only their content ID and missing field names; credentials and response bodies are never logged.

To verify the service domain, API key, endpoint, and GET permission without starting the app, run:

```bash
npm run test:microcms
```

The command reads `.env` and `.env.local`, never prints the API key, and returns a non-zero exit code with a diagnostic hint when the connection fails.

## Database deployment

Never reset a shared Neon database. For a new database or after reviewing the checked-in SQL, deploy migrations with:

```bash
npx prisma migrate deploy
npx prisma generate
```

Use `npx prisma migrate dev --name <change>` only against a disposable development database when making later schema changes.

## Local Stripe webhook

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Keep this command running during test purchases, put its printed signing secret in `STRIPE_WEBHOOK_SECRET`, and restart the development server. A dashboard endpoint cannot deliver directly to localhost. For production, register `https://<your-site>/api/stripe/webhook` in Stripe, subscribe to `checkout.session.completed` and `charge.refunded`, and configure that endpoint's signing secret on the deployed server.

The signed webhook remains the reliable fulfillment path. The payment success page also retrieves the Checkout Session directly from Stripe and uses the same idempotent issuance function so the QR code and ticket URL can be shown immediately. Both paths attempt email delivery; already sent or currently sending orders are skipped. Email failures return a non-success webhook response so Stripe can retry without issuing another ticket. The success page still displays the ticket if email fails; revisiting it retries PENDING or FAILED delivery.

Set `RESEND_API_KEY` and a `RESEND_FROM_EMAIL` using a verified domain. Set `NEXT_PUBLIC_APP_URL` to the public site URL in production so emailed ticket links work for buyers. Resend API acceptance is recorded as SENT; actual inbox delivery must be checked in Resend's Emails dashboard.

Run the isolated email regression checks with `node --test scripts/tests/ticket-email.cjs`.

## 管理画面の使い方

1. サーバーの `.env.local`（本番ではホスティング側の環境変数）に、十分に長いランダムな `ADMIN_API_KEY` を設定し、サーバーを再起動します。値を公開する環境変数にはしないでください。
2. `/admin` を開き、ブラウザの認証ダイアログでユーザー名 `admin`、パスワードに `ADMIN_API_KEY` の値を入力します。ユーザー名も検証します。既存アカウント名はadmin（ADMIN_USERNAMEで変更可能）です。追加アカウントは個別の名前とパスワードでログインでき、全員が同じ管理権限を持ちます。
3. EVENTS で売上を確認し、イベントを開くと購入者検索・入場状態の絞り込み・QR表示・チケットページ表示ができます。売上は決済済み注文を通貨別に集計し、返金を除外します。Stripe手数料を差し引く前の金額です。
4. 「手動で入場」から対象者を確認し、「入場を確定」を押します。未入場かつ決済済みのチケットだけ処理でき、重複入場は防止されます。QRの読み取りでは `/admin/check-in` でイベントを選び、「カメラでQRを読み取る」を押します。読み取り後に保持者名・イベント名を確認し、「この保持者をチェックインする」で確定します。URL・トークンの手動入力も利用できます。
5. CUSTOMERS で全イベントの顧客を名前・メールで検索し、注文数・購入総額・参加イベントを確認できます。

### ユーザー登録

顧客の会員登録・ログイン画面はありません。公開イベントのチケット購入から Stripe Checkout で名前とメールアドレスを入力し、決済が完了すると顧客・注文・チケットが自動登録されます。同じメールアドレスは既存の顧客に紐づきます。管理画面から顧客だけを手動登録する機能もありません。

追加管理者は `node scripts/create-admin-account.mjs <username>` で作成します。自動生成の強いパスワードを使い、ハッシュだけをADMIN_ACCOUNTS_JSONへ保存します。初期認証情報はGit管理外の.local/admin-<username>.txtへ、所有者のみ読める権限で保存し、コンソールには出しません。Basic認証にはアプリ内ログアウトがなく、ブラウザが認証情報を保持します。ブラウザで別アカウントを試す場合はプライベートウィンドウを使ってください。


## Ticket security update (applied to the existing development database)

Before deploying the holder-name/refund changes, review [the migration proposal](docs/proposals/ticket-security-migration.md). The schema and code require Ticket.holderName and RefundedPayment; the approved migration is registered at prisma/migrations/20261016000000_ticket_holder_refund_security/migration.sql and was applied to the user-selected development database on 2026-10-16. Production migration/deployment is not included; confirm the production target and stop old writers before any future production migrate deploy. Coordinate database migration, client generation, and code deployment while old issuance workers are stopped.

Full refunds revoke admission; partial-refund admission behavior is intentionally unimplemented pending the owner's policy decision. A later cumulative refund that reaches the full charge amount is treated as full. Keep both webhook event subscriptions above. Existing historical refunds need an owner-approved reconciliation step.

Check-in POSTs must include application/json, an Origin exactly matching the origin of NEXT_PUBLIC_APP_URL, and X-LIPS-Check-In: 1. Both built-in staff clients send the custom header; browsers supply Origin. Missing Origin is rejected, including CLI callers unless they explicitly supply it. Do not add permissive CORS. Configure NEXT_PUBLIC_APP_URL as the canonical staff-site URL for each environment.

Offline regression command (15 mock tests passed with an empty application environment):

    node --test scripts/tests/ticket-email.cjs scripts/tests/security-fixes.cjs


## カメラ受付・売上グラフ・追加管理者

- カメラ受付: HTTPSまたはlocalhostで利用可能。映像は端末内のjsQRで解析し送信・録画しない。背面カメラを優先し、QRを1件読んだ時点、停止、画面を隠した時点、ページ離脱時にストリームを停止する。読み取り自体では入場状態は変わらず、保持者名を確認して確定する。拒否されたカメラや対応しない端末では手動入力を利用する。
- 売上グラフ: /admin/events とイベント詳細画面に表示。直近30日/90日/1年/全期間（最大10年）、通貨、売上/注文数を切り替える。購入日時をVancouverの日付で集計し、返金済み注文を除外する。決済手数料は控除せず、異なる通貨を合算しない。日別数値表も表示できる。
- ローカル設定にadmin2を作成済み。既存adminと同じ画面・操作権限を持ち、別パスワードを使用する。旧仮アカウントstaff2は残していない。初期パスワードは.local/admin-admin2.txtを参照（認証情報はコミット・チャット貼付しない）。
- 既存adminのユーザー名はADMIN_USERNAMEまたはadmin。従来の任意ユーザー名でのログインは受け付けない。ADMIN_API_KEYの値は変更していない。
- 環境設定を読み直すため開発サーバーを再起動する。本番でも利用する場合は、デプロイ環境の秘密設定へADMIN_ACCOUNTS_JSONを登録して再デプロイする。.localの初期認証情報ファイルは公開・デプロイしない。ADMIN_USERNAMEを指定した場合はその値も設定する。
- アカウントを無効化するには該当するADMIN_ACCOUNTS_JSON要素を削除して再起動する。ハッシュ済みデータは自動生成の256bitパスワード向けで、短い手入力パスワードをこの設定へ置かない。
- DBスキーマ変更は不要。管理者追加はローカル環境設定への保存で、本番のアカウント作成・デプロイは未実施。
- モック回帰テスト・集計テスト・QR生成/デコードテストをscripts/tests/admin-features.cjsに追加。物理カメラとスマートフォンでのブラウザ確認は別途必要。
