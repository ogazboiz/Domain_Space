import {
  CreateListingParams,
  CreateListingResult,
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  HOURS_IN_DAY,
  ListingItem,
  MILLISECONDS_IN_SECOND,
  MINUTES_IN_HOUR,
  prepareFees,
  ProgressStep,
  SECONDS_IN_MINUTE,
} from "@doma-protocol/orderbook-sdk";
import { SeaportOperationHandler, ZONES } from "./handler";
import { Seaport } from "@opensea/seaport-js";
import { Fee, OrderWithCounter } from "@opensea/seaport-js/lib/types";
import { buildListingOrderInput } from "./actions";

export class ListingHandler extends SeaportOperationHandler<
  CreateListingParams,
  CreateListingResult
> {
  private readonly DEFAULT_LIST_DURATION =
    HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;

  public async execute(
    params: CreateListingParams
  ): Promise<CreateListingResult> {
    try {
      const { items, marketplaceFees } = params;

      this.validateInputs(items);
      const walletAddress = await this.getWalletAddress();

      const fees = prepareFees(marketplaceFees);

      if (items.length !== 1) {
        throw new DomaOrderbookError(
          DomaOrderbookErrorCode.INVALID_PARAMETERS,
          "Listing of multiple items is not supported"
        );
      }

      return await this.handleSingleListing(
        items[0],
        walletAddress,
        this.seaport,
        fees,
        params
      );
    } catch (error) {
      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.LISTING_CREATION_FAILED,
        {
          chainId: this.chainId,
          params,
        }
      );
    }
  }

  private validateInputs(items: ListingItem[] | undefined): void {
    if (!items?.length) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.INVALID_PARAMETERS,
        "At least one item must be provided"
      );
    }
  }

  private async handleSingleListing(
    item: ListingItem,
    walletAddress: string,
    seaport: Seaport,
    fees: Fee[],
    params: CreateListingParams
  ): Promise<CreateListingResult> {
    const endTime = Math.floor(
      (Date.now() + (item.duration || this.DEFAULT_LIST_DURATION)) /
        MILLISECONDS_IN_SECOND
    );
    const createOrderInput = buildListingOrderInput(
      item,
      walletAddress,
      endTime,
      fees,
      ZONES[this.chainId]
    );

    const orderUseCase = await seaport.createOrder(
      createOrderInput,
      walletAddress
    );

    const result = await this.executeBlockchainOperation<OrderWithCounter>(
      orderUseCase.actions
    );

    const listingResponse = await this.apiClient.createListing({
      signature: result.signature,
      orderbook: params.orderbook,
      chainId: this.chainId,
      parameters: result.parameters,
    });

    return {
      orders: [{ orderId: listingResponse.orderId, orderData: result }],
    };
  }
}