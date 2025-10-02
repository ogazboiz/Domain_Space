"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Privy hooks
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Wagmi hooks
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => setMounted(true), []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const truncateAddress = (addr: string | undefined) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const handleConnect = async () => {
    try {
      await login();
    } catch (error: unknown) {
      console.error("Connection error:", error instanceof Error ? error.message : String(error));
    }
  };

  const handleWalletButtonClick = () => {
    setIsWalletDropdownOpen(!isWalletDropdownOpen);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleNavigationClick = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  const handleDisconnect = async (event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (isDisconnecting) return; // Prevent multiple disconnect attempts

    setIsDisconnecting(true);
    setIsWalletDropdownOpen(false);

    try {
      // Disconnect from Privy
      if (authenticated) {
        await logout();
      }

      // Disconnect from Wagmi
      if (isConnected) {
        await disconnect();
      }

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: unknown) {
      console.error("Disconnect error:", error instanceof Error ? error.message : String(error));
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <header className="sticky top-0 z-[999] w-full bg-black/95 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-4 lg:px-8 lg:py-6 max-w-7xl mx-auto h-16 lg:h-20">

        {/* Logo Section */}
        <div className="flex items-center flex-shrink-0 h-full">
          <div className="bg-white rounded-lg p-2 shadow-lg flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="Domain Space Logo"
              className="w-8 h-8 lg:w-10 lg:h-10 object-contain"
            />
          </div>
          <div className="ml-3 hidden sm:block">
            <h1 className="text-white text-lg lg:text-xl font-bold leading-tight">Domain Space</h1>
            <p className="text-purple-300 text-xs lg:text-sm leading-tight">Web3 Domains</p>
          </div>
        </div>

        {/* Center Navigation - Desktop */}
        <nav className="hidden lg:flex items-center space-x-1 h-full">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 font-medium h-10"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span className="text-sm font-medium">Home</span>
          </button>
          <button
            onClick={() => {
              // Scroll to marketplace section if it exists, otherwise just scroll to top
              const marketplace = document.getElementById('marketplace-section');
              if (marketplace) {
                marketplace.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center space-x-2 text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 font-medium h-10"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm font-medium">Marketplace</span>
          </button>
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3 h-full">
          
          {/* Wallet Section - Desktop Only */}
          <div className="hidden lg:block">
            {!mounted ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">Connecting...</span>
              </div>
            </div>
          ) : authenticated && address ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleWalletButtonClick}
                className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-green-400/30 hover:border-green-400/50 hover:bg-green-400/5 transition-all duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-white text-sm font-mono">{truncateAddress(address)}</span>
                  </div>
                  <svg className={`w-4 h-4 text-white transform transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

            {isWalletDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 glass rounded-lg border border-white/20 shadow-lg bg-gray-900/95 backdrop-blur-sm z-50">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">{wallets[0]?.walletClientType || connector?.name || "Connected Wallet"}</p>
                      <p className="text-sm text-gray-400">{truncateAddress(address)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className={`w-full relative z-50 flex items-center justify-start gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                      isDisconnecting
                        ? 'text-gray-500 bg-gray-400/10 cursor-not-allowed opacity-70'
                        : 'text-red-400 hover:bg-red-400/20 hover:text-red-300 active:bg-red-400/30 cursor-pointer'
                    }`}
                    style={{ pointerEvents: isDisconnecting ? 'none' : 'auto' }}
                  >
                    {isDisconnecting ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    )}
                    {isDisconnecting ? "Disconnecting..." : "Disconnect"}
                  </button>
                </div>
              </div>
            )}
          </div>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20 hover:border-purple-400/50 hover:bg-white/5 transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                </svg>
                <span className="text-white font-medium">Connect Wallet</span>
              </div>
            </button>
          )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={handleMobileMenuToggle}
            className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            aria-label="Toggle mobile menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-black/95 backdrop-blur-md" ref={mobileMenuRef}>
          <div className="px-4 py-4 space-y-2">
            <button
              onClick={() => handleNavigationClick(() => router.push('/'))}
              className="w-full flex items-center space-x-3 text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              <span className="font-medium">Home</span>
            </button>
            <button
              onClick={() => handleNavigationClick(() => {
                const marketplace = document.getElementById('marketplace-section');
                if (marketplace) {
                  marketplace.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              })}
              className="w-full flex items-center space-x-3 text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
              </svg>
              <span className="font-medium">Marketplace</span>
            </button>
            {/* Wallet Actions for Mobile */}
            <div className="border-t border-white/10 pt-2 mt-2">
              {!mounted ? (
                <div className="px-4 py-2 text-sm text-gray-400">
                  Connecting...
                </div>
              ) : authenticated && address ? (
                <div className="space-y-2">
                  <div className="px-4 py-2 text-sm text-gray-400">
                    Connected: {truncateAddress(address)}
                  </div>
                  <button
                    onClick={() => handleNavigationClick(() => handleDisconnect())}
                    className="w-full flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-400/10 px-4 py-3 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Disconnect</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleNavigationClick(() => handleConnect())}
                  className="w-full flex items-center space-x-3 text-white/80 hover:text-white hover:bg-white/10 px-4 py-3 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                  </svg>
                  <span className="font-medium">Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>

  );
}
