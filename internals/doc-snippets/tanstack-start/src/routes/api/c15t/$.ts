// #region docs:consent-route
import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';

export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({
			backendURL: 'https://your-project.inth.app',
			proxy: true,
		}),
	},
});
// #endregion docs:consent-route
