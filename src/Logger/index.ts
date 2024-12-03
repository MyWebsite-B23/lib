import util from 'util';
const Logger = {
    logException: (functionName: string, error: any) => {
        console.log(`Exception Occurred in Function: ${functionName}, Error: ${util.inspect(error)}`);
    },

    logError: (functionName: string, errorMessage: string) => {
        console.log(`Error Occurred in Function: ${functionName}, Error: ${util.inspect(errorMessage)}`);
    },

    logInvalidPayload: (functionName: string, errorMessage: string) => {
        console.log(`Invalid Payload received for Function: ${functionName}, Error: ${errorMessage}`);
    }
}

export default Logger;