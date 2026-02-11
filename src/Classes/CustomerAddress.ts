import AddressModel, { AddressData } from "./Address";
import BaseModel, { BaseAttributes } from "./Base";

export type CustomerAddressAttributes = BaseAttributes & {
  id: string;
  addresses: { [key: string]: AddressData };
  defaultBillingAddressId?: string;
  defaultShippingAddressId?: string;
}

type CustomerAddressWithoutDefaultAddress = Omit<CustomerAddressAttributes, 'defaultBillingAddressId' | 'defaultShippingAddressId'> & {
  defaultBillingAddressId: string | null;
  defaultShippingAddressId: string | null;
};
export type CustomerAddressDataWithOutId = Required<Omit<CustomerAddressWithoutDefaultAddress, 'id'>>;
export type CustomerAddressData = Required<CustomerAddressWithoutDefaultAddress>;


export default class CustomerAddressModel extends BaseModel {
  protected id: string;
  protected addresses: { [key: string]: AddressModel };
  protected defaultBillingAddressId: string | null;
  protected defaultShippingAddressId: string | null;

  /**
   * Creates an instance of CustomerAddressModel.
   * Initializes the address list, sorting them by modification date (most recent first).
   * @param data - The initial attributes for the customer's addresses.
   * @param date - Optional date object for setting creation/modification times (defaults to now).
   */
  constructor(data: CustomerAddressAttributes, date: Date = new Date()) {
    super(data, date);
    this.id = data.id;
    this.addresses = { }
    
    Object.keys(data.addresses)
      .map((addressId: string) => this.addresses[addressId] = new AddressModel(data.addresses[addressId], date));

    this.defaultBillingAddressId = data.defaultBillingAddressId ?? null;
    this.defaultShippingAddressId = data.defaultShippingAddressId ?? null;
  }

  /**
   * Gets a plain data object representing the customer's addresses.
   * Can optionally exclude the customer address collection ID. Includes base model details.
   * @param withId - If true, includes the 'id' field of the CustomerAddressModel. Defaults to false.
   * @returns CustomerAddressData or CustomerAddressDataWithOutId object suitable for serialization.
   */
  getDetails(withId?: false): CustomerAddressDataWithOutId;
  getDetails(withId: true): CustomerAddressData;
  getDetails(withId: boolean = false): CustomerAddressData | CustomerAddressDataWithOutId {
    return {
      ...(withId ? { id: this.getId() } : {}),
      addresses: this.getAddresses().reduce((acc, address) => {
        acc[address.getId()] = address.getDetails();
        return acc;
      }, {} as Record<string, AddressData>),
      defaultBillingAddressId: this.getDefaultBillingAddressId(),
      defaultShippingAddressId: this.getDefaultShippingAddressId(),
      ...super.getDetails()
    }
  }
  
  getId(): string {
    return this.id;
  }

  /**
   * Gets the list of all associated address models, sorted by creation date (most recent first).
   * @returns An array of AddressModel instances.
   */
  getAddresses(): AddressModel[] {
    return Object.values(this.addresses)
      .sort((a, b) => b.getCreatedAtTime() - a.getCreatedAtTime());
  }

  /**
   * Gets a filtered list of addresses designated as shipping addresses.
   * @returns An array of AddressModel instances marked as shipping addresses.
   */
  getShippingAddresses(): AddressModel[] {
    return this.getAddresses().filter((address) => address.getIsShippingAddress());
  }

  /**
   * Gets a filtered list of addresses designated as billing addresses.
   * @returns An array of AddressModel instances marked as billing addresses.
   */
  getBillingAddresses(): AddressModel[] {
    return this.getAddresses().filter((address) => address.getIsBillingAddress());
  }

  /**
   * Gets the ID of the default billing address.
   * If the stored default ID is invalid or doesn't correspond to a billing address,
   * it falls back to the most recently modified billing address.
   * @returns The ID of the default billing address, or null if no valid billing address exists.
   */
  getDefaultBillingAddressId(): string | null {
    const explicitDefault = this.getAddresses().find(
      (address) => address.getId() === this.defaultBillingAddressId && address.getIsBillingAddress()
    );
    if (explicitDefault) {
      return explicitDefault.getId();
    }
    // Fallback: Find the first address marked as billing (already sorted by most recent)
    return this.getAddresses().find((address) => address.getIsBillingAddress())?.getId() || null;
  }

  /**
   * Gets the ID of the default shipping address.
   * If the stored default ID is invalid or doesn't correspond to a shipping address,
   * it falls back to the most recently modified shipping address.
   * @returns The ID of the default shipping address, or null if no valid shipping address exists.
   */
  getDefaultShippingAddressId(): string | null {
    // Check if the explicitly set default exists, is valid, and is a shipping address
    const explicitDefault = this.getAddresses().find(
      (address) => address.getId() === this.defaultShippingAddressId && address.getIsShippingAddress()
    );
    if (explicitDefault) {
      return explicitDefault.getId();
    }
    // Fallback: Find the first address marked as shipping (already sorted by most recent)
    return this.getAddresses().find((address) => address.getIsShippingAddress())?.getId() || null;
  }
}
