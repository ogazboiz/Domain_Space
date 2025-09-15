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

  // Connect to XMTP (exact domainline pattern)
  const connectXmtp = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    
    try {
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
    } catch (err) {
      console.error("Failed to connect to XMTP:", err);
      setError(err instanceof Error ? err.message : "Failed to connect to XMTP");
    } finally {
      setIsLoading(false);
    }
  }, [address, signer]);

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
