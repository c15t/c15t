import { consentHandlers } from './handlers/consent';

import { os } from './contracts';

export const router = os.router({
	consent: consentHandlers,
});
