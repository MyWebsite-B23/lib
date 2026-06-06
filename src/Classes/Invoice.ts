import { ChargeImpact, ChargeType, InvoiceState, TaxSystem } from "./Enum";
import PriceModel, { PriceData } from "./Price";
import { CountryCode, CurrencyCode, LocaleCode, Prettify } from "./Common";
import AddressModel, { AddressData } from "./Address";
import { ShoppingContainerTotal, ShoppingContainerTotalModel, TaxSystemBreakdown, TaxSystemBreakdownModel } from "./ShoppingContainer";
import BaseModel, { BaseAttributes, BaseData } from "./Base";
import Utils from "../Utils";

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
  sku: string;
  name: string;
  variantLabel: string;
  quantity: number;
  netUnitPrice: PriceData;
  netSubtotal: PriceData;
  taxTotal: PriceData;
  grandTotal: PriceData;
  taxBreakdown: Record<string, InvoiceTaxBreakdown>;
  taxCode: string;
  taxCodeType: string;
}

export type InvoiceLineItemModel = {
  id: string;
  productKey: string;
  sku: string;
  name: string;
  variantLabel: string;
  quantity: number;
  netUnitPrice: PriceModel;
  netSubtotal: PriceModel;
  taxTotal: PriceModel;
  grandTotal: PriceModel;
  taxBreakdown: Record<string, InvoiceTaxBreakdownModel>;
  taxCode: string;
  taxCodeType: string;
}

export type InvoiceChargeData = {
  id: string;
  type: ChargeType;
  category: string;
  impact: ChargeImpact;
  name: string;
  taxableValue: PriceData;
  taxTotal: PriceData;
  grandTotal: PriceData;
  taxBreakdown: Record<string, InvoiceTaxBreakdown>;
  taxCode: string;
  taxCodeType: string;
}

export type InvoiceChargeModel = {
  id: string;
  type: ChargeType;
  category: string;
  impact: ChargeImpact;
  name: string;
  taxableValue: PriceModel;
  taxTotal: PriceModel;
  grandTotal: PriceModel;
  taxBreakdown: Record<string, InvoiceTaxBreakdownModel>;
  taxCode: string;
  taxCodeType: string;
}

export type InvoiceTaxContextData = {
  recipientTaxIdentifier: string;
  recipientTaxIdentifierType: string;
  supplyRegion: string;
  supplyRegionCode: string;
}

export type MerchantData = {
  merchantName: string;
  taxIdentifier: string;
  email: string;
  phone: string;
  address: AddressData;
};

