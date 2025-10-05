/**
 * @fileoverview Analytics health check handler for c15t v2 system.
 * Provides health status and configuration information for analytics service using the plugin system.
 */

import { os } from '../../contracts';
import type { C15TContext } from '../../types';

/**
 * Analytics health check handler.
 *
 * @param context - The c15t context
 * @returns Service status and configuration
 */
export const analyticsHealthCheck = os.analytics.health.handler(
	async ({ context }) => {
		const typedContext = context as C15TContext;

		const destinations: Array<{
			type: string;
			enabled: boolean;
			status: 'connected' | 'disconnected' | 'error';
		}> = [
			{
				type: 'console',
				enabled: true,
				status: 'connected',
			},
		];

		// Get destination manager from context
		const destinationManager = typedContext.destinationManager;

		if (destinationManager) {
			try {
				// Test connections for all loaded destinations
				const connectionResults = await destinationManager.testConnections();

				// Add destinations to the results
				for (const result of connectionResults) {
					destinations.push({
						type: result.type,
						enabled: true,
						status: result.status,
					});
				}
			} catch (error) {
				console.error('Destination health check failed:', error);
			}
		}

		return {
			status: 'healthy' as const,
			service: 'analytics',
			version: '2.0.0',
			destinations,
			timestamp: new Date().toISOString(),
		};
	}
);
