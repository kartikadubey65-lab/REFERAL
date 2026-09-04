# Kartika Referral Circle

Approved flow: each member creates one unique referral code. A new member submits a friend's code. Kartika approves or rejects the referral. Approval gives the new member (referee) 200 credits and the referring member 100 credits. Members exchange available credits for a booking voucher; Kartika redeems that voucher once against a booking reference.

Implementation: responsive React dashboard, server API, Cloudflare D1 database, and platform ChatGPT sign-in. Server authorization uses ADMIN_EMAIL; it never grants administrator access to the first visitor. Referral uniqueness and voucher reservation are database-enforced. Credits have no cash conversion in this version. Each voucher uses the full available balance and does not expire. A member can earn more credits and issue another voucher later.

Transactional email outbox records approval and voucher notifications. Live delivery requires RESEND_API_KEY and EMAIL_FROM. Until configured, email remains queued and is visibly labeled. Admin can retry delivery. No email is sent during development tests.

Visual direction: warm ivory, forest green, editorial serif headings, clear account workspace, and a distinctive illustrated referral card. Empty states are real, with no fabricated earnings or people.