export type MerchantModel = {
  merchantName: string;
  taxIdentifier: string;
  email: string;
  phone: string;
  address: AddressModel;
};

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
  merchant: MerchantData;
  lineItems: InvoiceLineItemData[];
  charges: InvoiceChargeData[];
  total: InvoiceTotal;
  state: InvoiceState;
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
  protected merchant: MerchantModel;
  protected lineItems: InvoiceLineItemModel[];
  protected charges: InvoiceChargeModel[];
  protected total: InvoiceTotalModel;
  protected state: InvoiceState;

  constructor(data: InvoiceAttributes, date: Date = new Date()) {
    super(data, date);
    this.invoiceNumber = data.invoiceNumber;
    this.state = data.state;
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
    this.merchant = {
      merchantName: data.merchant.merchantName,
      taxIdentifier: data.merchant.taxIdentifier,
      email: data.merchant.email,
      phone: data.merchant.phone,
      address: new AddressModel(data.merchant.address)
    };
    this.lineItems = data.lineItems.map((item) => {
      return {
        ...item,
        netUnitPrice: new PriceModel(item.netUnitPrice),
        netSubtotal: new PriceModel(item.netSubtotal),
        taxTotal: new PriceModel(item.taxTotal),
        grandTotal: new PriceModel(item.grandTotal),
        taxBreakdown: Object.fromEntries(
          Object.entries(item.taxBreakdown || {}).map(([systemKey, systemValue]) => [
            systemKey,
            {
              ...systemValue,
              taxableAmount: new PriceModel(systemValue.taxableAmount),
              taxAmount: new PriceModel(systemValue.taxAmount),
            },
          ])
        )
      };
    });
    this.charges = data.charges.map((charge) => {
      return {
        ...charge,
        taxableValue: new PriceModel(charge.taxableValue),
        taxTotal: new PriceModel(charge.taxTotal),
        grandTotal: new PriceModel(charge.grandTotal),
        taxBreakdown: Object.fromEntries(
          Object.entries(charge.taxBreakdown || {}).map(([systemKey, systemValue]) => [
            systemKey,
            {
              ...systemValue,
              taxableAmount: new PriceModel(systemValue.taxableAmount),
              taxAmount: new PriceModel(systemValue.taxAmount),
            },
          ])
        )
      };
    });

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
      Object.entries(breakdown).map(([systemKey, systemValue]) => [
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

  /**
   * Gets the invoice number.
   * @returns The invoice number string.
   */
  getInvoiceNumber(): string {
    return this.invoiceNumber;
  }

  /**
   * Gets the order number associated with this invoice.
   * @returns The order number string.
   */
  getOrderNumber(): string {
    return this.orderNumber;
  }

  /**
   * Gets the issue date of this invoice.
   * @returns The issue date string in ISO format.
   */
  getIssueDate(): string {
    return this.issueDate;
  }

  /**
   * Gets the country code where the invoice is issued.
   * @returns The CountryCode enum value.
   */
  getCountry(): CountryCode {
    return this.country;
  }

  /**
   * Gets the currency code used in this invoice.
   * @returns The CurrencyCode enum value.
   */
  getCurrency(): CurrencyCode {
    return this.currency;
  }

  /**
   * Gets the locale code for the invoice display language/formatting.
   * @returns The LocaleCode enum value.
   */
  getLocale(): LocaleCode {
    return this.locale;
  }

  /**
   * Gets the ID of the customer associated with the invoice.
   * @returns The customer ID string.
   */
  getCustomerId(): string {
    return this.customerId;
  }

  /**
   * Gets the email address of the customer.
   * @returns The customer email string.
   */
  getCustomerEmail(): string {
    return this.customerEmail;
  }

  /**
   * Gets the tax context details for recipient and region.
   * @returns A copy of the InvoiceTaxContextData object.
   */
  getTaxContext(): InvoiceTaxContextData {
    return { ...this.taxContext };
  }

  /**
   * Gets the tax identifier of the recipient.
   * @returns The recipient tax identifier string.
   */
  getRecipientTaxIdentifier(): string {
    return this.taxContext.recipientTaxIdentifier;
  }

  /**
   * Gets the type of tax identifier used by the recipient.
   * @returns The recipient tax identifier type string.
   */
  getRecipientTaxIdentifierType(): string {
    return this.taxContext.recipientTaxIdentifierType;
  }

  /**
   * Gets the billing address model for this invoice.
   * @returns The AddressModel instance for billing.
   */
  getBillingAddress(): AddressModel {
    return this.billingAddress;
  }

  /**
   * Gets the shipping address model for this invoice.
   * @returns The AddressModel instance for shipping.
   */
  getShippingAddress(): AddressModel {
    return this.shippingAddress;
  }

  /**
   * Gets the supply region name.
   * @returns The supply region string.
   */
  getSupplyRegion(): string {
    return this.taxContext.supplyRegion;
  }

  /**
   * Gets the supply region code.
   * @returns The supply region code string.
   */
  getSupplyRegionCode(): string {
    return this.taxContext.supplyRegionCode;
  }

  /**
   * Gets the merchant details for this invoice.
   * @returns The MerchantModel details.
   */
  getMerchant(): MerchantModel {
    return {
      merchantName: this.merchant.merchantName,
      taxIdentifier: this.merchant.taxIdentifier,
      email: this.merchant.email,
      phone: this.merchant.phone,
      address: this.merchant.address
    };
  }

  /**
   * Gets the line items of the invoice.
   * @returns An array of InvoiceLineItemModel objects.
   */
  getLineItems(): InvoiceLineItemModel[] {
    return [...this.lineItems];
  }

  /**
   * Gets the additional charges applied to the invoice.
   * @returns An array of InvoiceChargeModel objects.
   */
  getCharges(): InvoiceChargeModel[] {
    return [...this.charges];
  }

  /**
   * Gets the calculated totals of the invoice.
   * @returns The InvoiceTotalModel object.
   */
  getTotal(): InvoiceTotalModel {
    return this.total;
  }

  /**
   * Gets the current state of the invoice.
   * @returns The InvoiceState enum value.
   */
  getState(): InvoiceState {
    return this.state;
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
      state: this.state,
      merchant: {
        merchantName: this.merchant.merchantName,
        taxIdentifier: this.merchant.taxIdentifier,
        email: this.merchant.email,
        phone: this.merchant.phone,
        address: this.merchant.address.getDetails()
      },
      lineItems: this.lineItems.map((item) => {
        return {
          ...item,
          netUnitPrice: item.netUnitPrice.getDetails(),
          netSubtotal: item.netSubtotal.getDetails(),
          taxTotal: item.taxTotal.getDetails(),
          grandTotal: item.grandTotal.getDetails(),
          taxBreakdown: Object.fromEntries(
            Object.entries(item.taxBreakdown).map(([systemKey, systemValue]) => [
              systemKey,
              {
                ...systemValue,
                taxableAmount: systemValue.taxableAmount.getDetails(),
                taxAmount: systemValue.taxAmount.getDetails(),
              },
            ])
          )
        };
      }),
      charges: this.charges.map((charge) => {
        return {
          ...charge,
          taxableValue: charge.taxableValue.getDetails(),
          taxTotal: charge.taxTotal.getDetails(),
          grandTotal: charge.grandTotal.getDetails(),
          taxBreakdown: Object.fromEntries(
            Object.entries(charge.taxBreakdown).map(([systemKey, systemValue]) => [
              systemKey,
              {
                ...systemValue,
                taxableAmount: systemValue.taxableAmount.getDetails(),
                taxAmount: systemValue.taxAmount.getDetails(),
              },
            ])
          )
        };
      }),
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
