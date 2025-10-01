"use client";

import { useCallback, useEffect, useState } from "react";
import { useXMTPContext } from "../contexts/XMTPContext";
import type { Identifier } from "@xmtp/browser-sdk";

interface DialogCheckingDMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress?: string;
  onDMCreated?: (dmId: string, userAddress: string) => void;
}

const DialogCheckingDM: React.FC<DialogCheckingDMProps> = ({
  open,
  onOpenChange,
  userAddress,
  onDMCreated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [canSentMessage, setCanSentMessage] = useState<boolean>(false);
  const { client } = useXMTPContext();

  const initializedDm = useCallback(async () => {
    if (userAddress) {
      const identifier: Identifier = {
        identifier: userAddress,
        identifierKind: "Ethereum",
      };
      const inboxId = await client?.findInboxIdByIdentifier(identifier);
      if (inboxId) {
        // First, check if conversation already exists by looking through all conversations
        const allConversations = await client?.conversations.list();
        let existingConversation = null;

        // Find existing conversation with this peer
        for (const conv of allConversations || []) {
          // Check if it's a DM (has peerInboxId property) and matches the inbox ID
          if ('peerInboxId' in conv && typeof conv.peerInboxId === 'function') {
            try {
              const peerInboxId = await conv.peerInboxId();
              if (peerInboxId === inboxId) {
                existingConversation = conv;
                break;
              }
            } catch (error) {
              // Silently handle error
            }
          }
        }

        let conversation;
        if (existingConversation) {
          conversation = existingConversation;
        } else {
          conversation = await client?.conversations.newDm(inboxId || "");
        }

        onOpenChange(false);
        // Trigger a custom event to notify parent
        window.dispatchEvent(new CustomEvent('conversationCreated', {
          detail: { conversationId: conversation?.id, userAddress }
        }));
      }
    }
  }, [userAddress, client, onOpenChange]);

  useEffect(() => {
    if (userAddress && client) {
      (async () => {
        setIsLoading(true);
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setIsLoading(false);
          setCanSentMessage(false);
        }, 10000);
        
        try {
          const identifier: Identifier = {
            identifier: userAddress,
            identifierKind: "Ethereum",
          };
          const canMessage = await client?.canMessage([identifier]);
          const canReceiveMessages = canMessage?.get(userAddress.toLowerCase());
          
          if (canReceiveMessages) {
            setCanSentMessage(true);
            await initializedDm();
          } else {
            setCanSentMessage(false);
          }
        } catch (error) {
          setCanSentMessage(false);
        } finally {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      })();
    } else if (userAddress && !client) {
      setIsLoading(false);
      setCanSentMessage(false);
    } else {
      setIsLoading(false);
    }
  }, [initializedDm, onOpenChange, userAddress, client]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-6 text-center max-w-md mx-4">
        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 justify-center">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <span className="text-white">Checking DM capability...</span>
            </div>
          )}
          {!isLoading && !canSentMessage && (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-white text-xl font-bold mb-2">User Not Available</h3>
              <p className="text-gray-400 mb-4">
                This user is not registered on XMTP and cannot receive messages.
              </p>
              <button
                onClick={() => onOpenChange(false)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialogCheckingDM;
