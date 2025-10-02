"use client";

import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubscribing(true);
    try {
      // TODO: Implement actual subscription logic
      console.log("Subscribing email:", email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEmail("");
      alert("Thank you for subscribing!");
    } catch (error) {
      console.error("Subscription error:", error);
      alert("Failed to subscribe. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="relative bg-black overflow-hidden">
      {/* Background dots */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />

      {/* Content */}
      <div className="relative border-t border-white/20 z-10 px-4 md:px-6 lg:px-12 py-8 md:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center lg:justify-between gap-6 md:gap-8">
            
            {/* Mobile Layout - Centered */}
            <div className="flex flex-col items-center space-y-6 w-full lg:hidden">
              {/* Logo - Centered on mobile */}
              <div className="flex items-center justify-center">
                <div 
                  className="relative"
                  style={{
                    width: '120px',
                    height: '86px',
                    opacity: 1
                  }}
                >
                  <img 
                    src="/logo_white.svg" 
                    alt="Domain Space Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Email Subscription - Centered on mobile */}
              <form onSubmit={handleSubscribe} className="w-full max-w-sm">
                <div className="flex w-full">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/20 rounded-l-xl px-4 py-3 w-full text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all duration-200 text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing || !email}
                    className="bg-white text-black rounded-r-xl px-6 py-3 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base flex-shrink-0"
                  >
                    {isSubscribing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Subscribing...</span>
                      </div>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              </form>

              {/* Copyright - After input button on mobile */}
              <p className="text-purple-300/80 text-sm text-center">
                Copyright © 2025 DomainSpace | All Rights Reserved
              </p>

              {/* Decorative Star - Centered on mobile */}
              <div className="flex justify-center">
                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Desktop Layout - Original */}
            <div className="hidden lg:flex flex-col items-start space-y-4">
               {/* Logo */}
               <div className="flex items-center space-x-3">
                 <div 
                   className="relative"
                   style={{
                     width: '120px',
                     height: '86px',
                     opacity: 1
                   }}
                 >
                   <img 
                     src="/logo_white.svg" 
                     alt="Domain Space Logo" 
                     className="w-full h-full object-contain"
                   />
                 </div>
               </div>
               
              {/* Copyright */}
              <p className="text-purple-300/80 text-sm">
                Copyright © 2025 DomainSpace | All Rights Reserved
              </p>
            </div>

            {/* Desktop Right Section - Email Subscription */}
            <div className="hidden lg:flex flex-col items-end space-y-4 w-auto">
              {/* Email Subscription */}
              <form onSubmit={handleSubscribe} className="w-auto">
                <div className="flex w-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/20 rounded-l-xl px-4 py-3 w-64 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all duration-200 text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing || !email}
                    className="bg-white text-black rounded-r-xl px-6 py-3 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-base flex-shrink-0"
                  >
                    {isSubscribing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span>Subscribing...</span>
                      </div>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              </form>

              {/* Decorative Star */}
              <div className="flex justify-end">
                <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
