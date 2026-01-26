import { createConsistencyTests } from '~/contracts/test.utils';
import { metaContracts } from './index';

// Add consistency tests across all meta contracts
createConsistencyTests(metaContracts);
