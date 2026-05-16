export type ProviderKind = 'gmail' | 'microsoft' | 'imap';

export interface MailAccount {
  id: string;
  provider: ProviderKind;
  email: string;
  displayName: string;
  color?: string;
  signature?: string;
}

export interface MailAddress {
  name?: string;
  email: string;
}

export interface MailLabel {
  id: string;
  name: string;
  kind: 'system' | 'user';
  unread?: number;
}

export interface MailMessage {
  id: string;
  threadId: string;
  accountId: string;
  from: MailAddress;
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  snippet: string;
  bodyHtml?: string;
  bodyText?: string;
  date: string;
  unread: boolean;
  starred?: boolean;
  hasAttachments?: boolean;
  labels: string[];
}

export interface MailThread {
  id: string;
  accountId: string;
  subject: string;
  participants: MailAddress[];
  snippet: string;
  date: string;
  unread: boolean;
  messageCount: number;
  labels: string[];
  messages?: MailMessage[];
}

export interface ListOptions {
  labelId?: string;
  query?: string;
  pageToken?: string;
  limit?: number;
}

export interface ListResult {
  threads: MailThread[];
  nextPageToken?: string;
}

export interface SendOptions {
  to: MailAddress[];
  cc?: MailAddress[];
  bcc?: MailAddress[];
  subject: string;
  bodyHtml?: string;
  bodyText: string;
  inReplyToMessageId?: string;
  threadId?: string;
}

export type MailActionKind = 'archive' | 'delete' | 'markRead' | 'markUnread' | 'star' | 'unstar' | 'addLabel' | 'removeLabel';

export interface MailAction {
  kind: MailActionKind;
  threadId?: string;
  messageId?: string;
  labelId?: string;
}

export interface MailProvider {
  kind: ProviderKind;
  account: MailAccount;
  listThreads(opts: ListOptions): Promise<ListResult>;
  getThread(threadId: string): Promise<MailThread>;
  search(query: string, opts?: ListOptions): Promise<ListResult>;
  listLabels(): Promise<MailLabel[]>;
  send(msg: SendOptions): Promise<{ id: string; threadId: string }>;
  applyAction(action: MailAction): Promise<void>;
}

export interface AIPriority {
  threadId: string;
  score: number;
  bucket: 'urgent' | 'important' | 'normal' | 'low';
  reason: string;
}

export interface AISummary {
  threadId: string;
  oneLine: string;
  bullets: string[];
  actionItems: string[];
  generatedAt: string;
}

export interface AIDraft {
  tone: 'concise' | 'friendly' | 'formal';
  bodyText: string;
  rationale?: string;
}
