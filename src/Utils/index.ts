import { v4 as uuidv4,  v5 as uuidv5 } from 'uuid';
import ProductModel, { SelectionAttributes } from '../Classes/Product';

const Utils = {
  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isEmail: (value: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  },

  isURL: (value: string): boolean => {
    const urlRegex = /^(http|https):\/\/[^ "]+$/;
    return urlRegex.test(value);
  },
  
  generateUUID: (value?: string, namespace?: string) => {
    if(namespace && value){
      return uuidv5(value, namespace);
    }
    return uuidv4();
  },

  generateSearchId: (key: string, selectionAttributes: SelectionAttributes) => {
    return `${key}#${ProductModel.generateSelectionAttributesKey(selectionAttributes)}`;
  },

  getKeyfromSearchId: (searchId: string) => {
    const [key, selectionAttributesKey] = searchId.split('#');
    return {
      key,
      selectionAttributes: ProductModel.parseSelectionAttributesKey(selectionAttributesKey)
    }
  },

  /**
   * Deep clones an object using `structuredClone`. Don't use this on a class instance.
   * @param obj - The object to clone.
   * @returns A deep clone of the object.
   */
  deepClone<T>(obj: T): T {
    return structuredClone(obj);
  }
}

export default Utils;
