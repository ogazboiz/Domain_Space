"use client";

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { formatDistanceToNow } from 'date-fns'
import { type Dm, type DecodedMessage } from '@xmtp/browser-sdk'
import { useXMTPContext } from '@/contexts/XMTPContext'
import { Search, Globe, MessageCircle, Loader2 } from 'lucide-react'
import { useNames } from '@/data/use-doma'
import { Name } from '@/types/doma'
import { DomainAvatar } from '@/components/ui/DomainAvatar'

interface ChatInterfaceProps {
  defaultPeerAddress?: string;
}

interface EnhancedConversation {
  id: string;
  peerAddress: string;
  metadata: {
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount: number;
    isTyping: boolean;
  };
  originalDm: Dm;
}

export function ChatInterface({ defaultPeerAddress }: ChatInterfaceProps) {
  const { client, isLoading, error } = useXMTPContext()

  const [conversations, setConversations] = useState<EnhancedConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<EnhancedConversation | null>(null)
  const [activePeerAddress, setActivePeerAddress] = useState<string>("")
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newConversationAddress, setNewConversationAddress] = useState(defaultPeerAddress || '')
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showDomainSearch, setShowDomainSearch] = useState(false)
  const [domainSearchQuery, setDomainSearchQuery] = useState('')

  // Domain search using the same hook as DomainMarketplace
  const {
    data: domainSearchData,
    fetchNextPage: fetchNextDomainPage,
    hasNextPage: hasNextDomainPage,
    isLoading: isLoadingDomains
  } = useNames(
    20, // take
    false, // listed
    domainSearchQuery, // name
    [] // tlds
  );

  // Process domain search results
  const searchedDomains = domainSearchData?.pages?.flatMap(page => page.items) || [];

  // Load conversations (copied from domainline)
  const loadConversations = useCallback(async () => {
    if (!client) return;

    setLoading(true);
    try {
      // Load all conversations like DomainLine (simple approach)
      const allConversations = await client.conversations.list();
      // Filter for DM conversations only, excluding group chats
      const dms = allConversations.filter((conv) =>
        'peerInboxId' in conv && typeof conv.peerInboxId === 'function'
      ) as Dm[];

      const enhancedConversations: EnhancedConversation[] = await Promise.all(
        dms.map(async (dm) => {
          const messages = await dm.messages();
          const lastMessage = messages[messages.length - 1];
          
          // Get peer address properly (multiple fallback approaches)
          let peerAddress = "";
          try {
            // Method 1: Try peerInboxId approach (most reliable)
            const peerInboxId = await dm.peerInboxId();
            if (peerInboxId) {
              const state = await client.preferences.inboxStateFromInboxIds([peerInboxId]);
              peerAddress = state?.[0]?.identifiers?.[0]?.identifier || "";
            }
          } catch (error) {
            console.log("peerInboxId method failed, trying members:", error);
          }

          // Method 2: Fallback to members approach (matching ImprovedXMTPChat style)
          if (!peerAddress) {
            try {
              const members = await dm.members();
              peerAddress = (members?.[0] as { identifier?: string })?.identifier || "";
            } catch (error) {
              console.log("members method failed:", error);
            }
          }

          // Method 3: Direct members access (fallback)
          if (!peerAddress) {
            try {
              const address = (dm as Dm & { members?: { identifier: string }[] }).members?.[0]?.identifier;
              if (address) peerAddress = address;
            } catch (error) {
              console.log("direct members access failed:", error);
            }
          }

          return {
            id: dm.id,
            peerAddress,
            metadata: {
              lastMessage: typeof lastMessage?.content === "string"
                ? lastMessage.content
                : undefined,
              lastMessageTime: lastMessage
                ? new Date(Number(lastMessage.sentAtNs) / 1_000_000)
                : undefined,
              unreadCount: 0,
              isTyping: false,
            },
            originalDm: dm,
          };
        })
      );

      // Sort by last message time
      enhancedConversations.sort((a, b) => {
        const timeA = a.metadata?.lastMessageTime?.getTime() || 0;
        const timeB = b.metadata?.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });

      setConversations(enhancedConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  // Create conversation (copied from domainline)
  const createConversation = useCallback(
    async (peerAddress: string): Promise<Dm | null> => {
      if (!client) {
        return null;
      }

      try {
        // Check if user can message this address (exact domainline pattern)
        const identifier = {
          identifier: peerAddress,
          identifierKind: "Ethereum" as const
        };
        
        const canMessage = await client.canMessage([identifier]);

        if (!canMessage.get(peerAddress.toLowerCase())) {
          alert("Cannot message this address. They may not be registered with XMTP.");
          return null;
        }

        // Create the conversation using identifier (domainline useConversations pattern)
        const conversation = await client.conversations.newDmWithIdentifier(identifier);

        console.log("Conversation created successfully");
        loadConversations(); // Refresh conversations list

        return conversation;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        alert("Failed to create conversation");
        return null;
      }
    },
    [client, loadConversations]
  );

  // Load conversations when client is ready
  useEffect(() => {
    if (client) {
      setLoading(true); // Set loading state immediately
      loadConversations();
    } else {
      setConversations([]);
      setLoading(false);
    }
  }, [client, loadConversations]);

  // Find existing conversation by peer address (like domainline)
  const findConversationByPeer = useCallback(
    (peerAddress: string) => {
      return conversations.find(conv =>
        conv.peerAddress && conv.peerAddress.toLowerCase() === peerAddress.toLowerCase()
      );
    },
    [conversations]
  );

  // Get or create conversation (like domainline)
  const getOrCreateConversation = useCallback(
    async (peerAddress: string) => {
      // First check if conversation already exists
      const existing = findConversationByPeer(peerAddress);
      if (existing) {
        // Find the original XMTP conversation from the list
        const originalConversation = await client?.conversations.list();
        const actualConversation = originalConversation?.find((c) => c.id === existing.id) as Dm;
        
        if (actualConversation) {
          // Create enhanced conversation from existing
          const enhanced: EnhancedConversation = {
            ...existing,
            originalDm: actualConversation
          };
          setActiveConversation(enhanced);
          setActivePeerAddress(existing.peerAddress);
          return actualConversation;
        }
      }

      // Create new conversation
      const newConversation = await createConversation(peerAddress);
      if (newConversation) {
        // Create enhanced conversation wrapper
        const enhanced: EnhancedConversation = {
          id: newConversation.id,
          peerAddress,
          metadata: {
            lastMessage: undefined,
            lastMessageTime: undefined,
            unreadCount: 0,
            isTyping: false,
          },
          originalDm: newConversation
        };
        setActiveConversation(enhanced);
        setActivePeerAddress(peerAddress);
        return newConversation;
      }
      return null;
    },
    [findConversationByPeer, createConversation, client]
  );

  // Filter conversations based on search query (similar to domainline)
  // const filteredConversations = conversations.filter(conv => {
  //   if (!searchQuery.trim()) return true;
  //   const lastMessage = conv.metadata?.lastMessage || "";
  //   const peerAddress = conv.peerAddress || "";
  //   return (
  //     lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     peerAddress.toLowerCase().includes(searchQuery.toLowerCase())
  //   );
  // });


  // Handle domain search keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowDomainSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleDomainMessage = useCallback((domain: Name) => {
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

    setShowDomainSearch(false);
    setDomainSearchQuery('');
    getOrCreateConversation(ownerAddress);
  }, [getOrCreateConversation]);

  // Auto-create conversation with defaultPeerAddress if provided
  useEffect(() => {
    if (client && defaultPeerAddress && conversations.length >= 0) {
      // Use the get or create function
      getOrCreateConversation(defaultPeerAddress);
    }
  }, [client, defaultPeerAddress, conversations.length, getOrCreateConversation]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        await activeConversation.originalDm.sync()
        const msgs = await activeConversation.originalDm.messages()
        setMessages(msgs)
      } catch (err) {
        console.error('Failed to load messages:', err)
      }
    }

    loadMessages()
  }, [activeConversation])

  // Stream messages for real-time updates (like domainline)
  useEffect(() => {
    if (!activeConversation) return

    let streamController: { return?: () => void } | null = null

    const setupMessageStream = async () => {
      try {
        streamController = await activeConversation.originalDm.stream({
          retryAttempts: 5,
          retryDelay: 3000,
          onValue: (message: DecodedMessage) => {
            console.log('📨 New message received:', {
              id: message.id,
              content: message.content,
              conversationId: message.conversationId
            });

            if (message && typeof message.content === "string" && message.content.trim() !== "") {
              setMessages(prev => {
                // Check if message already exists
                const exists = prev.find(m => m.id === message.id);
                if (exists) {
                  console.log('⚠️ Message already exists, skipping');
                  return prev;
                }

                console.log('✅ Adding new message to chat');

                // Auto-scroll to bottom
                setTimeout(() => {
                  const messagesContainer = document.querySelector('.overflow-y-auto');
                  if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                  }
                }, 100);

                return [...prev, message];
              });
            }
          },
          onError: (error: unknown) => {
            console.error("❌ Message stream error:", error);
          },
          onFail: () => {
            console.log('❌ Message stream failed');
          },
          onRestart: () => {
            console.log('🔄 Message stream restarted');
          },
          onRetry: (attempt: number, maxAttempts: number) => {
            console.log(`🔄 Message stream retry ${attempt}/${maxAttempts}`);
          },
        });
      } catch (error) {
        console.error("Failed to setup message stream:", error);
      }
    }

    setupMessageStream()

    return () => {
      if (streamController && typeof streamController.return === "function") {
        streamController.return();
      }
    }
  }, [activeConversation])

  const handleCreateConversation = async () => {
    if (!newConversationAddress.trim()) return

    setIsCreatingConversation(true)
    try {
      const conversation = await getOrCreateConversation(newConversationAddress.trim())
      if (conversation) {
    setShowNewConversation(false)
        setNewConversationAddress('')
      }
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleSendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return

    // Debug: Check what methods are available
    console.log('Active conversation object:', activeConversation)
    console.log('Available methods:', Object.getOwnPropertyNames(activeConversation))
    console.log('Has send method:', typeof activeConversation.originalDm.send)

    setIsSendingMessage(true)
    try {
      // Check if send method exists
      if (typeof activeConversation.originalDm.send !== 'function') {
        throw new Error('activeConversation.originalDm.send is not a function. Object type: ' + typeof activeConversation.originalDm)
      }

      // Simple send like domainline - no sync needed
      await activeConversation.originalDm.send(newMessage.trim())
      setNewMessage('')
      console.log('Message sent successfully')
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!client) {
    return (
      <div className="h-full flex items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="text-6xl mb-4">🔐</div>
          <h3 className="text-white text-xl font-bold mb-2">Connect to XMTP</h3>
          <p className="text-gray-400 mb-4">
            {isLoading ? 'Connecting to XMTP...' : 'Connect your wallet to start secure, decentralized conversations.'}
          </p>
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="mb-4">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar - Conversations */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-lg">Messages</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowDomainSearch(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Search domains (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
                onClick={() => setShowNewConversation(!showNewConversation)}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              title="Start new conversation"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

          {/* Domain Search Bar */}
          <div className="px-4 pb-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search domains..."
                value={domainSearchQuery}
                onChange={(e) => setDomainSearchQuery(e.target.value)}
                onFocus={() => setShowDomainSearch(true)}
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 pr-10 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 w-full"
              />
              <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>

          {/* New Conversation Form */}
          {showNewConversation && (
            <div className="space-y-3">
              {defaultPeerAddress && (
                <div className="text-xs text-blue-400 mb-2">
                  💬 Starting conversation with domain owner
                </div>
              )}
              <input
                type="text"
                value={newConversationAddress}
                onChange={(e) => setNewConversationAddress(e.target.value)}
                placeholder="Enter wallet address (0x...)"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateConversation}
                  disabled={isCreatingConversation || !newConversationAddress.trim()}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {isCreatingConversation ? 'Creating...' : 'Start Chat'}
                </button>
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Domain Search Results or Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {showDomainSearch || domainSearchQuery ? (
              // Domain Search Results
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">
                    Search Domains ({searchedDomains.length})
                    {isLoadingDomains && <span className="text-xs text-gray-400 ml-2">(Searching...)</span>}
                  </h3>
                  <button
                    onClick={() => {
                      setShowDomainSearch(false);
                      setDomainSearchQuery('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Back to chats
                  </button>
                </div>
                <div className="space-y-2">
                  {isLoadingDomains ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="rounded-full bg-purple-500/20 p-4 mb-4">
                        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-white">Searching domains...</h3>
                      <p className="text-sm text-gray-400 max-w-sm">
                        Looking for domains matching &quot;{domainSearchQuery}&quot;
                      </p>
                    </div>
                  ) : searchedDomains.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="rounded-full bg-gray-500/20 p-4 mb-4">
                        <Globe className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-white">
                        {domainSearchQuery ? "No domains found" : "Search for domains"}
                      </h3>
                      <p className="text-sm text-gray-400 max-w-sm">
                        {domainSearchQuery
                          ? `No domains match &quot;${domainSearchQuery}&quot;. Try searching with a different term.`
                          : "Start typing to search for domains and message their owners."}
                      </p>
                      {domainSearchQuery && (
                        <button
                          onClick={() => setDomainSearchQuery("")}
                          className="mt-4 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {searchedDomains.map((domain) => (
                        <button
                          key={domain.name}
                          onClick={() => handleDomainMessage(domain)}
                          className="w-full p-3 rounded-lg text-left transition-colors bg-gray-800 hover:bg-gray-700 border border-gray-600"
                        >
                          <div className="flex items-center space-x-3">
                            <DomainAvatar
                              domain={domain.name}
                              className="w-8 h-8"
                              size={32}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium truncate">
                                {domain.name}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {domain.claimedBy ? `Owner: ${truncateAddress(domain.claimedBy.split(':')[2] || '')}` : 'Available'}
                              </div>
                            </div>
                            <MessageCircle className="w-4 h-4 text-gray-400" />
                          </div>
                        </button>
                      ))}

                      {hasNextDomainPage && (
                        <button
                          onClick={() => fetchNextDomainPage()}
                          className="w-full mt-4 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Load More Domains
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              // Regular Conversations List
              <>
                <h3 className="text-white font-semibold mb-4">
                  Conversations ({conversations.length})
                  {loading && <span className="text-xs text-gray-400 ml-2">(Loading...)</span>}
                </h3>
                <div className="space-y-2">
                  {loading ? (
                    // Loading skeleton for conversations
                    <>
                      <div className="text-center py-4 mb-4">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500/20 border-t-purple-500"></div>
                          <span className="text-sm text-gray-400">Loading conversations...</span>
                        </div>
                      </div>
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 mb-2">
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="h-4 bg-gray-700 rounded animate-pulse w-24"></div>
                                <div className="h-3 bg-gray-700 rounded animate-pulse w-16"></div>
                              </div>
                              <div className="h-3 bg-gray-700 rounded animate-pulse w-32"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-sm">No conversations yet</div>
                      <div className="text-gray-500 text-xs mt-1">Start a new conversation above</div>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={async () => {
                    // Get the actual XMTP conversation object
                    const originalConversations = await client?.conversations.list();
                    const actualConversation = originalConversations?.find((c) => c.id === conversation.id);
                    
                    if (actualConversation) {
                      // Create enhanced conversation from existing
                      const enhanced: EnhancedConversation = {
                        ...conversation,
                        originalDm: actualConversation as Dm
                      };
                      setActiveConversation(enhanced);
                      setActivePeerAddress(conversation.peerAddress);
                    }
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    activeConversation?.id === conversation.id
                      ? 'bg-purple-600/20 border border-purple-500/30'
                      : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <DomainAvatar
                      domain={conversation.peerAddress}
                      className="w-8 h-8"
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {`${conversation.peerAddress.slice(0, 6)}...${conversation.peerAddress.slice(-4)}`}
                      </div>
                      <div className="text-gray-400 text-xs truncate">
                        {conversation.metadata?.lastMessage || 'No messages yet'}
                      </div>
                    </div>
                    {conversation.metadata?.lastMessageTime && (
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(conversation.metadata.lastMessageTime, { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </button>
              )))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <DomainAvatar
                  domain={activePeerAddress || 'unknown'}
                  className="w-8 h-8"
                  size={32}
                />
                <div>
                  <h3 className="text-white font-medium">
                    {activePeerAddress ? `${activePeerAddress.slice(0, 6)}...${activePeerAddress.slice(-4)}` : 'XMTP Chat'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Domain Owner
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-gray-400">No messages yet</div>
                  <div className="text-gray-500 text-sm mt-1">Start the conversation!</div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwn = message.senderInboxId === client?.inboxId
                  return (
                    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%]`}>
                        <div
                          className={`
                            px-4 py-2 rounded-2xl
                            ${isOwn
                              ? 'bg-purple-600 text-white rounded-br-md'
                              : 'bg-gray-700 text-white rounded-bl-md'
                            }
                          `}
                        >
                          <p className="text-sm break-words">
                            {typeof message.content === 'string' ? message.content : JSON.stringify(message.content)}
                          </p>
                        </div>
                        <div className={`flex items-center mt-1 space-x-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(Number(message.sentAtNs) / 1000000), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    rows={1}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                    disabled={isSendingMessage}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isSendingMessage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-white text-xl font-bold mb-2">Select a Conversation</h3>
              <p className="text-gray-400 mb-4">
                Choose an existing conversation or start a new one to begin messaging.
              </p>
              <button
                onClick={() => setShowNewConversation(true)}
                className="bg-purple-600 text-white py-2 px-6 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
