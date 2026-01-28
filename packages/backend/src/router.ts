import { os } from './contracts';
import { consentHandlers } from './handlers/consent';
import { init } from './handlers/init';
import { metaHandlers } from './handlers/meta';
import { subjectHandlers } from './handlers/subject';

export const router = os.router({
	init,
	consent: consentHandlers,
	subject: subjectHandlers,
	meta: metaHandlers,
});
