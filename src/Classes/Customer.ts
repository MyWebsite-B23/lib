import BaseModel, { BaseAttributes, BaseData } from "./Base";

export enum CustomerStatus {
  CREATED = "CREATED",
  REGISTERED_USER = "REGISTERED_USER",
  ACTIVATED_USER = "ACTIVATED_USER",
  EMAIL_OTP = "EMAIL_OTP",
  EMAIL_PASSWORD = "EMAIL_PASSWORD",
  PHONE_OTP = "PHONE_OTP",
}

export type CustomerAttributes = BaseAttributes & {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  isEmailVerified?: boolean;
  customerStatus?: Set<CustomerStatus>;
};


type CustomerDataWithArrayStatus = Omit<CustomerAttributes, 'customerStatus'> & BaseData & { customerStatus: CustomerStatus[]; }
export type CustomerData = Required<CustomerDataWithArrayStatus>;
export type CustomerDataWithOutId = Omit<CustomerData, 'id'>;

/**
 * Represents a customer entity, managing customer information and status.
 */
export default class CustomerModel extends BaseModel {
  protected id: string;
  protected email: string;
  protected phone: string;
  protected firstName: string;
  protected lastName: string;
  protected isEmailVerified: boolean;
  protected customerStatus: Set<CustomerStatus>;

  /**
   * Creates an instance of CustomerModel.
   * Initializes customer properties and ensures the CREATED status is always present.
   * @param data - The initial attributes for the customer.
   * @param date - Optional date object for setting creation/modification times (defaults to now).
   */
  constructor(data: CustomerAttributes, date: Date = new Date()) {
    super(data, date);
    this.id = data.id;
    this.email = data.email;
    this.phone = data.phone;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.isEmailVerified = data.isEmailVerified ?? false;
    this.customerStatus = new Set<CustomerStatus>(
      [...(data.customerStatus ? Array.from<CustomerStatus>(data.customerStatus) : []), CustomerStatus.CREATED]
    );
  }

  /**
   * Gets a plain data object representing the customer's current state.
   * Can optionally exclude the customer ID. Includes base model details.
   * @param withId - If true, includes the 'id' field. Defaults to false.
   * @returns CustomerData or CustomerDataWithOutId object suitable for serialization.
   */
  getDetails(withId?: false): CustomerDataWithOutId;
  getDetails(withId: true): CustomerData;
  getDetails(withId: boolean = false): CustomerData | CustomerDataWithOutId {
    return {
      ...super.getDetails(),
      ...(withId ? { id: this.getId() } : {}),
      email: this.getEmail(),
      phone: this.getPhone(),
      firstName: this.getFirstName(),
      lastName: this.getLastName(),
      isEmailVerified: this.getIsEmailVerified(),
      customerStatus: this.getCustomerStatus()
    };
  }

  /**
   * Gets the unique identifier for the customer.
   * @returns The customer ID.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the email address of the customer.
   * @returns The email address.
   */
  getEmail(): string {
    return this.email;
  }

  /**
   * Gets the phone number of the customer.
   * @returns The phone number.
   */
  getPhone(): string {
    return this.phone;
  }


  /**
   * Gets the first name of the customer.
   * @returns The first name.
   */
  getFirstName(): string {
    return this.firstName;
  }


  /**
   * Gets the last name of the customer.
   * @returns The last name.
   */
  getLastName(): string {
    return this.lastName;
  }


  /**
   * Checks if the customer's email address has been verified.
   * @returns True if the email is verified, false otherwise.
   */
  getIsEmailVerified(): boolean {
    return this.isEmailVerified;
  }


  /**
   * Gets the customer's current statuses as an array.
   * @returns An array of CustomerStatus enum values.
   */
  getCustomerStatus(): CustomerStatus[] {
    return Array.from(this.customerStatus);
  }

  /**
   * Checks if the customer has a specific status.
   * Note: This method currently returns void. It should likely return boolean.
   * @param customerStatus - The status to check for.
   * @returns return boolean: true if the status exists, false otherwise.
   */
  hasCustomerStatus(customerStatus: CustomerStatus): boolean {
    return this.customerStatus.has(customerStatus);
  }
}
