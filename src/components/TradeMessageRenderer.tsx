"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { DomainAvatar } from '@/components/ui/DomainAvatar';
import { toast } from 'sonner';
import { useOrderbook } from '@/hooks/use-orderbook';
import { useWalletClient } from 'wagmi';
import {
  AcceptOfferParams,
  BuyListingParams,
  CreateOfferParams,
  OrderbookType,
  viemToEthersSigner
} from '@doma-protocol/orderbook-sdk';
import { parseUnits } from 'viem';

interface TradeMessageRendererProps {
  content: string;
  isFromMe: boolean;
  timestamp?: Date;
  onReply?: () => void; // Callback to open trade modal
  onSendMessage?: (message: string) => void; // Callback to send response message
}

interface OfferData {
  domainName: string;
  amount: string;
  currency: string;
  expiration: string;
  type?: string;
  orderId?: string;
  tokenAddress?: string;
  tokenId?: string;
  chainId?: string;
  currencyAddress?: string;
  decimals?: number;
}

interface ListingData {
  domainName: string;
  price: string;
  currency: string;
  expiration: string;
  orderId?: string;
  tokenAddress?: string;
  tokenId?: string;
  chainId?: string;
  currencyAddress?: string;
  decimals?: number;
}

interface ProposalData {
  message: string;
  amount?: string;
  currency?: string;
  domainName?: string;
}

