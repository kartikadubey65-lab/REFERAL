import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  code: text('code').unique(),
  createdAt: text('created_at').notNull(),
});
export const referrals = sqliteTable(
  'referrals',
  {
    id: text('id').primaryKey(),
    referrer: text('referrer')
      .notNull()
      .references(() => members.id),
    referee: text('referee')
      .notNull()
      .unique()
      .references(() => members.id),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] })
      .notNull()
      .default('pending'),
    createdAt: text('created_at').notNull(),
    reviewedAt: text('reviewed_at'),
  },
  (table) => [
    index('idx_referrals_referrer').on(table.referrer),
    index('idx_referrals_status').on(table.status),
  ],
);
export const vouchers = sqliteTable(
  'vouchers',
  {
    code: text('code').primaryKey(),
    member: text('member')
      .notNull()
      .references(() => members.id),
    amount: integer('amount').notNull(),
    createdAt: text('created_at').notNull(),
    redeemedAt: text('redeemed_at'),
    booking: text('booking'),
  },
  (table) => [index('idx_vouchers_member').on(table.member)],
);
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  sentAt: text('sent_at'),
  attemptedAt: text('attempted_at'),
  error: text('error'),
});
