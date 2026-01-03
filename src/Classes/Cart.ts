import { LineItemNotFoundError } from "./Error";
import LineItemModel from "./LineItem";
import ProductModel from "./Product";
import BaseShoppingContainerModel, { BaseShoppingContainerAttributes, BaseShoppingContainerData } from "./ShoppingContainer";

export enum CartState {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  MERGED = "MERGED",
  ORDERED = "ORDERED"
}

/**
 * Input attributes for creating or updating a CartModel.
 */
export type CartAttributes = BaseShoppingContainerAttributes & {
  state: CartState;
  expireAt: number;
};

export type CartData = BaseShoppingContainerData & {
  state: CartState;
  expireAt: number;
};

export type CartConfig = {
  expiresAtInSeconds: number;
}

export const DEFAULT_CART_CONFIG: CartConfig = {
  expiresAtInSeconds: 120 * 24 * 60 * 60
}

export default class CartModel extends BaseShoppingContainerModel {
  protected state: CartState;
  protected expireAt: number;
  protected config: CartConfig;

  constructor(data: CartAttributes, date: Date = new Date(), config: CartConfig = DEFAULT_CART_CONFIG) {
    super(data, date);
    this.state = data.state;
    this.expireAt = data.expireAt && typeof data.expireAt === 'number' ? data.expireAt : Math.floor(date.getTime() / 1000) + config.expiresAtInSeconds;
    this.config = config;
  }

  /**
   * Gets the current state of the cart (e.g., ACTIVE, ORDERED).
   * @returns The CartState enum value.
   */
  public getState(): CartState {
    return this.state;
  }

  /**
   * Gets the timestamp when the cart expires.
   * @returns The expiration timestamp in seconds (Unix epoch).
   */
  public getExpireAt(): number {
    return this.expireAt;
  }

  /**
   * Checks if the cart is currently active and not expired.
   * @returns True if active and not expired, false otherwise.
   */
  public isActive(): boolean {
    const nowSeconds = Math.ceil(Date.now() / 1000);
    return this.state === CartState.ACTIVE && (this.expireAt > nowSeconds);
  }

  /**
   * Clears all line items, coupons, and shipping details from the cart and resets totals.
   */
  public clearCartItems() {
    this.lineItems = [];
    this.coupons = [];
    this.shippingDetails = null;
    this.total.couponTotal = {};
    this.calculateTotals();
  }

  /**
   * Validates line items against the current product catalog.
   * Updates product data for each item and removes invalid items.
   * @param products - A record map of ProductModels keyed by product ID/key.
   */
  public validateLineItems(products: Record<string, ProductModel>): void {
    this.lineItems = this.lineItems.map(lineItem => {
      try {
        lineItem.updateProductData(products[lineItem.getProductKey()], this.country, this.currency);
      } catch (error) {
        console.error(`Error recalculating line item ${lineItem.getId()}:`, error);
        lineItem.clearLineItem();
      }
      return lineItem;
    }).filter(lineItem => lineItem.getId());

    this.calculateTotals();
  }

  /**
   * Adds a new line item or updates the quantity of an existing one.
   * @param newLineItem The LineItemModel to add.
   * @returns The index of the added/updated line item in the internal array.
   */
  public addLineItem(newLineItem: LineItemModel) {
    const productKey = newLineItem.getProductKey();
    const selectionAttribute = newLineItem.getSelectionAttribute();
    const selectionAttributeKey = ProductModel.generateSelectionAttributesKey(selectionAttribute);
    let index = this.lineItems.findIndex(
      (item) => item.getProductKey() === productKey && ProductModel.generateSelectionAttributesKey(item.getSelectionAttribute()) === selectionAttributeKey
    );

    if (index >= 0) {
      this.lineItems[index].addSubItems(newLineItem.getSubItems(), true);
    } else {
      this.lineItems.push(newLineItem);
    }

    this.calculateTotals();
    return index >= 0 ? index : this.lineItems.length - 1;
  }

  /**
   * Updates the quantity for a specific size within a line item.
   * @param lineItemId The ID of the LineItemModel to update.
   * @param size The size identifier within the line item.
   * @param quantity The new quantity for the size (0 to remove).
   * @returns The index of the updated line item.
   * @throws {Error} If the line item is not found.
   */
  public updateLineItem(lineItemId: string, size: string, quantity: number) {
    const lineItems = this.lineItems;
    let index = lineItems.findIndex((item) => item.getId() === lineItemId);

    if (index < 0) {
      throw new LineItemNotFoundError(lineItemId);
    }

    lineItems[index].addSubItems([{ size, quantity }], false);
    this.calculateTotals();

    return index;
  }

  /**
   * Removes a line item completely from the cart.
   * @param lineItemId The ID of the LineItemModel to remove.
   * @returns The index the item previously occupied.
   * @throws {Error} If the line item is not found.
   */
  public removeLineItem(lineItemId: string) {
    const lineItems = this.lineItems;
    const index = lineItems.findIndex((item) => item.getId() === lineItemId);

    if (index < 0) {
      throw new LineItemNotFoundError(lineItemId);
    }

    this.lineItems.splice(index, 1);
    this.calculateTotals();

    return index;
  }

  getDetails(): CartData {
    return {
      ...super.getDetails(),
      state: this.getState(),
      expireAt: this.getExpireAt(),
    }
  }
}
