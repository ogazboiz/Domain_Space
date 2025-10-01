import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { sepolia } from 'viem/chains'
import type { Chain } from 'viem'

// Custom Doma Testnet configuration
export const domaTestnet: Chain = {
  id: 97476,
  name: "Doma Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
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
}

export const networks = [sepolia, domaTestnet]

// Set up the Wagmi Config for Privy
export const config = createConfig({
  chains: [sepolia, domaTestnet],
  transports: {
    [sepolia.id]: http(),
    [domaTestnet.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
})