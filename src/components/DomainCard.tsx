"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { Name } from "@/types/doma";
import { DomainAvatar } from '@/components/ui/DomainAvatar';

interface DomainCardProps {
  domain: Name;
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  onMessage?: (domain: Name) => void;
  onTransactionSuccess?: (type: 'buy' | 'offer', domain: Name, result: unknown) => void;
  onBuy?: (domain: Name) => void;
  onOffer?: (domain: Name) => void;
  onList?: (domain: Name) => void;
  onCancelListing?: (domain: Name) => void;
  userAddress?: string;
  onWatch?: (domain: Name) => void;
  isWatched?: (domainName: string) => boolean;
  onClick?: (domain: Name) => void;
  forceOwned?: boolean;
}

const DomainCard = ({
  domain,
  formatPrice,
  getTldColor,
  onMessage,
  onTransactionSuccess,
  onBuy,
  onOffer,
  onList,
  onCancelListing,
  userAddress,
  onWatch,
  isWatched,
  onClick,
  forceOwned = false
}: DomainCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const token = domain.tokens?.[0];
  const listing = token?.listings?.[0];
  const isListed = !!listing;
  const tld = domain.name.split('.').pop() || '';
  const isOwned = !!domain.claimedBy;
  const isOwnedByUser = forceOwned || (userAddress && domain.claimedBy &&
    domain.claimedBy.split(':')[2]?.toLowerCase() === userAddress.toLowerCase());

  const handleBuyClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (onBuy) {
      onBuy(domain);
    }
  }, [domain, onBuy]);

  const handleOfferClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (onOffer) {
      onOffer(domain);
    }
  }, [domain, onOffer]);

  const handleListClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (onList) {
      onList(domain);
    }
  }, [domain, onList]);

  const handleCancelListingClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    if (onCancelListing) {
      onCancelListing(domain);
    }
  }, [domain, onCancelListing]);

  const handleWatchClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWatch) {
      onWatch(domain);
    }
  }, [domain, onWatch]);

  // Calculate USD value (using a rough ETH price estimate)
  const getUSDValue = useCallback((ethPrice: string, decimals: number) => {
    const ethValue = parseFloat(ethPrice) / Math.pow(10, decimals);
    const usdValue = ethValue * 2500; // Rough ETH price estimate
    return usdValue.toFixed(2);
  }, []);


  return (
    <div
      className="flex flex-col transition-all duration-300 w-full max-w-sm group hover:scale-105 bg-gray-900/50 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-gray-800/50 cursor-pointer"
      style={{
        minHeight: '280px',
        padding: '20px 16px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick?.(domain)}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <DomainAvatar
            domain={domain.name}
            className="w-8 h-8 flex-shrink-0"
            size={32}
          />
          <div className="flex-1 min-w-0">
            <h3
              className="font-bold truncate font-space-mono"
              style={{
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '120%',
                letterSpacing: '0%'
              }}
              title={domain.name}
            >
              {(() => {
                const parts = domain.name.split('.');
                const name = parts[0];
                const tld = parts[1] || '';
                const maxNameLength = 12;

                if (domain.name.length <= 18) {
                  return (
                    <>
                      <span className="text-white">{name}</span>
                      <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                    </>
                  );
                }

                if (name.length > maxNameLength) {
                  return (
                    <>
                      <span className="text-white">{name.substring(0, maxNameLength)}...</span>
                      <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                    </>
                  );
                }

                return (
                  <>
                    <span className="text-white">{name}</span>
                    <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                  </>
                );
              })()}
            </h3>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          {isListed ? (
            <>
              <p className="text-white text-sm font-semibold">
                {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
              </p>
              <p className="text-gray-400 text-xs">Listed</p>
            </>
          ) : (
            <>
              <p className="text-white text-sm font-semibold">
                {isOwned ? 'Owned' : 'Available'}
              </p>
              <p className="text-gray-400 text-xs">
                {isOwned ? 'Offer' : 'Claim'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <span
              className="text-white text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#1689DB3B' }}
            >
              {domain.name.split('.')[0].length} char
            </span>
            {token && (
              <span
                className="text-white text-xs px-2 py-1 rounded"
                style={{ backgroundColor: getTldColor(tld) + '3B' }}
              >
                {token.networkId ? token.networkId.split(':')[1] : 'Chain'}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs truncate">
            {isOwned ? `Owner: ${domain.claimedBy?.split(':')[2]?.substring(0, 6)}...` : 'Available'}
          </p>
          {domain.expiresAt && (
            <p className="text-gray-400 text-xs">
              Expires: {formatDistanceToNow(new Date(domain.expiresAt), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          {isOwnedByUser ? (
            // Buttons for domains owned by the current user
            <div className="flex space-x-2">
              {isListed ? (
                <button
                  onClick={handleCancelListingClick}
                  className="text-white hover:opacity-90 transition-opacity font-medium text-xs w-full"
                  style={{
                    height: '32px',
                    borderRadius: '16px',
                    opacity: 1,
                    padding: '6px 12px',
                    backgroundColor: '#EF4444'
                  }}
                >
                  Cancel Listing
                </button>
              ) : (
                <button
                  onClick={handleListClick}
                  className="text-white hover:opacity-90 transition-opacity font-medium text-xs w-full"
                  style={{
                    height: '32px',
                    borderRadius: '16px',
                    opacity: 1,
                    padding: '6px 12px',
                    backgroundColor: '#10B981'
                  }}
                >
                  List Domain
                </button>
              )}
            </div>
          ) : (
            // Buttons for domains not owned by the current user
            <>
              {isListed ? (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBuyClick}
                    className="text-white hover:opacity-90 transition-opacity font-medium text-xs flex-1"
                    style={{
                      height: '32px',
                      borderRadius: '16px',
                      opacity: 1,
                      padding: '6px 12px',
                      backgroundColor: '#773BAC'
                    }}
                  >
                    Buy
                  </button>
                  <button
                    onClick={handleOfferClick}
                    className="text-white hover:bg-white/10 transition-colors font-medium text-xs flex-1"
                    style={{
                      height: '32px',
                      borderRadius: '16px',
                      borderWidth: '1px',
                      opacity: 1,
                      padding: '6px 12px',
                      border: '1px solid #FFFFFF',
                      backgroundColor: 'transparent'
                    }}
                  >
                    Offer
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOfferClick}
                  className="text-white hover:opacity-90 transition-opacity font-medium text-xs w-full"
                  style={{
                    height: '32px',
                    borderRadius: '16px',
                    opacity: 1,
                    padding: '6px 12px',
                    backgroundColor: isOwned ? '#6B7280' : '#773BAC'
                  }}
                >
                  {isOwned ? 'Offer' : 'Claim'}
                </button>
              )}

              {/* Message Button - Only show if not owned by user */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Message button clicked for domain:', domain.name, 'owner:', domain.claimedBy);
                  onMessage?.(domain);
                }}
                className="text-white hover:bg-white/10 transition-colors font-medium text-xs w-full"
                style={{
                  height: '32px',
                  borderRadius: '16px',
                  borderWidth: '1px',
                  opacity: 1,
                  padding: '6px 12px',
                  border: '1px solid #10B981',
                  backgroundColor: 'transparent'
                }}
              >
                💬 Message Owner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DomainCard;