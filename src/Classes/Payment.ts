import BaseModel, { BaseAttributes, BaseData } from "./Base";
import { CurrencyCode, ISODateTime } from "./Common";

export enum PaymentStatus {
  PENDING = "PENDING",
  AUTHORIZED = "AUTHORIZED",
  CAPTURED = "CAPTURED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
}

export enum PaymentMode {
  PAY_LATER = "PAY_LATER",
  CARD = "CARD",
  CASH = "CASH",
  NET_BANKING = "NET_BANKING",
  WALLET = "WALLET",
  COD = "COD",
  UNKNOWN = "UNKNOWN",
}

/**
 * Input attributes for creating or updating a PaymentModel.
 */
export type PaymentAttributes = BaseAttributes & {
  txnId: string;
  externalId?: string;
  orderNumber: string;
  customerId: string;
  status: PaymentStatus;
  subStatus?: string;
  amount: number;
  currency: CurrencyCode;
  paymentMode: PaymentMode;
  gatewayResponse?: string;
  gatewayErrorCode?: string;
  gatewayErrorMessage?: string;
  amountRefunded?: number;
  cardLast4?: string;
  cardBrand?: string;
  transactionAt: ISODateTime;
};

/**
 * Output data structure for a PaymentModel.
 * Excludes potentially large or sensitive fields by default.
 */
export type PaymentData = Omit<PaymentAttributes, 'gatewayResponse' | 'gatewayErrorMessage'> & BaseData

/**
 * Represents a payment transaction, attempt, or record associated with an order.
 */
export default class PaymentModel extends BaseModel {
  protected txnId: string;
  protected externalId?: string;
  protected orderNumber: string;
  protected customerId: string;
  protected status: PaymentStatus;
  protected subStatus?: string;
  protected amount: number;
  protected currency: CurrencyCode;
  protected paymentMode: PaymentMode;
  protected gatewayResponse?: string;
  protected gatewayErrorCode?: string;
  protected gatewayErrorMessage?: string;
  protected amountRefunded: number;
  protected cardLast4?: string;
  protected cardBrand?: string;
  protected transactionAt: ISODateTime;

  /**
   * Creates an instance of PaymentModel.
   * @param data - The initial payment attributes.
   * @param date - Optional date object for setting creation/modification times (defaults to now).
   */
  constructor(data: PaymentAttributes, date: Date = new Date()) {
    super(data, date); // Pass BaseAttributes to parent

    // Assign properties
    this.txnId = data.txnId;
    this.externalId = data.externalId;
    this.orderNumber = data.orderNumber;
    this.customerId = data.customerId;
    this.status = data.status;
    this.subStatus = data.subStatus;
    this.amount = data.amount;
    this.currency = data.currency;
    this.paymentMode = data.paymentMode;
    this.gatewayResponse = data.gatewayResponse;
    this.gatewayErrorCode = data.gatewayErrorCode;
    this.gatewayErrorMessage = data.gatewayErrorMessage;
    this.amountRefunded = data.amountRefunded || 0; // Default to 0 if undefined
    this.cardLast4 = data.cardLast4;
    this.cardBrand = data.cardBrand;
    this.transactionAt = data.transactionAt;
  }

  /**
   * Gets the primary transaction identifier.
   * @returns The transaction ID string.
   */
  public getTxnId(): string { return this.txnId; }

  /**
   * Gets the external identifier, often from a payment gateway.
   * @returns The external ID string, or undefined if not set.
   */
  public getExternalId(): string | undefined { return this.externalId; }

  /**
   * Gets the order number associated with this payment.
   * @returns The order number string.
   */
  public getOrderNumber(): string { return this.orderNumber; }

  /**
   * Gets the customer ID associated with this payment.
   * @returns The customer ID string.
   */
  public getCustomerId(): string { return this.customerId; }

  /**
   * Gets the current status of the payment (e.g., PENDING, CAPTURED).
   * @returns The PaymentStatus enum value.
   */
  public getStatus(): PaymentStatus { return this.status; }

  /**
   * Gets the detailed sub-status, often provided by the payment gateway.
   * @returns The sub-status string, or undefined if not set.
   */
  public getSubStatus(): string | undefined { return this.subStatus; }

  /**
   * Gets the amount of the payment transaction.
   * @returns The payment amount number.
   */
  public getAmount(): number { return this.amount; }

  /**
   * Gets the currency code for the payment amount.
   * @returns The CurrencyCode enum value.
   */
  public getCurrency(): CurrencyCode { return this.currency; }

  /**
   * Gets the mode or method used for the payment (e.g., CARD, COD).
   * @returns The PaymentMode enum value.
   */
  public getPaymentMode(): PaymentMode { return this.paymentMode; }

  /**
   * Gets the raw response data from the payment gateway (potentially large).
   * @returns The gateway response string, or undefined if not set.
   */
  public getGatewayResponse(): string | undefined { return this.gatewayResponse; }

  /**
   * Gets the error code returned by the payment gateway, if any.
   * @returns The gateway error code string, or undefined if no error occurred or wasn't recorded.
   */
  public getGatewayErrorCode(): string | undefined { return this.gatewayErrorCode; }

  /**
   * Gets the error message returned by the payment gateway, if any.
   * @returns The gateway error message string, or undefined if no error occurred or wasn't recorded.
   */
  public getGatewayErrorMessage(): string | undefined { return this.gatewayErrorMessage; }

  /**
   * Gets the total amount that has been refunded for this transaction.
   * @returns The refunded amount number (defaults to 0).
   */
  public getAmountRefunded(): number { return this.amountRefunded; }

  /**
   * Gets the last 4 digits of the card used, if applicable.
   * @returns The card's last 4 digits string, or undefined.
   */
  public getCardLast4(): string | undefined { return this.cardLast4; }

  /**
   * Gets the brand of the card used (e.g., Visa, Mastercard), if applicable.
   * @returns The card brand string, or undefined.
   */
  public getCardBrand(): string | undefined { return this.cardBrand; }

  /**
   * Gets the timestamp when the transaction occurred or was recorded.
   * @returns The transaction timestamp as an ISO 8601 string.
   */
  public getTransactionAt(): ISODateTime { return this.transactionAt; }


  /**
   * Gets a plain data object representing the payment's current state.
   * @returns PaymentData object suitable for serialization or API responses.
   */
  getDetails(): PaymentData {
    const baseDetails = super.getDetails();
    return {
      ...baseDetails,
      txnId: this.getTxnId(),
      externalId: this.getExternalId(),
      orderNumber: this.getOrderNumber(),
      customerId: this.getCustomerId(),
      status: this.getStatus(),
      subStatus: this.getSubStatus(),
      amount: this.getAmount(),
      currency: this.getCurrency(),
      paymentMode: this.getPaymentMode(),
      gatewayErrorCode: this.getGatewayErrorCode(),
      amountRefunded: this.getAmountRefunded(),
      cardLast4: this.getCardLast4(),
      cardBrand: this.getCardBrand(),
      transactionAt: this.getTransactionAt(),
    };
  }
}
