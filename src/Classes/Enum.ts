/**
 * Represents the countries where the application operates or products are available.
 */
export enum OperationalCountry {
  /** India */ IN = 'IN',
}
  
export enum OperationalCountryCurrency {
  /** India */ INR = 'INR',
}

export enum OperationalLocale {
  /** India */ 'en-IN' = 'en-IN',
  /** India ( Kannada) */ 'kn-IN' = 'kn-IN'
}

export enum OperationalLanguage {
  en = 'en',
  kn = 'kn'
}

export const LocaleLanguageMap: Record<OperationalLocale, OperationalLanguage> = {
  [OperationalLocale["en-IN"]]: OperationalLanguage.en,
  [OperationalLocale["kn-IN"]]: OperationalLanguage.kn,
}

export const LocaleCountryMap: Record<OperationalLocale, OperationalCountry> = {
   [OperationalLocale["en-IN"]]: OperationalCountry.IN,
  [OperationalLocale["kn-IN"]]: OperationalCountry.IN,
}

/**
 * Defines the supported ISO 4217 currency codes as an enumeration.
 */
export const CountryCurrencyMap = {
  /** India */ [OperationalCountry.IN]: OperationalCountryCurrency.INR,
};

export const CurrencySymbolMap = {
  [OperationalCountryCurrency.INR]: '₹',
}

export const CurrencyLocaleMap = {
  [OperationalCountryCurrency.INR]: OperationalLocale["en-IN"],
}

/**
 * Defines standard gender categories for product targeting.
 */
export enum GenderCategory {
  MALE = 'Male',
  FEMALE = 'Female',
  UNISEX = 'Unisex',
  KIDS = 'Kids',
  BOY = 'Boy',
  GIRL = 'Girl',
  GENERAL = 'General',
}

export enum ImageCategory {
  PRIMARY = 'PRIMARY',
  GALLERY = 'GALLERY'
}

export enum TaxCategory {
  APPAREL = 'apparel',
  EXEMPT = 'exempt'
}

export enum TaxSystem {
  GST = 'GST',
}

/**
 * LineItemState
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
export enum LineItemState {
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