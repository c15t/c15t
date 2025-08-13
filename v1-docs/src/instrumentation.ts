import * as Sentry from '@sentry/nextjs';

export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		try {
			await import('../sentry.server.config');
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: its ok to log errors here
			console.error('Failed to load Sentry server config:', error);
		}
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		try {
			await import('../sentry.edge.config');
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: its ok to log errors here
			console.error('Failed to load Sentry edge config:', error);
		}
	}
}

export const onRequestError = Sentry.captureRequestError;
