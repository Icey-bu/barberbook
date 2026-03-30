import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'BarberBook',
    template: '%s | BarberBook',
  },
  description: 'Book your barber appointment online — fast, easy, no phone calls.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://barberbook.app'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
