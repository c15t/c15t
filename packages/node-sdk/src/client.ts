import type {
	ConsentPolicyType,
	ExperimentSummaryOutput,
	GetSubjectOutput,
	InitOutput,
	LegalDocumentCurrentOutput,
	LegalDocumentPolicyType,
	ListSubjectsOutput,
	PatchSubjectOutput,
	PostSubjectOutput,
	StatusOutput,
} from '@c15t/schema/types';

import { endpoints } from './contract';
import type {
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
import { decodeOptions } from './options';
import type { C15tCallOptions, C15tClientOptions } from './options';
import type { C15tResult } from './result';
import { send } from './transport';

/** `subjects` methods available without an API key. */
export interface C15tPublicSubjects {
	/**
	 * Reads a subject and its consents.
	 *
	 * @param id - Subject id, such as `sub_2jv6z8n4q9`.
	 * @param request - Optional filter by policy type.
	 */
	get: (
		id: string,
		request?: C15tGetSubjectRequest,
		options?: C15tCallOptions
	) => Promise<C15tResult<GetSubjectOutput, 'DATABASE_ERROR' | 'NOT_FOUND'>>;

	/**
	 * Records a consent, creating the subject if it does not exist.
	 * Retried submissions resolve to the same consent.
	 *
	 * @param input - The consent. `type` selects which fields apply.
	 */
	create: (
		input: C15tCreateSubjectInput,
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			PostSubjectOutput,
			| 'CHOICE_OUT_OF_SCOPE'
			| 'CHOICE_PREFERENCE_MISMATCH'
			| 'CONFLICT'
			| 'DATABASE_ERROR'
			| 'INPUT_VALIDATION_FAILED'
			| 'POLICY_SNAPSHOT_EXPIRED'
			| 'POLICY_SNAPSHOT_INVALID'
			| 'POLICY_SNAPSHOT_REQUIRED'
			| 'PURPOSE_NOT_ALLOWED'
			| 'STALE_POLICY'
			| 'SUBJECT_CONFLICT'
		>
	>;

	/**
	 * Links a subject to your own user id, so `consents.check` and
	 * `subjects.list` can find it. Call it after the visitor signs in.
	 *
	 * @param id - Subject id from the visitor's browser.
	 * @param input - Your user id and, optionally, who issued it.
	 */
	identify: (
		id: string,
		input: C15tIdentifySubjectInput,
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			PatchSubjectOutput,
			'DATABASE_ERROR' | 'EXTERNAL_ID_REQUIRED' | 'NOT_FOUND'
		>
	>;
}

/** `subjects` methods on a client with an API key. */
export interface C15tSubjects extends C15tPublicSubjects {
	/**
	 * Lists every subject linked to one of your user ids, with their consents.
	 * Needs an API key.
	 */
	list: (
		query: { readonly externalId: string },
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			ListSubjectsOutput,
			'DATABASE_ERROR' | 'EXTERNAL_ID_REQUIRED' | 'UNAUTHORIZED'
		>
	>;
}

/** `consents` methods. */
export interface C15tConsents {
	/**
	 * Reports whether a user has consented to each policy type. Every
	 * requested type appears in `results`, consented or not.
	 *
	 * @example
	 * ```ts
	 * const result = await c15t.consents.check({
	 *   externalId: user.id,
	 *   types: ['marketing_communications'],
	 * });
	 * if (result.ok && result.data.results.marketing_communications.hasConsent) {
	 *   await sendNewsletter(user);
	 * }
	 * ```
	 */
	check: <
		const Types extends readonly [ConsentPolicyType, ...ConsentPolicyType[]],
	>(
		input: C15tCheckConsentInput<Types>,
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			C15tCheckConsentOutput<Types[number]>,
			'DATABASE_ERROR' | 'EXTERNAL_ID_REQUIRED' | 'TYPE_REQUIRED'
		>
	>;
}

/** `experiments` methods. Need an API key. */
export interface C15tExperiments {
	/**
	 * Counts choices per arm of a banner experiment, by action and surface,
	 * with the median time to decision.
	 *
	 * @param id - Experiment id, as configured on the client.
	 */
	summary: (
		id: string,
		request?: C15tExperimentSummaryRequest,
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			ExperimentSummaryOutput,
			'DATABASE_ERROR' | 'INPUT_VALIDATION_FAILED' | 'UNAUTHORIZED'
		>
	>;
}

/** `legalDocuments` methods. Need an API key. */
export interface C15tLegalDocuments {
	/**
	 * Publishes a legal document release as the current version, so new
	 * consents record it. Call it from the job that ships the document.
	 *
	 * @param type - Document type, such as `privacy_policy` or
	 * `terms_and_conditions_b2b`.
	 */
	publish: (
		type: LegalDocumentPolicyType,
		input: C15tPublishLegalDocumentInput,
		options?: C15tCallOptions
	) => Promise<
		C15tResult<
			LegalDocumentCurrentOutput,
			'CONFLICT' | 'DATABASE_ERROR' | 'INPUT_VALIDATION_FAILED' | 'UNAUTHORIZED'
		>
	>;
}

/**
 * A client created without an API key: the routes the backend serves
 * without one.
 */
export interface C15tPublicClient {
	/** Backend version and the request context it saw. */
	status: (
		options?: C15tCallOptions
	) => Promise<C15tResult<StatusOutput, 'SERVICE_UNAVAILABLE'>>;

	/**
	 * Resolves the consent banner for a visitor: jurisdiction, translations,
	 * policies. Pass the visitor's context when calling from a server.
	 */
	init: (
		request?: C15tInitRequest,
		options?: C15tCallOptions
	) => Promise<C15tResult<InitOutput>>;

	/**
	 * Fetches the consent manifest, the cacheable configuration `init` is
	 * resolved from. Pass the `etag` you hold as `ifNoneMatch` to skip
	 * downloading an unchanged manifest.
	 */
	manifest: (
		request?: C15tManifestRequest,
		options?: C15tCallOptions
	) => Promise<C15tResult<C15tManifestResult>>;

	readonly subjects: C15tPublicSubjects;
	readonly consents: C15tConsents;
}

/** A client created with an API key. */
export interface C15tClient extends C15tPublicClient {
	readonly subjects: C15tSubjects;
	readonly experiments: C15tExperiments;
	readonly legalDocuments: C15tLegalDocuments;
}

/**
 * Creates a client for a hosted or self-hosted c15t backend.
 *
 * Methods resolve to `{ ok: true, data }` or `{ ok: false, error }` and never
 * reject. Methods that need an API key exist only on a client created with
 * one.
 *
 * @param options - Backend URL, optional API key, transport settings.
 * @returns A client. Its type depends on whether `apiKey` was passed.
 * @throws {C15tConfigurationError} When an option is invalid. Every problem
 * is reported at once.
 *
 * @example
 * ```ts
 * import { createC15tClient } from '@c15t/node-sdk';
 *
 * const c15t = createC15tClient({
 *   baseUrl: 'https://consent.example.com/api/c15t',
 *   apiKey: process.env.C15T_API_KEY!,
 * });
 *
 * const result = await c15t.subjects.list({ externalId: 'user_123' });
 * ```
 */
export function createC15tClient(
	options: C15tClientOptions & { readonly apiKey: string }
): C15tClient;
export function createC15tClient(
	options: C15tClientOptions & { readonly apiKey?: undefined }
): C15tPublicClient;
export function createC15tClient(
	options: C15tClientOptions
): C15tClient | C15tPublicClient;
export function createC15tClient(options: unknown): C15tClient {
	const resolved = decodeOptions(options);

	return {
		consents: {
			check: (input, callOptions) =>
				send(resolved, endpoints.checkConsent, input, callOptions) as never,
		},
		experiments: {
			summary: (id, request, callOptions) =>
				send(
					resolved,
					endpoints.experimentSummary,
					{ id, request },
					callOptions
				),
		},
		init: (request, callOptions) =>
			send(resolved, endpoints.init, request, callOptions),
		legalDocuments: {
			publish: (type, input, callOptions) =>
				send(
					resolved,
					endpoints.publishLegalDocument,
					{ input, type },
					callOptions
				),
		},
		manifest: (request, callOptions) =>
			send(resolved, endpoints.manifest, request, callOptions),
		status: (callOptions) =>
			send(resolved, endpoints.status, undefined, callOptions),
		subjects: {
			create: (input, callOptions) =>
				send(resolved, endpoints.createSubject, input, callOptions),
			get: (id, request, callOptions) =>
				send(resolved, endpoints.getSubject, { id, request }, callOptions),
			identify: (id, input, callOptions) =>
				send(resolved, endpoints.identifySubject, { id, input }, callOptions),
			list: (query, callOptions) =>
				send(resolved, endpoints.listSubjects, query, callOptions),
		},
	};
}
