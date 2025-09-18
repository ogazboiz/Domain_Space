/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  CancelOfferParams,
  CancelOfferResult,
  createOffChainCancelAction,
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  GetOrderResponse,
  OffChainCancel,
  parseChainId,
} from "@doma-protocol/orderbook-sdk";
import { SeaportOperationHandler } from "./handler";
import { Hex } from "viem";
import { TransactionReceipt } from "ethers";

export class CancelOfferHandler extends SeaportOperationHandler<
  CancelOfferParams,
  CancelOfferResult
> {
  private async validateAndGetOffer(orderId: string, fulFillerAddress: string) {
    const offer = await this.apiClient.getOffer({
      orderId,
      fulFillerAddress,
    });

    if (!offer) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.ORDER_NOT_FOUND,
        "Offer not found"
      );
    }

    return offer;
  }

  private async cancelOffChain(orderId: string): Promise<CancelOfferResult> {
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

    await this.apiClient.cancelOffer({
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
    offer: GetOrderResponse
  ): Promise<CancelOfferResult> {
    const cancelOrdersAction = this.seaport.cancelOrders([
      {
        ...(offer as any).order.parameters,
      },
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
      transactionHash: result.hash as Hex,
      status: result.status === 1 ? "success" : "reverted",
    };
  }

  public async execute(params: CancelOfferParams): Promise<CancelOfferResult> {
    const walletAddress = await this.getWalletAddress();

    try {
      const offer = await this.validateAndGetOffer(
        params.orderId,
        walletAddress
      );

      if (params.cancellationType === "off-chain") {
        return await this.cancelOffChain(params.orderId);
      }

      return await this.cancelOnChain(offer);
    } catch (error) {
      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.OFFER_CANCELLATION_FAILED,
        {
          chainId: this.chainId,
          params,
        }
      );
    }
  }
}