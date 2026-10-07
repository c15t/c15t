// Reference setup compiled with the JavaScript example and exercised by
// packages/integrations/src/sentry.e2e.test.ts.
// #region docs:sentry-scripts title="src/consent-scripts.ts"
import { sentry } from '@c15t/integrations/sentry';

export const scripts = [
	sentry({
		dsn: 'https://your-key@o0.ingest.sentry.io/0',
		initOptions: {
			release: 'my-app@1.0.0',
			replaysOnErrorSampleRate: 1,
			replaysSessionSampleRate: 0.1,
			tracesSampleRate: 0.1,
		},
	}),
];
// #endregion docs:sentry-scripts
