"use client";

import { useAppKitAccount, useAppKit } from "@reown/appkit/react";
import { useDisconnect } from "@reown/appkit/react";
import { useWalletInfo } from "@reown/appkit/react";
import { useAccount, useDisconnect as useWagmiDisconnect } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // AppKit hooks
  const { address: appkitAddress, isConnected: appkitIsConnected } = useAppKitAccount();
  const { open, close } = useAppKit();
  const { walletInfo } = useWalletInfo();
  const { disconnect: appkitDisconnect } = useDisconnect();

  // Wagmi hooks
  const { address: wagmiAddress, isConnected: wagmiIsConnected, connector } = useAccount();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();

  const address = appkitAddress || wagmiAddress;
  const isConnected = appkitIsConnected || wagmiIsConnected;

  useEffect(() => setMounted(true), []);

  // Click outside to close dropdown (Agro's approach)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const truncateAddress = (addr: string | undefined) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const handleConnect = async () => {
    try {
      await open();
    } catch (error: unknown) {
      console.error("Connection error:", error instanceof Error ? error.message : String(error));
    }
  };

  const handleWalletButtonClick = () => {
    setIsWalletDropdownOpen(!isWalletDropdownOpen);
  };

  const handleDisconnect = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (isDisconnecting) return; // Prevent multiple disconnect attempts

    console.log("Disconnect button clicked"); // Debug log

    setIsDisconnecting(true);
    setIsWalletDropdownOpen(false);

    try {
      // Disconnect from AppKit first
      if (appkitIsConnected) {
        console.log("Disconnecting AppKit...");
        await appkitDisconnect();
      }

      // Then disconnect from Wagmi
      if (wagmiIsConnected) {
        console.log("Disconnecting Wagmi...");
        await wagmiDisconnect();
      }

      // Force close AppKit modal if it's still open
      try {
        await close();
      } catch (closeError) {
        // Ignore close errors as modal might not be open
        console.debug("AppKit modal close:", closeError);
      }

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log("Disconnect completed successfully");

    } catch (error: unknown) {
      console.error("Disconnect error:", error instanceof Error ? error.message : String(error));
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <header className="relative z-20 w-full">
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
          <button className="flex items-center space-x-2 text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 font-medium h-10">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            <span className="text-sm font-medium">Messages</span>
          </button>
          <button className="flex items-center space-x-2 text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 font-medium h-10">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
            <span className="text-sm font-medium">Analytics</span>
          </button>
          <button className="flex items-center space-x-2 text-white/80 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-200 font-medium h-10">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
            <span className="text-sm font-medium">Search</span>
          </button>
        </nav>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3 h-full">

          {/* Mobile Search Button */}
          <button className="lg:hidden p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
            </svg>
          </button>

          {/* Wallet Section */}
          {!mounted ? (
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">Connecting...</span>
              </div>
            </div>
          ) : isConnected && address ? (
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
                      <p className="font-medium text-white">{walletInfo?.name || connector?.name || "Connected Wallet"}</p>
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
      </div>

      {/* Mobile Navigation Menu */}
      <div className="lg:hidden px-4 pb-4">
        <div className="flex items-center justify-center space-x-6">
          <button className="flex flex-col items-center space-y-1 text-white/70 hover:text-white p-3 rounded-lg hover:bg-white/10 transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            <span className="text-xs">Messages</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-white/70 hover:text-white p-3 rounded-lg hover:bg-white/10 transition-all duration-200">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
            </svg>
            <span className="text-xs">Analytics</span>
          </button>
        </div>
      </div>
    </header>

  );
}
