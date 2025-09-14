// context/appkit.tsx
"use client";
import { createAppKit } from "@reown/appkit/react";
import { wagmiAdapter, networks, projectId } from "@/config/wagmi";
import { ReactNode } from "react";

// Create a metadata object
const metadata = {
  name: "DOMA Domain Space",
  description: "DOMA Domain Marketplace - Testnet Mode",
  url: "https://domain-space.doma.xyz",
  icons: ["https://domain-space.doma.xyz/logo.png"],
};

// Log network info for debugging
console.log(`🌍 AppKit Environment: Testnet`);
console.log(`📡 Supported Networks:`, networks.map(n => n.name));

// Create the AppKit instance using the same wagmiAdapter
createAppKit({
  adapters: [wagmiAdapter],
  metadata,
  networks: networks,
  projectId,
  features: {
    analytics: true,
  },
  // Testnet specific configurations
  enableExplorer: true,
  enableOnramp: false, // Disable on-ramp for testnets
});

interface AppKitProps {
  children: ReactNode;
}

export function AppKit({ children }: AppKitProps) {
  return <>{children}</>;
}
