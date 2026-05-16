import { NextResponse } from 'next/server';
import { getCurrentAccounts, getActiveAccountId } from '@/lib/auth/current';

export const dynamic = 'force-dynamic';

export async function GET() {
  const accounts = await getCurrentAccounts();
  const active = await getActiveAccountId();
  return NextResponse.json({ accounts, activeAccountId: active });
}
