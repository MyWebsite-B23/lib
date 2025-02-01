import util from 'node:util';
const Logger = {
  logException: (functionName: string, error: any) => {
    console.error(`Exception Occurred in Function: ${functionName}, Error: ${Logger.inspect(error)}`);
  },

  logError: (functionName: string, error: any) => {
    console.error(`Error Occurred in Function: ${functionName}, Error: ${Logger.inspect(error)}`);
  },

  logWarning: (functionName: string, message: any) => {
    console.warn(`Warning in Function: ${functionName} - ${Logger.inspect(message)}`);
  },

  logMessage: (functionName: string, message: any) => {
    console.log(`Message in Function: ${functionName} - ${Logger.inspect(message)}`);
  },

  logInvalidPayload: (functionName: string, errorMessage: string) => {
    console.error(`Invalid Payload received for Function: ${functionName}, Error: ${Logger.inspect(errorMessage)}`);
  },

  inspect: (context: any) => {
    return (typeof context === "string" ? context : util.inspect(context));
  }
}

export default Logger;