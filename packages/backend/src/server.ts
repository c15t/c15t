import { createServer } from 'node:http';
import { c15tInstance } from './core';
import { DoubleTieError } from './pkgs/results';
import { getLogger } from './pkgs/utils/logger';

// Use the centralized logger
const logger = getLogger({
	level: 'info',
	// appName: 'c15t-server'
});

// Create the c15t instance with our configuration
const instance = c15tInstance({
	trustedOrigins: ['*'], // Allow all origins for development
	// Add OpenAPI configuration
	openapi: {
		enabled: true, // Set to true to enable docs
		// Additional OpenAPI options can be added here
	},
	// Add logger
	logger: {
		level: 'info',
	},
});

// Create HTTP server
const server = createServer(async (req, res) => {
	// Convert Node.js request to Web Request
	const url = new URL(req.url || '/', `http://${req.headers.host}`);
	const headers = new Headers();

	// Convert Node.js headers to Headers object
	for (const [key, value] of Object.entries(req.headers)) {
		if (value) {
			headers.set(key, Array.isArray(value) ? value.join(', ') : value);
		}
	}

	// Create a Request object compatible with oRPC
	const request = new Request(url.toString(), {
		method: req.method || 'GET',
		headers,
		// Handle request body for POST/PUT/PATCH requests
		...(req.method !== 'GET' &&
			req.method !== 'HEAD' && {
				body: req,
			}),
	});

	try {
		// Use c15tInstance handler to process the request
		// It will automatically handle OpenAPI spec and docs UI
		const response = await instance.handler(request);

		// Convert Web API Response to Node.js response
		res.writeHead(
			response.status,
			response.statusText,
			Object.fromEntries(response.headers.entries())
		);

		// Handle different response types
		if (response.body) {
			// Stream the response body
			const reader = response.body.getReader();
			const processChunk = async () => {
				try {
					const { done, value } = await reader.read();
					if (done) {
						res.end();
						return;
					}

					// Check if response already ended
					if (!res.writableEnded) {
						const canContinue = res.write(value);
						if (canContinue) {
							processChunk();
						} else {
							// If the buffer is full, wait for the drain event
							res.once('drain', processChunk);
						}
					}
				} catch (err) {
					logger.error('Error while streaming response:', err);
					if (!res.writableEnded) {
						res.end();
					}
				}
			};
			processChunk();
		} else {
			res.end();
		}
	} catch (error) {
		logger.error('Error handling request:', error);

		// Return a proper error response based on the error type
		if (error instanceof DoubleTieError) {
			res.writeHead(error.statusCode, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					code: error.code,
					message: error.message,
					data: error.meta,
				})
			);
		} else {
			// Generic error handler
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(
				JSON.stringify({
					error: 'Internal Server Error',
					message: error instanceof Error ? error.message : String(error),
				})
			);
		}
	}
});

// Start the server
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
	logger.info(`c15t server is running at http://localhost:${PORT}`);
	logger.info(`API documentation available at http://localhost:${PORT}/docs`);
});
