/**
 * The endpoint table.
 *
 * Each entry pairs one backend route with everything the client needs to
 * call it: method, path template, auth, idempotency, input validation, the
 * error codes the route can return, and how to decode its success body. The
 * client, the mock client and the tests are all built from this table, so a
 * route is described once.
 */

import {
	checkConsentQuerySchema,
	experimentSummaryQuerySchema,
	legalDocumentCurrentInputSchema,
	legalDocumentCurrentParamsSchema,
	listSubjectsQuerySchema,
	patchSubjectInputSchema,
	postSubjectInputSchema,
} from '@c15t/schema';
import type {
	CheckConsentOutput,
	ConsentItem,
	ConsentManifest,
	ConsentPolicyType,
	ExperimentSummaryOutput,
	GetSubjectOutput,
	InitOutput,
	LegalDocumentCurrentOutput,
	LegalDocumentPolicyType,
	ListSubjectsOutput,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
	StatusOutput,
} from '@c15t/schema/types';

import type { C15tApiErrorCode, C15tIssue } from './errors';
import type { PathParams } from './path';

export type HttpMethod = 'GET' | 'PATCH' | 'POST' | 'PUT';

/** What an endpoint turns its input into before it is sent. */
export interface PreparedRequest<Path extends string> {
	readonly params: PathParams<Path>;
	readonly query?: Readonly<Record<string, string | undefined>>;
	readonly body?: unknown;
	readonly headers?: Readonly<Record<string, string>>;
}

/** One backend route, as the client calls it. */
export interface Endpoint<
	Path extends string,
	Input,
	Data,
	Code extends C15tApiErrorCode,
> {
	/** Method name on the client, such as `subjects.get`. */
	readonly name: string;
	readonly method: HttpMethod;
	readonly path: Path;
	/** `api-key` routes are refused with `MISSING_API_KEY` before sending. */
	readonly auth: 'api-key' | 'none';
	/**
	 * Whether repeating the request has the same effect as sending it once.
	 * Only idempotent endpoints are retried.
	 */
	readonly idempotent: boolean;
	/** Codes the route can put in `cause.code`. Others become `UNEXPECTED_RESPONSE`. */
	readonly errorCodes: readonly Code[];
	readonly validate: (input: Input) => Promise<readonly C15tIssue[]>;
	readonly prepare: (input: Input) => PreparedRequest<Path>;
	/** Statuses treated as success. Defaults to 200–299. */
	readonly accepts?: (status: number) => boolean;
	/**
	 * Turns a success body into `Data`. Throws when the body does not have the
	 * documented shape, which the client reports as `UNEXPECTED_RESPONSE`.
	 */
	readonly decode: (body: unknown, response: Response) => Data;
}

/** An endpoint of any shape, for code that handles them generically. */
export type AnyEndpoint = Endpoint<string, never, unknown, C15tApiErrorCode>;

const defineEndpoint = <
	const Path extends string,
	Input,
	Data,
	const Code extends C15tApiErrorCode = never,
>(
	endpoint: Endpoint<Path, Input, Data, Code>
): Endpoint<Path, Input, Data, Code> => endpoint;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** The part of the Standard Schema interface the client uses. */
interface StandardSchemaLike {
	readonly '~standard': {
		readonly validate: (
			value: unknown
		) => StandardResult | Promise<StandardResult>;
	};
}

interface StandardResult {
	readonly issues?: readonly {
		readonly message: string;
		readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[];
	}[];
}

/**
 * Validates a value against a `@c15t/schema` schema through its Standard
 * Schema interface, so no schema library is imported here.
 */
const checkSchema = async (
	schema: StandardSchemaLike,
	value: unknown,
	prefix: readonly PropertyKey[] = []
): Promise<readonly C15tIssue[]> => {
	const result = await schema['~standard'].validate(value);
	return (result.issues ?? []).map((issue) => ({
		message: issue.message,
		path: [
			...prefix,
			...(issue.path ?? []).map((segment) =>
				typeof segment === 'object' ? segment.key : segment
			),
		],
	}));
};

const requireText = (
	value: unknown,
	path: readonly PropertyKey[]
): readonly C15tIssue[] =>
	typeof value === 'string' && value.trim() !== ''
		? []
		: [{ message: 'Expected a non-empty string.', path }];

