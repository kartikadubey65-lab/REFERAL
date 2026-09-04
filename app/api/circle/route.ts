import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { CircleService } from '../../../lib/referrals';

export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function context() {
  const user = await getChatGPTUser();
  if (!user) return null;
  const service = new CircleService(env.DB);
  const member = await service.member(
    user.userId,
    user.email,
    user.fullName || user.email.split('@')[0],
  );
  return {
    service,
    member,
    admin:
      !!env.ADMIN_EMAIL &&
      user.email.toLowerCase() === env.ADMIN_EMAIL.trim().toLowerCase(),
  };
}
export async function GET() {
  try {
    const c = await context();
    if (!c) return json({ signedIn: false });
    const [balance, referrals, vouchers] = await Promise.all([
      c.service.balance(c.member.id),
      c.service.referrals(c.member.id),
      c.service.vouchers(c.member.id),
    ]);
    return json({
      signedIn: true,
      member: c.member,
      admin: c.admin,
      balance,
      referrals,
      vouchers,
      adminConfigured: !!env.ADMIN_EMAIL,
      emailConfigured: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
      ...(c.admin
        ? {
            queue: await c.service.referrals(),
            outbox: await c.service.outbox(),
          }
        : {}),
    });
  } catch (e) {
    console.error('Dashboard load failed', e);
    return json(
      { error: 'Your account could not be loaded. Please try again.' },
      503,
    );
  }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return json({ error: 'Invalid request origin.' }, 403);
  try {
    const c = await context();
    if (!c) return json({ error: 'Please sign in first.' }, 401);
    const raw = await request.text();
    if (raw.length > 4096) return json({ error: 'Request too large.' }, 413);
    const data = JSON.parse(raw);
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    if (['review', 'redeem', 'sendEmails'].includes(data.action) && !c.admin)
      return json({ error: 'Only Kartika can perform this action.' }, 403);
    switch (data.action) {
      case 'createCode':
        await c.service.createCode(c.member.id, text(data.code));
        break;
      case 'claim':
        await c.service.claim(c.member.id, text(data.code));
        break;
      case 'issue':
        await c.service.issue(c.member.id);
        break;
      case 'review':
        await c.service.review(text(data.id), data.status);
        break;
      case 'redeem':
        await c.service.redeem(text(data.code), text(data.booking));
        break;
      case 'sendEmails': {
        if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
          throw new Error('Email delivery is not configured yet.');
        const pending = await c.service.pendingEmails();
        for (const email of pending) {
          await c.service
            .query(
              'UPDATE emails SET attempted_at=? WHERE id=?',
              new Date().toISOString(),
              email.id,
            )
            .run();
          try {
            const response = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': email.id,
              },
              body: JSON.stringify({
                from: env.EMAIL_FROM,
                to: email.recipient,
                subject: email.subject,
                text: email.body,
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (!response.ok)
              throw new Error(`Email provider returned ${response.status}.`);
            await c.service
              .query(
                'UPDATE emails SET sent_at=?,error=NULL WHERE id=?',
                new Date().toISOString(),
                email.id,
              )
              .run();
          } catch (e) {
            await c.service
              .query(
                'UPDATE emails SET error=? WHERE id=?',
                String(e).slice(0, 200),
                email.id,
              )
              .run();
          }
        }
        break;
      }
      default:
        throw new Error('Unknown action.');
    }
    return json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Something went wrong.';
    return json(
      {
        error: /D1_|SQLITE|constraint|JSON/.test(message)
          ? 'The request could not be saved. Please refresh and try again.'
          : message,
      },
      400,
    );
  }
}
