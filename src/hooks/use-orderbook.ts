import { domaConfig } from "@/configs/doma";
import { useWalletClient } from 'wagmi';
import {
  AcceptOfferParams,
  AcceptOfferResult,
  ApiClient,
  BuyListingParams,
  BuyListingResult,
  Caip2ChainId,
  CancelListingParams,
  CancelListingResult,
  CancelOfferParams,
  CancelOfferResult,
  CreateListingParams,
  CreateListingResult,
  CreateOfferParams,
  CreateOfferResult,
  CurrencyToken,
  GetOrderbookFeeRequest,
  GetSupportedCurrenciesRequest,
  OnProgressCallback,
  RequestOptions,
  viemToEthersSigner,
} from "@doma-protocol/orderbook-sdk";
import { JsonRpcSigner } from "ethers";

export const useOrderbook = () => {
  const apiClient: ApiClient = new ApiClient(domaConfig.apiClientOptions);
  const { data: walletClient } = useWalletClient();

  const createOffer = async ({
    params,
    signer,
    chainId,
    onProgress,
    hasWethOffer,
    currencies,
  }: {
    params: CreateOfferParams;
    signer: JsonRpcSigner;
    chainId: Caip2ChainId;
    onProgress: OnProgressCallback;
    hasWethOffer: boolean;
    currencies: CurrencyToken[];
  }): Promise<CreateOfferResult> => {
    const { CreateOfferHandler } = await import("@/seaport-helpers/create-offer");
    const handler = new CreateOfferHandler(
      domaConfig,
      apiClient,
      signer,
      chainId,
      onProgress,
      {
        seaportBalanceAndApprovalChecksOnOrderCreation: !hasWethOffer,
      },
      currencies
    );

    return handler.execute(params);
  };

  const acceptOffer = async ({
    params,
    signer,
    chainId,
    onProgress,
  }: {
    params: AcceptOfferParams;
    signer: JsonRpcSigner;
    chainId: Caip2ChainId;
    onProgress: OnProgressCallback;
  }): Promise<AcceptOfferResult> => {
    const { AcceptOfferHandler } = await import("@/seaport-helpers/accept-offer");
    const handler = new AcceptOfferHandler(
      domaConfig,
      apiClient,
      signer,
      chainId,
      onProgress
    );

    return handler.execute(params);
  };

  const cancelOffer = async ({
    params,
    signer,
    chainId,
    onProgress,
  }: {
    params: CancelOfferParams;
    signer: JsonRpcSigner;
    chainId: Caip2ChainId;
    onProgress: OnProgressCallback;
  }): Promise<CancelOfferResult> => {
    const { CancelOfferHandler } = await import("@/seaport-helpers/cancel-offer");
    const handler = new CancelOfferHandler(
      domaConfig,
      apiClient,
      signer,
      chainId,
      onProgress
    );

    return handler.execute(params);
  };

  const buyListing = async ({
    params,
    signer,
    chainId,
    onProgress,
  }: {
    params: BuyListingParams;
    signer: JsonRpcSigner;
    chainId: Caip2ChainId;
    onProgress: OnProgressCallback;
  }): Promise<BuyListingResult> => {
    const { BuyListingHandler } = await import("@/seaport-helpers/buy-listing");
    const handler = new BuyListingHandler(
      domaConfig,
      apiClient,
      signer,
      chainId,
      onProgress
    );

    return handler.execute(params);
  };

  const cancelListing = async ({
    params,
    signer,
    chainId,
    onProgress,
  }: {
    params: CancelListingParams;
    signer?: JsonRpcSigner | null;
    chainId: Caip2ChainId;
    onProgress?: OnProgressCallback;
  }): Promise<CancelListingResult> => {
    // Create signer if not provided
    const ethersSigner = signer || (walletClient ? viemToEthersSigner(walletClient, chainId) : null);

    if (!ethersSigner) {
      throw new Error("No wallet connected or signer provided");
    }

    const { CancelListingHandler } = await import("@/seaport-helpers/cancel-listing");
    const handler = new CancelListingHandler(
      domaConfig,
      apiClient,
      ethersSigner,
      chainId,
      onProgress || (() => {})
    );

    return handler.execute(params);
  };

  const createListing = async ({
    params,
    signer,
    chainId,
    onProgress,
  }: {
    params: CreateListingParams;
    signer?: JsonRpcSigner | null;
    chainId: Caip2ChainId;
    onProgress?: OnProgressCallback;
  }): Promise<CreateListingResult> => {
    // Create signer if not provided
    const ethersSigner = signer || (walletClient ? viemToEthersSigner(walletClient, chainId) : null);

    if (!ethersSigner) {
      throw new Error("No wallet connected or signer provided");
    }

    const { ListingHandler } = await import("@/seaport-helpers/create-listing");
    const handler = new ListingHandler(
      domaConfig,
      apiClient,
      ethersSigner,
      chainId,
      onProgress || (() => {})
    );

    return handler.execute(params);
  };

  const getSupportedCurrencies = (
    params: GetSupportedCurrenciesRequest,
    options?: RequestOptions
  ) => {
    return apiClient.getSupportedCurrencies(params, options);
  };

  const getOrderbookFee = (
    params: GetOrderbookFeeRequest,
    options?: RequestOptions
  ) => {
    return apiClient.getOrderbookFee(params, options);
  };

  return {
    acceptOffer,
    createOffer,
    createListing,
    cancelOffer,
    buyListing,
    cancelListing,
    getSupportedCurrencies,
    getOrderbookFee,
  };
};