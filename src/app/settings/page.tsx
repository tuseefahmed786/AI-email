'use client';

import { useEffect, useState } from 'react';
import { Icons } from '@/components/Icon';
import { Avatar } from '@/components/Avatar';
import type { MailAccount } from '@/types/mail';

interface FormState {
  email: string;
  displayName: string;
  user: string;
  pass: string;
  host: string;
  port: number;
  secure: boolean;
  smtpHost: string;
  smtpPort: number;
}

const PRESETS: Record<'yahoo' | 'aol' | 'icloud' | 'custom', Pick<FormState, 'host' | 'port' | 'secure' | 'smtpHost' | 'smtpPort'>> = {
  yahoo: { host: 'imap.mail.yahoo.com', port: 993, secure: true, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465 },
  aol: { host: 'imap.aol.com', port: 993, secure: true, smtpHost: 'smtp.aol.com', smtpPort: 465 },
  icloud: { host: 'imap.mail.me.com', port: 993, secure: true, smtpHost: 'smtp.mail.me.com', smtpPort: 587 },
  custom: { host: '', port: 993, secure: true, smtpHost: '', smtpPort: 465 },
};

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [preset, setPreset] = useState<keyof typeof PRESETS>('yahoo');
  const [form, setForm] = useState<FormState>({
    email: '', displayName: '', user: '', pass: '',
    ...PRESETS.yahoo,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/mail/accounts').then((r) => r.json()).then((j) => setAccounts(j.accounts || []));
  }, []);

  useEffect(() => {
    setForm((f) => ({ ...f, ...PRESETS[preset] }));
  }, [preset]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch('/api/auth/imap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user: form.user || form.email }),
    });
    setBusy(false);
    if (r.ok) {
      setMsg('Connected.');
      const fresh = await fetch('/api/mail/accounts').then((x) => x.json());
      setAccounts(fresh.accounts || []);
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(`Failed: ${JSON.stringify(j.error || 'unknown')}`);
    }
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <a href="/" className="btn-ghost -ml-2"><Icons.Back className="w-4 h-4" /></a>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>

      <section className="card p-4 mb-6">
        <h2 className="font-medium mb-3">Connected accounts</h2>
        {accounts.length === 0 && <p className="text-sm text-muted">No accounts yet.</p>}
        <ul className="space-y-2">
          {accounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3">
              <Avatar email={a.email} name={a.displayName} size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{a.displayName}</div>
                <div className="text-xs text-muted truncate">{a.email}</div>
              </div>
              <span className="chip text-[10px] uppercase">{a.provider}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          <a href="/api/auth/gmail" className="btn-ghost border border-border justify-center"><Icons.Mail className="w-4 h-4" /> Add Gmail</a>
          <a href="/api/auth/microsoft" className="btn-ghost border border-border justify-center"><Icons.Mail className="w-4 h-4" /> Add Outlook / O365</a>
        </div>
      </section>

      <section id="imap" className="card p-4">
        <h2 className="font-medium mb-1">Add an IMAP account</h2>
        <p className="text-xs text-muted mb-4">For Yahoo and AOL, generate an app password in account security settings.</p>
        <form onSubmit={add} className="space-y-3">
          <div className="flex gap-2">
            {(['yahoo', 'aol', 'icloud', 'custom'] as const).map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => setPreset(k)}
                className={`chip px-3 py-1.5 ${preset === k ? 'bg-brand text-brandFg' : 'hover:bg-surface'}`}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value, user: form.user || e.target.value })} required type="email" />
            <input className="input" placeholder="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
            <input className="input" placeholder="IMAP host" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required />
            <input className="input" placeholder="IMAP port" type="number" value={form.port} onChange={(e) => setForm({ ...form, port: parseInt(e.target.value || '993', 10) })} required />
            <input className="input" placeholder="SMTP host" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
            <input className="input" placeholder="SMTP port" type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value || '465', 10) })} />
            <input className="input" placeholder="Username (often email)" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} />
            <input className="input" placeholder="App password" type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} required />
          </div>
          <button disabled={busy} className="btn-primary">
            {busy ? <Icons.Spinner className="w-4 h-4 animate-spin" /> : <Icons.Plus className="w-4 h-4" />}
            Connect
          </button>
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </form>
      </section>

      <form action="/api/auth/signout" method="post" className="mt-6">
        <button className="btn-danger"><Icons.LogOut className="w-4 h-4" /> Sign out</button>
      </form>
    </div>
  );
}
