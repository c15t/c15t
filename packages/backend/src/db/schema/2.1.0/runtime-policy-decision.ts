import {
	type RuntimePolicyDecision,
	runtimePolicyDecisionSchema,
} from '@c15t/schema';
import { runtimePolicyDecisionTable as previousRuntimePolicyDecisionTable } from '../2.0.0/runtime-policy-decision';

export const runtimePolicyDecisionTable =
	previousRuntimePolicyDecisionTable.clone();

export { type RuntimePolicyDecision, runtimePolicyDecisionSchema };
