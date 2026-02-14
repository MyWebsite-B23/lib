import { TaxSystem } from "./Enum";
import PriceModel, { PriceData } from "./Price";
import { CountryCode, CurrencyCode, LocaleCode, Prettify } from "./Common";
import AddressModel, { AddressData } from "./Address";
import { ShoppingContainerTotal, ShoppingContainerTotalModel, TaxSystemBreakdown, TaxSystemBreakdownModel } from "./ShoppingContainer";
import BaseModel, { BaseAttributes, BaseData } from "./Base";

export type InvoiceTaxBreakdown = {
  rate: number;
  taxableAmount: PriceData;
  taxAmount: PriceData;
  system: TaxSystem;
  subSystem: string;
};

export type InvoiceTaxBreakdownModel = {
  rate: number;
  taxableAmount: PriceModel;
  taxAmount: PriceModel;
  system: TaxSystem;
  subSystem: string;
};

export type InvoiceLineItemData = {
  id: string;
  productKey: string;
  name: string;
  variantLabel: string;
  quantity: number;
  netUnitPrice: PriceModel;
  netSubtotal: PriceModel;
  taxTotal: PriceModel;
  grandTotal: PriceModel;
  taxBreakdown: Record<string, InvoiceTaxBreakdown>;
  taxCode: string;
  taxCodeType: string;
}

export type InvoiceChargeData = {
  id: string;
  name: string;
  taxableValue: PriceModel;
  taxTotal: PriceModel;
  grandTotal: PriceModel;
  taxBreakdown: Record<string, InvoiceTaxBreakdown>;
  taxCode: string;
  taxCodeType: string;
}


export type InvoiceTaxContextData = {
  recipientTaxIdentifier: string;
  recipientTaxIdentifierType: string;
  supplyRegion: string;
  supplyRegionCode: string;
}

export type InvoiceTotal = ShoppingContainerTotal;
export type InvoiceTotalModel = ShoppingContainerTotalModel;

export type InvoiceAttributes = Prettify<BaseAttributes & {
  invoiceNumber: string;
  orderNumber: string;
  issueDate: string;
  country: CountryCode;
  currency: CurrencyCode;
  locale: LocaleCode;
  customerId: string;
  customerEmail: string;
  billingAddress: AddressData;
  shippingAddress: AddressData;
  taxContext: InvoiceTaxContextData;
  lineItems: InvoiceLineItemData[];
  charges: InvoiceChargeData[];
  total: InvoiceTotal;
}>;

export type InvoiceData = Prettify<BaseData & InvoiceAttributes>;

export default class InvoiceModel extends BaseModel {
  protected invoiceNumber: string;
  protected orderNumber: string;
  protected issueDate: string;
  protected country: CountryCode;
  protected currency: CurrencyCode;
  protected locale: LocaleCode;
  protected customerId: string;
  protected customerEmail: string;
  protected billingAddress: AddressModel;
  protected shippingAddress: AddressModel;
  protected taxContext: InvoiceTaxContextData;
  protected lineItems: InvoiceLineItemData[];
  protected charges: InvoiceChargeData[];
  protected total: InvoiceTotalModel;

  constructor(data: InvoiceAttributes, date: Date = new Date()) {
    super(data, date);
    this.invoiceNumber = data.invoiceNumber;
    this.orderNumber = data.orderNumber;
    this.issueDate = data.issueDate;
    this.country = data.country;
    this.currency = data.currency;
    this.locale = data.locale;
    this.customerId = data.customerId;
    this.customerEmail = data.customerEmail;
    this.billingAddress = new AddressModel(data.billingAddress);
    this.shippingAddress = new AddressModel(data.shippingAddress);
    this.taxContext = data.taxContext;
    this.lineItems = data.lineItems;
    this.charges = data.charges;
    this.total = {
      lineItemSubtotal: new PriceModel(data.total.lineItemSubtotal),
      netLineItemSubtotal: new PriceModel(data.total.netLineItemSubtotal),
      lineItemTaxTotal: new PriceModel(data.total.lineItemTaxTotal),
      lineItemTaxBreakdown: this.mapTaxBreakdown(data.total.lineItemTaxBreakdown),

      additiveCharges: new PriceModel(data.total.additiveCharges),
      netAdditiveCharges: new PriceModel(data.total.netAdditiveCharges),
      additiveChargesTaxTotal: new PriceModel(data.total.additiveChargesTaxTotal),

      additiveChargesTaxBreakdown: this.mapTaxBreakdown(data.total.additiveChargesTaxBreakdown),
      adjustmentCharges: new PriceModel(data.total.adjustmentCharges),
      shippingCharges: new PriceModel(data.total.shippingCharges),
      netShippingCharges: new PriceModel(data.total.netShippingCharges),

      discountTotal: new PriceModel(data.total.discountTotal),
      discountBreakdown: Object.fromEntries(
        Object.entries(data.total.discountBreakdown).map(([key, value]) => [key, new PriceModel(value)])
      ),

      taxTotal: new PriceModel(data.total.taxTotal),
      taxBreakdown: this.mapTaxBreakdown(data.total.taxBreakdown),
      grandTotal: new PriceModel(data.total.grandTotal),
    };
  }

