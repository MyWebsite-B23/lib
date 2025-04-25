import LineItemModel from "./LineItem";
import BaseShoppingContainerModel, { BaseShoppingContainerAttributes, BaseShoppingContainerData } from "./ShoppingContainer";

export enum CartState {
  ACTIVE = "ACTIVE",
  FROZEN = "FROZEN",
  MERGED = "MERGED",
  ORDERED = "ORDERED"
}

export class LineItemNotFoundError extends Error {
  constructor(lineItemId: string) {
    super(`Line item with ID '${lineItemId}' not found in the cart.`);
    this.name = 'LineItemNotFoundError';
  }
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
    this.expireAt = data.expireAt && typeof data.expireAt === 'number' ? data.expireAt : Math.floor(date.getTime()/1000) + config.expiresAtInSeconds;
    this.config = config;
    
    this.updateCartTotals();
  }

  public getState(): CartState {
    return this.state;
  }

  public getExpireAt(): number {
    return this.expireAt;
  }

  public isActive(): boolean {
    const nowSeconds = Math.ceil(Date.now() / 1000);
    return this.state === CartState.ACTIVE && (this.expireAt > nowSeconds);
  }
  
  public clearCartItems() {
    this.lineItems = [];
    this.coupons = [];
    this.updateCartTotals();
  }

  /**
   * Adds a new line item or updates the quantity of an existing one.
   * @param newLineItem The LineItemModel to add.
   * @returns The index of the added/updated line item in the internal array.
   */
  public addLineItem (newLineItem: LineItemModel) {
    const productKey = newLineItem.getProductKey();
    const variantId = newLineItem.getVariantId();
    let index = this.lineItems.findIndex(
      (item) => item.getProductKey() === productKey && item.getVariantId() === variantId
    );

    if(index >= 0){
      this.lineItems[index].addSubItems(newLineItem.getSubItems(), true);
    } else {
      this.lineItems.push(newLineItem);
    }

    this.updateCartTotals();
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
  public updateLineItem (lineItemId: string, size: string, quantity: number) {
    const lineItems = this.lineItems;
    let index = lineItems.findIndex((item) => item.getId() === lineItemId);
    
    if(index < 0){
      throw new LineItemNotFoundError(lineItemId);
    }

    lineItems[index].addSubItems([{ size, quantity }], false);
    this.updateCartTotals();

    return index;
  }

  /**
   * Removes a line item completely from the cart.
   * @param lineItemId The ID of the LineItemModel to remove.
   * @returns The index the item previously occupied.
   * @throws {Error} If the line item is not found.
   */
  public removeLineItem (lineItemId: string) {
    const lineItems = this.lineItems;
    const index = lineItems.findIndex((item) => item.getId() === lineItemId);

    if(index < 0){
      throw new LineItemNotFoundError(lineItemId);
    }

    this.lineItems.splice(index, 1);
    this.updateCartTotals();

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
