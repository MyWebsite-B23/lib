import util from 'util';
const Logger = {
  logException: (functionName: string, error: any) => {
    console.error(`Exception Occurred in Function: ${functionName}, Error: ${util.inspect(error)}`);
  },

  logError: (functionName: string, errorMessage: string) => {
    console.error(`Error Occurred in Function: ${functionName}, Error: ${util.inspect(errorMessage)}`);
  },

  logWarning: (functionName: string, message: any) => {
    console.warn(`Warning in Function: ${functionName} - ${util.inspect(message)}`);
  },

  logMessage: (functionName: string, message: any) => {
    console.log(`Message in Function: ${functionName} - ${util.inspect(message)}`);
  },

  logInvalidPayload: (functionName: string, errorMessage: string) => {
    console.error(`Invalid Payload received for Function: ${functionName}, Error: ${errorMessage}`);
  }
}

export default Logger;