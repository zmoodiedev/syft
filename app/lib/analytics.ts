import type { User } from 'firebase/auth';

export async function logEvent(
  user: User,
  type: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    const token = await user.getIdToken();
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, metadata }),
    });
  } catch {
    // Never surface analytics errors
  }
}
