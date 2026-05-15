import { redirect } from 'next/navigation';

export default function LegacyBotPage() {
  redirect('/chat');
}

export async function generateStaticParams() {
  return [];
}