export default function TradeMessageRenderer({ content, isFromMe, timestamp, onReply, onSendMessage }: TradeMessageRendererProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);
  const [isPurchased, setIsPurchased] = useState(false);

  const { data: walletClient } = useWalletClient();
  const { acceptOffer, createOffer, buyListing } = useOrderbook();

  // Check if this is a trade message
  const isOfferMessage = content.startsWith('created_offer::');
  const isListingMessage = content.startsWith('created_listing::');
  const isProposalMessage = content.startsWith('proposal::');
  const isAcceptedOfferMessage = content.startsWith('accepted_offer::');
  const isDeclinedOfferMessage = content.startsWith('declined_offer::');
  const isPurchasedListingMessage = content.startsWith('purchased_listing::');

  if (!isOfferMessage && !isListingMessage && !isProposalMessage &&
      !isAcceptedOfferMessage && !isDeclinedOfferMessage && !isPurchasedListingMessage) {
    // Regular text message
    return <div className="text-sm">{content}</div>;
  }

  let tradeData: OfferData | ListingData | ProposalData | null = null;
  let messageType = '';

  try {
    if (isOfferMessage) {
      const jsonPart = content.replace('created_offer::', '');
      tradeData = JSON.parse(jsonPart) as OfferData;
      messageType = 'offer';
    } else if (isListingMessage) {
      const jsonPart = content.replace('created_listing::', '');
      tradeData = JSON.parse(jsonPart) as ListingData;
      messageType = 'listing';
    } else if (isProposalMessage) {
      const jsonPart = content.replace('proposal::', '');
      tradeData = JSON.parse(jsonPart) as ProposalData;
      messageType = 'proposal';
    } else if (isAcceptedOfferMessage) {
      const jsonPart = content.replace('accepted_offer::', '');
      tradeData = JSON.parse(jsonPart);
      messageType = 'accepted_offer';
    } else if (isDeclinedOfferMessage) {
      const jsonPart = content.replace('declined_offer::', '');
      tradeData = JSON.parse(jsonPart);
      messageType = 'declined_offer';
    } else if (isPurchasedListingMessage) {
      const jsonPart = content.replace('purchased_listing::', '');
      tradeData = JSON.parse(jsonPart);
      messageType = 'purchased_listing';
    }
  } catch (error) {
    console.error('Error parsing trade message:', error);
    return <div className="text-sm text-red-400">Invalid trade message format</div>;
  }

  if (!tradeData) {
    return <div className="text-sm text-red-400">Failed to parse trade data</div>;
  }

  const handleAcceptOffer = async () => {
    if (!walletClient || !tradeData || messageType !== 'offer') {
      toast.error('Missing required data for offer acceptance');
      return;
    }

    const offerData = tradeData as OfferData;
    if (!offerData.orderId || !offerData.tokenAddress || !offerData.tokenId) {
      toast.error('Offer data is incomplete');
      return;
    }

    setIsAccepting(true);
    try {
      const chainId = offerData.chainId || 'eip155:97476';

      const params: AcceptOfferParams = {
        orderId: offerData.orderId,
      };

      const result = await acceptOffer({
        params,
        signer: viemToEthersSigner(walletClient, chainId as `eip155:${number}`),
        chainId: chainId as `eip155:${number}`,
        onProgress: (progress) => {
          // Progress tracking
        },
      });

      // Send response message
      if (onSendMessage && result) {
        const responseMessage = `accepted_offer::${JSON.stringify({
          domainName: offerData.domainName,
          transactionHash: result.transactionHash,
          orderId: offerData.orderId
        })}`;

        onSendMessage(responseMessage);
      }

      setIsAccepted(true);
      toast.success('Offer accepted successfully!');
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error((error as Error)?.message || 'Failed to accept offer');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineOffer = async () => {
    setIsProcessing(true);
    try {
      const offerData = tradeData as OfferData;

      // Send decline message to the sender
      if (onSendMessage) {
        const declineMessage = `declined_offer::${JSON.stringify({
          domainName: offerData.domainName,
          orderId: offerData.orderId,
          reason: 'declined'
        })}`;

        onSendMessage(declineMessage);
      }

      setIsDeclined(true);
      toast.success('Offer declined');
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error('Failed to decline offer');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMakeOffer = async () => {
    if (!walletClient || !tradeData || messageType !== 'listing') {
      toast.error('Missing required data for making offer');
      return;
    }

    const listingData = tradeData as ListingData;
    if (!listingData.tokenAddress || !listingData.tokenId) {
      toast.error('Domain data is incomplete');
      return;
    }

    if (onReply) {
      onReply(); // Open the trade modal to make counter-offer
      toast.success('Opening trade interface to make offer...');
    } else {
      toast.info('Make offer functionality not available in this context');
    }
  };

  const handleBuyNow = async () => {
    if (!walletClient || !tradeData || messageType !== 'listing') {
      toast.error('Missing required data for purchase');
      return;
    }

    const listingData = tradeData as ListingData;
    if (!listingData.orderId || !listingData.tokenAddress || !listingData.tokenId) {
      toast.error('Listing data is incomplete');
      return;
    }

    setIsProcessing(true);
    try {
      const chainId = listingData.chainId || 'eip155:97476';

      const params: BuyListingParams = {
        orderId: listingData.orderId,
      };

      const result = await buyListing({
        params,
        signer: viemToEthersSigner(walletClient, chainId as `eip155:${number}`),
        chainId: chainId as `eip155:${number}`,
        onProgress: (progress) => {
          // Progress tracking
        },
      });

      // Send response message
      if (onSendMessage && result) {
        const responseMessage = `purchased_listing::${JSON.stringify({
          domainName: listingData.domainName,
          transactionHash: result.transactionHash,
          orderId: listingData.orderId
        })}`;

        onSendMessage(responseMessage);
      }

      setIsPurchased(true);
      toast.success('Purchase completed successfully!');
    } catch (error) {
      console.error('Error buying:', error);
      toast.error((error as Error)?.message || 'Failed to complete purchase');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplyToProposal = async () => {
    if (onReply) {
      onReply(); // Open the trade modal to reply
      toast.success('Opening trade interface to reply...');
    } else {
      toast.info('Reply functionality not available in this context');
    }
  };

  const handleIgnoreProposal = async () => {
    setIsProcessing(true);
    try {
      // Mark proposal as ignored (could store in local state/database)
      toast.success('Proposal ignored');

      // You could add local storage or state management here
      // localStorage.setItem(`ignored_proposal_${timestamp}`, 'true');
    } catch (error) {
      console.error('Error ignoring:', error);
      toast.error('Failed to ignore proposal');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelAction = async () => {
    setIsProcessing(true);
    try {
      toast.success('Action canceled');
    } catch (error) {
      console.error('Error canceling:', error);
      toast.error('Failed to cancel');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTimestamp = () => {
    if (!timestamp) return null;
    return (
      <div className="text-xs text-gray-400 mt-2 text-right">
        {formatDistanceToNow(timestamp, { addSuffix: true })}
      </div>
    );
  };

  const renderOfferCard = (data: OfferData) => (
    <div className="bg-gray-800 border border-purple-500/30 rounded-lg p-4 max-w-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-2xl">💰</div>
        <div>
          <h4 className="font-semibold text-white text-sm">
            {isFromMe ? 'You made an offer' : 'Received an offer'}
          </h4>
          <p className="text-xs text-gray-400">Offer expires in {data.expiration} days</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <DomainAvatar domain={data.domainName} className="w-10 h-10" size={40} />
        <div>
          <div className="font-medium text-white text-sm">{data.domainName}</div>
          <div className="text-purple-400 font-semibold">
            {data.amount} {data.currency}
          </div>
        </div>
      </div>

      {!isFromMe && !isAccepted && !isDeclined && (
        <div className="flex space-x-2">
          <button
            onClick={handleAcceptOffer}
            disabled={isAccepting}
            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {isAccepting ? 'Accepting...' : 'Accept'}
          </button>
          <button
            onClick={handleDeclineOffer}
            disabled={isProcessing}
            className="flex-1 py-2 px-3 border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:bg-gray-600 text-sm rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Decline'}
          </button>
        </div>
      )}

      {/* Show status if responded */}
      {!isFromMe && (isAccepted || isDeclined) && (
        <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${
          isAccepted ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
        }`}>
          {isAccepted ? '✅ Offer Accepted' : '❌ Offer Declined'}
        </div>
      )}
    </div>
  );

  const renderListingCard = (data: ListingData) => (
    <div className="bg-gray-800 border border-green-500/30 rounded-lg p-4 max-w-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-2xl">🏷️</div>
        <div>
          <h4 className="font-semibold text-white text-sm">
            {isFromMe ? 'You shared a listing' : 'Shared a listing'}
          </h4>
          <p className="text-xs text-gray-400">Listed for {data.expiration} days</p>
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <DomainAvatar domain={data.domainName} className="w-10 h-10" size={40} />
        <div>
          <div className="font-medium text-white text-sm">{data.domainName}</div>
          <div className="text-green-400 font-semibold">
            {data.price} {data.currency}
          </div>
        </div>
      </div>

      {!isFromMe && !isPurchased && (
        <div className="flex space-x-2">
          <button
            onClick={handleMakeOffer}
            disabled={isProcessing}
            className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Make Offer'}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={isProcessing}
            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Buy Now'}
          </button>
        </div>
      )}

      {/* Show status if purchased */}
      {!isFromMe && isPurchased && (
        <div className="text-center py-2 px-3 rounded-lg text-sm font-medium bg-green-600/20 text-green-400">
          ✅ Purchased Successfully
        </div>
      )}
    </div>
  );

  const renderProposalCard = (data: ProposalData) => (
    <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-4 max-w-sm">
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-2xl">📝</div>
        <div>
          <h4 className="font-semibold text-white text-sm">
            {isFromMe ? 'You sent a proposal' : 'Received a proposal'}
          </h4>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-white text-sm">{data.message}</p>
      </div>

      {data.domainName && (
        <div className="flex items-center space-x-3 mb-4">
          <DomainAvatar domain={data.domainName} className="w-8 h-8" size={32} />
          <div>
            <div className="font-medium text-white text-xs">{data.domainName}</div>
            {data.amount && (
              <div className="text-blue-400 text-xs">
                {data.amount} {data.currency}
              </div>
            )}
          </div>
        </div>
      )}

      {!isFromMe && (
        <div className="flex space-x-2">
          <button
            onClick={handleReplyToProposal}
            disabled={isProcessing}
            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Reply'}
          </button>
          <button
            onClick={handleIgnoreProposal}
            disabled={isProcessing}
            className="flex-1 py-2 px-3 border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:bg-gray-600 text-sm rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Ignore'}
          </button>
        </div>
      )}
    </div>
  );

  const renderResponseCard = (data: { domainName: string; transactionHash?: string; orderId?: string }, type: 'accepted_offer' | 'declined_offer' | 'purchased_listing') => (
    <div className={`bg-gray-800 border rounded-lg p-4 max-w-sm ${
      type === 'accepted_offer' ? 'border-green-500/30' :
      type === 'declined_offer' ? 'border-red-500/30' :
      'border-green-500/30'
    }`}>
      <div className="flex items-center space-x-3 mb-3">
        <div className="text-2xl">
          {type === 'accepted_offer' ? '✅' :
           type === 'declined_offer' ? '❌' : '🛒'}
        </div>
        <div>
          <h4 className="font-semibold text-white text-sm">
            {type === 'accepted_offer' ? 'Offer Accepted' :
             type === 'declined_offer' ? 'Offer Declined' :
             'Purchase Completed'}
          </h4>
          {data.transactionHash && (
            <p className="text-xs text-gray-400">
              Transaction completed
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 mb-4">
        <DomainAvatar domain={data.domainName} className="w-10 h-10" size={40} />
        <div>
          <div className="font-medium text-white text-sm">{data.domainName}</div>
          {data.transactionHash && (
            <div className="text-xs text-gray-400">
              {data.transactionHash.slice(0, 6)}...{data.transactionHash.slice(-4)}
            </div>
          )}
        </div>
      </div>

      <div className={`text-center py-2 px-3 rounded-lg text-sm font-medium ${
        type === 'accepted_offer' ? 'bg-green-600/20 text-green-400' :
        type === 'declined_offer' ? 'bg-red-600/20 text-red-400' :
        'bg-green-600/20 text-green-400'
      }`}>
        {type === 'accepted_offer' ? '✅ Offer Accepted' :
         type === 'declined_offer' ? '❌ Offer Declined' :
         '✅ Purchased Successfully'}
      </div>
    </div>
  );

  return (
    <div className="my-2">
      {messageType === 'offer' && renderOfferCard(tradeData as OfferData)}
      {messageType === 'listing' && renderListingCard(tradeData as ListingData)}
      {messageType === 'proposal' && renderProposalCard(tradeData as ProposalData)}
      {messageType === 'accepted_offer' && renderResponseCard(tradeData as { domainName: string; transactionHash?: string; orderId?: string }, 'accepted_offer')}
      {messageType === 'declined_offer' && renderResponseCard(tradeData as { domainName: string; transactionHash?: string; orderId?: string }, 'declined_offer')}
      {messageType === 'purchased_listing' && renderResponseCard(tradeData as { domainName: string; transactionHash?: string; orderId?: string }, 'purchased_listing')}
      {renderTimestamp()}
    </div>
  );
}