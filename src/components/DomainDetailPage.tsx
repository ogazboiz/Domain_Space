"use client";

import { useState } from "react";
import { Name } from "@/types/doma";
import { formatDistanceToNow } from "date-fns";
// import { formatUnits } from "viem";
import MessagingModal from "./MessagingModal";

interface DomainDetailPageProps {
  domain: Name;
  onBack: () => void;
  onMessage?: (domain: Name) => void;
  onBuy?: (domain: Name) => void;
  onOffer?: (domain: Name) => void;
  onList?: (domain: Name) => void;
  onCancelListing?: (domain: Name) => void;
  userAddress?: string;
}

const DomainDetailPage = ({
  domain,
  onBack,
  // onMessage,
  onBuy,
  onOffer,
  onList,
  onCancelListing,
  userAddress
}: DomainDetailPageProps) => {
  const [showMessaging, setShowMessaging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const token = domain.tokens?.[0];
  const listing = token?.listings?.[0];
  const isListed = !!listing;
  const tld = domain.name.split('.').pop() || '';
  const isOwned = !!domain.claimedBy;
  const isOwnedByUser = userAddress && domain.claimedBy &&
    domain.claimedBy.split(':')[2]?.toLowerCase() === userAddress.toLowerCase();

  const getTldColor = (tld: string) => {
    const tldColors: { [key: string]: string } = {
      'com': '#3B82F6',
      'ai': '#8B5CF6',
      'io': '#10B981',
      'eth': '#F59E0B',
      'ape': '#EC4899',
      'shib': '#EAB308',
      'football': '#EF4444'
    };
    return tldColors[tld.toLowerCase()] || '#6B7280';
  };

  const formatPrice = (price: string, decimals: number) => {
    const value = parseFloat(price) / Math.pow(10, decimals);
    return value.toFixed(4);
  };

  const handleAction = async (action: 'message' | 'buy' | 'offer' | 'list' | 'cancelListing') => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (action) {
      case 'message':
        setShowMessaging(true);
        break;
      case 'buy':
        onBuy?.(domain);
        break;
      case 'offer':
        onOffer?.(domain);
        break;
      case 'list':
        onList?.(domain);
        break;
      case 'cancelListing':
        onCancelListing?.(domain);
        break;
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <span>←</span>
          <span>Back to Marketplace</span>
        </button>

        {/* Domain Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Domain Info */}
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: '#EEEFFF29' }}
              >
                <span className="text-white text-2xl font-bold">
                  {tld.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 
                  className="text-4xl font-bold"
                  style={{
                    fontFamily: 'var(--font-space-mono), monospace',
                    fontWeight: 700
                  }}
                >
                  <span className="text-white">{domain.name.split('.')[0]}</span>
                  <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                </h1>
                <p className="text-gray-400 text-lg">
                  {isOwned ? 'Owned Domain' : 'Available Domain'}
                </p>
              </div>
            </div>

            {/* Domain Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <p className="text-gray-400 text-sm">Character Length</p>
                <p className="text-white text-xl font-bold">
                  {domain.name.split('.')[0].length} chars
                </p>
              </div>
              <div 
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <p className="text-gray-400 text-sm">TLD</p>
                <p 
                  className="text-xl font-bold"
                  style={{ color: getTldColor(tld) }}
                >
                  .{tld}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Actions</h3>
              {isOwnedByUser ? (
                // Actions for owned domains
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-green-400 font-medium">You own this domain</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isListed ? (
                      <button
                        onClick={() => handleAction('cancelListing')}
                        disabled={isLoading}
                        className="flex items-center justify-center space-x-2 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        <span>❌</span>
                        <span>Cancel Listing</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction('list')}
                        disabled={isLoading}
                        className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <span>📋</span>
                        <span>List Domain</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Actions for non-owned domains
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleAction('message')}
                    disabled={isLoading}
                    className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <span>💬</span>
                    <span>Message Owner</span>
                  </button>

                  {isListed && (
                    <button
                      onClick={() => handleAction('buy')}
                      disabled={isLoading}
                      className="flex items-center justify-center space-x-2 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      <span>🛒</span>
                      <span>Buy Now</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleAction('offer')}
                    disabled={isLoading}
                    className="flex items-center justify-center space-x-2 border border-white text-white py-3 px-6 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    <span>💰</span>
                    <span>Make Offer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Details */}
          <div className="space-y-8">
            {/* Price Card */}
            <div 
              className="p-8 rounded-2xl"
              style={{
                backgroundColor: '#121212',
                border: '1px solid',
                borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
                borderImageSlice: 1
              }}
            >
              <h3 className="text-2xl font-bold mb-6">Pricing</h3>
              
              {isListed ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Listed Price</span>
                    <span className="text-3xl font-bold text-white">
                      {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">USD Value</span>
                    <span className="text-xl text-gray-300">
                      ${(parseFloat(formatPrice(listing.price, listing.currency.decimals)) * listing.currency.usdExchangeRate).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Chain</span>
                    <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      {token?.chain?.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg mb-4">Not Listed for Sale</p>
                  <p className="text-sm text-gray-500">
                    {isOwned ? 'This domain is owned but not currently listed' : 'This domain is available for registration'}
                  </p>
                </div>
              )}
            </div>

            {/* Domain Details */}
            <div 
              className="p-6 rounded-xl"
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <h3 className="text-xl font-bold mb-4">Domain Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Registrar</span>
                  <span className="text-white">{domain.registrar?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Expires</span>
                  <span className="text-white">
                    {domain.expiresAt ? formatDistanceToNow(new Date(domain.expiresAt), { addSuffix: true }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-white">
                    {isOwned ? 'Owned' : 'Available'}
                  </span>
                </div>
                {isOwned && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Owner</span>
                    <span className="text-white font-mono text-sm">
                      {isOwnedByUser ? 'You' : `${domain.claimedBy?.split(':')[2]?.substring(0, 10)}...`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Community Section */}
        <div 
          className="p-8 rounded-2xl"
          style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <h3 className="text-2xl font-bold mb-6">Community</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <h4 className="font-bold mb-2">Discuss</h4>
              <p className="text-gray-400 text-sm">Join conversations about this domain</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <h4 className="font-bold mb-2">Analytics</h4>
              <p className="text-gray-400 text-sm">View domain performance metrics</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🔗</div>
              <h4 className="font-bold mb-2">Share</h4>
              <p className="text-gray-400 text-sm">Share with your network</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Modal */}
      <MessagingModal
        domain={domain}
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />
    </div>
  );
};

export default DomainDetailPage;
