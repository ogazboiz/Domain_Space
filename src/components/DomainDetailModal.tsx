"use client";

import { useState, useEffect, useMemo } from "react";
import { Name } from "@/types/doma";
import { useAccount } from "wagmi";
import { useUsername } from "@/contexts/UsernameContext";
import { X, MessageSquare, Eye, EyeOff, Share, Activity, DollarSign, CheckCircle, XCircle, Shield, Loader } from "lucide-react";
import { formatUnits } from "viem";
import ImprovedXMTPChat from "./chat/ImprovedXMTPChat";
import DialogCheckingDM from "./DialogCheckingDM";

interface DomainDetailModalProps {
  domain: Name | null;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  onTransactionSuccess?: (type: 'buy' | 'offer', domain: Name, result: unknown) => void;
}

export default function DomainDetailModal({
  domain,
  isOpen,
  onClose,
  formatPrice,
  getTldColor,
  onTransactionSuccess
}: DomainDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'activity' | 'chat'>('overview');
  const [showCheckingDM, setShowCheckingDM] = useState(false);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string>("");
  const [isWatched, setIsWatched] = useState(false);

  const { address } = useAccount();
  const { profile } = useUsername();

  // Check if domain is watched
  useEffect(() => {
    if (domain && profile?.watchUsernames) {
      setIsWatched(profile.watchUsernames.includes(domain.name));
    }
  }, [domain, profile?.watchUsernames]);

  if (!isOpen || !domain) return null;

  const hasListings = domain.tokens?.some(token => token.listings?.length > 0);
  const currentListing = domain.tokens?.[0]?.listings?.[0];
  const currentPrice = currentListing ? formatPrice(currentListing.price, currentListing.currency.decimals) : undefined;
  const currency = currentListing?.currency?.symbol;
  const isOwner = domain.claimedBy?.split(':')[2] === address;

  const handleMessage = async () => {
    if (!domain.claimedBy) {
      alert("This domain is not owned by anyone yet.");
      return;
    }

    const ownerAddress = domain.claimedBy.split(':')[2];
    if (!ownerAddress) {
      alert("Invalid owner address format.");
      return;
    }

    setSelectedUserAddress(ownerAddress);
    setShowCheckingDM(true);
  };

  const handleDMCreated = (dmId: string, userAddress: string) => {
    setActiveTab("chat");
    setShowCheckingDM(false);
  };

  const handleWatch = () => {
    if (!address) {
      alert("Connect your wallet to watch domains");
      return;
    }
    // TODO: Implement watch functionality
    setIsWatched(!isWatched);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${domain.name} domain`,
        text: `Check out this domain: ${domain.name}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: getTldColor(domain.name.split('.').pop() || '') }}
            >
              {domain.name.split('.').pop()?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{domain.name}</h1>
              <p className="text-gray-400">
                {domain.claimedBy ? `Owner: ${domain.claimedBy.split(':')[2]?.slice(0, 6)}...${domain.claimedBy.split(':')[2]?.slice(-4)}` : 'Available'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isOwner && (
              <>
                <button
                  onClick={handleWatch}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isWatched ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleMessage}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Message owner"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Share domain"
            >
              <Share className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'offers', label: 'Offers', icon: DollarSign },
            { id: 'activity', label: 'Activity', icon: Activity },
            { id: 'chat', label: 'Chat', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'offers' | 'activity')}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Price Section */}
              {hasListings && currentPrice && (
                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-3xl font-bold text-white">
                        {currentPrice} {currency}
                      </div>
                      <div className="text-gray-400">
                        Current listing price
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Orderbook</div>
                      <div className="text-white font-medium">{currentListing?.orderbook}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Domain Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Domain Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Domain Name</span>
                      <span className="text-white font-medium">{domain.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Length</span>
                      <span className="text-white font-medium">{domain.name.length} characters</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">TLD</span>
                      <span className="text-white font-medium">.{domain.name.split('.').pop()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-medium ${hasListings ? 'text-green-400' : 'text-yellow-400'}`}>
                        {hasListings ? 'Listed' : 'Available for Offers'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Ownership</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Owner</span>
                      <span className="text-white font-medium">
                        {domain.claimedBy ? `${domain.claimedBy.split(':')[2]?.slice(0, 6)}...${domain.claimedBy.split(':')[2]?.slice(-4)}` : 'Unclaimed'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Transfer Lock</span>
                      <div className="flex items-center space-x-2">
                        {domain.transferLock ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-white font-medium">
                          {domain.transferLock ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Fractionalized</span>
                      <div className="flex items-center space-x-2">
                        {domain.isFractionalized ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-white font-medium">
                          {domain.isFractionalized ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Expires</span>
                      <span className="text-white font-medium">
                        {new Date(domain.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4">
                {hasListings ? (
                  <button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors">
                    Buy Now
                  </button>
                ) : (
                  <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                    Make Offer
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={handleMessage}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
                  >
                    Message Owner
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Offers Yet</h3>
              <p className="text-gray-400">Be the first to make an offer on this domain</p>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Recent Activity</h3>
              <p className="text-gray-400">Activity will appear here when there are domain transactions</p>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-96">
              <ImprovedXMTPChat
                defaultPeerAddress={selectedUserAddress}
                searchQuery=""
                setSearchQuery={() => {}}
                onManualConversationSelect={() => setSelectedUserAddress('')}
              />
            </div>
          )}
        </div>
      </div>

      {/* DM Checking Dialog */}
      <DialogCheckingDM
        open={showCheckingDM}
        onOpenChange={setShowCheckingDM}
        userAddress={selectedUserAddress}
        onDMCreated={handleDMCreated}
      />
    </div>
  );
}
