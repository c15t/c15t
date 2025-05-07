import { implement } from '@orpc/server';

import { consentContracts } from './consent';
import { metaContracts } from './meta';

const config = {
	consent: consentContracts,
	meta: metaContracts,
};

export const os = implement(config);
