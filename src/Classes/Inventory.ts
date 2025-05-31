import BaseModel, { BaseAttributes, BaseData } from "./Base";
import { CountryCode } from "./Common";

export type StockData = {
  size: string;
  available: number;
  country: CountryCode;
}

export type InventoryAttributes = BaseAttributes & {
  productKey: string;
  variantId: string;
  stocks: StockData[];
}
export type InventoryData = BaseData & InventoryAttributes;

export class InventoryModel extends BaseModel {
  protected productKey: string;
  protected variantId: string;
  protected stocks: StockData[];

  constructor(data: InventoryAttributes) {
    super(data);
    this.productKey = data.productKey;
    this.variantId = data.variantId;
    this.stocks = data.stocks.map(item => ({
      size: item.size,
      available: item.available,
      country: item.country
    }));
  }

  getProductKey(): string {
    return this.productKey;
  }

  getVariantId(): string {
    return this.variantId;
  }

  getStockData(): StockData[] {
    return [...this.stocks];
  }

  getStockBySize(size: string, country: string): StockData | undefined {
    return this.stocks.find(item => item.size === size && item.country === country);
  }

  getDetails(): InventoryData {
    return {
      ...super.getDetails(),
      productKey: this.getProductKey(),
      variantId: this.getVariantId(),
      stocks: this.getStockData()
    };
  }
}