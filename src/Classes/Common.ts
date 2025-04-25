import { OperationalCountry, OperationalCountryCurrency, OperationalLocale } from "./Enum";
/**
 * Represents a ISO 3166-1 alpha-2 country code (e.g., 'US', 'IN').
 */
export type CountryCode = keyof typeof OperationalCountry;


/**
 * Represents a ISO 4217 currency code (e.g., 'INR', 'USD').
 */
export type CurrencyCode = keyof typeof  OperationalCountryCurrency;


/**
 * /**
 * Represents a string that can be localized into multiple languages.
 * The 'en' property is mandatory and serves as the default English translation.
 * Additional properties can be added for other locales using their respective locale codes.
 */
export type LocalizedString = {
  en: string;
} & {
  [locale in LocaleCode]?: string;
};


/**
 * Represents a BCP 47 language tag (e.g., 'en-US', 'fr-FR').
 * Used to identify languages and regional variations.
 */
export type LocaleCode = keyof typeof OperationalLocale;


/**
 * Represents a pricing tier based on a minimum purchase quantity.
 */
export type PriceTier = {
  /** The minimum quantity required to achieve this unit price. */
  minQuantity: number;
  /** The price per unit at this quantity tier. */
  unitPrice: number;
  currency: CurrencyCode;
  country: CountryCode;
};


/**
 * Represents the base price information for a single unit in a specific country.
 */
export type BasePrice = {
  /** Enforces that this price is for a single unit. */
  minQuantity: 1;
  /** The price per unit. */
  unitPrice: number;
  currency: CurrencyCode;
  country: CountryCode;
};


export type BasePriceList = BasePrice[];
export type PriceTierList = PriceTier[];


export type Color = {
  name: string;
  hex?: string;
}

/**
 * Represents a date and time string formatted according to the ISO 8601 standard.
 * Example: "2023-10-27T10:30:00Z"
 */
export type ISODateTime = string;

export type RegionalPrice = {
  country: CountryCode;
  currency: CurrencyCode;
  price: number;
};

export type RegionalPriceList = RegionalPrice[];

export interface ShippingDetails {
  shippingMethodId?: string;
  shippingMethodName?: string | LocalizedString;
  carrier?: string;
  estimatedCost?: number;
  estimatedDeliveryBy?: ISODateTime | null;
  deliveryInstructions?: string | null;
}