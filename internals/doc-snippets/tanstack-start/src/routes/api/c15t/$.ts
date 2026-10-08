// #region docs:consent-route
import { createFileRoute } from '@tanstack/react-router';
import { createConsentServerRoute } from 'c15t/tanstack-start/api';

import { consentOptions } from '../../../consent-options.server';

export const Route = createFileRoute('/api/c15t/$')({
	server: {
		handlers: createConsentServerRoute({ ...consentOptions, proxy: true }),
	},
});
// #endregion docs:consent-route
