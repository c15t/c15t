/**
 * `GET /init` as a CORS simple request.
 *
 * A browser on another origin sends init with no custom header: the
 * version, policy contract, overrides and experiment arm travel as query
 * parameters, and the request carries no cookies. So `/init` answers every
 * origin with `Access-Control-Allow-Origin: *` and needs no preflight. Older
 * clients still send the same inputs as headers, with credentials, and a
 * trusted origin keeps its reflected, credentialed CORS. Consent saves and
 * every other route keep the allowlist.
 */

import { POLICY_CONTRACT_HEADER } from '@c15t/schema';
import { afterEach, assert, beforeEach, describe, it, vi } from 'vitest';

import { ENGINES } from '../__tests__/engines';
import { createHttpHarness } from '../__tests__/http-harness';
import type { HttpHarness } from '../__tests__/http-harness';

const [engine] = ENGINES;
if (!engine) {
	throw new Error('No test engine available');
}

const TRUSTED = 'https://app.example.com';
const UNTRUSTED = 'https://elsewhere.example';

const RULES = [
	{
		id: 'eu_opt_in',
		match: { countries: ['DE'] },
		model: 'opt-in' as const,
		prompt: 'choice' as const,
	},
	{
		id: 'ca_opt_out',
		match: { regions: [{ country: 'US', region: 'CA' }] },
		model: 'opt-out' as const,
		prompt: 'notice' as const,
	},
];

describe('/init query parameters', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest: { appName: 'Query', policyRules: RULES },
			trustedOrigins: [TRUSTED],
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	const resolution = async (path: string, headers?: Record<string, string>) =>
		(await harness.json('GET', path, undefined, headers)).body
			.policyResolution as {
			status: string;
			policyId?: string;
			reason?: string;
		};

	it('reads the country and region overrides from the query', async () => {
		assert.strictEqual(
			(await resolution('/init?contract=1&country=DE')).policyId,
			'eu_opt_in'
		);
		assert.strictEqual(
			(await resolution('/init?country=US&region=CA')).policyId,
			'ca_opt_out'
		);
	});

	it('still honors the legacy override headers', async () => {
		assert.strictEqual(
			(
				await resolution('/init', {
					[POLICY_CONTRACT_HEADER]: '1',
					'x-c15t-country': 'DE',
				})
			).policyId,
			'eu_opt_in'
		);
	});

	it('lets a query parameter win over the legacy header', async () => {
		assert.strictEqual(
			(
				await resolution('/init?country=US&region=CA', {
					'x-c15t-country': 'DE',
				})
			).policyId,
			'ca_opt_out'
		);
	});

	it('negotiates the contract a client declares in the query', async () => {
		// A missed parameter reads as a client that predates the contract and
		// silently turns negotiation off, so this must fail closed.
		assert.deepInclude(await resolution('/init?contract=2&country=DE'), {
			reason: 'unsupported-contract',
			status: 'failed',
		});
		assert.deepInclude(
			await resolution('/init', {
				[POLICY_CONTRACT_HEADER]: '2',
				'x-c15t-country': 'DE',
			}),
			{ reason: 'unsupported-contract', status: 'failed' }
		);
	});

	it('reads the GPC override from the query', async () => {
		const onReport = vi.fn();
		const reporting = harness.appWith({
			manifest: { appName: 'Query', policyRules: RULES },
			sessions: { onReport },
		});
		await reporting.request('/init?country=DE&gpc=1');
		// `gpc=0` beats the browser's own signal, as `x-c15t-gpc` did.
		await reporting.request('/init?country=DE&gpc=0', {
			headers: { 'sec-gpc': '1' },
		});
		await vi.waitFor(() => assert.strictEqual(onReport.mock.calls.length, 2));
		assert.deepStrictEqual(
			onReport.mock.calls.map(([report]) => report.gpc),
			[true, false]
		);
	});

	it('reports the experiment arm and version from the query', async () => {
		const onReport = vi.fn();
		const reporting = harness.appWith({
			manifest: { appName: 'Query', policyRules: RULES },
			sessions: { onReport },
		});
		const response = await reporting.request(
			'/init?v=3.1.0&contract=1&country=DE&experiment=banner%2520shape%3Dwall'
		);
		assert.strictEqual(response.status, 200);
		await vi.waitFor(() => assert.strictEqual(onReport.mock.calls.length, 1));
		const [report, context] = onReport.mock.calls[0] ?? [];
		assert.deepStrictEqual(report.experiment, {
			arm: 'wall',
			id: 'banner shape',
		});
		// The sink sees the inputs under their header names either way.
		assert.strictEqual(context.headers.get('x-c15t-version'), '3.1.0');
		assert.strictEqual(context.headers.get('x-c15t-country'), 'DE');
	});
});

