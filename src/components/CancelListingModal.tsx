"use client";

import { useState } from "react";
import { Name } from "@/types/doma";
import { useOrderbook } from "@/hooks/use-orderbook";
import { X, AlertTriangle } from "lucide-react";
import { useWalletClient } from "wagmi";
import { viemToEthersSigner, CancelListingParams } from "@doma-protocol/orderbook-sdk";

interface CancelListingModalProps {
  domain: Name | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (domain: Name) => void;
}

export default function CancelListingModal({
  domain,
  isOpen,
  onClose,
  onSuccess
}: CancelListingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: walletClient } = useWalletClient();
  const { cancelListing } = useOrderbook();

  if (!isOpen || !domain) return null;

  const listing = domain.tokens?.[0]?.listings?.[0];
  const formatPrice = (price: string, decimals: number) => {
    const value = parseFloat(price) / Math.pow(10, decimals);
    return value.toFixed(4);
  };

  const handleConfirm = async () => {
    setError("");
    setIsLoading(true);

    try {
      const token = domain.tokens?.[0];
      if (!token) {
        throw new Error("No token found for this domain");
      }

      if (!walletClient) {
        throw new Error("Please connect your wallet");
      }

      // Parse CAIP10 chain ID (same as ListDomainModal)
      const parseCAIP10 = (input: string) => {
        const parts = input.split(":");
        const namespace = parts[0];
        const chainId = parts[1];
        const address = parts[2] ?? null;
        return { namespace, chainId, address };
      };

      // Switch to correct chain
      await walletClient.switchChain({
        id: Number(parseCAIP10(token.chain.networkId).chainId),
      });

      // Get order ID from token.listings
      const orderId = token.listings?.[0]?.externalId;
      if (!orderId) {
        throw new Error("No order ID found for this listing");
      }

      const params: CancelListingParams = {
        orderId,
        cancellationType: "off-chain",
      };

      await cancelListing({
        params,
        chainId: `eip155:${Number(parseCAIP10(token.chain.networkId).chainId)}`,
        onProgress: (progress) => {
          // Progress tracking
        },
        signer: viemToEthersSigner(walletClient, token.chain.networkId),
      });

      onSuccess?.(domain);
      onClose();
    } catch (err: unknown) {
      console.error("Error canceling listing:", err);
      setError((err as Error)?.message || "Failed to cancel listing");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Cancel Listing</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-yellow-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          {/* Domain Info */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">{domain.name}</h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to cancel this listing?
            </p>

            {listing && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Price:</span>
                  <span className="text-white font-medium">
                    {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-300 text-sm text-center">
              ⚠️ This action cannot be undone. Your domain will be removed from the marketplace.
            </p>
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
              Keep Listing
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
            >
              {isLoading ? "Canceling..." : "Cancel Listing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}