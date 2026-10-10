/**
 * The catch-all consent route. Route behaviour itself is pinned in core's
 * consent-route suite; these check the Next.js wiring: catch-all params,
 * 404s, proxying, and the config.
 */
import { clearManifestCache } from '@c15t/core/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConsentRoute } from '../api';
import { defineConsentConfig } from '../config';
import { MANIFEST_FIXTURE } from './manifest-fixture';

const params = (...segments: string[]) => ({
	params: Promise.resolve({ c15t: segments }),
});

const upstream = () =>
	vi.fn<typeof globalThis.fetch>((input) =>
		Promise.resolve(
			String(input).endsWith('/manifest')
				? Response.json(MANIFEST_FIXTURE)
				: Response.json({ ok: true }, { status: 201 })
		)
	);

beforeEach(() => {
	clearManifestCache();
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('createConsentRoute', () => {
	test('serves manifest and init from the catch-all segment', async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
			reportSessions: false,
		});

		const manifest = await GET(
			new Request('https://app.example.com/api/c15t/manifest'),
			params('manifest')
		);
		expect(await manifest.json()).toEqual(MANIFEST_FIXTURE);

		const init = await GET(
			new Request('https://app.example.com/api/c15t/init', {
				headers: { 'x-vercel-ip-country': 'DE' },
			}),
			params('init')
		);
		expect(await init.json()).toMatchObject({
			policyResolution: { policyId: 'eu-opt-in', status: 'matched' },
		});
	});

	test('answers 404 for every other path without calling the backend', async () => {
		const fetch = upstream();
		const { GET } = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
		});

		const responses = await Promise.all(
			[['foo'], ['subjects'], ['manifest', 'extra']].map((segments) =>
				GET(
					new Request(`https://app.example.com/api/c15t/${segments.join('/')}`),
					params(...segments)
				)
			)
		);
		expect(responses.map((response) => response.status)).toEqual([
			404, 404, 404,
		]);
		expect(fetch).not.toHaveBeenCalled();
	});

	test('reads a config without fetching its own routes', async () => {
		const fetch = upstream();
		vi.stubGlobal('fetch', fetch);
		const { GET } = createConsentRoute({
			config: defineConsentConfig({
				backendURL: 'https://consent.example.com',
				routePrefix: '/api/c15t',
			}),
		});

		await GET(
			new Request('https://app.example.com/api/c15t/manifest'),
			params('manifest')
		);
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://consent.example.com/manifest'
		);
	});

	test('forwards consent writes when proxy is on', async () => {
		const fetch = upstream();
		const handlers = createConsentRoute({
			backendURL: 'https://consent.example.com',
			fetch,
			proxy: true,
		});

		const response = await handlers.POST(
			new Request('https://app.example.com/api/c15t/subjects', {
				body: '{}',
				headers: { 'content-type': 'application/json' },
				method: 'POST',
			}),
			params('subjects')
		);

		expect(response.status).toBe(201);
		expect(String(fetch.mock.calls[0]?.[0])).toBe(
			'https://consent.example.com/subjects'
		);
	});
});
