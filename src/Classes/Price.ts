import { CurrencyCode } from "./Common";
import { CurrencyLocaleMap, CurrencySymbolMap, OperationalCountryCurrency } from "./Enum";
import {
  InvalidPriceAmountError,
  InvalidCurrencyCodeError,
  CurrencyMismatchError,
  InvalidArgumentError
} from "./Error";

export type PriceAttributes = {
  amount: number;
  currency: CurrencyCode;
}

export type PriceData = PriceAttributes;

export default class PriceModel {
  #kind: string;
  protected amount: number;
  protected currency: CurrencyCode;

  /**
   * Creates an instance of PriceModel, storing the currency-correct rounded price.
   * @param amount - The initial price value.
   * @param currency - The currency code used for rounding and determining the currency symbol.
   * @throws {Error} If price is negative or country/currency mapping is missing.
   */
  constructor(data: PriceAttributes) {
    this.#kind = "PriceModel";
    if (data.amount < 0) {
      throw new InvalidPriceAmountError("Amount cannot be negative.");
    }

    if (!data.currency) {
      throw new InvalidCurrencyCodeError("Currency code is required.");
    }

    this.amount = data.amount;
    this.currency = data.currency;
  }

  get kind() {
    return this.#kind;
  }

  static isPriceModel(obj: unknown): obj is PriceModel {
    return typeof obj === "object" &&
    obj !== null &&
    (obj as any).kind === "PriceModel";
  }

  /**
   * Gets the currency associated with this price instance.
   * @returns The CurrencyCode enum value.
   */
  public getCurrency(): CurrencyCode {
    return this.currency;
  }

  /**
  * Returns the raw numeric price value.
  */
  public getAmount(): number {
    return this.amount;
  }

  /**
   *
   * @returns PriceData
   */
  public getDetails(): PriceData {
    return {
      amount: this.amount,
      currency: this.currency
    }
  }

  /**
   * Compares this price with another {@link PriceModel} instance.
   *
   * The comparison is performed using the numeric price value and is only valid
   * when both prices are expressed in the same currency.
   *
   * ### Comparison result:
   * - Returns a **negative number** if this price is **less than** `priceModel`
   * - Returns **zero** if both prices are **equal**
   * - Returns a **positive number** if this price is **greater than** `priceModel`
   *
   * @param priceModel - The {@link PriceModel} instance to compare against.
   *
   * @returns
   * A signed number representing the comparison result:
   * - `< 0` → this price is lower
   * - `0`   → prices are equal
   * - `> 0` → this price is higher
   *
   * @throws {Error}
   * Throws an error if:
   * - `priceModel` is not an instance of {@link PriceModel}
   * - The currencies of the two prices do not match
   *
   * @example
   * ```ts
   * const a = new PriceModel("USD", 100);
   * const b = new PriceModel("USD", 150);
   *
   * a.compareTo(b); // -50
   * b.compareTo(a); // 50
   * a.compareTo(a); // 0
   * ```
   */
  public compareTo(priceModel: PriceModel): number {
    if (!PriceModel.isPriceModel(priceModel)) {
      throw new InvalidArgumentError("Must be a PriceModel instance.");
    } else if (this.currency !== priceModel.getCurrency()) {
      throw new CurrencyMismatchError("Cannot compare prices in different currencies.");
    }

    return this.amount - priceModel.getAmount();
  }

  public add(priceModel: PriceModel): PriceModel {
    if (!PriceModel.isPriceModel(priceModel)) {
      throw new InvalidArgumentError("Must be a PriceModel instance.");
    } else if (this.currency !== priceModel.getCurrency()) {
      throw new CurrencyMismatchError("Cannot add prices in different currencies.");
    }

    return new PriceModel({
      amount: this.amount + priceModel.getAmount(),
      currency: this.currency
    });
  }

  public subtract(priceModel: PriceModel): PriceModel {
    if (!PriceModel.isPriceModel(priceModel)) {
      throw new InvalidArgumentError("Must be a PriceModel instance.");
    } else if (this.currency !== priceModel.getCurrency()) {
      throw new CurrencyMismatchError("Cannot subtract prices in different currencies.");
    }

    return new PriceModel({
      amount: this.amount - priceModel.getAmount(),
      currency: this.currency
    });
  }

  public multiply(factor: number | PriceModel): PriceModel {
    if (PriceModel.isPriceModel(factor)) {
      if (this.currency !== factor.getCurrency()) {
        throw new CurrencyMismatchError("Cannot multiply prices in different currencies.");
      }
      return new PriceModel({
        amount: this.amount * factor.getAmount(),
        currency: this.currency
      });
    } else if (typeof factor === "number" && factor >= 0) {
      return new PriceModel({
        amount: this.amount * factor,
        currency: this.currency
      });
    }

    throw new InvalidArgumentError("Must be a non-negative number.");
  }

  public divide(divisor: number | PriceModel): PriceModel {
    if (PriceModel.isPriceModel(divisor)) {
      if (this.currency !== divisor.getCurrency()) {
        throw new CurrencyMismatchError("Cannot divide prices in different currencies.");
      }
      return new PriceModel({
        amount: this.amount / divisor.getAmount(),
        currency: this.currency
      });
    } else if (typeof divisor === "number" && divisor > 0) {
      return new PriceModel({
        amount: this.amount / divisor,
        currency: this.currency
      });
    }

    throw new InvalidArgumentError("Must be a positive number.");
  }

