"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { parseUnits } from "viem";
import { Name } from "@/types/doma";
import { useOrderbook } from "@/hooks/use-orderbook";
import {
  CreateOfferParams,
  BuyListingParams,
  CurrencyToken,
} from "@doma-protocol/orderbook-sdk";

interface DomainCardProps {
  domain: Name;
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  onMessage?: (domain: Name) => void;
  onTransactionSuccess?: (type: 'buy' | 'offer', domain: Name, result: any) => void;
  userAddress?: string;
}

const DomainCard = ({
  domain,
  formatPrice,
  getTldColor,
  onMessage,
  onTransactionSuccess,
  userAddress
}: DomainCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'offer' | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyToken | null>(null);

  const {
    buyListing,
    createOffer,
    getSupportedCurrencies,
    getOrderbookFee,
    prepareDomainData,
    isLoading,
    error,
    currencies,
    fees,
    clearError,
  } = useOrderbook();
  
  const token = domain.tokens?.[0];
  const listing = token?.listings?.[0];
  const isListed = !!listing;
  const tld = domain.name.split('.').pop() || '';
  const isOwned = !!domain.claimedBy;
  const isOwnedByUser = userAddress && domain.claimedBy &&
    domain.claimedBy.toLowerCase().includes(userAddress.toLowerCase());

  // Initialize currencies when expanded for offers
  useEffect(() => {
    if (isExpanded && transactionType === 'offer') {
      const initializeOfferData = async () => {
        try {
          const domainData = prepareDomainData(domain);

          if (domainData.listings.length > 0) {
            await getSupportedCurrencies({
              chainId: domainData.chainId,
              orderbook: domainData.listings[0].orderbook,
              contractAddress: domainData.tokenAddress,
            });

            await getOrderbookFee({
              chainId: domainData.chainId,
              contractAddress: domainData.tokenAddress,
              orderbook: domainData.listings[0].orderbook,
            });
          }
        } catch (err) {
          console.error('Failed to initialize offer data:', err);
        }
      };

      initializeOfferData();
    }
  }, [isExpanded, transactionType, domain, prepareDomainData, getSupportedCurrencies, getOrderbookFee]);

  // Set default currency
  useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      setSelectedCurrency(currencies[0]);
    }
  }, [currencies, selectedCurrency]);

  const handleBuyClick = useCallback(() => {
    setTransactionType('buy');
    setIsExpanded(true);
  }, []);

  const handleOfferClick = useCallback(() => {
    setTransactionType('offer');
    setIsExpanded(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsExpanded(false);
    setTransactionType(null);
    setOfferAmount('');
    setExpirationDays('7');
    clearError();
  }, [clearError]);

  const handleBuy = useCallback(async () => {
    if (!domain) return;

    try {
      const domainData = prepareDomainData(domain);

      if (!domainData.listings.length) {
        alert('This domain is not available for instant purchase.');
        return;
      }

      const params: BuyListingParams = {
        orderId: domainData.listings[0].externalId,
      };

      const result = await buyListing({
        params,
        chainId: domainData.chainId,
        onProgress: (progress) => {
          progress.forEach((step, index) => {
            console.log(`Buy Step ${index + 1}: ${step.description} - ${step.status}`);
          });
        },
      });

      if (result) {
        onTransactionSuccess?.('buy', domain, result);
        handleCancel();
      }

    } catch (err) {
      console.error('Buy failed:', err);
    }
  }, [domain, prepareDomainData, buyListing, onTransactionSuccess, handleCancel]);

  const handleOffer = useCallback(async () => {
    if (!domain || !offerAmount || !selectedCurrency) {
      alert('Please fill in all offer details.');
      return;
    }

    try {
      const domainData = prepareDomainData(domain);
      const durationMs = Number(expirationDays) * 24 * 60 * 60 * 1000;

      const params: CreateOfferParams = {
        items: [
          {
            contract: domainData.tokenAddress,
            tokenId: domainData.tokenId,
            price: parseUnits(offerAmount, selectedCurrency.decimals).toString(),
            currencyContractAddress: selectedCurrency.contractAddress!,
            duration: durationMs,
          },
        ],
        orderbook: 'doma',
        source: 'domain-space',
        marketplaceFees: fees,
      };

      const result = await createOffer({
        params,
        chainId: domainData.chainId,
        hasWethOffer: selectedCurrency.symbol?.toLowerCase() === 'weth',
        onProgress: (progress) => {
          progress.forEach((step, index) => {
            console.log(`Offer Step ${index + 1}: ${step.description} - ${step.status}`);
          });
        },
      });

      if (result) {
        onTransactionSuccess?.('offer', domain, result);
        handleCancel();
      }

    } catch (err) {
      console.error('Offer failed:', err);
    }
  }, [domain, offerAmount, selectedCurrency, expirationDays, prepareDomainData, createOffer, fees, onTransactionSuccess, handleCancel]);

  return (
    <div
      className={`flex flex-col transition-all duration-300 w-full max-w-sm group ${
        isExpanded ? 'transform scale-105' : 'hover:scale-105'
      }`}
      style={{
        minHeight: isExpanded ? 'auto' : '220px',
        borderRadius: '30px',
        borderWidth: '1px',
        opacity: 1,
        padding: '20px 16px',
        backgroundColor: '#121212',
        border: '1px solid',
        borderImage: isExpanded
          ? 'linear-gradient(135deg, #773BAC 0%, #10B981 100%)'
          : 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
        borderImageSlice: 1
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-4">
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
        
        {/* Action Buttons or Expanded Form */}
        {!isExpanded ? (
          <div className="flex flex-col space-y-2">
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
            {!isOwnedByUser && (
              <button
                onClick={() => {
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
            )}
          </div>
        ) : (
          // Expanded Transaction Form
          <div className="space-y-4 mt-4 border-t border-gray-600 pt-4">
            {error && (
              <div className="p-3 bg-red-600/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {transactionType === 'buy' ? (
              // Buy Form
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-center">💳 Buy {domain.name}</h4>

                {isListed && (
                  <div className="text-center p-4 bg-green-600/10 rounded-lg border border-green-500/30">
                    <p className="text-gray-400 text-sm mb-1">Instant Buy Price</p>
                    <p className="text-green-400 text-2xl font-bold">
                      {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                    </p>
                    <p className="text-gray-500 text-xs">
                      ≈ ${(Number(formatPrice(listing.price, listing.currency.decimals)) * 2500).toFixed(2)} USD
                    </p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleBuy}
                    disabled={isLoading || !isListed}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Processing...' : 'Confirm Purchase'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              // Offer Form
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-center">💰 Make Offer for {domain.name}</h4>

                {/* Currency Selection */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Currency</label>
                  <select
                    value={selectedCurrency?.symbol || ''}
                    onChange={(e) => {
                      const currency = currencies.find(c => c.symbol === e.target.value);
                      setSelectedCurrency(currency || null);
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                  >
                    {currencies.map((currency) => (
                      <option key={currency.symbol} value={currency.symbol}>
                        {currency.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Offer Amount */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Offer Amount</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder={`Enter amount in ${selectedCurrency?.symbol || 'tokens'}`}
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">Valid For</label>
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-400"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>

                {/* Offer Summary */}
                {offerAmount && (
                  <div className="p-3 bg-purple-600/10 rounded-lg border border-purple-500/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Your Offer:</span>
                      <span className="text-white font-medium">
                        {offerAmount} {selectedCurrency?.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-400">Expires:</span>
                      <span className="text-white font-medium">
                        {new Date(Date.now() + (parseInt(expirationDays) * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={handleOffer}
                    disabled={isLoading || !offerAmount || !selectedCurrency}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {isLoading ? 'Creating...' : 'Create Offer'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Message Button in Expanded State */}
            {!isOwnedByUser && (
              <button
                onClick={() => {
                  onMessage?.(domain);
                  handleCancel();
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
                💬 Message Owner Instead
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainCard;
