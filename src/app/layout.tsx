import type { Metadata } from "next";
import { Inter, Bitter, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppKit } from "../context/appkit";
import { Providers } from "../context/providers";
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
  title: "Domain Space - Grab your space On-chain with DOMA",
  description: "A beautiful cosmic-themed domain marketplace built with Next.js, TypeScript, and Tailwind CSS",
  icons: {
    icon: '/favicon.ico?v=1',
    shortcut: '/favicon.ico?v=1',
    apple: '/favicon.ico?v=1',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${bitter.variable} ${spaceMono.variable}`}>
      <body className={`${inter.className} antialiased`}>
        <AppKit>
          <Providers>
            {children}
          </Providers>
        </AppKit>
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
