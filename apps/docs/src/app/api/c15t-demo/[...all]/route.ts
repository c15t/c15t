import { c15tInstance } from '@c15t/backend';
import { toNextHandler } from '@c15t/backend/integrations/next';
import { memoryAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/memory-adapter';

export const { GET, POST, OPTIONS } = toNextHandler(
	c15tInstance({
		appName: 'Next.js Example App',
		basePath: '/api/c15t-demo',
		database: memoryAdapter({}),
		// Add your client origin that's making the requests
		trustedOrigins: ['http://localhost:3000', 'http://localhost:8787'],
		// Enable CORS explicitly
		cors: true,
		// Advanced CORS configuration
		advanced: {
			cors: {
				// Allow x-request-id header that's causing the preflight error
				allowHeaders: ['content-type', 'x-request-id'],
			},
			// Disable CSRF for testing if needed
			disableCSRFCheck: true,
		},
	})
);
