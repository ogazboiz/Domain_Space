"use client";

import { useRouter } from 'next/navigation';

export default function Features() {
  const router = useRouter();

  return (
    <section id="features-section" className="relative py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-12">
      {/* Background */}
      <div className="absolute inset-0 bg-black"></div>
      
      {/* Background dots */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto text-center">
        {/* Header */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <h2 
            className="text-white mb-4 sm:mb-6 text-xl sm:text-2xl md:text-3xl lg:text-4xl"
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontWeight: 700,
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            Simple Steps, Great Features
          </h2>
          <p 
            className="text-white max-w-2xl mx-auto text-sm sm:text-base lg:text-lg xl:text-xl"
            style={{
              fontFamily: 'var(--font-space-mono), monospace',
              fontWeight: 400,
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            This can only be just the beginning of what is possible
          </p>
        </div>
        
        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          {/* Card 1 */}
          <div 
            className="text-left border border-gray-600 w-full max-w-sm mx-auto sm:max-w-none"
            style={{
              background: 'linear-gradient(180deg, #4F4F4F 0%, #000000 100%)',
              minHeight: '200px',
              borderRadius: '16px',
              borderWidth: '1px',
              opacity: 1,
              paddingTop: '20px',
              paddingRight: '18px',
              paddingBottom: '20px',
              paddingLeft: '18px',
              gap: '16px'
            }}
          >
            <h3 
              className="mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl"
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontWeight: 700,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#FFFFFF'
              }}
            >
              1. Connect your wallet
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Securely connect your Web3 wallet to start buying, selling, and managing your domain portfolio. Supports all major wallets.
            </p>
          </div>
          
          {/* Card 2 */}
          <div 
            className="text-left border border-gray-600 w-full max-w-sm mx-auto sm:max-w-none"
            style={{
              background: 'linear-gradient(180deg, #4F4F4F 0%, #000000 100%)',
              minHeight: '200px',
              borderRadius: '16px',
              borderWidth: '1px',
              opacity: 1,
              paddingTop: '20px',
              paddingRight: '18px',
              paddingBottom: '20px',
              paddingLeft: '18px',
              gap: '16px'
            }}
          >
            <h3 
              className="mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl"
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontWeight: 700,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#FFFFFF'
              }}
            >
              2. Browse/Search Domains
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Explore thousands of premium domains across multiple TLDs. Use advanced filters to find the perfect domain for your project.
            </p>
          </div>
          
          {/* Card 3 */}
          <div 
            className="text-left border border-gray-600 w-full max-w-sm mx-auto sm:max-w-none"
            style={{
              background: 'linear-gradient(180deg, #4F4F4F 0%, #000000 100%)',
              minHeight: '200px',
              borderRadius: '16px',
              borderWidth: '1px',
              opacity: 1,
              paddingTop: '20px',
              paddingRight: '18px',
              paddingBottom: '20px',
              paddingLeft: '18px',
              gap: '16px'
            }}
          >
            <h3 
              className="mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl"
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontWeight: 700,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#FFFFFF'
              }}
            >
              3. Buy/Make Offer
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Purchase domains instantly or submit offers to owners. Transparent pricing with secure blockchain transactions.
            </p>
          </div>
          
          {/* Card 4 */}
          <div 
            className="text-left border border-gray-600 w-full max-w-sm mx-auto sm:max-w-none"
            style={{
              background: 'linear-gradient(180deg, #4F4F4F 0%, #000000 100%)',
              minHeight: '200px',
              borderRadius: '16px',
              borderWidth: '1px',
              opacity: 1,
              paddingTop: '20px',
              paddingRight: '18px',
              paddingBottom: '20px',
              paddingLeft: '18px',
              gap: '16px'
            }}
          >
            <h3 
              className="mb-3 sm:mb-4 text-base sm:text-lg lg:text-xl"
              style={{
                fontFamily: 'var(--font-space-mono), monospace',
                fontWeight: 700,
                lineHeight: '100%',
                letterSpacing: '0%',
                color: '#FFFFFF'
              }}
            >
              4. Chat
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
              Connect directly with domain owners through integrated messaging. Negotiate deals and build relationships in the Web3 space.
            </p>
          </div>
        </div>
        
        {/* Call to Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              const marketplace = document.getElementById('marketplace-section');
              if (marketplace) marketplace.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-white text-black px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 w-full sm:w-auto max-w-xs sm:max-w-none"
            style={{
              fontFamily: 'var(--font-space-mono), monospace'
            }}
          >
            Get started
          </button>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-pink-400 animate-float">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
          <path d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z"/>
        </svg>
      </div>
      
      <div className="absolute bottom-12 right-6 sm:bottom-20 sm:right-10 w-6 h-6 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-400 animate-float" style={{animationDelay: '2s'}}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
          <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
        </svg>
      </div>
    </section>
  );
}
