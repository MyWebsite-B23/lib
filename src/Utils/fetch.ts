"use client";

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
    
    Logger.logError('Fetch', `API call failed: URL-${baseURL}/${endpoint}, Status- ${err.status || 500}, Error- ${JSON.stringify(err.error, null, 2)}`);
    throw {
      status: err.status || 500,
      statusText: err.statusText || 'Internal Server Error',
      error: err.error || {
        status: err.status || 500,
        error: err.statusText || 'Something went wrong',
      }
    } as ErrorType;
  }
};

export default Fetch;
