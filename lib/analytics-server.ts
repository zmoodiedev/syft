import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type ServerEventType =
  | 'checkout_started'
  | 'subscription_activated'
  | 'subscription_reactivated'
  | 'subscription_cancelled'
  | 'recipe_limit_reached'
  | 'account_deleted';

export async function logEvent(
  userId: string,
  type: ServerEventType,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.collection('events').add({
      userId,
      type,
      metadata,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Never let analytics break the main flow
    console.error(`[analytics] Failed to log event "${type}":`, err);
  }
}
