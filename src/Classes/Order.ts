import AddressModel, { AddressData } from "./Address";
import { LineItemNotFoundError } from "./Cart";
import { ISODateTime } from "./Common";
import { CouponCategory } from "./Coupon";
import { PaymentStatus } from "./Payment";
import PriceModel from "./Price";
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
 * OrderLineItemState
 * 
 * INITIAL: Item added to order, not yet processed.
 * PROCESSING: Item is being prepared for shipment.
 * SHIPPED: Item dispatched to customer.
 * DELIVERED: Item delivered to customer.
 * CANCELLED: Item cancelled before shipment or delivery.
 * RETURN_REQUESTED: Customer requests to return item.
 * RETURNED: Item received back from customer.
 * REFUND_INITIATED: Refund initiated for item.
 * REFUNDED: Refund processed for item.
 * ON_HOLD: Item is paused due to payment, inventory, or other issues.
 */
export enum OrderLineItemState {
  INITIAL = "INITIAL",
  PROCESSING = "PROCESSING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURN_REQUESTED = "RETURN_REQUESTED",
  RETURNED = "RETURNED",
  REFUND_INITIATED = "REFUND_INITIATED",
  REFUNDED = "REFUNDED",
  ON_HOLD = "ON_HOLD",
}


export type OrderLineItemStateMap = Record<string, {
  state:OrderLineItemState;
  reason?: string;
  transitionAt: ISODateTime;
}>;

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
  lineItemStateMap?: OrderLineItemStateMap;
};

/**
 * Output data structure for an OrderModel.
 */
export type OrderData = BaseShoppingContainerData & OrderAttributes & {
  holdReason: string;
  lineItemStateMap: OrderLineItemStateMap;
};


export default class OrderModel extends BaseShoppingContainerModel {
  protected orderNumber: string;
  protected cartId: string;
  protected paymentStatus: PaymentStatus;
  protected holdReason: string;
  protected state: OrderState;
  protected lineItemStateMap: OrderLineItemStateMap;

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
    
    const newLineItemStateMap: OrderLineItemStateMap = {};
    data.lineItems.forEach(item => {
      const currentStateMap = data.lineItemStateMap?.[item.id];;
      
      newLineItemStateMap[item.id] = {
        state: currentStateMap?.state || OrderLineItemState.INITIAL,
        reason: currentStateMap?.reason || '',
        transitionAt: currentStateMap?.transitionAt || this.createdAt,
      };
    });
    this.lineItemStateMap = newLineItemStateMap;

    this.recalculateOrderBaseTotals();
  }

  /**
     * Recalculates the subtotal and mrpTotal based on the current line items.
     * Uses PriceModel for rounding based on the country.
     */
  protected recalculateOrderBaseTotals(): void {
    this.total.subtotal = PriceModel.getRoundedPrice(this.lineItems
      .filter((item) => 
        ![OrderLineItemState.CANCELLED, OrderLineItemState.REFUND_INITIATED, OrderLineItemState.REFUNDED].includes(this.lineItemStateMap[item.getId()]?.state)
      )
      .reduce((sum, item) => sum + item.getPriceTotals().subtotal, 0), this.country);

    this.total.mrpTotal = PriceModel.getRoundedPrice(this.lineItems
      .filter((item) => 
        ![OrderLineItemState.CANCELLED, OrderLineItemState.REFUND_INITIATED, OrderLineItemState.REFUNDED].includes(this.lineItemStateMap[item.getId()]?.state)
      )
      .reduce((sum, item) => sum + item.getPriceTotals().mrpTotal, 0), this.country);
  }

  public updateOrderTotals(): void {
    // 1. Calculate line item totals (subtotal, mrpTotal)
    this.recalculateOrderBaseTotals();

    // 2. Calculate total coupon discount and update the per-coupon discount map
    this.recalculateCouponTotals(false);

    // 3. Calculate effective shipping cost after applying shipping-specific coupons
    const shippingCouponDiscount = this.coupons
      .filter(c => c.getCategory() === CouponCategory.SHIPPING)
      .reduce((sum, c) => sum + (this.total.couponTotal[c.getCode()] ?? 0), 0);
    this.total.effectiveShipping = PriceModel.getRoundedPrice(Math.max(0, this.total.shipping - shippingCouponDiscount), this.country);

    // 4. Calculate total discount from non-shipping coupons
    const nonShippingCouponDiscount = this.coupons
      .filter(c => c.getCategory() !== CouponCategory.SHIPPING)
      .reduce((sum, c) => sum + (this.total.couponTotal[c.getCode()] ?? 0), 0);

    // 5. Calculate final grand total: (subtotal + effective shipping) - non-shipping discounts
    const grossTotal = this.total.subtotal + this.total.effectiveShipping;
    this.total.grandTotal = PriceModel.getRoundedPrice(Math.max(0, grossTotal - nonShippingCouponDiscount), this.country);
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
   * Gets the map tracking the state of each line item in the order.
   * The keys are line item IDs, and the values contain the state, reason, and transition timestamp.
   * @returns The OrderLineItemStateMap.
   */
  public getLineItemsStateMap(): OrderLineItemStateMap {
    return { ...this.lineItemStateMap };
  }

  /**
   * Gets the current state of a specific line item within the order.
   * @param lineItemId - The ID of the line item whose state is requested.
   * @returns The OrderLineItemState enum value for the specified line item.
   * @throws {LineItemNotFoundError} If no line item with the given ID exists in the order's state map.
   */
  public getLineItemState(lineItemId: string): OrderLineItemState {
    if (!this.lineItemStateMap[lineItemId]){
      throw new LineItemNotFoundError(lineItemId)
    }
    return this.lineItemStateMap[lineItemId].state;
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
      state: this.getState(),
      lineItemStateMap: this.getLineItemsStateMap()
    }
  }
}
