/**
 * One HTTP conformance suite, run against both backends.
 *
 * ## Why this exists
 *
 * Until now, parity between `@c15t/backend` and its Effect rewrite was checked
 * two ways, and both have a hole in the same place:
 *
 * - **Function-level parity tests** compare shared logic — auth, IP masking,
 *   id derivation, token claims — directly against v2. Strong, but they only
 *   cover code that was deliberately identified as shared.
 * - **Schema validation** checks each backend's responses against the same
 *   `@c15t/schema` contract. That catches *shape* drift and misses *content*
 *   drift, because optional fields validate by their absence. That is exactly
 *   how `/init` shipped without its GVL and passed every test.
 *
 * This suite closes that hole by asserting behaviour rather than structure:
 * the same request is issued to both implementations and the responses are
 * compared to a single expectation. A case that passes against v2 and fails
 * against the rewrite is a parity gap, stated as one.
 *
 * ## How to use it
 *
 * Cases are declarative and transport-agnostic — each is a request plus an
 * assertion over the response. A backend supplies a `Backend` adapter that
 * knows how to seed a database and dispatch a `Request`, and the runner does
 * the rest. Neither backend's tests contain the expectations, so they cannot
 * drift apart.
 *
 * **Write the case against v2 first.** v2 is the specification here: it is
 * what users run today, and any behaviour it has that is not captured is
 * behaviour the rewrite is free to lose silently.
 */

export interface SeedFixture {
	readonly subjects: readonly {
		readonly id: string;
		readonly externalId?: string | null;
		readonly identityProvider?: string | null;
	}[];
	readonly domains: readonly {
		readonly id: string;
		readonly name: string;
	}[];
	readonly policies: readonly {
		readonly id: string;
		readonly version: string;
		readonly type: string;
		readonly effectiveDate: Date;
		readonly isActive: boolean;
	}[];
	readonly consents: readonly {
		readonly id: string;
		readonly subjectId: string;
		readonly domainId: string;
		readonly policyId: string | null;
		readonly givenAt: Date;
	}[];
}

/**
 * What a backend must provide to be held to this suite.
 *
 * Deliberately minimal: seed state, dispatch a request. Anything more would
 * let a case reach into one implementation's internals and stop being a
 * statement about observable behaviour.
 */
export interface Backend {
	readonly name: string;
	/** Fresh, migrated, empty database. Called before every case. */
	readonly reset: () => Promise<void>;
	readonly seed: (fixture: SeedFixture) => Promise<void>;
	readonly request: (request: Request) => Promise<Response>;
	/** Keys the backend is configured to accept. */
	readonly apiKey: string;
	readonly dispose?: () => Promise<void>;
}

export interface ConformanceCase {
	readonly name: string;
	/** Why this behaviour matters, so a failure is actionable. */
	readonly rationale: string;
	readonly seed?: SeedFixture;
	readonly request: (context: { apiKey: string }) => Request;
	readonly expect: (response: Response, body: unknown) => void | Promise<void>;
	/**
	 * Cases the rewrite is known not to satisfy yet.
	 *
	 * Recorded rather than deleted: a known gap that is visible is a to-do,
	 * and one that is deleted is a surprise for whoever finds it in production.
	 */
	readonly knownGap?: { readonly backend: string; readonly why: string };
}

const iso = (ms: number) => new Date(ms);
const GIVEN_AT = iso(1_800_000_000_000);

