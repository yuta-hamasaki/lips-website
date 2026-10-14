# LIPS ticketing setup

## Services

- **microCMS** owns event content. Create an `events` endpoint with the fields represented by `CmsEvent` in `lib/events/types.ts`. `stripePriceId` is only a reference; Stripe Price owns the charged unit amount.
- **Stripe** owns payment. Configure the production webhook URL as `/api/stripe/webhook` and subscribe to `checkout.session.completed`.
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

Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`. The signed webhook remains the reliable fulfillment path. The payment success page also retrieves the Checkout Session directly from Stripe and uses the same idempotent issuance function so the QR code and ticket URL can be shown immediately.

## 管理画面の使い方

1. サーバーの `.env.local`（本番ではホスティング側の環境変数）に、十分に長いランダムな `ADMIN_API_KEY` を設定し、サーバーを再起動します。値を公開する環境変数にはしないでください。
2. `/admin` を開き、ブラウザの認証ダイアログでユーザー名 `admin`、パスワードに `ADMIN_API_KEY` の値を入力します。現在は共通パスワード方式で、ユーザー名は検証されません。管理者の登録画面やスタッフごとのアカウント・権限はありません。
3. EVENTS で売上を確認し、イベントを開くと購入者検索・入場状態の絞り込み・QR表示・チケットページ表示ができます。売上は決済済み注文を通貨別に集計し、返金を除外します。Stripe手数料を差し引く前の金額です。
4. 「手動で入場」から対象者を確認し、「入場を確定」を押します。未入場かつ決済済みのチケットだけ処理でき、重複入場は防止されます。QRの読み取りでは `/admin/check-in` でイベントを選び、QRに含まれるURLまたはトークンを貼り付けて VALIDATE → CONFIRM CHECK-IN を押します。スマートフォンのカメラでQRのURLを開く方法も使えます。
5. CUSTOMERS で全イベントの顧客を名前・メールで検索し、注文数・購入総額・参加イベントを確認できます。

### ユーザー登録

顧客の会員登録・ログイン画面はありません。公開イベントのチケット購入から Stripe Checkout で名前とメールアドレスを入力し、決済が完了すると顧客・注文・チケットが自動登録されます。同じメールアドレスは既存の顧客に紐づきます。管理画面から顧客だけを手動登録する機能もありません。

管理者を増やす場合、現在は同じ共通パスワードを利用します。個別のユーザー登録、パスワードリセット、権限管理が必要なら、個別アカウントの認証基盤を追加する必要があります。Basic認証にはアプリ内ログアウトがなく、ブラウザが認証情報を保持します。
