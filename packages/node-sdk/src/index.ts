/**
 * Typed client for the c15t consent API, for server code.
 *
 * @packageDocumentation
 */

export { createC15tClient } from './client';
export type {
	C15tClient,
	C15tConsents,
	C15tExperiments,
	C15tLegalDocuments,
	C15tPublicClient,
	C15tPublicSubjects,
	C15tSubjects,
} from './client';
export type {
	C15tCheckConsentInput,
	C15tCheckConsentOutput,
	C15tCreateSubjectInput,
	C15tExperimentSummaryRequest,
	C15tGetSubjectRequest,
	C15tIdentifySubjectInput,
	C15tInitRequest,
	C15tManifestRequest,
	C15tManifestResult,
	C15tPublishLegalDocumentInput,
} from './contract';
export { C15tConfigurationError } from './configuration-error';
export type { C15tConfigurationIssue } from './configuration-error';
export {
	C15T_API_ERROR_CODES,
	C15T_CLIENT_ERROR_CODES,
	C15tError,
	isC15tError,
} from './errors';
export type {
	C15tApiErrorCode,
	C15tClientErrorCode,
	C15tErrorCode,
	C15tIssue,
	StalePolicyReason,
} from './errors';
export type {
	C15tCallOptions,
	C15tClientOptions,
	C15tRequestEvent,
	C15tRetryOptions,
} from './options';
export { unwrap } from './result';
export type {
	C15tDataOf,
	C15tErrorCodeOf,
	C15tFailure,
	C15tResult,
	C15tSuccess,
} from './result';
export type {
	ConsentCheckResult,
	ConsentItem,
	ConsentManifest,
	ConsentPolicyType,
	ExperimentArmSummary,
	ExperimentSummaryOutput,
	GetSubjectOutput,
	InitOutput,
	LegalDocumentCurrentOutput,
	LegalDocumentPolicyType,
	ListSubjectsOutput,
	PatchSubjectOutput,
	PostSubjectOutput,
	StatusOutput,
	SubjectItem,
} from '@c15t/schema/types';
