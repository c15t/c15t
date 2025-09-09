import { createConsistencyTests } from '~/v2/contracts/test.utils';
import { metaContracts } from './index';

// Add consistency tests across all meta contracts
createConsistencyTests(metaContracts);
