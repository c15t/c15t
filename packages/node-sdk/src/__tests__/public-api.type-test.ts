/**
 * Compile-time contract of the public API.
 *
 * Vitest does not check types, so this file runs through
 * `tsc -p tsconfig.type-tests.json`, which the package's `check-types` script
 * calls. The common path below uses no casts, explicit generic arguments or
 * `as const`: if a constraint stops narrowing, a negative case marked
 * `@ts-expect-error` fails the build instead of the API weakening quietly.
 */

import { expectTypeOf } from 'vitest';

import { C15tError, createC15tClient, isC15tError, unwrap } from '../index';
import type {
	C15tClient,
	C15tClientErrorCode,
	C15tDataOf,
	C15tErrorCodeOf,
	C15tPublicClient,
	ConsentCheckResult,
	GetSubjectOutput,
	StalePolicyReason,
} from '../index';
import type { PathParams } from '../path';
import { createMockC15tClient, err, ok } from '../testing';

// -- Client construction ------------------------------------------------------

const c15t = createC15tClient({
	apiKey: 'sk_live_123',
	baseUrl: 'https://consent.example.com/api/c15t',
});
expectTypeOf(c15t).toEqualTypeOf<C15tClient>();

const publicClient = createC15tClient({
	baseUrl: 'https://consent.example.com/api/c15t',
});
expectTypeOf(publicClient).toEqualTypeOf<C15tPublicClient>();

// Key-only methods are not on a client without a key.
// @ts-expect-error subjects.list needs an API key.
publicClient.subjects.list({ externalId: 'user_123' });
expectTypeOf(publicClient).not.toHaveProperty('consents');
expectTypeOf(publicClient).not.toHaveProperty('experiments');
expectTypeOf(publicClient).not.toHaveProperty('legalDocuments');

// A key that may be missing gives a client that may lack those methods.
declare const maybeKey: string | undefined;
const maybeKeyed = createC15tClient({
	apiKey: maybeKey,
	baseUrl: 'https://consent.example.com/api/c15t',
});
expectTypeOf(maybeKeyed).toEqualTypeOf<C15tClient | C15tPublicClient>();
// @ts-expect-error Narrow the key before calling key-only methods.
maybeKeyed.subjects.list({ externalId: 'user_123' });
// Methods both variants share stay callable.
maybeKeyed.subjects.get('sub_123');

// @ts-expect-error baseUrl is required.
createC15tClient({ apiKey: 'sk_live_123' });

createC15tClient({
	baseUrl: 'https://consent.example.com',
	// @ts-expect-error prefix was removed; put the path in baseUrl.
	prefix: '/api/c15t',
});

// -- Results ------------------------------------------------------------------

const subject = await c15t.subjects.get('sub_123');
if (subject.ok) {
	expectTypeOf(subject.data).toEqualTypeOf<GetSubjectOutput>();
	expectTypeOf(subject.requestId).toEqualTypeOf<string>();
	expectTypeOf(subject).not.toHaveProperty('error');
} else {
	expectTypeOf(subject.error.code).toEqualTypeOf<
		'DATABASE_ERROR' | 'NOT_FOUND' | C15tClientErrorCode
	>();
	expectTypeOf(subject).not.toHaveProperty('data');
}

// Dates in responses are Date objects.
if (subject.ok) {
	const [consent] = subject.data.consents;
	expectTypeOf(consent?.givenAt).toEqualTypeOf<Date | undefined>();
}

// Every method lists exactly the codes its endpoint can return.
expectTypeOf<C15tErrorCodeOf<typeof c15t.subjects.identify>>().toEqualTypeOf<
	| 'DATABASE_ERROR'
	| 'EXTERNAL_ID_REQUIRED'
	| 'IDENTITY_CONFLICT'
	| 'IDENTITY_TOKEN_INVALID'
	| 'NOT_FOUND'
	| C15tClientErrorCode
>();
expectTypeOf<C15tErrorCodeOf<typeof c15t.consents.check>>().toEqualTypeOf<
	| 'DATABASE_ERROR'
	| 'EXTERNAL_ID_REQUIRED'
	| 'TYPE_REQUIRED'
	| 'UNAUTHORIZED'
	| C15tClientErrorCode
>();
expectTypeOf<C15tErrorCodeOf<typeof c15t.subjects.list>>().toEqualTypeOf<
	| 'DATABASE_ERROR'
	| 'EXTERNAL_ID_REQUIRED'
	| 'UNAUTHORIZED'
	| C15tClientErrorCode
>();
expectTypeOf<
	C15tErrorCodeOf<typeof c15t.init>
>().toEqualTypeOf<C15tClientErrorCode>();
expectTypeOf<
	C15tDataOf<typeof c15t.subjects.get>
>().toEqualTypeOf<GetSubjectOutput>();

// `reason` exists only on STALE_POLICY.
const created = await c15t.subjects.create({
	domain: 'example.com',
	givenAt: new Date(),
	preferences: { measurement: true },
	subjectId: 'sub_123',
	type: 'cookie_banner',
});
if (!created.ok) {
	if (created.error.code === 'STALE_POLICY') {
		expectTypeOf(created.error.reason).toEqualTypeOf<
			StalePolicyReason | undefined
		>();
	}
	// @ts-expect-error subjects.create cannot return NOT_FOUND.
	if (created.error.code === 'NOT_FOUND') {
		// Unreachable.
	}
}

