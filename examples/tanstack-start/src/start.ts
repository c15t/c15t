import { createStart } from '@tanstack/react-start';
import { consentRequestMiddleware } from 'c15t/tanstack-start/middleware';

import { regionOverrideMiddleware } from './middleware/region-override';

/**
 * Request middleware runs for every server request: document renders, server
 * functions, and server routes (including the self-hosted backend).
 *
 * Order matters. The region override writes `x-c15t-country` /
 * `x-c15t-region` first, then `consentRequestMiddleware()` normalizes every
 * geo, language, and GPC header into the canonical set that the consent
 * routes, the root loader, and `@c15t/backend` all read.
 */
export const startInstance = createStart(() => ({
	requestMiddleware: [regionOverrideMiddleware, consentRequestMiddleware()],
}));
