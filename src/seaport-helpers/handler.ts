import type { JsonRpcSigner } from "ethers";
import { Seaport } from "@opensea/seaport-js";
import {
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  type ApiClient,
  type BlockchainActions,
  type BlockchainOperationHandler,
  type Caip2ChainId,
  type DomaOrderbookSDKConfig,
  type ProgressStep,
} from "@doma-protocol/orderbook-sdk";
import { executeAllActions } from "./actions";

export const ZONES: Record<string, string> = {
  "eip155:97476": "0xCEF2071b4246DB4D0E076A377348339f31a07dEA",
  "eip155:11155111": "0x037e8f3FD62BD12B1C116bD48588793e98211acb",
};

export abstract class SeaportOperationHandler<TParams, TResult>
  implements BlockchainOperationHandler<TParams, TResult>
{
  protected apiClient: ApiClient;
  protected chainId: Caip2ChainId;
  protected config: DomaOrderbookSDKConfig;
  protected onProgress?: (progress: ProgressStep[]) => void;
  protected signer: JsonRpcSigner;
  protected seaport: Seaport;

  constructor(
    config: DomaOrderbookSDKConfig,
    apiClient: ApiClient,
    signer: JsonRpcSigner,
    chainId: Caip2ChainId,
    onProgress?: (progress: ProgressStep[]) => void,
    options: {
      seaportBalanceAndApprovalChecksOnOrderCreation?: boolean;
    } = {}
  ) {
    const { seaportBalanceAndApprovalChecksOnOrderCreation = true } = options;

    this.config = config;
    this.apiClient = apiClient;
    this.chainId = chainId;
    this.onProgress = onProgress;
    this.signer = signer;
    this.seaport = new Seaport(this.signer, {
      balanceAndApprovalChecksOnOrderCreation:
        seaportBalanceAndApprovalChecksOnOrderCreation,
    });
  }

  protected async getWalletAddress(): Promise<string> {
    const walletAddress = await this.signer.getAddress();
    if (!walletAddress) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.SIGNER_NOT_PROVIDED,
        "Wallet address not found"
      );
    }
    return walletAddress;
  }

  protected async executeBlockchainOperation<R>(
    actions: ReadonlyArray<BlockchainActions>
  ): Promise<R> {
    return executeAllActions<R>(actions, {
      onProgress: this.onProgress,
    });
  }

  public abstract execute(params: TParams): Promise<TResult>;
}
