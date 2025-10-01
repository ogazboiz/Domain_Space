import type { DecodedMessage, Dm } from '@xmtp/browser-sdk'

export interface EnhancedConversation extends Omit<Dm, 'metadata'> {
  peerAddress: string;
  metadata?: {
    lastMessage?: string;
    lastMessageTime?: Date;
    unreadCount?: number;
    isTyping?: boolean;
  };
}