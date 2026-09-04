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
const now = () => new Date().toISOString();
const balanceSQL = `(SELECT COALESCE(SUM(CASE WHEN referrer = ? THEN 100 ELSE 200 END), 0) FROM referrals WHERE status = 'approved' AND (referrer = ? OR referee = ?)) - (SELECT COALESCE(SUM(amount), 0) FROM vouchers WHERE member = ?)`;

export class CircleService {
  db: D1Database;
  constructor(db: D1Database) {
    this.db = db;
  }
  query(sql: string, ...args: any[]) {
    return this.db.prepare(sql).bind(...args);
  }
  async member(id: string, email: string, name: string): Promise<Member> {
    await this.query(
      'INSERT INTO members (id,email,name,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name',
      id,
      email.toLowerCase(),
      name,
      now(),
    ).run();
    return (await this.query(
      'SELECT * FROM members WHERE id=?',
      id,
    ).first<Member>())!;
  }
  async createCode(id: string, input: string) {
    const code = input.trim().toUpperCase();
    if (!/^[A-Z0-9]{6,20}$/.test(code))
      throw new Error('Use 6–20 letters or numbers for your code.');
    const member = await this.query(
      'SELECT code FROM members WHERE id=?',
      id,
    ).first<Member>();
    if (member?.code) throw new Error('You already have a referral code.');
    try {
      const r = await this.query(
        'UPDATE members SET code=? WHERE id=? AND code IS NULL',
        code,
        id,
      ).run();
      if (!r.meta.changes) throw new Error('You already have a referral code.');
    } catch (e) {
      if (String(e).includes('UNIQUE'))
        throw new Error('This code is taken. Try another.');
      throw e;
    }
    return code;
  }
  async claim(id: string, input: string) {
    const owner = await this.query(
      'SELECT id FROM members WHERE code=?',
      input.trim().toUpperCase(),
    ).first<Member>();
    if (!owner) throw new Error('That referral code was not found.');
    if (owner.id === id)
      throw new Error('You cannot use your own referral code.');
    const referralId = crypto.randomUUID();
    try {
      await this.query(
        'INSERT INTO referrals (id,referrer,referee,status,created_at) VALUES (?,?,?,?,?)',
        referralId,
        owner.id,
        id,
        'pending',
        now(),
      ).run();
    } catch (e) {
      if (String(e).includes('UNIQUE'))
        throw new Error('You have already submitted a referral.');
      throw e;
    }
    return referralId;
  }
  async balance(id: string): Promise<number> {
    return Number(
      (
        await this.query(
          `SELECT ${balanceSQL} AS balance`,
          id,
          id,
          id,
          id,
        ).first<{ balance: number }>()
      )?.balance ?? 0,
    );
  }
  async referrals(id?: string): Promise<Referral[]> {
    const sql = `SELECT r.*, a.name AS referrer_name, b.name AS referee_name FROM referrals r JOIN members a ON a.id=r.referrer JOIN members b ON b.id=r.referee ${id ? 'WHERE r.referrer=? OR r.referee=?' : ''} ORDER BY r.created_at DESC`;
    return (await this.query(sql, ...(id ? [id, id] : [])).all<Referral>())
      .results;
  }
  async review(id: string, status: 'approved' | 'rejected') {
    if (!['approved', 'rejected'].includes(status))
      throw new Error('Invalid review decision.');
    const actions: D1PreparedStatement[] = [];
    if (status === 'approved')
      for (const [role, credits] of [
        ['referrer', 100],
        ['referee', 200],
      ] as const) {
        actions.push(
          this.query(
            `INSERT INTO emails (id,recipient,subject,body,created_at) SELECT ?,m.email,?,?,? FROM referrals r JOIN members m ON m.id=r.${role} WHERE r.id=? AND r.status='pending'`,
            `${id}-${role}`,
            'Your Kartika referral is approved',
            `Your referral was approved. ${credits} credits are now available in your Kartika Referral Circle account. Sign in to create a booking voucher.`,
            now(),
            id,
          ),
        );
      }
    actions.push(
      this.query(
        "UPDATE referrals SET status=?,reviewed_at=? WHERE id=? AND status='pending'",
        status,
        now(),
        id,
      ),
    );
    const results = await this.db.batch(actions);
    if (!results.at(-1)?.meta.changes)
      throw new Error(
        'This referral has already been reviewed or does not exist.',
      );
  }
  async issue(id: string): Promise<Voucher> {
    const code =
      'KRT-' +
      crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
    const results = await this.db.batch([
      this.query(
        `INSERT INTO vouchers (code,member,amount,created_at) SELECT ?,?,balance,? FROM (SELECT ${balanceSQL} AS balance) WHERE balance > 0`,
        code,
        id,
        now(),
        id,
        id,
        id,
        id,
      ),
      this.query(
        "INSERT INTO emails (id,recipient,subject,body,created_at) SELECT v.code,m.email,?,('Your booking voucher is ' || v.code || ', worth ' || v.amount || ' credits. Share it with Kartika when booking. This code can be redeemed once.'),? FROM vouchers v JOIN members m ON m.id=v.member WHERE v.code=?",
        'Your Kartika booking voucher',
        now(),
        code,
      ),
    ]);
    if (!results[0].meta.changes)
      throw new Error('You need approved credits to create a voucher.');
    const voucher = (await this.query(
      'SELECT * FROM vouchers WHERE code=?',
      code,
    ).first<Voucher>())!;
    return voucher;
  }
  async vouchers(id: string): Promise<Voucher[]> {
    return (
      await this.query(
        'SELECT * FROM vouchers WHERE member=? ORDER BY created_at DESC',
        id,
      ).all<Voucher>()
    ).results;
  }
  async redeem(code: string, booking: string) {
    if (booking.trim().length < 3 || booking.length > 100)
      throw new Error(
        'Enter a booking reference between 3 and 100 characters.',
      );
    const result = await this.query(
      'UPDATE vouchers SET redeemed_at=?,booking=? WHERE code=? AND redeemed_at IS NULL',
      now(),
      booking.trim(),
      code.trim().toUpperCase(),
    ).run();
    if (!result.meta.changes)
      throw new Error('This voucher is invalid or has already been used.');
  }
  async outbox(): Promise<Email[]> {
    return (
      await this.query(
        'SELECT * FROM emails ORDER BY created_at DESC',
      ).all<Email>()
    ).results;
  }
  async pendingEmails(): Promise<Email[]> {
    return (
      await this.query(
        "SELECT * FROM emails WHERE sent_at IS NULL ORDER BY COALESCE(attempted_at, ''), created_at LIMIT 20",
      ).all<Email>()
    ).results;
  }
}
