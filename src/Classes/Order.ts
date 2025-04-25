import AddressModel from "./Address";
import { PaymentStatus } from "./Payment";
import BaseShoppingContainerModel, { BaseShoppingContainerAttributes, BaseShoppingContainerData } from "./ShoppingContainer";

export enum OrderState {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  PARTIALLY_SHIPPED = "PARTIALLY_SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
  REFUNDED = "REFUNDED",
}

/**
 * Input attributes for creating an OrderModel.
 * Extends CartAttributes but requires/adds order-specific fields.
 */
export type OrderAttributes = Required<Omit<BaseShoppingContainerAttributes, 'anonymousId'>> & {
  anonymousId?: string;
  orderNumber: string;
  cartId: string;
  paymentStatus: PaymentStatus;
  holdReason?: string;
  state: OrderState;
};

/**
 * Output data structure for an OrderModel.
 */
export type OrderData = BaseShoppingContainerData & OrderAttributes;


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
   * Gets a plain data object representing the order's current state.
   * Includes all cart details plus order-specific information.
   * @returns OrderData object suitable for serialization or API responses.
   */
  getDetails(): OrderData {
    return {
      ...super.getDetails(),
      customerId: this.getCustomerId() as string,
      customerEmail: this.getCustomerEmail() as string,
      shippingAddress: (this.getShippingAddress() as AddressModel).getDetails(),
      billingAddress: (this.getBillingAddress() as AddressModel).getDetails(),
      orderNumber: this.getOrderNumber(),
      cartId: this.getCartId(),
      paymentStatus: this.getPaymentStatus(),
      holdReason: this.getHoldReason(),
      state: this.getState(),
    }
  }
}
