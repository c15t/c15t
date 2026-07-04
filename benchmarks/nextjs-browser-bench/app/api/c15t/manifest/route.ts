import { createNextConsentRouteHandlers } from '@c15t/nextjs/v3/api';

const handlers = createNextConsentRouteHandlers({
	manifestURL: '/api/bench-consent/manifest',
});

export const GET = handlers.manifestGET;
