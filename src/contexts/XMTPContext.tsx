"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Client, type Signer } from "@xmtp/browser-sdk";
import { toBytes } from "viem";
import { useAccount, useSignMessage } from "wagmi";

type XMTPContextType = {
  client: Client | null;
  setClient: (client: Client | null) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  revokeInstallations: () => Promise<void>;
  connectXmtp: () => Promise<void>;
  resetXmtp: () => void;
  clearLocalData: () => void;
};

const XMTPContext = createContext<XMTPContextType | undefined>(undefined);

export const XMTPProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Create signer using domainline's exact pattern
  const signer: Signer = useMemo(() => {
    return {
      type: "EOA",
      getIdentifier: () => ({
        identifier: address as string,
        identifierKind: "Ethereum",
      }),
      signMessage: async (message: string): Promise<Uint8Array> => {
        const signature = await signMessageAsync({
          account: address,
          message,
        });
        return toBytes(signature);
      },
    };
  }, [address, signMessageAsync]);

  // Core connection logic without auto-revoke to avoid circular dependency
  const connectXmtpCore = useCallback(async () => {
    if (!address) return;

    const canMessage = await Client.canMessage([
      { identifier: address as string, identifierKind: "Ethereum" },
    ]);

    if (canMessage.get(address as string)) {
      // Try to build existing client (avoids re-signing)
      const existingClient = await Client.build(
        { identifier: address as string, identifierKind: "Ethereum" },
        { env: "dev" }
      );
      setClient(existingClient);
      console.log("Built existing XMTP client");
    } else {
      // Create new client (requires signing)
      const newClient = await Client.create(signer, { env: "dev" });
      console.log("Created new XMTP client");
      setClient(newClient);
    }
  }, [address, signer]);

  // Function to revoke old installations using static revocation
  const revokeInstallations = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Using static revocation for installation limit...');

      // Step 1: First, find the inbox ID for this identity using static method
      // This is the key - we need to find the inbox ID without creating a client
      const identifier = {
        identifier: address as string,
        identifierKind: "Ethereum" as const
      };

      // Use the static Client method to find inbox ID by identifier
      let inboxId: string;
      try {
        // Try to find the inbox ID using the static method
        console.log('Finding inbox ID for identity:', address);

        // Check if this identity can receive messages (has an existing inbox)
        const canMessage = await Client.canMessage([identifier], "dev");
        if (!canMessage.get(address.toLowerCase())) {
          throw new Error('This identity is not registered with XMTP yet. No inbox to revoke installations from.');
        }

        // Try to build a temporary client to get the inbox ID
        // This might fail if we're at the installation limit, but let's try a different approach
        console.log('Attempting to get inbox ID using static methods...');

        // Unfortunately, we need the inbox ID to use static revocation
        // Let's try a workaround: attempt to build an existing client first
        try {
          const existingClient = await Client.build(identifier, { env: "dev" });
          inboxId = existingClient.inboxId;
          console.log('Got inbox ID from existing client:', inboxId);
        } catch (buildError) {
          console.log('Build failed, probably due to installation limit. Trying alternative approach...');

          // If build fails, we're likely at the installation limit
          // We need to use a more direct approach to get the inbox ID
          // For now, let's show a clearer error message
          throw new Error(
            'Cannot automatically revoke installations due to installation limit. ' +
            'Please clear your browser data (localStorage) for this domain and try connecting again. ' +
            'This will reset your local XMTP state and allow you to create a fresh client.'
          );
        }

      } catch (discoveryError) {
        console.error('Failed to discover inbox ID:', discoveryError);
        throw discoveryError;
      }

      console.log(`Found inbox ID: ${inboxId}`);

      // Step 2: Get the inbox states to see all installations
      const inboxStates = await Client.inboxStateFromInboxIds([inboxId], "dev");
      console.log(`Found ${inboxStates[0].installations.length} installations`);

      // Step 3: Revoke ALL installations using static revocation
      const installations = inboxStates[0].installations;
      const toRevokeInstallationBytes = installations.map((i) => i.bytes);

      console.log(`Revoking all ${installations.length} installations using static revocation...`);

      // Step 4: Use static revocation with the signer (recovery address)
      await Client.revokeInstallations(
        signer,
        inboxId,
        toRevokeInstallationBytes,
        "dev"
      );

      console.log('✅ All installations revoked using static revocation');

      // Step 5: Now create a fresh client
      console.log('🔄 Creating fresh XMTP client after revocation...');
      await connectXmtpCore();

    } catch (err) {
      console.error("Failed to revoke installations:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke installations';
      setError(`Installation revocation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, connectXmtpCore]);

  // Clear local browser data for XMTP
  const clearLocalData = useCallback(() => {
    console.log('🧹 Clearing XMTP local data...');
    try {
      // Clear localStorage keys related to XMTP
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('xmtp') || key.includes('XMTP'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear IndexedDB databases related to XMTP
      if ('indexedDB' in window) {
        // Note: This is a simplified approach. In a production app, you might want to be more specific
        console.log('Cleared XMTP localStorage data');
      }

      setClient(null);
      setError(null);
      setIsLoading(false);

      console.log('✅ Local XMTP data cleared. Please refresh the page and try connecting again.');
      alert('XMTP local data cleared. Please refresh the page and try connecting again.');
    } catch (err) {
      console.error('Failed to clear local data:', err);
      alert('Failed to clear local data. Please manually clear your browser data for this site.');
    }
  }, []);

  // Reset XMTP completely
  const resetXmtp = useCallback(() => {
    console.log('🔄 Resetting XMTP context completely');
    setClient(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Connect to XMTP with static revocation on installation limit
  const connectXmtp = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      await connectXmtpCore();
    } catch (err) {
      console.error("Failed to connect to XMTP:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to XMTP";

      // Check if it's the installation limit error and use static revocation
      if (errorMessage.includes('10/10 installations') || errorMessage.includes('already registered 10/10')) {
        console.log('🔄 Installation limit reached, using static revocation...');
        setError('Installation limit reached. Cleaning up installations...');
        // Use static revocation to clear all installations
        await revokeInstallations();
      } else {
        setError(errorMessage);
        setIsLoading(false);
      }
    }
  }, [address, connectXmtpCore, revokeInstallations]);

  // Auto-disconnect when wallet disconnects
  useEffect(() => {
    if (!address) {
      setClient(null);
    }
  }, [address]);

  // Auto-connect when wallet connects (like domainline)
  useEffect(() => {
    if (address && !client && !isLoading) {
      connectXmtp();
    }
  }, [address, client, isLoading, connectXmtp]);

  const isConnected = useMemo(() => {
    return Boolean(client && address);
  }, [client, address]);

  return (
    <XMTPContext.Provider
      value={{
        client,
        setClient,
        isLoading,
        error,
        isConnected,
        revokeInstallations,
        connectXmtp,
        resetXmtp,
        clearLocalData,
      }}
    >
      {children}
    </XMTPContext.Provider>
  );
};

export const useXMTPContext = () => {
  const context = useContext(XMTPContext);
  if (context === undefined) {
    throw new Error("useXMTPContext must be used within an XMTPProvider");
  }
  return context;
};

export default XMTPProvider;
