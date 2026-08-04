import {
	type ConsentPolicy,
	type ConsentPolicyType,
	consentPolicySchema,
	consentPolicyTypeSchema,
	type LegalDocumentPolicyType,
	legalDocumentPolicyTypeSchema,
	type PolicyType,
	policyTypeSchema,
} from '@c15t/schema';
import { consentPolicyTable as previousConsentPolicyTable } from '../2.0.0/consent-policy';

export const consentPolicyTable = previousConsentPolicyTable.clone();

export {
	type ConsentPolicy,
	type ConsentPolicyType,
	consentPolicySchema,
	consentPolicyTypeSchema,
	type LegalDocumentPolicyType,
	legalDocumentPolicyTypeSchema,
	type PolicyType,
	policyTypeSchema,
};

// Backward compatible alias
export const PolicyTypeSchema = policyTypeSchema;
