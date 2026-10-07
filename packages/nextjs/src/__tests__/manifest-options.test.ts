/**
 * One `ConsentManifestOptions` object drives both `resolveConsent` and the
 * route handlers. The helpers' own behaviour is pinned in their suites;
 * these check that the shared object reaches both sides the same way.
 */
import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createNextConsentRouteHandlers } from '../api';
import { defineConsentConfig } from '../config';
import type { NodeApiResponseLike } from '../node-bridge';
import {
	createPagesApiHandlers,
	resolveConsent as resolvePagesConsent,
} from '../pages';
import { resolveConsent } from '../server';
import type { ConsentManifestOptions, NextRequestContext } from '../server';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const config = defineConsentConfig({
	backendURL: 'https://consent.example.com',
	manifestURL: '/api/c15t/manifest',
});

const requestOf = (country: string, region = ''): NextRequestContext => ({
	cookies: () => ({ toString: () => '' }),
	headers: () =>
		new Headers({
			host: 'app.example.com',
			'x-vercel-ip-country': country,
			'x-vercel-ip-country-region': region,
		}),
});

const initRequest = (country: string, region = '') =>
	new Request('https://app.example.com/api/c15t/init', {
		headers: {
			'x-vercel-ip-country': country,
			'x-vercel-ip-country-region': region,
		},
	});

const upstream = () =>
	vi.fn<typeof globalThis.fetch>((input) =>
		Promise.resolve(
			/\/manifest(?:\.json)?$/u.test(String(input))
				? Response.json(MANIFEST_FIXTURE)
				: new Response(null, { status: 202 })
		)
	);

const urls = (fetch: ReturnType<typeof upstream>) =>
	fetch.mock.calls.map(([input]) => String(input));

beforeEach(() => {
	clearManifestCache();
});

describe('shared ConsentManifestOptions', () => {
	test('the render and the routes resolve from one snapshot without fetching policy', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const consentOptions = {
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		} satisfies ConsentManifestOptions;
		const { GET, manifestGET } = createNextConsentRouteHandlers(consentOptions);

		await Promise.all(
			[
				['DE', '', 'eu-opt-in'],
				['US', 'CA', 'us-ca-opt-out'],
			].map(async ([country = '', region = '', policyId]) => {
				const state = await resolveConsent({
					...consentOptions,
					request: requestOf(country, region),
				});
				expect(state.initialPolicyResolution?.policy?.id).toBe(policyId);
				const init = await GET(initRequest(country, region));
				expect(await init.json()).toMatchObject({
					policyResolution: { policyId },
				});
			})
		);
		const manifest = await manifestGET(
			new Request('https://app.example.com/api/c15t/manifest')
		);
		expect(await manifest.json()).toEqual(MANIFEST_FIXTURE);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('the route handlers report sessions to config.backendURL', async () => {
		const fetch = upstream();
		const tasks: Promise<void>[] = [];
		const { GET } = createNextConsentRouteHandlers({
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			onBackgroundRevalidate: (task) => {
				tasks.push(task);
			},
		});

		await GET(initRequest('DE'));
		await Promise.all(tasks);

		expect(urls(fetch)).toEqual(['https://consent.example.com/sessions']);
	});

	test('an explicit backendURL sends both sides upstream past a same-origin rewrite', async () => {
		const fetch = upstream();
		const consentOptions = {
			backendURL: 'https://consent.example.com',
			config: defineConsentConfig({
				backendURL: '/api/c15t',
				manifestURL: '/api/c15t/manifest',
			}),
			fetch,
			reportSessions: false,
		} satisfies ConsentManifestOptions;

		await resolveConsent({ ...consentOptions, request: requestOf('DE') });
		await createNextConsentRouteHandlers(consentOptions).manifestGET(
			new Request('https://app.example.com/api/c15t/manifest')
		);

		// Both read the same upstream entry in the process cache.
		expect(urls(fetch)).toEqual(['https://consent.example.com/manifest']);
	});

	test('an absolute config.manifestURL is the source on both sides', async () => {
		const fetch = upstream();
		const consentOptions = {
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
				manifestURL: 'https://cdn.example.com/manifest.json',
			}),
			fetch,
			reportSessions: false,
		} satisfies ConsentManifestOptions;

		await resolveConsent({ ...consentOptions, request: requestOf('DE') });
		await createNextConsentRouteHandlers(consentOptions).GET(initRequest('DE'));

		expect(urls(fetch)).toEqual(['https://cdn.example.com/manifest.json']);
	});
});

describe('shared ConsentManifestOptions in the Pages Router', () => {
	test('getServerSideProps and the API routes resolve from one snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const consentOptions = {
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		} satisfies ConsentManifestOptions;
		const headers = {
			host: 'app.example.com',
			'x-vercel-ip-country': 'US',
			'x-vercel-ip-country-region': 'CA',
		};

		const state = await resolvePagesConsent({
			...consentOptions,
			req: { headers },
		});
		expect(state.initialPolicyResolution?.policy?.id).toBe('us-ca-opt-out');

		const chunks: Uint8Array[] = [];
		const res: NodeApiResponseLike = {
			end(chunk) {
				if (chunk) {
					chunks.push(chunk);
				}
			},
			setHeader() {},
			statusCode: 0,
			write(chunk) {
				chunks.push(chunk);
			},
		};
		await createPagesApiHandlers(consentOptions).init(
			{ headers, method: 'GET', url: '/api/c15t/init' },
			res
		);
		const body = new TextDecoder().decode(
			new Uint8Array(chunks.flatMap((chunk) => [...chunk]))
		);
		expect(res.statusCode).toBe(200);
		expect(JSON.parse(body)).toMatchObject({
			policyResolution: { policyId: 'us-ca-opt-out' },
		});
		expect(fetch).not.toHaveBeenCalled();
	});
});
