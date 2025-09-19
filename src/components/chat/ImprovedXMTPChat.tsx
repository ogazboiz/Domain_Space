"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { formatDistanceToNow } from 'date-fns'
import { type Dm, type DecodedMessage, ConsentState } from '@xmtp/browser-sdk'
import { useXMTPContext } from '@/contexts/XMTPContext'
import { toast } from 'sonner'
import { ChatAvatar } from '@/components/ui/ChatAvatar'

interface ImprovedXMTPChatProps {
  defaultPeerAddress?: string;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  onManualConversationSelect?: () => void;
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
  // Store the original XMTP object
  xmtpObject: Dm;
}

export default function ImprovedXMTPChat({ defaultPeerAddress, searchQuery = "", setSearchQuery, onManualConversationSelect }: ImprovedXMTPChatProps) {
  const { client, isLoading, error, isConnected, revokeInstallations } = useXMTPContext()
  const { address } = useAccount()

  // State
  const [conversations, setConversations] = useState<EnhancedConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Dm | null>(null)
  const [activePeerAddress, setActivePeerAddress] = useState<string>('')
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newConversationAddress, setNewConversationAddress] = useState(defaultPeerAddress && defaultPeerAddress.trim() ? defaultPeerAddress : '')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [, setLoading] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [conversationSuccess, setConversationSuccess] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [streamController, setStreamController] = useState<AbortController | null>(null)
  const [isManuallySelecting, setIsManuallySelecting] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)

  // Persistence keys for chat state
  const CONVERSATIONS_KEY = `xmtp_conversations_${address}`;
  const ACTIVE_CONVERSATION_KEY = `xmtp_active_conversation_${address}`;

  // Utility function to safely get timestamp from date
  const safeGetTime = useCallback((date: Date | string | number | undefined | null): number => {
    if (!date) return 0;
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'number') return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    }
    return 0;
  }, []);

  // Save conversations to sessionStorage
  const saveConversations = useCallback((convs: EnhancedConversation[]) => {
    if (address && typeof window !== 'undefined') {
      try {
        // Save only the metadata, not the full XMTP objects
        const conversationsData = convs.map(conv => ({
          id: conv.id,
          peerAddress: conv.peerAddress,
          metadata: conv.metadata
        }));
        sessionStorage.setItem(CONVERSATIONS_KEY, JSON.stringify({
          conversations: conversationsData,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to save conversations:', error);
      }
    }
  }, [address, CONVERSATIONS_KEY]);

  // Load conversations from sessionStorage
  const loadSavedConversations = useCallback((): EnhancedConversation[] => {
    if (address && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(CONVERSATIONS_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          // Check if data is recent (within 30 minutes)
          const thirtyMinutes = 30 * 60 * 1000;
          if (Date.now() - data.timestamp < thirtyMinutes) {
            console.log('📂 Loaded', data.conversations.length, 'conversations from cache');
            return data.conversations;
          }
        }
      } catch (error) {
        console.warn('Failed to load saved conversations:', error);
      }
    }
    return [];
  }, [address, CONVERSATIONS_KEY]);

  // Save active conversation ID
  const saveActiveConversation = useCallback((convId: string, peerAddr: string) => {
    if (address && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, JSON.stringify({
          conversationId: convId,
          peerAddress: peerAddr,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.warn('Failed to save active conversation:', error);
      }
    }
  }, [address, ACTIVE_CONVERSATION_KEY]);

  // Load active conversation
  const loadActiveConversation = useCallback((): { conversationId: string; peerAddress: string } | null => {
    if (address && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(ACTIVE_CONVERSATION_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          // Check if data is recent (within 30 minutes)
          const thirtyMinutes = 30 * 60 * 1000;
          if (Date.now() - data.timestamp < thirtyMinutes) {
            return { conversationId: data.conversationId, peerAddress: data.peerAddress };
          }
        }
      } catch (error) {
        console.warn('Failed to load active conversation:', error);
      }
    }
    return null;
  }, [address, ACTIVE_CONVERSATION_KEY]);

  // Enhanced conversation filtering with better search logic
  const filteredConversations = useMemo(() => {
    // First filter out conversations without valid addresses
    const validConversations = conversations.filter(conv =>
      conv.peerAddress &&
      conv.peerAddress !== 'Unknown' &&
      conv.peerAddress !== null &&
      conv.peerAddress.trim() !== '' &&
      conv.peerAddress.startsWith('0x') &&
      conv.peerAddress.length === 42 // Valid Ethereum address format
    );

    if (!searchQuery.trim()) return validConversations;
    
    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    
    return validConversations.filter(conv => {
      const lastMessage = (conv.metadata.lastMessage || "").toLowerCase();
      const peerAddress = (conv.peerAddress || "").toLowerCase();
      const displayName = conv.peerAddress !== 'Unknown' ? 
        `${conv.peerAddress.slice(0, 6)}...${conv.peerAddress.slice(-4)}` : 
        'XMTP Chat';
      const displayNameLower = displayName.toLowerCase();
      
      // Check if all search terms match any field
      return searchTerms.every(term => 
        lastMessage.includes(term) ||
        peerAddress.includes(term) ||
        displayNameLower.includes(term)
      );
    });
  }, [conversations, searchQuery]);
  
  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search conversations"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery && setSearchQuery) {
        setSearchQuery('');
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Generate search suggestions based on conversations
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const suggestions = new Set<string>();
    conversations.forEach(conv => {
      if (conv.metadata.lastMessage) {
        const words = conv.metadata.lastMessage.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 2 && word.includes(searchQuery.toLowerCase())) {
            suggestions.add(word);
          }
        });
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [conversations, searchQuery]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Function to highlight search terms in text
  const highlightSearchTerms = useCallback((text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const terms = searchQuery.toLowerCase().trim().split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200 px-1 rounded">$1</mark>');
    });
    
    return highlightedText;
  }, []);
  
  // Function to scroll to bottom (for when sending messages)
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      const messagesContainer = messagesEndRef.current?.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        setShowScrollButton(false);
      }
    }, 100);
  }, []);

  // Handle scroll events to show/hide scroll button
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    setShowScrollButton(!isAtBottom);
  }, []);

  // Get peer address for display
  const getPeerAddress = useCallback(async (conversation: Dm) => {
    try {
      // Method 1: Try peerInboxId approach
      const peerInboxId = await conversation.peerInboxId();
      if (peerInboxId && client) {
        const state = await client.preferences.inboxStateFromInboxIds([peerInboxId]);
        const address = state?.[0]?.identifiers?.[0]?.identifier;
        if (address && address.startsWith('0x') && address.length === 42) {
          return address;
        }
      }
    } catch (error) {
    }

    try {
      // Method 2: Try members approach
      const members = await conversation.members();
      const address = (members?.[0] as { identifier?: string })?.identifier;
      if (address && address.startsWith('0x') && address.length === 42) {
        return address;
      }
    } catch (error) {
    }

    // Return null instead of 'Unknown' for invalid addresses
    return null;
  }, [client]);

  // Loading state to prevent multiple simultaneous calls
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Reusable deduplication function
  const deduplicateConversations = useCallback((conversations: EnhancedConversation[]): EnhancedConversation[] => {
    const uniqueConversations = conversations.reduce((acc, current) => {
      const existingIndex = acc.findIndex(item => item.id === current.id);
      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // Keep the one with more recent data (in case of race conditions)
        if (current.metadata.lastMessageTime &&
            (!acc[existingIndex].metadata.lastMessageTime ||
             current.metadata.lastMessageTime > acc[existingIndex].metadata.lastMessageTime)) {
          acc[existingIndex] = current;
        }
      }
      return acc;
    }, [] as EnhancedConversation[]);

    return uniqueConversations;
  }, []);

  // Load conversations with metadata and persistence
  const loadConversations = useCallback(async (forceRefresh = false) => {
    if (!client || isLoadingConversations) {
      return;
    }

    // Try to load from cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedConversations = loadSavedConversations();
      if (cachedConversations.length > 0) {
        console.log('⚡ Using cached conversations');
        setConversations(cachedConversations);
        setIsLoadingConversations(false);
        setLoading(false);

        // Load XMTP objects for cached conversations in background
        setTimeout(async () => {
          try {
            const allConversations = await client.conversations.list();
            const updatedConversations = cachedConversations.map(cached => {
              const xmtpObj = allConversations.find(conv => conv.id === cached.id);
              return xmtpObj ? { ...cached, xmtpObject: xmtpObj as Dm } : cached;
            }).filter(conv => conv.xmtpObject); // Only keep conversations with valid XMTP objects

            setConversations(updatedConversations);
            saveConversations(updatedConversations);
          } catch (error) {
            console.warn('Failed to load XMTP objects for cached conversations:', error);
          }
        }, 100);
        return;
      }
    }

    setIsLoadingConversations(true);
    setLoading(true);
    try {
      // Force sync all conversations and messages like frontend
      await client.conversations.syncAll();

      // Add delay to ensure sync completes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Use simple conversation loading like DomainLine (load ALL conversations)
      const allConversations = await client.conversations.list();

      // Filter for DM conversations only, excluding group chats
      const dms = allConversations.filter((conv) =>
        'peerInboxId' in conv && typeof conv.peerInboxId === 'function'
      ) as Dm[];

      const enhancedConversations: EnhancedConversation[] = (await Promise.all(
        dms.map(async (dm: Dm) => {
          const messages = await dm.messages();
          const lastMessage = messages[messages.length - 1];
          const peerAddress = await getPeerAddress(dm);

          // Skip conversations without valid peer addresses
          if (!peerAddress) return null;

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
            xmtpObject: dm, // Store the original XMTP object
          } as EnhancedConversation;
        })
      )).filter(Boolean) as EnhancedConversation[]; // Remove null entries

      // Sort by last message time with safe date handling
      enhancedConversations.sort((a, b) => {
        const timeA = safeGetTime(a.metadata.lastMessageTime);
        const timeB = safeGetTime(b.metadata.lastMessageTime);
        return timeB - timeA;
      });

      // Use the reusable deduplication function
      const uniqueConversations = deduplicateConversations(enhancedConversations);

      setConversations(uniqueConversations);

      // Save conversations to cache
      saveConversations(uniqueConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
      setIsLoadingConversations(false);
    }
  }, [client, getPeerAddress, isLoadingConversations, deduplicateConversations, loadSavedConversations, saveConversations, safeGetTime]);

  // Create conversation (like domainline)
  const createConversation = useCallback(
    async (peerAddress: string, initialMessage?: string): Promise<Dm | null> => {
      if (!client) return null;

      try {
        // Check if user can message this address using instance method (like domainline)
        const identifier = {
          identifier: peerAddress,
          identifierKind: "Ethereum" as const
        };

        const canMessage = await client.canMessage([identifier]);

        if (!canMessage.get(peerAddress.toLowerCase())) {
          alert("Cannot message this address. They may not be registered with XMTP.");
          return null;
        }

        // Find inbox ID for the peer
        const inboxId = await client.findInboxIdByIdentifier(identifier);
        if (!inboxId) {
          throw new Error("Could not find inbox ID for this address.");
        }

        // Create the conversation using inbox ID (as per docs)
        const conversation = await client.conversations.newDm(inboxId);
        
        // Send initial message if provided
        if (initialMessage && initialMessage.trim()) {
          try {
            await conversation.send(initialMessage.trim());
          } catch (error) {
            console.error("Failed to send initial message:", error);
          }
        }
        
        // Refresh conversations list
        await loadConversations();
        
        return conversation;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        alert(`Failed to create conversation: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    },
    [client, loadConversations]
  );

  // Find conversation by peer address
  const findConversationByPeer = useCallback(
    (peerAddress: string): EnhancedConversation | undefined => {
      return conversations.find(conv =>
        conv.peerAddress.toLowerCase() === peerAddress.toLowerCase()
      );
    },
    [conversations]
  );

  // Get or create conversation (like domainline)
  const getOrCreateConversation = useCallback(
    async (peerAddress: string, initialMessage?: string): Promise<Dm | null> => {
      const existingConversation = findConversationByPeer(peerAddress);

      if (existingConversation) {
        if (initialMessage && initialMessage.trim()) {
          try {
            await existingConversation.xmtpObject.send(initialMessage.trim());
          } catch (error) {
            console.error("Failed to send message:", error);
          }
        }
        return existingConversation.xmtpObject;
      }

      return createConversation(peerAddress, initialMessage);
    },
    [findConversationByPeer, createConversation]
  );

  // Load messages when conversation changes
  // const loadMessages = useCallback(async (conversation?: Dm) => {
  //   const targetConversation = conversation || activeConversation;
  //   
  //   if (!targetConversation) {
  //     setMessages([]);
  //     return;
  //   }

  //   try {
  //     console.log('Loading messages for conversation:', targetConversation.id);
  //     await targetConversation.sync();
  //     const msgs = await targetConversation.messages();
  //     
  //     console.log('Raw messages from XMTP:', msgs);
  //     
  //     // Filter out system messages and keep only text messages (like domainline)
  //     const textMessages = msgs.filter((msg: DecodedMessage) => {
  //       const isText = typeof msg.content === "string" && 
  //                     msg.content !== "" && 
  //                     !msg.content.startsWith("{") && // Filter out JSON system messages
  //                     !msg.content.includes("initiatedByInboxId"); // Filter out conversation creation messages
  //       console.log('Message filter check:', { 
  //         content: msg.content, 
  //         isText, 
  //         type: typeof msg.content 
  //       });
  //       return isText;
  //     });
  //     
  //     console.log('Filtered text messages:', textMessages);
  //     setMessages(textMessages);
  //   } catch (err) {
  //     console.error('Failed to load messages:', err);
  //   }
  // }, [activeConversation]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return


    setIsSendingMessage(true)
    try {
      await activeConversation.send(newMessage.trim())
      setNewMessage('')
      // Scroll to bottom after sending message
      scrollToBottom()
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Handle new conversation creation
  const handleCreateConversation = async () => {
    if (!newConversationAddress.trim()) {
      toast.error("Please enter a recipient address");
      return;
    }

    setIsCreatingConversation(true);
    try {
      const conversation = await getOrCreateConversation(newConversationAddress);
      if (conversation) {
        setActiveConversation(conversation);
        setNewConversationAddress("");
        setShowNewConversation(false);
        toast.success("Conversation created successfully");

        // Update URL parameters for persistence (like domainline)
        const params = new URLSearchParams(window.location.search);
        params.set("dm", conversation.id);
        params.set("sender", newConversationAddress);
        window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation. Please try again.");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Global sync function for sidebar sync button - syncs all conversations
  const handleGlobalSync = useCallback(async () => {
    if (!client) return;

    setIsLoadingConversations(true);
    toast.loading('Syncing all conversations...', { id: 'global-sync' });

    try {
      // Use syncAll() like frontend to sync all conversations and messages
      await client.conversations.syncAll();

      // Reload conversations
      await loadConversations();

      // If there's an active conversation, refresh its messages
      if (activeConversation) {
        const msgs = await activeConversation.messages();
        const textMessages = msgs.filter((msg: DecodedMessage) => {
          return typeof msg.content === "string" &&
                 msg.content !== "" &&
                 !msg.content.startsWith("{");
        });
        setMessages(textMessages);
      }

      toast.success('All conversations synced successfully', { id: 'global-sync' });
    } catch (error) {
      console.error('Global sync failed:', error);
      toast.error('Failed to sync conversations', { id: 'global-sync' });
    } finally {
      setIsLoadingConversations(false);
    }
  }, [client, loadConversations, activeConversation]);

  // Individual conversation sync function for conversation sync button
  const [isSyncingConversation, setIsSyncingConversation] = useState(false);

  const handleConversationSync = useCallback(async () => {
    if (!activeConversation) return;

    setIsSyncingConversation(true);
    toast.loading('Syncing conversation...', { id: 'conversation-sync' });

    try {
      // Sync only this specific conversation like frontend
      await activeConversation.sync();

      // Refresh messages for this conversation
      const msgs = await activeConversation.messages();
      const textMessages = msgs.filter((msg: DecodedMessage) => {
        return typeof msg.content === "string" &&
               msg.content !== "" &&
               !msg.content.startsWith("{");
      });
      setMessages(textMessages);

      toast.success('Conversation synced successfully', { id: 'conversation-sync' });
    } catch (error) {
      console.error('Conversation sync failed:', error);
      toast.error('Failed to sync conversation', { id: 'conversation-sync' });
    } finally {
      setIsSyncingConversation(false);
    }
  }, [activeConversation]);

  // Handle conversation selection
  const handleSelectConversation = async (conversation: EnhancedConversation) => {

    // Don't reload if it's already the active conversation
    if (activeConversation?.id === conversation.id) {
      return;
    }

    // Set manual selection flag to prevent auto-create effect from interfering
    setIsManuallySelecting(true);

    // Notify parent that user manually selected a conversation (clear defaultPeerAddress)
    if (onManualConversationSelect) {
      onManualConversationSelect();
    }
    
    // Clear any error states and messages immediately
    setConversationError(null);
    setConversationSuccess(false);
    setMessages([]); // Clear old messages immediately
    
    // Set loading state
    setLoadingMessages(true);
    
    // Set active conversation first
    setActiveConversation(conversation.xmtpObject);
    setActivePeerAddress(conversation.peerAddress);

    // Save active conversation for persistence
    saveActiveConversation(conversation.id, conversation.peerAddress);
    
    // Load messages immediately with the specific conversation
    console.log("🔄 Loading messages for conversation:", conversation.id);
    try {
      // Force fresh sync from XMTP network (critical for cross-port consistency)
      console.log('🔄 Step 1: Syncing XMTP client and conversation...');

      // First sync the entire client to get latest network state
      if (client) {
        await client.conversations.sync();
      }

      // Then sync the specific conversation
      await conversation.xmtpObject.sync();

      // Add a longer delay to ensure sync completion
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('🔄 Step 2: Fetching messages after sync...');
      const msgs = await conversation.xmtpObject.messages();
      
      console.log('Raw messages from XMTP:', msgs);
      
      // DEBUG: Show ALL messages first to see what's being filtered
      console.log('🔍 DEBUG: All raw messages:', msgs.map(m => ({
        id: m.id,
        content: m.content,
        contentType: typeof m.content,
        contentLength: typeof m.content === 'string' ? m.content.length : 0,
        senderInboxId: m.senderInboxId,
        startsWithBrace: typeof m.content === 'string' ? m.content.startsWith('{') : false,
        includesInitiated: typeof m.content === 'string' ? m.content.includes('initiatedByInboxId') : false
      })));

      // Simple message filtering like DomainLine (just check for string content)
      const textMessages = msgs.filter((msg: DecodedMessage) => {
        return typeof msg.content === "string" && msg.content.trim() !== "";
      });
      

      setMessages(textMessages);
      console.log("✅ Messages set in state, current count:", textMessages.length);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
      setIsManuallySelecting(false);
    }
    
    // Update URL parameters for persistence (like domainline)
    const params = new URLSearchParams(window.location.search);
    params.set("dm", conversation.id);
    params.set("sender", conversation.peerAddress || "");
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  };

  // Auto-create conversation when defaultPeerAddress is provided (like domainline)
  useEffect(() => {
    console.log("🔄 Auto-create effect triggered", {
      defaultPeerAddress,
      hasClient: !!client,
      activeConversationId: activeConversation?.id
    });

    // Only run if we have a VALID defaultPeerAddress and client, and no active conversation
    // This prevents running when manually selecting conversations or when defaultPeerAddress is empty
    if (defaultPeerAddress && defaultPeerAddress.trim() && client && !activeConversation && !isManuallySelecting) {
      const createConversationForPeer = async () => {
        // Check if we already have a conversation with this peer
        console.log("🔍 Looking for existing conversation with:", defaultPeerAddress);
        console.log("🔍 Available conversations:", conversations.map(c => ({ id: c.id, peerAddress: c.peerAddress })));
        const existingConversation = findConversationByPeer(defaultPeerAddress);
        if (existingConversation) {
          setLoadingMessages(true);
          setMessages([]); // Clear old messages immediately
          setActiveConversation(existingConversation.xmtpObject);
          
          // Load messages for existing conversation
          try {
            console.log('🔄 Force syncing existing conversation...');
            await existingConversation.xmtpObject.sync();
            await new Promise(resolve => setTimeout(resolve, 100));
            const msgs = await existingConversation.xmtpObject.messages();

            // Simple message filtering like DomainLine (just check for string content)
            const textMessages = msgs.filter((msg: DecodedMessage) => {
              return typeof msg.content === "string" && msg.content.trim() !== "";
            });

            setMessages(textMessages);
          } catch (error) {
            console.error("Failed to load messages:", error);
            setMessages([]);
          } finally {
            console.log("✅ Setting loadingMessages to false for existing conversation");
            setLoadingMessages(false);
          }
          return;
        }

        console.log("❌ No existing conversation found, creating new one for:", defaultPeerAddress);
        // Create new conversation if none exists
        setIsCreatingConversation(true);
        setConversationError(null);
        setMessages([]); // Clear old messages immediately
        try {
          console.log("Auto-creating conversation for:", defaultPeerAddress);
          
          // Check if user can receive XMTP messages
          const identifier = {
            identifier: defaultPeerAddress,
            identifierKind: "Ethereum" as const
          };
          
          const canMessage = await client.canMessage([identifier]);
          if (!canMessage.get(defaultPeerAddress.toLowerCase())) {
            setConversationError("not_registered");
            return;
          }

          // Find inbox ID and create conversation
          const inboxId = await client.findInboxIdByIdentifier(identifier);
          if (!inboxId) {
            setConversationError("no_inbox");
            return;
          }

          const conversation = await client.conversations.newDm(inboxId);
          console.log("Created conversation:", conversation);
          
          setActiveConversation(conversation);
          
          // Load messages directly without using the loadMessages function
          try {
            console.log('🔄 Force syncing new conversation...');
            await conversation.sync();
            await new Promise(resolve => setTimeout(resolve, 100));
            const msgs = await conversation.messages();

            // Simple message filtering like DomainLine (just check for string content)
            const textMessages = msgs.filter((msg: DecodedMessage) => {
              return typeof msg.content === "string" && msg.content.trim() !== "";
            });

            setMessages(textMessages);
          } catch (error) {
            console.error("Failed to load messages:", error);
            setMessages([]);
          }
          
          // Show success state briefly
          setConversationSuccess(true);
          setTimeout(() => setConversationSuccess(false), 2000);
          
          // Update URL parameters for persistence
          const params = new URLSearchParams(window.location.search);
          params.set("dm", conversation.id);
          params.set("sender", defaultPeerAddress);
          window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
          
        } catch (error) {
          console.error("Failed to create conversation:", error);
          setConversationError("failed");
        } finally {
          setIsCreatingConversation(false);
        }
      };
      
      createConversationForPeer();
    }
  }, [defaultPeerAddress, client, conversations, isManuallySelecting]);

  // Load conversation from URL parameters (like domainline)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dmId = params.get("dm");
    const sender = params.get("sender");

    // Only load from URL if there's no valid defaultPeerAddress (avoids conflicts)
    if (dmId && sender && client && (!defaultPeerAddress || !defaultPeerAddress.trim())) {
      const loadConversationFromUrl = async () => {
        try {
          console.log("Loading conversation from URL:", { dmId, sender });
          const conversation = await client.conversations.getConversationById(dmId);
          if (conversation) {
            console.log("Found conversation:", conversation);
            setActiveConversation(conversation as Dm);
            
            // Load messages directly without using the loadMessages function
            try {
              console.log('🔄 Force syncing conversation from URL...');
              await (conversation as Dm).sync();
              await new Promise(resolve => setTimeout(resolve, 100));
              const msgs = await (conversation as Dm).messages();

              // Simple message filtering like DomainLine (just check for string content)
              const textMessages = msgs.filter((msg: DecodedMessage) => {
                return typeof msg.content === "string" && msg.content.trim() !== "";
              });

              setMessages(textMessages);
            } catch (error) {
              console.error("Failed to load messages:", error);
              setMessages([]);
            }
          } else {
            console.log("No conversation found with ID:", dmId);
          }
        } catch (error) {
          console.error("Failed to load conversation from URL:", error);
        }
      };
      
      loadConversationFromUrl();
    }
  }, [client, defaultPeerAddress]);

  // Load conversations on client connect
  useEffect(() => {
    if (client) {
      // Set loading state immediately when client becomes available
      setIsLoadingConversations(true);
      loadConversations();
    } else {
      setConversations([]);
      setIsLoadingConversations(false);
    }
  }, [client, loadConversations]);

  // Restore active conversation from persistence when conversations are loaded
  useEffect(() => {
    if (conversations.length > 0 && !activeConversation && !isManuallySelecting) {
      const savedActive = loadActiveConversation();
      if (savedActive) {
        console.log('🔄 Restoring active conversation:', savedActive.conversationId);
        const targetConversation = conversations.find(conv => conv.id === savedActive.conversationId);
        if (targetConversation && targetConversation.xmtpObject) {
          setActiveConversation(targetConversation.xmtpObject);
          setActivePeerAddress(savedActive.peerAddress);
          console.log('✅ Restored active conversation successfully');
        }
      }
    }
  }, [conversations, activeConversation, isManuallySelecting, loadActiveConversation]);

  // Clear active conversation when defaultPeerAddress becomes empty to prevent invalid state
  useEffect(() => {
    if (!defaultPeerAddress || !defaultPeerAddress.trim()) {
      console.log("🧹 Clearing active conversation due to empty defaultPeerAddress");
      setActiveConversation(null);
      setMessages([]);
      setConversationError(null);
      setConversationSuccess(false);
      setIsCreatingConversation(false);
      setLoadingMessages(false);
      setNewConversationAddress('');
    } else if (defaultPeerAddress && defaultPeerAddress.trim()) {
      // Update newConversationAddress when defaultPeerAddress changes to a valid value
      setNewConversationAddress(defaultPeerAddress);
    }
  }, [defaultPeerAddress]);

  // Clear all chat state when wallet address changes, but only after XMTP client is ready
  useEffect(() => {
    if (address && !client && !isLoading) {
      console.log("🔄 Wallet address changed, waiting for XMTP connection...");
      // Don't clear state yet, wait for client to be ready
      return;
    }

    if (address && client) {
      console.log("🔄 Wallet address changed and XMTP client ready, clearing chat state");
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setConversationError(null);
      setConversationSuccess(false);
      setIsCreatingConversation(false);
      setLoadingMessages(false);
      setNewConversationAddress('');
      setIsManuallySelecting(false);
      setIsLoadingConversations(false);
    } else if (!address) {
      console.log("🔄 Wallet disconnected, clearing chat state and cache");
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setConversationError(null);
      setConversationSuccess(false);
      setIsCreatingConversation(false);
      setLoadingMessages(false);
      setNewConversationAddress('');
      setIsManuallySelecting(false);
      setIsLoadingConversations(false);

      // Clear cached data when wallet disconnects
      if (typeof window !== 'undefined') {
        try {
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('xmtp_conversations_') || key.startsWith('xmtp_active_conversation_')) {
              sessionStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Failed to clear chat cache:', error);
        }
      }
    }
  }, [address, client, isLoading]);

  // Note: Message loading is now handled directly in handleSelectConversation
  // to avoid circular dependencies and unnecessary reloads

  // Global DM message streaming (better approach using XMTP docs)
  useEffect(() => {
    if (!client) return;

    let messageStreamController: { return?: () => void } | null = null;

    const setupGlobalMessageStream = async () => {
      try {
        console.log('🌐 Setting up global DM message stream...');

        // Stream all DM messages using the official XMTP method
        messageStreamController = await client.conversations.streamAllDmMessages({
          retryAttempts: 5,
          retryDelay: 3000,
          onValue: (message: DecodedMessage) => {
            console.log('📨 New DM message received globally:', {
              id: message.id,
              content: message.content,
              sender: message.senderInboxId,
              conversationId: message.conversationId,
              timestamp: new Date(Number(message.sentAtNs) / 1_000_000)
            });

            // Filter for valid text messages
            if (message &&
                typeof message.content === "string" &&
                message.content.trim() !== "") {

              // Update messages if this is for the active conversation
              if (activeConversation && message.conversationId === activeConversation.id) {
                setMessages(prev => {
                  const exists = prev.find(m => m.id === message.id);
                  if (exists) {
                    console.log('⚠️ Message already exists in active conversation, skipping:', message.id);
                    return prev;
                  }
                  console.log('✅ Adding new message to active conversation:', message.id);

                  // Auto-scroll to bottom when new message arrives
                  setTimeout(() => {
                    const messagesContainer = document.querySelector('.overflow-y-auto');
                    if (messagesContainer) {
                      messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                  }, 100);

                  return [...prev, message];
                });
              }

              // Always update the conversation list metadata
              setConversations(prevConversations => {
                const updatedConversations = prevConversations.map(conv => {
                  if (conv.id === message.conversationId) {
                    const updated = {
                      ...conv,
                      metadata: {
                        ...conv.metadata,
                        lastMessage: String(message.content),
                        lastMessageTime: new Date(Number(message.sentAtNs) / 1_000_000)
                      }
                    };
                    console.log('📝 Updated conversation metadata globally:', updated.id);
                    return updated;
                  }
                  return conv;
                }).sort((a, b) => {
                  // Re-sort conversations by latest message time with safe date handling
                  const timeA = safeGetTime(a.metadata.lastMessageTime);
                  const timeB = safeGetTime(b.metadata.lastMessageTime);
                  return timeB - timeA;
                });

                // Save updated conversations to cache
                saveConversations(updatedConversations);
                return updatedConversations;
              });
            } else {
              console.log('🚫 Global message filtered out:', {
                content: message.content,
                type: typeof message.content
              });
            }
          },
          onError: (error: unknown) => {
            console.error("❌ Global message stream error:", error);
          },
          onFail: () => {
            console.log('❌ Global message stream failed after retries');
          },
          onRestart: () => {
            console.log('🔄 Global message stream restarted');
          },
          onRetry: (attempt: number, maxAttempts: number) => {
            console.log(`🔄 Global message stream retry attempt ${attempt} of ${maxAttempts}`);
          },
        });

        console.log('✅ Global DM message stream setup successful');
      } catch (error) {
        console.error("❌ Failed to setup global message stream:", error);
      }
    };

    setupGlobalMessageStream();

    return () => {
      console.log('🔇 Cleaning up global message stream');
      if (messageStreamController && typeof messageStreamController.return === "function") {
        messageStreamController.return();
      }
    };
  }, [client, activeConversation, saveConversations, safeGetTime])

  // Stream new conversations for real-time updates (using XMTP docs approach)
  useEffect(() => {
    if (!client) return;

    let conversationStreamController: { return?: () => void } | null = null;

    const setupConversationStream = async () => {
      try {
        console.log('🌐 Setting up conversation stream...');

        conversationStreamController = await client.conversations.stream({
          retryAttempts: 5,
          retryDelay: 3000,
          onValue: async (conversation) => {
            console.log('🆕 New conversation detected:', conversation.id);

            // Only handle DM conversations, skip groups
            if (!('peerInboxId' in conversation) || typeof conversation.peerInboxId !== 'function') {
              console.log('🚫 Skipping non-DM conversation');
              return;
            }

            // Get peer address for the new DM conversation
            const peerAddress = await getPeerAddress(conversation as Dm);

            // Skip conversations without valid peer addresses
            if (!peerAddress) {
              console.log('🚫 Skipping conversation without valid peer address');
              return;
            }

            const newConv: EnhancedConversation = {
              id: conversation.id,
              peerAddress,
              metadata: {
                lastMessage: undefined,
                lastMessageTime: undefined,
                unreadCount: 0,
                isTyping: false,
              },
              xmtpObject: conversation as Dm,
            };

            // Add new conversation to the list
            setConversations(prev => {
              const exists = prev.find(conv => conv.id === conversation.id);
              if (exists) {
                console.log('⚠️ Conversation already exists, skipping:', conversation.id);
                return prev;
              }

              console.log('✅ Adding new conversation to list:', conversation.id);
              const updated = [newConv, ...prev].sort((a, b) => {
                // Safe date handling for conversation sorting
                const timeA = safeGetTime(a.metadata.lastMessageTime);
                const timeB = safeGetTime(b.metadata.lastMessageTime);
                return timeB - timeA;
              });

              // Save updated conversations to cache
              saveConversations(updated);
              return updated;
            });
          },
          onError: (error: unknown) => {
            console.error("❌ Conversation stream error:", error);
          },
          onFail: () => {
            console.log('❌ Conversation stream failed after retries');
          },
          onRestart: () => {
            console.log('🔄 Conversation stream restarted');
          },
          onRetry: (attempt: number, maxAttempts: number) => {
            console.log(`🔄 Conversation stream retry attempt ${attempt} of ${maxAttempts}`);
          },
        });

        console.log('✅ Conversation stream setup successful');
      } catch (error) {
        console.error("❌ Failed to setup conversation stream:", error);
      }
    };

    setupConversationStream();

    return () => {
      console.log('🔇 Cleaning up conversation stream');
      if (conversationStreamController && typeof conversationStreamController.return === "function") {
        conversationStreamController.return();
      }
    };
  }, [client, getPeerAddress, deduplicateConversations, saveConversations, safeGetTime]);

  // Disabled automatic scrolling to prevent page scroll issues
  // Scrolling is now only handled manually when sending messages
  // useEffect(() => {
  //   console.log("🔄 Scroll effect triggered", { 
  //     messagesLength: messages.length, 
  //     loadingMessages, 
  //     isManuallySelecting,
  //     activeConversationId: activeConversation?.id,
  //     shouldScroll: messages.length > 0 && !loadingMessages && !isManuallySelecting
  //   });
  //   
  //   // Only scroll if:
  //   // 1. We have messages
  //   // 2. Not currently loading messages
  //   // 3. Not manually selecting a conversation
  //   // 4. We have an active conversation (prevents scrolling when clearing messages)
  //   if (messages.length > 0 && !loadingMessages && !isManuallySelecting && activeConversation) {
  //     // Small delay to ensure DOM is updated
  //     setTimeout(() => {
  //       console.log("📜 Scrolling to bottom");
  //       const messagesContainer = messagesEndRef.current?.parentElement;
  //       if (messagesContainer) {
  //         messagesContainer.scrollTop = messagesContainer.scrollHeight;
  //       }
  //     }, 100);
  //   }
  // }, [messages, loadingMessages, isManuallySelecting, activeConversation]);

  // Auto-select conversation when defaultPeerAddress changes and conversations are loaded
  useEffect(() => {
    // Only run if we have a VALID defaultPeerAddress, conversations, and not manually selecting
    if (!defaultPeerAddress || !defaultPeerAddress.trim() || !conversations.length || isManuallySelecting) return;

    console.log('🔍 Looking for conversation with defaultPeerAddress:', defaultPeerAddress);

    // Find conversation for the default peer address
    const targetConversation = conversations.find(conv =>
      conv.peerAddress.toLowerCase() === defaultPeerAddress.toLowerCase()
    );

    if (targetConversation && targetConversation.id !== activeConversation?.id) {
      console.log('✅ Found matching conversation, auto-selecting:', targetConversation.id);
      handleSelectConversation(targetConversation);
    } else if (targetConversation) {
      console.log('ℹ️ Conversation already active:', targetConversation.id);
    } else {
      console.log('❌ No conversation found for:', defaultPeerAddress);
    }
  }, [defaultPeerAddress, conversations, activeConversation?.id, isManuallySelecting, handleSelectConversation]);

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
          <p className="text-gray-400 mb-6">
            Connect your wallet to start secure, decentralized conversations.
          </p>
          {isLoading && (
            <div className="text-purple-400">Connecting...</div>
          )}
          {error && (
            <div className="text-red-400 text-sm mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <div className="mb-3">Error: {String(error)}</div>
              {(error.includes('installation limit') || error.includes('Cannot register a new installation') || error.includes('Installation limit reached')) && (
                <div className="space-y-3">
                  <div className="text-xs text-red-200 mb-3">
                    🚨 <strong>Installation Limit (10/10)</strong>
                  </div>

                  <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-3 mb-3">
                    <div className="text-blue-200 text-xs mb-2">
                      <strong>Quick Fix:</strong>
                    </div>
                    <div className="text-blue-100 text-xs space-y-1">
                      <div>1. Close other tabs with this site</div>
                      <div>2. Disconnect wallet &rarr; Refresh &rarr; Reconnect</div>
                    </div>
                  </div>

                  <button
                    onClick={revokeInstallations}
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {isLoading ? 'Removing old installations...' : '🔄 Auto-Revoke (Works!)'}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        {/* Connection Status */}
        {!isConnected && address && (
          <div className="p-3 bg-blue-900/50 border-b border-blue-700">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-sm text-blue-300">
                {isLoading ? "Connecting to XMTP..." : "Initializing XMTP..."}
              </span>
            </div>
          </div>
        )}

        {/* XMTP Error Section */}
        {error && (
          <div className="p-3 bg-red-900/50 border-b border-red-700">
            <div className="text-sm text-red-300 mb-2">
              {error}
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <div className="flex items-center space-x-2">
              {/* Global Sync Button - Syncs all conversations */}
              <button
                onClick={handleGlobalSync}
                disabled={isLoadingConversations}
                className="w-8 h-8 rounded-full bg-gray-600/50 hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sync all conversations and messages"
              >
                {isLoadingConversations ? (
                  <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>

              {/* New Conversation Button */}
              <button
                onClick={() => setShowNewConversation(true)}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
                title="Start new conversation"
              >
                <span className="text-white text-lg">+</span>
              </button>
            </div>
          </div>

          {/* Enhanced search input for conversations */}
          {setSearchQuery && (
            <div className="mb-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search conversations, messages, or addresses... (Ctrl+K)"
                  value={searchQuery}
                  onChange={(e) => {
                    if (setSearchQuery) {
                      setSearchQuery(e.target.value);
                      setShowSearchSuggestions(e.target.value.length >= 2);
                    }
                  }}
                  onFocus={() => setShowSearchSuggestions(searchQuery.length >= 2)}
                  onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                  className="w-full pl-9 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery && setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-xs text-gray-400">
                  Found {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                </div>
              )}
              
              {/* Search Suggestions */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                  <div className="py-2">
                    <div className="px-3 py-1 text-xs text-gray-400 font-medium">Suggestions</div>
                    {searchSuggestions.map((suggestion: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (setSearchQuery) {
                            setSearchQuery(suggestion);
                            setShowSearchSuggestions(false);
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* New Conversation Form */}
          {showNewConversation && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter wallet address..."
                value={newConversationAddress}
                onChange={(e) => setNewConversationAddress(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateConversation}
                  disabled={isCreatingConversation}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isCreatingConversation ? 'Creating...' : 'Start Chat'}
                </button>
                <button
                  onClick={() => setShowNewConversation(false)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4">
              Conversations ({filteredConversations.length})
            </h3>
            <div className="space-y-2">
              {!isConnected && address ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-blue-900/50 flex items-center justify-center mb-4 mx-auto">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-blue-300">
                    Connecting to XMTP...
                  </h3>
                  <p className="text-sm text-gray-400 max-w-[280px] mx-auto">
                    Please wait while we establish your connection to XMTP
                  </p>
                </div>
              ) : isLoadingConversations || (isConnected && conversations.length === 0 && client) ? (
                // Loading skeleton for conversations - Show during loading OR when connected but no conversations loaded yet
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
                        <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse flex-shrink-0"></div>
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
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl">{searchQuery ? "🔍" : "💬"}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-white">
                    {searchQuery ? "No matching conversations" : "No conversations yet"}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-[280px] mx-auto">
                    {searchQuery ? (
                      <>
                        No conversations found for &quot;<span className="text-purple-400 font-medium">{searchQuery}</span>&quot;
                        <br />
                        <span className="text-xs mt-2 block">Try different keywords or clear the search</span>
                      </>
                    ) : (
                      "Start a conversation to see your chats appear here. Connect with others and begin messaging."
                    )}
                  </p>
                  {searchQuery ? (
                    <button
                      onClick={() => setSearchQuery && setSearchQuery('')}
                      className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowNewConversation(true)}
                      className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Start New Chat
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conversation: EnhancedConversation) => {
                const displayName = conversation.peerAddress !== 'Unknown' ?
                  `${conversation.peerAddress.slice(0, 6)}...${conversation.peerAddress.slice(-4)}` :
                  'XMTP Chat';

                // Handle special message types like frontend
                const rawMessage = conversation.metadata.lastMessage || '';
                let displayMessage = rawMessage;

                if (rawMessage.includes('send_offer')) {
                  displayMessage = '💌 Sent an offer';
                } else if (rawMessage.includes('accept_offer')) {
                  displayMessage = '🎉 Accepted an offer';
                } else if (!rawMessage) {
                  displayMessage = 'No messages yet';
                } else {
                  // Truncate long messages to prevent overflow
                  displayMessage = rawMessage.length > 50
                    ? rawMessage.substring(0, 50) + '...'
                    : rawMessage;
                }

                // Format timestamp like frontend
                const timeDisplay = conversation.metadata.lastMessageTime
                  ? formatDistanceToNow(conversation.metadata.lastMessageTime, { addSuffix: true })
                  : '';

                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      console.log("🖱️ Conversation clicked:", conversation.id, "peerAddress:", conversation.peerAddress);
                      console.log("🖱️ Current active conversation:", activeConversation?.id);
                      handleSelectConversation(conversation);
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      activeConversation?.id === conversation.id
                        ? 'bg-purple-600/20 border border-purple-500/30'
                        : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <ChatAvatar
                        address={conversation.peerAddress !== 'Unknown' ? conversation.peerAddress : 'unknown'}
                        className="w-10 h-10 flex-shrink-0"
                        size={40}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-white font-medium truncate">
                            {searchQuery ? (
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: highlightSearchTerms(displayName, searchQuery)
                                }}
                              />
                            ) : (
                              displayName
                            )}
                          </div>
                          {timeDisplay && !searchQuery && (
                            <div className="text-gray-500 text-xs flex-shrink-0 ml-2">
                              {timeDisplay}
                            </div>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {searchQuery ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: highlightSearchTerms(displayMessage, searchQuery)
                              }}
                            />
                          ) : (
                            displayMessage
                          )}
                        </div>
                      </div>
                      {searchQuery && (
                        <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded flex-shrink-0">
                          Match
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {isCreatingConversation ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="relative mb-4">
                <div className="w-16 h-16 mx-auto">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500/20 border-t-purple-500"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">💬</div>
                </div>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Creating Conversation</h3>
              <p className="text-gray-400 mb-4">
                Starting conversation with {defaultPeerAddress ? `${defaultPeerAddress.slice(0, 6)}...${defaultPeerAddress.slice(-4)}` : 'user'}...
              </p>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-purple-400 text-xl">🔐</div>
                  <div className="text-left">
                    <h4 className="text-purple-400 font-semibold mb-1">Setting up secure connection</h4>
                    <p className="text-purple-300 text-sm">This may take a few seconds...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : conversationSuccess ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-white text-xl font-bold mb-2">Conversation Started!</h3>
              <p className="text-gray-400 mb-6">
                Successfully connected with {defaultPeerAddress ? `${defaultPeerAddress.slice(0, 6)}...${defaultPeerAddress.slice(-4)}` : 'user'}
              </p>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-green-400 text-xl">🎉</div>
                  <div className="text-left">
                    <h4 className="text-green-400 font-semibold mb-1">Ready to chat!</h4>
                    <p className="text-green-300 text-sm">You can now send secure messages</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : conversationError ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              {conversationError === "not_registered" && (
                <>
                  <div className="text-6xl mb-4">🚫</div>
                  <h3 className="text-white text-xl font-bold mb-2">Recipient Not Registered on XMTP</h3>
                  <p className="text-gray-400 mb-6">
                    This user doesn&apos;t have an XMTP inbox yet. They need to sign up with XMTP before you can start a conversation. Until then, you won&apos;t be able to send them messages.
                  </p>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-orange-400 text-xl">💡</div>
                      <div className="text-left">
                        <h4 className="text-orange-400 font-semibold mb-2">To get started, you can visit domain space and connect your wallet to automatically register with XMTP.</h4>
                        <ul className="text-orange-300 text-sm space-y-1 mt-2">
                          <li>• Ask them to connect their wallet on domain space</li>
                          <li>• XMTP registration happens automatically</li>
                          <li>• Try messaging them after they connect</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="text-blue-400 text-xl">ℹ️</div>
                      <div className="text-left">
                        <h4 className="text-blue-400 font-semibold mb-1">XMTP Registration Required</h4>
                        <p className="text-blue-300 text-sm">Secure messaging requires both parties to be registered with XMTP</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConversationError(null)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
              
              {conversationError === "no_inbox" && (
                <>
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-white text-xl font-bold mb-2">Inbox Not Found</h3>
                  <p className="text-gray-400 mb-6">
                    Could not find the user&apos;s inbox. They may not be fully set up with XMTP.
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-400 text-xl">ℹ️</div>
                      <div className="text-left">
                        <h4 className="text-blue-400 font-semibold mb-2">This usually means:</h4>
                        <ul className="text-blue-300 text-sm space-y-1">
                          <li>• User hasn&apos;t completed XMTP setup</li>
                          <li>• Their inbox is still syncing</li>
                          <li>• Network connectivity issues</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConversationError(null)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
              
              {conversationError === "failed" && (
                <>
                  <div className="text-6xl mb-4">⚠️</div>
                  <h3 className="text-white text-xl font-bold mb-2">Connection Failed</h3>
                  <p className="text-gray-400 mb-6">
                    Something went wrong while creating the conversation. Please try again.
                  </p>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-red-400 text-xl">🔧</div>
                      <div className="text-left">
                        <h4 className="text-red-400 font-semibold mb-2">Troubleshooting:</h4>
                        <ul className="text-red-300 text-sm space-y-1">
                          <li>• Check your internet connection</li>
                          <li>• Make sure your wallet is connected</li>
                          <li>• Try refreshing the page</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConversationError(null)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        ) : activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ChatAvatar
                    address={activePeerAddress || 'unknown'}
                    className="w-8 h-8"
                    size={32}
                  />
                  <div>
                    <h3 className="text-white font-medium">
                      {activePeerAddress ?
                        `${activePeerAddress.slice(0, 6)}...${activePeerAddress.slice(-4)}` :
                        'XMTP Chat'
                      }
                    </h3>
                    <p className="text-gray-400 text-sm">Secure messaging</p>
                  </div>
                </div>

                {/* Conversation Sync Button - Syncs only this conversation */}
                <button
                  onClick={handleConversationSync}
                  disabled={isSyncingConversation || !activeConversation}
                  className="p-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync this conversation messages"
                >
                  {isSyncingConversation ? (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onScroll={handleScroll}>
              
              {/* Loading indicator */}
              {loadingMessages && (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500/20 border-t-purple-500"></div>
                    <span className="text-gray-400">Loading messages...</span>
                  </div>
                </div>
              )}
              

              {messages.length === 0 && !loadingMessages ? (
                <div className="text-center py-20">
                  <div className="text-gray-400 text-lg mb-2">No messages yet</div>
                  <div className="text-gray-500 text-sm">Start the conversation below</div>
                </div>
              ) : (
                messages.map((message) => {
                  const isFromMe = message.senderInboxId === client?.inboxId
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          isFromMe
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                        }`}
                      >
                        <div className="text-sm">{String(message.content)}</div>
                        <div className={`text-xs mt-1 ${
                          isFromMe ? 'text-purple-200' : 'text-gray-400'
                        }`}>
                          {formatDistanceToNow(new Date(Number(message.sentAtNs) / 1_000_000), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
              
              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                >
                  <span className="text-white text-lg">↓</span>
                </button>
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                  disabled={isSendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSendingMessage}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isSendingMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-white text-xl font-bold mb-2">Select a conversation</h3>
              <p className="text-gray-400">
                Choose a conversation from the sidebar or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

