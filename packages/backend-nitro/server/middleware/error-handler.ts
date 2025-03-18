import { H3Error, defineEventHandler } from 'h3';
import { ERROR_CODES } from '../utils/results';

export default defineEventHandler((event) => {
	// Handle errors consistently
	event.context._nitroErrorHandler = (error: H3Error) => {
		console.error('API Error:', error);

		// Get the error status code
		const status = error.statusCode || 500;

		// Determine error code
		let code: string = ERROR_CODES.INTERNAL_ERROR;
		if (status === 404) code = ERROR_CODES.NOT_FOUND;
		if (status === 401) code = ERROR_CODES.UNAUTHORIZED;
		if (status === 400) code = ERROR_CODES.BAD_REQUEST;

		// Only expose error details in development
		const isDev = process.env.NODE_ENV === 'development';

		return {
			status: 'error',
			code,
			message: error.message || 'An unexpected error occurred',
			...(isDev && {
				stack: error.stack,
				cause: error.cause,
			}),
		};
	};
});
