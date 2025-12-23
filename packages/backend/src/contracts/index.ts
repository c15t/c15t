import type {
	InferContractRouterInputs,
	InferContractRouterOutputs,
} from '@orpc/contract';
import { implement } from '@orpc/server';

import { consentContracts } from './consent';
import { initContract } from './init';
import { metaContracts } from './meta';

const config = {
	init: initContract,
	consent: consentContracts,
	meta: metaContracts,
};

export { config as contracts };

export const os = implement(config);

export type ContractsOutputs = InferContractRouterOutputs<typeof config>;
export type ContractsInputs = InferContractRouterInputs<typeof config>;
