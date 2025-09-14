"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { formatUnits } from "viem";
import { Name } from "@/types/doma";

interface DomainCardProps {
  domain: Name;
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  onMessage?: (domain: Name) => void;
  onBuy?: (domain: Name) => void;
  onOffer?: (domain: Name) => void;
  userAddress?: string;
}

const DomainCard = ({ 
  domain, 
  formatPrice, 
  getTldColor, 
  onMessage, 
  onBuy, 
  onOffer,
  userAddress
}: DomainCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const token = domain.tokens?.[0];
  const listing = token?.listings?.[0];
  const isListed = !!listing;
  const tld = domain.name.split('.').pop() || '';
  const isOwned = !!domain.claimedBy;
  const isOwnedByUser = userAddress && domain.claimedBy && 
    domain.claimedBy.toLowerCase().includes(userAddress.toLowerCase());

  return (
    <div
      className="flex flex-col justify-between hover:scale-105 transition-all duration-300 w-full max-w-sm group"
      style={{
        height: '189px',
        borderRadius: '30px',
        borderWidth: '1px',
        opacity: 1,
        paddingTop: '20px',
        paddingRight: '16px',
        paddingBottom: '20px',
        paddingLeft: '16px',
        gap: '20px',
        backgroundColor: '#121212',
        border: '1px solid',
        borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
        borderImageSlice: 1
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#EEEFFF29' }}
          >
            <span className="text-white text-xs font-bold">
              {tld.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-bold truncate font-space-mono"
              style={{
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '100%',
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
      
      <div className="flex justify-between items-end">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              className="text-white text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#1689DB3B' }}
            >
              {domain.name.split('.')[0].length} char
            </span>
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
        
        <div className="flex-shrink-0 ml-2">
          <div className="flex flex-col space-y-1">
            {isListed ? (
              <>
                <button 
                  onClick={() => onBuy?.(domain)}
                  className="text-white hover:opacity-90 transition-opacity font-medium text-xs"
                  style={{
                    width: '80px',
                    height: '32px',
                    borderRadius: '16px',
                    opacity: 1,
                    paddingTop: '6px',
                    paddingRight: '12px',
                    paddingBottom: '6px',
                    paddingLeft: '12px',
                    gap: '6px',
                    backgroundColor: '#773BAC'
                  }}
                >
                  Buy
                </button>
                <button 
                  onClick={() => onOffer?.(domain)}
                  className="text-white hover:bg-white/10 transition-colors font-medium text-xs flex items-center justify-center"
                  style={{
                    width: '80px',
                    height: '32px',
                    borderRadius: '16px',
                    borderWidth: '1px',
                    opacity: 1,
                    paddingTop: '6px',
                    paddingRight: '12px',
                    paddingBottom: '6px',
                    paddingLeft: '12px',
                    gap: '6px',
                    border: '1px solid #FFFFFF',
                    backgroundColor: 'transparent'
                  }}
                >
                  Offer
                </button>
              </>
            ) : (
              <button 
                onClick={() => onOffer?.(domain)}
                className="text-white hover:opacity-90 transition-opacity font-medium text-xs"
                style={{
                  width: '80px',
                  height: '32px',
                  borderRadius: '16px',
                  opacity: 1,
                  paddingTop: '6px',
                  paddingRight: '12px',
                  paddingBottom: '6px',
                  paddingLeft: '12px',
                  gap: '6px',
                  backgroundColor: isOwned ? '#6B7280' : '#773BAC'
                }}
              >
                {isOwned ? 'Offer' : 'Claim'}
              </button>
            )}
            
            {/* Message Button - Only show if not owned by user */}
            {!isOwnedByUser && (
              <button 
                onClick={() => onMessage?.(domain)}
                className="text-white hover:bg-white/10 transition-colors font-medium text-xs flex items-center justify-center"
                style={{
                  width: '80px',
                  height: '32px',
                  borderRadius: '16px',
                  borderWidth: '1px',
                  opacity: 1,
                  paddingTop: '6px',
                  paddingRight: '12px',
                  paddingBottom: '6px',
                  paddingLeft: '12px',
                  gap: '6px',
                  border: '1px solid #10B981',
                  backgroundColor: 'transparent'
                }}
              >
                💬 Message
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainCard;
