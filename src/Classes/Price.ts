import { CountryCode, CurrencyCode, LocaleCode } from "./Common"; // Assuming these are in Common.ts
import { CountryCurrencyMap, CurrencySymbolMap } from "./Enum"; // Ensure these maps exist

export default class PriceModel {
  protected price: number;
  protected country: CountryCode;

  /**
   * Creates an instance of PriceModel, storing the currency-correct rounded price.
   * @param price - The initial price value.
   * @param country - The country code used for rounding and determining the currency symbol.
   * @throws {Error} If price is negative or country/currency mapping is missing.
   */
  constructor(price: number, country: CountryCode) {
    this.country = country;

    if(price < 0) {
      throw new Error("InvalidPrice: Price cannot be negative.");
    }

    this.price = price
  }

  /**
   * Gets the country code associated with this price instance.
   * The country code is used for determining currency and formatting rules.
   * @returns The CountryCode enum value.
   */
  public getCountry(): CountryCode {
    return this.country;
  }

  /**
   * Gets the rounded price value based on standard currency rules.
   * @returns The numeric price, rounded according to its currency's typical decimal places.
   */
  public getRoundedPrice(): number {
    return PriceModel.getRoundedPrice(this.price, this.country);
  }

  /**
   * Gets a locale-aware formatted display string for the price.
   * Uses Intl.NumberFormat for accurate formatting based on locale and currency.
   * @param locale - The locale code (e.g., 'en-US', 'de-DE', 'en-IN') to use for formatting rules.
   * @param options - Configuration options for formatting.
   * @param options.displayAsInteger - If true, the formatted string will show the price rounded to the nearest integer (no decimals). Defaults to false.
   * @returns The formatted price string according to locale rules.
   */
  public getFormattedString(locale: LocaleCode, options: { displayAsInteger?: boolean, currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name' } = {}): string {
    const displayAsInteger = options.displayAsInteger ?? false;
    const currency: CurrencyCode | undefined = CountryCurrencyMap[this.country];

    if (currency === undefined) {
      throw new Error('Currency mapping not found for CountryCode');
    }

    let valueToFormat = this.price;
    const fractionDigits = displayAsInteger ? 0 : PriceModel.getDecimalPlaces(currency);

    let formattingOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: currency,
        signDisplay: 'never',
        currencyDisplay: options.currencyDisplay,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    };

    if (displayAsInteger) {
        valueToFormat = Math.round(valueToFormat);
    }

    try {
        return new Intl.NumberFormat(locale, formattingOptions).format(valueToFormat);
    } catch (error) {
        console.error(`Error formatting price for locale "${locale}" and currency "${currency}":`, error);
        // Basic fallback without symbol if Intl fails completely
        return `${CurrencySymbolMap[currency] ?? currency} ${PriceModel.addThousandSeparators(valueToFormat.toFixed(fractionDigits))}`;
    }
  }

  /**
   * Helper method to determine standard decimal places for a currency.
   * @param currency - The currency code.
   * @returns The number of decimal places (0, 2, or 3 based on common rules).
   */
  private static getDecimalPlaces(currency: CurrencyCode): number {
    switch (currency) {
      case 'INR':
      default:
        return 2;
    }
  }

  /**
   * Adds basic thousand separators (commas) to a number string.
   * Does not handle different locale separators (e.g., periods, spaces).
   * @param numStr - The number string (potentially with decimals).
   * @returns The number string with commas added.
   */
  private static addThousandSeparators(numStr: string): string {
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInteger + decimalPart;
  }

  /**
   * Rounds a price value according to the standard decimal places
   * for the currency associated with the given country.
   *
   * @param price - The price value to round. Must be a non-negative number.
   * @param country - The country code to determine the currency and rounding rules.
   * @returns The rounded price as a number.
   * @throws {Error} If the country code is not found in the CountryCurrencyMap or price is negative.
   */
  static getRoundedPrice(price: number, country: CountryCode): number {
    if (price < 0) {
      throw new Error("Price cannot be negative for rounding.");
    }

    const currency: CurrencyCode | undefined = CountryCurrencyMap[country];
    if (currency === undefined) {
      throw new Error(`Currency mapping not found for CountryCode: ${country}`);
    }

    const decimalPlaces = PriceModel.getDecimalPlaces(currency);
    const multiplier = Math.pow(10, decimalPlaces);
    const roundedValue = Math.round(price * multiplier) / multiplier;

    return roundedValue;
  }

  /**
   * Static method to retrieve the currency code associated with a given country code.
   * Uses the `CountryCurrencyMap` to find the corresponding currency.
   *
   * @param country - The country code (e.g., 'IN') for which to find the currency.
   * @returns The currency code (e.g., 'INR') as a string, or undefined if the mapping doesn't exist.
   */
  static getCurrency(country: CountryCode): string {
    return CountryCurrencyMap[country];
  }

}

PriceModel.getRoundedPrice(-1, 'IN')