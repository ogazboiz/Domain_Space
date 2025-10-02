"use client";

import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useHelper } from "@/hooks/use-helper";

interface ConnectWalletProps {
  title?: string;
  description: string;
}

export function ConnectWallet({
  title = "Connect Your Wallet",
  description,
}: ConnectWalletProps) {
  const { address, isConnecting, isReconnecting } = useAccount();
  const { login } = usePrivy();
  const { trimAddress } = useHelper();

  const handleConnect = async () => {
    try {
      await login();
    } catch (error: unknown) {
      console.error("Connection error:", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-4 rounded-full bg-gray-800 border border-white/20">
          <div className="h-8 w-8 text-white">💳</div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isConnecting || isReconnecting ? "Connecting to Wallet" : title}
          </h2>
          <p className="text-gray-400 max-w-md text-base">
            {description}
          </p>
        </div>
        <button
          disabled={isConnecting || isReconnecting}
          onClick={handleConnect}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
        >
          {(isConnecting || isReconnecting) && (
            <span className="animate-spin mr-2">⏳</span>
          )}
          {address ? trimAddress(address, 5) : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
}