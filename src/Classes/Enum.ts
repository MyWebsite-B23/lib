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
  /** India ( Kannada) */ 'ka-IN' = 'ka-IN'
}

export enum OperationalLanguage {
  en = 'en',
  ka = 'ka'
}

export const LocaleLanguageMap: Record<OperationalLocale, OperationalLanguage> = {
  [OperationalLocale["en-IN"]]: OperationalLanguage.en,
  [OperationalLocale["ka-IN"]]: OperationalLanguage.ka,
}

export const LocaleCountryMap: Record<OperationalLocale, OperationalCountry> = {
   [OperationalLocale["en-IN"]]: OperationalCountry.IN,
  [OperationalLocale["ka-IN"]]: OperationalCountry.IN,
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