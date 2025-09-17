"use client";

import { useEffect, useState } from 'react';
import { useXMTPContext } from '@/contexts/XMTPContext';
import { useAccount } from 'wagmi';

export default function XMTPDiagnostic() {
  const { client, isLoading, error, isConnected } = useXMTPContext();
  const { address } = useAccount();
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        walletAddress: address,
        clientExists: !!client,
        clientInboxId: client?.inboxId,
        isLoading,
        isConnected,
        error: error ? (typeof error === 'string' ? error : (error as Error).message) : null,
        location: window.location.href,
        userAgent: navigator.userAgent,
        envVars: {
          hasNextPublicProjectId: !!process.env.NEXT_PUBLIC_PROJECT_ID,
          hasNextPublicDomaUrl: !!process.env.NEXT_PUBLIC_DOMA_URL,
          hasNextPublicDomaApiKey: !!process.env.NEXT_PUBLIC_DOMA_API_KEY,
        }
      };

      if (client) {
        try {
          const conversations = await client.conversations.list();
          results.conversationsCount = conversations.length;
          results.conversationTypes = conversations.map(c => c.constructor.name);
        } catch (err) {
          results.conversationsError = (err as Error).message;
        }
      }

      setDiagnostics(results);
      console.log('🔧 XMTP Diagnostics:', results);
    };

    if (address) {
      runDiagnostics();
    }
  }, [client, address, isLoading, isConnected, error]);

  if (process.env.NODE_ENV === 'production') {
    // Only show in development or when there's an error
    if (!error && isConnected) return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg text-xs max-w-md z-50 border border-yellow-500">
      <h3 className="text-yellow-400 font-bold mb-2">XMTP Diagnostics</h3>
      <pre className="text-xs overflow-auto max-h-96">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  );
}