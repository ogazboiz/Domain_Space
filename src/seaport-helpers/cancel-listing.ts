import type { TransactionReceipt } from "ethers";
import type { OrderComponents } from "@opensea/seaport-js/lib/types";
import { SeaportOperationHandler } from "./handler";
import {
  CancelListingParams,
  CancelListingResult,
  createOffChainCancelAction,
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  GetOrderResponse,
  OffChainCancel,
  parseChainId,
} from "@doma-protocol/orderbook-sdk";

export class CancelListingHandler extends SeaportOperationHandler<
  CancelListingParams,
  CancelListingResult
> {
  private async validateAndGetListing(
    orderId: string,
    fulFillerAddress: string
  ) {
    const listing = await this.apiClient.getListing({
      orderId,
      fulFillerAddress,
    });

    if (!listing) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.ORDER_NOT_FOUND,
        "Listing not found"
      );
    }

    return listing;
  }

  private async cancelOffChain(orderId: string): Promise<CancelListingResult> {
    const seaportAddress = await this.seaport.contract.getAddress();

    const offchainCancelAction = createOffChainCancelAction(
      this.signer,
      orderId,
      seaportAddress,
      parseChainId(this.chainId)
    );

    const cancelResult = await this.executeBlockchainOperation<OffChainCancel>([
      offchainCancelAction,
    ]);

    await this.apiClient.cancelListing({
      orderId: orderId,
      signature: cancelResult.signature,
    });

    return {
      transactionHash: null,
      status: "success",
      gasUsed: 0n,
      gasPrice: 0n,
    };
  }

  private async cancelOnChain(
    listing: GetOrderResponse
  ): Promise<CancelListingResult> {
    const cancelOrdersAction = this.seaport.cancelOrders([
      (listing as GetOrderResponse & { parameters: OrderComponents }).parameters,
    ]);

    const result = await this.executeBlockchainOperation<TransactionReceipt>([
      {
        type: "cancelOrder",
        transactionMethods: cancelOrdersAction,
      },
    ]);

    return {
      gasPrice: result.gasPrice,
      gasUsed: result.gasUsed,
      transactionHash: result.hash as `0x${string}`,
      status: result.status === 1 ? "success" : "reverted",
    };
  }

  public async execute(
    params: CancelListingParams
  ): Promise<CancelListingResult> {
    try {
      const walletAddress = await this.signer.getAddress();

      const listing = await this.validateAndGetListing(
        params.orderId,
        walletAddress
      );

      if (params.cancellationType === "off-chain") {
        return await this.cancelOffChain(params.orderId);
      }

      return await this.cancelOnChain(listing);
    } catch (error) {
      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.LISTING_CANCELLATION_FAILED,
        {
          chainId: this.chainId,
          params,
        }
      );
    }
  }
}