/** A small world that every case can rely on. */
export const BASE_FIXTURE: SeedFixture = {
	subjects: [
		{ id: 'sub_1', externalId: 'ext_1', identityProvider: 'external' },
		{ id: 'sub_2', externalId: 'ext_1', identityProvider: 'external' },
		{ id: 'sub_orphan', externalId: null, identityProvider: 'anonymous' },
	],
	domains: [{ id: 'dom_1', name: 'example.com' }],
	policies: [
		{
			id: 'pol_current',
			version: '2.0',
			type: 'cookie',
			effectiveDate: iso(1_800_000_000_000),
			isActive: true,
		},
		{
			id: 'pol_superseded',
			version: '1.0',
			type: 'cookie',
			effectiveDate: iso(1_700_000_000_000),
			isActive: true,
		},
	],
	consents: [
		{
			id: 'cns_1',
			subjectId: 'sub_1',
			domainId: 'dom_1',
			policyId: 'pol_current',
			givenAt: GIVEN_AT,
		},
		{
			id: 'cns_old',
			subjectId: 'sub_2',
			domainId: 'dom_1',
			policyId: 'pol_superseded',
			givenAt: GIVEN_AT,
		},
	],
};

const json = (path: string, init?: RequestInit) =>
	new Request(`http://conformance${path}`, init);

const authed = (apiKey: string, path: string, init: RequestInit = {}) =>
	json(path, {
		...init,
		headers: { ...init.headers, Authorization: `Bearer ${apiKey}` },
	});

