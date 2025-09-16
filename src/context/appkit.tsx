// context/appkit.tsx
"use client";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, projectId, networks } from "@/config/wagmi";
import { sepolia, defineChain } from "@reown/appkit/networks";
import { ReactNode } from "react";

// Create a metadata object
const metadata = {
  name: "DOMA Domain Space",
  description: "DOMA Domain Marketplace - Testnet Mode",
  url: "https://domain-space.doma.xyz",
  icons: ["https://domain-space.doma.xyz/logo.png"],
};

// Custom Doma Testnet configuration using AppKit's defineChain
const domaTestnet = defineChain({
  id: 97476,
  caipNetworkId: 'eip155:97476',
  chainNamespace: 'eip155',
  name: 'Doma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ["https://rpc-testnet.doma.xyz"],
    },
    public: {
      http: ["https://rpc-testnet.doma.xyz"],
    },
  },
  blockExplorers: {
    default: { name: "Doma Explorer", url: "https://explorer-testnet.doma.xyz" },
  },
  testnet: true,
});

// Define networks array
// const networking = [sepolia, domaTestnet];

// Log network info for debugging
console.log(`🌍 AppKit Environment: Testnet`);
console.log(`📡 Supported Networks:`, networks.map(n => n.name));

// Create the AppKit instance using the same wagmiAdapter
createAppKit({
  adapters: [wagmiAdapter],
  metadata,
  networks: [sepolia, domaTestnet],
  projectId,
  features: {
    analytics: true,
  },
});

interface AppKitProps {
  children: ReactNode;
}

export function AppKit({ children }: AppKitProps) {
  return <>{children}</>;
}
