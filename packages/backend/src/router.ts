import { os } from './contracts';
import { consentHandlers } from './handlers/consent';
import { metaHandlers } from './handlers/meta';

export const router = os.router({
	consent: consentHandlers,
	meta: metaHandlers,
});
