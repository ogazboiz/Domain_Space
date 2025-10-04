"use client";

import { useState, useEffect } from "react";
import { Name } from "@/types/doma";
import { useOrderbook } from "@/hooks/use-orderbook";
import { parseUnits } from "viem";
import { X } from "lucide-react";
import { useWalletClient } from "wagmi";
import {
  CurrencyToken,
  OrderbookFee,
  OrderbookType,
  viemToEthersSigner
} from "@doma-protocol/orderbook-sdk";

interface ListDomainModalProps {
  domain: Name | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (domain: Name) => void;
}

export default function ListDomainModal({
  domain,
  isOpen,
  onClose,
  onSuccess
}: ListDomainModalProps) {
  const [price, setPrice] = useState("");
  const [orderbook, setOrderbook] = useState<OrderbookType>(OrderbookType.DOMA);
  const [duration, setDuration] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currencies, setCurrencies] = useState<CurrencyToken[]>([]);
  const [fees, setFees] = useState<OrderbookFee[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyToken | undefined>(undefined);

  const { data: walletClient } = useWalletClient();
  const { createListing, getSupportedCurrencies, getOrderbookFee } = useOrderbook();

  const getCurrencies = async () => {
    const token = domain?.tokens?.[0];
    if (!token) return;


    try {
      const supportedCurrencies = await getSupportedCurrencies({
        chainId: token.chain.networkId,
        orderbook,
        contractAddress: token.tokenAddress,
      });

      const result = supportedCurrencies.currencies.filter(
        (c) => c.symbol !== "WETH"
      );

      setCurrencies(result);

      if (result.length) {
        setSelectedCurrency(result[0]);
      }
    } catch (error) {
      console.error("Failed to get currencies:", error);
    }
  };

  const getFees = async () => {
    const token = domain?.tokens?.[0];
    if (!token) return;

    try {
      const fees = await getOrderbookFee({
        chainId: token.chain.networkId,
        contractAddress: token.tokenAddress,
        orderbook,
      });

      setFees(fees.marketplaceFees);
    } catch (error) {
      console.error("Failed to get fees:", error);
      setFees([]);
    }
  };

  useEffect(() => {
    if (!isOpen || !domain) return;
    getCurrencies();
  }, [domain, isOpen, orderbook]);

  useEffect(() => {
    if (!domain) return;
    getFees();
  }, [domain, orderbook]);

  if (!isOpen || !domain) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {

      if (!price || price.trim() === "") {
        throw new Error("Please enter a price");
      }

      const numericPrice = parseFloat(price);

      if (isNaN(numericPrice) || numericPrice <= 0) {
        throw new Error("Please enter a valid positive number for price");
      }

      if (!selectedCurrency) {
        throw new Error("Please select a currency");
      }


      if (!selectedCurrency.decimals || isNaN(selectedCurrency.decimals)) {
        throw new Error("Currency decimals are invalid");
      }

      const token = domain.tokens?.[0];
      if (!token) {
        throw new Error("No token found for this domain");
      }

      if (!walletClient) {
        throw new Error("Please connect your wallet");
      }

      // Parse CAIP10 chain ID
      const parseCAIP10 = (input: string) => {
        const parts = input.split(":");
        const namespace = parts[0];
        const chainId = parts[1];
        const address = parts[2] ?? null;
        return { namespace, chainId, address };
      };

      const parsedChain = parseCAIP10(token.chain.networkId);

      // Switch to correct chain
      await walletClient.switchChain({
        id: Number(parsedChain.chainId),
      });

      // Calculate duration in milliseconds
      const durationMs = Number(duration) * 24 * 3600 * 1000;

      // Create params
      const parsedPrice = parseUnits(numericPrice.toString(), selectedCurrency.decimals).toString();

      const params = {
        items: [
          {
            contract: token.tokenAddress,
            tokenId: token.tokenId,
            price: parsedPrice,
            currencyContractAddress: selectedCurrency.contractAddress,
            duration: durationMs,
          },
        ],
        orderbook,
        source: process.env.NEXT_PUBLIC_APP_NAME || "domain_space",
        marketplaceFees: fees,
      };


      // Check on-chain ownership BEFORE listing
      const viemModule = await import('viem');
      const publicClient = viemModule.createPublicClient({
        chain: { id: Number(parsedChain.chainId), name: 'Doma', rpcUrls: { default: { http: ['https://fraa-flashbox-2800-rpc.a.stagenet.tanssi.network'] } }, nativeCurrency: { name: 'DOMA', symbol: 'DOMA', decimals: 18 } },
        transport: viemModule.http()
      });

      try {
        const ownerBefore = await publicClient.readContract({
          address: token.tokenAddress as `0x${string}`,
          abi: [{ "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }],
          functionName: 'ownerOf',
          args: [BigInt(token.tokenId)]
        });
      } catch (err) {
        console.error("Error checking owner before:", err);
      }

      const result = await createListing({
        params,
        chainId: token.chain.networkId,
        onProgress: (progress) => {
          // Progress tracking
        },
        signer: viemToEthersSigner(walletClient, token.chain.networkId),
      });

      // Check on-chain ownership AFTER listing
      try {
        const ownerAfter = await publicClient.readContract({
          address: token.tokenAddress as `0x${string}`,
          abi: [{ "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }],
          functionName: 'ownerOf',
          args: [BigInt(token.tokenId)]
        });
      } catch (err) {
        console.error("Error checking owner after:", err);
      }

      onSuccess?.(domain);
      onClose();
      setPrice("");
      setDuration("30");
    } catch (err: unknown) {
      console.error("Error creating listing:", err);
      setError((err as Error)?.message || "Failed to create listing");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">List Domain</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Domain Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">{domain.name}</h3>
            <p className="text-gray-400 text-sm">
              You&apos;re about to list this domain for sale
            </p>
          </div>

          {/* Orderbook Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Orderbook
            </label>
            <select
              value={orderbook}
              onChange={(e) => setOrderbook(e.target.value as OrderbookType)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value={OrderbookType.DOMA}>Doma</option>
              <option
                value={OrderbookType.OPENSEA}
                disabled={!domain?.tokens?.[0]?.openseaCollectionSlug}
              >
                OpenSea {!domain?.tokens?.[0]?.openseaCollectionSlug ? "(Not configured)" : ""}
              </option>
            </select>
          </div>

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price
            </label>
            <div className="flex space-x-2">
              <input
                type="number"
                step="0.0001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.0000"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                required
              />
              <select
                value={selectedCurrency?.symbol || ""}
                onChange={(e) => setSelectedCurrency(currencies.find(c => c.symbol === e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                {currencies.map((currency) => (
                  <option key={currency.symbol} value={currency.symbol}>
                    {currency.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Listing..." : "List Domain"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}