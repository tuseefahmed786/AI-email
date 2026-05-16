import { NextResponse } from 'next/server';
import { getCurrentProviders } from '@/lib/auth/current';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = await getCurrentProviders();
  if (providers.length === 0) return NextResponse.json({ labels: [] });
  const labels = await providers[0].listLabels();
  return NextResponse.json({ labels });
}
