import { implement } from '@orpc/server';
import { consentContracts } from './consent';

const config = {
	consent: consentContracts,
};

export const os = implement(config);
