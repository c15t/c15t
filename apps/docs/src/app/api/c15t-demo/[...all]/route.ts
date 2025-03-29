import { c15tInstance } from '@c15t/backend';
import { toNextJsHandler } from '@c15t/backend/integrations';
import { memoryAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/memory-adapter';

export const { GET, POST } = toNextJsHandler(
	c15tInstance({
		appName: 'Next.js Example App',
		basePath: '/api/c15t',
		database: memoryAdapter({}),
		// Add any trusted origins if needed
		trustedOrigins: ['http://localhost:3000'],
	})
);
