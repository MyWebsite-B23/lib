import { OperationalCountry, OperationalCountryCurrency, OperationalLanguage, OperationalLocale } from "./Enum";

type Prettify<T> = { [K in keyof T]: T[K] } & {};

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
 * Represents a value that can be localized into multiple languages.
 * The 'en' property is mandatory and serves as the default English translation.
 * Additional properties can be added for other locales using their respective locale codes.
 */
export type LocalizedValue<T> = Prettify<{
  en: T;
} & {
  [locale in Exclude<LocaleCode | LanguageCode, 'en'>]?: T;
}>;


/**
 * /**
 * Represents a string that can be localized into multiple languages.
 * The 'en' property is mandatory and serves as the default English translation.
 * Additional properties can be added for other locales using their respective locale codes.
 */
export type LocalizedString = LocalizedValue<string>;

/**
 * Represents a BCP 47 language tag (e.g., 'en-US', 'fr-FR').
 * Used to identify languages and regional variations.
 */
export type LocaleCode = keyof typeof OperationalLocale;

export type LanguageCode = keyof typeof OperationalLanguage;


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
 * Example: "2023-10-27T10:30:00.000Z"
 */
export type ISODateTimeUTC = string;

export type RegionalPrice = {
  country: CountryCode;
  currency: CurrencyCode;
  price: number;
};

export type RegionalPriceList = RegionalPrice[];

export interface ShippingDetails {
  courierName: string;
  courierId?: string;
  serviceType?: string;
  rating?: number;
  estimatedDeliveryDays?: number;
  cost: number;
  currency?: string;
  isFallback: boolean;
  trackingUrl?: string;
  deliveryType?: string;
  insuranceAmount?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: string;
  };
  pickupDate?: string;
  deliveryDate?: string;
  status?: string;
  rawApiData?: any;
  [key: string]: any;
}
