import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'AIon — AI in One Place',
  description: 'Chat with multiple AI models in one place.',
  icons: {
    icon: '/aion-icon.svg',
    shortcut: '/aion-icon.svg',
    apple: '/aion-icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
