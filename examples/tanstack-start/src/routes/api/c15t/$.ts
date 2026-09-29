// #region docs:consent-route
import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';

export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({
			backendURL: import.meta.env.VITE_C15T_BACKEND_URL,
			proxy: true,
		}),
	},
});
// #endregion docs:consent-route
