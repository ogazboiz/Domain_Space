"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { formatDistanceToNow } from 'date-fns'
import { Client, type Dm, type DecodedMessage } from '@xmtp/browser-sdk'
import { useXMTPContext } from '@/contexts/XMTPContext'

interface ImprovedXMTPChatProps {
  defaultPeerAddress?: string;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
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
  xmtpObject: any;
}

export default function ImprovedXMTPChat({ defaultPeerAddress, searchQuery = "", setSearchQuery }: ImprovedXMTPChatProps) {
  const { client, isLoading, error } = useXMTPContext()
  const { address } = useAccount()
  
  // State
  const [conversations, setConversations] = useState<EnhancedConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Dm | null>(null)
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newConversationAddress, setNewConversationAddress] = useState(defaultPeerAddress || '')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [conversationError, setConversationError] = useState<string | null>(null)
  const [conversationSuccess, setConversationSuccess] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [streamController, setStreamController] = useState<any>(null)
  const [isManuallySelecting, setIsManuallySelecting] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  
  // Debug: Track component renders
  console.log("🔄 ImprovedXMTPChat rendered", {
    activeConversationId: activeConversation?.id,
    conversationsCount: conversations.length,
    messagesCount: messages.length,
    searchQuery,
    defaultPeerAddress
  })

  // Enhanced conversation filtering with better search logic
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(' ').filter(term => term.length > 0);
    
    return conversations.filter(conv => {
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
  const getPeerAddress = useCallback(async (conversation: any) => {
    try {
      // Method 1: Try peerInboxId approach
      const peerInboxId = await conversation.peerInboxId();
      if (peerInboxId && client) {
        const state = await client.preferences.inboxStateFromInboxIds([peerInboxId]);
        const address = state?.[0]?.identifiers?.[0]?.identifier;
        if (address) return address;
      }
    } catch (error) {
      console.log("peerInboxId method failed:", error);
    }

    try {
      // Method 2: Try members approach
      const members = await conversation.members();
      const address = members?.[0]?.identifier;
      if (address) return address;
    } catch (error) {
      console.log("members method failed:", error);
    }

    try {
      // Method 3: Direct members access
      const address = conversation.members?.[0]?.identifier;
      if (address) return address;
    } catch (error) {
      console.log("direct members access failed:", error);
    }

    return 'Unknown';
  }, [client]);

  // Load conversations with metadata (like domainline)
  const loadConversations = useCallback(async () => {
    if (!client) return;

    setLoading(true);
    try {
      const dms = await client.conversations.list();
      console.log('Loaded conversations:', dms);

      const enhancedConversations: EnhancedConversation[] = await Promise.all(
        dms.map(async (dm: any) => {
          const messages = await dm.messages();
          const lastMessage = messages[messages.length - 1];
          const peerAddress = await getPeerAddress(dm);

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
      );

      // Sort by last message time
      enhancedConversations.sort((a, b) => {
        const timeA = a.metadata.lastMessageTime?.getTime() || 0;
        const timeB = b.metadata.lastMessageTime?.getTime() || 0;
        return timeB - timeA;
      });

      setConversations(enhancedConversations);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [client, getPeerAddress]);

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
        console.log("Conversation created:", conversation);
        
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
  const loadMessages = useCallback(async (conversation?: Dm) => {
    const targetConversation = conversation || activeConversation;
    
    if (!targetConversation) {
      setMessages([]);
      return;
    }

    try {
      console.log('Loading messages for conversation:', targetConversation.id);
      await targetConversation.sync();
      const msgs = await targetConversation.messages();
      
      console.log('Raw messages from XMTP:', msgs);
      
      // Filter out system messages and keep only text messages (like domainline)
      const textMessages = msgs.filter((msg: any) => {
        const isText = typeof msg.content === "string" && 
                      msg.content !== "" && 
                      !msg.content.startsWith("{") && // Filter out JSON system messages
                      !msg.content.includes("initiatedByInboxId"); // Filter out conversation creation messages
        console.log('Message filter check:', { 
          content: msg.content, 
          isText, 
          type: typeof msg.content 
        });
        return isText;
      });
      
      console.log('Filtered text messages:', textMessages);
      setMessages(textMessages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [activeConversation]);

  // Send message
  const handleSendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return

    console.log('Sending message with conversation:', activeConversation)
    console.log('Conversation has send method:', typeof activeConversation.send)

    setIsSendingMessage(true)
    try {
      await activeConversation.send(newMessage.trim())
      setNewMessage('')
      console.log('Message sent successfully')
      // Scroll to bottom after sending message
      scrollToBottom()
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Handle new conversation creation
  const handleCreateConversation = async () => {
    if (!newConversationAddress.trim()) {
      alert("Please enter a recipient address");
      return;
    }

    setIsCreatingConversation(true);
    try {
      const conversation = await getOrCreateConversation(newConversationAddress);
      if (conversation) {
        setActiveConversation(conversation);
        setNewConversationAddress("");
        setShowNewConversation(false);
        
        // Update URL parameters for persistence (like domainline)
        const params = new URLSearchParams(window.location.search);
        params.set("dm", conversation.id);
        params.set("sender", newConversationAddress);
        window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = async (conversation: EnhancedConversation) => {
    console.log("Selecting conversation:", conversation.id, "xmtpObject:", conversation.xmtpObject);
    
    // Don't reload if it's already the active conversation
    if (activeConversation?.id === conversation.id) {
      console.log("Conversation already active, skipping reload");
      return;
    }
    
    // Set manual selection flag to prevent auto-create effect from interfering
    setIsManuallySelecting(true);
    
    // Clear any error states and messages immediately
    setConversationError(null);
    setConversationSuccess(false);
    setMessages([]); // Clear old messages immediately
    
    // Set loading state
    console.log("🔄 Setting loadingMessages to true in handleSelectConversation");
    setLoadingMessages(true);
    
    // Set active conversation first
    setActiveConversation(conversation.xmtpObject);
    
    // Load messages immediately with the specific conversation
    console.log("Loading messages for conversation:", conversation.id);
    try {
      await conversation.xmtpObject.sync();
      const msgs = await conversation.xmtpObject.messages();
      
      console.log('Raw messages from XMTP:', msgs);
      
      // Filter out system messages and keep only text messages (like domainline)
      const textMessages = msgs.filter((msg: any) => {
        const isText = typeof msg.content === "string" && 
                      msg.content !== "" && 
                      !msg.content.startsWith("{") && // Filter out JSON system messages
                      !msg.content.includes("initiatedByInboxId"); // Filter out conversation creation messages
        console.log('Message filter check:', { 
          content: msg.content, 
          isText, 
          type: typeof msg.content 
        });
        return isText;
      });
      
      console.log('Filtered text messages:', textMessages);
      setMessages(textMessages);
      console.log("Messages loaded, current messages count:", textMessages.length);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      console.log("✅ Setting loadingMessages to false in handleSelectConversation");
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
    
    // Only run if we have a defaultPeerAddress and client, and no active conversation
    // This prevents running when manually selecting conversations
    if (defaultPeerAddress && client && !activeConversation && !isManuallySelecting) {
      const createConversationForPeer = async () => {
        // Check if we already have a conversation with this peer
        console.log("🔍 Looking for existing conversation with:", defaultPeerAddress);
        console.log("🔍 Available conversations:", conversations.map(c => ({ id: c.id, peerAddress: c.peerAddress })));
        const existingConversation = findConversationByPeer(defaultPeerAddress);
        if (existingConversation) {
          console.log("✅ Found existing conversation for:", defaultPeerAddress, existingConversation.id);
          console.log("🔄 Setting loadingMessages to true for existing conversation");
          setLoadingMessages(true);
          setMessages([]); // Clear old messages immediately
          setActiveConversation(existingConversation.xmtpObject);
          
          // Load messages for existing conversation
          try {
            await existingConversation.xmtpObject.sync();
            const msgs = await existingConversation.xmtpObject.messages();
            
            const textMessages = msgs.filter((msg: any) => {
              const isText = typeof msg.content === "string" && 
                            msg.content !== "" && 
                            !msg.content.startsWith("{") && 
                            !msg.content.includes("initiatedByInboxId");
              return isText;
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
            await conversation.sync();
            const msgs = await conversation.messages();
            
            const textMessages = msgs.filter((msg: any) => {
              const isText = typeof msg.content === "string" && 
                            msg.content !== "" && 
                            !msg.content.startsWith("{") && 
                            !msg.content.includes("initiatedByInboxId");
              return isText;
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
    
    if (dmId && sender && client && !defaultPeerAddress) {
      const loadConversationFromUrl = async () => {
        try {
          console.log("Loading conversation from URL:", { dmId, sender });
          const conversation = await client.conversations.getConversationById(dmId);
          if (conversation) {
            console.log("Found conversation:", conversation);
            setActiveConversation(conversation as Dm);
            
            // Load messages directly without using the loadMessages function
            try {
              await (conversation as Dm).sync();
              const msgs = await (conversation as Dm).messages();
              
              const textMessages = msgs.filter((msg: any) => {
                const isText = typeof msg.content === "string" && 
                              msg.content !== "" && 
                              !msg.content.startsWith("{") && 
                              !msg.content.includes("initiatedByInboxId");
                return isText;
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
      loadConversations();
    } else {
      setConversations([]);
    }
  }, [client]);

  // Note: Message loading is now handled directly in handleSelectConversation
  // to avoid circular dependencies and unnecessary reloads

  // Stream messages for real-time updates
  useEffect(() => {
    if (!activeConversation) return

    let streamController: any = null

    const setupMessageStream = async () => {
      try {
        streamController = await activeConversation.stream({
          onValue: (message: any) => {
            // Filter out system messages in streaming too
            if (message && 
                typeof message.content === "string" && 
                message.content !== "" && 
                !message.content.startsWith("{")) {
              setMessages(prev => {
                const exists = prev.find(m => m.id === message.id);
                if (exists) return prev;
                return [...prev, message];
              });
            }
          },
          onError: (error: any) => {
            console.error("Message stream error:", error);
          },
        });
        setStreamController(streamController);
      } catch (error) {
        console.error("Failed to setup message stream:", error);
      }
    }

    setupMessageStream()

    return () => {
      if (streamController && typeof streamController.return === "function") {
        streamController.return();
        setStreamController(null);
      }
    }
  }, [activeConversation])

  // Stream conversations for real-time updates (like domainline)
  useEffect(() => {
    if (!client || streamController) return;

    const setupConversationStream = async () => {
      try {
        const controller = await client.conversations.stream({
          onValue: (conversation) => {
            setConversations(prev => {
              const existingIndex = prev.findIndex(conv => conv.id === conversation.id);
              if (existingIndex === -1) {
                // Add new conversation
                getPeerAddress(conversation).then(peerAddress => {
                  const newConv: EnhancedConversation = {
                    id: conversation.id,
                    peerAddress,
                    metadata: {
                      unreadCount: 1,
                      isTyping: false,
                    },
                    xmtpObject: conversation, // Store the original XMTP object
                  };
                  setConversations(prev => [newConv, ...prev]);
                });
              }
              return prev;
            });
          },
          onError: (error: any) => {
            console.error("Conversation stream error:", error);
          },
        });
        setStreamController(controller);
      } catch (error) {
        console.error("Failed to setup conversation stream:", error);
      }
    };

    setupConversationStream();

    return () => {
      if (streamController && typeof streamController.return === "function") {
        streamController.return();
        setStreamController(null);
      }
    };
  }, [client, streamController]);

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
    if (!defaultPeerAddress || !conversations.length || isManuallySelecting) return;

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
            <div className="text-red-400 text-sm mt-2">
              Error: {String(error)}
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
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Messages</h2>
            <button
              onClick={() => setShowNewConversation(true)}
              className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center transition-colors"
            >
              <span className="text-white text-lg">+</span>
            </button>
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
              {filteredConversations.length === 0 ? (
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
                        No conversations found for "<span className="text-purple-400 font-medium">{searchQuery}</span>"
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
                const lastMessage = conversation.metadata.lastMessage || 'No messages yet';
                
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
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                        <span className="text-purple-400 text-xs font-bold">
                          {conversation.peerAddress !== 'Unknown' ? conversation.peerAddress.slice(2, 4).toUpperCase() : '💬'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
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
                        <div className="text-gray-400 text-xs truncate">
                          {searchQuery ? (
                            <span 
                              dangerouslySetInnerHTML={{ 
                                __html: highlightSearchTerms(lastMessage, searchQuery) 
                              }}
                            />
                          ) : (
                            lastMessage
                          )}
                        </div>
                      </div>
                      {searchQuery && (
                        <div className="text-xs text-purple-400 bg-purple-500/10 px-2 py-1 rounded">
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
              <div className="text-xs text-gray-500 mb-4">
                Debug: Error State - {conversationError} | Active: {activeConversation?.id || 'None'}
              </div>
              {conversationError === "not_registered" && (
                <>
                  <div className="text-6xl mb-4">🚫</div>
                  <h3 className="text-white text-xl font-bold mb-2">Recipient Not Registered on XMTP</h3>
                  <p className="text-gray-400 mb-6">
                    This user doesn't have an XMTP inbox yet. They need to sign up with XMTP before you can start a conversation. Until then, you won't be able to send them messages.
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
                    Could not find the user's inbox. They may not be fully set up with XMTP.
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <div className="text-blue-400 text-xl">ℹ️</div>
                      <div className="text-left">
                        <h4 className="text-blue-400 font-semibold mb-2">This usually means:</h4>
                        <ul className="text-blue-300 text-sm space-y-1">
                          <li>• User hasn't completed XMTP setup</li>
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
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <span className="text-purple-400 text-xs font-bold">
                    {(activeConversation as any).peerAddress ? (activeConversation as any).peerAddress.slice(2, 4).toUpperCase() : '💬'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {(activeConversation as any).peerAddress ? 
                      `${(activeConversation as any).peerAddress.slice(0, 6)}...${(activeConversation as any).peerAddress.slice(-4)}` : 
                      'XMTP Chat'
                    }
                  </h3>
                  <p className="text-gray-400 text-sm">Secure messaging</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 relative" onScroll={handleScroll}>
              {/* Debug info */}
              <div className="text-xs text-gray-500 mb-2">
                Debug: {messages.length} messages, Conversation: {activeConversation?.id}
              </div>
              
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
                  const isFromMe = (message as any).senderAddress === address?.toLowerCase()
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

