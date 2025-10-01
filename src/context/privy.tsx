"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/config/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

interface PrivyProvidersProps {
  children: ReactNode;
}

export function PrivyProviders({ children }: PrivyProvidersProps) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        // Appearance customization
        appearance: {
          theme: "dark",
          accentColor: "#9333EA", // purple-600 to match your theme
          // PNG logo (180px x 90px recommended)
          logo: "/logo_white.png",
          // Customize modal appearance
          landingHeader: "Welcome to Domain Space",
          loginMessage: "Connect your wallet to start trading premium domains",
          showWalletLoginFirst: true,
        },
        // Create embedded wallets for users who don't have a wallet
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        // Login methods - order matters for display
        loginMethods: ["wallet", "email", "google", "twitter"],
        // Wallet configuration
        externalWallets: {
          coinbaseWallet: {
            // Coinbase Wallet configuration
          },
        },
        // Default chain
        defaultChain: config.chains[0],
        // Supported chains
        supportedChains: [...config.chains],
        // Legal and branding
        legal: {
          termsAndConditionsUrl: "https://domain-space.doma.xyz/terms",
          privacyPolicyUrl: "https://domain-space.doma.xyz/privacy",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
