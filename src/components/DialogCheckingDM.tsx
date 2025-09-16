"use client";

import { useCallback, useEffect, useState } from "react";
import { useXMTPContext } from "../contexts/XMTPContext";
import type { Identifier } from "@xmtp/browser-sdk";

interface DialogCheckingDMProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userAddress?: string;
}

const DialogCheckingDM: React.FC<DialogCheckingDMProps> = ({
  open,
  onOpenChange,
  userAddress,
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
          if (conv.peerInboxId === inboxId) {
            existingConversation = conv;
            break;
          }
        }

        let conversation;
        if (existingConversation) {
          console.log("✅ Found existing conversation, reusing:", existingConversation.id);
          conversation = existingConversation;
        } else {
          console.log("🆕 Creating new conversation for:", userAddress);
          conversation = await client?.conversations.newDm(inboxId || "");
        }

        onOpenChange(false);
        // Trigger a custom event to notify parent
        window.dispatchEvent(new CustomEvent('conversationCreated', {
          detail: { conversationId: conversation?.id, userAddress }
        }));
      } else {
        console.error("Failed to find inbox ID for the user.");
      }
    }
  }, [userAddress, client, onOpenChange]);

  useEffect(() => {
    if (userAddress && client) {
      (async () => {
        setIsLoading(true);
        const identifier: Identifier = {
          identifier: userAddress,
          identifierKind: "Ethereum",
        };
        const canMessage = await client?.canMessage([identifier]);
        if (canMessage?.get(userAddress.toLowerCase())) {
          setCanSentMessage(true);
          await initializedDm();
        } else {
          setCanSentMessage(false);
        }
        setIsLoading(false);
      })();
    } else {
      setIsLoading(false);
    }
  }, [initializedDm, onOpenChange, userAddress, client]);

  console.log('🔧 DialogCheckingDM render:', { open, userAddress, isLoading, canSentMessage });

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