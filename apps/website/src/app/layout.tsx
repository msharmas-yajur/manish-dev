import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Caladrius Health | AI-Powered Healthcare Platform',
    template: '%s | Caladrius Health',
  },
  description:
    'Transform clinical workflows with AI-powered healthcare solutions. Caladrius Health provides intelligent patient management, medical coding, and clinical decision support.',
  keywords: [
    'healthcare AI',
    'clinical workflows',
    'patient management',
    'medical coding',
    'HIPAA compliant',
    'healthcare platform',
  ],
  authors: [{ name: 'Caladrius Health' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.caladrius.com',
    siteName: 'Caladrius Health',
    title: 'Caladrius Health | AI-Powered Healthcare Platform',
    description:
      'Transform clinical workflows with AI-powered healthcare solutions.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Caladrius Health',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Caladrius Health | AI-Powered Healthcare Platform',
    description:
      'Transform clinical workflows with AI-powered healthcare solutions.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
