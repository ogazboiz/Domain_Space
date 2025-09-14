import { Caip2ChainId, OrderbookType } from "@doma-protocol/orderbook-sdk";

export type Paging<T> = {
  items: T[];
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type Name = {
  name: string;
  claimedBy: string;
  eoi: boolean;
  expiresAt: string;
  isFractionalized: boolean;
  tokenizedAt: string;
  transferLock: boolean;
  tokens: Token[];
  registrar: Registrar;
  nameservers: NameServer[];
  activities: NameActivity[];
};

export type NameStats = {
  activeOffers: number;
  offersLast3Days: number;
  highestOffer?: Offer;
};

export type NameSort = "DOMAIN" | "CHAIN" | "REGISTRAR" | "EXPIRES_AT";

export type NameClaimStatus = "CLAIMED" | "UNCLAIMED" | "ALL";

export type NameActivityType =
  | "TOKENIZED"
  | "CLAIMED"
  | "RENEWED"
  | "DETOKENIZED"
  | "CLAIM_REQUESTED"
  | "CLAIM_APPROVED"
  | "CLAIM_REJECTED";

export type NameActivity = {
  type: NameActivityType;
  txHash: string;
  sld: string;
  tld: string;
  createdAt: string;
  networkId: string;
};

export interface NameServer {
  ldhName: string;
}

export type Token = {
  orderbookDisabled: boolean | null;
  startsAt: string | null;
  openseaCollectionSlug: string | null;
  networkId: string;
  tokenId: string;
  tokenAddress: string;
  createdAt: string;
  expiresAt: string;
  explorerUrl: string;
  ownerAddress: string;
  chain: Chain;
  listings: Listing[];
};

export type Listing = {
  id: string;
  name: string;
  orderbook: OrderbookType;
  price: string;
  chain: Chain;
  currency: Currency;
  nameExpiresAt: string;
  offererAddress: string;
  externalId: string;
  expiresAt: string;
  registrar: Registrar;
  tokenId: string;
  tokenAddress: string;
  updatedAt: string;
};

export type Chain = {
  name: string;
  networkId: Caip2ChainId;
  addressUrlTemplate: string | null;
};

export type Currency = {
  name: string;
  decimals: number;
  usdExchangeRate: number;
  symbol: string;
};

export type Registrar = {
  name: string;
  ianaId: string;
  publicKeys: string[];
  supportEmail: string;
  websiteUrl: string;
};

export type SortOrderType = "ASC" | "DESC";

export type Offer = {
  externalId: string;
  price: string;
  tokenAddress: string;
  offererAddress: string;
  orderbook: string;
  expiresAt: string;
  createdAt: string;
  name: string;
  id: string;
  nameExpiresAt: string;
  tokenId: string;
  chain: Chain;
  currency: Currency;
};

export type TLDFilter = {
  name: string;
  value: string;
};