import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { CircleService } from '../lib/referrals.ts';

test('email retries do not starve unattempted notifications', async () => {
  const s = fixture();
  for (let i = 0; i < 21; i++) {
    await s
      .query(
        'INSERT INTO emails (id,recipient,subject,body,created_at) VALUES (?,?,?,?,?)',
        String(i),
        'person@example.com',
        'Hello',
        'Test',
        new Date(i * 1000).toISOString(),
      )
      .run();
  }
  const first = await s.pendingEmails();
  assert.equal(first.length, 20);
  for (const email of first)
    await s
      .query(
        'UPDATE emails SET attempted_at=?,error=? WHERE id=?',
        new Date().toISOString(),
        'temporary failure',
        email.id,
      )
      .run();
  const second = await s.pendingEmails();
  assert.equal(second[0].id, '20');
});

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync('drizzle').filter((f) => f.endsWith('.sql')))
    sqlite.exec(readFileSync(`drizzle/${file}`, 'utf8'));
  function prepare(sql: string) {
    let values: any[] = [];
    return {
      bind(...args: any[]) {
        values = args;
        return this;
      },
      async first() {
        return sqlite.prepare(sql).get(...values) ?? null;
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...values) };
      },
      async run() {
        const r = sqlite.prepare(sql).run(...values);
        return { meta: { changes: Number(r.changes) } };
      },
    };
  }
  const db = {
    prepare,
    async batch(statements: any[]) {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return new CircleService(db as any);
}

async function members(service: CircleService) {
  await service.member('alice', 'alice@example.com', 'Alice');
  await service.member('bob', 'bob@example.com', 'Bob');
  await service.createCode('alice', 'ALICE100');
}

test('a member keeps one unique referral code', async () => {
  const s = fixture();
  await members(s);
  await assert.rejects(() => s.createCode('alice', 'ALICE200'), /already/i);
  await assert.rejects(() => s.createCode('bob', 'alice100'), /taken/i);
});
test('self-referral and repeat referral claims are rejected', async () => {
  const s = fixture();
  await members(s);
  await assert.rejects(() => s.claim('alice', 'ALICE100'), /own/i);
  await s.claim('bob', 'ALICE100');
  await assert.rejects(() => s.claim('bob', 'ALICE100'), /already/i);
});
test('pending referrals have no credits; approval awards exactly 100 and 200 once', async () => {
  const s = fixture();
  await members(s);
  const id = await s.claim('bob', 'ALICE100');
  assert.equal(await s.balance('alice'), 0);
  assert.equal(await s.balance('bob'), 0);
  await s.review(id, 'approved');
  await assert.rejects(() => s.review(id, 'approved'), /reviewed/i);
  assert.equal(await s.balance('alice'), 100);
  assert.equal(await s.balance('bob'), 200);
  assert.equal((await s.outbox()).length, 2);
});
test('voucher issuance reserves credits and redemption is single-use', async () => {
  const s = fixture();
  await members(s);
  await assert.rejects(() => s.issue('alice'), /credits/i);
  await s.review(await s.claim('bob', 'ALICE100'), 'approved');
  const voucher = await s.issue('bob');
  assert.equal(voucher.amount, 200);
  assert.equal(await s.balance('bob'), 0);
  await assert.rejects(() => s.issue('bob'), /credits/i);
  await s.redeem(voucher.code, 'BOOKING-001');
  await assert.rejects(
    () => s.redeem(voucher.code, 'BOOKING-002'),
    /used|invalid/i,
  );
});
test('rejected referrals never award credits', async () => {
  const s = fixture();
  await members(s);
  await s.review(await s.claim('bob', 'ALICE100'), 'rejected');
  assert.equal(await s.balance('bob'), 0);
  const rows = await s.referrals('bob');
  await assert.rejects(() => s.review(rows[0].id, 'approved'), /reviewed/i);
});
