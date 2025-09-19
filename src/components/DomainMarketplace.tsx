"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNames, useOwnedNames, useSelectedNames, useName, useNameStats, useOffers } from "@/data/use-doma";
// import { formatDistanceToNow } from "date-fns";
// import { formatUnits } from "viem";
import { Name } from "@/types/doma";
import { useAccount, useAccountEffect } from "wagmi";
// import { useHelper } from "@/hooks/use-helper";
import { useUsername } from "@/contexts/UsernameContext";
import { useXMTPContext } from "@/contexts/XMTPContext";
import { DomainAvatar } from '@/components/ui/DomainAvatar';
import DomainCard from "./DomainCard";
import MessagingModal from "./MessagingModal";
import DomainDetailPage from "./DomainDetailPage";
import DialogCheckingDM from "./DialogCheckingDM";
import DomainActionModal from "./DomainActionModal";
import ImprovedXMTPChat from "./chat/ImprovedXMTPChat";
import ListDomainModal from "./ListDomainModal";
import CancelListingModal from "./CancelListingModal";

// TLD color mappings - using exact hex colors like in the image
const TLD_COLORS: Record<string, string> = {
  'com': '#3B82F6', // blue-500
  'ai': '#8B5CF6', // purple-500
  'io': '#10B981', // emerald-500 (teal/cyan like in image)
  'eth': '#F59E0B', // amber-500
  'ape': '#EC4899', // pink-500
  'shib': '#EAB308', // yellow-500
  'football': '#EF4444' // red-500
};

// Domain Card Component - Now imported from separate file

