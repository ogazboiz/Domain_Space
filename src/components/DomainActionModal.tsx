/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { parseUnits } from "viem";
import { Name } from "@/types/doma";
import { useOrderbook } from "@/hooks/use-orderbook";
import { useWalletClient } from "wagmi";
import { viemToEthersSigner, type CurrencyToken, type CreateOfferParams, type BuyListingParams, type OrderbookFee, OrderbookType } from "@doma-protocol/orderbook-sdk";
import { toast } from "sonner";
import { useHelper } from "@/hooks/use-helper";
import { DomainAvatar } from '@/components/ui/DomainAvatar';

interface DomainActionModalProps {
  domain: Name;
  isOpen: boolean;
  onClose: () => void;
  onTransactionSuccess: (type: 'buy' | 'offer', domain: Name, result?: unknown) => void;
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  userAddress?: string;
}

export default function DomainActionModal({
  domain,
  isOpen,
  onClose,
  onTransactionSuccess,
  formatPrice,
  getTldColor,
  userAddress
}: DomainActionModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'offer' | 'buy' | 'message'>('details');
  const [offerAmount, setOfferAmount] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyToken | undefined>(undefined);
  const [currencies, setCurrencies] = useState<CurrencyToken[]>([]);
  const [fees, setFees] = useState<OrderbookFee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: walletClient } = useWalletClient();
  const { parseCAIP10 } = useHelper();
  const { createOffer, buyListing, getSupportedCurrencies, getOrderbookFee } = useOrderbook();

  // Initialize currencies when modal opens
  useEffect(() => {
    if (isOpen && domain && activeTab === 'offer') {
      const initializeCurrencies = async () => {
        const token = domain.tokens?.[0];
        if (!token) return;

        try {
          const chainId = (token.networkId || 'eip155:97476') as `eip155:${number}`;
          const orderbook = OrderbookType.DOMA;

          const supportedCurrencies = await getSupportedCurrencies({
            chainId,
            orderbook,
            contractAddress: token.tokenAddress,
          });

          const result = supportedCurrencies.currencies.filter(
            (c: CurrencyToken) => c.contractAddress
          );

          setCurrencies(result);
          if (result.length) {
            setSelectedCurrency(result[0]);
          }

          const feeResult = await getOrderbookFee({
            chainId,
            contractAddress: token.tokenAddress,
            orderbook,
          });

          setFees(feeResult.marketplaceFees);
        } catch (err) {
          console.error('Failed to initialize currencies:', err);
          // Fallback currencies
          const mockCurrencies: CurrencyToken[] = [
            {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
              contractAddress: '0x0000000000000000000000000000000000000000',
              type: 'native' as any,
              nativeWrapper: false
            },
            {
              name: 'Wrapped Ethereum',
              symbol: 'WETH',
              decimals: 18,
              contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
              type: 'erc20' as any,
              nativeWrapper: false
            }
          ];
          setCurrencies(mockCurrencies);
          setSelectedCurrency(mockCurrencies[0]);
        }
      };

      initializeCurrencies();
    }
  }, [isOpen, domain, activeTab, getSupportedCurrencies, getOrderbookFee]);

  const handleCreateOffer = async () => {
    if (!domain || !walletClient || !selectedCurrency || !offerAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const token = domain.tokens?.[0];
    if (!token) return;

    try {
      setIsLoading(true);

      const chainId = (token.networkId || 'eip155:97476') as `eip155:${number}`;
      await walletClient.switchChain({
        id: Number(parseCAIP10(chainId).chainId),
      });

      const durationMs = Number(expirationDays) * 24 * 3600 * 1000;

      const params: CreateOfferParams = {
        items: [
          {
            contract: token.tokenAddress,
            tokenId: token.tokenId,
            price: parseUnits(offerAmount, selectedCurrency.decimals).toString(),
            currencyContractAddress: selectedCurrency.contractAddress,
            duration: durationMs,
          },
        ],
        orderbook: OrderbookType.DOMA,
        source: "domain-marketplace",
        marketplaceFees: fees,
      };

      const createdOffer = await createOffer({
        params,
        chainId,
        signer: viemToEthersSigner(walletClient, chainId),
        currencies: currencies,
        onProgress: (progress: any) => {
          progress.forEach((step: any, index: any) => {
            toast(step.description, {
              id: `create_offer_${domain.name}_step_${index}`,
            });
          });
        },
        hasWethOffer: selectedCurrency?.symbol?.toLowerCase() === "weth",
      });

      toast.success('Offer created successfully!');
      onTransactionSuccess('offer', domain, createdOffer);

    } catch (error) {
      console.error('Offer creation failed:', error);
      toast.error((error as Error)?.message || 'Offer creation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyDomain = async () => {
    if (!domain || !walletClient) return;

    const token = domain.tokens?.[0];
    const listing = token?.listings?.[0] ? {
      externalId: token.listings[0].externalId,
      price: token.listings[0].price,
    } : null;

    if (!token || !listing) return;

    try {
      setIsLoading(true);

      const chainId = (token.networkId || 'eip155:97476') as `eip155:${number}`;
      await walletClient.switchChain({
        id: Number(parseCAIP10(chainId).chainId),
      });

      const params: BuyListingParams = {
        orderId: listing.externalId,
      };

      await buyListing({
        params,
        chainId,
        signer: viemToEthersSigner(walletClient, chainId),
        onProgress: (progress) => {
          progress.forEach((step, index) => {
            toast(step.description, {
              id: `buy_${token.tokenId}_step_${index}`,
            });
          });
        },
      });

      toast.success('Domain purchased successfully!');
      onTransactionSuccess('buy', domain);

    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error((error as Error)?.message || 'Purchase failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessage = () => {
    if (!domain.claimedBy) {
      toast.error("This domain is not owned by anyone yet.");
      return;
    }

    const ownerAddress = domain.claimedBy.split(':')[2];
    if (!ownerAddress) {
      toast.error("Invalid owner address format.");
      return;
    }

    // Open messaging - you could implement this to redirect to chat page
    window.location.href = `/chat?address=${ownerAddress}`;
  };

  if (!isOpen) return null;

  const tld = domain.name.split('.').pop() || '';
  const domainPrice = domain.tokens?.[0]?.listings?.[0]?.price;
  const isOwned = !!domain.claimedBy;
  const isOwnedByUser = userAddress && domain.claimedBy &&
    domain.claimedBy.split(':')[2]?.toLowerCase() === userAddress.toLowerCase();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <DomainAvatar
                domain={domain.name}
                className="w-16 h-16"
                size={64}
              />
              <div>
                <h2 className="text-2xl font-bold text-white">{domain.name}</h2>
                <p className="text-gray-400">
                  {isOwned ? 'Owned Domain' : 'Available Domain'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'details', label: '📋 Details', enabled: true },
            { id: 'offer', label: '💰 Make Offer', enabled: isOwned && !isOwnedByUser },
            { id: 'buy', label: '🛒 Buy Now', enabled: !!domainPrice && !isOwnedByUser },
            { id: 'message', label: '💬 Message', enabled: isOwned && !isOwnedByUser }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.enabled && setActiveTab(tab.id as 'buy' | 'offer')}
              disabled={!tab.enabled}
              className={`flex-1 py-4 px-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-600/10'
                  : tab.enabled
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">Length</h4>
                  <div className="text-2xl font-bold text-white">
                    {domain.name.split('.')[0].length} chars
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-sm text-gray-400 mb-2">TLD</h4>
                  <div className="text-2xl font-bold text-white">.{tld}</div>
                </div>
              </div>

              {domainPrice && (
                <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-white mb-2">Current Price</h4>
                  <div className="text-3xl font-bold text-green-400">
                    {formatPrice(domainPrice, 18)} ETH
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    ≈ ${(Number(formatPrice(domainPrice, 18)) * 2500).toFixed(2)} USD
                  </p>
                </div>
              )}

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-white mb-3">Domain Info</h4>
                {isOwnedByUser && (
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400">✓</span>
                      <span className="text-green-400 font-medium">You own this domain</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">
                      Use the domain details page to list this domain for sale.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={isOwned ? "text-orange-400" : "text-green-400"}>
                      {isOwned ? 'Owned' : 'Available'}
                    </span>
                  </div>
                  {isOwned && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Owner</span>
                      <span className="text-gray-300 font-mono text-sm">
                        {isOwnedByUser ? 'You' : `${domain.claimedBy?.split(':')[2]?.slice(0, 6)}...${domain.claimedBy?.split(':')[2]?.slice(-4)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Chain</span>
                    <span className="text-blue-400">
                      {domain.tokens?.[0]?.networkId ? parseCAIP10(domain.tokens[0].networkId).chainId : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offer' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-medium text-white mb-3">Current Market Info</h3>
                {domainPrice ? (
                  <div className="text-green-400 text-lg font-semibold">
                    Listed: {formatPrice(domainPrice, 18)} ETH
                  </div>
                ) : (
                  <p className="text-gray-400">No current listing</p>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Currency</label>
                  <select
                    value={selectedCurrency?.symbol || ''}
                    onChange={(e) => {
                      const currency = currencies.find(c => c.symbol === e.target.value);
                      setSelectedCurrency(currency);
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-purple-400"
                  >
                    {currencies.length === 0 ? (
                      <option value="">Loading...</option>
                    ) : (
                      <>
                        <option value="">Select currency</option>
                        {currencies.map((currency) => (
                          <option key={currency.symbol} value={currency.symbol}>
                            {currency.symbol}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Offer Amount</label>
                  <input
                    type="number"
                    step="0.001"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder={`Amount in ${selectedCurrency?.symbol || 'tokens'}`}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Valid For</label>
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="1">1 Day</option>
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>

                <button
                  onClick={handleCreateOffer}
                  disabled={isLoading || !offerAmount || !selectedCurrency}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Creating Offer...' : '🚀 Create Offer'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'buy' && domainPrice && (
            <div className="space-y-6">
              <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-white mb-2">Instant Purchase</h3>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {formatPrice(domainPrice, 18)} ETH
                </div>
                <p className="text-gray-400 text-sm">
                  ≈ ${(Number(formatPrice(domainPrice, 18)) * 2500).toFixed(2)} USD
                </p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">What you get:</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Full ownership of {domain.name}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Instant transfer to your wallet
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    All associated rights and privileges
                  </li>
                </ul>
              </div>

              <button
                onClick={handleBuyDomain}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Processing...' : '💳 Buy Now'}
              </button>
            </div>
          )}

          {activeTab === 'message' && (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="font-medium text-white mb-3">💬 Contact Owner</h3>
                <p className="text-gray-400 mb-4">
                  Start a conversation about {domain.name} with the current owner
                </p>
                <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-300">
                    <strong>Owner:</strong> {domain.claimedBy?.split(':')[2]?.slice(0, 6)}...{domain.claimedBy?.split(':')[2]?.slice(-4)}
                  </p>
                </div>
              </div>

              <button
                onClick={handleMessage}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                💬 Open XMTP Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}