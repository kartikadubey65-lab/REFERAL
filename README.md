# Kartika Referral Circle

A responsive referral website with a user dashboard, admin review, persistent credits and single-use booking vouchers.

## Run the code

Requires Node.js 22.13+ (Node 24 recommended).

```powershell
npm install
npm run db:local
npm run dev
```

Open the local URL printed by the development server. The anonymous dashboard is previewable locally. Use the sign-in button for the Sites local development identity; hosted sign-in uses ChatGPT authentication. Identity headers are supplied by the trusted Sites gateway, not by form fields. Never expose an unprotected direct Worker origin that accepts user-supplied identity headers.

## Configuration

Set hosted environment variables through Sites settings. Copy `.dev.vars.example` to `.dev.vars` for local testing. Never commit credentials.

| Variable         | Purpose                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`    | Exact signed-in email of Kartika's administrator; admin controls are hidden and server requests denied for everyone else. |
| `RESEND_API_KEY` | Resend email API credential.                                                                                              |
| `EMAIL_FROM`     | Sender address on a verified Resend domain, e.g. `Kartika <hello@your-domain.com>`.                                       |

The admin account is **not** automatically assigned to the first visitor. Until `ADMIN_EMAIL` is set, referral submission works but review and redemption are unavailable.

Referral approval and voucher creation add durable email notifications. The administrator sends queued emails from the Admin panel. Missing email configuration never silently pretends delivery succeeded. Failed deliveries remain available for retry. Resend idempotency keys protect provider retries within its 24-hour window: https://resend.com/docs/dashboard/emails/idempotency-keys . An ambiguous send failure retried after 24 hours can deliver a duplicate notification; it cannot duplicate credits.

## Business rules

- A member creates one permanent unique code (6–20 letters or numbers).
- Each new member may submit one friend's code; self-referral is rejected.
- Kartika approves or rejects each referral once. Approval awards 100 credits to the referrer and 200 to the referee.
- Available credits are computed from approved referrals minus issued vouchers. Pending and rejected referrals never award credits.
- Creating a voucher atomically reserves the entire available balance. Its email notification is committed in the same transaction.
- Kartika redeems a voucher once, with a booking reference. Reuse is denied. Future earnings can fund new vouchers.
- Credits have no defined cash conversion or expiry in this version. Confirm the booking conversion policy before inviting customers.

## Validate

```powershell
npm test
npm run typecheck
npm run build
```

Tests execute the real service SQL against an isolated in-memory SQLite database. They cover uniqueness, self-referral, duplicate claims, approval rewards, rejection and voucher reuse. They do not send email or modify live data.

## Project map

- `app/circle.tsx` — responsive dashboard, referral forms, rewards, admin UI.
- `app/globals.css` — responsive layout and visual design.
- `app/api/circle/route.ts` — authenticated API and admin-only actions.
- `lib/referrals.ts` — database operations and business rules.
- `db/schema.ts`, `drizzle/` — schema and versioned migrations.
- `tests/referrals.test.ts` — business-rule integration tests.

Sites provisions D1 and applies migrations for hosted deployment. The initial deployment is private to its owner; customers cannot join until site access is deliberately expanded. This implementation uses ChatGPT sign-in; email/password or third-party customer login is not included.
