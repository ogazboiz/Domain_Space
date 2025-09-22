"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { type Dm, type DecodedMessage } from '@xmtp/browser-sdk';
import { ContentTypeText } from '@xmtp/content-type-text';
import { Name } from '@/types/doma';
import { DomainAvatar } from '@/components/ui/DomainAvatar';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'sonner';

// Import the existing domain query from your app
import { useOwnedNames } from '@/data/use-doma';

interface TradeOptionsModalProps {
  conversation: Dm | null;
  replyTo?: DecodedMessage;
  isOpen: boolean;
  onClose: () => void;
  peerAddress: string;
}

type TradeMode = 'options' | 'buy' | 'sell' | 'proposal';

const currencies = [
  { symbol: 'USDC', decimals: 6 },
  { symbol: 'WETH', decimals: 18 }
];

const expirationOptions = [
  { label: '24 hours', value: '1' },
  { label: '3 days', value: '3' },
  { label: '7 days', value: '7' }
];

export default function TradeOptionsModal({
  conversation,
  replyTo,
  isOpen,
  onClose,
  peerAddress,
}: TradeOptionsModalProps) {
  const { address } = useAccount();
  const [mode, setMode] = useState<TradeMode>('options');
  const [selectedDomain, setSelectedDomain] = useState<Name | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USDC');
  const [expiration, setExpiration] = useState('7');
  const [proposalMessage, setProposalMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's own domains for selling
  const { data: ownedDomainsData } = useOwnedNames(address || '', 20, []);
  const ownedDomains = useMemo(() => {
    return ownedDomainsData?.pages?.flatMap(page => page.items) || [];
  }, [ownedDomainsData]);

  // Get peer's domains for buying
  const { data: peerDomainsData } = useOwnedNames(peerAddress, 20, []);
  const peerDomains = useMemo(() => {
    return peerDomainsData?.pages?.flatMap(page => page.items) || [];
  }, [peerDomainsData]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('options');
      setSelectedDomain(null);
      setOfferAmount('');
      setSelectedCurrency('USDC');
      setExpiration('7');
      setProposalMessage('');
    }
  }, [isOpen]);

  const formatPrice = (domain: Name) => {
    const token = domain.tokens?.[0];
    const listing = token?.listings?.[0];

    if (listing?.price) {
      try {
        const formatted = formatUnits(BigInt(listing.price), listing.currency.decimals);
        const price = parseFloat(formatted);
        return `${price >= 1000 ? (price / 1000).toFixed(1) + 'K' : price.toFixed(2)} ${listing.currency.symbol}`;
      } catch {
        return "Not listed";
      }
    }
    return "Not listed";
  };

  const handleSendMessage = async (messageContent: string) => {
    if (!conversation) {
      toast.error("No conversation available");
      return;
    }

    try {
      await conversation.sendOptimistic(messageContent, ContentTypeText);
      await conversation.publishMessages();
      toast.success("Message sent successfully!");
      onClose();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleBuyOffer = async () => {
    if (!selectedDomain || !offerAmount) {
      toast.error("Please select a domain and enter an offer amount");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create offer message similar to frontend format
      const offerMessage = `created_offer::${JSON.stringify({
        domainName: selectedDomain.name,
        amount: offerAmount,
        currency: selectedCurrency,
        expiration: expiration,
        type: 'buy_offer'
      })}`;

      await handleSendMessage(offerMessage);
    } catch (error) {
      console.error("Error creating offer:", error);
      toast.error("Failed to create offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSellListing = async () => {
    if (!selectedDomain || !offerAmount) {
      toast.error("Please select a domain and enter a price");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create listing message
      const listingMessage = `created_listing::${JSON.stringify({
        domainName: selectedDomain.name,
        price: offerAmount,
        currency: selectedCurrency,
        expiration: expiration
      })}`;

      await handleSendMessage(listingMessage);
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProposal = async () => {
    if (!proposalMessage.trim()) {
      toast.error("Please enter a proposal message");
      return;
    }

    setIsSubmitting(true);
    try {
      const proposal = `proposal::${JSON.stringify({
        message: proposalMessage,
        amount: offerAmount || null,
        currency: selectedCurrency,
        domainName: selectedDomain?.name || null
      })}`;

      await handleSendMessage(proposal);
    } catch (error) {
      console.error("Error sending proposal:", error);
      toast.error("Failed to send proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderOptionsScreen = () => (
    <>
      <h2 className="text-xl font-bold text-white mb-2">Trade Options</h2>
      <p className="text-gray-400 text-sm mb-6">Choose an option to trade domains</p>

      <div className="space-y-3">
        <button
          onClick={() => setMode('buy')}
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-4"
        >
          <div className="text-2xl">💰</div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-white">Purchase</h3>
            <p className="text-sm text-gray-400">Make an offer on their domains</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setMode('sell')}
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-4"
        >
          <div className="text-2xl">🏷️</div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-white">Sell</h3>
            <p className="text-sm text-gray-400">Share a listing for your domains</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={() => setMode('proposal')}
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-4"
        >
          <div className="text-2xl">📝</div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-white">Proposal</h3>
            <p className="text-sm text-gray-400">Send a custom trade proposal</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </>
  );

  const renderDomainSelection = (domains: Name[], title: string, emptyMessage: string) => (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">{title}</h3>
      <div className="max-h-48 overflow-y-auto space-y-2">
        {domains.length > 0 ? (
          domains.map((domain) => (
            <button
              key={domain.name}
              onClick={() => setSelectedDomain(domain)}
              className={`w-full p-3 border rounded-lg transition-colors flex items-center space-x-3 ${
                selectedDomain?.name === domain.name
                  ? 'bg-purple-600/20 border-purple-500'
                  : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
              }`}
            >
              <DomainAvatar domain={domain.name} className="w-8 h-8" size={32} />
              <div className="flex-1 text-left">
                <div className="font-medium text-white">{domain.name}</div>
                <div className="text-sm text-gray-400">{formatPrice(domain)}</div>
              </div>
              {selectedDomain?.name === domain.name && (
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">{emptyMessage}</p>
        )}
      </div>
    </div>
  );

  const renderOfferForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-white mb-2">Amount</label>
        <input
          type="number"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Currency</label>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {currencies.map(currency => (
            <option key={currency.symbol} value={currency.symbol}>
              {currency.symbol}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Expiration</label>
        <select
          value={expiration}
          onChange={(e) => setExpiration(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {expirationOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {mode !== 'options' && (
              <button
                onClick={() => setMode('options')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {mode === 'options' && <h2 className="text-xl font-bold text-white">Trade Options</h2>}
            {mode === 'buy' && <h2 className="text-xl font-bold text-white">Make an Offer</h2>}
            {mode === 'sell' && <h2 className="text-xl font-bold text-white">Share Listing</h2>}
            {mode === 'proposal' && <h2 className="text-xl font-bold text-white">Send Proposal</h2>}
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

        {mode === 'options' && renderOptionsScreen()}

        {mode === 'buy' && (
          <div className="space-y-6">
            {renderDomainSelection(peerDomains, "Select Domain to Offer On", "User has no domains available")}
            {selectedDomain && (
              <>
                {renderOfferForm()}
                <button
                  onClick={handleBuyOffer}
                  disabled={isSubmitting || !selectedDomain || !offerAmount}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
                >
                  {isSubmitting ? "Sending Offer..." : "Send Offer"}
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'sell' && (
          <div className="space-y-6">
            {renderDomainSelection(ownedDomains, "Select Your Domain to List", "You don't have any domains")}
            {selectedDomain && (
              <>
                {renderOfferForm()}
                <button
                  onClick={handleSellListing}
                  disabled={isSubmitting || !selectedDomain || !offerAmount}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
                >
                  {isSubmitting ? "Sharing Listing..." : "Share Listing"}
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'proposal' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Proposal Message</label>
              <textarea
                value={proposalMessage}
                onChange={(e) => setProposalMessage(e.target.value)}
                placeholder="Enter your proposal message..."
                rows={4}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <div className="text-sm text-gray-400 mb-4">
              Optional: Include domain and offer details
            </div>

            {renderDomainSelection([...ownedDomains, ...peerDomains], "Select Domain (Optional)", "No domains available")}

            {selectedDomain && renderOfferForm()}

            <button
              onClick={handleProposal}
              disabled={isSubmitting || !proposalMessage.trim()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
            >
              {isSubmitting ? "Sending Proposal..." : "Send Proposal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}