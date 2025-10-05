import type {
	InferContractRouterInputs,
	InferContractRouterOutputs,
} from '@orpc/contract';
import { implement } from '@orpc/server';

import { analyticsContracts } from './analytics';
import { consentContracts } from './consent';
import { metaContracts } from './meta';

const config = {
	analytics: analyticsContracts,
	consent: consentContracts,
	meta: metaContracts,
};

export { config as contracts };

export const os = implement(config);

export type ContractsOutputs = InferContractRouterOutputs<typeof config>;
export type ContractsInputs = InferContractRouterInputs<typeof config>;
