import type { MailThread } from '@/types/mail';

// Realistic demo inbox used when DEMO_MODE=1 or no credentials are configured.
// Designed to exercise summarization, priority, and draft features.
export function demoThreads(accountId: string): MailThread[] {
  const base = (overrides: Partial<MailThread>): MailThread => ({
    id: '',
    accountId,
    subject: '',
    participants: [],
    snippet: '',
    date: new Date().toISOString(),
    unread: false,
    messageCount: 1,
    labels: ['INBOX'],
    ...overrides,
  });
  const now = Date.now();
  const t = (offsetMinutes: number) => new Date(now - offsetMinutes * 60_000).toISOString();

  return [
    base({
      id: 't_acme_renewal',
      subject: 'ACME Corp renewal — proposal due Friday',
      participants: [
        { name: 'Priya Shah', email: 'priya@acmecorp.com' },
        { name: 'You', email: 'demo@example.com' },
      ],
      snippet:
        'We finalized the renewal terms internally — they need pricing for 3 tiers and the SSO add-on by EOD Friday. Can you send a draft proposal Thursday?',
      date: t(12),
      unread: true,
      messageCount: 4,
      labels: ['INBOX', 'work'],
      messages: [
        {
          id: 'm1',
          threadId: 't_acme_renewal',
          accountId,
          from: { name: 'Priya Shah', email: 'priya@acmecorp.com' },
          to: [{ email: 'demo@example.com' }],
          subject: 'ACME Corp renewal — proposal due Friday',
          snippet: 'We finalized the renewal terms internally...',
          bodyText:
            'Hi,\n\nWe finalized the renewal terms internally. ACME needs pricing for 3 tiers (Starter, Growth, Enterprise) plus the SSO add-on by EOD Friday. Their procurement window closes Monday and Sarah (their CFO) wants the deck before her review on Thursday afternoon.\n\nCan you send a draft proposal Thursday morning so we have time to iterate? Loop in legal if the MSA needs updating.\n\nThanks,\nPriya',
          date: t(12),
          unread: true,
          labels: ['INBOX', 'work'],
        },
      ],
    }),
    base({
      id: 't_aws_billing',
      subject: 'AWS billing alert: budget exceeded by 23%',
      participants: [{ name: 'AWS Billing', email: 'no-reply@aws.amazon.com' }],
      snippet:
        'Your AWS account 123456789012 exceeded its $5,000 monthly budget. Current spend: $6,180. Top services: EC2 ($2.1k), S3 ($1.3k).',
      date: t(45),
      unread: true,
      labels: ['INBOX'],
      messages: [
        {
          id: 'm2',
          threadId: 't_aws_billing',
          accountId,
          from: { name: 'AWS Billing', email: 'no-reply@aws.amazon.com' },
          to: [{ email: 'demo@example.com' }],
          subject: 'AWS billing alert: budget exceeded by 23%',
          snippet: 'Your AWS account 123456789012 exceeded its $5,000 monthly budget.',
          bodyText:
            'Your AWS account 123456789012 exceeded its $5,000 monthly budget.\n\nCurrent month-to-date spend: $6,180.42\nForecasted month-end: $8,400\n\nTop services by cost:\n• EC2 — $2,100\n• S3 — $1,310\n• RDS — $980\n• Data Transfer — $720\n\nVisit the Cost Explorer to investigate.',
          date: t(45),
          unread: true,
          labels: ['INBOX'],
        },
      ],
    }),
    base({
      id: 't_offsite',
      subject: 'Offsite venue options — pick 1 by Wed',
      participants: [
        { name: 'Jordan Lee', email: 'jordan@team.example' },
        { name: 'You', email: 'demo@example.com' },
      ],
      snippet:
        "I narrowed the offsite venues to 3: (1) Pier 27, $4.2k, holds 40, AV included; (2) The Pearl, $3.6k, holds 35, BYO-AV; (3) Mission Bowling, $5.1k, holds 50, food included.",
      date: t(120),
      unread: true,
      messageCount: 2,
      labels: ['INBOX', 'work'],
      messages: [
        {
          id: 'm3',
          threadId: 't_offsite',
          accountId,
          from: { name: 'Jordan Lee', email: 'jordan@team.example' },
          to: [{ email: 'demo@example.com' }],
          subject: 'Offsite venue options — pick 1 by Wed',
          snippet: 'I narrowed the offsite venues to 3...',
          bodyText:
            "Hey,\n\nI narrowed offsite venues to 3 options. Pick by Wed so I can confirm:\n\n1. Pier 27 — $4,200, holds 40, AV included, lunch from caterer\n2. The Pearl — $3,600, holds 35, BYO-AV, restaurant menu\n3. Mission Bowling — $5,100, holds 50, food included, bowling alley\n\nGoing with #2 saves us ~$600 vs #1 but we'd need to rent AV (~$400 net savings). Mission Bowling is the priciest but most fun.\n\nYour call.",
          date: t(120),
          unread: true,
          labels: ['INBOX', 'work'],
        },
      ],
    }),
    base({
      id: 't_mom',
      subject: 'Re: dinner Sunday?',
      participants: [{ name: 'Mom', email: 'mom@family.example' }],
      snippet: "Sunday at 6 works for us. Dad's cooking. Bring that wine you liked. Drive safe!",
      date: t(240),
      unread: false,
      messageCount: 3,
      labels: ['INBOX', 'personal'],
      messages: [
        {
          id: 'm4',
          threadId: 't_mom',
          accountId,
          from: { name: 'Mom', email: 'mom@family.example' },
          to: [{ email: 'demo@example.com' }],
          subject: 'Re: dinner Sunday?',
          snippet: 'Sunday at 6 works for us.',
          bodyText: "Sunday at 6 works for us. Dad's cooking. Bring that wine you liked. Drive safe! Love, Mom",
          date: t(240),
          unread: false,
          labels: ['INBOX', 'personal'],
        },
      ],
    }),
    base({
      id: 't_newsletter',
      subject: 'The Pragmatic Engineer — issue #182',
      participants: [{ name: 'Gergely Orosz', email: 'newsletter@pragmaticengineer.com' }],
      snippet: 'This week: how Stripe runs incident reviews, a deep dive on RSC in production, plus comp data updates.',
      date: t(380),
      unread: true,
      labels: ['INBOX'],
      messages: [
        {
          id: 'm5',
          threadId: 't_newsletter',
          accountId,
          from: { name: 'Gergely Orosz', email: 'newsletter@pragmaticengineer.com' },
          to: [{ email: 'demo@example.com' }],
          subject: 'The Pragmatic Engineer — issue #182',
          snippet: 'This week: how Stripe runs incident reviews...',
          bodyText: 'This week: how Stripe runs incident reviews, a deep dive on RSC in production, plus comp data updates. [Read online]',
          date: t(380),
          unread: true,
          labels: ['INBOX'],
        },
      ],
    }),
    base({
      id: 't_security',
      subject: '[Action required] New sign-in to your account',
      participants: [{ name: 'Security', email: 'security@accounts.example' }],
      snippet:
        'A new sign-in to your account from Chrome on macOS in San Francisco, CA. If this was you, no action is needed.',
      date: t(600),
      unread: false,
      labels: ['INBOX'],
      messages: [
        {
          id: 'm6',
          threadId: 't_security',
          accountId,
          from: { name: 'Security', email: 'security@accounts.example' },
          to: [{ email: 'demo@example.com' }],
          subject: '[Action required] New sign-in to your account',
          snippet: 'A new sign-in to your account from Chrome on macOS...',
          bodyText:
            'A new sign-in to your account from Chrome on macOS in San Francisco, CA. If this was you, no action is needed. If not, secure your account immediately.',
          date: t(600),
          unread: false,
          labels: ['INBOX'],
        },
      ],
    }),
    base({
      id: 't_intro',
      subject: 'Intro: you ↔ Daniela (CFO, NorthStar)',
      participants: [
        { name: 'Wei Chen', email: 'wei@vc.example' },
        { name: 'Daniela R.', email: 'daniela@northstar.example' },
      ],
      snippet:
        "Daniela leads finance at NorthStar — they're looking at email automation for their CS org. I think you two should talk. Daniela, meet [you] — running the email infra at our portfolio co.",
      date: t(900),
      unread: true,
      labels: ['INBOX', 'work'],
      messages: [
        {
          id: 'm7',
          threadId: 't_intro',
          accountId,
          from: { name: 'Wei Chen', email: 'wei@vc.example' },
          to: [
            { email: 'demo@example.com' },
            { name: 'Daniela R.', email: 'daniela@northstar.example' },
          ],
          subject: 'Intro: you ↔ Daniela (CFO, NorthStar)',
          snippet: "Daniela leads finance at NorthStar...",
          bodyText:
            "Daniela leads finance at NorthStar — they're looking at email automation for their CS org. I think you two should talk.\n\nDaniela, meet [you] — running email infra at our portfolio co.\n\nTaking myself off the thread.",
          date: t(900),
          unread: true,
          labels: ['INBOX', 'work'],
        },
      ],
    }),
    base({
      id: 't_recruiting',
      subject: 'Opportunity at Stripe — staff eng',
      participants: [{ name: 'Recruiter Bot', email: 'recruiter@stripe.example' }],
      snippet:
        'Hi {{firstName}}, I came across your profile and thought you might be a fit for our Staff Engineer role on the Billing team...',
      date: t(1440),
      unread: true,
      labels: ['INBOX'],
      messages: [
        {
          id: 'm8',
          threadId: 't_recruiting',
          accountId,
          from: { name: 'Recruiter Bot', email: 'recruiter@stripe.example' },
          to: [{ email: 'demo@example.com' }],
          subject: 'Opportunity at Stripe — staff eng',
          snippet: 'Hi {{firstName}}...',
          bodyText:
            "Hi {{firstName}}, I came across your profile and thought you might be a fit for our Staff Engineer role on the Billing team. Let me know if you're open to a chat.",
          date: t(1440),
          unread: true,
          labels: ['INBOX'],
        },
      ],
    }),
  ];
}
