import { os } from './contracts';
import { consentHandlers } from './handlers/consent';
import { init } from './handlers/init';
import { metaHandlers } from './handlers/meta';

export const router = os.router({
	init,
	consent: consentHandlers,
	meta: metaHandlers,
});