/**
 * A value filled into a `:param` path segment. URL resolution removes `.` and
 * `..` segments even when percent-encoded, so they would change the route.
 */
const requirePathSegment = (
	value: unknown,
	path: readonly PropertyKey[]
): readonly C15tIssue[] => {
	const issues = requireText(value, path);
	if (issues.length > 0) {
		return issues;
	}
	return value === '.' || value === '..'
		? [{ message: 'Expected an id, not a dot path segment.', path }]
		: [];
};

const optionalText = (
	value: unknown,
	path: readonly PropertyKey[]
): readonly C15tIssue[] =>
	value === undefined ? [] : requireText(value, path);

/**
 * Policy types travel comma-separated, so a type containing a comma would
 * silently become two.
 */
const checkTypeList = (
	value: unknown,
	path: readonly PropertyKey[],
	{ required }: { readonly required: boolean }
): readonly C15tIssue[] => {
	if (value === undefined && !required) {
		return [];
	}
	if (!Array.isArray(value) || (required && value.length === 0)) {
		return [
			{
				message: required
					? 'Expected a non-empty array of policy types.'
					: 'Expected an array of policy types.',
				path,
			},
		];
	}
	return value.flatMap((entry: unknown, index) =>
		typeof entry === 'string' && entry !== '' && !entry.includes(',')
			? []
			: [
					{
						message: 'Expected a policy type without commas.',
						path: [...path, index],
					},
				]
	);
};

/** `2026-09-30`, or a timestamp with a zone such as `2026-09-30T12:00:00Z`. */
const ISO_DATE_OR_TIMESTAMP =
	/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2}))?$/u;

/** Accepts a `Date` or a string and sends an ISO 8601 string. */
const toIsoString = (value: Date | string): string =>
	value instanceof Date ? value.toISOString() : value;

const checkDateLike = (
	value: unknown,
	path: readonly PropertyKey[],
	{ required }: { readonly required: boolean }
): readonly C15tIssue[] => {
	if (value === undefined && !required) {
		return [];
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime())
			? [{ message: 'Expected a valid Date.', path }]
			: [];
	}
	return typeof value === 'string' &&
		ISO_DATE_OR_TIMESTAMP.test(value) &&
		!Number.isNaN(Date.parse(value))
		? []
		: [{ message: 'Expected a Date or an ISO 8601 string.', path }];
};

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const requireObject = (
	value: unknown,
	path: readonly PropertyKey[]
): readonly C15tIssue[] =>
	isObject(value) ? [] : [{ message: 'Expected an object.', path }];

// ---------------------------------------------------------------------------
// Decoding
// ---------------------------------------------------------------------------

/** A success body without the documented shape. */
export class DecodeError extends Error {
	override readonly name = 'DecodeError';
}

const asObject = (
	value: unknown,
	field: string
): Readonly<Record<string, unknown>> => {
	if (!isObject(value)) {
		throw new DecodeError(`Expected ${field} to be an object.`);
	}
	return value;
};

const asArray = (value: unknown, field: string): readonly unknown[] => {
	if (!Array.isArray(value)) {
		throw new DecodeError(`Expected ${field} to be an array.`);
	}
	return value;
};

/**
 * The wire carries dates as ISO strings while `@c15t/schema` types them as
 * `Date`. Converting the documented fields makes those types true.
 */
const toDate = (value: unknown, field: string): Date => {
	if (typeof value === 'string' || typeof value === 'number') {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date;
		}
	}
	throw new DecodeError(`Expected ${field} to be a date.`);
};

const decodeConsentItem = (value: unknown, field: string): ConsentItem => {
	const item = asObject(value, field);
	const decoded: Record<string, unknown> = {
		...item,
		givenAt: toDate(item.givenAt, `${field}.givenAt`),
	};
	if (item.policyEffectiveDate === null) {
		delete decoded.policyEffectiveDate;
	} else if (item.policyEffectiveDate !== undefined) {
		decoded.policyEffectiveDate = toDate(
			item.policyEffectiveDate,
			`${field}.policyEffectiveDate`
		);
	}
	return decoded as ConsentItem;
};

const decodeConsents = (
	value: unknown,
	field: string
): readonly ConsentItem[] =>
	asArray(value, field).map((item, index) =>
		decodeConsentItem(item, `${field}[${index}]`)
	);

