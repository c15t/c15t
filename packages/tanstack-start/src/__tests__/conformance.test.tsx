import { runFrameworkConformance } from '../../../react/src/__tests__/framework-conformance';
import { ConsentRoot } from '../root';
import { createPolicySession, probePolicyContract } from './policy-driver';
import { policyFixture } from './policy-fixture';

runFrameworkConformance({
	Root: ConsentRoot,
	createPolicySession,
	framework: 'tanstack-start',
	policyFixture,
	probePolicyContract,
});
