import { runFrameworkConformance } from '../../../react/src/__tests__/framework-conformance';
import { ConsentBoundary } from '../boundary';
import { createPolicySession, probePolicyContract } from './policy-driver';
import { policyFixture } from './policy-fixture';

runFrameworkConformance({
	Boundary: ConsentBoundary,
	createPolicySession,
	framework: 'tanstack-start',
	policyFixture,
	probePolicyContract,
});
