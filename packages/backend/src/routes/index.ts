import type { C15TContext } from '~/types';
import { defineRoute } from '../pkgs/api-router';
import { createLogger } from '../pkgs/logger';
import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import { status } from './status';
import type { Route } from './types';
import { verifyConsent } from './verify-consent';

// Debug endpoint to check option values
export const debugVersionRoute = defineRoute({
	path: '/debug/version',
	method: 'get',
	handler: async (event) => {
		// Use the logger from context instead of creating a new one
		const logger =
			event.context.logger ||
			createLogger({ level: 'debug', appName: 'debug-route' });
		logger.debug('Context keys:', Object.keys(event.context));

		// Get context if available
		const ctx = event.context.c15t as C15TContext | undefined;

		if (!ctx) {
			logger.error('No c15t context found in event');
			return {
				error: true,
				message: 'No c15t context found in event',
				eventContextKeys: Object.keys(event.context),
			};
		}

		// Return detailed version information
		return {
			// Note that version is handled by schema, not options
			message:
				"Version is no longer managed in options - it's handled by schema directly",
			hasDirectVersion: !!ctx.options.version,
			directVersionValue: ctx.options.version,
			schemaManaged: true,
			allOptions: {
				...ctx.options,
				// Remove potentially sensitive information
				secret: ctx.options.secret ? '[REDACTED]' : undefined,
				database: ctx.options.database ? '[DATABASE CONFIG]' : undefined,
			},
		};
	},
});

export const routes: Route[] = [
	status,
	showConsentBanner,
	setConsent,
	verifyConsent,
	debugVersionRoute,
];
