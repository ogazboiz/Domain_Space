import type { Metadata } from "next";
import { Inter, Bitter, Space_Mono } from "next/font/google";
import "./globals.css";
import { PrivyProviders } from "../context/privy";
import { UsernameProvider } from "../contexts/UsernameContext";
import { XMTPProvider } from "../contexts/XMTPContext";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bitter = Bitter({
  subsets: ["latin"],
  variable: "--font-bitter",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Doma Space - Premium Domain Marketplace & Trading Platform",
  description: "Discover, trade, and manage premium domains with our advanced marketplace. Features XMTP messaging, orderbook integration, and seamless domain transactions.",
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/favicon.ico?v=2', type: 'image/x-icon' },
      { url: '/logo.svg?v=2', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/favicon.ico?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bitter.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="icon" href="/logo.svg?v=2" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <link rel="apple-touch-icon" href="/favicon.ico?v=2" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <PrivyProviders>
          <UsernameProvider>
            <XMTPProvider>
              {children}
            </XMTPProvider>
          </UsernameProvider>
        </PrivyProviders>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111827', // bg-gray-900 to match your dark theme
              border: '1px solid #374151', // border-gray-700
              color: '#ffffff',
              fontFamily: 'var(--font-geist-mono)',
            },
            className: 'font-mono',
          }}
          richColors
        />
      </body>
    </html>
  );
}
