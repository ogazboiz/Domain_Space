import Hero from '@/components/Hero'
import Features from '@/components/Features'
import DomainMarketplace from '@/components/DomainMarketplace'
import Footer from '@/components/Footer'
import { Metadata } from 'next'
import Header from '@/components/Header'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'Doma Space - Premium Domain Marketplace & Trading Platform',
  description: 'Discover, trade, and manage premium domains with our advanced marketplace. Features XMTP messaging, orderbook integration, and seamless domain transactions.',
  keywords: 'domain marketplace, domain trading, premium domains, blockchain domains, XMTP messaging, orderbook, domain sales',
  openGraph: {
    title: 'Doma Space - Premium Domain Marketplace',
    description: 'The ultimate platform for domain discovery, trading, and management with integrated messaging and orderbook functionality.',
    type: 'website',
    url: 'https://domain-space.vercel.app',
    images: [
      {
        url: 'https://domain-space.vercel.app/logo_dark.png',
        width: 1200,
        height: 630,
        alt: 'Doma Space - Domain Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Doma Space - Premium Domain Marketplace',
    description: 'Discover, trade, and manage premium domains with advanced marketplace features.',
    images: ['https://domain-space.vercel.app/logo_dark.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function Home() {
  return (
    <div>
       {/* Header */}
       <Header/>
      <Hero />
      <Features />
      <DomainMarketplace />
      <Footer />
      <PWAInstallPrompt />
      <ServiceWorkerRegistration />
    </div>
  );
}
