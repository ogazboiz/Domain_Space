"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { DomainAvatar } from '@/components/ui/DomainAvatar';

interface TradeMessageRendererProps {
  content: string;
  isFromMe: boolean;
  timestamp?: Date;
}

interface OfferData {
  domainName: string;
  amount: string;
  currency: string;
  expiration: string;
  type?: string;
}

interface ListingData {
  domainName: string;
  price: string;
  currency: string;
  expiration: string;
}

interface ProposalData {
  message: string;
  amount?: string;
  currency?: string;
  domainName?: string;
}

export default function TradeMessageRenderer({ content, isFromMe, timestamp }: TradeMessageRendererProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  // Check if this is a trade message
  const isOfferMessage = content.startsWith('created_offer::');
  const isListingMessage = content.startsWith('created_listing::');
  const isProposalMessage = content.startsWith('proposal::');

  if (!isOfferMessage && !isListingMessage && !isProposalMessage) {
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
    }
  } catch (error) {
    console.error('Error parsing trade message:', error);
    return <div className="text-sm text-red-400">Invalid trade message format</div>;
  }

  if (!tradeData) {
    return <div className="text-sm text-red-400">Failed to parse trade data</div>;
  }

  const handleAcceptOffer = async () => {
    setIsAccepting(true);
    try {
      // Here you would implement the actual offer acceptance logic
      console.log('Accepting offer:', tradeData);
      // This would integrate with your orderbook SDK
    } catch (error) {
      console.error('Error accepting offer:', error);
    } finally {
      setIsAccepting(false);
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

      {!isFromMe && (
        <div className="flex space-x-2">
          <button
            onClick={handleAcceptOffer}
            disabled={isAccepting}
            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {isAccepting ? 'Accepting...' : 'Accept'}
          </button>
          <button className="flex-1 py-2 px-3 border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            Decline
          </button>
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

      {!isFromMe && (
        <div className="flex space-x-2">
          <button className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
            Make Offer
          </button>
          <button className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
            Buy Now
          </button>
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
          <button className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            Reply
          </button>
          <button className="flex-1 py-2 px-3 border border-gray-600 text-gray-300 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            Ignore
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="my-2">
      {messageType === 'offer' && renderOfferCard(tradeData as OfferData)}
      {messageType === 'listing' && renderListingCard(tradeData as ListingData)}
      {messageType === 'proposal' && renderProposalCard(tradeData as ProposalData)}
      {renderTimestamp()}
    </div>
  );
}