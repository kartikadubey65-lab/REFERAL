export type Member = {
  id: string;
  email: string;
  name: string;
  code: string | null;
};
export type Referral = {
  id: string;
  referrer: string;
  referee: string;
  referrer_name: string;
  referee_name: string;
  status: string;
  created_at: string;
};
export type Voucher = {
  code: string;
  member: string;
  amount: number;
  created_at: string;
  redeemed_at: string | null;
  booking: string | null;
};
export type Email = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sent_at: string | null;
  error: string | null;
};

export type DemoState = {
  signedIn: true;
  admin: true;
  adminConfigured: true;
  emailConfigured: false;
  member: Member;
  balance: number;
  referrals: Referral[];
  vouchers: Voucher[];
  queue: Referral[];
  outbox: Email[];
};

export type DemoAction = {
  action: string;
  code?: string;
  id?: string;
  status?: string;
  booking?: string;
};

const timestamp = () => new Date().toISOString();

export function createDemoState(): DemoState {
  return {
    signedIn: true,
    admin: true,
    adminConfigured: true,
    emailConfigured: false,
    member: {
      id: 'browser-demo-member',
      email: 'demo@kartika.local',
      name: 'Kartika',
      code: null,
    },
    balance: 0,
    referrals: [],
    vouchers: [],
    queue: [],
    outbox: [],
  };
}

export function updateDemoState(
  current: DemoState,
  action: DemoAction,
): DemoState {
  const state = structuredClone(current);
  const code = action.code?.trim().toUpperCase() || '';

  if (action.action === 'createCode') {
    if (state.member.code) throw new Error('You already have a referral code.');
    if (!/^[A-Z0-9]{6,20}$/.test(code))
      throw new Error('Use 6–20 letters or numbers for your code.');
    state.member.code = code;
  } else if (action.action === 'claim') {
    if (!/^[A-Z0-9]{6,20}$/.test(code))
      throw new Error('Enter a valid referral code.');
    if (code === state.member.code)
      throw new Error('You cannot use your own referral code.');
    if (
      state.referrals.some((referral) => referral.referee === state.member.id)
    )
      throw new Error('You have already submitted a referral.');
    const referral: Referral = {
      id: crypto.randomUUID(),
      referrer: `demo-referrer-${code}`,
      referee: state.member.id,
      referrer_name: `Friend · ${code}`,
      referee_name: state.member.name,
      status: 'pending',
      created_at: timestamp(),
    };
    state.referrals.unshift(referral);
  } else if (action.action === 'review') {
    const referral = state.referrals.find((item) => item.id === action.id);
    if (!referral || referral.status !== 'pending')
      throw new Error('This referral has already been reviewed.');
    if (action.status !== 'approved' && action.status !== 'rejected')
      throw new Error('Invalid review decision.');
    referral.status = action.status;
    if (action.status === 'approved') {
      state.balance += referral.referee === state.member.id ? 200 : 100;
      state.outbox.unshift({
        id: referral.id,
        recipient: state.member.email,
        subject: 'Your Kartika referral is approved',
        body: 'Your referral credits are ready.',
        sent_at: null,
        error: null,
      });
    }
  } else if (action.action === 'issue') {
    if (state.balance <= 0)
      throw new Error('You need approved credits to create a voucher.');
    const voucher: Voucher = {
      code: `KRT-${crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`,
      member: state.member.id,
      amount: state.balance,
      created_at: timestamp(),
      redeemed_at: null,
      booking: null,
    };
    state.balance = 0;
    state.vouchers.unshift(voucher);
    state.outbox.unshift({
      id: voucher.code,
      recipient: state.member.email,
      subject: 'Your Kartika booking voucher',
      body: `${voucher.code} is worth ${voucher.amount} credits.`,
      sent_at: null,
      error: null,
    });
  } else if (action.action === 'redeem') {
    const voucher = state.vouchers.find((item) => item.code === code);
    if (!voucher || voucher.redeemed_at)
      throw new Error('This voucher is invalid or has already been used.');
    if (!action.booking || action.booking.trim().length < 3)
      throw new Error('Enter a valid booking reference.');
    voucher.redeemed_at = timestamp();
    voucher.booking = action.booking.trim();
  } else if (action.action === 'sendEmails') {
    throw new Error('Email sending is disabled in the browser demo.');
  } else {
    throw new Error('Unknown action.');
  }

  state.queue = state.referrals;
  return state;
}
