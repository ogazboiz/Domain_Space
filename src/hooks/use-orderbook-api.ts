import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { viemToEthersSigner } from '@doma-protocol/orderbook-sdk';
import { Name } from '@/types/doma';

interface CurrencyToken {
  symbol: string;
  decimals: number;
  contractAddress: string;
}

interface OrderbookFee {
  feeType: string;
  basisPoints: number;
}

interface CreateOfferParams {
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
}

export const useOrderbookAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyToken[]>([]);
  const [fees, setFees] = useState<OrderbookFee[]>([]);

  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const clearError = useCallback(() => setError(null), []);

  // Get supported currencies using the API
  const getSupportedCurrencies = useCallback(async (params: {
    chainId: string;
    orderbook: string;
    contractAddress: string;
  }) => {
    try {
      const response = await fetch(
        `https://api-testnet.doma.xyz/v1/orderbook/currencies/${params.chainId}/${params.contractAddress}/${params.orderbook}`,
        {
          headers: {
            'Api-Key': process.env.NEXT_PUBLIC_DOMA_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const filteredCurrencies = result.currencies.filter((c: CurrencyToken) => c.contractAddress);
      setCurrencies(filteredCurrencies);
      return result;
    } catch (err: unknown) {
      console.error('Failed to get currencies:', err);
      setError((err as Error)?.message || 'Failed to get supported currencies');
      return { currencies: [] };
    }
  }, []);

  // Get orderbook fees using the API
  const getOrderbookFee = useCallback(async (params: {
    chainId: string;
    contractAddress: string;
    orderbook: string;
  }) => {
    try {
      const response = await fetch(
        `https://api-testnet.doma.xyz/v1/orderbook/fee/${params.orderbook}/${params.chainId}/${params.contractAddress}`,
        {
          headers: {
            'Api-Key': process.env.NEXT_PUBLIC_DOMA_API_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setFees(result.marketplaceFees || []);
      return result;
    } catch (err: unknown) {
      console.error('Failed to get fees:', err);
      setError((err as Error)?.message || 'Failed to get orderbook fees');
      return { marketplaceFees: [] };
    }
  }, []);

  // Create offer using the API
  const createOffer = useCallback(async (params: {
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
      const signer = viemToEthersSigner(walletClient, params.chainId as `eip155:${number}`);


      // Step 1: Generate the order parameters using Seaport/OrderBook SDK
      // This would require integrating with Seaport to create the proper order structure

      // For now, I'll simulate the API call structure based on the docs
      const orderParameters = {
        offerer: address,
        zone: '0x0000000000000000000000000000000000000000', // Default zone
        orderType: 0, // FULL_OPEN
        startTime: Math.floor(Date.now() / 1000).toString(),
        endTime: Math.floor((Date.now() + params.items[0].duration) / 1000).toString(),
        zoneHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
        salt: Math.floor(Math.random() * 1000000).toString(),
        offer: [
          {
            itemType: 1, // ERC20
            token: params.items[0].currencyContractAddress,
            identifierOrCriteria: '0',
            startAmount: params.items[0].price,
            endAmount: params.items[0].price,
          }
        ],
        consideration: [
          {
            itemType: 2, // ERC721
            token: params.items[0].contract,
            identifierOrCriteria: params.items[0].tokenId,
            startAmount: '1',
            endAmount: '1',
            recipient: address,
          },
          // Add marketplace fees to consideration
          ...params.marketplaceFees.map(fee => ({
            itemType: 1, // ERC20
            token: params.items[0].currencyContractAddress,
            identifierOrCriteria: '0',
            startAmount: Math.floor(parseInt(params.items[0].price) * fee.basisPoints / 10000).toString(),
            endAmount: Math.floor(parseInt(params.items[0].price) * fee.basisPoints / 10000).toString(),
            recipient: '0x0000000000000000000000000000000000000000', // Fee recipient
          }))
        ],
        totalOriginalConsiderationItems: 1 + params.marketplaceFees.length,
        conduitKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
        counter: '0',
      };

      // Step 2: Sign the order (this would need proper EIP-712 signing)
      const signature = await signer.signMessage('Order signature placeholder');

      // Step 3: Submit to API
      const response = await fetch('https://api-testnet.doma.xyz/v1/orderbook/offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': process.env.NEXT_PUBLIC_DOMA_API_KEY || '',
        },
        body: JSON.stringify({
          orderbook: params.orderbook,
          chainId: params.chainId,
          parameters: orderParameters,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      params.onProgress?.([
        { description: 'Order signed', status: 'completed' },
        { description: 'Offer submitted to marketplace', status: 'completed' },
      ]);

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

  // Helper function to prepare domain for buy/offer operations
  const prepareDomainData = useCallback((domain: Name) => {
    const token = domain.tokens?.[0];
    if (!token) {
      throw new Error('Domain token data not found');
    }

    return {
      tokenAddress: token.tokenAddress,
      tokenId: token.tokenId,
      chainId: token.chain?.networkId || 'eip155:97476',
      listings: token.listings || []
    };
  }, []);

  return {
    // Actions
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