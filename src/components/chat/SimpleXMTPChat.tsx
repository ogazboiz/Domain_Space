"use client";

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { formatDistanceToNow } from 'date-fns'
import { type Dm, type DecodedMessage, ConsentState } from '@xmtp/browser-sdk'
import { useXMTPContext } from '@/contexts/XMTPContext'

interface SimpleXMTPChatProps {
  defaultPeerAddress?: string;
}

export function SimpleXMTPChat({ defaultPeerAddress }: SimpleXMTPChatProps) {
  const { client, isLoading, error } = useXMTPContext()

  // Store original XMTP conversations (not enhanced)
  const [conversations, setConversations] = useState<Dm[]>([])
  const [activeConversation, setActiveConversation] = useState<Dm | null>(null)
  const [messages, setMessages] = useState<DecodedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newConversationAddress, setNewConversationAddress] = useState(defaultPeerAddress || '')
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showNewConversation, setShowNewConversation] = useState(false)

  // Get peer address for display (multiple methods like we tried before)
  const getPeerAddress = useCallback(async (conversation: Dm) => {
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
      const address = (members?.[0] as { identifier?: string })?.identifier;
      if (address) return address;
    } catch (error) {
      console.log("members method failed:", error);
    }

    // Method 3: This fallback is not needed since members is a function, not an array

    return 'Unknown';
  }, [client]);

  // Load conversations with peer addresses
  const loadConversations = useCallback(async () => {
    if (!client) return;

    try {
      // CRITICAL: Force sync the client first to get latest data from network
      console.log('🔄 SimpleXMTP: Syncing XMTP client from network...');
      await client.conversations.sync();

      // Add delay to ensure sync completes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Load conversations with BOTH allowed AND unknown consent states
      const allConversations = await client.conversations.listDms({
        consentStates: [ConsentState.Allowed, ConsentState.Unknown] // Include both to see old messages
      });
      console.log('🔍 SimpleXMTP: Loaded conversations with consent states:', allConversations.length);
      // Filter for DM conversations only, excluding group chats
      const dms = allConversations.filter((conv) =>
        'peerInboxId' in conv && typeof conv.peerInboxId === 'function'
      ) as Dm[];
      console.log('Loaded DM conversations:', dms.length);

      setConversations(dms);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  }, [client, getPeerAddress]);

  // Create conversation 
  const createConversation = useCallback(
    async (peerAddress: string) => {
      if (!client) return null;

      try {
        // Check if user can message this address
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
        
        // Refresh conversations list
        loadConversations();
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
      loadConversations();
    } else {
      setConversations([]);
    }
  }, [client, loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([])
      return
    }

    const loadMessages = async () => {
      try {
        // First sync the client to get latest network state
        if (client) {
          await client.conversations.sync();
        }

        // Then sync the specific conversation
        await activeConversation.sync()

        // Add delay for cross-port consistency
        await new Promise(resolve => setTimeout(resolve, 200))

        const msgs = await activeConversation.messages()
        
        // Filter out system messages and keep only text messages (like domainline)
        const textMessages = msgs.filter((msg: DecodedMessage) => {
          return typeof msg.content === "string" && 
                 msg.content !== "" && 
                 !msg.content.startsWith("{") // Filter out JSON system messages
        });
        
        console.log('All messages:', msgs);
        console.log('Filtered text messages:', textMessages);
        setMessages(textMessages)
      } catch (err) {
        console.error('Failed to load messages:', err)
      }
    }

    loadMessages()
  }, [activeConversation])

  // Stream messages for real-time updates
  useEffect(() => {
    if (!activeConversation) return

    let streamController: { return?: () => void } | null = null

    const setupMessageStream = async () => {
      try {
        streamController = await activeConversation.stream({
          onValue: (message: DecodedMessage) => {
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
          onError: (error: unknown) => {
            console.error("Message stream error:", error);
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
      const conversation = await createConversation(newConversationAddress.trim())
      if (conversation) {
        setActiveConversation(conversation) // Store actual XMTP object
        setShowNewConversation(false)
        setNewConversationAddress('')
      }
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleSendMessage = async () => {
    if (!activeConversation || !newMessage.trim()) return

    console.log('Sending message with conversation:', activeConversation)
    console.log('Conversation has send method:', typeof activeConversation.send)

    setIsSendingMessage(true)
    try {
      // Simple send like domainline
      await activeConversation.send(newMessage.trim())
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
            <button
              onClick={() => setShowNewConversation(!showNewConversation)}
              className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
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

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-semibold mb-4">
              Conversations ({conversations.length})
            </h3>
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const peerAddress = 'Unknown'; // Peer address would be computed here
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setActiveConversation(conversation); // Use original XMTP object
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
                          {'💬'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">
                          {'XMTP Chat'}
                        </div>
                        <div className="text-gray-400 text-xs truncate">
                          {messages.length > 0 ? `${messages.length} messages` : 'No messages yet'}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {conversations.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-sm">No conversations yet</div>
                  <div className="text-gray-500 text-xs mt-1">Start a new conversation above</div>
                </div>
              )}
            </div>
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
                <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <span className="text-purple-400 text-xs font-bold">
                    {'💬'}
                  </span>
                </div>
                <div>
                  <h3 className="text-white font-medium">
                    {'XMTP Chat'}
                  </h3>
                  <p className="text-gray-400 text-sm">Secure messaging</p>
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