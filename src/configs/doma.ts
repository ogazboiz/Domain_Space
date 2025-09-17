import { DomaOrderbookSDKConfig } from "@doma-protocol/orderbook-sdk";
import { networks } from "../config/wagmi";

export const domaConfig: DomaOrderbookSDKConfig = {
  apiClientOptions: {
    baseUrl: process.env.NEXT_PUBLIC_DOMA_URL || "",
    defaultHeaders: {
      "Api-Key": process.env.NEXT_PUBLIC_DOMA_API_KEY || "",
    },
  },
  source: process.env.NEXT_PUBLIC_APP_NAME || "domain-space",
  chains: networks.map((network) => ({
    id: network.id,
    name: network.name,
    rpcUrls: {
      default: {
        http: network.rpcUrls.default.http,
      },
    },
    nativeCurrency: network.nativeCurrency,
    blockExplorers: network.blockExplorers,
    testnet: network.testnet || false,
  })),
};