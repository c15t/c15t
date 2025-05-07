import { createConsistencyTests } from '~/testing/contract-testing';
import { metaContracts } from './index';

// Add consistency tests across all meta contracts
createConsistencyTests(metaContracts);
