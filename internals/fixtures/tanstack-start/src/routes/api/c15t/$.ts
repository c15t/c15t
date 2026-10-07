import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';

import { testBackend } from '../../../test-backend';

export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({
			backendURL: 'https://your-project.inth.app',
			...testBackend('backendURL'),
			proxy: true,
		}),
	},
});
