/**
 * `createConsentServer` binds one config and manifest source for the render
 * and the consent routes. The helpers it wraps are pinned in their own
 * suites; these check that both sides receive the same bound options.
 */
import { clearManifestCache } from '@c15t/core/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { defineConsentConfig } from '../config';
import type { ConsentConfig } from '../config';
import type { NodeApiResponseLike } from '../node-bridge';
import { createConsentServer as createPagesConsentServer } from '../pages';
import { createConsentServer } from '../server';
import type { NextRequestContext } from '../server';
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
			String(input).endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE)
				: new Response(null, { status: 202 })
		)
	);

beforeEach(() => {
	clearManifestCache();
});

describe('createConsentServer', () => {
	test('the render and the routes resolve from one snapshot without fetching policy', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const consent = createConsentServer({
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		});

		await Promise.all(
			[
				['DE', '', 'eu-opt-in'],
				['US', 'CA', 'us-ca-opt-out'],
			].map(async ([country = '', region = '', policyId]) => {
				const state = await consent.resolve({
					request: requestOf(country, region),
				});
				expect(state.initialPolicyResolution?.policy?.id).toBe(policyId);
				const init = await consent.handlers.GET(initRequest(country, region));
				expect(await init.json()).toMatchObject({
					policyResolution: { policyId },
				});
			})
		);
		const manifest = await consent.handlers.manifestGET(
			new Request('https://app.example.com/api/c15t/manifest')
		);
		expect(await manifest.json()).toEqual(MANIFEST_FIXTURE);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('a backendURL override sends both sides upstream past a same-origin rewrite', async () => {
		const fetch = upstream();
		const consent = createConsentServer({
			backendURL: 'https://consent.example.com',
			config: defineConsentConfig({
				backendURL: '/api/c15t',
				manifestURL: '/api/c15t/manifest',
			}),
			fetch,
			reportSessions: false,
		});

		await consent.resolve({ request: requestOf('DE') });
		await consent.handlers.manifestGET(
			new Request('https://app.example.com/api/c15t/manifest')
		);

		// Both read the same upstream entry in the process cache.
		expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
			'https://consent.example.com/manifest',
		]);
	});

	test('hands detached work from the render and the routes to waitUntil', async () => {
		const fetch = upstream();
		const tasks: Promise<void>[] = [];
		const consent = createConsentServer({
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			waitUntil: (task) => {
				tasks.push(task);
			},
		});

		await consent.resolve({ request: requestOf('DE') });
		await consent.handlers.GET(initRequest('DE'));
		await Promise.all(tasks);

		expect(tasks).toHaveLength(2);
		expect(
			fetch.mock.calls.filter(
				([input]) => String(input) === 'https://consent.example.com/sessions'
			)
		).toHaveLength(2);
	});

	test('rejects a config that did not come from defineConsentConfig', () => {
		expect(() =>
			createConsentServer({
				config: {
					backendURL: 'https://consent.example.com',
				} as ConsentConfig,
			})
		).toThrow(/defineConsentConfig/u);
	});
});

describe('Pages Router createConsentServer', () => {
	test('getServerSideProps and the API routes resolve from one snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>();
		const consent = createPagesConsentServer({
			config,
			fetch,
			manifest: MANIFEST_FIXTURE,
			reportSessions: false,
		});

		const state = await consent.resolve({
			req: {
				headers: {
					host: 'app.example.com',
					'x-vercel-ip-country': 'US',
					'x-vercel-ip-country-region': 'CA',
				},
			},
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
		await consent.handlers.init(
			{
				headers: {
					host: 'app.example.com',
					'x-vercel-ip-country': 'US',
					'x-vercel-ip-country-region': 'CA',
				},
				method: 'GET',
				url: '/api/c15t/init',
			},
			res
		);
		expect(res.statusCode).toBe(200);
		const body = new TextDecoder().decode(
			new Uint8Array(chunks.flatMap((chunk) => [...chunk]))
		);
		expect(JSON.parse(body)).toMatchObject({
			policyResolution: { policyId: 'us-ca-opt-out' },
		});
		expect(fetch).not.toHaveBeenCalled();
	});
});
