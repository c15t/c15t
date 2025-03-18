import { DoubleTieError } from '@doubletie/results';

export default defineNitroErrorHandler((error, event) => {
  // Set JSON content type since we're returning structured errors
  setResponseHeader(event, 'Content-Type', 'application/json');
  setResponseStatus(event, error instanceof DoubleTieError ? error.status : 500);

  // Handle DoubleTieError specifically
  if (error instanceof DoubleTieError) {
    return send(event, {
      statusCode: error.status,
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  }

  // Handle other errors
  const statusCode = getResponseStatus(event) || 500;
  
  return send(event, {
    statusCode,
    message: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    meta: {
      // Only include stack trace in development
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });
});