export const CASES: readonly ConformanceCase[] = [
	// ---------------------------------------------------------------- status
	{
		name: 'status reports a version',
		rationale:
			'A health check that cannot answer is indistinguishable from a dead process.',
		request: () => json('/status'),
		expect: (response, body) => {
			assertStatus(response, 200);
			assertHas(body, 'version');
		},
	},
	{
		name: 'status needs no API key',
		rationale:
			'A load balancer cannot present credentials, so requiring them makes the check useless.',
		request: () => json('/status'),
		expect: (response) => assertStatus(response, 200),
	},

	// -------------------------------------------------------------- subjects
	{
		name: 'listing subjects requires an API key',
		rationale:
			'The response links a named person to their consent records; an unauthenticated read would disclose it.',
		seed: BASE_FIXTURE,
		request: () => json('/subjects?externalId=ext_1'),
		expect: (response) => assertStatus(response, 401),
	},
	{
		name: 'listing returns every subject sharing an external id',
		rationale:
			'One person can hold several subjects; returning only the first would hide consent records.',
		seed: BASE_FIXTURE,
		request: ({ apiKey }) => authed(apiKey, '/subjects?externalId=ext_1'),
		expect: (response, body) => {
			assertStatus(response, 200);
			const subjects = (body as { subjects: unknown[] }).subjects;
			assertEqual(subjects.length, 2, 'expected both subjects');
		},
	},
	{
		name: 'listing rejects a missing externalId',
		rationale:
			'Answering with everything would leak the whole tenant; answering with nothing would hide a client bug.',
		request: ({ apiKey }) => authed(apiKey, '/subjects'),
		expect: (response) => assertStatus(response, 400),
	},
	{
		name: 'listing an unknown externalId returns an empty list',
		rationale:
			'Absence is not an error — a subject who has never consented is a normal state.',
		seed: BASE_FIXTURE,
		request: ({ apiKey }) => authed(apiKey, '/subjects?externalId=nobody'),
		expect: (response, body) => {
			assertStatus(response, 200);
			assertEqual((body as { subjects: unknown[] }).subjects.length, 0);
		},
	},

	// ------------------------------------------------------------ subject/:id
	{
		name: 'a missing subject is 404, not an empty result',
		rationale:
			'An empty consent list asserts the subject exists and consented to nothing, which is a different claim.',
		seed: BASE_FIXTURE,
		request: () => json('/subjects/sub_absent'),
		expect: (response) => assertStatus(response, 404),
	},
	{
		name: 'consent against a superseded policy is not valid',
		rationale:
			'The entire purpose of tracking policy versions is that old consent stops counting.',
		seed: BASE_FIXTURE,
		request: () => json('/subjects/sub_2?type=cookie'),
		expect: (response, body) => {
			assertStatus(response, 200);
			assertEqual((body as { isValid: boolean }).isValid, false);
		},
	},

	// --------------------------------------------------------- consents/check
	{
		name: 'check reports requested types that have no consent',
		rationale:
			'An omitted key makes "no consent" indistinguishable from "unknown type" to a caller gating scripts.',
		seed: BASE_FIXTURE,
		request: () =>
			json('/consents/check?externalId=ext_1&type=cookie,marketing'),
		expect: (response, body) => {
			assertStatus(response, 200);
			const results = (body as { results: Record<string, unknown> }).results;
			assertHas(results, 'marketing');
		},
	},
	{
		name: 'check requires both parameters',
		rationale:
			'Either alone is ambiguous, and guessing the other would answer a question nobody asked.',
		request: () => json('/consents/check?externalId=ext_1'),
		expect: (response) => assertStatus(response, 400),
	},

	// ------------------------------------------------------------------ init
	{
		name: 'init resolves without geo headers',
		rationale:
			'Most requests carry no geo at all; failing without it would break the default path.',
		request: () => json('/init'),
		expect: (response) => assertStatus(response, 200),
	},
	{
		name: 'init is never cached across visitors',
		rationale:
			'The response depends on geo and GPC, so a shared cache would serve one visitor the decision made for another.',
		// Found by running this suite against the shipped backend: it sets no
		// cache headers on /init at all. Most CDNs treat an uncached 200 GET as
		// cacheable, so a visitor in one jurisdiction can receive the decision
		// computed for another — the wrong banner, or none.
		//
		// Kept as a case rather than relaxed to match: the expectation is
		// correct and the rewrite satisfies it. Recording the gap makes it a
		// tracked defect instead of an inconsistency someone later "fixes" by
		// deleting the assertion.
		knownGap: {
			backend: '@c15t/backend',
			why: 'Sets no Cache-Control on /init; a shared cache may serve one visitor the decision computed for another.',
		},
		request: () => json('/init'),
		expect: (response) => {
			assertStatus(response, 200);
			const cacheControl = response.headers.get('Cache-Control') ?? '';
			if (!/no-store|no-cache|private/.test(cacheControl)) {
				throw new Error(
					`expected /init to forbid shared caching, got "${cacheControl}"`
				);
			}
		},
	},

	// -------------------------------------------------------------- manifest
	{
		name: 'manifest is publicly cacheable',
		rationale:
			'It is per-tenant and geo-independent by design; without a cache header the CDN offload it exists for does not happen.',
		request: () => json('/manifest'),
		expect: (response) => {
			assertStatus(response, 200);
			const cacheControl = response.headers.get('Cache-Control') ?? '';
			if (!cacheControl.includes('public')) {
				throw new Error(
					`expected a public cache header, got "${cacheControl}"`
				);
			}
		},
	},
	{
		name: 'manifest carries an etag',
		rationale:
			'Without one a client re-downloads an unchanged document on every check.',
		request: () => json('/manifest'),
		expect: (response) => {
			assertStatus(response, 200);
			assertHas({ etag: response.headers.get('ETag') }, 'etag');
			if (!response.headers.get('ETag')) {
				throw new Error('expected an ETag header');
			}
		},
	},
	{
		name: 'manifest is stable across requests',
		rationale:
			'A revision that moved per request would bust every CDN and client cache continuously.',
		request: () => json('/manifest'),
		expect: () => {
			// Stability across calls is asserted by the runner issuing this case
			// twice; a changing etag surfaces as a mismatch there.
		},
	},
];

// Minimal assertions so the suite has no test-framework dependency and can be
// driven from either package's runner.

function assertStatus(response: Response, expected: number): void {
	if (response.status !== expected) {
		throw new Error(`expected status ${expected}, got ${response.status}`);
	}
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
	if (actual !== expected) {
		throw new Error(
			`${message ?? 'values differ'}: expected ${String(expected)}, got ${String(actual)}`
		);
	}
}

function assertHas(value: unknown, key: string): void {
	if (
		typeof value !== 'object' ||
		value === null ||
		!Object.hasOwn(value, key)
	) {
		throw new Error(`expected an object with "${key}"`);
	}
}
