import { DoubleTieError, ERROR_CODES } from '@doubletie/results';

export function handleError(error: unknown) {
  if (error instanceof DoubleTieError) {
    return {
      statusCode: error.status,
      body: {
        message: error.message,
        code: error.code,
        meta: error.meta
      }
    };
  }
  
  // Handle other errors
  return {
    statusCode: 500,
    body: {
      message: 'Internal Server Error',
      code: ERROR_CODES.UNEXPECTED
    }
  };
}