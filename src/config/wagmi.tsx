import { cookieStorage, createStorage } from '@wagmi/core'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { sepolia } from '@reown/appkit/networks'

// Get projectId from environment variable or use fallback
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || "1922d8f34388fb1c3b3553c342d31094"

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Custom Doma Testnet configuration
const domaTestnet = {
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

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
})

export const config = wagmiAdapter.wagmiConfig