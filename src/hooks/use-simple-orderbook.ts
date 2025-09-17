import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { Name } from '@/types/doma';

export interface CurrencyToken {
  symbol: string;
  decimals: number;
  contractAddress: string;
}

export interface OrderbookFee {
  feeType: string;
  basisPoints: number;
}

export const useSimpleOrderbook = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyToken[]>([]);
  const [fees, setFees] = useState<OrderbookFee[]>([]);

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const clearError = useCallback(() => setError(null), []);

  // Mock supported currencies for now
  const getSupportedCurrencies = useCallback(async (params: unknown) => {
    try {
      // Simulate supported currencies
      const mockCurrencies: CurrencyToken[] = [
        {
          symbol: 'ETH',
          decimals: 18,
          contractAddress: '0x0000000000000000000000000000000000000000'
        },
        {
          symbol: 'WETH',
          decimals: 18,
          contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
        }
      ];

      setCurrencies(mockCurrencies);
      return { currencies: mockCurrencies };
    } catch (err: unknown) {
      console.error('Failed to get currencies:', err);
      setError((err as Error)?.message || 'Failed to get supported currencies');
      return { currencies: [] };
    }
  }, []);

  // Mock orderbook fees
  const getOrderbookFee = useCallback(async (params: unknown) => {
    try {
      const mockFees: OrderbookFee[] = [
        {
          feeType: 'marketplace',
          basisPoints: 250 // 2.5%
        }
      ];

      setFees(mockFees);
      return { marketplaceFees: mockFees };
    } catch (err: unknown) {
      console.error('Failed to get fees:', err);
      setError((err as Error)?.message || 'Failed to get orderbook fees');
      return { marketplaceFees: [] };
    }
  }, []);

  // Simplified create offer that just simulates the process
  const createOffer = useCallback(async (params: {
    params: {
      items: Array<{
        contract: string;
        tokenId: string;
        price: string;
        currencyContractAddress: string;
        duration: number;
      }>;
      orderbook: string;
      source: string;
      marketplaceFees: OrderbookFee[];
    };
    chainId: string;
    hasWethOffer?: boolean;
    onProgress?: (progress: unknown[]) => void;
  }) => {
    if (!address || !walletClient) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 Creating offer (simplified):', params);

      // Simulate progress
      params.onProgress?.([
        { description: 'Preparing offer...', status: 'in_progress' }
      ]);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      params.onProgress?.([
        { description: 'Preparing offer...', status: 'completed' },
        { description: 'Signing transaction...', status: 'in_progress' }
      ]);

      // Simulate signing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      params.onProgress?.([
        { description: 'Preparing offer...', status: 'completed' },
        { description: 'Signing transaction...', status: 'completed' },
        { description: 'Submitting to marketplace...', status: 'in_progress' }
      ]);

      // Simulate submission delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      params.onProgress?.([
        { description: 'Preparing offer...', status: 'completed' },
        { description: 'Signing transaction...', status: 'completed' },
        { description: 'Submitting to marketplace...', status: 'completed' }
      ]);

      // Mock successful result
      const result = {
        orderId: `offer_${Date.now()}`,
        success: true,
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
      };

      console.log('✅ Offer created successfully (simulated):', result);
      return result;

    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Failed to create offer';
      console.error('❌ Offer creation failed:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient]);

  // Simplified buy listing
  const buyListing = useCallback(async (params: {
    params: {
      orderId: string;
    };
    chainId: string;
    onProgress?: (progress: unknown[]) => void;
  }) => {
    if (!address || !walletClient) {
      setError('Please connect your wallet');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🛒 Buying listing (simplified):', params);

      // Simulate progress
      params.onProgress?.([
        { description: 'Preparing purchase...', status: 'in_progress' }
      ]);

      await new Promise(resolve => setTimeout(resolve, 1000));

      params.onProgress?.([
        { description: 'Preparing purchase...', status: 'completed' },
        { description: 'Confirming transaction...', status: 'in_progress' }
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      params.onProgress?.([
        { description: 'Preparing purchase...', status: 'completed' },
        { description: 'Confirming transaction...', status: 'completed' }
      ]);

      const result = {
        transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
        success: true
      };

      console.log('✅ Purchase successful (simulated):', result);
      return result;

    } catch (err: unknown) {
      const errorMessage = (err as Error)?.message || 'Failed to buy listing';
      console.error('❌ Purchase failed:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient]);

  // Helper function to prepare domain data
  const prepareDomainData = useCallback((domain: Name) => {
    const token = domain.tokens?.[0];
    if (!token) {
      throw new Error('Domain token data not found');
    }

    return {
      tokenAddress: token.tokenAddress,
      tokenId: token.tokenId,
      chainId: token.chain?.networkId || 'eip155:97476',
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