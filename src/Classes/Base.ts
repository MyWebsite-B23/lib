import { AuthType } from "../Auth";
import { ISODateTimeUTC, Prettify } from "./Common";

export interface CustomFields {
  [key: string]: any;
}

export type CustomFieldAttributes = {
  customFields?: CustomFields;
}

export class CustomFieldModel {
  protected customFields: CustomFields;
  constructor(data: CustomFieldAttributes, date: Date = new Date()) {
    this.customFields = { ...data.customFields };
  }

  /**
   * Retrieves the value of a specific custom field.
   * @param fieldName - The name (key) of the custom field to retrieve.
   * @returns The value of the custom field, or null if the field does not exist.
   */
  getCustomField(fieldName: string): any {
    return this.customFields[fieldName] ?? null;
  }

  /**
   * Sets the value of a specific custom field.
   * Also updates the modification timestamp and increments the version.
   * @param fieldName - The name (key) of the custom field to set.
   * @param value - The value to assign to the custom field.
   */
  setCustomField(fieldName: string, value: any): void {
    this.customFields[fieldName] = value;
  }

  /**
   * Retrieves a shallow copy of all custom fields associated with the instance.
   * @returns An object containing all custom fields.
   */
  getAllCustomFields(): CustomFields {
    return { ...this.customFields };
  }
}

export type ModifiedBy = {
  id?: string;
  authType?: string;
  requestId?: string;
  lambdaName?: string;
}

export type BaseAttributes = Prettify<CustomFieldAttributes & {
  version?: number;
  createdAt?: ISODateTimeUTC;
  modifiedAt?: ISODateTimeUTC;
  modifiedBy?: ModifiedBy;
}>;

export type BaseData = Required<BaseAttributes>;

/**
 * Provides common foundational properties and methods for other data models.
 * Handles tracking of custom fields, versioning, and timestamps.
 */
export default class BaseModel extends CustomFieldModel {
  protected version: number;
  protected createdAt: ISODateTimeUTC;
  protected modifiedAt: ISODateTimeUTC;
  protected modifiedBy: ModifiedBy;

  /**
   * Creates an instance of BaseModel.
   * Initializes common properties like timestamps, version, and custom fields.
   * @param data - Optional initial attributes for the base model.
   * @param date - Optional date object to use for default timestamps (defaults to current time).
   */
  constructor(data: BaseAttributes, date: Date = new Date()) {
    super(data);
    this.version = data.version ?? 1;
    this.createdAt = data.createdAt && !isNaN(Date.parse(data.createdAt))
      ?
      new Date(data.createdAt).toISOString()
      :
      date.toISOString();
    this.modifiedAt = data.modifiedAt && !isNaN(Date.parse(data.modifiedAt))
      ? new Date(data.modifiedAt).toISOString()
      : date.toISOString();

    this.modifiedBy = { ...data.modifiedBy };
  }

  /**
   * Gets a plain data object representing the base model's current state.
   * @returns BaseData object containing common properties.
   */
  getDetails(): BaseData {
    return {
      customFields: this.getAllCustomFields(), // Use getter to return a copy
      version: this.getVersion(),
      createdAt: this.getCreatedAt(),
      modifiedAt: this.getModifiedAt(),
      modifiedBy: this.getModifiedBy(),
    }
  }

  /**
   * Gets the current version number of the model instance.
   * @returns The version number.
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Gets the creation timestamp as an ISO 8601 string.
   * @returns The creation timestamp string.
   */
  getCreatedAt(): string {
    return this.createdAt;
  }

  /**
   * Gets the creation timestamp as a Unix epoch time (milliseconds).
   * @returns The creation time in milliseconds since the epoch.
   */
  getCreatedAtTime(): number {
    return new Date(this.createdAt).getTime();
  }


  /**
   * Gets the last modification timestamp as an ISO 8601 string.
   * @returns The last modification timestamp string.
   */
  getModifiedAt(): string {
    return this.modifiedAt;
  }

  /**
   * Gets the last modification timestamp as a Unix epoch time (milliseconds).
   * @returns The last modification time in milliseconds since the epoch.
   */
  getModifiedAtTime(): number {
    return new Date(this.modifiedAt).getTime();
  }

  /**
   * Gets the identifier of the user or process that last modified the instance.
   * @returns
   */
  getModifiedBy(): ModifiedBy {
    return { ...this.modifiedBy };
  }

  /**
   * Sets the identifier of the user or process that last modified the instance.
   * @param modifiedBy - The identifier string.
   */
  setModifiedBy(id?: string, authType?: AuthType, requestId?: string, lambdaName?: string): void {
    this.modifiedBy = {
      id,
      authType,
      requestId,
      lambdaName,
    };
  }
}
