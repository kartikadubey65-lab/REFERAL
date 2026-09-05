import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoState, updateDemoState } from '../lib/local-circle.ts';

test('browser demo creates a permanent referral code', () => {
  let state = createDemoState();
  state = updateDemoState(state, { action: 'createCode', code: 'KARTIKA65' });
  assert.equal(state.member.code, 'KARTIKA65');
  assert.throws(
    () => updateDemoState(state, { action: 'createCode', code: 'ANOTHER1' }),
    /already/i,
  );
});

test('browser demo completes referral, reward, voucher and redemption flow', () => {
  let state = createDemoState();
  state = updateDemoState(state, { action: 'claim', code: 'FRIEND65' });
  const referral = state.referrals[0];
  state = updateDemoState(state, {
    action: 'review',
    id: referral.id,
    status: 'approved',
  });
  assert.equal(state.balance, 200);
  state = updateDemoState(state, { action: 'issue' });
  assert.equal(state.balance, 0);
  assert.equal(state.vouchers[0].amount, 200);
  state = updateDemoState(state, {
    action: 'redeem',
    code: state.vouchers[0].code,
    booking: 'BOOK-1',
  });
  assert.ok(state.vouchers[0].redeemed_at);
  assert.throws(
    () =>
      updateDemoState(state, {
        action: 'redeem',
        code: state.vouchers[0].code,
        booking: 'BOOK-2',
      }),
    /used/i,
  );
});
