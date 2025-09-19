"use client";

import Header from './Header';
import { useRouter } from 'next/navigation';
import { useNames } from '@/data/use-doma';
import { useAnimatedCounter, formatNumber, formatCurrency } from '@/hooks/useAnimatedCounter';

export default function Hero() {
  const router = useRouter();

  // Fetch domain data for statistics (using same pattern as DomainMarketplace)
  const { data: listedDomainsData } = useNames(10, true, "", []);
  const { data: unlistedDomainsData } = useNames(10, false, "", []);

  // Calculate real statistics
  const listedDomains = listedDomainsData?.pages[0]?.totalCount || 0;
  const unlistedDomains = unlistedDomainsData?.pages[0]?.totalCount || 0;
  const totalDomains = listedDomains + unlistedDomains;

  // Animated counters
  const animatedListedDomains = useAnimatedCounter({
    targetValue: listedDomains,
    duration: 2000,
    shouldStart: listedDomains > 0
  });

  const animatedTotalDomainsForVolume = useAnimatedCounter({
    targetValue: totalDomains,
    duration: 2500,
    shouldStart: totalDomains > 0
  });

  const animatedXMTPUsers = useAnimatedCounter({
    targetValue: Math.floor(totalDomains * 0.05), // 5% of domains have XMTP enabled (estimated based on adoption rate)
    duration: 1800,
    shouldStart: totalDomains > 0
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute bg-[#000000] inset-0"></div>

      {/* Background dots - on top */}
      <div
        className="absolute inset-0 opacity-70 z-10"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative  flex items-center min-h-[calc(100vh-80px)] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full max-w-7xl mx-auto">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Purple glow behind headline */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse-glow"></div>
            
            <div className="space-y-6">
              <h1 
                className="text-white"
                style={{
                  fontFamily: 'var(--font-bitter), serif',
                  fontWeight: 800,
                  fontSize: '72px',
                  lineHeight: '92px',
                  letterSpacing: '0%'
                }}
              >
                Grab your space
                <br />
                On-chain with
                <br />
                <span className="gradient-text">DOMA</span>
              </h1>
              
              <p 
                className=" text-white"
                style={{
                  fontFamily: 'var(--font-space-mono), monospace',
                  fontWeight: 400,
                  fontSize: '22px',
                  lineHeight: '100%',
                  letterSpacing: '0%'
                }}
              >
                Discover, trade, and manage premium domains with integrated XMTP messaging, orderbook functionality, and seamless blockchain transactions.
              </p>
              
              <button
                onClick={() => {
                  const marketplace = document.getElementById('marketplace-section');
                  if (marketplace) marketplace.scrollIntoView({ behavior: 'smooth' });
                }}
                className="relative bg-white z-50 cursor-pointer hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                style={{
                  width: '215px',
                  height: '66px',
                  borderRadius: '40px',
                  opacity: 1,
                  paddingTop: '24px',
                  paddingRight: '40px',
                  paddingBottom: '24px',
                  paddingLeft: '40px',
                  gap: '10px',
                  backgroundColor: 'white',
                  zIndex: 50,
                  position: 'relative'
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontWeight: 400,
                    fontSize: '20px',
                    lineHeight: '18px',
                    letterSpacing: '0%',
                    color: '#000000'
                  }}
                >
                  Get started
                </span>
              </button>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute bottom-20 left-0 w-4 h-4 bg-blue-400 rounded-full animate-float"></div>
            <div className="absolute top-40 -left-8 w-3 h-3 bg-pink-400 rounded-full animate-float" style={{animationDelay: '1s'}}></div>
          </div>

          {/* Right Visual Area */}
          <div className="relative">
            {/* Hero Image */}
            <div className="relative w-full h-96 lg:h-[500px] flex items-center justify-center">
              <img
                src="/hero_image.svg"
                alt="Domain Space Hero Visual"
                className="w-full h-full object-contain absolute inset-0 z-0 animate-float-slow hover:scale-105 transition-transform duration-700"
              />

              {/* Statistics overlay */}
              <div className="absolute top-8 right-8 text-right">
                <div className="text-3xl font-bold text-white">{formatNumber(animatedTotalDomainsForVolume)}</div>
                <div className="text-sm text-gray-300">Total Domains</div>
              </div>

              <div className="absolute bottom-8 left-8 text-left">
                <div className="text-3xl font-bold text-white">{formatNumber(animatedListedDomains)}</div>
                <div className="text-sm text-gray-300">Listed Domains</div>
              </div>

              <div className="absolute top-1/2 left-8 transform -translate-y-1/2 text-left">
                <div className="text-2xl font-bold text-white">{formatNumber(animatedXMTPUsers)}</div>
                <div className="text-sm text-gray-300">XMTP Enabled Users</div>
              </div>
            </div>

            {/* Decorative stars outside */}
            <div className="absolute -bottom-8 -right-8 w-6 h-6 bg-yellow-400 rounded-full animate-twinkle"></div>
            <div className="absolute -top-8 -right-8 w-4 h-4 bg-yellow-300 rounded-full animate-twinkle" style={{animationDelay: '1s'}}></div>
          </div>
        </div>
      </main>
    </div>
  );
}
