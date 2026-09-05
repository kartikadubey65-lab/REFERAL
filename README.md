# Kartika Referral Circle

A responsive referral-program demo deployed as a standard Next.js application on Vercel.

## Run locally

```powershell
npm install
npm run dev
```

## Validate

```powershell
npm test
npm run typecheck
npm run build
```

## Demo behavior

The Vercel version is independent of OpenAI Sites and Cloudflare. It saves referral codes, approvals, credits and booking vouchers in the visitor's browser using `localStorage`. Use the Admin tab to approve a submitted referral or redeem a voucher. The reset icon at the bottom of the sidebar clears the browser demo.

Because storage is device-local, this deployment is intended for demonstrating the complete interface and workflow. Different visitors do not share records, and browser data can be cleared. A production launch requires a shared database and customer authentication provider.

## Project map

- `app/circle.tsx` — responsive dashboard and all referral interactions.
- `app/globals.css` — responsive visual design.
- `lib/local-circle.ts` — device-local business rules and state updates.
- `tests/local-circle.test.ts` — referral, credit, voucher and redemption tests.
