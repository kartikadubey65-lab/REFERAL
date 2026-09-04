# Referral Circle Implementation Plan

**Goal:** Implement the approved referral and booking-credit workflow.
**Architecture:** React user and admin views call a server-authorized API. D1 owns accounts, referrals, vouchers and an email outbox.
**Tech stack:** Vinext, React, TypeScript, Drizzle migrations, Cloudflare D1.
**Spec:** docs/design.md

## Steps
- [ ] Test database-backed behavior in tests/referrals.test.ts using Node SQLite: duplicate codes, self referrals, one referral per referee, pending rewards, approval idempotency, voucher reservation and single redemption.
- [ ] Implement db/schema.ts and lib/referrals.ts with prepared statements and atomic batches. Generate and inspect migrations using npm run db:generate.
- [ ] Implement app/api/circle/route.ts: authenticate all requests, check admin email on review and redemption, enforce same-origin writes, and return only member-owned records.
- [ ] Implement app/page.tsx, app/circle.tsx and app/globals.css with dashboard, activity filters, code creation, referral submission, vouchers and admin review.
- [ ] Implement an outbox with explicit unconfigured, queued, sent and failed delivery states. Document environment configuration in README.md and .env.example.
- [ ] Run node --experimental-strip-types --test tests/referrals.test.ts, TypeScript checks and npm run build. Preview the working page and publish privately if the environment permits.
