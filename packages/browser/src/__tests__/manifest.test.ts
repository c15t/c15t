import type { ConsentManifest } from '@c15t/schema/types';
import {
	createConsentManifestPolicyPack,
	policyRulePresets,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConsentClient } from '../client';
import { manifest, manifestNeedsLocation } from '../transports/manifest';
import type { ConsentClient } from '../types';

/** A query pair c15t adds to `/init`. */
const INIT_PAIR =
	/^(?:v|contract|country|region|gpc|experiment|journey|journeyScope|stored)=/u;

/** A request URL without the parameters a client adds to `/init`. */
const pathOf = (url: unknown): string => {
	const text = String(url);
	const [base = '', query] = text.split('?');
	if (query === undefined) {
		return text;
	}
	const pairs = query.split('&');
	const kept = pairs.filter((pair) => !INIT_PAIR.test(pair));
	if (kept.length === pairs.length) {
		return text;
	}
	return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
};

const clients: ConsentClient[] = [];

const clearCookies = function clearCookies(): void {
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
};

const everywhereManifest: ConsentManifest = {
	branding: 'c15t',
	policyPacks: [
		createConsentManifestPolicyPack({
			...policyRulePresets.europeOptIn(),
			id: 'everywhere',
			match: { isDefault: true },
		}),
	],
	revision: '1',
	schemaVersion: 2,
};

const geoManifest: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
	],
};

/**
 * Keyed by location, but every location gets the same opt-in banner: only
 * the policy ids differ.
 */
const sameBannerEverywhereManifest: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
		createConsentManifestPolicyPack({
			...policyRulePresets.europeOptIn(),
			id: 'world_opt_in',
			match: { isDefault: true },
		}),
	],
};

/**
 * The demo project's shape: a banner in Europe and Quebec (and for an
 * unknown location), none in California or anywhere else.
 */
