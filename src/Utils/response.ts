import ErrorTypes from "../enums/ErrorTypes";
import Logger from "../Logger";

const ResponseUtility = {
  handleException: (functionName: string, error: any, res: any) => {
    if (error.knownError) {
      error.logError && Logger.logError(functionName, error);
      res.status(error.status).json({
        status: error.status,
        error: error.error
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

  generateError: (status: number, error: string, knownError: Boolean = true, logError: boolean = false) => {
    return {
      status,
      error,
      knownError,
      logError
    }
  }
}

export default ResponseUtility;