// ---------------------------------------------------------------------------
// Public input types
// ---------------------------------------------------------------------------

/** Request context for `init`, sent as the headers the backend reads. */
export interface C15tInitRequest {
	/** Language to resolve translations for. Sent as `Accept-Language`. */
	readonly language?: string;
	/** ISO 3166-1 alpha-2 country, such as `DE`. Overrides geolocation. */
	readonly country?: string;
	/** ISO 3166-2 subdivision, such as `BE`. Overrides geolocation. */
	readonly region?: string;
	/** The visitor's Global Privacy Control signal. */
	readonly gpc?: boolean;
}

/** Options for `manifest`. */
export interface C15tManifestRequest {
	/** Return only this language's translations. */
	readonly language?: string;
	/**
	 * The `etag` of a manifest you already hold. An unchanged manifest comes
	 * back as `{ status: 'not-modified' }` without a body.
	 */
	readonly ifNoneMatch?: string;
}

/** `manifest` result data. */
export type C15tManifestResult =
	| {
			readonly status: 'modified';
			readonly manifest: ConsentManifest;
			readonly etag: string | undefined;
	  }
	| { readonly status: 'not-modified'; readonly etag: string | undefined };

/** Options for `subjects.get`. */
export interface C15tGetSubjectRequest {
	/** Only return consents of these policy types. */
	readonly types?: readonly ConsentPolicyType[];
}

/**
 * Input for `subjects.create`: the `POST /subjects` body, except `givenAt`
 * also accepts a `Date`.
 */
export type C15tCreateSubjectInput = PostSubjectInput extends infer Variant
	? Variant extends PostSubjectInput
		? Omit<Variant, 'givenAt'> & {
				/** When consent was given: a `Date` or epoch milliseconds. */
				readonly givenAt: Date | number;
			}
		: never
	: never;

/** Input for `subjects.identify`. */
export type C15tIdentifySubjectInput = Omit<PatchSubjectFullInput, 'id'>;

/** Input for `consents.check`. */
export interface C15tCheckConsentInput<
	Types extends readonly ConsentPolicyType[],
> {
	/** Your user id, as linked with `subjects.identify`. */
	readonly externalId: string;
	/** Policy types to report. Every one appears in `results`. */
	readonly types: Types;
}

/** `consents.check` data, with one result per requested type. */
export interface C15tCheckConsentOutput<Type extends string> {
	readonly results: {
		readonly [Key in Type]: CheckConsentOutput['results'][string];
	};
}

/** Filters for `experiments.summary`. */
export interface C15tExperimentSummaryRequest {
	/** Only consents given at or after this instant. A date-only string means the start of that day, UTC. */
	readonly from?: Date | string;
	/** Only consents given at or before this instant. A date-only string means the end of that day, UTC. */
	readonly to?: Date | string;
	/** Only consents recorded for this domain. */
	readonly domain?: string;
}

