import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { logEvent } from '@/lib/analytics-server';

export const runtime = 'nodejs';

const CLIENT_EVENT_TYPES = ['upgrade_modal_opened'] as const;
type ClientEventType = (typeof CLIENT_EVENT_TYPES)[number];

export async function POST(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token);
    const userId = decoded.uid;

    const { type, metadata = {} } = await request.json() as {
      type: ClientEventType;
      metadata?: Record<string, unknown>;
    };

    if (!CLIENT_EVENT_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    await logEvent(userId, type as never, metadata);
    return NextResponse.json({ ok: true });
  } catch {
    // Silently swallow — analytics must never surface errors to the user
    return NextResponse.json({ ok: true });
  }
}
