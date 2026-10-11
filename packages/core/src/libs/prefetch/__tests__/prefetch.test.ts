/**
 * @vitest-environment jsdom
 */

import {
	INIT_EXPERIMENT_PARAM,
	parseExperimentHeader,
	readJourneyParams,
} from '@c15t/schema/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { corsPreflightReasons } from '../../../__tests__/fixtures/cors-safelist';
import {
	buildPrefetchScript,
	getMatchingPrefetchedInitialData,
	primePrefetchedInitialData,
} from '../prefetch';

describe('prefetch utilities', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		delete (window as Window & { __c15tInitialDataPromises?: unknown })
			.__c15tInitialDataPromises;
		delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
		delete (window as Window & { __c15tExperiment?: unknown }).__c15tExperiment;
		sessionStorage.clear();
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		{ backendURL: '/api/c15t/' },
		{ backendURL: 'https://consent.example.com', credentials: 'omit' as const },
		{
			backendURL: '/api/c15t',
			overrides: { country: 'DE', gpc: true, language: 'de', region: 'BE' },
		},
	])(
		'the inline script and primePrefetchedInitialData share one cache entry for %j',
		(options) => {
			const fetchSpy = vi
				.fn()
				.mockImplementation(() =>
					Promise.resolve(new Response('{}', { status: 200 }))
				);
			vi.stubGlobal('fetch', fetchSpy);
			window.eval(buildPrefetchScript(options));
			const entries = (
				window as Window & {
					__c15tInitialDataPromises?: Record<
						string,
						{ promise: Promise<unknown> }
					>;
				}
			).__c15tInitialDataPromises;
			const scripted = Object.values(entries ?? {})[0]?.promise;
			expect(scripted).toBeDefined();
			// The same key: priming finds the script's entry and fetches nothing.
			expect(primePrefetchedInitialData(options)).toBe(scripted);
			expect(fetchSpy).toHaveBeenCalledOnce();
			expect(Object.keys(entries ?? {})).toHaveLength(1);
		}
	);

	it('stores request-context metadata with canonical backend URL, credentials, and ambient GPC', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					branding: 'c15t',
					gvl: null,
					location: { countryCode: 'US', regionCode: 'CA' },
					translations: { language: 'de', translations: {} },
				}),
				{
					headers: {
						'content-type': 'application/json',
					},
					status: 200,
				}
			)
		);
		vi.stubGlobal('fetch', fetchMock);

		const result = primePrefetchedInitialData({
			backendURL: '/api/c15t/',
			credentials: 'same-origin',
			overrides: { language: 'de' },
		});

		await expect(result).resolves.toMatchObject({
			metadata: {
				requestContext: {
					backendURL: `${window.location.origin}/api/c15t`,
					country: null,
					credentials: 'same-origin',
					gpc: true,
					language: 'de',
					region: null,
				},
			},
		});
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(new URL(url).searchParams.get('v')).toEqual(expect.any(String));
		// A cross-origin backend answers this without a CORS preflight.
		expect(corsPreflightReasons(init)).toEqual([]);
		expect(init.headers).toEqual({ 'accept-language': 'de' });
	});

	it('sends the generated script as a CORS simple request', () => {
		const fetch = vi.fn(() => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', fetch);
		window.eval(
			buildPrefetchScript({
				backendURL: 'https://consent.example.com',
				overrides: { country: 'DE', gpc: false, language: 'de', region: 'BE' },
			})
		);
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(corsPreflightReasons(init)).toEqual([]);
		const query = new URL(url).searchParams;
		expect(query.get('v')).toEqual(expect.any(String));
		expect(query.get('contract')).toBe('1');
		expect(query.get('country')).toBe('DE');
		expect(query.get('region')).toBe('BE');
		expect(query.get('gpc')).toBe('0');
	});

	it('builds the same request as the runtime prefetch', () => {
		const fetch = vi.fn(() => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', fetch);
		const options = {
			backendURL: 'https://consent.example.com',
			journey: false as const,
			overrides: { country: 'DE', gpc: true, region: 'BE' },
		};
		window.eval(buildPrefetchScript(options));
		delete (window as Window & { __c15tInitialDataPromises?: unknown })
			.__c15tInitialDataPromises;
		void primePrefetchedInitialData(options);
		const [script, runtime] = fetch.mock.calls as unknown as [
			string,
			RequestInit,
		][];
		expect(script?.[0]).toBe(runtime?.[0]);
		expect(script?.[1].headers).toEqual(runtime?.[1].headers);
		expect(script?.[1].credentials).toBe('same-origin');
		expect(runtime?.[1].credentials).toBe('same-origin');
	});

	it('still starts the request after a server bundle rewrites `typeof window`', () => {
		const fetch = vi.fn(() => Promise.resolve(new Response('{}')));
		vi.stubGlobal('fetch', fetch);
		try {
			// Nitro's rollup replace: `typeof window` becomes `"undefined"` as
			// text, in string literals too, wherever c15t is bundled.
			const bundled = buildPrefetchScript({ backendURL: '/api/c15t' }).replace(
				/\btypeof window\b(?![.$])/gu,
				'"undefined"'
			);
			window.eval(bundled);
			expect(fetch).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('finds only exact runtime-context matches', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: false,
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						branding: 'c15t',
						gvl: null,
						location: { countryCode: 'DE', regionCode: 'BE' },
						translations: { language: 'de', translations: {} },
					}),
					{
						headers: {
							'content-type': 'application/json',
						},
						status: 200,
					}
				)
			)
		);

		const dePromise = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { country: 'DE' },
		});
		await dePromise;

		const frPromise = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { country: 'FR' },
		});
		await frPromise;

		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
				overrides: { country: 'DE' },
			})
		).toBe(dePromise);
		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
			})
		).toBeUndefined();
		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
				overrides: { country: 'GB' },
			})
		).toBeUndefined();
	});

	it('carries a GPC override in the script and matches it at runtime', () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: false,
		});
		const fetchSpy = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ branding: 'c15t' }), {
				headers: { 'content-type': 'application/json' },
				status: 200,
			})
		);
		vi.stubGlobal('fetch', fetchSpy);

		expect(
			buildPrefetchScript({ backendURL: '/api/c15t', overrides: { gpc: true } })
		).toContain('gpc=1');

		const primed = primePrefetchedInitialData({
			backendURL: '/api/c15t',
			overrides: { gpc: true },
		});
		const call = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(new URL(call[0]).searchParams.get('gpc')).toBe('1');
		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
				overrides: { gpc: true },
			})
		).toBe(primed);
		// The browser signal alone (false) must not pick up the override entry.
		expect(
			getMatchingPrefetchedInitialData({ backendURL: '/api/c15t' })
		).toBeUndefined();
	});

	it('does not reuse prefetched data when ambient GPC changes', async () => {
		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: false,
		});
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						branding: 'c15t',
						gvl: null,
						location: { countryCode: 'US', regionCode: 'CA' },
						translations: { language: 'en', translations: {} },
					}),
					{
						headers: {
							'content-type': 'application/json',
						},
						status: 200,
					}
				)
			)
		);

		await primePrefetchedInitialData({
			backendURL: '/api/c15t',
		});

		Object.defineProperty(window.navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});

		expect(
			getMatchingPrefetchedInitialData({
				backendURL: '/api/c15t',
			})
		).toBeUndefined();
	});

	describe('consent journey', () => {
		const sent = (fetch: ReturnType<typeof vi.fn>) =>
			readJourneyParams(String(fetch.mock.calls[0]?.[0]));
		const respond = () =>
			vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
				Promise.resolve(new Response('{}'))
			);

		it('the inline script starts a page journey and records it for the runtime', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			const journey = sent(fetch);
			expect(journey).toEqual({
				id: expect.stringMatching(/^[\da-f-]{36}$/u),
				scope: 'page',
				storedChoice: false,
			});
			expect(
				(window as Window & { __c15tJourney?: unknown }).__c15tJourney
			).toEqual(journey);
			// A page journey touches no storage.
			expect(sessionStorage.length).toBe(0);
		});

		it('says a choice is stored when the consent cookie exists', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			document.cookie = 'shop=c.necessary:1,c.marketing:0; path=/';
			try {
				window.eval(
					buildPrefetchScript({ backendURL: '/api/c15t', storageKey: 'shop' })
				);
				expect(sent(fetch)?.storedChoice).toBe(true);
			} finally {
				document.cookie = 'shop=; max-age=0; path=/';
			}
		});

		it('says an answer is stored when a notice dismissal exists', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			document.cookie = 'c15t-notice=v=1&t=1&f=abc; path=/';
			try {
				window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
				expect(sent(fetch)?.storedChoice).toBe(true);
				// The script's twin reads the same keys.
				delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
				void primePrefetchedInitialData({ backendURL: '/api/other' });
				expect(
					readJourneyParams(String(fetch.mock.calls[1]?.[0]))?.storedChoice
				).toBe(true);
			} finally {
				document.cookie = 'c15t-notice=; max-age=0; path=/';
			}
		});

		it('a tab journey continues the id in sessionStorage', () => {
			const id = '3b241101-e2bb-4255-8caf-4136c566a962';
			sessionStorage.setItem('c15t-journey-v1', id);
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({ backendURL: '/api/c15t', journey: 'tab' })
			);
			expect(sent(fetch)).toEqual({ id, scope: 'tab', storedChoice: false });
		});

		it('with no journey option, continues a tab journey this tab holds', () => {
			const id = '3b241101-e2bb-4255-8caf-4136c566a962';
			sessionStorage.setItem('c15t-journey-v1', id);
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			expect(sent(fetch)).toEqual({ id, scope: 'tab', storedChoice: false });
			// The script's twin makes the same call.
			delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
			void primePrefetchedInitialData({ backendURL: '/api/other' });
			expect(readJourneyParams(String(fetch.mock.calls[1]?.[0]))).toEqual({
				id,
				scope: 'tab',
				storedChoice: false,
			});
		});

		it('an explicit page journey ignores a tab id in sessionStorage', () => {
			sessionStorage.setItem(
				'c15t-journey-v1',
				'3b241101-e2bb-4255-8caf-4136c566a962'
			);
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({ backendURL: '/api/c15t', journey: 'page' })
			);
			expect(sent(fetch)?.scope).toBe('page');
			expect(sent(fetch)?.id).not.toBe('3b241101-e2bb-4255-8caf-4136c566a962');
		});

		it('a second script on the page shares the journey, and false sends none', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			window.eval(buildPrefetchScript({ backendURL: '/api/other' }));
			expect(readJourneyParams(String(fetch.mock.calls[1]?.[0]))?.id).toBe(
				sent(fetch)?.id
			);

			delete (window as Window & { __c15tJourney?: unknown }).__c15tJourney;
			window.eval(
				buildPrefetchScript({ backendURL: '/api/third', journey: false })
			);
			const third = new URL(String(fetch.mock.calls[2]?.[0]));
			expect(`${third.origin}${third.pathname}`).toBe(
				'http://localhost:3000/api/third/init'
			);
			expect(readJourneyParams(third)).toBeNull();
			expect([...third.searchParams.keys()]).toEqual(['v', 'contract']);
		});

		it('primePrefetchedInitialData sends the same journey as the script', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t' }));
			void primePrefetchedInitialData({ backendURL: '/api/other' });
			expect(readJourneyParams(String(fetch.mock.calls[1]?.[0]))?.id).toBe(
				sent(fetch)?.id
			);
		});
	});

	describe('banner experiment', () => {
		const experiment = {
			arms: {
				bar: { prompt: { variant: 'bar' as const } },
				floating: { prompt: { variant: 'floating' as const } },
			},
			id: 'banner-shape',
		};
		const respond = () =>
			vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
				Promise.resolve(new Response('{}'))
			);
		const sentArm = (fetch: ReturnType<typeof vi.fn>, call = 0) =>
			parseExperimentHeader(
				new URL(String(fetch.mock.calls[call]?.[0])).searchParams.get(
					INIT_EXPERIMENT_PARAM
				)
			);
		const early = () =>
			(window as Window & { __c15tExperiment?: unknown }).__c15tExperiment;
		const storeArm = (arm: string, id = 'banner-shape') =>
			localStorage.setItem('c15t-experiment-v1', JSON.stringify({ arm, id }));
		const resolved = async (backendURL: string) =>
			(await primePrefetchedInitialData({ backendURL }))?.metadata?.experiment;

		it('the inline script sends the arm this browser saw and records it for the runtime', async () => {
			storeArm('floating');
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t', experiment }));
			expect(sentArm(fetch)).toEqual({ arm: 'floating', id: 'banner-shape' });
			expect(early()).toEqual({ arm: 'floating', id: 'banner-shape' });
			expect(await resolved('/api/c15t')).toEqual({
				arm: 'floating',
				id: 'banner-shape',
			});
		});

		it('reads the arm from the cookie when localStorage has none', () => {
			document.cookie = `c15t-experiment-v1=${encodeURIComponent(
				JSON.stringify({ arm: 'bar', id: 'banner-shape' })
			)}; path=/`;
			try {
				const fetch = respond();
				vi.stubGlobal('fetch', fetch);
				window.eval(
					buildPrefetchScript({ backendURL: '/api/c15t', experiment })
				);
				expect(sentArm(fetch)?.arm).toBe('bar');
			} finally {
				document.cookie = 'c15t-experiment-v1=; max-age=0; path=/';
			}
		});

		it.each([
			[0.2, 'bar'],
			[0.7, 'floating'],
		])(
			'picks by the split for a new visitor (random %d), as the runtime does',
			(random, arm) => {
				vi.spyOn(Math, 'random').mockReturnValue(random);
				// An arm the browser saw for another experiment is not reused.
				storeArm('control', 'other-test');
				const split = { bar: 1, control: 0, floating: 3 };
				const fetch = respond();
				vi.stubGlobal('fetch', fetch);
				window.eval(
					buildPrefetchScript({
						backendURL: '/api/c15t',
						experiment: { ...experiment, split },
					})
				);
				expect(sentArm(fetch)?.arm).toBe(arm);
				// The script's twin picks the same arm from the same draw.
				delete (window as Window & { __c15tExperiment?: unknown })
					.__c15tExperiment;
				void primePrefetchedInitialData({
					backendURL: '/api/other',
					experiment: { ...experiment, split },
				});
				expect(sentArm(fetch, 1)?.arm).toBe(arm);
			}
		);

		it('sends a host arm as is', () => {
			storeArm('floating');
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({
					backendURL: '/api/c15t',
					experiment: { ...experiment, arm: 'bar' },
				})
			);
			expect(sentArm(fetch)?.arm).toBe('bar');
		});

		it('a second request on the page sends the arm the first one picked', () => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(buildPrefetchScript({ backendURL: '/api/c15t', experiment }));
			storeArm(sentArm(fetch)?.arm === 'bar' ? 'floating' : 'bar');
			void primePrefetchedInitialData({ backendURL: '/api/other', experiment });
			expect(sentArm(fetch, 1)).toEqual(sentArm(fetch));
		});

		it('sends no arm for a visitor who already chose, but still records one', async () => {
			storeArm('floating');
			document.cookie = 'c15t=c.necessary:1,c.marketing:0; path=/';
			try {
				const fetch = respond();
				vi.stubGlobal('fetch', fetch);
				window.eval(
					buildPrefetchScript({ backendURL: '/api/c15t', experiment })
				);
				expect(sentArm(fetch)).toBeNull();
				expect(early()).toEqual({ arm: 'floating', id: 'banner-shape' });
				expect(await resolved('/api/c15t')).toBeNull();
				void primePrefetchedInitialData({
					backendURL: '/api/other',
					experiment,
				});
				expect(sentArm(fetch, 1)).toBeNull();
			} finally {
				document.cookie = 'c15t=; max-age=0; path=/';
			}
		});

		it.each([
			['no experiment', undefined],
			['an invalid experiment', { ...experiment, arm: 'wall' }],
		])('sends no arm for %s', async (_label, option) => {
			const fetch = respond();
			vi.stubGlobal('fetch', fetch);
			window.eval(
				buildPrefetchScript({ backendURL: '/api/c15t', experiment: option })
			);
			expect(sentArm(fetch)).toBeNull();
			expect(early()).toBeUndefined();
			// Says it sent none, so a runtime running an arm fetches its own.
			expect(await resolved('/api/c15t')).toBeNull();
		});
	});
});
