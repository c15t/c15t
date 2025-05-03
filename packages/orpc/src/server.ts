import { createServer } from 'node:http';
import { c15tInstance } from './core';

// Create the c15t instance with our configuration
const instance = c15tInstance({
	advanced: {
		cors: {
			allowedOrigins: ['*'], // Allow all origins for development
		},
	},
	// Add OpenAPI configuration
	openapi: {
		enabled: true, // Set to true to enable docs
		// specPath: '/spec.json',
		// docsPath: '/docs',
		// // Only override the title and description
		// options: {
		// 	info: {
		// 		title: 'My Custom API Title', // Override default title
		// 		description: 'My custom API description' // Override default description
		// 	}
		// } as Record<string, unknown>
	},
	// Add other options as needed
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
			const reader = response.body.getReader();
			const processChunk = async () => {
				const { done, value } = await reader.read();
				if (done) {
					res.end();
					return;
				}
				res.write(value);
				processChunk();
			};
			processChunk();
		} else {
			res.end();
		}
	} catch (error) {
		console.error('Error handling request:', error);
		res.writeHead(500, { 'Content-Type': 'application/json' });
		res.end(
			JSON.stringify({
				error: 'Internal Server Error',
				message: error instanceof Error ? error.message : String(error),
			})
		);
	}
});

// Start the server
const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
server.listen(PORT, () => {
	console.log(`C15T server is running at http://localhost:${PORT}`);
	console.log(`API documentation available at http://localhost:${PORT}/docs`);
});
