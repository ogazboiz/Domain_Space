import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import {
  DomaOrderbookSDK,
  type CreateOfferParams,
  type BuyListingParams,
  type OrderbookResult,
  type CurrencyToken,
  type OrderbookFee,
  type GetSupportedCurrenciesRequest,
  type GetOrderbookFeeRequest,
  viemToEthersSigner,
  type OnProgressCallback
} from '@doma-protocol/orderbook-sdk';
import { domaConfig } from '@/configs/doma';
import { Name } from '@/types/doma';
import { parseUnits } from 'viem';

export const useOrderbook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyToken[]>([]);
  const [fees, setFees] = useState<OrderbookFee[]>([]);

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const clearError = useCallback(() => setError(null), []);

  // Initialize SDK
  const getSDK = useCallback(() => {
    return new DomaOrderbookSDK(domaConfig);
  }, []);

  // Get supported currencies
  const getSupportedCurrencies = useCallback(async (params: GetSupportedCurrenciesRequest) => {
    try {
      const sdk = getSDK();
      const result = await sdk.getSupportedCurrencies(params);
      setCurrencies(result.currencies.filter(c => c.contractAddress));
      return result;
    } catch (err: any) {
      console.error('Failed to get currencies:', err);
      setError(err?.message || 'Failed to get supported currencies');
      return { currencies: [] };
    }
  }, [getSDK]);

  // Get orderbook fees
  const getOrderbookFee = useCallback(async (params: GetOrderbookFeeRequest) => {
    try {
      const sdk = getSDK();
      const result = await sdk.getOrderbookFee(params);
      setFees(result.marketplaceFees || []);
      return result;
    } catch (err: any) {
      console.error('Failed to get fees:', err);
      setError(err?.message || 'Failed to get orderbook fees');
      return { marketplaceFees: [] };
    }
  }, [getSDK]);

  // Buy listing instantly
  const buyListing = useCallback(async ({
    params,
    chainId,
    onProgress
  }: {
    params: BuyListingParams;
    chainId: string;
    onProgress?: OnProgressCallback;
  }): Promise<OrderbookResult | null> => {
    if (!address || !walletClient) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sdk = getSDK();
      const signer = viemToEthersSigner(walletClient, chainId);

      console.log('🛒 Buying listing:', params);

      const result = await sdk.buyListing({
        params,
        signer,
        chainId,
        onProgress: onProgress || (() => {})
      });

      console.log('✅ Purchase successful:', result);
      return result;

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to buy listing';
      console.error('❌ Purchase failed:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient, getSDK]);

  // Create offer
  const createOffer = useCallback(async ({
    params,
    chainId,
    onProgress,
    hasWethOffer = false
  }: {
    params: CreateOfferParams;
    chainId: string;
    onProgress?: OnProgressCallback;
    hasWethOffer?: boolean;
  }): Promise<OrderbookResult | null> => {
    if (!address || !walletClient) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sdk = getSDK();
      const signer = viemToEthersSigner(walletClient, chainId);

      console.log('💰 Creating offer:', params);

      const result = await sdk.createOffer({
        params,
        signer,
        chainId,
        onProgress: onProgress || (() => {})
      });

      console.log('✅ Offer created successfully:', result);
      return result;

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create offer';
      console.error('❌ Offer creation failed:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient, getSDK]);

  // Helper function to prepare domain for buy/offer operations
  const prepareDomainData = useCallback((domain: Name) => {
    // Extract token data from domain
    const token = domain.tokens?.[0];
    if (!token) {
      throw new Error('Domain token data not found');
    }

    return {
      tokenAddress: token.tokenAddress,
      tokenId: token.tokenId,
      chainId: token.chain?.networkId || 'eip155:97476', // Default to Doma testnet
      listings: domain.listingPrice ? [{
        externalId: domain.id || '',
        price: domain.listingPrice,
        currency: {
          decimals: domain.listingPriceDecimals || 18,
          symbol: 'ETH'
        },
        orderbook: 'doma' as const
      }] : []
    };
  }, []);

  return {
    // Actions
    buyListing,
    createOffer,
    getSupportedCurrencies,
    getOrderbookFee,
    prepareDomainData,

    // State
    isLoading,
    error,
    currencies,
    fees,
    clearError,

    // Utilities
    isWalletConnected: !!address,
  };
};