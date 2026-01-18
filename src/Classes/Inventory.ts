import Utils from "../Utils";
import BaseModel, { BaseAttributes, BaseData } from "./Base";
import { CountryCode } from "./Common";
import ProductModel, { SelectionAttributes } from "./Product";

export type StockData = {
  selectionAttributes: SelectionAttributes;
  size: string;
  available: number;
  country: CountryCode;
}

export type InventoryAttributes = BaseAttributes & {
  productKey: string;
  stocks: StockData[];
}
export type InventoryData = BaseData & InventoryAttributes;

export class InventoryModel extends BaseModel {
  protected productKey: string;
  protected stocks: StockData[];

  /**
   * Creates an instance of InventoryModel.
   * @param data - The initial inventory attributes.
   */
  constructor(data: InventoryAttributes, date: Date = new Date()) {
    super(data, date);
    this.productKey = data.productKey;
    this.stocks = data.stocks.map(item => ({
      selectionAttributes: Utils.deepClone(item.selectionAttributes),
      size: item.size,
      available: item.available,
      country: item.country
    }));
  }

  /**
   * Gets the product key associated with this inventory.
   * @returns The product key string.
   */
  getProductKey(): string {
    return this.productKey;
  }

  /**
   * Retrieves stock information for a specific size and country.
   * @param selectionAttributes - The selection attributes to filter by.
   * @param size - The size to filter by.
   * @param country - The country to filter by.
   * @returns An array of StockData objects matching the specified criteria.
   */
  getStockData(selectionAttributes?: SelectionAttributes, size?: string, country?: CountryCode): StockData[] {
    let selectionAttributeKey = selectionAttributes ? ProductModel.generateSelectionAttributesKey(selectionAttributes) : undefined;
    return this.stocks.filter(item => {
      if (selectionAttributeKey && ProductModel.generateSelectionAttributesKey(item.selectionAttributes) !== selectionAttributeKey) return false;
      if (size && item.size !== size) return false;
      if (country && item.country !== country) return false;
      return true;
    });
  }

  /**
   * Gets a plain data object representing the inventory's current state.
   * @returns InventoryData suitable for serialization.
   */
  getDetails(): InventoryData {
    return {
      ...super.getDetails(),
      productKey: this.getProductKey(),
      stocks: this.getStockData()
    };
  }
}