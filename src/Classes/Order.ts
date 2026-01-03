import AddressModel, { AddressData } from "./Address";
import { LineItemNotFoundError } from "./Error";
import { LineItemState } from "./Enum";
import { PaymentStatus } from "./Payment";
import BaseShoppingContainerModel, { BaseShoppingContainerAttributes, BaseShoppingContainerData, ShoppingContainerTotal } from "./ShoppingContainer";

/**
 * PLACED: Order created, awaiting payment.
 * PENDING_PAYMENT: Waiting for payment confirmation.
 * PROCESSING: Payment received, order is being fulfilled. Stays here until all line items reach a final state.
 * CANCELLED: All line items are cancelled, or order is cancelled before fulfillment.
 * COMPLETED: All line items are delivered, returned, or refunded.
 */
export enum OrderState {
  PLACED = "PLACED",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PROCESSING = "PROCESSING",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED"
}

/**
 * Input attributes for creating an OrderModel.
 * Extends CartAttributes but requires/adds order-specific fields.
 */
export type OrderAttributes = Omit<BaseShoppingContainerAttributes, 'anonymousId'> & {
  customerId: string;
  customerEmail: string;
  shippingAddress: AddressData;
  billingAddress: AddressData;
  anonymousId?: string;
  total: Required<ShoppingContainerTotal>;
  orderNumber: string;
  cartId: string;
  paymentStatus: PaymentStatus;
  holdReason?: string;
  state: OrderState;
};

/**
 * Output data structure for an OrderModel.
 */
export type OrderData = BaseShoppingContainerData & OrderAttributes & {
  holdReason: string;
};


export default class OrderModel extends BaseShoppingContainerModel {
  protected orderNumber: string;
  protected cartId: string;
  protected paymentStatus: PaymentStatus;
  protected holdReason: string;
  protected state: OrderState;

  /**
   * Creates an instance of OrderModel.
   * @param data - The initial order attributes, including cart data.
   * @param date - Optional date for setting creation/modification times (defaults to now).
   * @param config - Optional cart configuration (might be less relevant for orders).
   */
  constructor(data: OrderAttributes, date: Date = new Date()) {
    super(data, date);
    this.orderNumber = data.orderNumber;
    this.cartId = data.cartId;
    this.paymentStatus = data.paymentStatus;
    this.holdReason = data.holdReason || '';
    this.state = data.state;
  }

  /**
   * Gets the customer ID associated with this order.
   * Overrides the base method to guarantee a non-undefined return type for orders.
   * @returns The customer ID string.
   */
  public getCustomerId(): string {
    return this.customerId as string;
  }

  /**
   * Gets the customer email associated with this order.
   * Overrides the base method to guarantee a non-undefined return type for orders.
   * @returns The customer email string.
   */
  public getCustomerEmail(): string {
    return this.customerEmail as string;
  }

  /**
   * Gets the shipping address associated with the order.
   * Overrides the base method to guarantee a non-null return type for orders.
   * @returns An AddressModel instance for the shipping address.
   */
  public getShippingAddress(): AddressModel {
    return this.shippingAddress as AddressModel;
  }

  /**
   * Gets the billing address associated with the order.
   * Overrides the base method to guarantee a non-null return type for orders.
   * @returns An AddressModel instance for the billing address.
   */
  public getBillingAddress(): AddressModel {
    return this.billingAddress as AddressModel;
  }


  /**
   * Gets the user-facing order number.
   * @returns The order number string.
   */
   public getOrderNumber(): string {
    return this.orderNumber;
  }

  /**
   * Gets the ID of the cart from which this order was created.
   * @returns The cart ID string.
   */
  public getCartId(): string {
    return this.cartId;
  }

  /**
   * Gets the current payment status of the order.
   * @returns The PaymentStatus enum value.
   */
  public getPaymentStatus(): PaymentStatus {
    return this.paymentStatus;
  }

  /**
   * Gets the reason why the order might be on hold, if any.
   * @returns The hold reason string (empty if not on hold or no reason specified).
   */
  public getHoldReason(): string {
    return this.holdReason;
  }

  /**
   * Gets the current state of the order (e.g., PROCESSING, SHIPPED).
   * @returns The OrderState enum value.
   */
  public getState(): OrderState {
    return this.state;
  }

  /**
   * Gets the current state of a specific line item within the order.
   * @param lineItemId - The ID of the line item whose state is requested.
   * @returns The OrderLineItemState enum value for the specified line item.
   * @throws {LineItemNotFoundError} If no line item with the given ID exists in the order's state map.
   */
  public getLineItemState(lineItemId: string): LineItemState {
    const lineItem = this.getLineItems().find(item => item.getId() === lineItemId);
    if (!lineItem){
      throw new LineItemNotFoundError(lineItemId)
    }
    return lineItem.getState();
  }

  /**
   * Gets a plain data object representing the order's current state.
   * Includes all cart details plus order-specific information.
   * @returns OrderData object suitable for serialization or API responses.
   */
  getDetails(): OrderData {
    return {
      ...super.getDetails(),
      orderNumber: this.getOrderNumber(),
      customerId: this.getCustomerId(),
      customerEmail: this.getCustomerEmail(),
      shippingAddress: this.getShippingAddress().getDetails(),
      billingAddress: this.getBillingAddress().getDetails(),
      cartId: this.getCartId(),
      paymentStatus: this.getPaymentStatus(),
      holdReason: this.getHoldReason(),
      state: this.getState()
    }
  }
}