const bannerSomewhereManifest: ConsentManifest = {
	...everywhereManifest,
	policyPacks: [
		createConsentManifestPolicyPack(policyRulePresets.europeOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
		createConsentManifestPolicyPack(policyRulePresets.californiaOptOut()),
		createConsentManifestPolicyPack(policyRulePresets.worldNone()),
	],
};

const initResponse = function initResponse(): Response {
	return new Response(
		JSON.stringify(
			resolveInitFromManifest(geoManifest, { country: 'DE', language: 'en' })
		),
		{ headers: { 'content-type': 'application/json' }, status: 200 }
	);
};

afterEach(() => {
	for (const client of clients.splice(0)) {
		client.dispose();
	}
	localStorage.clear();
	clearCookies();
	vi.restoreAllMocks();
});

describe('manifestNeedsLocation', () => {
	it('is false when every pack is a default, or there are none', () => {
		expect(manifestNeedsLocation(everywhereManifest)).toBe(false);
		expect(
			manifestNeedsLocation({ ...everywhereManifest, policyPacks: undefined })
		).toBe(false);
		expect(
			manifestNeedsLocation({ ...everywhereManifest, policyPacks: [] })
		).toBe(false);
	});

	it('is true for country packs', () => {
		expect(manifestNeedsLocation(geoManifest)).toBe(true);
	});

	it('is false when every location gets the same banner', () => {
		expect(manifestNeedsLocation(sameBannerEverywhereManifest)).toBe(false);
	});

	it('is true when some location gets a different banner or none', () => {
		expect(manifestNeedsLocation(bannerSomewhereManifest)).toBe(true);
		const [europe, quebec] = sameBannerEverywhereManifest.policyPacks ?? [];
		expect(
			manifestNeedsLocation({
				...sameBannerEverywhereManifest,
				policyPacks: [
					europe,
					quebec,
					createConsentManifestPolicyPack({
						...policyRulePresets.europeOptIn(),
						copyRevision: 'world-copy',
						id: 'world_opt_in',
						match: { isDefault: true },
					}),
				].filter((pack) => pack !== undefined),
			})
		).toBe(true);
	});

	it('is true when an unlisted location matches no pack', () => {
		const [europe, quebec] = sameBannerEverywhereManifest.policyPacks ?? [];
		expect(
			manifestNeedsLocation({
				...sameBannerEverywhereManifest,
				policyPacks: [europe, quebec].filter((pack) => pack !== undefined),
			})
		).toBe(true);
	});

	it('is true when a country with region packs and no region fails to match', () => {
		// Default but no fallback: a Canadian visitor without a province is
		// insufficient input, which shows no banner.
		expect(
			manifestNeedsLocation({
				...sameBannerEverywhereManifest,
				policyPacks: [
					createConsentManifestPolicyPack(policyRulePresets.quebecOptIn()),
					createConsentManifestPolicyPack({
						...policyRulePresets.quebecOptIn(),
						id: 'world_opt_in',
						match: { isDefault: true },
					}),
				],
			})
		).toBe(true);
	});
});

describe('manifest() first paint without a known location', () => {
	const isInit = (input: unknown): boolean =>
		pathOf(input).split('?')[0]?.endsWith('/init') === true;

	const start = function start(
		inlineManifest: ConsentManifest,
		fetchSpy: typeof fetch,
		overrides?: { language?: string }
	): ConsentClient {
		const client = createConsentClient({
			consentCategories: ['measurement'],
			mode: manifest({
				backendURL: 'https://example.test',
				fetch: fetchSpy,
				manifest: inlineManifest,
			}),
			overrides,
		});
		clients.push(client);
		client.start();
		return client;
	};

	it('shows the banner without /init when every location gets the same one', async () => {
		// An /init that never answers: the banner must not depend on it.
		const fetchSpy = vi.fn<typeof fetch>(
			() =>
				new Promise<Response>(() => {
					/* never settles */
				})
		);
		const client = start(sameBannerEverywhereManifest, fetchSpy);

		const snapshot = await client.ready();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.policyRule.model).toBe('opt-in');
	});

	it('binds the save to the policy an unknown location resolves to', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(new Response(JSON.stringify({ subjectId: 'sub_1' })))
		);
		const client = start(sameBannerEverywhereManifest, fetchSpy);
		await client.ready();
		await client.acceptAll();

		expect(fetchSpy).toHaveBeenCalledOnce();
		const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
		// The backend recomputes this decision from the asserted inputs, so
		// it must be what the same manifest gives a visitor with no location.
		const expected = resolveInitFromManifest(sameBannerEverywhereManifest, {
			country: null,
			region: null,
		}).policyResolution;
		expect(expected.status).toBe('matched');
		expect(body).toMatchObject({
			country: null,
			region: null,
			...(expected.status === 'matched' && {
				fingerprint: expected.fingerprints.policy,
				policyId: expected.policyId,
			}),
		});
	});

	it('waits for /init when some location gets a different banner or none', async () => {
		let answer: ((response: Response) => void) | undefined;
		const fetchSpy = vi.fn<typeof fetch>(
			() =>
				new Promise<Response>((resolve) => {
					answer = resolve;
				})
		);
		const client = start(bannerSomewhereManifest, fetchSpy);

		await vi.waitFor(() => {
			expect(fetchSpy).toHaveBeenCalledOnce();
		});
		expect(isInit(fetchSpy.mock.calls[0]?.[0])).toBe(true);
		expect(client.getSnapshot().policyPending).toBe(true);
		expect(client.getSnapshot().activeUI).toBe('none');

		answer?.(
			new Response(
				JSON.stringify(
					resolveInitFromManifest(bannerSomewhereManifest, {
						country: 'US',
						language: 'en',
						region: 'NY',
					})
				)
			)
		);
		const snapshot = await client.ready();
		// A New York visitor gets no banner: one shown from the bundle's
		// unknown-location rule would have had to disappear.
		expect(snapshot.activeUI).toBe('none');
		expect(snapshot.policyRule.id).toBe('world_none');
	});

	it('shows a returning visitor no banner and sends no /init', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(new Response(JSON.stringify({ subjectId: 'sub_1' })))
		);
		const first = start(sameBannerEverywhereManifest, fetchSpy);
		await first.ready();
		await first.acceptAll();
		first.dispose();
		fetchSpy.mockClear();

		const returning = start(sameBannerEverywhereManifest, fetchSpy);
		const snapshot = await returning.ready();

		expect(snapshot.activeUI).toBe('none');
		expect(snapshot.explicitChoice).not.toBeNull();
		expect(fetchSpy.mock.calls.some(([input]) => isInit(input))).toBe(false);
	});

	it('asks /init for a language the bundle cannot translate', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(
					JSON.stringify(
						resolveInitFromManifest(sameBannerEverywhereManifest, {
							country: 'DE',
							language: 'de',
						})
					)
				)
			)
		);
		const client = start(sameBannerEverywhereManifest, fetchSpy, {
			language: 'de',
		});
		await client.ready();

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(isInit(fetchSpy.mock.calls[0]?.[0])).toBe(true);
	});

	it('asks /init for an IAB policy', async () => {
		const iabManifest: ConsentManifest = {
			...everywhereManifest,
			iab: { enabled: true },
			policyPacks: [
				createConsentManifestPolicyPack(policyRulePresets.europeIab()),
				createConsentManifestPolicyPack({
					...policyRulePresets.europeIab(),
					id: 'world_iab',
					match: { isDefault: true },
				}),
			],
		};
		expect(manifestNeedsLocation(iabManifest)).toBe(false);
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		const client = start(iabManifest, fetchSpy);
		await client.ready();

		expect(isInit(fetchSpy.mock.calls[0]?.[0])).toBe(true);
	});
});

