import { useState, useCallback, useEffect } from 'react';
import { Client, DecodedMessage, Dm } from '@xmtp/browser-sdk';
import { ContentTypeReaction, Reaction } from '@xmtp/content-type-reaction';

// Map shortcode names to emoji characters
const shortcodeToEmoji: Record<string, string> = {
  'heart': '❤️',
  'thumbs_up': '👍',
  'thumbs_down': '👎',
  'laugh': '😂',
  'smile': '😊',
  'surprised': '😮',
  'angry': '😡',
  'fire': '🔥',
  'sparkles': '✨',
  'party': '🎉',
  'cry': '😢',
};

// Convert reaction content to emoji (handles both unicode and shortcode)
function getEmojiFromReaction(content: string, schema?: string): string {
  if (schema === 'shortcode' && shortcodeToEmoji[content]) {
    return shortcodeToEmoji[content];
  }
  // If it's already an emoji or unknown shortcode, return as is
  return content;
}

export interface ReactionData {
  messageId: string;
  emoji: string;
  from: string;
  timestamp: Date;
}

export interface UseReactionsReturn {
  reactions: ReactionData[];
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  loadReactions: (messages: DecodedMessage[]) => void;
  isLoading: boolean;
  error: string | null;
}

export function useReactions(
  client: Client | null,
  conversation: Dm | null
): UseReactionsReturn {
  const [reactions, setReactions] = useState<ReactionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load reactions from messages
  const loadReactions = useCallback((messages: DecodedMessage[]) => {
    const reactionMessages = messages.filter(msg => 
      msg.contentType?.sameAs(ContentTypeReaction)
    );

    const loadedReactions: ReactionData[] = [];
    
    for (const msg of reactionMessages) {
      try {
        const reaction = msg.content as Reaction;
        const from = (msg as any).senderInboxId || (msg as any).senderAddress || 'unknown';
        
        const emoji = getEmojiFromReaction(reaction.content, reaction.schema);
        
        if (reaction.action === 'added') {
          loadedReactions.push({
            messageId: reaction.reference,
            emoji,
            from,
            timestamp: new Date(Number(msg.sentAtNs) / 1_000_000),
          });
        } else if (reaction.action === 'removed') {
          // Remove the reaction from loaded reactions
          const emoji = getEmojiFromReaction(reaction.content, reaction.schema);
          const index = loadedReactions.findIndex(
            r => r.messageId === reaction.reference && 
                 r.emoji === emoji && 
                 r.from === from
          );
          if (index !== -1) {
            loadedReactions.splice(index, 1);
          }
        }
      } catch (err) {
        // Silently handle parse errors
      }
    }

    setReactions(loadedReactions);
  }, []);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!client || !conversation) {
      setError('Client or conversation not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const clientAddress = (client as any).inboxId || (client as any).address || 'unknown';
      
      // Check if user already has a reaction on this message
      const existingReaction = reactions.find(
        r => r.messageId === messageId && r.from === clientAddress
      );

      // If user already reacted, remove the old reaction first
      if (existingReaction) {
        const removeReaction: Reaction = {
          reference: messageId,
          action: 'removed',
          content: existingReaction.emoji,
          schema: 'unicode',
        };
        await (conversation as any).sendOptimistic(removeReaction, ContentTypeReaction);
      }

      // Add the new reaction
      const reaction: Reaction = {
        reference: messageId,
        action: 'added',
        content: emoji,
        schema: 'unicode',
      };

      await (conversation as any).sendOptimistic(reaction, ContentTypeReaction);
      await (conversation as any).publishMessages();

      // Update local state: remove old reaction and add new one
      setReactions(prev => {
        // Remove any existing reaction from this user on this message
        const filtered = prev.filter(
          r => !(r.messageId === messageId && r.from === clientAddress)
        );
        
        // Add the new reaction
        return [...filtered, {
          messageId,
          emoji,
          from: clientAddress,
          timestamp: new Date(),
        }];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reaction');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, conversation, reactions]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!client || !conversation) {
      setError('Client or conversation not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reaction: Reaction = {
        reference: messageId,
        action: 'removed',
        content: emoji,
        schema: 'unicode',
      };

      await (conversation as any).sendOptimistic(reaction, ContentTypeReaction);
      await (conversation as any).publishMessages();

      // Update local state immediately
      const clientAddress = (client as any).inboxId || (client as any).address || 'unknown';
      setReactions(prev => 
        prev.filter(r => !(
          r.messageId === messageId && 
          r.emoji === emoji && 
          r.from === clientAddress
        ))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove reaction');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [client, conversation]);

  return {
    reactions,
    addReaction,
    removeReaction,
    loadReactions,
    isLoading,
    error,
  };
}