  private mapTaxBreakdown(breakdown: Record<string, TaxSystemBreakdown>): Record<string, TaxSystemBreakdownModel> {
    return Object.fromEntries(
      Object.entries(breakdown || {}).map(([systemKey, systemValue]) => [
        systemKey,
        {
          system: systemValue.system,
          totalAmount: new PriceModel(systemValue.totalAmount),
          subSystems: Object.fromEntries(
            Object.entries(systemValue.subSystems).map(([subKey, subValue]) => [
              subKey,
              new PriceModel(subValue)
            ])
          )
        }
      ])
    );
  }

  private serializeTaxBreakdown(breakdown: Record<string, TaxSystemBreakdownModel>): Record<string, TaxSystemBreakdown> {
    return Object.fromEntries(
      Object.entries(breakdown || {}).map(([systemKey, systemValue]) => [
        systemKey,
        {
          system: systemValue.system,
          totalAmount: systemValue.totalAmount.getDetails(),
          subSystems: Object.fromEntries(
            Object.entries(systemValue.subSystems).map(([subKey, subValue]) => [
              subKey,
              subValue.getDetails()
            ])
          )
        }
      ])
    );
  }

  getInvoiceNumber(): string {
    return this.invoiceNumber;
  }

  getOrderNumber(): string {
    return this.orderNumber;
  }

  getIssueDate(): string {
    return this.issueDate;
  }

  getCountry(): CountryCode {
    return this.country;
  }

  getCurrency(): CurrencyCode {
    return this.currency;
  }

  getLocale(): LocaleCode {
    return this.locale;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getCustomerEmail(): string {
    return this.customerEmail;
  }

  getTaxContext(): InvoiceTaxContextData {
    return { ...this.taxContext };
  }

  getTaxRegistrationNumber(): string {
    return this.taxContext.recipientTaxIdentifier;
  }

  getRecipientTaxIdentifier(): string {
    return this.taxContext.recipientTaxIdentifier;
  }

  getRecipientTaxIdentifierType(): string {
    return this.taxContext.recipientTaxIdentifierType;
  }

  getBillingAddress(): AddressModel {
    return this.billingAddress;
  }

  getShippingAddress(): AddressModel {
    return this.shippingAddress;
  }

  getPlaceOfSupplyState(): string {
    return this.taxContext.supplyRegion;
  }

  getPlaceOfSupplyCode(): string {
    return this.taxContext.supplyRegionCode;
  }

  getSupplyRegion(): string {
    return this.taxContext.supplyRegion;
  }

  getSupplyRegionCode(): string {
    return this.taxContext.supplyRegionCode;
  }

  getLineItems(): InvoiceLineItemData[] {
    return this.lineItems;
  }

  getCharges(): InvoiceChargeData[] {
    return this.charges;
  }

  getTotal(): InvoiceTotalModel {
    return this.total;
  }

  getDetails(): InvoiceData {
    const totals = this.getTotal();
    return {
      ...super.getDetails(),
      invoiceNumber: this.invoiceNumber,
      orderNumber: this.orderNumber,
      issueDate: this.issueDate,
      country: this.country,
      currency: this.currency,
      locale: this.locale,
      customerId: this.customerId,
      customerEmail: this.customerEmail,
      billingAddress: this.billingAddress.getDetails(),
      shippingAddress: this.shippingAddress.getDetails(),
      taxContext: this.taxContext,
      lineItems: this.lineItems,
      charges: this.charges,
      total: {
        // Item Totals
        lineItemSubtotal: totals.lineItemSubtotal.getDetails(),
        netLineItemSubtotal: totals.netLineItemSubtotal.getDetails(),
        lineItemTaxTotal: totals.lineItemTaxTotal.getDetails(),
        lineItemTaxBreakdown: this.serializeTaxBreakdown(totals.lineItemTaxBreakdown),

        // Charge Totals
        additiveCharges: totals.additiveCharges.getDetails(),
        netAdditiveCharges: totals.netAdditiveCharges.getDetails(),
        additiveChargesTaxTotal: totals.additiveChargesTaxTotal.getDetails(),
        additiveChargesTaxBreakdown: this.serializeTaxBreakdown(totals.additiveChargesTaxBreakdown),

        adjustmentCharges: totals.adjustmentCharges.getDetails(),

        shippingCharges: totals.shippingCharges.getDetails(),
        netShippingCharges: totals.netShippingCharges.getDetails(),

        // Aggregate Totals
        discountTotal: totals.discountTotal.getDetails(),
        discountBreakdown: Object.fromEntries(
          Object.entries(totals.discountBreakdown).map(([key, value]) => [key, value.getDetails()])
        ),
        taxTotal: totals.taxTotal.getDetails(),
        taxBreakdown: this.serializeTaxBreakdown(totals.taxBreakdown),
        grandTotal: totals.grandTotal.getDetails(),
      },
    };
  }
}