  public min(...priceModels: PriceModel[]): PriceModel {
    if (priceModels.length === 0) {
      throw new InvalidArgumentError("Must provide at least one PriceModel.");
    }

    return priceModels.reduce((minPrice, currentPrice) => {
      if (!PriceModel.isPriceModel(currentPrice)) {
        throw new InvalidArgumentError("Must be a PriceModel instance.");
      } else if (minPrice.getCurrency() !== currentPrice.getCurrency()) {
        throw new CurrencyMismatchError("Cannot compare prices in different currencies.");
      }

      return minPrice.compareTo(currentPrice) < 0 ? minPrice : currentPrice;
    });
  }

  public max(...priceModels: PriceModel[]): PriceModel {
    if (priceModels.length === 0) {
      throw new InvalidArgumentError("Must provide at least one PriceModel.");
    }

    return priceModels.reduce((maxPrice, currentPrice) => {
      if (!PriceModel.isPriceModel(currentPrice)) {
        throw new InvalidArgumentError("Must be a PriceModel instance.");
      } else if (maxPrice.getCurrency() !== currentPrice.getCurrency()) {
        throw new CurrencyMismatchError("Cannot compare prices in different currencies.");
      }

      return maxPrice.compareTo(currentPrice) > 0 ? maxPrice : currentPrice;
    });
  }

  /**
   * Gets a zero value PriceModel for the same currency.
   * @returns A PriceModel instance representing zero in the same currency.
   */
  public zero(): PriceModel {
    return new PriceModel({
      currency: this.currency,
      amount: 0
    });
  }

  /**
   * Checks if the price is zero.
   * @returns True if the price is zero, false otherwise.
   */
  public isZero(): boolean {
    return this.amount === 0;
  }


  public round(): PriceModel {
    return new PriceModel({
      currency: this.currency,
      amount: this.getRoundedAmount()
    });
  }
  /**
   * Gets the rounded price value based on standard currency rules.
   * @returns The numeric price, rounded according to its currency's typical decimal places.
   */
  public getRoundedAmount(): number {
    return PriceModel.getRoundedAmount(this.amount, this.currency);
  }

  /**
   * Gets a locale-aware formatted display string for the price stored in this instance.
   * Uses the static `PriceModel.getFormattedString` method for the actual formatting.
   * @returns The formatted price string according to locale rules.
   */
  public getFormattedString() {
    return PriceModel.getFormattedString(this.amount, this.currency);
  }

  /**
   * Uses the static `PriceModel.getFormattedString` method for the actual formatting.
   * @returns The formatted price string according to locale rules.
   */
  toString() {
    return this.getFormattedString();
  }


  /**
   * Gets a locale-aware formatted display string for the amount.
   * Uses Intl.NumberFormat for accurate formatting based on locale and currency.
   * @param amount - The initial amount value.
   * @param currency - The currency code for formatting.
   * @param options - Configuration options for formatting.
   * @param options.displayAsInteger - If true, the formatted string will show the amount rounded to the next nearest integer (no decimals). Defaults to false.
   * @param options.style - The style of formatting, either 'currency' or 'decimal'. Defaults to 'currency'.
   * @param options.currencyDisplay - The display format for the currency symbol. Options are 'symbol', 'narrowSymbol', 'code', or 'name'. Defaults to 'symbol'.
   * @returns The formatted price string according to locale rules.
   * @throws {Error} If currency code is invalid.
   */
  static getFormattedString(amount: number, currency: CurrencyCode, options: {
    displayAsInteger?: boolean,
    style?: 'currency' | 'decimal',
    currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  } = {
      displayAsInteger: false,
      style: 'currency',
      currencyDisplay: 'symbol'
    }): string {

    const locale = CurrencyLocaleMap[currency];
    if (!currency || !locale) {
      throw new InvalidCurrencyCodeError('Invalid currency code for formatting.');
    }

    let valueToFormat = amount;
    const fractionDigits = options.displayAsInteger ? 0 : PriceModel.getDecimalPlaces(currency);

    let formattingOptions: Intl.NumberFormatOptions = {
      style: options.style ?? 'currency',
      currency: currency,
      signDisplay: 'never',
      currencyDisplay: options.currencyDisplay,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    };

    if (options.displayAsInteger) {
      valueToFormat = Math.ceil(valueToFormat);
    }

    try {
      return new Intl.NumberFormat(locale, formattingOptions).format(valueToFormat);
    } catch (error) {
      console.error(`Error formatting price for currency "${currency}" and locale "${locale}":`, error);
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
      case OperationalCountryCurrency.INR:
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
   * @param currency - The currency code to determine the rounding rules.
   * @returns The rounded price as a number.
   * @throws {Error} If the price is negative or currency is invalid.
   */
  static getRoundedAmount(amount: number, currency: CurrencyCode): number {
    if (amount < 0) {
      throw new InvalidPriceAmountError("Amount cannot be negative for rounding.");
    }

    if (currency === undefined) {
      throw new InvalidCurrencyCodeError('Invalid currency code for rounding.');
    }

    const decimalPlaces = PriceModel.getDecimalPlaces(currency);
    const multiplier = Math.pow(10, decimalPlaces);
    const roundedValue = Math.round(amount * multiplier) / multiplier;

    return roundedValue;
  }
}