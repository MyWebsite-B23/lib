import { v4 as uuidv4,  v5 as uuidv5 } from 'uuid';

const Utils = {
  isUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  generateUUID: (value?: string, namespace?: string) => {
    if(namespace && value){
      return uuidv5(value, namespace);
    }
    return uuidv4();
  },

  generateSearchId: (key: string, variantId: string) => {
    return `${key}#${variantId}`;
  },

  getKeyfromSearchId: (searchId: string) => {
    const [key, variantId] = searchId.split('#');
    return {
      key,
      variantId
    }
  },
}

export default Utils;