describe('manifest()', () => {
	it('sends the locally resolved policy assertion when saving', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify({ ok: true, subjectId: 'sub_browser1' }))
			)
		);
		const client = createConsentClient({
			consentCategories: ['measurement'],
			mode: manifest({
				backendURL: 'https://example.test',
				fetch: fetchSpy,
				manifest: everywhereManifest,
			}),
		});
		clients.push(client);
		client.start();
		await client.ready();
		await client.acceptAll();
		expect(fetchSpy).toHaveBeenCalledOnce();
		// Resolved in the browser: no /init or report named a journey, so the
		// save carries none.
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://example.test/subjects'
		);
		const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
		expect(body.policyId).toBe('everywhere');
		expect(body.fingerprint).toEqual(expect.any(String));
		expect(body.choice.categories.measurement.value).toBe(true);
	});

	it('resolves an unknown region through the backend even when the country is known', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		const client = createConsentClient({
			mode: manifest({
				backendURL: 'https://example.test',
				fetch: fetchSpy,
				manifest: {
					...geoManifest,
					policyPacks: [
						createConsentManifestPolicyPack(
							policyRulePresets.usPrivacyStatesOptOut()
						),
					],
				},
			}),
			overrides: { country: 'US' },
		});
		clients.push(client);
		client.start();
		await client.ready();
		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
	});
	it('throws without a manifest source', () => {
		expect(() => manifest({})).toThrow(/manifest/u);
	});

	it.each([
		'https://cdn.example.test/consent.json',
		'/consent.json',
		'https://cdn.example.test/manifest.json?revision=1',
		'https://manifest',
		'//manifest',
	])('requires a backend for non-endpoint manifest URL %s', (manifestURL) => {
		const fetchSpy = vi.fn<typeof fetch>();
		expect(() => manifest({ fetch: fetchSpy, manifestURL })).toThrow(
			/backendURL/u
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it.each([everywhereManifest, geoManifest])(
		'requires a backend for an inline-only manifest',
		(inlineManifest) => {
			expect(() => manifest({ manifest: inlineManifest })).toThrow(
				/backendURL/u
			);
		}
	);

	it('rejects an inferred manifest client before starting a runtime', () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		expect(() => createConsentClient({ manifest: everywhereManifest })).toThrow(
			/backendURL/u
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it.each(['', 'https://api.example.test/c15t/'])(
		'uses the explicit backend %j for CDN manifest geo and saves',
		async (backendURL) => {
			const manifestURL = 'https://cdn.example.test/consent.json';
			const expectedBackend = backendURL.replace(/\/$/u, '');
			const fetchSpy = vi.fn<typeof fetch>((input) => {
				const url = String(input);
				if (url === manifestURL) {
					return Promise.resolve(new Response(JSON.stringify(geoManifest)));
				}
				if (url.split('?')[0]?.endsWith('/init')) {
					return Promise.resolve(initResponse());
				}
				return Promise.resolve(
					new Response(JSON.stringify({ subjectId: 'sub_browser1' }))
				);
			});
			const client = createConsentClient({
				mode: manifest({ backendURL, fetch: fetchSpy, manifestURL }),
			});
			clients.push(client);
			client.start();
			await client.ready();
			await expect(client.acceptAll()).resolves.toMatchObject({ ok: true });
			expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
				manifestURL,
				`${expectedBackend}/init`,
				`${expectedBackend}/subjects`,
			]);
		}
	);

	it('honours an explicit same-origin backend with an inline manifest', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify({ subjectId: 'sub_browser1' }))
			)
		);
		const client = createConsentClient({
			mode: manifest({
				backendURL: '',
				fetch: fetchSpy,
				manifest: everywhereManifest,
			}),
		});
		clients.push(client);
		client.start();
		await client.ready();
		expect(fetchSpy).not.toHaveBeenCalled();
		await expect(client.acceptAll()).resolves.toMatchObject({ ok: true });
		expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
			'/subjects',
		]);
	});

	it('resolves an inline manifest with no request at all', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const client = createConsentClient(
			{
				consentCategories: ['measurement'],
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: everywhereManifest,
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.policyRule.id).toBe(
			everywhereManifest.policyPacks?.[0]?.rule.id
		);
		expect(snapshot.translations?.language).toBe('en');
	});

	it('falls back to GET /init when the policy needs a country it lacks', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve(initResponse()));
		const client = createConsentClient(
			{
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: geoManifest,
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toContain('/init');
		expect(snapshot.location?.countryCode).toBe('DE');
	});

	it('resolves locally when the country is already known', async () => {
		const fetchSpy = vi.fn<typeof fetch>();
		const client = createConsentClient(
			{
				mode: manifest({
					backendURL: 'https://x.c15t.dev',
					fetch: fetchSpy,
					manifest: geoManifest,
				}),
				overrides: { country: 'FR' },
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		const snapshot = await client.ready();

		expect(fetchSpy).not.toHaveBeenCalled();
		expect(snapshot.activeUI).toBe('banner');
		expect(snapshot.location?.countryCode).toBe('FR');
	});

	it.each([
		['/manifest', ''],
		['/consent/manifest/?language=en#policy', '/consent'],
		['./api/manifest', './api'],
		[
			'https://api.example.test/c15t/manifest?revision=1',
			'https://api.example.test/c15t',
		],
	])('derives the API endpoints from %s', async (manifestURL, backendURL) => {
		const fetchSpy = vi.fn<typeof fetch>((input) => {
			if (String(input) === manifestURL) {
				return Promise.resolve(new Response(JSON.stringify(geoManifest)));
			}
			if (String(input).split('?')[0]?.endsWith('/init')) {
				return Promise.resolve(initResponse());
			}
			return Promise.resolve(
				new Response(JSON.stringify({ subjectId: 'sub_browser1' }))
			);
		});
		const client = createConsentClient({
			mode: manifest({ fetch: fetchSpy, manifestURL }),
		});
		clients.push(client);
		client.start();
		const snapshot = await client.ready();
		await expect(client.acceptAll()).resolves.toMatchObject({ ok: true });
		expect(fetchSpy.mock.calls.map(([input]) => pathOf(input))).toEqual([
			manifestURL,
			`${backendURL}/init`,
			`${backendURL}/subjects`,
		]);
		expect(snapshot.location?.countryCode).toBe('DE');
	});

	it('fetches a manifest URL once and derives the backend from it', async () => {
		const fetchSpy = vi.fn<typeof fetch>(() =>
			Promise.resolve(
				new Response(JSON.stringify(everywhereManifest), {
					headers: { 'content-type': 'application/json' },
					status: 200,
				})
			)
		);
		const client = createConsentClient(
			{
				mode: manifest({
					fetch: fetchSpy,
					manifestURL: 'https://x.c15t.dev/manifest',
				}),
			},
			{ pkg: 'test' }
		);
		clients.push(client);
		client.start();

		await client.ready();
		// The current language is a no-op; another one resolves again.
		client.setLanguage('de');
		await vi.waitFor(() => {
			expect(client.getSnapshot().revision).toBeGreaterThan(1);
		});

		expect(fetchSpy).toHaveBeenCalledOnce();
		expect(pathOf(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://x.c15t.dev/manifest'
		);
	});
});
