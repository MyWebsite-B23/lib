"use client";

import ErrorTypes from "../enums/ErrorTypes";
import Logger from "../Logger";

export type ErrorType = {
  status: number;
  statusText: string;
  error: any;
};

export type SuccessType = {
  status: number;
  statusText: string;
  data: any;
};

/**
 * Makes an HTTP request to the specified endpoint using the provided parameters.
 *
 * @param {string} baseURL - The base URL of the API.
 * @param {string} endpoint - The specific endpoint to call.
 * @param {'GET' | 'POST' | 'PATCH' | 'DELETE'} [method='GET'] - The HTTP method to use for the request.
 * @param {Record<string, string>} [headers={}] - Additional headers to include in the request.
 * @param {any} [payload] - The payload to send with the request, if applicable.
 * @returns {Promise<SuccessType>} - A promise that resolves to the response data if the request is successful.
 * @throws {ErrorType} - Throws an error if the request fails.
 */
const Fetch = async (
  baseURL: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  headers: Record<string, string> = {},
  payload?: any,
): Promise<SuccessType> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (method !== 'GET' && payload) {
    options.body = JSON.stringify(payload);
  }

  try {
    const response: any = await fetch(`${baseURL}/${endpoint}`, options);

    if (!response.ok) {
      const errorBody: any = await response.json().catch(() => response.text());

      throw {
        status: response.status,
        statusText: response.statusText,
        error: errorBody ? errorBody : {
          status: response.status,
          error: response.statusText,
        }
      } as ErrorType;
    }

    const body = await response.json();

    Logger.logMessage('Fetch', `API call successful: URL-${baseURL}/${endpoint}, Status- ${response.status}`);
    return {
      status: response.status,
      statusText: response.statusText,
      data: body.data,
    } as SuccessType;
  } catch (err: any) {
    
    Logger.logError('Fetch', `API call failed: URL-${baseURL}/${endpoint}, Status- ${err.status || 500}, Error- ${Logger.inspect(err.error || err)}`);
    throw {
      status: err.status || 500,
      statusText: err.statusText || ErrorTypes.INTERNAL_SERVER_ERROR,
      error: err.error || {
        status: err.status || 500,
        error: err.statusText || ErrorTypes.SOMETHING_WENT_WRONG,
      }
    } as ErrorType;
  }
};

export default Fetch;
