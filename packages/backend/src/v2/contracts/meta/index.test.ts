import { createConsistencyTests } from '~/v2/testing/contract-testing';
import { metaContracts } from './index';

// Add consistency tests across all meta contracts
createConsistencyTests(metaContracts);
