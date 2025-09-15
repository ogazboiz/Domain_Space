"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNames, useOwnedNames, useSelectedNames } from "@/data/use-doma";
import { formatDistanceToNow } from "date-fns";
import { formatUnits } from "viem";
import { Name } from "@/types/doma";
import { useAccount } from "wagmi";
import { useHelper } from "@/hooks/use-helper";
import { useUsername } from "@/contexts/UsernameContext";
import DomainCard from "./DomainCard";
import MessagingModal from "./MessagingModal";
import DomainDetailPage from "./DomainDetailPage";
import DialogCheckingDM from "./DialogCheckingDM";
import ImprovedXMTPChat from "./chat/ImprovedXMTPChat";

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
const DomainGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
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
    <p className="text-gray-400">No domains found matching "{searchQuery}"</p>
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
  onDomainClick,
  onFocus,
  searchRef
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  domains: Name[];
  isLoading: boolean;
  onDomainClick: (domain: Name) => void;
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
              {searchQuery ? `No domains found for "${searchQuery}"` : "Start typing to search domains"}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {domains.slice(0, 10).map((domain) => (
              <button
                key={domain.name}
                onClick={() => onDomainClick(domain)}
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
        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
      >
        <option value="all">All</option>
        <option value="available">Available</option>
        <option value="taken">Taken</option>
      </select>
      <select 
        value={priceFilter}
        onChange={(e) => setPriceFilter(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
      >
        <option value="all">All</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
      </select>
      <select 
        value={tldFilter}
        onChange={(e) => setTldFilter(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
      >
        <option value="all">All TLDs</option>
        <option value="com">.com</option>
        <option value="ai">.ai</option>
        <option value="io">.io</option>
        <option value="eth">.eth</option>
        <option value="ape">.ape</option>
        <option value="shib">.shib</option>
        <option value="football">.football</option>
      </select>
    </div>
  </div>
);

// Portfolio Overview Component
const PortfolioOverview = ({ ownedDomainsCount }: { ownedDomainsCount: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
    <div 
      className="flex flex-col justify-between hover:scale-105 transition-transform w-full max-w-sm"
      style={{
        height: '189px',
        borderRadius: '30px',
        borderWidth: '1px',
        opacity: 1,
        paddingTop: '20px',
        paddingRight: '16px',
        paddingBottom: '20px',
        paddingLeft: '16px',
        gap: '20px',
        backgroundColor: '#121212',
        border: '1px solid',
        borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
        borderImageSlice: 1
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#EEEFFF29' }}
          >
            <span className="text-white text-xs font-bold">💰</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-bold truncate font-space-mono"
              style={{
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0%'
              }}
            >
              <span className="text-white">Total Value</span>
            </h3>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-white text-sm font-semibold">0 ETH</p>
          <p className="text-gray-400 text-xs">$0</p>
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              className="text-white text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#1689DB3B' }}
            >
              Portfolio
            </span>
          </div>
          <p className="text-gray-400 text-xs truncate">
            Track your domain investments
          </p>
        </div>
      </div>
    </div>

    <div 
      className="flex flex-col justify-between hover:scale-105 transition-transform w-full max-w-sm"
      style={{
        height: '189px',
        borderRadius: '30px',
        borderWidth: '1px',
        opacity: 1,
        paddingTop: '20px',
        paddingRight: '16px',
        paddingBottom: '20px',
        paddingLeft: '16px',
        gap: '20px',
        backgroundColor: '#121212',
        border: '1px solid',
        borderImage: 'radial-gradient(88.13% 63.48% at 26.09% 25.74%, #FFFFFF 0%, rgba(255, 255, 255, 0.905829) 8.52%, rgba(255, 255, 255, 0.801323) 40.45%, rgba(255, 255, 255, 0.595409) 40.46%, rgba(255, 255, 255, 0.29) 96.15%, rgba(255, 255, 255, 0) 100%, rgba(255, 255, 255, 0) 100%), linear-gradient(180deg, rgba(0, 0, 0, 0.2) 18.72%, rgba(255, 30, 0, 0.2) 43.64%, rgba(0, 0, 0, 0.2) 67.21%)',
        borderImageSlice: 1
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#EEEFFF29' }}
          >
            <span className="text-white text-xs font-bold">🌐</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 
              className="font-bold truncate font-space-mono"
              style={{
                fontWeight: 700,
                fontSize: '16px',
                lineHeight: '100%',
                letterSpacing: '0%'
              }}
            >
              <span className="text-white">Total Domains</span>
            </h3>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-white text-sm font-semibold">{ownedDomainsCount}</p>
          <p className="text-gray-400 text-xs">Owned</p>
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span 
              className="text-white text-xs px-2 py-1 rounded"
              style={{ backgroundColor: '#1689DB3B' }}
            >
              Collection
            </span>
          </div>
          <p className="text-gray-400 text-xs truncate">
            Your domain portfolio
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Domain Grid Component
const DomainGrid = ({ 
  domains, 
  formatPrice, 
  getTldColor, 
  onDomainClick,
  onMessage,
  onBuy,
  onOffer,
  userAddress
}: { 
  domains: Name[]; 
  formatPrice: (price: string, decimals: number) => string; 
  getTldColor: (tld: string) => string;
  onDomainClick?: (domain: Name) => void;
  onMessage?: (domain: Name) => void;
  onBuy?: (domain: Name) => void;
  onOffer?: (domain: Name) => void;
  userAddress?: string;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
    {domains.map((domain) => (
      <DomainCard
        key={domain.name}
        domain={domain}
        formatPrice={formatPrice}
        getTldColor={getTldColor}
        onMessage={onMessage}
        onBuy={onBuy}
        onOffer={onOffer}
        userAddress={userAddress}
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

  const [showCheckingDM, setShowCheckingDM] = useState(false);
  const [selectedUserAddress, setSelectedUserAddress] = useState<string>("");

  // Ref for chat domain search dropdown
  const chatSearchRef = useRef<HTMLDivElement>(null);

  const { address } = useAccount();
  const { formatLargeNumber } = useHelper();
  const { profile } = useUsername();

  // Memoized filter parameters for API calls
  const browseFilterParams = useMemo(() => ({
    search: searchQuery,
    tlds: tldFilter === "all" ? [] : [tldFilter],
    listed: false,
    status: statusFilter === "all" ? undefined : statusFilter,
    sort: priceFilter === "all" ? undefined : priceFilter
  }), [searchQuery, tldFilter, statusFilter, priceFilter]);

  // Browse domains hook with optimized parameters
  const { 
    data: browseDomainsData, 
    fetchNextPage: fetchNextBrowsePage, 
    hasNextPage: hasNextBrowse, 
    isLoading: isLoadingBrowse,
    error: browseError
  } = useNames(
    20, // take
    false, // listed
    searchQuery, // name
    tldFilter === "all" ? [] : [tldFilter] // tlds
  );

  // Chat domain search hook
  const { 
    data: chatDomainSearchData, 
    fetchNextPage: fetchNextChatDomainPage, 
    hasNextPage: hasNextChatDomain, 
    isLoading: isLoadingChatDomains,
    error: chatDomainError
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

  // Memoized domain processing
  const browseDomains = useMemo(() => {
    if (!browseDomainsData?.pages) return [];
    
    return browseDomainsData.pages.flatMap(page => page.items);
  }, [browseDomainsData]);

  const totalBrowseCount = browseDomainsData?.pages[0]?.totalCount || 0;

  // Chat domain search results
  const chatSearchDomains = useMemo(() => {
    if (!chatDomainSearchData?.pages) return [];
    
    return chatDomainSearchData.pages.flatMap(page => page.items);
  }, [chatDomainSearchData]);

  // Debug logging
  console.log('Browse Domains Debug:', {
    browseDomainsData,
    browseDomains: browseDomains.length,
    totalBrowseCount,
    isLoadingBrowse,
    browseError,
    searchQuery,
    tldFilter
  });
  const ownedDomainsCount = ownedDomainsData?.pages?.[0]?.totalCount ?? 0;
  const watchedDomainsCount = watchedDomainsData?.pages?.[0]?.totalCount ?? 0;

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
    setShowDetailPage(true);
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

  const handleBuy = useCallback((domain: Name) => {
    console.log('Buy domain:', domain.name);
    // Implement buy logic here
  }, []);

  const handleOffer = useCallback((domain: Name) => {
    console.log('Make offer for domain:', domain.name);
    // Implement offer logic here
  }, []);

  const handleBackToMarketplace = useCallback(() => {
    setShowDetailPage(false);
    setSelectedDomain(null);
  }, []);

  const handleDMCreated = useCallback((dmId: string, userAddress: string) => {
    console.log('DM created successfully:', { dmId, userAddress });
    // Switch to chat tab to show the new conversation
    setActiveTab("chat");
    // You can add additional logic here to highlight the new conversation
  }, []);

  // Handle domain search in chat tab (simplified like browse domains)
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
      ownerAddress: ownerAddress,
      currentSelectedUser: selectedUserAddress
    });

    // Set the owner address directly (like browse domains do)
    setSelectedUserAddress(ownerAddress);
    setChatDomainSearchQuery('');
    setShowChatDomainSearch(false);

    // The ImprovedXMTPChat component will automatically handle conversation creation
    console.log('✅ Set selected user address to:', ownerAddress);
  }, [selectedUserAddress]);

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


  // Tab definitions
  const tabs = [
    { id: "trading", label: "Trading", count: "25" },
    { id: "browse", label: "Browse Domains", count: totalBrowseCount > 0 ? totalBrowseCount.toString() : "..." },
    { id: "myspace", label: "My Space", count: "12" },
    { id: "chat", label: "Chat", count: "5" }
  ];

  // Render functions for different tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case "trading":
        return (
          <div className="text-center py-20">
            <h3 className="text-white text-2xl font-bold mb-4">Trading Dashboard</h3>
            <p className="text-gray-400">Manage your domain trades and transactions</p>
          </div>
        );
      case "browse":
        return (
          <div className="space-y-6">
            {/* Browse Domains Results */}
            <div className="space-y-4">
              {browseError ? (
                <div className="text-center py-20">
                  <h3 className="text-red-400 text-xl font-bold mb-4">Error Loading Domains</h3>
                  <p className="text-gray-400 mb-4">{browseError.message}</p>
                  <p className="text-gray-500 text-sm">Check your API configuration and try again</p>
                </div>
              ) : !searchQuery && browseDomains.length === 0 && !isLoadingBrowse ? (
                <div className="text-center py-10">
                  <h3 className="text-white text-xl font-bold mb-2">Discover Domains</h3>
                  <p className="text-gray-400">Search for available domains or browse the marketplace</p>
                  <p className="text-gray-500 text-sm mt-2">Try searching for "crypto", "nft", or any domain name</p>
                </div>
              ) : isLoadingBrowse ? (
                <DomainGridSkeleton count={6} />
              ) : browseDomains.length === 0 && searchQuery ? (
                <NoResults searchQuery={searchQuery} />
              ) : (
                <>
                  <DomainGrid
                    domains={browseDomains}
                    formatPrice={formatPrice}
                    getTldColor={getTldColor}
                    onDomainClick={handleDomainClick}
                    onMessage={handleMessage}
                    onBuy={handleBuy}
                    onOffer={handleOffer}
                    userAddress={address}
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
                    <p className="text-gray-400 text-sm">Domains you're tracking</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-900/20 to-green-600/10 rounded-2xl p-6 border border-green-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                        <span className="text-2xl">📈</span>
                      </div>
                      <span className="text-2xl font-bold text-green-400">$0</span>
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
                      <DomainGridSkeleton count={6} />
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
                            onDomainClick={handleDomainClick}
                            onMessage={handleMessage}
                            onBuy={handleBuy}
                            onOffer={handleOffer}
                            userAddress={address}
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
                        <p className="text-gray-400">Monitor domains you're interested in and track their availability</p>
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
                      <DomainGridSkeleton count={6} />
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
                            onDomainClick={handleDomainClick}
                            onMessage={handleMessage}
                            onBuy={handleBuy}
                            onOffer={handleOffer}
                            userAddress={address}
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
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <section className="relative py-20 px-6 lg:px-12">
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
        <div className="text-center mb-16">
          <h2 
            className="text-white mb-6 font-space-mono"
            style={{
              fontWeight: 700,
              fontSize: '38px',
              lineHeight: '100%',
              letterSpacing: '0px'
            }}
          >
            Simple Steps, Great Features
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
            This can only be just the beginning of what is possible
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
              onDomainClick={handleChatDomainMessage}
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
            <div 
              className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-800 pr-2"
              style={{ maxHeight: 'calc(100% - 0px)' }}
            >
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
    </section>
  );
} 