// #region docs:consent-route
import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';
// #hide docs

import { testBackend } from '../../../test-backend';
// #endhide docs

export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({
			backendURL: 'https://your-project.inth.app',
			// #hide docs
			...testBackend('backendURL'),
			// #endhide docs
			proxy: true,
		}),
	},
});
// #endregion docs:consent-route
