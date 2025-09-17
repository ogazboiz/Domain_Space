"use client";

import { useState, useEffect, useCallback } from "react";
import { Name } from "@/types/doma";
import { useOrderbook } from "@/hooks/use-orderbook";
import { useHelper } from "@/hooks/use-helper";
import { formatUnits, parseUnits } from "viem";
import {
  CreateOfferParams,
  BuyListingParams,
  CurrencyToken,
  OrderbookType,
} from "@doma-protocol/orderbook-sdk";

interface OfferBuyModalProps {
  domain: Name | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (type: 'buy' | 'offer', result: unknown) => void;
}

export default function OfferBuyModal({
  domain,
  isOpen,
  onClose,
  onSuccess,
}: OfferBuyModalProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'offer'>('buy');
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

  const { formatLargeNumber } = useHelper();

  // Initialize currencies and fees when modal opens
  useEffect(() => {
    if (!isOpen || !domain) return;

    const initializeData = async () => {
      try {
        const domainData = prepareDomainData(domain);

        if (domainData.listings.length > 0) {
          // Get supported currencies
          await getSupportedCurrencies({
            chainId: domainData.chainId,
            orderbook: domainData.listings[0].orderbook as OrderbookType,
            contractAddress: domainData.tokenAddress,
          });

          // Get fees
          await getOrderbookFee({
            chainId: domainData.chainId,
            contractAddress: domainData.tokenAddress,
            orderbook: domainData.listings[0].orderbook as OrderbookType,
          });
        }
      } catch (err) {
        console.error('Failed to initialize modal data:', err);
      }
    };

    initializeData();
  }, [isOpen, domain, prepareDomainData, getSupportedCurrencies, getOrderbookFee]);

  // Set default currency when currencies are loaded
  useEffect(() => {
    if (currencies.length > 0 && !selectedCurrency) {
      setSelectedCurrency(currencies[0]);
    }
  }, [currencies, selectedCurrency]);

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
            console.log(`Step ${index + 1}: ${step.description} - ${step.status}`);
          });
        },
      });

      if (result) {
        onSuccess?.('buy', result);
        onClose();
      }

    } catch (err) {
      console.error('Buy failed:', err);
    }
  }, [domain, prepareDomainData, buyListing, onSuccess, onClose]);

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
        orderbook: OrderbookType.DOMA,
        source: 'domain-space',
        marketplaceFees: fees,
      };

      const result = await createOffer({
        params,
        chainId: domainData.chainId,
        hasWethOffer: selectedCurrency.symbol?.toLowerCase() === 'weth',
        onProgress: (progress) => {
          progress.forEach((step, index) => {
            console.log(`Step ${index + 1}: ${step.description} - ${step.status}`);
          });
        },
      });

      if (result) {
        onSuccess?.('offer', result);
        setOfferAmount('');
        setExpirationDays('7');
        onClose();
      }

    } catch (err) {
      console.error('Offer failed:', err);
    }
  }, [domain, offerAmount, selectedCurrency, expirationDays, prepareDomainData, createOffer, fees, onSuccess, onClose]);

  if (!isOpen || !domain) return null;

  const domainData = prepareDomainData(domain);
  const canBuy = domainData.listings.length > 0;
  const currentPrice = canBuy ? formatUnits(
    BigInt(domainData.listings[0].price),
    domainData.listings[0].currency.decimals
  ) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4 border border-gray-600 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{domain.name}</h3>
            <p className="text-gray-400 text-sm">
              {domain.claimedBy ? 'Owned domain' : 'Available domain'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-gray-700/50 p-1 rounded-xl mb-6">
          {canBuy && (
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
                activeTab === 'buy'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Buy Instant
            </button>
          )}
          <button
            onClick={() => setActiveTab('offer')}
            className={`flex-1 py-2 px-4 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
              activeTab === 'offer'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💰 Make Offer
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-600/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-300 hover:text-red-100 text-xs mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'buy' && canBuy ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-400 mb-2">Current Listing Price</p>
                <p className="text-4xl font-bold text-green-400">
                  {formatLargeNumber(Number(currentPrice))} {domainData.listings[0].currency.symbol}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  ≈ ${(Number(currentPrice) * 2500).toFixed(2)} USD
                </p>
              </div>

              <button
                onClick={handleBuy}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing Purchase...' : `Buy ${domain.name} Now`}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Transaction will require gas fees and may take a few minutes to confirm.
              </p>
            </div>
          ) : activeTab === 'offer' ? (
            <div className="space-y-4">
              {/* Currency Selection */}
              <div className="space-y-2">
                <label className="block text-white font-medium">Currency</label>
                <select
                  value={selectedCurrency?.symbol || ''}
                  onChange={(e) => {
                    const currency = currencies.find(c => c.symbol === e.target.value);
                    setSelectedCurrency(currency || null);
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
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
                <label className="block text-white font-medium">Offer Amount</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder={`Enter amount in ${selectedCurrency?.symbol || 'token'}`}
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="block text-white font-medium">Offer Valid For</label>
                <select
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              {/* Fees Information */}
              {fees.length > 0 && (
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">Marketplace Fees</span>
                  </div>
                  {fees.map((fee, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{fee.feeType}</span>
                      <span className="text-white">
                        {fee.basisPoints ? `${(fee.basisPoints / 100).toFixed(2)}%` : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Offer Summary */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Your Offer:</span>
                  <span className="text-white font-medium">
                    {offerAmount || '0'} {selectedCurrency?.symbol || 'tokens'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Valid Until:</span>
                  <span className="text-white font-medium">
                    {new Date(Date.now() + (parseInt(expirationDays) * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleOffer}
                disabled={isLoading || !offerAmount || !selectedCurrency}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-xl hover:bg-purple-700 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Offer...' : 'Create Offer'}
              </button>

              <p className="text-gray-500 text-xs text-center">
                Your offer will be visible to the domain owner and can be accepted at any time before expiration.
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">This domain is not available for instant purchase.</p>
              <p className="text-gray-500 text-sm mt-2">You can still make an offer to the owner.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}