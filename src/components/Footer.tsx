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
      <div className="relative border-t border-white/20 z-10 px-4 sm:px-6 lg:px-12 py-8 sm:py-12 lg:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8">
            
            {/* Left Section - Logo and Copyright */}
            <div className="flex flex-col items-start space-y-3 sm:space-y-4">
               {/* Logo */}
               <div className="flex items-center space-x-2 sm:space-x-3">
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
              <p className="text-purple-300/80 text-xs sm:text-sm">
                Copyright © 2025 DomainSpace | All Rights Reserved
              </p>
            </div>

            {/* Right Section - Email Subscription */}
            <div className="flex flex-col items-start lg:items-end space-y-3 sm:space-y-4 w-full lg:w-auto">
              {/* Email Subscription */}
              <form onSubmit={handleSubscribe} className="w-full lg:w-auto">
                <div className="flex w-full lg:w-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-gray-900/50 backdrop-blur-sm border border-white/20 rounded-l-xl px-3 sm:px-4 py-2 sm:py-3 w-full sm:w-56 lg:w-64 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/30 transition-all duration-200 text-sm sm:text-base"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing || !email}
                    className="bg-white text-black rounded-r-xl px-4 sm:px-6 py-2 sm:py-3 font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base flex-shrink-0"
                  >
                    {isSubscribing ? (
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        <span className="hidden sm:inline">Subscribing...</span>
                        <span className="sm:hidden">...</span>
                      </div>
                    ) : (
                      "Subscribe"
                    )}
                  </button>
                </div>
              </form>

              {/* Decorative Star */}
              <div className="flex justify-start lg:justify-end">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
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