describe('/init CORS', () => {
	let harness: HttpHarness;

	beforeEach(async () => {
		harness = await createHttpHarness(engine, {
			manifest: { appName: 'Cors', policyRules: RULES },
			trustedOrigins: [TRUSTED],
		});
	});

	afterEach(async () => {
		await harness.dispose();
	});

	it('answers any origin with `*`, no credentials, and the contract exposed', async () => {
		const response = await harness.app.request(
			'/init?v=3.1.0&contract=1&country=DE',
			{ headers: { Origin: UNTRUSTED } }
		);
		assert.strictEqual(response.status, 200);
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Origin'),
			'*'
		);
		assert.isNull(response.headers.get('Access-Control-Allow-Credentials'));
		assert.include(
			response.headers.get('Access-Control-Expose-Headers') ?? '',
			POLICY_CONTRACT_HEADER
		);
		assert.include(response.headers.get('Vary') ?? '', 'Origin');
	});

	it('opens even when no origin is configured', async () => {
		const closed = harness.appWith({
			manifest: { appName: 'Cors', policyRules: RULES },
		});
		const response = await closed.request('/init', {
			headers: { Origin: UNTRUSTED },
		});
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Origin'),
			'*'
		);
	});

	it('keeps reflected, credentialed CORS for a trusted origin', async () => {
		// Older clients send their init with `credentials: 'include'`, which a
		// browser refuses to read under `*`.
		const response = await harness.app.request('/init', {
			headers: { Origin: TRUSTED },
		});
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Origin'),
			TRUSTED
		);
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Credentials'),
			'true'
		);
	});

	it('still answers an older client preflight from any origin', async () => {
		const response = await harness.app.request('/init', {
			headers: {
				'Access-Control-Request-Headers': `x-c15t-version, ${POLICY_CONTRACT_HEADER}`,
				'Access-Control-Request-Method': 'GET',
				Origin: UNTRUSTED,
			},
			method: 'OPTIONS',
		});
		assert.strictEqual(response.status, 204);
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Origin'),
			'*'
		);
		assert.strictEqual(
			response.headers.get('Access-Control-Allow-Methods'),
			'GET, HEAD, OPTIONS'
		);
		assert.include(
			response.headers.get('Access-Control-Allow-Headers') ?? '',
			'x-c15t-version'
		);
	});

	it('keeps the allowlist on consent saves', async () => {
		const preflight = await harness.app.request('/subjects', {
			headers: {
				'Access-Control-Request-Headers': 'content-type',
				'Access-Control-Request-Method': 'POST',
				Origin: UNTRUSTED,
			},
			method: 'OPTIONS',
		});
		assert.strictEqual(preflight.status, 204);
		assert.isNull(preflight.headers.get('Access-Control-Allow-Origin'));
		assert.isNull(preflight.headers.get('Access-Control-Allow-Methods'));

		const save = await harness.app.request('/subjects', {
			body: '{}',
			headers: { Origin: UNTRUSTED, 'content-type': 'application/json' },
			method: 'POST',
		});
		assert.isNull(save.headers.get('Access-Control-Allow-Origin'));

		const trusted = await harness.app.request('/subjects', {
			headers: {
				'Access-Control-Request-Method': 'POST',
				Origin: TRUSTED,
			},
			method: 'OPTIONS',
		});
		assert.strictEqual(
			trusted.headers.get('Access-Control-Allow-Origin'),
			TRUSTED
		);
	});

	it('keeps the allowlist on other paths that end in init', async () => {
		const response = await harness.app.request('/subjects/init', {
			headers: { Origin: UNTRUSTED },
		});
		assert.isNull(response.headers.get('Access-Control-Allow-Origin'));
	});
});