/** Input for `legalDocuments.publish`. */
export interface C15tPublishLegalDocumentInput {
	/** Release identifier, such as `2026-01-01`. */
	readonly version: string;
	/** Content hash of the released document, such as `sha256:…`. */
	readonly hash: string;
	/** When this version takes effect. */
	readonly effectiveDate: Date | string;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const NO_ISSUES: readonly C15tIssue[] = [];
const noValidation = (): Promise<readonly C15tIssue[]> =>
	Promise.resolve(NO_ISSUES);

const status = defineEndpoint({
	auth: 'none',
	decode: (body): StatusOutput => {
		const value = asObject(body, 'body');
		return {
			...value,
			timestamp: toDate(value.timestamp, 'timestamp'),
		} as StatusOutput;
	},
	errorCodes: ['SERVICE_UNAVAILABLE'],
	idempotent: true,
	method: 'GET',
	name: 'status',
	path: '/status',
	prepare: (_input: undefined) => ({ params: {} }),
	validate: noValidation,
});

const init = defineEndpoint({
	auth: 'none',
	decode: (body): InitOutput => asObject(body, 'body') as InitOutput,
	errorCodes: [],
	idempotent: true,
	method: 'GET',
	name: 'init',
	path: '/init',
	prepare: (input: C15tInitRequest | undefined) => {
		const headers: Record<string, string> = {};
		if (input?.language !== undefined) {
			headers['accept-language'] = input.language;
		}
		if (input?.country !== undefined) {
			headers['x-c15t-country'] = input.country;
		}
		if (input?.region !== undefined) {
			headers['x-c15t-region'] = input.region;
		}
		if (input?.gpc !== undefined) {
			headers['x-c15t-gpc'] = input.gpc ? '1' : '0';
		}
		return { headers, params: {} };
	},
	validate: (input: C15tInitRequest | undefined) => {
		if (input === undefined) {
			return Promise.resolve(NO_ISSUES);
		}
		if (!isObject(input)) {
			return Promise.resolve(requireObject(input, []));
		}
		const issues = [
			...optionalText(input.language, ['language']),
			...optionalText(input.country, ['country']),
			...optionalText(input.region, ['region']),
			...(input.gpc === undefined || typeof input.gpc === 'boolean'
				? []
				: [{ message: 'Expected a boolean.', path: ['gpc'] }]),
		];
		return Promise.resolve(issues);
	},
});

const manifest = defineEndpoint({
	accepts: (code) => (code >= 200 && code < 300) || code === 304,
	auth: 'none',
	decode: (body, response): C15tManifestResult => {
		const etag = response.headers.get('etag') ?? undefined;
		if (response.status === 304) {
			return { etag, status: 'not-modified' };
		}
		return {
			etag,
			manifest: asObject(body, 'body') as unknown as ConsentManifest,
			status: 'modified',
		};
	},
	errorCodes: [],
	idempotent: true,
	method: 'GET',
	name: 'manifest',
	path: '/manifest',
	prepare: (input: C15tManifestRequest | undefined) => {
		const headers: Record<string, string> = {};
		if (input?.ifNoneMatch !== undefined) {
			headers['if-none-match'] = input.ifNoneMatch;
		}
		return { headers, params: {}, query: { language: input?.language } };
	},
	validate: (input: C15tManifestRequest | undefined) => {
		if (input === undefined) {
			return Promise.resolve(NO_ISSUES);
		}
		if (!isObject(input)) {
			return Promise.resolve(requireObject(input, []));
		}
		return Promise.resolve([
			...optionalText(input.language, ['language']),
			...optionalText(input.ifNoneMatch, ['ifNoneMatch']),
		]);
	},
});

interface GetSubjectEndpointInput {
	readonly id: string;
	readonly request: C15tGetSubjectRequest | undefined;
}

const getSubject = defineEndpoint({
	auth: 'none',
	decode: (body): GetSubjectOutput => {
		const value = asObject(body, 'body');
		const subject: Record<string, unknown> = {
			...asObject(value.subject, 'subject'),
		};
		if (subject.createdAt === null) {
			delete subject.createdAt;
		} else if (subject.createdAt !== undefined) {
			subject.createdAt = toDate(subject.createdAt, 'subject.createdAt');
		}
		return {
			...value,
			consents: decodeConsents(value.consents, 'consents'),
			subject,
		} as GetSubjectOutput;
	},
	errorCodes: ['DATABASE_ERROR', 'NOT_FOUND'],
	idempotent: true,
	method: 'GET',
	name: 'subjects.get',
	path: '/subjects/:id',
	prepare: (input: GetSubjectEndpointInput) => ({
		params: { id: input.id },
		query: { type: input.request?.types?.join(',') },
	}),
	validate: (input: GetSubjectEndpointInput) => {
		if (input.request !== undefined && !isObject(input.request)) {
			return Promise.resolve(requireObject(input.request, ['options']));
		}
		return Promise.resolve([
			...requirePathSegment(input.id, ['id']),
			...checkTypeList(input.request?.types, ['types'], { required: false }),
		]);
	},
});

const listSubjects = defineEndpoint({
	auth: 'api-key',
	decode: (body): ListSubjectsOutput => {
		const value = asObject(body, 'body');
		return {
			...value,
			subjects: asArray(value.subjects, 'subjects').map((entry, index) => {
				const subject = asObject(entry, `subjects[${index}]`);
				return {
					...subject,
					consents: decodeConsents(
						subject.consents,
						`subjects[${index}].consents`
					),
					createdAt: toDate(subject.createdAt, `subjects[${index}].createdAt`),
				};
			}),
		} as ListSubjectsOutput;
	},
	errorCodes: ['DATABASE_ERROR', 'EXTERNAL_ID_REQUIRED', 'UNAUTHORIZED'],
	idempotent: true,
	method: 'GET',
	name: 'subjects.list',
	path: '/subjects',
	prepare: (input: { readonly externalId: string }) => ({
		params: {},
		query: { externalId: input.externalId },
	}),
	validate: async (input: { readonly externalId: string }) =>
		isObject(input)
			? [
					...requireText(input.externalId, ['externalId']),
					...(await checkSchema(listSubjectsQuerySchema, input)),
				]
			: requireObject(input, []),
});

/** `givenAt` travels as epoch milliseconds. */
const toWireSubject = (input: C15tCreateSubjectInput): PostSubjectInput =>
	({
		...input,
		givenAt:
			input.givenAt instanceof Date ? input.givenAt.getTime() : input.givenAt,
	}) as PostSubjectInput;

const createSubject = defineEndpoint({
	auth: 'none',
	decode: (body): PostSubjectOutput => {
		// The backend also sends `ok: true`, which would read as a second
		// success flag next to the result's own `ok`.
		const { ok: _ok, ...value } = asObject(body, 'body');
		return {
			...value,
			givenAt: toDate(value.givenAt, 'givenAt'),
		} as PostSubjectOutput;
	},
	errorCodes: [
		'CHOICE_OUT_OF_SCOPE',
		'CHOICE_PREFERENCE_MISMATCH',
		'CONFLICT',
		'DATABASE_ERROR',
		'INPUT_VALIDATION_FAILED',
		'POLICY_SNAPSHOT_EXPIRED',
		'POLICY_SNAPSHOT_INVALID',
		'POLICY_SNAPSHOT_REQUIRED',
		'PURPOSE_NOT_ALLOWED',
		'STALE_POLICY',
		'SUBJECT_CONFLICT',
	],
	// The backend records a consent idempotently on its data: a retried
	// submission resolves to the same subject and consent.
	idempotent: true,
	method: 'POST',
	name: 'subjects.create',
	path: '/subjects',
	prepare: (input: C15tCreateSubjectInput) => ({
		body: toWireSubject(input),
		params: {},
	}),
	validate: (input: C15tCreateSubjectInput) =>
		isObject(input)
			? checkSchema(postSubjectInputSchema, toWireSubject(input))
			: Promise.resolve(requireObject(input, [])),
});

interface IdentifySubjectEndpointInput {
	readonly id: string;
	readonly input: C15tIdentifySubjectInput;
}

const identifySubject = defineEndpoint({
	auth: 'none',
	decode: (body): PatchSubjectOutput => {
		const value = asObject(body, 'body');
		asObject(value.subject, 'subject');
		return value as PatchSubjectOutput;
	},
	errorCodes: ['DATABASE_ERROR', 'EXTERNAL_ID_REQUIRED', 'NOT_FOUND'],
	// Linking the same external id again leaves the subject unchanged.
	idempotent: true,
	method: 'PATCH',
	name: 'subjects.identify',
	path: '/subjects/:id',
	prepare: (input: IdentifySubjectEndpointInput) => ({
		body: input.input,
		params: { id: input.id },
	}),
	validate: async (input: IdentifySubjectEndpointInput) => [
		...requirePathSegment(input.id, ['id']),
		...(isObject(input.input)
			? [
					...requireText(input.input.externalId, ['externalId']),
					...(await checkSchema(patchSubjectInputSchema, input.input)),
				]
			: requireObject(input.input, [])),
	],
});

const checkConsent = defineEndpoint({
	auth: 'none',
	decode: (body): CheckConsentOutput => {
		const value = asObject(body, 'body');
		asObject(value.results, 'results');
		return value as CheckConsentOutput;
	},
	errorCodes: ['DATABASE_ERROR', 'EXTERNAL_ID_REQUIRED', 'TYPE_REQUIRED'],
	idempotent: true,
	method: 'GET',
	name: 'consents.check',
	path: '/consents/check',
	prepare: (input: C15tCheckConsentInput<readonly ConsentPolicyType[]>) => ({
		params: {},
		query: { externalId: input.externalId, type: input.types.join(',') },
	}),
	validate: (input: C15tCheckConsentInput<readonly ConsentPolicyType[]>) => {
		if (!isObject(input)) {
			return Promise.resolve(requireObject(input, []));
		}
		const issues = [
			...requireText(input.externalId, ['externalId']),
			...checkTypeList(input.types, ['types'], { required: true }),
		];
		if (issues.length > 0) {
			return Promise.resolve(issues);
		}
		return checkSchema(checkConsentQuerySchema, {
			externalId: input.externalId,
			type: input.types.join(','),
		});
	},
});

interface ExperimentSummaryEndpointInput {
	readonly id: string;
	readonly request: C15tExperimentSummaryRequest | undefined;
}

const toSummaryQuery = (request: C15tExperimentSummaryRequest | undefined) => ({
	domain: request?.domain,
	from: request?.from === undefined ? undefined : toIsoString(request.from),
	to: request?.to === undefined ? undefined : toIsoString(request.to),
});

const experimentSummary = defineEndpoint({
	auth: 'api-key',
	decode: (body): ExperimentSummaryOutput => {
		const value = asObject(body, 'body');
		asArray(value.arms, 'arms');
		return value as ExperimentSummaryOutput;
	},
	errorCodes: ['DATABASE_ERROR', 'INPUT_VALIDATION_FAILED', 'UNAUTHORIZED'],
	idempotent: true,
	method: 'GET',
	name: 'experiments.summary',
	path: '/experiments/:id/summary',
	prepare: (input: ExperimentSummaryEndpointInput) => ({
		params: { id: input.id },
		query: toSummaryQuery(input.request),
	}),
	validate: (input: ExperimentSummaryEndpointInput) => {
		if (input.request !== undefined && !isObject(input.request)) {
			return Promise.resolve(requireObject(input.request, ['options']));
		}
		const issues = [
			...requirePathSegment(input.id, ['id']),
			...checkDateLike(input.request?.from, ['from'], { required: false }),
			...checkDateLike(input.request?.to, ['to'], { required: false }),
		];
		if (issues.length > 0) {
			return Promise.resolve(issues);
		}
		const query = Object.fromEntries(
			Object.entries(toSummaryQuery(input.request)).filter(
				([, value]) => value !== undefined
			)
		);
		return checkSchema(experimentSummaryQuerySchema, query);
	},
});

interface PublishLegalDocumentEndpointInput {
	readonly type: LegalDocumentPolicyType;
	readonly input: C15tPublishLegalDocumentInput;
}

const publishLegalDocument = defineEndpoint({
	auth: 'api-key',
	decode: (body): LegalDocumentCurrentOutput => {
		const value = asObject(body, 'body');
		const policy = asObject(value.policy, 'policy');
		return {
			...value,
			policy: {
				...policy,
				effectiveDate: toDate(policy.effectiveDate, 'policy.effectiveDate'),
			},
		} as LegalDocumentCurrentOutput;
	},
	errorCodes: [
		'CONFLICT',
		'DATABASE_ERROR',
		'INPUT_VALIDATION_FAILED',
		'UNAUTHORIZED',
	],
	// Publishing the same release twice leaves the current version unchanged.
	idempotent: true,
	method: 'PUT',
	name: 'legalDocuments.publish',
	path: '/legal-documents/:type/current',
	prepare: (input: PublishLegalDocumentEndpointInput) => ({
		body: {
			effectiveDate: toIsoString(input.input.effectiveDate),
			hash: input.input.hash,
			version: input.input.version,
		},
		params: { type: input.type },
	}),
	validate: async (input: PublishLegalDocumentEndpointInput) => {
		if (!isObject(input.input)) {
			return requireObject(input.input, []);
		}
		const dateIssues = checkDateLike(
			input.input.effectiveDate,
			['effectiveDate'],
			{ required: true }
		);
		return [
			...(await checkSchema(
				legalDocumentCurrentParamsSchema,
				{ type: input.type },
				[]
			)),
			...requireText(input.input.version, ['version']),
			...requireText(input.input.hash, ['hash']),
			...dateIssues,
			...(dateIssues.length > 0
				? []
				: await checkSchema(legalDocumentCurrentInputSchema, {
						effectiveDate: toIsoString(input.input.effectiveDate),
						hash: input.input.hash,
						version: input.input.version,
					})),
		];
	},
});

/** Every endpoint the client calls. */
export const endpoints = {
	checkConsent,
	createSubject,
	experimentSummary,
	getSubject,
	identifySubject,
	init,
	listSubjects,
	manifest,
	publishLegalDocument,
	status,
} as const;
