import { DomaOrderbookSDKConfig } from "@doma-protocol/orderbook-sdk";

export const domaConfig: DomaOrderbookSDKConfig = {
  apiClientOptions: {
    baseUrl: process.env.NEXT_PUBLIC_DOMA_URL || "https://api.doma.dev",
    defaultHeaders: {
      "api-key": process.env.NEXT_PUBLIC_DOMA_API_KEY || "",
    },
  },
  source: process.env.NEXT_PUBLIC_APP_NAME || "domain-space",
  chains: [], // Will be populated with network configurations
};