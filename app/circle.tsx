'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Gift,
  LayoutGrid,
  Users,
  Ticket,
  CircleHelp,
  ShieldCheck,
  Sparkles,
  X,
  Mail,
  Plus,
  LogOut,
  Leaf,
  CheckCircle2,
  Clock3,
} from 'lucide-react';
import type { Member, Referral, Voucher, Email } from '../lib/referrals';
type State = {
  signedIn: boolean;
  member?: Member;
  admin?: boolean;
  balance?: number;
  referrals?: Referral[];
  vouchers?: Voucher[];
  queue?: Referral[];
  outbox?: Email[];
  adminConfigured?: boolean;
  emailConfigured?: boolean;
};
type View =
  | 'Overview'
  | 'My referrals'
  | 'My rewards'
  | 'How it works'
  | 'Admin';
type Modal = 'code' | 'claim' | 'voucher' | null;
const date = (s: string) =>
  new Date(s).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
const icons = {
  Overview: LayoutGrid,
  'My referrals': Users,
  'My rewards': Ticket,
  'How it works': CircleHelp,
  Admin: ShieldCheck,
};
export default function Circle() {
  const [data, setData] = useState<State>({ signedIn: false });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>('Overview'),
    [filter, setFilter] = useState('All'),
    [modal, setModal] = useState<Modal>(null);
  const [input, setInput] = useState(''),
    [formError, setFormError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  async function load() {
    try {
      const r = await fetch('/api/circle');
      const d = (await r.json()) as State & { error?: string };
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError('');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not connect. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const ref = new URLSearchParams(location.search).get('ref');
    if (ref) setInput(ref);
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  async function act(payload: Record<string, string>, success: string) {
    setBusy(true);
    setFormError('');
    try {
      const r = await fetch('/api/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error);
      setModal(null);
      setToast(success);
      await load();
    } catch (e) {
      const m = e instanceof Error ? e.message : 'Please try again.';
      setFormError(m);
      if (!modal) setError(m);
    } finally {
      setBusy(false);
    }
  }
  function open(type: Modal) {
    setFormError('');
    if (type === 'code') setInput('');
    setModal(type);
  }
  function signIn() {
    location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname + location.search)}`;
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast('Copied to clipboard');
    } catch {
      setError('Copy is unavailable. Select and copy your code manually.');
    }
  }
  const refs = data.referrals || [],
    vouchers = data.vouchers || [];
  const earned = refs
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.referrer === data.member?.id ? 100 : 200), 0);
  const pending = refs.filter((r) => r.status === 'pending').length;
  const listed = refs.filter(
    (r) => filter === 'All' || r.status === filter.toLowerCase(),
  );
  const name = data.member?.name.split(' ')[0];
  const nav: View[] = [
    'Overview',
    'My referrals',
    'My rewards',
    'How it works',
    ...(data.admin ? ['Admin' as const] : []),
  ];
  const referralTable = (
    <section className="panel activity">
      <div className="section-head">
        <div>
          <span className="eyebrow">YOUR CIRCLE</span>
          <h2>Referral activity</h2>
        </div>
        {view === 'Overview' && (
          <button
            className="text-button"
            onClick={() => setView('My referrals')}
          >
            View all <ArrowUpRight size={16} />
          </button>
        )}
      </div>
      <div className="filters" aria-label="Filter referrals">
        {['All', 'Pending', 'Approved', 'Rejected'].map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
            {f === 'All' && <span>{refs.length}</span>}
          </button>
        ))}
      </div>
      {listed.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Date</th>
                <th>Status</th>
                <th>Credits</th>
              </tr>
            </thead>
            <tbody>
              {listed.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>
                      {r.referrer === data.member?.id
                        ? r.referee_name
                        : r.referrer_name}
                    </strong>
                    <small>
                      {r.referrer === data.member?.id
                        ? 'You referred them'
                        : 'Referred you'}
                    </small>
                  </td>
                  <td>{date(r.created_at)}</td>
                  <td>
                    <span className={`badge ${r.status}`}>{r.status}</span>
                  </td>
                  <td>
                    {r.status === 'approved'
                      ? '+' + (r.referrer === data.member?.id ? 100 : 200)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <Users size={25} strokeWidth={1.4} />
          </span>
          <h3>
            {filter === 'All'
              ? 'Your circle starts with one friend'
              : `No ${filter.toLowerCase()} referrals yet`}
          </h3>
          <p>
            {filter === 'All'
              ? 'Share your code. When your friend joins and Kartika approves, you both earn credits.'
              : 'Referrals with this status will appear here.'}
          </p>
          {filter === 'All' && (
            <button
              className="text-button"
              onClick={() =>
                data.signedIn
                  ? data.member?.code
                    ? void copy(location.origin + '/?ref=' + data.member.code)
                    : open('code')
                  : signIn()
              }
            >
              {data.member?.code
                ? 'Copy invite link'
                : 'Create your referral code'}{' '}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </section>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Kartika home">
          <span className="brand-mark">
            <Leaf size={25} strokeWidth={1.6} />
          </span>
          <span>
            kartika<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="sidebar-label">THE REFERRAL CIRCLE</span>
        <nav aria-label="Main navigation">
          {nav.map((item) => {
            const Icon = icons[item];
            return (
              <button
                key={item}
                className={view === item ? 'nav-item selected' : 'nav-item'}
                onClick={() => setView(item)}
                aria-current={view === item ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={1.7} />
                {item}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={22} strokeWidth={1.5} />
          <h3>
            A little thank-you.
            <br />
            For a good word.
          </h3>
          <p>
            Bring your people.
            <br />
            We’ll take care of the rest.
          </p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">{name?.[0]?.toUpperCase() || 'K'}</span>
          <div>
            <strong>{name || 'Welcome to Kartika'}</strong>
            <small>
              {data.signedIn ? 'Circle member' : 'Let’s grow together'}
            </small>
          </div>
          {data.signedIn && (
            <a href="/signout-with-chatgpt?return_to=/" title="Sign out">
              <LogOut size={17} />
            </a>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Referral Circle</span>
            <ChevronRight size={14} />
            <span>{view}</span>
          </div>
          <span className="top-caption">
            <span className="status-dot" /> Good things, shared.
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                A LITTLE CONNECTION. A LOT OF POSSIBILITY.
              </span>
              <h1>
                {view === 'Overview'
                  ? name
                    ? `Welcome back, ${name}.`
                    : 'Good things are better shared.'
                  : view}
              </h1>
              <p>
                {view === 'Overview'
                  ? 'Invite your people. Make their day. Get a little something back.'
                  : view === 'My referrals'
                    ? 'Every introduction, from the first hello to your next reward.'
                    : view === 'My rewards'
                      ? 'A thank-you you can put towards your next booking.'
                      : view === 'Admin'
                        ? 'Review referrals and validate booking vouchers.'
                        : 'Three simple steps. Something good for both of you.'}
              </p>
            </div>
            <span className="circle-label">
              <Leaf size={14} /> THE KARTIKA CIRCLE
            </span>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button className="text-button" onClick={() => void load()}>
                Try again
              </button>
            </div>
          )}
          {loading && (
            <div className="notice" role="status">
              Loading your circle…
            </div>
          )}
          {!loading && !data.signedIn && (
            <div className="signin-banner">
              <div>
                <strong>Your people. Your own referral code.</strong>
                <span>
                  Sign in to create your code and keep track of your rewards.
                </span>
              </div>
              <button className="button dark" onClick={signIn}>
                Sign in to join <ArrowUpRight size={17} />
              </button>
            </div>
          )}
          {data.signedIn && !data.adminConfigured && (
            <div className="notice">
              Admin setup is pending. Approval starts once Kartika’s admin
              account is configured.
            </div>
          )}
          {view === 'Overview' && (
            <>
              <div className="hero-grid">
                <section className="share-card">
                  <div className="share-content">
                    <span className="light-eyebrow">
                      ● &nbsp; BETTER, TOGETHER
                    </span>
                    <h2>
                      Someone comes to mind?
                      <br />
                      <em>Send a little good their way.</em>
                    </h2>
                    <p>
                      They get <strong>200 credits.</strong> You get{' '}
                      <strong>100 credits.</strong>
                      <br />A small thank-you for making the introduction.
                    </p>
                    <div className="code-box">
                      <div>
                        <span>YOUR PERSONAL REFERRAL CODE</span>
                        <strong>{data.member?.code || 'Make it yours'}</strong>
                      </div>
                      <button
                        aria-label={
                          data.member?.code
                            ? 'Copy referral code'
                            : 'Create referral code'
                        }
                        onClick={() =>
                          data.signedIn
                            ? data.member?.code
                              ? void copy(data.member.code)
                              : open('code')
                            : signIn()
                        }
                      >
                        {data.member?.code ? (
                          <Copy size={20} />
                        ) : (
                          <Plus size={22} />
                        )}
                      </button>
                    </div>
                    <div className="share-bottom">
                      <span>
                        <ShieldCheck size={14} /> One unique code. Always yours.
                      </span>
                      {data.member?.code && (
                        <button
                          onClick={() =>
                            void copy(
                              location.origin + '/?ref=' + data.member!.code,
                            )
                          }
                        >
                          Copy invite link <ArrowUpRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="circle-art" aria-hidden="true">
                    <div className="orbit one" />
                    <div className="orbit two" />
                    <div className="orbit three" />
                    <span className="art-spark">✦</span>
                    <div className="gift-stamp">
                      <Gift size={58} strokeWidth={1} />
                      <span>
                        GOOD GOES
                        <br />
                        AROUND
                      </span>
                    </div>
                    <span className="art-star">✧</span>
                  </div>
                </section>
                <section className="balance-card">
                  <div className="balance-label">
                    <span className="eyebrow">READY FOR YOUR NEXT VISIT</span>
                    <span className="icon-circle">
                      <Ticket size={22} strokeWidth={1.4} />
                    </span>
                  </div>
                  <span className="balance-title">Available credits</span>
                  <div className="balance">
                    {data.balance || 0}
                    <span>credits</span>
                  </div>
                  <p>
                    A little closer to your next
                    <br />
                    booking with Kartika.
                  </p>
                  <button
                    className="button dark full"
                    disabled={!data.signedIn || !data.balance || busy}
                    onClick={() => open('voucher')}
                  >
                    Create booking voucher <ArrowUpRight size={17} />
                  </button>
                  <small>
                    <ShieldCheck size={13} /> Every voucher is redeemable once.
                  </small>
                </section>
              </div>
              <div className="stats-grid">
                {[
                  [
                    Users,
                    'Total referrals',
                    refs.filter((r) => r.referrer === data.member?.id).length,
                    'people in your circle',
                  ],
                  [
                    Clock3,
                    'Awaiting approval',
                    pending,
                    'being reviewed by Kartika',
                  ],
                  [
                    Gift,
                    'Total credits earned',
                    earned,
                    'a well-earned thank-you',
                  ],
                ].map(([Icon, title, n, text], i) => {
                  const StatIcon = Icon as typeof Users;
                  return (
                    <div className="stat" key={i}>
                      <span className={`stat-icon tone-${i}`}>
                        <StatIcon size={21} />
                      </span>
                      <div>
                        <span>{String(title)}</span>
                        <strong>
                          {String(n)}
                          <small>{String(text)}</small>
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="lower-grid">
                {referralTable}
                <section className="panel quick-guide">
                  <span className="eyebrow">A GOOD WORD GOES A LONG WAY</span>
                  <h2>Share. Connect. Enjoy.</h2>
                  {[
                    [
                      '01',
                      'Share your unique code',
                      'Pass it along to someone you think would love Kartika.',
                    ],
                    [
                      '02',
                      'Let us make it official',
                      'Your friend submits your code. Kartika reviews the referral.',
                    ],
                    [
                      '03',
                      'Enjoy a little extra',
                      'Once approved, you both get credits for a future booking.',
                    ],
                  ].map(([n, title, text]) => (
                    <div className="step" key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{title}</h3>
                        <p>{text}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    className="text-button"
                    onClick={() => setView('How it works')}
                  >
                    The little details <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="friend-banner">
                <span className="friend-icon">
                  <Gift size={24} strokeWidth={1.4} />
                </span>
                <div>
                  <h3>Here because of a friend?</h3>
                  <p>Add their code and get 200 credits after approval.</p>
                </div>
                <button
                  className="button outline"
                  onClick={() => (data.signedIn ? open('claim') : signIn())}
                >
                  Enter a referral code <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}
          {view === 'My referrals' && (
            <>
              <div className="view-actions">
                <button
                  className="button dark"
                  onClick={() => (data.signedIn ? open('claim') : signIn())}
                >
                  Enter a friend’s code <Plus size={16} />
                </button>
              </div>
              {referralTable}
            </>
          )}
          {view === 'My rewards' && (
            <>
              <section className="wallet-summary">
                <div>
                  <span className="eyebrow">YOUR AVAILABLE BALANCE</span>
                  <h2>
                    {data.balance || 0} <em>credits</em>
                  </h2>
                  <p>
                    Creating a voucher reserves your entire available balance.
                  </p>
                </div>
                <button
                  className="button dark"
                  disabled={!data.balance || busy}
                  onClick={() => open('voucher')}
                >
                  Create booking voucher <ArrowUpRight size={17} />
                </button>
              </section>
              <div className="voucher-list">
                {vouchers.length ? (
                  vouchers.map((v) => (
                    <article className="panel voucher" key={v.code}>
                      <Ticket size={32} strokeWidth={1.3} />
                      <div>
                        <span
                          className={`badge ${v.redeemed_at ? 'rejected' : 'approved'}`}
                        >
                          {v.redeemed_at ? 'Redeemed' : 'Ready to use'}
                        </span>
                        <h3>{v.code}</h3>
                        <p>
                          {v.amount} credits · Created {date(v.created_at)}
                        </p>
                        {v.redeemed_at && (
                          <small>
                            Booking {v.booking} · {date(v.redeemed_at)}
                          </small>
                        )}
                      </div>
                      {!v.redeemed_at && (
                        <button
                          className="button outline"
                          onClick={() => void copy(v.code)}
                        >
                          <Copy size={16} /> Copy
                        </button>
                      )}
                    </article>
                  ))
                ) : (
                  <section className="panel empty">
                    <Ticket size={32} strokeWidth={1.2} />
                    <h3>Your next good thing is on its way</h3>
                    <p>
                      Once a referral is approved, turn your credits into a
                      booking voucher here.
                    </p>
                  </section>
                )}
              </div>
            </>
          )}
          {view === 'How it works' && (
            <section className="panel details">
              <span className="eyebrow">THE CIRCLE, EXPLAINED</span>
              <h2>
                Good for your friend.
                <br />
                <em>Good for you.</em>
              </h2>
              <div className="rules-grid">
                {[
                  [
                    '01 / YOUR CODE',
                    'One code that’s yours',
                    'Create a unique code of 6–20 letters or numbers. You keep the same code for every friend you invite.',
                  ],
                  [
                    '02 / THEIR INTRODUCTION',
                    'A warm welcome',
                    'Your friend signs in and enters your code. Each member can claim one referral, and cannot refer themselves.',
                  ],
                  [
                    '03 / A LITTLE THANK-YOU',
                    '100 for you. 200 for them.',
                    'Kartika reviews the referral. Credits are added only when it is approved. Rejected referrals earn no credits.',
                  ],
                  [
                    '04 / YOUR NEXT BOOKING',
                    'Make a little more of it',
                    'Create a voucher using all available credits. Share it with Kartika when booking; each voucher can be redeemed once.',
                  ],
                ].map(([label, title, body]) => (
                  <div key={label}>
                    <span className="eyebrow">{label}</span>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                ))}
              </div>
              <div className="notice">
                Credits are booking benefits, not cash. Confirm how they apply
                to your booking with Kartika.
              </div>
            </section>
          )}
          {view === 'Admin' && data.admin && (
            <div className="admin-grid">
              <section className="panel">
                <div className="section-head">
                  <h2>Referral review</h2>
                  <span className="badge pending">
                    {data.queue?.filter((r) => r.status === 'pending').length ||
                      0}{' '}
                    pending
                  </span>
                </div>
                {data.queue
                  ?.filter((r) => r.status === 'pending')
                  .map((r) => (
                    <div className="review-row" key={r.id}>
                      <div>
                        <strong>{r.referee_name}</strong>
                        <p>
                          Referred by {r.referrer_name} · {date(r.created_at)}
                        </p>
                      </div>
                      <div className="row-actions">
                        <button
                          className="button outline"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              {
                                action: 'review',
                                id: r.id,
                                status: 'rejected',
                              },
                              'Referral rejected',
                            )
                          }
                        >
                          Reject
                        </button>
                        <button
                          className="button dark"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              {
                                action: 'review',
                                id: r.id,
                                status: 'approved',
                              },
                              'Referral approved. Both members have earned credits.',
                            )
                          }
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                {!data.queue?.some((r) => r.status === 'pending') && (
                  <div className="empty">
                    <CheckCircle2 />
                    <h3>All caught up</h3>
                    <p>New referrals will appear here for review.</p>
                  </div>
                )}
              </section>
              <section className="panel admin-form">
                <h2>Redeem a booking voucher</h2>
                <p>Confirm the booking before marking a voucher as used.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void act(
                      {
                        action: 'redeem',
                        code: String(f.get('code')),
                        booking: String(f.get('booking')),
                      },
                      'Voucher redeemed successfully',
                    );
                  }}
                >
                  <label>
                    Voucher code
                    <input
                      name="code"
                      required
                      placeholder="KRT-…"
                      maxLength={24}
                    />
                  </label>
                  <label>
                    Booking reference
                    <input
                      name="booking"
                      required
                      minLength={3}
                      maxLength={100}
                      placeholder="e.g. BOOKING-001"
                    />
                  </label>
                  <button className="button dark" disabled={busy}>
                    Confirm redemption <Check size={16} />
                  </button>
                </form>
              </section>
              <section className="panel">
                <div className="section-head">
                  <div>
                    <h2>Email notifications</h2>
                    <p>
                      {data.emailConfigured
                        ? 'Deliver pending notifications to members.'
                        : 'Email configuration required. Notifications remain queued.'}
                    </p>
                  </div>
                  <button
                    className="button outline"
                    disabled={
                      busy ||
                      !data.emailConfigured ||
                      !data.outbox?.some((e) => !e.sent_at)
                    }
                    onClick={() =>
                      void act(
                        { action: 'sendEmails' },
                        'Delivery attempted. Check each email’s status below.',
                      )
                    }
                  >
                    Send queued emails <Mail size={16} />
                  </button>
                </div>
                {data.outbox?.length ? (
                  data.outbox.map((e) => (
                    <div className="email-row" key={e.id}>
                      <div>
                        <strong>{e.subject}</strong>
                        <p>{e.recipient}</p>
                        {e.error && <small>{e.error}</small>}
                      </div>
                      <span
                        className={`badge ${e.sent_at ? 'approved' : 'pending'}`}
                      >
                        {e.sent_at ? 'Sent' : e.error ? 'Failed' : 'Queued'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p>No notifications yet.</p>
                )}
              </section>
            </div>
          )}
          <footer>
            <span>
              Thoughtfully connected. <strong>Kartika.</strong>
            </span>
            <button onClick={() => setView('How it works')}>
              Program details <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        aria-label="Referral action"
        onCancel={() => setModal(null)}
        onClose={() => setModal(null)}
      >
        <button
          className="dialog-close"
          aria-label="Close dialog"
          onClick={() => setModal(null)}
        >
          <X size={20} />
        </button>
        <span className="modal-icon">
          {modal === 'voucher' ? <Ticket size={28} /> : <Gift size={28} />}
        </span>
        <span className="eyebrow">THE KARTIKA CIRCLE</span>
        <h2>
          {modal === 'code'
            ? 'Make it yours.'
            : modal === 'claim'
              ? 'A friend sent you?'
              : 'Your next good thing.'}
        </h2>
        <p>
          {modal === 'code'
            ? 'Choose one memorable code. Once created, it stays with your account.'
            : modal === 'claim'
              ? 'Enter their referral code. You’ll receive 200 credits once Kartika approves.'
              : `${data.balance || 0} credits will be reserved for a single-use booking voucher. Show it to Kartika when you book.`}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              {
                action:
                  modal === 'code'
                    ? 'createCode'
                    : modal === 'claim'
                      ? 'claim'
                      : 'issue',
                code: input,
              },
              modal === 'voucher'
                ? 'Voucher created. Find it in My rewards.'
                : modal === 'code'
                  ? 'Your referral code is ready to share.'
                  : 'Referral submitted for Kartika’s approval.',
            );
          }}
        >
          {modal !== 'voucher' && (
            <label>
              {modal === 'code' ? 'Your unique code' : 'Friend’s referral code'}
              <input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                required
                minLength={6}
                maxLength={20}
                pattern="[A-Za-z0-9]{6,20}"
                placeholder={
                  modal === 'code' ? 'e.g. ANANYA100' : 'Enter referral code'
                }
              />
            </label>
          )}
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <button className="button dark full" disabled={busy}>
            {busy
              ? 'Saving…'
              : modal === 'code'
                ? 'Create my code'
                : modal === 'claim'
                  ? 'Submit referral'
                  : 'Create voucher'}
            <ArrowRight size={17} />
          </button>
        </form>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
