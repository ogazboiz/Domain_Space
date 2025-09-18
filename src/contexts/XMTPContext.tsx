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

  // Connect to XMTP with auto-revoke on installation limit
  const connectXmtp = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);

    try {
      await connectXmtpCore();
    } catch (err) {
      console.error("Failed to connect to XMTP:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to XMTP";

      // Check if it's the installation limit error and auto-revoke
      if (errorMessage.includes('10/10 installations')) {
        console.log('🔄 Installation limit reached, attempting auto-revoke...');
        setError('Installation limit reached. Cleaning up old installations...');
        // Auto-revoke installations and retry
        await revokeInstallations();
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [address, connectXmtpCore, revokeInstallations]);

  // Function to revoke old installations using static revocation
  const revokeInstallations = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Revoking old XMTP installations using static revocation...');

      // Step 1: Get the inbox ID for this address
      const inboxId = await Client.getInboxIdForAddress(address as string, { env: "dev" });
      console.log(`Found inbox ID: ${inboxId}`);

      // Step 2: Get the inbox states to see all installations
      const inboxStates = await Client.inboxStateFromInboxIds([inboxId], "dev");
      console.log(`Found ${inboxStates[0].installations.length} installations`);

      // Step 3: Get installation bytes to revoke (keep only the most recent 2-3)
      const installations = inboxStates[0].installations;
      if (installations.length > 3) {
        // Revoke all but the most recent 2 installations
        const toRevokeInstallations = installations.slice(0, -2);
        const toRevokeInstallationBytes = toRevokeInstallations.map((i) => i.bytes);

        console.log(`Revoking ${toRevokeInstallations.length} old installations...`);

        // Step 4: Use static revocation (doesn't require being logged in)
        await Client.revokeInstallations(
          signer,
          inboxId,
          toRevokeInstallationBytes,
          "dev",
          { enableLogging: true }
        );

        console.log('✅ Installation cleanup completed');
      } else {
        console.log('No installations need to be revoked');
      }

      // Now try to connect again using core logic
      await connectXmtpCore();

    } catch (err) {
      console.error("Failed to revoke installations:", err);
      setError(err instanceof Error ? err.message : 'Failed to revoke installations');
    } finally {
      setIsLoading(false);
    }
  }, [address, signer, connectXmtpCore]);

  // Reset XMTP completely
  const resetXmtp = useCallback(() => {
    console.log('🔄 Resetting XMTP context completely');
    setClient(null);
    setIsLoading(false);
    setError(null);
  }, []);

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
