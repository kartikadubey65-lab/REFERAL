import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Referral Circle · Kartika',
  description:
    'Refer a friend, earn credits, and use them for your next booking with Kartika.',
  icons: { icon: '/kartika.svg' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
