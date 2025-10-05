import { os } from './contracts';
import { analyticsHandlers } from './handlers/analytics';
import { consentHandlers } from './handlers/consent';
import { metaHandlers } from './handlers/meta';

export const router = os.router({
	analytics: analyticsHandlers,
	consent: consentHandlers,
	meta: metaHandlers,
});
