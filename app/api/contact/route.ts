import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  const { subject, message, type } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email service not configured. Add RESEND_API_KEY to .env.local' },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);

  const emailSubject = subject?.trim()
    ? subject.trim()
    : type === 'bug' ? 'Bug Report — AIon' : 'Help Center Request — AIon';

  const { error } = await resend.emails.send({
    from: 'AIon <onboarding@resend.dev>',
    to: 'aionagentic@gmail.com',
    subject: emailSubject,
    text: message,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${message}</pre>`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