// Domain Grid Skeleton Component
const DomainGridSkeleton = ({ count = 6, isFullscreen = false }) => (
  <div className={`grid justify-items-center ${
    isFullscreen
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }`}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="bg-gray-800 rounded-lg p-6 border border-white/20 animate-pulse w-full max-w-sm" style={{ height: '189px' }}>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-48"></div>
          </div>
          <div className="w-16 h-6 bg-gray-700 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

// No Results Component
const NoResults = ({ searchQuery }: { searchQuery: string }) => (
  <div className="text-center py-20">
    <h3 className="text-white text-xl font-bold mb-4">No domains found</h3>
    <p className="text-gray-400">No domains found matching &quot;{searchQuery}&quot;</p>
  </div>
);

// Load More Button Component
const LoadMoreButton = ({ onClick, text }: { onClick: () => void; text: string }) => (
  <div className="text-center mt-8">
    <button
      onClick={onClick}
      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
    >
      {text}
    </button>
  </div>
);

// Tab Navigation Component
const TabNavigation = ({ tabs, activeTab, setActiveTab }: { 
  tabs: Array<{ id: string; label: string; count: string }>; 
  activeTab: string; 
  setActiveTab: (tab: string) => void; 
}) => (
  <div className="flex items-end">
    {tabs.map((tab, index) => {
      const isActive = activeTab === tab.id;
      const zIndex = tabs.length - index;
      
      return (
        <button 
          key={tab.id}
          onClick={() => {
            console.log('Tab clicked:', tab.id);
            setActiveTab(tab.id);
          }}
          className={`flex items-center space-x-2 px-6 py-4 transition-all duration-200 rounded-t-lg relative -ml-2 hover:bg-gray-800/50 ${
            isActive ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{
            backgroundColor: isActive ? '#191919' : '#191919',
            boxShadow: '-5px 0px 10px 0px #00000080 inset',
            zIndex: zIndex,
            ...(isActive && {
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderTop: '1px solid rgba(255, 255, 255, 0.4)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.4)',
              borderBottom: '1px solid',
              borderImageSource: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)'
            })
          }}
        >
          <span className={`font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
            {tab.label}
          </span>
          <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
            {tab.count}
          </span>
        </button>
      );
    })}
  </div>
);

// Search Bar Component
const SearchBar = ({ searchQuery, setSearchQuery, placeholder = "Search domains..." }: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
}) => (
  <div className="relative">
    <input
      type="text"
      placeholder={placeholder}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 w-full lg:w-64"
    />
    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
    </svg>
  </div>
);

// Chat Domain Search Bar Component with dropdown results
const ChatDomainSearchBar = ({ 
  searchQuery, 
  setSearchQuery, 
  showResults, 
  setShowResults,
  domains,
  isLoading,
  onFocus,
  searchRef
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  domains: Name[];
  isLoading: boolean;
  onFocus: () => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
}) => (
  <div ref={searchRef} className="relative w-full lg:w-64">
    <input
      type="text"
      placeholder="Search domains to message..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onFocus={() => {
        setShowResults(true);
        onFocus();
      }}
      className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 w-full"
    />
    <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
    </svg>
    
    {/* Domain Search Results Dropdown */}
    {showResults && (searchQuery || domains.length > 0) && (
      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Searching domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-400 text-sm">
              {searchQuery ? `No domains found for &quot;${searchQuery}&quot;` : "Start typing to search domains"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {domains.slice(0, 10).map((domain) => (
              <button
                key={domain.name}
                onClick={() => {
                  console.log('🖱️ Domain dropdown clicked:', domain.name, domain.claimedBy);
                  // Domain clicked - could add navigation here
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-xs font-bold">
                    {domain.name.split('.')[1]?.slice(0, 2).toUpperCase() || 'DO'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {domain.name}
                  </div>
                  <div className="text-gray-400 text-xs truncate">
                    {domain.claimedBy ? `Owner: ${domain.claimedBy.split(':')[2]?.slice(0, 6)}...${domain.claimedBy.split(':')[2]?.slice(-4)}` : 'Available'}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// Domain Filters Component
const DomainFilters = ({ statusFilter, setStatusFilter, priceFilter, setPriceFilter, tldFilter, setTldFilter }: { 
  statusFilter: string; 
  setStatusFilter: (filter: string) => void; 
  priceFilter: string; 
  setPriceFilter: (filter: string) => void; 
  tldFilter: string; 
  setTldFilter: (filter: string) => void; 
}) => (
  <div className="flex flex-wrap items-center gap-4 mb-6">
    <div className="flex items-center space-x-4">
      <span className="text-white font-medium">Filter By:</span>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400 hover:border-gray-500 transition-colors"
        style={{
          backgroundColor: '#1F2937',
          color: '#FFFFFF'
        }}
      >
        <option value="all" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>All</option>
        <option value="listed" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>Listed</option>
        <option value="unlisted" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>Unlisted</option>
      </select>
      <select
        value={priceFilter}
        onChange={(e) => setPriceFilter(e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400 hover:border-gray-500 transition-colors"
        style={{
          backgroundColor: '#1F2937',
          color: '#FFFFFF'
        }}
      >
        <option value="all" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>All</option>
        <option value="price-low" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>Price: Low to High</option>
        <option value="price-high" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>Price: High to Low</option>
      </select>
      <select
        value={tldFilter}
        onChange={(e) => setTldFilter(e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400 hover:border-gray-500 transition-colors"
        style={{
          backgroundColor: '#1F2937',
          color: '#FFFFFF'
        }}
      >
        <option value="all" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>All TLDs</option>
        <option value="com" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.com</option>
        <option value="ai" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.ai</option>
        <option value="io" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.io</option>
        <option value="ape" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.ape</option>
        <option value="shib" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.shib</option>
        <option value="football" style={{ backgroundColor: '#1F2937', color: '#FFFFFF' }}>.football</option>
      </select>
    </div>
  </div>
);

// Portfolio Overview Component - commented out
// const PortfolioOverview = ({ ownedDomainsCount }: { ownedDomainsCount: number }) => (
//   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
//     <div
//       className="flex flex-col justify-between hover:scale-105 transition-transform w-full max-w-sm"
//       style={{
//         height: '189px',
//         borderRadius: '30px',
//         borderWidth: '1px',
//         opacity: 1,
//         paddingTop: '20px',
//         paddingRight: '16px',
//         paddingBottom: '20px',
//         paddingLeft: '16px',
//         gap: '20px',
//         backgroundColor: '#121212',
//         border: '1px solid',
//         borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
//         borderImageSlice: 1
//       }}
//     >
//       <div className="flex items-start justify-between mb-3">
//         <div className="flex items-center space-x-3 flex-1 min-w-0">
//           <div
//             className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
//             style={{ backgroundColor: '#EEEFFF29' }}
//           >
//             <span className="text-white text-xs font-bold">💰</span>
//           </div>
//           <div className="flex-1 min-w-0">
//             <h3
//               className="font-bold truncate font-space-mono"
//               style={{
//                 fontWeight: 700,
//                 fontSize: '16px',
//                 lineHeight: '100%',
//                 letterSpacing: '0%'
//               }}
//             >
//               <span className="text-white">Total Value</span>
//             </h3>
//           </div>
//         </div>
//         <div className="text-right flex-shrink-0 ml-2">
//           <p className="text-white text-sm font-semibold">0 ETH</p>
//           <p className="text-gray-400 text-xs">$0</p>
//         </div>
//       </div>
//
//       <div className="flex justify-between items-end">
//         <div className="space-y-1 flex-1 min-w-0">
//           <div className="flex items-center space-x-2">
//             <span
//               className="text-white text-xs px-2 py-1 rounded"
//               style={{ backgroundColor: '#1689DB3B' }}
//             >
//               Portfolio
//             </span>
//           </div>
//           <p className="text-gray-400 text-xs truncate">
//             Track your domain investments
//           </p>
//         </div>
//       </div>
//     </div>

//     <div
//       className="flex flex-col justify-between hover:scale-105 transition-transform w-full max-w-sm"
//       style={{
//         height: '189px',
//         borderRadius: '30px',
//         borderWidth: '1px',
//         opacity: 1,
//         paddingTop: '20px',
//         paddingRight: '16px',
//         paddingBottom: '20px',
//         paddingLeft: '16px',
//         gap: '20px',
//         backgroundColor: '#121212',
//         border: '1px solid',
//         borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
//         borderImageSlice: 1
//       }}
//     >
//       <div className="flex items-start justify-between mb-3">
//         <div className="flex items-center space-x-3 flex-1 min-w-0">
//           <div
//             className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
//             style={{ backgroundColor: '#EEEFFF29' }}
//           >
//             <span className="text-white text-xs font-bold">🌐</span>
//           </div>
//           <div className="flex-1 min-w-0">
//             <h3
//               className="font-bold truncate font-space-mono"
//               style={{
//                 fontWeight: 700,
//                 fontSize: '16px',
//                 lineHeight: '100%',
//                 letterSpacing: '0%'
//               }}
//             >
//               <span className="text-white">Total Domains</span>
//             </h3>
//           </div>
//         </div>
//         <div className="text-right flex-shrink-0 ml-2">
//           <p className="text-white text-sm font-semibold">{ownedDomainsCount}</p>
//           <p className="text-gray-400 text-xs">Owned</p>
//         </div>
//       </div>
//
//       <div className="flex justify-between items-end">
//         <div className="space-y-1 flex-1 min-w-0">
//           <div className="flex items-center space-x-2">
//             <span
//               className="text-white text-xs px-2 py-1 rounded"
//               style={{ backgroundColor: '#1689DB3B' }}
//             >
//               Collection
//             </span>
//           </div>
//           <p className="text-gray-400 text-xs truncate">
//             Your domain portfolio
//           </p>
//         </div>
//       </div>
//     </div>
//   </div>
// );

// Domain Grid Component
const DomainGrid = ({
  domains,
  formatPrice,
  getTldColor,
  onMessage,
  onTransactionSuccess,
  onBuy,
  onOffer,
  onList,
  onCancelListing,
  userAddress,
  onDomainClick,
  forceOwned = false,
  isFullscreen = false
}: {
  domains: Name[];
  formatPrice: (price: string, decimals: number) => string;
  getTldColor: (tld: string) => string;
  onMessage?: (domain: Name) => void;
  onTransactionSuccess?: (type: 'buy' | 'offer', domain: Name, result: unknown) => void;
  onBuy?: (domain: Name) => void;
  onOffer?: (domain: Name) => void;
  onList?: (domain: Name) => void;
  onCancelListing?: (domain: Name) => void;
  userAddress?: string;
  onDomainClick?: (domain: Name) => void;
  forceOwned?: boolean;
  isFullscreen?: boolean;
}) => (
  <div className={`grid justify-items-center ${
    isFullscreen
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }`}>
    {domains.map((domain) => (
      <DomainCard
        key={domain.name}
        domain={domain}
        formatPrice={formatPrice}
        getTldColor={getTldColor}
        onMessage={onMessage}
        onTransactionSuccess={onTransactionSuccess}
        onBuy={onBuy}
        onOffer={onOffer}
        onList={onList}
        onCancelListing={onCancelListing}
        userAddress={userAddress}
        onClick={onDomainClick}
        forceOwned={forceOwned}
      />
    ))}
  </div>
);

// Main Component
export default function DomainMarketplace() {
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatDomainSearchQuery, setChatDomainSearchQuery] = useState("");
  const [tldFilter, setTldFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [myspaceTab, setMyspaceTab] = useState("owned");
  const [showChatDomainSearch, setShowChatDomainSearch] = useState(false);

  // New state for enhanced features
  const [selectedDomain, setSelectedDomain] = useState<Name | null>(null);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedDomainFromOwned, setSelectedDomainFromOwned] = useState(false);
  const [offersActivityTab, setOffersActivityTab] = useState<'offers' | 'activity'>('offers');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showCheckingDM, setShowCheckingDM] = useState(false);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string>("");

  // State for listing modals
  const [showListModal, setShowListModal] = useState(false);
  const [showCancelListingModal, setShowCancelListingModal] = useState(false);
  const [domainToList, setDomainToList] = useState<Name | null>(null);

  // Ref for chat domain search dropdown
  const chatSearchRef = useRef<HTMLDivElement>(null);

  const { address } = useAccount();
  // Portfolio value formatting handled inline
  const { profile } = useUsername();
  const { client, setClient, connectXmtp, resetXmtp } = useXMTPContext();

  // Transaction success handler
  const handleTransactionSuccess = useCallback((type: 'buy' | 'offer', domain: Name, result: unknown) => {
    console.log(`${type} transaction successful for ${domain.name}:`, result);

    if (type === 'buy') {
      alert(`🎉 Successfully purchased ${domain.name}!\n\nTransaction completed. The domain is now yours.`);
    } else {
      alert(`💰 Successfully created offer for ${domain.name}!\n\nYour offer has been submitted and the owner will be notified.`);
    }

    // Optional: Refresh the domain list to show updated data
    // You can implement this by calling a refetch function if available
  }, []);

  // Memoized filter parameters for API calls
  // const browseFilterParams = useMemo(() => ({
  //   search: searchQuery,
  //   tlds: tldFilter === "all" ? [] : [tldFilter],
  //   listed: false,
  //   status: statusFilter === "all" ? undefined : statusFilter,
  //   sort: priceFilter === "all" ? undefined : priceFilter
  // }), [searchQuery, tldFilter, statusFilter, priceFilter]);

  // Browse domains hooks - separate calls for listed and unlisted when "all" is selected
  const {
    data: listedDomainsData,
    fetchNextPage: fetchNextListedPage,
    hasNextPage: hasNextListed,
    isLoading: isLoadingListed,
    error: listedError
  } = useNames(
    statusFilter === "all" ? 10 : 20, // take - split when showing all
    true, // listed = true
    searchQuery, // name
    tldFilter === "all" ? [] : [tldFilter] // tlds
  );

  const {
    data: unlistedDomainsData,
    fetchNextPage: fetchNextUnlistedPage,
    hasNextPage: hasNextUnlisted,
    isLoading: isLoadingUnlisted,
    error: unlistedError
  } = useNames(
    statusFilter === "all" ? 10 : 20, // take - split when showing all
    false, // listed = false
    searchQuery, // name
    tldFilter === "all" ? [] : [tldFilter] // tlds
  );

  // Combine or select the appropriate data based on filter
  const browseDomainsData = useMemo(() => {
    if (statusFilter === "listed") return listedDomainsData;
    if (statusFilter === "unlisted") return unlistedDomainsData;

    // For "all", combine both listed and unlisted
    if (!listedDomainsData && !unlistedDomainsData) return undefined;

    const combinedPages = [];
    const maxPages = Math.max(
      listedDomainsData?.pages?.length || 0,
      unlistedDomainsData?.pages?.length || 0
    );

    for (let i = 0; i < maxPages; i++) {
      const listedItems = listedDomainsData?.pages?.[i]?.items || [];
      const unlistedItems = unlistedDomainsData?.pages?.[i]?.items || [];
      const combinedItems = [...listedItems, ...unlistedItems];

      if (combinedItems.length > 0) {
        combinedPages.push({
          items: combinedItems,
          totalCount: (listedDomainsData?.pages?.[0]?.totalCount || 0) + (unlistedDomainsData?.pages?.[0]?.totalCount || 0),
          currentPage: i + 1,
          hasNextPage: (listedDomainsData?.pages?.[i]?.hasNextPage || false) || (unlistedDomainsData?.pages?.[i]?.hasNextPage || false)
        });
      }
    }

    return { pages: combinedPages };
  }, [statusFilter, listedDomainsData, unlistedDomainsData]);

  const fetchNextBrowsePage = useCallback(() => {
    if (statusFilter === "listed") return fetchNextListedPage();
    if (statusFilter === "unlisted") return fetchNextUnlistedPage();
    // For "all", fetch both
    if (hasNextListed) fetchNextListedPage();
    if (hasNextUnlisted) fetchNextUnlistedPage();
  }, [statusFilter, fetchNextListedPage, fetchNextUnlistedPage, hasNextListed, hasNextUnlisted]);

  const hasNextBrowse = statusFilter === "listed" ? hasNextListed :
                       statusFilter === "unlisted" ? hasNextUnlisted :
                       hasNextListed || hasNextUnlisted;

  const isLoadingBrowse = statusFilter === "listed" ? isLoadingListed :
                         statusFilter === "unlisted" ? isLoadingUnlisted :
                         isLoadingListed || isLoadingUnlisted;

  const browseError = statusFilter === "listed" ? listedError :
                     statusFilter === "unlisted" ? unlistedError :
                     listedError || unlistedError;

  // Chat domain search hook
  const { 
    data: chatDomainSearchData, 
    // fetchNextPage: fetchNextChatDomainPage, 
    // hasNextPage: hasNextChatDomain, 
    isLoading: isLoadingChatDomains
    // error: chatDomainError
  } = useNames(
    20, // take
    false, // listed
    chatDomainSearchQuery, // name
    [] // tlds
  );

  // My Space hooks
  const {
    data: ownedDomainsData,
    isLoading: isLoadingOwned,
    fetchNextPage: fetchNextOwnedPage,
    hasNextPage: hasNextOwned
  } = useOwnedNames(
    address || "",
    30,
    selectedCategory === "all" ? null : [selectedCategory]
  );

  const {
    data: watchedDomainsData,
    isLoading: isLoadingWatched,
    fetchNextPage: fetchNextWatchedPage,
    hasNextPage: hasNextWatched
  } = useSelectedNames(
    profile?.watchUsernames ?? [],
    30,
    selectedCategory === "all" ? null : [selectedCategory]
  );

  // Memoized domain processing with price sorting
  const browseDomains = useMemo(() => {
    if (!browseDomainsData?.pages) return [];

    let domains = browseDomainsData.pages.flatMap(page => page.items);

    // Apply client-side price sorting
    if (priceFilter !== "all") {
      domains = [...domains].sort((a, b) => {
        const getPriceValue = (domain: Name) => {
          const listing = domain.tokens?.[0]?.listings?.[0];
          if (!listing) return 0; // Unlisted domains get 0 price for sorting
          return parseFloat(listing.price) / Math.pow(10, listing.currency.decimals);
        };

        const priceA = getPriceValue(a);
        const priceB = getPriceValue(b);

        if (priceFilter === "price-low") {
          // Low to High: unlisted domains (price = 0) first, then by ascending price
          if (priceA === 0 && priceB === 0) return 0;
          if (priceA === 0) return -1;
          if (priceB === 0) return 1;
          return priceA - priceB;
        } else if (priceFilter === "price-high") {
          // High to Low: by descending price, unlisted domains (price = 0) last
          if (priceA === 0 && priceB === 0) return 0;
          if (priceA === 0) return 1;
          if (priceB === 0) return -1;
          return priceB - priceA;
        }
        return 0;
      });
    }

    return domains;
  }, [browseDomainsData, priceFilter]);

  const totalBrowseCount = browseDomainsData?.pages[0]?.totalCount || 0;

  // Chat domain search results
  const chatSearchDomains = useMemo(() => {
    if (!chatDomainSearchData?.pages) return [];

    return chatDomainSearchData.pages.flatMap(page => page.items);
  }, [chatDomainSearchData]);

  // Detailed domain data when a domain is selected
  const {
    data: selectedDomainData,
    isLoading: isLoadingDomainData,
    error: domainDataError,
    refetch: refetchDomainData
  } = useName(selectedDomain?.name || "");

  const {
    data: selectedDomainStats
  } = useNameStats(selectedDomainData?.tokens?.[0]?.tokenId || "");

  // Fetch offers for selected domain
  const {
    data: offersData,
    isLoading: isLoadingOffers,
    error: offersError
  } = useOffers(20, selectedDomainData?.tokens?.[0]?.tokenId || "");

  // Process offers data
  const offers = useMemo(() => {
    if (!offersData?.pages) return [];
    return offersData.pages.flatMap(page => page.items);
  }, [offersData]);

  // Calculate highest offer
  const highestOffer = useMemo(() => {
    if (!offers.length) return null;
    return offers.reduce((highest, current) => {
      const currentValue = parseFloat(current.price) / Math.pow(10, current.currency.decimals);
      const highestValue = parseFloat(highest.price) / Math.pow(10, highest.currency.decimals);
      return currentValue > highestValue ? current : highest;
    });
  }, [offers]);

  // Keep track of previous address to detect actual changes
  const prevAddressRef = useRef<string | undefined>(address);

  // Handle wallet address changes (switches between accounts)
  useEffect(() => {
    const currentAddress = address;
    const prevAddress = prevAddressRef.current;

    // Detect actual address change (not just undefined to address or vice versa)
    if (prevAddress && currentAddress && prevAddress !== currentAddress) {
      console.log('🔄 Address switched from', prevAddress, 'to', currentAddress);

      if (activeTab === "myspace" || activeTab === "chat") {
        console.log('🔄 Reloading data for myspace/chat tabs due to address switch');

        // Reset myspace tab states
        if (activeTab === "myspace") {
          setMyspaceTab("owned");
          setSelectedCategory("all");
        }

        // Reset chat states and force XMTP reconnection
        if (activeTab === "chat") {
          console.log('🔄 Resetting XMTP for address switch:', currentAddress);

          // Reset XMTP context completely
          resetXmtp();

          // Reset chat UI states
          setChatSearchQuery("");
          setChatDomainSearchQuery("");
          setShowChatDomainSearch(false);

          // Trigger reconnection after a brief delay to ensure clean state
          setTimeout(() => {
            console.log('🔄 Reconnecting XMTP for new address:', currentAddress);
            connectXmtp();
          }, 200);
        }

        // Close any open modals related to these tabs
        setShowMessaging(false);
        setShowCheckingDM(false);
        setSelectedUserAddress("");
      }
    }

    // Update the ref with current address
    prevAddressRef.current = currentAddress;
  }, [address, activeTab, resetXmtp, connectXmtp]);

  // Handle wallet disconnect (when address becomes undefined)
  useAccountEffect({
    onDisconnect() {
      console.log('🔄 Wallet disconnected, clearing all data');

      // Reset XMTP completely
      resetXmtp();

      // Reset all states when wallet disconnects
      setMyspaceTab("owned");
      setSelectedCategory("all");
      setChatSearchQuery("");
      setChatDomainSearchQuery("");
      setShowChatDomainSearch(false);
      setShowMessaging(false);
      setShowCheckingDM(false);
      setSelectedUserAddress("");
    }
  });

  // Debug logging
  useEffect(() => {
    console.log('🔍 Browse domains status:', {
      isLoading: isLoadingBrowse,
      error: browseError?.message,
      domainsCount: browseDomains.length,
      apiUrl: process.env.NEXT_PUBLIC_DOMA_GRAPHQL_URL
    });
  }, [isLoadingBrowse, browseError, browseDomains.length]);
  console.log('Browse Domains Debug:', {
    browseDomainsData,
    browseDomains: browseDomains.length,
    totalBrowseCount,
    isLoadingBrowse,
    browseError,
    searchQuery,
    tldFilter
  });

  console.log('Offers Debug:', {
    tokenId: selectedDomainData?.tokens?.[0]?.tokenId,
    offersData,
    offers: offers.length,
    highestOffer,
    isLoadingOffers,
    offersError
  });
  const ownedDomainsCount = ownedDomainsData?.pages?.[0]?.totalCount ?? 0;
  const watchedDomainsCount = watchedDomainsData?.pages?.[0]?.totalCount ?? 0;

  // Calculate portfolio value from owned domains' listings
  const portfolioValue = useMemo(() => {
    if (!ownedDomainsData?.pages) return 0;

    let totalValue = 0;
    ownedDomainsData.pages.forEach(page => {
      page.items.forEach(domain => {
        const listing = domain.tokens?.[0]?.listings?.[0];
        if (listing) {
          // Convert price from wei to readable format and calculate USD value
          const priceInTokens = parseFloat(listing.price) / Math.pow(10, listing.currency.decimals);
          const usdValue = priceInTokens * (listing.currency.usdExchangeRate || 0);
          totalValue += usdValue;
        }
      });
    });

    return totalValue;
  }, [ownedDomainsData]);

  // Format price utility
  const formatPrice = useCallback((price: string, decimals: number) => {
    const value = parseFloat(price) / Math.pow(10, decimals);
    return value.toFixed(4);
  }, []);

  // Get TLD color utilities
  const getTldColor = useCallback((tld: string) => {
    return TLD_COLORS[tld.toLowerCase()] || '#6B7280'; // gray-500
  }, []);

  // Enhanced action handlers
  const handleDomainClick = useCallback((domain: Name) => {
    setSelectedDomain(domain);
    setSelectedDomainFromOwned(false);
    setActiveTab('details');
  }, []);

  const handleOwnedDomainClick = useCallback((domain: Name) => {
    setSelectedDomain(domain);
    setSelectedDomainFromOwned(true);
    setActiveTab('details');
  }, []);

  const handleMessage = useCallback(async (domain: Name) => {
    if (!domain.claimedBy) {
      alert("This domain is not owned by anyone yet.");
      return;
    }

    // Extract address from CAIP-10 format (eip155:1:0x...)
    const ownerAddress = domain.claimedBy.split(':')[2];
    if (!ownerAddress) {
      alert("Invalid owner address format.");
      return;
    }

    console.log('Starting conversation with domain owner:', ownerAddress);
    
    // Set the owner address and switch to chat tab immediately
    setSelectedUserAddress(ownerAddress);
    setActiveTab("chat");
    
    // Close any open modals
    setShowDetailPage(false);
  }, []);



  const handleBackToMarketplace = useCallback(() => {
    setShowDetailPage(false);
    setSelectedDomain(null);
  }, []);

  const handleBuy = useCallback((domain: Name) => {
    setSelectedDomain(domain);
    setShowActionModal(true);
  }, []);

  const handleOffer = useCallback((domain: Name) => {
    setSelectedDomain(domain);
    setShowActionModal(true);
  }, []);

  const handleList = useCallback((domain: Name) => {
    setDomainToList(domain);
    setShowListModal(true);
  }, []);

  const handleCancelListing = useCallback((domain: Name) => {
    setDomainToList(domain);
    setShowCancelListingModal(true);
  }, []);

  const handleListingSuccess = useCallback((domain: Name) => {
    // Close modal and clear state - data will refresh automatically
    setShowListModal(false);
    setDomainToList(null);
    console.log(`Domain ${domain.name} listed successfully`);
  }, []);

  const handleCancelListingSuccess = useCallback((domain: Name) => {
    // Close modal and clear state - data will refresh automatically
    setShowCancelListingModal(false);
    setDomainToList(null);
    console.log(`Listing for ${domain.name} canceled successfully`);
  }, []);

  const handleDMCreated = useCallback((dmId: string, userAddress: string) => {
    console.log('DM created successfully:', { dmId, userAddress });
    // Switch to chat tab to show the new conversation
    setActiveTab("chat");
    // You can add additional logic here to highlight the new conversation
  }, []);

  // Handle manual conversation selection - clear selectedUserAddress to prevent auto-switching back
  const handleManualConversationSelect = useCallback(() => {
    console.log('🔄 User manually selected a conversation, clearing selectedUserAddress');
    setSelectedUserAddress('');
    setShowCheckingDM(false); // Also close any open checking dialog
  }, []);

  // Handle domain search in chat tab (following domainline pattern)
  const handleChatDomainMessage = useCallback((domain: Name) => {
    if (!domain.claimedBy) {
      alert("This domain is not owned by anyone yet.");
      return;
    }

    // Extract address from CAIP-10 format (eip155:1:0x...)
    const ownerAddress = domain.claimedBy.split(':')[2];
    if (!ownerAddress) {
      alert("Invalid owner address format.");
      return;
    }

    console.log('🔄 Domain clicked for messaging:', {
      domainName: domain.name,
      ownerAddress: ownerAddress
    });
    
    // Set the owner address and show checking dialog (domainline pattern)
    setSelectedUserAddress(ownerAddress);
    setShowCheckingDM(true);
    setChatDomainSearchQuery('');
    setShowChatDomainSearch(false);
    
    console.log('✅ Opening XMTP check dialog for user:', ownerAddress);
  }, []);

  // Click outside handler for chat domain search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatSearchRef.current && !chatSearchRef.current.contains(event.target as Node)) {
        setShowChatDomainSearch(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear selectedUserAddress when switching away from chat tab
  useEffect(() => {
    if (activeTab !== "chat") {
      console.log('🔄 Switched away from chat tab, clearing selectedUserAddress');
      setSelectedUserAddress('');
      setShowCheckingDM(false);
    }
  }, [activeTab]);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // ESC key handler to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when in fullscreen
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  // Auto-switch from details tab to browse tab if no domain is selected
  useEffect(() => {
    if (activeTab === "details" && !selectedDomain) {
      setActiveTab("browse");
    }
  }, [activeTab, selectedDomain]);

  // Tab definitions - only show Domain Details tab when a domain is selected
  const tabs = [
    ...(selectedDomain ? [{ id: "details", label: "Domain Details", count: "1" }] : []),
    { id: "browse", label: "Browse Domains", count: totalBrowseCount > 0 ? totalBrowseCount.toString() : "..." },
    { id: "myspace", label: "My Space", count: "12" },
    { id: "chat", label: "Chat", count: "5" }
  ];

  // Render functions for different tabs
  const renderTabContent = (isFullscreenMode = false) => {
    switch (activeTab) {
      case "details":
        if (!selectedDomain) {
          return (
            <div className="text-center py-20">
              <div className="text-8xl mb-6">🔍</div>
              <h3 className="text-white text-2xl font-bold mb-4">Domain Details</h3>
              <p className="text-gray-400">Click on any domain card to view detailed information</p>
              <p className="text-sm text-gray-500 mt-2">Browse domains, view pricing, and make offers all in one place</p>
            </div>
          );
        }

        // Use detailed domain data if available, fallback to basic domain data
        const domainToShow = selectedDomainData || selectedDomain;
        const token = domainToShow.tokens?.[0];
        const listing = token?.listings?.[0];
        const isListed = !!listing;
        const tld = domainToShow.name.split('.').pop() || '';
        const isOwned = !!domainToShow.claimedBy;

        if (isLoadingDomainData) {
          return (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white">Loading domain details...</p>
              </div>
            </div>
          );
        }

        if (domainDataError) {
          return (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-red-400 text-xl font-bold mb-4">Error Loading Domain Details</h3>
              <p className="text-gray-400 mb-6">{domainDataError.message}</p>
              <button
                onClick={() => {
                  refetchDomainData();
                }}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Retry
              </button>
            </div>
          );
        }

        return (
          <div className="space-y-8">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedDomain(null);
                  setActiveTab('browse');
                }}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Browse</span>
              </button>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                {isListed ? (
                  <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                    🟢 Listed
                  </span>
                ) : isOwned ? (
                  <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium">
                    🟡 Owned
                  </span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                    🔵 Available
                  </span>
                )}
              </div>
            </div>

            {/* Domain Details Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Main Content - Left Side */}
              <div className="xl:col-span-2 space-y-6">
                {/* Domain Header */}
                <div className="flex items-center space-x-4 p-6 rounded-2xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid',
                  borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
                  borderImageSlice: 1
                }}>
                  <DomainAvatar
                    domain={domainToShow.name}
                    className="w-16 h-16"
                    size={64}
                  />
                  <div>
                    <h1 className="text-4xl font-bold font-space-mono">
                      <span className="text-white">{domainToShow.name.split('.')[0]}</span>
                      <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                    </h1>
                    <p className="text-gray-400 text-lg mt-2">
                      {isOwned ? 'Owned Domain' : 'Available Domain'}
                    </p>
                  </div>
                </div>

                {/* Price & Actions Card */}
                {isListed && (
                  <div className="p-6 rounded-2xl" style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                      <div>
                        <div className="text-3xl font-bold text-white">
                          {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                        </div>
                        <div className="text-sm text-gray-400 mt-1">
                          ~${((parseFloat(formatPrice(listing.price, listing.currency.decimals)) * (listing.currency.usdExchangeRate || 2500))).toFixed(2)} USD
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {listing.orderbook} • Listed
                        </div>
                      </div>

                      {selectedDomainFromOwned ? (
                        // Actions for owned listed domains
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-green-400">✓</span>
                              <span className="text-green-400 font-medium text-sm">You own this domain</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCancelListing(domainToShow)}
                            className="flex items-center justify-center space-x-2 bg-red-600 text-white py-3 px-6 rounded-xl hover:bg-red-700 transition-all transform hover:scale-105"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                            <span>Cancel Listing</span>
                          </button>
                        </div>
                      ) : (
                        // Actions for non-owned listed domains
                        <div className="flex flex-col sm:flex-row gap-3">
                          {isOwned && (
                            <button
                              onClick={() => handleMessage(domainToShow)}
                              className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all transform hover:scale-105"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                              </svg>
                              <span>Message Owner</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleBuy(domainToShow)}
                            className="flex items-center justify-center space-x-2 bg-purple-600 text-white py-3 px-6 rounded-xl hover:bg-purple-700 transition-all transform hover:scale-105"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                            </svg>
                            <span>Buy Now</span>
                          </button>

                          <button
                            onClick={() => handleOffer(domainToShow)}
                            className="flex items-center justify-center space-x-2 border border-purple-400 text-purple-400 py-3 px-6 rounded-xl hover:bg-purple-400/10 transition-all transform hover:scale-105"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                            </svg>
                            <span>Make Offer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Domain Information */}
                <div className="p-6 rounded-xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 className="text-xl font-bold mb-4">Domain Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                      <span className="text-gray-400">Domain Name</span>
                      <span className="font-medium text-white">{domainToShow.name}</span>
                    </div>
                    {isOwned && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-gray-400">Owner</span>
                        <span className="font-medium text-white font-mono text-sm">
                          {domainToShow.claimedBy?.split(':')[2]?.substring(0, 6)}...{domainToShow.claimedBy?.split(':')[2]?.slice(-4)}
                        </span>
                      </div>
                    )}
                    {domainToShow.expiresAt && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-gray-400">Expires At</span>
                        <span className="font-medium text-white">
                          {(() => {
                            const now = new Date();
                            const expires = new Date(domainToShow.expiresAt);
                            const diffTime = expires.getTime() - now.getTime();
                            const diffYears = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 365));
                            return diffYears > 1 ? `in ${diffYears} years` : `in ${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} days`;
                          })()}
                        </span>
                      </div>
                    )}
                    {domainToShow.tokenizedAt && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-gray-400">Tokenized At</span>
                        <span className="font-medium text-white">
                          {(() => {
                            const tokenizedDate = new Date(domainToShow.tokenizedAt);
                            const now = new Date();
                            const diffTime = now.getTime() - tokenizedDate.getTime();
                            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays > 0 ? `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago` : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                      <span className="text-gray-400">Transfer Lock</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          {domainToShow.transferLock ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className={domainToShow.transferLock ? 'text-green-400' : 'text-red-400'}>
                          {domainToShow.transferLock ? '🔒' : '🔓'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                      <span className="text-gray-400">Fractionalized</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-white">
                          {domainToShow.isFractionalized ? 'Yes' : 'No'}
                        </span>
                        <span className={domainToShow.isFractionalized ? 'text-green-400' : 'text-gray-400'}>
                          {domainToShow.isFractionalized ? '✅' : '❌'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tokens Section */}
                {domainToShow.tokens && domainToShow.tokens.length > 0 && (
                  <div className="p-6 rounded-xl" style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h3 className="text-xl font-bold mb-4">Tokens</h3>
                    <div className="space-y-4">
                      {domainToShow.tokens.map((token, index) => (
                        <div key={index} className="border border-gray-700 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Network</span>
                              <span className="font-medium text-white">{token.chain?.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Token ID</span>
                              <span className="font-medium text-white font-mono text-xs">
                                {token.tokenId?.substring(0, 12)}...
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Owner</span>
                              <span className="font-medium text-white font-mono text-sm">
                                {token.ownerAddress?.split(':')[2]?.substring(0, 6)}...{token.ownerAddress?.split(':')[2]?.slice(-4)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Created</span>
                              <span className="font-medium text-white">
                                {token.createdAt ? (() => {
                                  const createdDate = new Date(token.createdAt);
                                  const now = new Date();
                                  const diffTime = now.getTime() - createdDate.getTime();
                                  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                                  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                  return diffDays > 0 ? `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago` : `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                                })() : 'Unknown'}
                              </span>
                            </div>
                          </div>

                          {/* Active Listings */}
                          {token.listings && token.listings.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-700">
                              <h4 className="font-semibold mb-2 text-white">Active Listings</h4>
                              <div className="space-y-2">
                                {token.listings.map((listing, listingIndex) => (
                                  <div key={listingIndex} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-400">Orderbook: {listing.orderbook}</span>
                                    <span className="font-medium text-white">
                                      {formatPrice(listing.price, listing.currency.decimals)} {listing.currency.symbol}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Registrar Section */}
                {domainToShow.registrar && (
                  <div className="p-6 rounded-xl" style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h3 className="text-xl font-bold mb-4">Registrar</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                        <span className="text-gray-400">Name</span>
                        <span className="font-medium text-white">{domainToShow.registrar.name}</span>
                      </div>
                      {domainToShow.registrar.ianaId && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                          <span className="text-gray-400">IANA ID</span>
                          <span className="font-medium text-white">{domainToShow.registrar.ianaId}</span>
                        </div>
                      )}
                      {domainToShow.registrar.websiteUrl && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-400">Website</span>
                          <a
                            href={domainToShow.registrar.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Visit
                          </a>
                        </div>
                      )}
                      {domainToShow.claimedBy && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-400">Owner</span>
                          <span className="font-medium text-white font-mono text-sm">
                            {domainToShow.claimedBy.split(':')[2]?.substring(0, 6)}...{domainToShow.claimedBy.split(':')[2]?.slice(-4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Offers & Recent Activity */}
                <div className="p-6 rounded-xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div className="flex space-x-1 mb-6">
                    <button
                      onClick={() => setOffersActivityTab('offers')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        offersActivityTab === 'offers'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      Offers
                    </button>
                    <button
                      onClick={() => setOffersActivityTab('activity')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        offersActivityTab === 'activity'
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      Recent Activity
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-3">
                    {offersActivityTab === 'offers' ? (
                      // Offers Tab Content
                      <>
                        {isLoadingOffers ? (
                          <div className="text-center py-8">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-gray-400 text-sm">Loading offers...</p>
                          </div>
                        ) : offersError ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">⚠️</div>
                            <h4 className="font-medium text-red-400 mb-2">Error Loading Offers</h4>
                            <p className="text-gray-400 text-sm">{offersError.message}</p>
                          </div>
                        ) : offers.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">💰</div>
                            <h4 className="font-medium text-white mb-2">No Offers Yet</h4>
                            <p className="text-gray-400 text-sm">
                              Be the first to make an offer on this domain
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {offers.slice(0, 5).map((offer, index) => (
                              <div key={offer.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-purple-400 text-xs font-bold">
                                      {offer.offererAddress.slice(2, 4).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-medium">
                                      {formatPrice(offer.price, offer.currency.decimals)} {offer.currency.symbol}
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                      {offer.offererAddress.slice(0, 6)}...{offer.offererAddress.slice(-4)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-400 text-xs">
                                    {(() => {
                                      const createdDate = new Date(offer.createdAt);
                                      const now = new Date();
                                      const diffTime = now.getTime() - createdDate.getTime();
                                      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                      return diffDays > 0 ? `${diffDays}d ago` : `${diffHours}h ago`;
                                    })()}
                                  </div>
                                  {index === 0 && offers.length > 1 && (
                                    <span className="text-green-400 text-xs font-medium">Highest</span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {offers.length > 5 && (
                              <div className="text-center py-2">
                                <span className="text-gray-400 text-sm">
                                  +{offers.length - 5} more offers
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      // Recent Activity Tab Content
                      <>
                        {domainToShow.activities && domainToShow.activities.length > 0 ? (
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {domainToShow.activities.map((activity, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-blue-400 text-xs font-bold">
                                      {activity.type === 'TOKENIZED' ? '🔗' :
                                       activity.type === 'CLAIMED' ? '👤' :
                                       activity.type === 'RENEWED' ? '🔄' :
                                       activity.type === 'DETOKENIZED' ? '🔓' : '📝'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-white text-sm font-medium">
                                      {activity.type}
                                    </div>
                                    <div className="text-gray-400 text-xs">
                                      {activity.sld}.{activity.tld}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-gray-400 text-xs">
                                    {(() => {
                                      const activityDate = new Date(activity.createdAt);
                                      const now = new Date();
                                      const diffTime = now.getTime() - activityDate.getTime();
                                      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                      return diffDays > 0 ? `${diffDays}d ago` : `${diffHours}h ago`;
                                    })()}
                                  </div>
                                  {activity.txHash && (
                                    <div className="text-gray-500 text-xs">
                                      {activity.txHash.slice(0, 6)}...{activity.txHash.slice(-4)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="text-4xl mb-2">📈</div>
                            <h4 className="font-medium text-white mb-2">No Recent Activity</h4>
                            <p className="text-gray-400 text-sm">
                              No recent domain activity found
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar - Right Side */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="p-6 rounded-xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 className="text-lg font-bold mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className="text-white">{isListed ? 'Listed' : isOwned ? 'Owned' : 'Available'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Length</span>
                      <span className="text-white">{domainToShow.name.split('.')[0].length} chars</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Extension</span>
                      <span style={{ color: getTldColor(tld) }}>.{tld}</span>
                    </div>
                    {selectedDomainStats && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Offers</span>
                        <span className="text-white">{selectedDomainStats.activeOffers || 0}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons for Non-Listed */}
                {!isListed && (
                  <div className="p-6 rounded-xl" style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h3 className="text-lg font-bold mb-4">Actions</h3>
                    {selectedDomainFromOwned ? (
                      // Actions for owned domains
                      <div className="space-y-3">
                        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-400">✓</span>
                            <span className="text-green-400 font-medium text-sm">You own this domain</span>
                          </div>
                        </div>
                        {isListed ? (
                          <button
                            onClick={() => handleCancelListing(domainToShow)}
                            className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3 px-6 rounded-xl hover:bg-red-700 transition-all"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                            </svg>
                            <span>Cancel Listing</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleList(domainToShow)}
                            className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                            </svg>
                            <span>List Domain</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      // Actions for non-owned domains
                      <div className="space-y-3">
                        {isOwned && (
                          <button
                            onClick={() => handleMessage(domainToShow)}
                            className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-all"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                            </svg>
                            <span>Message Owner</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOffer(domainToShow)}
                          className="w-full flex items-center justify-center space-x-2 border border-purple-400 text-purple-400 py-3 px-6 rounded-xl hover:bg-purple-400/10 transition-all"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                          </svg>
                          <span>{isOwned ? 'Make Offer' : 'Claim Domain'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Domain Owner */}
                {isOwned && (
                  <div className="p-6 rounded-xl" style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <h3 className="text-lg font-bold mb-4">Domain Owner</h3>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xl">👤</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white font-mono text-sm">
                          {domainToShow.claimedBy?.split(':')[2]?.substring(0, 8)}...
                        </div>
                        <div className="text-xs text-gray-400">Domain Owner</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleMessage(domainToShow)}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                      </svg>
                      <span>Send Message</span>
                    </button>
                  </div>
                )}

                {/* Highest Offer */}
                <div className="p-6 rounded-xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 className="text-lg font-bold mb-4">Highest Offer</h3>
                  <div className="text-center py-4">
                    {isLoadingOffers ? (
                      <div className="text-center">
                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm text-gray-400">Loading...</div>
                      </div>
                    ) : highestOffer ? (
                      <>
                        <div className="text-2xl font-bold text-white mb-1">
                          {formatPrice(highestOffer.price, highestOffer.currency.decimals)} {highestOffer.currency.symbol}
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                          ~${((parseFloat(formatPrice(highestOffer.price, highestOffer.currency.decimals)) * (highestOffer.currency.usdExchangeRate || 2500))).toFixed(2)} USD
                        </div>
                        <div className="text-xs text-gray-500">
                          by {highestOffer.offererAddress.slice(0, 6)}...{highestOffer.offererAddress.slice(-4)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-white mb-1">--</div>
                        <div className="text-sm text-gray-400">No offers yet</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Community Actions */}
                <div className="p-6 rounded-xl" style={{
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 className="text-lg font-bold mb-4">Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full flex items-center space-x-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-700/50">
                      <span className="text-xl">📊</span>
                      <span>View Analytics</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-700/50">
                      <span className="text-xl">🔗</span>
                      <span>Share Domain</span>
                    </button>
                    <button className="w-full flex items-center space-x-3 text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-gray-700/50">
                      <span className="text-xl">⭐</span>
                      <span>Add to Watchlist</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "browse":
        return (
          <div className="space-y-6">
            {/* Browse Domains Results */}
            <div className="space-y-4">
              {browseError ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-red-400 text-xl font-bold mb-4">Error Loading Domains</h3>
                  <p className="text-gray-400 mb-4">{browseError.message || 'Failed to fetch'}</p>
                  <p className="text-gray-500 text-sm mb-6">Check your API configuration and try again</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => {
                        // Switch to details tab to test that functionality
                        setActiveTab('details');
                      }}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Test Details View
                    </button>
                  </div>
                  <div className="mt-4 text-xs text-gray-600">
                    API: {process.env.NEXT_PUBLIC_DOMA_GRAPHQL_URL || 'Not configured'}
                  </div>
                </div>
              ) : !searchQuery && browseDomains.length === 0 && !isLoadingBrowse ? (
                <div className="text-center py-10">
                  <h3 className="text-white text-xl font-bold mb-2">Discover Domains</h3>
                  <p className="text-gray-400">Search for available domains or browse the marketplace</p>
                  <p className="text-gray-500 text-sm mt-2">Try searching for &quot;crypto&quot;, &quot;nft&quot;, or any domain name</p>
                </div>
              ) : isLoadingBrowse ? (
                <DomainGridSkeleton count={6} isFullscreen={isFullscreenMode} />
              ) : browseDomains.length === 0 && searchQuery ? (
                <NoResults searchQuery={searchQuery} />
              ) : (
                <>
                  <DomainGrid
                    domains={browseDomains}
                    formatPrice={formatPrice}
                    getTldColor={getTldColor}
                    onMessage={handleMessage}
                    onTransactionSuccess={handleTransactionSuccess}
                    onBuy={handleBuy}
                    onOffer={handleOffer}
                    onList={handleList}
                    onCancelListing={handleCancelListing}
                    userAddress={address}
                    onDomainClick={handleDomainClick}
                    isFullscreen={isFullscreenMode}
                  />
                  
                  {hasNextBrowse && (
                    <LoadMoreButton onClick={fetchNextBrowsePage} text="Load More Domains" />
                  )}
                </>
              )}
            </div>
          </div>
        );
      case "myspace":
        return (
          <div className="space-y-8">
            {/* Check if wallet is connected */}
            {!address ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-6">🚀</div>
                <h3 className="text-white text-3xl font-bold mb-4">Welcome to Your Space</h3>
                <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">Connect your wallet to access your domain portfolio, track performance, and manage your digital assets.</p>
                <button className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-purple-500/25">
                  Connect Wallet
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Modern Portfolio Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 rounded-2xl p-6 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">🏠</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-400">{ownedDomainsCount}</span>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">Owned Domains</h3>
                    <p className="text-gray-400 text-sm">Your digital real estate</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-900/20 to-blue-600/10 rounded-2xl p-6 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">👀</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-400">{watchedDomainsCount}</span>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">Watchlist</h3>
                    <p className="text-gray-400 text-sm">Domains you&apos;re tracking</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-900/20 to-green-600/10 rounded-2xl p-6 border border-green-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">📈</span>
                      </div>
                      <span className="text-2xl font-bold text-green-400">
                        ${portfolioValue >= 1000 ?
                          (portfolioValue / 1000).toFixed(3) + 'K' :
                          portfolioValue.toFixed(2)
                        }
                      </span>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-1">Portfolio Value</h3>
                    <p className="text-gray-400 text-sm">Total estimated value</p>
                  </div>
                </div>

                {/* Modern Tab Navigation */}
                <div className="flex space-x-2 bg-gray-800/50 p-2 rounded-2xl">
                  <button
                    onClick={() => setMyspaceTab("owned")}
                    className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl transition-all duration-300 ${
                      myspaceTab === "owned" 
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-lg">🏠</span>
                    <span className="font-medium">My Domains</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      myspaceTab === "owned" 
                        ? 'bg-white/20 text-white' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {ownedDomainsCount}
                    </span>
                  </button>
                  <button
                    onClick={() => setMyspaceTab("watchlist")}
                    className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl transition-all duration-300 ${
                      myspaceTab === "watchlist" 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-lg">👀</span>
                    <span className="font-medium">Watchlist</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      myspaceTab === "watchlist" 
                        ? 'bg-white/20 text-white' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {watchedDomainsCount}
                    </span>
                  </button>
                </div>

                {/* Content based on active tab */}
                {myspaceTab === "owned" ? (
                  <div className="space-y-6">
                    {/* Modern Filters */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                      <div className="flex items-center space-x-4">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                        >
                          <option value="all">All TLDs</option>
                          <option value="com">com</option>
                          <option value="ai">ai</option>
                          <option value="io">io</option>
                          <option value="football">football</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-400">Total:</span>
                        <span className="text-sm font-medium text-purple-400">
                          {ownedDomainsCount} domains
                        </span>
                      </div>
                    </div>

                    {/* Owned Domains Grid */}
                    {isLoadingOwned ? (
                      <DomainGridSkeleton count={6} isFullscreen={isFullscreenMode} />
                    ) : ownedDomainsCount === 0 ? (
                      <div className="text-center py-16 bg-gray-800/20 rounded-2xl border border-gray-700/50">
                        <div className="text-8xl mb-6">🏠</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Your Domain Portfolio is Empty</h3>
                        <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">Start building your digital real estate empire by acquiring your first domain!</p>
                        <button
                          onClick={() => setActiveTab("browse")}
                          className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-purple-500/25"
                        >
                          🚀 Browse Domains
                        </button>
                      </div>
                      ) : (
                        <>
                          <DomainGrid
                            domains={ownedDomainsData?.pages?.flatMap(p => p.items) || []}
                            formatPrice={formatPrice}
                                    getTldColor={getTldColor}
                            onMessage={handleMessage}
                            onTransactionSuccess={handleTransactionSuccess}
                            onBuy={handleBuy}
                            onOffer={handleOffer}
                            onList={handleList}
                            onCancelListing={handleCancelListing}
                            userAddress={address}
                            onDomainClick={handleOwnedDomainClick}
                            forceOwned={true}
                            isFullscreen={isFullscreenMode}
                          />
                          {hasNextOwned && (
                            <LoadMoreButton onClick={fetchNextOwnedPage} text="Load More Domains" />
                          )}
                        </>
                      )}
                    </div>
                ) : myspaceTab === "watchlist" ? (
                  <div className="space-y-6">
                    {/* Modern Watchlist Header */}
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-900/20 to-blue-600/10 rounded-2xl border border-blue-500/20">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2">👀 Watchlist</h3>
                        <p className="text-gray-400">Monitor domains you&apos;re interested in and track their availability</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("browse")}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
                      >
                        <span className="text-lg">➕</span>
                        Add to Watchlist
                      </button>
                    </div>

                    {/* Watched Domains */}
                    {isLoadingWatched ? (
                      <DomainGridSkeleton count={6} isFullscreen={isFullscreenMode} />
                    ) : watchedDomainsCount === 0 ? (
                      <div className="text-center py-16 bg-gray-800/20 rounded-2xl border border-gray-700/50">
                        <div className="text-8xl mb-6">👀</div>
                        <h3 className="text-2xl font-bold text-white mb-3">Your Watchlist is Empty</h3>
                        <p className="text-gray-400 mb-8 text-lg max-w-md mx-auto">Start watching domains to track their availability, price changes, and never miss an opportunity!</p>
                        <button
                          onClick={() => setActiveTab("browse")}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium text-lg shadow-lg hover:shadow-blue-500/25"
                        >
                          🔍 Browse Domains
                        </button>
                      </div>
                      ) : (
                        <>
                          <DomainGrid
                            domains={watchedDomainsData?.pages?.flatMap(p => p.items) || []}
                            formatPrice={formatPrice}
                                    getTldColor={getTldColor}
                            onMessage={handleMessage}
                            onTransactionSuccess={handleTransactionSuccess}
                            onBuy={handleBuy}
                            onOffer={handleOffer}
                            onList={handleList}
                            onCancelListing={handleCancelListing}
                            userAddress={address}
                            onDomainClick={handleDomainClick}
                            isFullscreen={isFullscreenMode}
                          />
                          {hasNextWatched && (
                            <LoadMoreButton onClick={fetchNextWatchedPage} text="Load More Watched Domains" />
                          )}
                        </>
                      )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      case "chat":
        console.log('Rendering chat tab with selectedUserAddress:', selectedUserAddress);
        return (
          <div className="h-full w-full">
            <ImprovedXMTPChat
              defaultPeerAddress={selectedUserAddress}
              searchQuery={chatSearchQuery}
              setSearchQuery={setChatSearchQuery}
              onManualConversationSelect={handleManualConversationSelect}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // Fullscreen portal content
  const fullscreenContent = (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
      {/* Fullscreen marketplace content */}
      <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="relative text-left mb-4">
          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-0 right-0 flex items-center gap-2 p-2 md:p-3 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg z-10 bg-black/50"
            title="Exit Fullscreen (ESC)"
          >
            <span className="text-sm font-medium hidden sm:block">Exit Fullscreen</span>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9V4.5M15 9h4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15v4.5m0-4.5h4.5m0 0l5.25 5.25" />
            </svg>
          </button>

          <h2 className="text-white font-space-mono text-2xl md:text-3xl mb-2" style={{ fontWeight: 700, lineHeight: '100%', letterSpacing: '0px' }}>
            Domain Marketplace
          </h2>
        </div>

        {/* Navigation Tabs and Search */}
        <div className="mb-4 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 flex-shrink-0">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Show appropriate search bar based on active tab */}
          {activeTab === "browse" && (
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
          {activeTab === "chat" && (
            <ChatDomainSearchBar
              searchQuery={chatDomainSearchQuery}
              setSearchQuery={setChatDomainSearchQuery}
              showResults={showChatDomainSearch}
              setShowResults={setShowChatDomainSearch}
              domains={chatSearchDomains}
              isLoading={isLoadingChatDomains}
              onFocus={() => setShowChatDomainSearch(true)}
              searchRef={chatSearchRef}
            />
          )}
        </div>

        {/* Filters Section - Only show for browse tab */}
        {activeTab === "browse" && (
          <DomainFilters
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            tldFilter={tldFilter}
            setTldFilter={setTldFilter}
          />
        )}

        {/* Content Container - Fixed height with internal scrolling */}
        <div
          className="flex flex-col flex-1 min-h-0 bg-gray-900/30 rounded-xl overflow-hidden mt-4"
          style={{
            border: '1px solid',
            borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
            borderImageSlice: 1
          }}
        >
          {/* Dynamic Tab Content - Scrollable Area */}
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 p-4">
            {renderTabContent(true)}
          </div>
        </div>
      </div>

      {/* Modals inside fullscreen */}
      {/* Domain Action Modal */}
      {selectedDomain && (selectedDomainData || selectedDomain) && (
        <DomainActionModal
          domain={selectedDomainData || selectedDomain}
          isOpen={showActionModal}
          onClose={() => {
            setShowActionModal(false);
          }}
          onTransactionSuccess={(type, domain, result) => {
            handleTransactionSuccess(type, domain, result);
            // Refetch domain data after successful transaction
            refetchDomainData();
          }}
          formatPrice={formatPrice}
          getTldColor={getTldColor}
          userAddress={address}
        />
      )}

      {/* List Domain Modal */}
      <ListDomainModal
        domain={domainToList}
        isOpen={showListModal}
        onClose={() => {
          setShowListModal(false);
          setDomainToList(null);
        }}
        onSuccess={handleListingSuccess}
      />

      {/* Cancel Listing Modal */}
      <CancelListingModal
        domain={domainToList}
        isOpen={showCancelListingModal}
        onClose={() => {
          setShowCancelListingModal(false);
          setDomainToList(null);
        }}
        onSuccess={handleCancelListingSuccess}
      />
    </div>
  );

  return (
    <>
      <section
        id="marketplace-section"
        className="relative py-20 px-6 lg:px-12"
      >
      {/* Background */}
      <div className="absolute inset-0 bg-black"></div>
      
      {/* Background dots */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url('/background_dots.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative text-center mb-16">
          {/* Fullscreen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="absolute top-0 right-0 flex items-center gap-2 p-2 md:p-3 text-gray-400 hover:text-white transition-colors duration-200 hover:bg-white/10 rounded-lg z-10"
            title="Enter Fullscreen"
          >
            <span className="text-sm font-medium hidden sm:block">Fullscreen</span>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>

          <h2
            className="text-white font-space-mono text-4xl mb-6"
            style={{
              fontWeight: 700,
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            Domain Marketplace
          </h2>
          <p
            className="text-white max-w-2xl mx-auto font-space-mono"
            style={{
              fontWeight: 400,
              fontSize: '20px',
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            Discover, buy, and trade premium domains in the decentralized marketplace
          </p>
        </div>

        {/* Navigation Tabs and Search */}
        <div className="mb-8 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Show appropriate search bar based on active tab */}
          {activeTab === "browse" && (
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              placeholder="Search domains..."
            />
          )}

          {activeTab === "chat" && (
            <ChatDomainSearchBar
              searchQuery={chatDomainSearchQuery}
              setSearchQuery={setChatDomainSearchQuery}
              showResults={showChatDomainSearch}
              setShowResults={setShowChatDomainSearch}
              domains={chatSearchDomains}
              isLoading={isLoadingChatDomains}
              onFocus={() => setShowChatDomainSearch(true)}
              searchRef={chatSearchRef}
            />
          )}
        </div>

        {/* Filters Section - Only show for browse tab */}
        {activeTab === "browse" && (
          <DomainFilters 
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            tldFilter={tldFilter}
            setTldFilter={setTldFilter}
          />
        )}

        {/* Content Container */}
        <div
          className="flex flex-col"
          style={{
            width: '100%',
            height: '909px',
            borderWidth: '1px',
            opacity: 1,
            paddingTop: '50px',
            paddingRight: '30px',
            paddingBottom: '50px',
            paddingLeft: '30px',
            gap: '40px',
            borderTopRightRadius: '20px',
            borderBottomRightRadius: '20px',
            borderBottomLeftRadius: '20px',
            backgroundColor: '#121212',
            border: '1px solid',
            borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(255, 255, 255, 0.2) 67.21%)',
            borderImageSlice: 1
          }}
        >
          {/* Dynamic Tab Content - Scrollable Area */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 pr-2">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>

      {/* Domain Detail Page */}
      {showDetailPage && selectedDomain && (
        <DomainDetailPage
          domain={selectedDomain}
          onBack={handleBackToMarketplace}
          onMessage={handleMessage}
          onBuy={handleBuy}
          onOffer={handleOffer}
          onList={handleList}
          onCancelListing={handleCancelListing}
          userAddress={address}
        />
      )}

      {/* Messaging Modal */}
      <MessagingModal
        domain={selectedDomain}
        isOpen={showMessaging}
        onClose={() => setShowMessaging(false)}
      />

      {/* DM Checking Dialog */}
      <DialogCheckingDM
        open={showCheckingDM}
        onOpenChange={setShowCheckingDM}
        userAddress={selectedUserAddress}
        onDMCreated={handleDMCreated}
      />

      {/* Modals - Only show when not in fullscreen mode */}
      {!isFullscreen && (
        <>
          {/* Domain Action Modal */}
          {selectedDomain && (selectedDomainData || selectedDomain) && (
            <DomainActionModal
              domain={selectedDomainData || selectedDomain}
              isOpen={showActionModal}
              onClose={() => {
                setShowActionModal(false);
              }}
              onTransactionSuccess={(type, domain, result) => {
                handleTransactionSuccess(type, domain, result);
                // Refetch domain data after successful transaction
                refetchDomainData();
              }}
              formatPrice={formatPrice}
              getTldColor={getTldColor}
              userAddress={address}
            />
          )}

          {/* List Domain Modal */}
          <ListDomainModal
            domain={domainToList}
            isOpen={showListModal}
            onClose={() => {
              setShowListModal(false);
              setDomainToList(null);
            }}
            onSuccess={handleListingSuccess}
          />

          {/* Cancel Listing Modal */}
          <CancelListingModal
            domain={domainToList}
            isOpen={showCancelListingModal}
            onClose={() => {
              setShowCancelListingModal(false);
              setDomainToList(null);
            }}
            onSuccess={handleCancelListingSuccess}
          />
        </>
      )}

    </section>

    {/* Fullscreen Portal */}
    {isFullscreen && typeof window !== 'undefined' &&
      createPortal(fullscreenContent, document.body)
    }
    </>
  );
} 