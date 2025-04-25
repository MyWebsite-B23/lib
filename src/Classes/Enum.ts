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
}