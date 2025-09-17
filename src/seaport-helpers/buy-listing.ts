/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BuyListingParams,
  BuyListingResult,
  DomaOrderbookError,
  DomaOrderbookErrorCode,
} from "@doma-protocol/orderbook-sdk";
import { SeaportOperationHandler } from "./handler";
import type { TransactionReceipt } from "ethers";
import { Hex } from "viem";

export class BuyListingHandler extends SeaportOperationHandler<
  BuyListingParams,
  BuyListingResult
> {
  public async execute(params: BuyListingParams): Promise<BuyListingResult> {
    const walletAddress = await this.signer.getAddress();

    const listing = await this.apiClient.getListing({
      orderId: params.orderId,
      fulFillerAddress: walletAddress,
    });

    if (!listing) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.ORDER_NOT_FOUND,
        "Listing not found"
      );
    }

    try {
      const orderUseCase = await this.seaport.fulfillOrder({
        order: (listing as any).order,
        extraData: (listing as any)?.extraData ?? "",
        unitsToFill: (listing as any)?.extraData ? 1n : 0,
      });

      const result = await this.executeBlockchainOperation<TransactionReceipt>(
        orderUseCase.actions
      );

      return {
        gasPrice: result.gasPrice,
        gasUsed: result.gasUsed,
        transactionHash: result.hash as Hex,
        status: result.status === 1 ? "success" : "reverted",
      };
    } catch (error) {
      console.log({ error });

      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.BUY_LISTING_FAILED,
        {
          chainId: this.chainId,
          params,
        }
      );
    }
  }
}
