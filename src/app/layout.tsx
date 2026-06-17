import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExamPortal — Online Test Platform',
  description: 'A secure PDF-based exam portal for students and administrators.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
