import type { Seaport } from "@opensea/seaport-js";
import type {
  OrderWithCounter,
  Fee,
  CreateOrderInput,
} from "@opensea/seaport-js/lib/types";
import { mapInputItemToOfferItem } from "@opensea/seaport-js/lib/utils/order";
import type { JsonRpcProvider, JsonRpcSigner, Signer } from "ethers";
import {
  getBalancesAndApprovals,
  validateOfferBalancesAndApprovals,
} from "@opensea/seaport-js/lib/utils/balanceAndApprovalCheck";
import { getApprovalActions } from "@opensea/seaport-js/lib/utils/approval";
import {
  ApiClient,
  Caip2ChainId,
  createWethDepositTransaction,
  CurrencyToken,
  DomaOrderbookError,
  DomaOrderbookErrorCode,
  DomaOrderbookSDKConfig,
  HOURS_IN_DAY,
  MILLISECONDS_IN_SECOND,
  MINUTES_IN_HOUR,
  prepareFees,
  ProgressStep,
  SECONDS_IN_MINUTE,
  Weth__factory,
  type BlockchainActions,
  type CreateOfferParams,
  type CreateOfferResult,
  type OfferItem,
  type WethConversionAction,
} from "@doma-protocol/orderbook-sdk";
import { SeaportOperationHandler, ZONES } from "./handler";
import { buildOfferOrderInput } from "./actions";

export class CreateOfferHandler extends SeaportOperationHandler<
  CreateOfferParams,
  CreateOfferResult
> {
  private readonly DEFAULT_LIST_DURATION =
    HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;

  private readonly currencies: CurrencyToken[];

  constructor(
    config: DomaOrderbookSDKConfig,
    apiClient: ApiClient,
    signer: JsonRpcSigner,
    chainId: Caip2ChainId,
    onProgress?: (progress: ProgressStep[]) => void,
    options: {
      seaportBalanceAndApprovalChecksOnOrderCreation?: boolean;
    } = {},
    currencies: CurrencyToken[] = []
  ) {
    super(config, apiClient, signer, chainId, onProgress);
    this.currencies = currencies;
  }

  public async execute(params: CreateOfferParams): Promise<CreateOfferResult> {
    try {
      const { items, marketplaceFees } = params;

      this.validateInputs(items);
      const walletAddress = await this.getWalletAddress();

      const fees = prepareFees(marketplaceFees);

      if (items.length !== 1) {
        throw new DomaOrderbookError(
          DomaOrderbookErrorCode.INVALID_PARAMETERS,
          "Offer of multiple items is not supported"
        );
      }

      return await this.handleSingleOffer(
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

  private validateInputs(items: OfferItem[] | undefined): void {
    if (!items?.length) {
      throw new DomaOrderbookError(
        DomaOrderbookErrorCode.INVALID_PARAMETERS,
        "At least one item must be provided"
      );
    }
  }

  private async handleSingleOffer(
    item: OfferItem,
    walletAddress: string,
    seaport: Seaport,
    fees: Fee[],
    params: CreateOfferParams
  ): Promise<CreateOfferResult> {
    try {
      const endTime = Math.floor(
        (Date.now() + (item.duration || this.DEFAULT_LIST_DURATION)) /
          MILLISECONDS_IN_SECOND
      );

      const createOrderInput = buildOfferOrderInput(
        item,
        walletAddress,
        endTime,
        fees,
        ZONES[this.chainId]
      );

      const actions: BlockchainActions[] = [];

      const approvalActions = await this.getApprovalActions(
        walletAddress,
        createOrderInput,
        this.signer,
        false
      );
      if (approvalActions.length) {
        actions.push(...approvalActions);
      }

      if (
        this.currencies?.[0].contractAddress === item.currencyContractAddress
      ) {
        const weth = Weth__factory.connect(
          item.currencyContractAddress,
          this.signer
        );
        const wethBalance = await weth.balanceOf(walletAddress);
        const difference = BigInt(item.price) - wethBalance;

        if (difference > 0n) {
          const ethBalance = await this.signer.provider.getBalance(
            walletAddress
          );

          if (ethBalance < difference) {
            throw new DomaOrderbookError(
              DomaOrderbookErrorCode.INSUFFICIENT_ETH_BALANCE,
              "Insufficient funds to cover WETH conversion"
            );
          }

          const wethDepositTransaction: WethConversionAction = {
            type: "conversion",
            transactionMethods: createWethDepositTransaction(
              this.signer,
              weth,
              difference
            ),
          };
          actions.push(wethDepositTransaction);
        }
      }

      const orderUseCase = await seaport.createOrder(
        createOrderInput,
        walletAddress
      );
      actions.push(...orderUseCase.actions);

      const result = await this.executeBlockchainOperation<OrderWithCounter>(
        actions
      );

      const listingResponse = await this.apiClient.createOffer({
        signature: result.signature,
        orderbook: params.orderbook,
        chainId: this.chainId,
        parameters: result.parameters,
      });

      return {
        orders: [{ orderId: listingResponse.orderId, orderData: result }],
      };
    } catch (error) {
      throw DomaOrderbookError.fromError(
        error,
        DomaOrderbookErrorCode.OFFER_CREATION_FAILED
      );
    }
  }

  private async getApprovalActions(
    offerer: string,
    order: CreateOrderInput,
    provider: JsonRpcProvider | Signer,
    exactApproval: boolean
  ) {
    const mappedOfferItems = order.offer.map(mapInputItemToOfferItem);

    const conduitKey =
      order.conduitKey ||
      "0x0000000000000000000000000000000000000000000000000000000000000000";

    const operator =
      conduitKey ===
      "0x0000000000000000000000000000000000000000000000000000000000000000"
        ? await this.seaport.contract.getAddress()
        : conduitKey;

    const balancesAndApprovals = await getBalancesAndApprovals({
      owner: offerer,
      items: mappedOfferItems,
      criterias: [],
      provider: provider as JsonRpcProvider,
      operator,
    });

    const insufficientApprovals = validateOfferBalancesAndApprovals({
      offer: mappedOfferItems,
      criterias: [],
      balancesAndApprovals,
      throwOnInsufficientBalances: false,
      operator,
    });

    return getApprovalActions(
      insufficientApprovals,
      exactApproval,
      provider as Signer
    );
  }
}
