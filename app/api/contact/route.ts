import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  const { subject, message, type } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return NextResponse.json(
      { error: 'Email service not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local' },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  const emailSubject = subject?.trim()
    ? subject.trim()
    : type === 'bug' ? 'Bug Report — AIon' : 'Help Center Request — AIon';

  await transporter.sendMail({
    from: `"AIon App" <${user}>`,
    to: 'aionagentic@gmail.com',
    subject: emailSubject,
    text: message,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${message}</pre>`,
  });

  return NextResponse.json({ ok: true });
}
