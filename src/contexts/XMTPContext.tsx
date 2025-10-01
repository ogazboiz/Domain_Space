"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Client, type Signer } from "@xmtp/browser-sdk";
import { ReactionCodec } from "@xmtp/content-type-reaction";
import { toBytes } from "viem";
import { useAccount, useSignMessage } from "wagmi";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XMTPClient = any;

type XMTPContextType = {
  client: XMTPClient;
  setClient: (client: XMTPClient) => void;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  revokeInstallations: () => Promise<void>;
  connectXmtp: () => Promise<void>;
  resetXmtp: () => void;
  clearLocalData: () => void;
  getInstallationInfo: () => Promise<{ count: number; installations: unknown[] } | null>;
  revokeSpecificInstallations: (installationIds: string[]) => Promise<void>;
};

const XMTPContext = createContext<XMTPContextType | undefined>(undefined);

export const XMTPProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<XMTPClient>(null);
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

  // Simplified connection logic like domainline
  const connectXmtpCore = useCallback(async () => {
    if (!address) return;


    const canMessage = await Client.canMessage([
      { identifier: address as string, identifierKind: "Ethereum" },
    ]);

    if (canMessage.get(address as string)) {
      // User is already registered - build existing client (reuses existing inbox)
      const existingClient = await Client.build(
        { identifier: address as string, identifierKind: "Ethereum" },
        { 
          env: "dev",
          codecs: [new ReactionCodec()]
        }
      );
      setClient(existingClient);
    } else {
      // User not registered - create new client
      const newClient = await Client.create(signer, { 
        env: "dev",
        codecs: [new ReactionCodec()]
      });
      setClient(newClient);
    }
  }, [address, signer]);

  // Function to revoke installations using static method without client
  const revokeInstallations = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {

      // Step 1: We need to find the inbox ID for this address
      // According to docs, we can use Client.inboxStateFromInboxIds but we need the inbox ID first
      // Let's try to derive it or use a different approach

      const identifier = {
        identifier: address as string,
        identifierKind: "Ethereum" as const
      };


      // Check if this identity can receive messages (has an existing inbox)
      const canMessage = await Client.canMessage([identifier], "dev");
      if (!canMessage.get(address.toLowerCase())) {
        throw new Error('This address is not registered with XMTP. No installations to revoke.');
      }

      // The challenge: We need inbox ID but can't create client at 10/10 limit
      // Try using a workaround by attempting static methods first

      let inboxId: string | null = null;

      // Method: Try to extract inbox ID using static methods
      try {
        // This is a limitation - we may need to provide the inbox ID manually
        // or use a different approach. For now, let's try to get it from error messages

        // Try to create a client and catch the error to extract inbox ID
        try {
          const tempClient = await Client.create(signer, { env: "dev" });
          inboxId = tempClient.inboxId || null;
        } catch (createError) {
          // Try to extract inbox ID from error message if possible
          const errorStr = String(createError);
          const inboxIdMatch = errorStr.match(/InboxID\s+([a-f0-9]+)/i);
          if (inboxIdMatch) {
            inboxId = inboxIdMatch[1];
          } else {
            throw new Error(
              'Cannot extract inbox ID at 10/10 limit. Try:\n' +
              '1. Clear browser data and reconnect\n' +
              '2. Use incognito mode\n' +
              '3. Use different browser\n' +
              '4. Wait for XMTP to provide better static revocation APIs'
            );
          }
        }
      } catch (staticError) {
        console.error('Static method failed:', staticError);
        throw staticError;
      }

      if (!inboxId) {
        throw new Error('Could not determine inbox ID for static revocation');
      }

      // Step 2: Get inbox states using static method (this should work)
      const inboxStates = await Client.inboxStateFromInboxIds([inboxId], "dev");

      if (!inboxStates || inboxStates.length === 0) {
        throw new Error('Failed to get inbox states');
      }

      const installations = inboxStates[0].installations;

      if (installations.length === 0) {
        throw new Error('No installations found to revoke');
      }

      // Step 3: Revoke ALL installations except current (as per docs)
      const toRevokeInstallationBytes = installations.map((i) => i.bytes);

      // Step 4: Use static revocation method exactly as in docs
      await Client.revokeInstallations(
        signer,
        inboxId,
        toRevokeInstallationBytes,
        "dev"
      );

      // Step 5: Try to connect fresh client
      await connectXmtpCore();

    } catch (err) {
      console.error("❌ Static revocation failed:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke installations';
      setError(`Static revocation failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, connectXmtpCore]);

  // Get installation information - works even at limit
  const getInstallationInfo = useCallback(async () => {
    if (!address) return null;

    try {
      const identifier = {
        identifier: address as string,
        identifierKind: "Ethereum" as const
      };

      // Check if this identity can receive messages (has an existing inbox)
      const canMessage = await Client.canMessage([identifier], "dev");
      if (!canMessage.get(address.toLowerCase())) {
        return { count: 0, installations: [] };
      }

      // Try different approaches to get inbox ID
      let inboxId: string | null = null;

      // Method 1: Try to build existing client (might fail at limit)
      try {
        const existingClient = await Client.build(identifier, { env: "dev" });
        inboxId = existingClient.inboxId || null;
      } catch (buildError) {
        // Method 2: Try to create client to get inbox ID (risky but sometimes works)
        try {
          const tempClient = await Client.create(signer, { env: "dev" });
          inboxId = tempClient.inboxId || null;
        } catch (createError) {
          // At this point we know we're at the limit but can't get details
          return {
            count: 10,
            installations: [],
            error: 'Cannot retrieve installation details - at 10/10 limit. Use auto-revoke or manual reset.'
          };
        }
      }

      if (!inboxId) {
        return { count: 10, installations: [], error: 'Could not retrieve inbox ID' };
      }

      // Get installation details using the inbox ID
      const inboxStates = await Client.inboxStateFromInboxIds([inboxId], "dev");
      const installations = inboxStates[0].installations;

      return {
        count: installations.length,
        installations: installations.map((installation, index) => ({
          id: installation.id,
          createdAt: (installation as { createdAt?: Date }).createdAt || new Date(),
          isCurrent: index === installations.length - 1, // Latest is likely current
          bytes: installation.bytes
        }))
      };

    } catch (error) {
      console.error('❌ Failed to get installation info:', error);
      return {
        count: 10,
        installations: [],
        error: 'Failed to retrieve installation details. Try auto-revoke or manual reset.'
      };
    }
  }, [address, signer]);

  // Revoke specific installations by ID
  const revokeSpecificInstallations = useCallback(async (installationIds: string[]) => {
    if (!address || installationIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {

      const identifier = {
        identifier: address as string,
        identifierKind: "Ethereum" as const
      };

      // Get inbox ID and installation info
      const existingClient = await Client.build(identifier, { env: "dev" });
      const inboxId = existingClient.inboxId;

      if (!inboxId) {
        throw new Error('No inbox ID found for client');
      }

      const inboxStates = await Client.inboxStateFromInboxIds([inboxId], "dev");
      const allInstallations = inboxStates[0].installations;

      // Find installations to revoke by ID
      const toRevokeInstallations = allInstallations.filter(installation =>
        installationIds.includes(installation.id)
      );

      if (toRevokeInstallations.length === 0) {
        throw new Error('No matching installations found to revoke');
      }

      const toRevokeInstallationBytes = toRevokeInstallations.map((i) => i.bytes);

      // Use static revocation
      await Client.revokeInstallations(
        signer,
        inboxId,
        toRevokeInstallationBytes,
        "dev"
      );

      // Try to reconnect
      await connectXmtpCore();

    } catch (err) {
      console.error("Failed to revoke specific installations:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke installations';
      setError(`Failed to revoke installations: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, connectXmtpCore]);

  // Clear local browser data for XMTP
  const clearLocalData = useCallback(() => {
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

      setClient(null);
      setError(null);
      setIsLoading(false);

      alert('XMTP local data cleared. Please refresh the page and try connecting again.');
    } catch (err) {
      console.error('Failed to clear local data:', err);
      alert('Failed to clear local data. Please manually clear your browser data for this site.');
    }
  }, []);

  // Reset XMTP completely
  const resetXmtp = useCallback(() => {
    setClient(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // Simple connect to XMTP like domainline
  const connectXmtp = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      await connectXmtpCore();
    } catch (err) {
      console.error("Failed to connect to XMTP:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to XMTP";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, connectXmtpCore]);

  // Auto-connect when wallet connects (like domainline)
  useEffect(() => {
    if (address && !client) {
      connectXmtp();
    }
  }, [address, client, connectXmtp]);

  // Auto-disconnect when wallet disconnects (like domainline)
  useEffect(() => {
    if (!address) {
      setClient(null);
      setError(null);
    }
  }, [address]);


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
        getInstallationInfo,
        revokeSpecificInstallations,
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
