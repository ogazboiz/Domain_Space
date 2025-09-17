"use client";

import { useState, useMemo, useCallback } from "react";
import { useNames } from "@/data/use-doma";
import { Name } from "@/types/doma";
import { useAccount } from "wagmi";
import DomainCard from "./DomainCard";

// TLD color mappings
const TLD_COLORS: Record<string, string> = {
  'com': '#3B82F6',
  'ai': '#8B5CF6',
  'io': '#10B981',
  'eth': '#F59E0B',
  'ape': '#EC4899',
  'shib': '#EAB308',
  'football': '#EF4444'
};

export default function DomainCommandCenter() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tldFilter, setTldFilter] = useState("all");

  const { address } = useAccount();

  // API hook for domain search
  const {
    data: browseDomainsData,
    fetchNextPage: fetchNextBrowsePage,
    hasNextPage: hasNextBrowse,
    isLoading: isLoadingBrowse,
    error: browseError
  } = useNames(
    12, // Show fewer on landing page
    false,
    searchQuery,
    tldFilter === "all" ? [] : [tldFilter]
  );

  // Process domains
  const browseDomains = useMemo(() => {
    if (!browseDomainsData?.pages) return [];
    return browseDomainsData.pages.flatMap(page => page.items);
  }, [browseDomainsData]);

  const totalBrowseCount = browseDomainsData?.pages[0]?.totalCount || 0;

  // Utility functions
  const formatPrice = useCallback((price: string, decimals: number) => {
    const value = parseFloat(price) / Math.pow(10, decimals);
    return value.toFixed(4);
  }, []);

  const getTldColor = useCallback((tld: string) => {
    return TLD_COLORS[tld.toLowerCase()] || '#6B7280';
  }, []);

  // Transaction success handler
  const handleTransactionSuccess = useCallback((type: 'buy' | 'offer', domain: Name, result: unknown) => {
    if (type === 'buy') {
      alert(`🎉 Successfully purchased ${domain.name}!`);
    } else {
      alert(`💰 Successfully created offer for ${domain.name}!`);
    }
  }, []);

  // Message handler
  const handleMessage = useCallback(async (domain: Name) => {
    if (!domain.claimedBy) {
      alert("This domain is not owned by anyone yet.");
      return;
    }

    const ownerAddress = domain.claimedBy.split(':')[2];
    if (!ownerAddress) {
      alert("Invalid owner address format.");
      return;
    }

    // Redirect to chat page with owner address
    window.location.href = `/chat?address=${ownerAddress}&domain=${domain.name}`;
  }, []);

  return (
    <section className="relative py-20 px-6 lg:px-12">
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
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-green-400 to-blue-400 bg-clip-text text-transparent mb-6">
            🚀 Domain Marketplace
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Discover, trade, and message domain owners in the revolutionary Web3 marketplace
          </p>

        </div>

        {/* Simple Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search domains... (e.g., crypto, web3, ai)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 text-lg"
              />
              <svg className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
            </div>
            <select
              value={tldFilter}
              onChange={(e) => setTldFilter(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20"
            >
              <option value="all">All TLDs</option>
              <option value="com">.com</option>
              <option value="ai">.ai</option>
              <option value="io">.io</option>
              <option value="eth">.eth</option>
              <option value="ape">.ape</option>
              <option value="shib">.shib</option>
              <option value="football">.football</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {totalBrowseCount > 0 && (
          <div className="text-center mb-8">
            <p className="text-gray-400">
              Found <span className="text-purple-400 font-semibold">{totalBrowseCount}</span> domains
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Domain Grid */}
        <div className="space-y-8">
          {browseError ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-red-400 text-xl font-bold mb-4">Error Loading Domains</h3>
              <p className="text-gray-400">{browseError.message}</p>
            </div>
          ) : isLoadingBrowse ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 animate-pulse">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-700 rounded w-20"></div>
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </div>
                  <div className="mt-4">
                    <div className="h-10 bg-gray-700 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : browseDomains.length === 0 && searchQuery ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-white text-xl font-bold mb-4">No domains found</h3>
              <p className="text-gray-400">No domains found matching &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => setSearchQuery("")}
                className="mt-6 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : browseDomains.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-white text-xl font-bold mb-4">Discover Amazing Domains</h3>
              <p className="text-gray-400 mb-6">Search for available domains or browse the marketplace</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {['crypto', 'ai', 'web3', 'nft'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {browseDomains.map((domain) => (
                  <DomainCard
                    key={domain.name}
                    domain={domain}
                    formatPrice={formatPrice}
                    getTldColor={getTldColor}
                    onMessage={handleMessage}
                    onTransactionSuccess={handleTransactionSuccess}
                    userAddress={address}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasNextBrowse && (
                <div className="text-center">
                  <button
                    onClick={() => fetchNextBrowsePage()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg transition-colors font-medium"
                  >
                    Load More Domains
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl p-8 border border-purple-500/20">
          <h3 className="text-2xl font-bold text-white mb-4">Ready to Start Trading?</h3>
          <p className="text-gray-300 mb-6">
            Join thousands of users buying, selling, and messaging about domains
          </p>
        </div>
      </div>

    </section>
  );
}