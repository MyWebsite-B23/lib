import BaseModel, { BaseAttributes } from "./Base";

export enum AddressType {
  BILLING = "billing",
  SHIPPING = "shipping",
  BILLING_AND_SHIPPING = "billing&shipping",
  NONE = "none",
}

export type AddressAttributes = BaseAttributes & {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string
  state: string;
  country: string;
  isBillingAddress: boolean;
  isShippingAddress: boolean;
};

export type AddressData = Required<AddressAttributes>;

/**
 * Represents a physical address associated with a customer or order.
 * Handles both billing and shipping address types.
 */
export default class AddressModel extends BaseModel {
  protected id: string;
  protected firstName: string;
  protected lastName: string;
  protected phone: string;
  protected email: string;
  protected addressLine1: string;
  protected addressLine2: string;
  protected city: string;
  protected postalCode: string
  protected state: string;
  protected country: string;
  protected isBillingAddress: boolean;
  protected isShippingAddress: boolean;

  /**
   * Creates an instance of AddressModel.
   * @param data - The initial address attributes.
   * @param date - Optional date for setting creation/modification times (defaults to now).
   */
  constructor(data: AddressAttributes, date: Date = new Date()) {
    super(data, date);
    this.id = data.id;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.email = data.email;
    this.addressLine1 = data.addressLine1;
    this.addressLine2 = data.addressLine2 || '';
    this.city = data.city;
    this.postalCode = data.postalCode;
    this.state = data.state;
    this.country = data.country;
    this.isBillingAddress = data.isBillingAddress;
    this.isShippingAddress = data.isShippingAddress;
  }

  /**
   * Gets a plain data object representing the address's current state.
   * Includes all address fields and base model fields.
   * @returns AddressData object suitable for serialization or API responses.
   */
  getDetails(): AddressData {
    return {
      ...super.getDetails(),
      id: this.getId(),
      firstName: this.getFirstName(),
      lastName: this.getLastName(),
      phone: this.getPhone(),
      email: this.getEmail(),
      addressLine1: this.getAddressLine1(),
      addressLine2: this.getAddressLine2(),
      city: this.getCity(),
      postalCode: this.getPostalCode(),
      state: this.getState(),
      country: this.getCountry(),
      isBillingAddress: this.getIsBillingAddress(),
      isShippingAddress: this.getIsShippingAddress(),
    }
  }

  /**
  * Gets the unique identifier for the address.
  * @returns The address ID.
  */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the first name associated with the address.
   * @returns The first name.
   */
  getFirstName(): string {
    return this.firstName;
  }

  /**
   * Gets the last name associated with the address.
   * @returns The last name.
   */
  getLastName(): string {
    return this.lastName;
  }

  /**
   * Gets the phone number associated with the address.
   * @returns The phone number.
   */
  getPhone(): string {
    return this.phone;
  }

  /**
   * Gets the email address associated with the address.
   * @returns The email address.
   */
  getEmail(): string {
    return this.email;
  }

  /**
   * Gets the primary address line (e.g., street address).
   * @returns The first address line.
   */
  getAddressLine1(): string {
    return this.addressLine1;
  }

  /**
   * Gets the secondary address line (e.g., apartment, suite).
   * Returns an empty string if not provided.
   * @returns The second address line or an empty string.
   */
  getAddressLine2(): string {
    return this.addressLine2;
  }

  /**
   * Gets the city name.
   * @returns The city.
   */
  getCity(): string {
    return this.city;
  }

  /**
   * Gets the postal code (e.g., ZIP code).
   * @returns The postal code.
   */
  getPostalCode(): string {
    return this.postalCode;
  }

  /**
   * Gets the state, province, or region.
   * @returns The state.
   */
  getState(): string {
    return this.state;
  }

  /**
   * Gets the country name or code.
   * @returns The country.
   */
  getCountry(): string {
    return this.country;
  }

  /**
   * Checks if this address is designated as a billing address.
   * @returns True if it's a billing address, false otherwise.
   */
  getIsBillingAddress(): boolean {
    return this.isBillingAddress;
  }

  /**
   * Checks if this address is designated as a shipping address.
   * @returns True if it's a shipping address, false otherwise.
   */
  getIsShippingAddress(): boolean {
    return this.isShippingAddress;
  }

  /**
   * Determines the type of the address based on its billing and shipping flags.
   * @returns The AddressType enum value representing the address's role.
   */
  getAddressType(): AddressType {
    if (this.isBillingAddress && this.isShippingAddress) {
      return AddressType.BILLING_AND_SHIPPING;
    } else if (this.isBillingAddress) {
      return AddressType.BILLING;
    } else if (this.isShippingAddress) {
      return AddressType.SHIPPING;
    } else {
      return AddressType.NONE;
    }
  }

  /**
   * Static method to check if a given AddressType includes shipping.
   * @param addressType - The address type to check.
   * @returns True if the type is SHIPPING or BILLING_AND_SHIPPING.
   */
  static checkIfShippingAddress(addressType: AddressType): boolean {
    return addressType === AddressType.SHIPPING || addressType === AddressType.BILLING_AND_SHIPPING;
  }

  /**
   * Static method to check if a given AddressType includes billing.
   * @param addressType - The address type to check.
   * @returns True if the type is BILLING or BILLING_AND_SHIPPING.
   */
  static checkIfBillingAddress(addressType: AddressType): boolean {
    return addressType === AddressType.BILLING || addressType === AddressType.BILLING_AND_SHIPPING;
  }
}