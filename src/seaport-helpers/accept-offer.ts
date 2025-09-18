/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TransactionReceipt } from "ethers";
import { SeaportOperationHandler } from "./handler";
import {
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  type AcceptOfferParams,
  type AcceptOfferResult,
} from "@doma-protocol/orderbook-sdk";
import { Hex } from "viem";

export class AcceptOfferHandler extends SeaportOperationHandler<
  AcceptOfferParams,
  AcceptOfferResult
> {
  public async execute(params: AcceptOfferParams): Promise<AcceptOfferResult> {
    const walletAddress = await this.getWalletAddress();

    const offer = await this.apiClient.getOffer({
      orderId: params.orderId,
      fulFillerAddress: walletAddress,
    });

    if (!offer) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.ORDER_NOT_FOUND,
        "Offer not found"
      );
    }

    try {
      const orderUseCase = await this.seaport.fulfillOrder({
        ...(offer as any),
        recipientAddress: walletAddress,
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
      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.ACCEPT_OFFER_FAILED,
        {
          chainId: this.chainId,
          params,
        }
      );
    }
  }
}