// #region docs:consent-route
import { createFileRoute } from '@tanstack/react-router';
import { createConsentRoute } from 'c15t/tanstack-start/api';

export const Route = createFileRoute('/api/c15t/$')({
	server: { handlers: createConsentRoute({ proxy: true }) },
});
// #endregion docs:consent-route
