import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { displayName, email, tier } = await request.json() as {
    displayName?: string;
    email?: string;
    tier?: string;
  };

  try {
    await resend.emails.send({
      from: 'Syft <noreply@syft.cooking>',
      to: 'dev@zachmoodie.com',
      subject: `New signup: ${displayName || 'Unknown'} (${tier ?? 'Free'})`,
      text: `New user signed up on Syft.\n\nName: ${displayName || '—'}\nEmail: ${email || '—'}\nPlan: ${tier ?? 'Free'}\nTime: ${new Date().toUTCString()}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup notification error:', error);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