// givenAt takes a Date or epoch milliseconds, nothing else.
c15t.subjects.create({
	domain: 'example.com',
	givenAt: Date.now(),
	subjectId: 'sub_123',
	type: 'cookie_banner',
});
c15t.subjects.create({
	domain: 'example.com',
	// @ts-expect-error givenAt is a Date or a number.
	givenAt: '2026-01-01',
	subjectId: 'sub_123',
	type: 'cookie_banner',
});

// unwrap returns data and throws the narrowed error.
expectTypeOf(unwrap(subject)).toEqualTypeOf<GetSubjectOutput>();

// isC15tError narrows to the given codes.
declare const caught: unknown;
if (isC15tError(caught, 'NOT_FOUND', 'TIMEOUT')) {
	expectTypeOf(caught.code).toEqualTypeOf<'NOT_FOUND' | 'TIMEOUT'>();
}
if (isC15tError(caught)) {
	expectTypeOf(caught).toEqualTypeOf<C15tError>();
}
// @ts-expect-error Unknown codes are rejected.
isC15tError(caught, 'NOT_A_CODE');

// -- consents.check -----------------------------------------------------------

const check = await c15t.consents.check({
	externalId: 'user_123',
	types: ['marketing_communications', 'privacy_policy'],
});
if (check.ok) {
	expectTypeOf(check.data.results).toEqualTypeOf<{
		readonly marketing_communications: ConsentCheckResult;
		readonly privacy_policy: ConsentCheckResult;
	}>();
	// Only the requested types are in the results.
	expectTypeOf(check.data.results).not.toHaveProperty('dpa');
}

// Suffixed legal document types are policy types too.
const suffixed = await c15t.consents.check({
	externalId: 'user_123',
	types: ['terms_and_conditions_b2b'],
});
if (suffixed.ok) {
	expectTypeOf(
		suffixed.data.results.terms_and_conditions_b2b
	).toEqualTypeOf<ConsentCheckResult>();
}

// @ts-expect-error At least one type is required.
c15t.consents.check({ externalId: 'user_123', types: [] });
// @ts-expect-error Unknown policy types are rejected.
c15t.consents.check({ externalId: 'user_123', types: ['newsletter'] });

// -- Key-only methods ---------------------------------------------------------

c15t.experiments.summary('banner-copy', {
	from: new Date('2026-09-01'),
	to: '2026-09-30',
});
c15t.legalDocuments.publish('privacy_policy', {
	effectiveDate: new Date('2026-01-01'),
	hash: 'sha256:abc',
	version: '2026-01-01',
});
c15t.legalDocuments.publish(
	// @ts-expect-error Only legal document types can be published.
	'cookie_banner',
	{ effectiveDate: '2026-01-01', hash: 'sha256:abc', version: '1' }
);

// -- Call options -------------------------------------------------------------

c15t.status({
	requestId: 'req_123',
	retry: false,
	signal: AbortSignal.timeout(1000),
	timeoutMs: 2000,
});
// @ts-expect-error Unknown call options are rejected.
c15t.status({ throw: true });

// -- Paths --------------------------------------------------------------------

expectTypeOf<PathParams<'/experiments/:id/summary'>>().toEqualTypeOf<{
	readonly id: string;
}>();
expectTypeOf<PathParams<'/a/:first/b/:second'>>().toEqualTypeOf<{
	readonly first: string;
	readonly second: string;
}>();
expectTypeOf<PathParams<'/status'>>().toEqualTypeOf<Record<never, never>>();

// -- Mock client --------------------------------------------------------------

const mock = createMockC15tClient({
	consents: {
		check: ({ types }) =>
			ok({
				results: Object.fromEntries(
					types.map((type) => [
						type,
						{ hasConsent: true, isLatestPolicy: true },
					])
				),
			}),
	},
	subjects: {
		get: () => err('NOT_FOUND'),
		identify: (id, { externalId }) =>
			Promise.resolve(
				ok({ subject: { externalId, id, identityProvider: 'external' } })
			),
	},
});
expectTypeOf(mock).toEqualTypeOf<C15tClient>();

createMockC15tClient({
	subjects: {
		// @ts-expect-error subjects.get cannot return UNAUTHORIZED.
		get: () => err('UNAUTHORIZED'),
	},
});

createMockC15tClient({
	subjects: {
		// @ts-expect-error The data must match the method's data type.
		identify: () => ok({ subject: { id: 'sub_123' } }),
	},
});

err('STALE_POLICY', { reason: 'policy-changed' });
// @ts-expect-error reason only applies to STALE_POLICY.
err('NOT_FOUND', { reason: 'policy-changed' });

const knownReason = new C15tError({
	code: 'STALE_POLICY',
	message: 'stale',
	reason: 'policy-changed',
});
const unknownReason = new C15tError({
	code: 'STALE_POLICY',
	message: 'stale',
	// @ts-expect-error Only documented stale-policy reasons are accepted.
	reason: 'future-reason',
});

expectTypeOf(knownReason.reason).toEqualTypeOf<StalePolicyReason | undefined>();
expectTypeOf(unknownReason.reason).toEqualTypeOf<
	StalePolicyReason | undefined
>();
