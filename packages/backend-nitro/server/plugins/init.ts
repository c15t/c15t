import { defineNitroPlugin } from 'nitropack/runtime';
import { logger } from '~/utils/logger';
import { useRuntimeConfig } from '#imports';
import { initContext } from '../middleware/context';
import type { C15TOptions } from '../types';

/**
 * Nitro plugin to initialize the C15T application
 *
 * @remarks
 * This plugin initializes the global context when the Nitro server starts.
 * It should run before any requests are handled.
 */
export default defineNitroPlugin((nitroApp) => {
	// Get configuration from runtime config
	const config = useRuntimeConfig();
	// Load configuration from runtime config and environment variables
	const options: C15TOptions = {
		secret:
			config.c15t?.secret || process.env.C15T_SECRET || 'development-secret',
		baseURL: config.public.apiBase || process.env.C15T_BASE_URL || '/api',
		logger: logger(),
		// Add more options as needed
	};

	// Initialize the context
	try {
		const context = initContext(options);
		context.logger.info(
			`initialized successfully with base URL: ${context.baseURL}`
		);
	} catch (error) {
		logger().error('❌ Failed to initialize C15T:', error);
		// Throw to prevent server from starting with invalid context
		throw error;
	}
});
