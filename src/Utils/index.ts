import { v4 as uuidv4,  v5 as uuidv5 } from 'uuid';
import ErrorTypes from "../enums/ErrorTypes";
import Logger from "../Logger";

export default {
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

export const ResponseUtility = {
  handleException: (functionName: string, error: any, res: any) => {
    if (error.knownError) {
      error.logError && Logger.logError(functionName, error);
      res.status(error.status).json({
        status: error.status,
        error: error.message
      });
    } else {
      Logger.logException(functionName, error);
      res.status(500).json({
        status: 500,
        error: ErrorTypes.INTERNAL_SERVER_ERROR
      })
    }
  },

  generateResponse: (status: number, data?: any, error?: string) => {
    return {
      status,
      data,
      error
    }
  },

  generateError: (status: number, message: string, knownError: Boolean = true, logError: boolean = false) => {
    return {
      status,
      message,
      knownError,
      logError
    }
  }
}
