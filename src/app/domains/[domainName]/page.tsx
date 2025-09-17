"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Name } from "@/types/doma";
import { ArrowLeft, MessageSquare, Eye, EyeOff, Share, Activity, DollarSign, CheckCircle, XCircle, Shield, Loader } from "lucide-react";
import { formatUnits } from "viem";
import { formatDistanceToNow } from "date-fns";
import { useNames } from "@/data/use-doma";

// TLD color mappings
const TLD_COLORS: Record<string, string> = {
  'com': '#3B82F6',
  'ai': '#8B5CF6',
  'io': '#10B981',
  'eth': '#F59E0B',
  'ape': '#EC4899',
  'shib': '#EAB308',
  'football': '#EF4444'
};

const getTldColor = (tld: string) => {
  return TLD_COLORS[tld.toLowerCase()] || '#6B7280';
};

const formatPrice = (price: string, decimals: number) => {
  const ethPrice = parseFloat(price) / Math.pow(10, decimals);
  return ethPrice.toFixed(4);
};

export default function DomainDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'offers' | 'activity'>('overview');

  const domainName = decodeURIComponent(params.domainName as string);

  // Use Doma's real data service like the frontend
  const {
    data: namesData,
    isLoading,
    error: nameError,
    refetch: refetchName,
  } = useNames(1, false, domainName, []);

  // Get the domain data from the first page
  const domain = namesData?.pages?.[0]?.items?.[0] || null;

  if (nameError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error loading domain</h1>
          <p className="text-gray-400 mb-6">Failed to load domain details. Please try again.</p>
          <button
            onClick={() => refetchName()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors mr-4"
          >
            Retry
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 inline" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading domain details...</p>
        </div>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Domain not found</h1>
          <p className="text-gray-400 mb-6">The requested domain could not be found.</p>
          <button
            onClick={() => router.back()}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2 inline" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const listing = domain.tokens?.[0]?.listings?.[0];
  const isListed = !!listing;
  const isOwner = address && domain.claimedBy && domain.claimedBy.includes(address);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-400" />
            </button>
            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: getTldColor(domain.name.split('.').pop() || '') }}
              >
                {domain.name.split('.')[0].charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{domain.name}</h1>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-400">
                    {domain.name.split('.')[0].length} chars
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-400">
                    {domain.registrar.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Eye className="h-5 w-5 text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Share className="h-5 w-5 text-gray-400" />
            </button>
            {!isOwner && (
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
                <MessageSquare className="h-4 w-4 mr-2 inline" />
                Message Owner
              </button>
            )}
          </div>
        </div>

        {/* Price Section */}
        {isListed && (
          <div className="bg-gray-800 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-white mb-2">
                  {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                </div>
                <div className="text-gray-400">
                  ~${(parseFloat(formatPrice(listing.price, listing.currency.decimals)) * listing.currency.usdExchangeRate).toFixed(2)} USD
                </div>
              </div>
              <div className="flex space-x-3">
                {!isOwner ? (
                  <>
                    <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors">
                      Buy Now
                    </button>
                    <button className="border border-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors">
                      Make Offer
                    </button>
                  </>
                ) : (
                  <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors">
                    Cancel Listing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'offers', label: 'Offers' },
            { id: 'activity', label: 'Activity' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'activity')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Domain Information */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Domain Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Domain Name</span>
                    <span className="text-white font-medium">{domain.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Owner</span>
                    <span className="text-white font-medium">
                      {domain.claimedBy?.slice(0, 6)}...{domain.claimedBy?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Expires</span>
                    <span className="text-white font-medium">
                      {domain.expiresAt ? formatDistanceToNow(new Date(domain.expiresAt), { addSuffix: true }) : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Tokenized</span>
                    <span className="text-white font-medium">
                      {domain.tokenizedAt ? formatDistanceToNow(new Date(domain.tokenizedAt), { addSuffix: true }) : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Transfer Lock</span>
                    <div className="flex items-center space-x-2">
                      {domain.transferLock ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-white font-medium">
                        {domain.transferLock ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Token Address</span>
                    {domain.tokens?.[0]?.tokenAddress && (
                      <a
                        href={`https://etherscan.io/address/${domain.tokens[0].tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline text-sm"
                      >
                        {domain.tokens[0].tokenAddress.slice(0, 6)}...{domain.tokens[0].tokenAddress.slice(-4)}
                      </a>
                    )}
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Token ID</span>
                    <span className="text-white font-medium">{domain.tokens?.[0]?.tokenId || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Token Information */}
              {domain.tokens && domain.tokens.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4">Token Information</h3>
                  <div className="space-y-4">
                    {domain.tokens.map((token, index) => (
                      <div key={index} className="border border-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-gray-400 text-sm">Network</span>
                            <div className="text-white font-medium">{token.chain.name}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Token ID</span>
                            <div className="text-white font-medium">{token.tokenId}</div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Owner</span>
                            <div className="text-white font-medium">
                              {token.ownerAddress?.slice(0, 6)}...{token.ownerAddress?.slice(-4)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 text-sm">Created</span>
                            <div className="text-white font-medium">
                              {token.createdAt ? formatDistanceToNow(new Date(token.createdAt), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Registrar Info */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Registrar</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white font-medium">{domain.registrar.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">IANA ID</span>
                    <span className="text-white font-medium">{domain.registrar.ianaId}</span>
                  </div>
                  {domain.registrar.websiteUrl && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Website</span>
                      <a
                        href={domain.registrar.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:underline"
                      >
                        Visit
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Name Servers */}
              {domain.nameservers && domain.nameservers.length > 0 && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Name Servers</h3>
                  <div className="space-y-2">
                    {domain.nameservers.map((ns, index) => (
                      <div
                        key={index}
                        className="text-sm font-mono bg-gray-700 p-2 rounded text-gray-300"
                      >
                        {ns.ldhName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner Info */}
              {!isOwner && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Owner</h3>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-gray-300 font-bold">
                        {domain.claimedBy?.split(':')[2]?.slice(0, 2).toUpperCase() || '??'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {domain.claimedBy?.split(':')[2]?.slice(0, 6)}...{domain.claimedBy?.split(':')[2]?.slice(-4) || 'Unknown'}
                      </div>
                      <div className="text-gray-400 text-sm">Domain Owner</div>
                    </div>
                  </div>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                    <MessageSquare className="h-4 w-4 mr-2 inline" />
                    Send Message
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Offers</h3>
            <div className="text-center text-gray-400 py-8">
              No offers found for this domain.
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
            {domain.activities && domain.activities.length > 0 ? (
              <div className="space-y-4">
                {domain.activities.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <Activity className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white">{activity.type}</div>
                        <div className="text-sm text-gray-400">{activity.sld}.{activity.tld}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">
                        {activity.createdAt ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) : 'Unknown'}
                      </div>
                      {activity.txHash && (
                        <a
                          href={`https://etherscan.io/tx/${activity.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-400 hover:underline"
                        >
                          {activity.txHash.slice(0, 6)}...{activity.txHash.slice(-4)}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                No recent activity found for this domain.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
