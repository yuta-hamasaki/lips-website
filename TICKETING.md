# LIPS ticketing setup

## Services

- **microCMS** owns event content. Create an `events` endpoint with the fields represented by `CmsEvent` in `lib/events/types.ts`. `stripePriceId` is only a reference; Stripe Price owns the charged unit amount.
- **Stripe** owns payment. Configure the production webhook URL as `/api/stripe/webhook` and subscribe to `checkout.session.completed`.
- **Neon/PostgreSQL** owns customers, orders, issued tickets, and check-in state.
- **Resend** sends the ticket after the database transaction commits.

Copy `.env.example` to `.env.local` and set every credential. `ADMIN_API_KEY` is an intentionally small MVP Basic Auth boundary: use username `admin` and the configured key as the password. Replace `lib/admin-auth.ts` and `middleware.ts` with the project's identity provider before adding multiple staff roles.

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

Put the printed signing secret in `STRIPE_WEBHOOK_SECRET`. Ticket issuance occurs only in the signed webhook, never on the success page.
