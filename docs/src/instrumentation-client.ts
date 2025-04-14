// This file configures the initialization of Sentry on the client.
// The config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
	dsn: process.env.SENTRY_DSN,

	// Add optional integrations for additional features
	integrations: [Sentry.replayIntegration()],

	// Define how likely traces are sampled
	tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1,

	// Define how likely Replay events are sampled
	replaysSessionSampleRate: 0.1,

	// Define how likely Replay events are sampled when an error occurs
	replaysOnErrorSampleRate: 1.0,

	// Setting this option to true will print useful information to the console
	debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
