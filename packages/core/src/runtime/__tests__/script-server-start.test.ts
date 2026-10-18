/**
 * @vitest-environment jsdom
 *
 * For a returning visitor the server render runs a granted script's setup
 * and inserts its element before hydration, unless the browser holds a
 * newer decision than the one the server read.
 */
import type { PolicyRule } from '@c15t/schema/types';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	choiceRecords,
	matchedResolution,
	NOW,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import type { Script } from '../../libs/script-loader/types';
import {
	encodeStoredConsentEnvelopeCompact,
	encodeStoredConsentEnvelopeJson,
	encodeVendorChoice,
} from '../../modules/persistence/writer/encode';
import { custom } from '../../transports/mode';
import { serverScriptStart } from '../script-server-start';
import type { RuntimePrefetch } from '../types';

type StartedWindow = Window & {
	__c15tSetup?: number;
	__c15tStarted?: Record<string, HTMLScriptElement>;
};

const CONFIRMED_AT = NOW - 1000;

const pixel: Script = {
	category: 'marketing',
	id: 'pixel',
	serverStart: () => ({
		code: 'window.__c15tSetup=(window.__c15tSetup||0)+1',
	}),
	src: 'https://cdn.example.com/pixel.js',
};

const mode = custom({ init: () => Promise.resolve({}) });

/** A prefetch under an opt-in policy, with the visitor's stored choice. */
const prefetchFor = function prefetchFor(
	values?: Parameters<typeof choiceRecords>[0],
	rule: Partial<PolicyRule> = {},
	extra: Partial<RuntimePrefetch> = {}
): RuntimePrefetch {
	const resolution = matchedResolution(optInRule(rule));
	return {
		initialPolicyResolution: resolution,
		initialRecords: values
			? choiceRecords(values, {
					confirmedAt: CONFIRMED_AT,
					fingerprint: resolution.fingerprints.choice,
				})
			: undefined,
		now: NOW,
		...extra,
	};
};

const run = function run(code: string | undefined): void {
	expect(code).toBeDefined();
	// oxlint-disable-next-line no-new-func -- Runs the generated inline script, as the page would.
	new Function(code ?? '')();
};

const clearCookies = function clearCookies(): void {
	for (const cookie of document.cookie.split(';')) {
		// oxlint-disable-next-line unicorn/no-document-cookie -- Clears the consent cookies between tests.
		document.cookie = `${cookie.split('=')[0]?.trim()}=; max-age=0; path=/`;
	}
};

afterEach(() => {
	vi.restoreAllMocks();
	const started = window as StartedWindow;
	delete started.__c15tSetup;
	delete started.__c15tStarted;
	localStorage.clear();
	clearCookies();
	document.head.innerHTML = '';
	document.body.innerHTML = '';
	vi.useRealTimers();
});

describe('serverScriptStart', () => {
	test('runs setup, then inserts the element for the loader to adopt', () => {
		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [{ ...pixel, attributes: { 'data-x': '1' } }],
			})
		);

		const started = window as StartedWindow;
		const element = started.__c15tStarted?.pixel;
		expect(started.__c15tSetup).toBe(1);
		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(element?.getAttribute('src')).toBe(pixel.src);
		expect(element?.getAttribute('data-x')).toBe('1');
		expect(element?.id).toBe('');
	});

	describe('with a priority image still loading', () => {
		const startWithHero = function startWithHero(): {
			element: HTMLScriptElement | undefined;
			hero: HTMLImageElement;
		} {
			const hero = document.createElement('img');
			hero.setAttribute('fetchpriority', 'high');
			hero.src = 'https://cdn.example.com/hero.jpg';
			document.body.append(hero);
			run(
				serverScriptStart({
					mode,
					prefetch: prefetchFor({ marketing: true }),
					scripts: [pixel],
				})
			);
			return { element: (window as StartedWindow).__c15tStarted?.pixel, hero };
		};

		test('runs setup and registers the element, but inserts it after the image loads', () => {
			const { element, hero } = startWithHero();

			expect((window as StartedWindow).__c15tSetup).toBe(1);
			expect(element?.isConnected).toBe(false);

			hero.dispatchEvent(new Event('load'));

			expect(element?.isConnected).toBe(true);
		});

		test('inserts the element when the image takes too long', () => {
			vi.useFakeTimers();
			const { element } = startWithHero();

			vi.advanceTimersByTime(2999);
			expect(element?.isConnected).toBe(false);
			vi.advanceTimersByTime(1);
			expect(element?.isConnected).toBe(true);
		});

		test('holds the element when a denial is stored before the image loads', () => {
			const { element, hero } = startWithHero();
			const { choice } = choiceRecords(
				{ marketing: false },
				{ confirmedAt: CONFIRMED_AT + 1 }
			);
			localStorage.setItem(
				'c15t',
				encodeStoredConsentEnvelopeJson({
					categories: choice?.categories ?? {},
					version: 3,
				})
			);

			hero.dispatchEvent(new Event('load'));

			expect(element?.isConnected).toBe(false);
			expect(element).toHaveProperty('__c15tHeld', true);
		});
	});

	test.each([
		['scripts that share a resourceKey', 'shared', 'b'],
		['a repeated script', undefined, 'pixel'],
	])('starts the resource once for %s', (_, resourceKey, secondId) => {
		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [
					{ ...pixel, resourceKey },
					{ ...pixel, id: secondId, resourceKey },
				],
			})
		);

		const started = window as StartedWindow;
		expect(started.__c15tSetup).toBe(1);
		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(Object.keys(started.__c15tStarted ?? {})).toEqual([
			resourceKey ?? 'pixel',
		]);
	});

	test('leaves a resource to its first script when that one has no serverStart', () => {
		const { serverStart: _, ...plain } = pixel;

		expect(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [
					{ ...plain, resourceKey: 'shared' },
					{ ...pixel, id: 'b', resourceKey: 'shared' },
				],
			})
		).toBeUndefined();
	});

	test('does nothing when the browser sends a GPC signal the server did not read', () => {
		const code = serverScriptStart({
			mode,
			prefetch: prefetchFor(
				{ marketing: true },
				{ privacySignals: { gpc: { denyCategories: ['marketing'] } } }
			),
			scripts: [pixel],
		});
		Object.defineProperty(navigator, 'globalPrivacyControl', {
			configurable: true,
			value: true,
		});
		try {
			run(code);
		} finally {
			Reflect.deleteProperty(navigator, 'globalPrivacyControl');
		}

		expect((window as StartedWindow).__c15tSetup).toBeUndefined();
		expect(document.head.querySelector('script')).toBeNull();
	});

	test('does nothing once the decision the server read has expired', () => {
		vi.useFakeTimers({ now: NOW });
		const code = serverScriptStart({
			mode,
			prefetch: prefetchFor(
				{ marketing: true },
				{ validity: { choiceDays: 1 } }
			),
			scripts: [pixel],
		});
		vi.setSystemTime(CONFIRMED_AT + 86_400_000);

		run(code);

		expect((window as StartedWindow).__c15tSetup).toBeUndefined();
		expect(document.head.querySelector('script')).toBeNull();
	});

	test('runs the shared prelude once', () => {
		const prelude = 'window.__c15tSetup=(window.__c15tSetup||0)+10';
		const withPrelude = (id: string): Script => ({
			...pixel,
			id,
			serverStart: () => ({ code: '', prelude }),
			src: `https://cdn.example.com/${id}.js`,
		});

		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [withPrelude('a'), withPrelude('b')],
			})
		);

		expect((window as StartedWindow).__c15tSetup).toBe(10);
		expect(document.head.querySelectorAll('script')).toHaveLength(2);
	});

	describe('with a localStorage copy', () => {
		/** The visitor's choice as the client writes it to localStorage. */
		const storeLocally = function storeLocally(
			values: Parameters<typeof choiceRecords>[0],
			confirmedAt: number,
			key = 'c15t'
		): void {
			const { choice } = choiceRecords(values, { confirmedAt });
			localStorage.setItem(
				key,
				encodeStoredConsentEnvelopeJson({
					categories: choice?.categories ?? {},
					version: 3,
				})
			);
		};

		const startPixel = function startPixel(
			prefetch = prefetchFor({ marketing: true }),
			extra: Partial<Parameters<typeof serverScriptStart>[0]> = {}
		): void {
			run(serverScriptStart({ mode, prefetch, scripts: [pixel], ...extra }));
		};

		test('starts when it holds the decision the server read', () => {
			storeLocally({ marketing: true }, CONFIRMED_AT);

			startPixel();

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
		});

		test('starts when it holds only an older denial', () => {
			storeLocally({ marketing: false }, CONFIRMED_AT - 1);

			startPixel();

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
		});

		test('does nothing when it holds a newer denial', () => {
			storeLocally({ marketing: false }, CONFIRMED_AT + 1);

			startPixel();

			expect((window as StartedWindow).__c15tSetup).toBeUndefined();
			expect(document.head.querySelector('script')).toBeNull();
		});

		test('does nothing for a denial from the same millisecond as the grant', () => {
			storeLocally({ marketing: false }, CONFIRMED_AT);

			startPixel();

			expect(document.head.querySelector('script')).toBeNull();
		});

		test("does nothing for a denial newer than its category's seed but older than another's", () => {
			const prefetch = prefetchFor({ marketing: true, measurement: true });
			const measurement =
				prefetch.initialRecords?.choice?.categories.measurement;
			if (measurement) {
				measurement.confirmedAt = CONFIRMED_AT + 10;
			}
			storeLocally({ marketing: false }, CONFIRMED_AT + 5);

			startPixel(prefetch);

			expect(document.head.querySelector('script')).toBeNull();
		});

		test('does nothing for a record in a format it does not read', () => {
			localStorage.setItem(
				'c15t',
				JSON.stringify({ consents: { marketing: false } })
			);

			startPixel();

			expect(document.head.querySelector('script')).toBeNull();
		});

		test.each([
			['storageConfig', { storageConfig: { storageKey: 'site-consent' } }],
			[
				'persistence.storageConfig',
				{
					persistence: { storageConfig: { storageKey: 'site-consent' } },
					storageConfig: { storageKey: 'ignored' },
				},
			],
		] as const)('reads the keys %s names', (_, extra) => {
			localStorage.setItem(
				'site-consent-vendors',
				encodeVendorChoice({
					confirmedAt: CONFIRMED_AT + 1,
					denied: ['pixel'],
					version: 1,
				})
			);

			startPixel(undefined, extra);

			expect(document.head.querySelector('script')).toBeNull();
		});
	});

	describe('with consent cookies', () => {
		const startPixel = function startPixel(): void {
			run(
				serverScriptStart({
					mode,
					prefetch: prefetchFor({ marketing: true }),
					scripts: [pixel],
				})
			);
		};

		test('does nothing when only the cookies hold a newer decision', () => {
			const { choice } = choiceRecords(
				{ marketing: false },
				{ confirmedAt: CONFIRMED_AT + 1 }
			);
			const consent = encodeStoredConsentEnvelopeCompact({
				categories: choice?.categories ?? {},
				version: 3,
			});
			// oxlint-disable-next-line unicorn/no-document-cookie -- Stores the record under test.
			document.cookie = `c15t=${consent}; path=/`;

			startPixel();

			expect(consent).toContain(`mk=0.${CONFIRMED_AT + 1}`);
			expect(document.head.querySelector('script')).toBeNull();
		});

		test.each([
			['a newer clear epoch', `c15t-epoch=${CONFIRMED_AT + 1}`],
			[
				'a newer, URI-encoded vendor choice',
				`c15t-vendors=${encodeURIComponent(`v=1&t=${CONFIRMED_AT + 1}&d=pixel`)}`,
			],
		])('does nothing for %s', (_, cookie) => {
			// oxlint-disable-next-line unicorn/no-document-cookie -- Stores the record under test.
			document.cookie = `${cookie}; path=/`;

			startPixel();

			expect(document.head.querySelector('script')).toBeNull();
		});

		test('starts when the cookies hold only older decisions', () => {
			// oxlint-disable-next-line unicorn/no-document-cookie -- Stores the record under test.
			document.cookie = `c15t-epoch=${CONFIRMED_AT - 1}; path=/`;
			// oxlint-disable-next-line unicorn/no-document-cookie -- An unrelated cookie with a newer time.
			document.cookie = `other=${CONFIRMED_AT + 1}; path=/`;

			startPixel();

			expect(document.head.querySelectorAll('script')).toHaveLength(1);
		});
	});

	test.each([
		["the inline script's nonce", undefined, 'page-nonce'],
		["its own nonce over the inline script's", 'script-nonce', 'script-nonce'],
	])('gives the element %s', (_, nonce, expected) => {
		vi.spyOn(document, 'currentScript', 'get').mockReturnValue(
			Object.assign(document.createElement('script'), { nonce: 'page-nonce' })
		);

		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [{ ...pixel, nonce }],
			})
		);

		expect((window as StartedWindow).__c15tStarted?.pixel?.nonce).toBe(
			expected
		);
	});

	test('starts an alwaysLoad script without consent after a denial', () => {
		const serverStart = vi.fn(() => ({ code: '' }));

		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: false }),
				scripts: [{ ...pixel, alwaysLoad: true, serverStart }],
			})
		);

		expect(serverStart).toHaveBeenCalledWith(
			expect.objectContaining({ hasConsent: false }),
			expect.objectContaining({ id: 'pixel' })
		);
		expect(
			(
				(window as StartedWindow).__c15tStarted?.pixel as
					| (HTMLScriptElement & { __c15tConsent?: boolean })
					| undefined
			)?.__c15tConsent
		).toBe(false);
	});

	test('skips a script whose setup throws and starts the rest', () => {
		run(
			serverScriptStart({
				mode,
				prefetch: prefetchFor({ marketing: true }),
				scripts: [
					{ ...pixel, id: 'broken', serverStart: () => ({ code: 'throw 1' }) },
					pixel,
				],
			})
		);

		expect(Object.keys((window as StartedWindow).__c15tStarted ?? {})).toEqual([
			'pixel',
		]);
	});

	test('keeps a src from closing the inline script', () => {
		const code = serverScriptStart({
			mode,
			prefetch: prefetchFor({ marketing: true }),
			scripts: [{ ...pixel, src: 'https://x.test/</script><b>.js' }],
		});

		expect(code).not.toContain('</script>');
	});

	describe('returns nothing', () => {
		test('before the visitor chooses', () => {
			expect(
				serverScriptStart({ mode, prefetch: prefetchFor(), scripts: [pixel] })
			).toBeUndefined();
		});

		// The banner is waiting for its first tap then; a script's first run
		// would hold the main thread and delay it.
		test('for an alwaysLoad script while the banner asks for a choice', () => {
			const serverStart = vi.fn(() => ({ code: '' }));

			expect(
				serverScriptStart({
					mode,
					prefetch: prefetchFor(),
					scripts: [{ ...pixel, alwaysLoad: true, serverStart }],
				})
			).toBeUndefined();
			expect(serverStart).not.toHaveBeenCalled();
		});

		test('when the visitor denied the category', () => {
			expect(
				serverScriptStart({
					mode,
					prefetch: prefetchFor({ marketing: false }),
					scripts: [pixel],
				})
			).toBeUndefined();
		});

		test('when the GPC signal the server read denies the grant', () => {
			expect(
				serverScriptStart({
					mode,
					prefetch: prefetchFor(
						{ marketing: true },
						{ privacySignals: { gpc: { denyCategories: ['marketing'] } } },
						{ initialPrivacySignals: { gpc: true } }
					),
					scripts: [pixel],
				})
			).toBeUndefined();
		});

		test('without a server-resolved policy', () => {
			expect(
				serverScriptStart({ mode, prefetch: { now: NOW }, scripts: [pixel] })
			).toBeUndefined();
		});

		test('when an external consent source owns consent', () => {
			expect(
				serverScriptStart({
					consentSource: {
						getPermissions: () => null,
						openPreferences: () => undefined,
						subscribe: () => () => undefined,
					},
					mode,
					prefetch: prefetchFor({ marketing: true }),
					scripts: [pixel],
				})
			).toBeUndefined();
		});

		test('for a script without serverStart', () => {
			expect(
				serverScriptStart({
					mode,
					prefetch: prefetchFor({ marketing: true }),
					scripts: [{ ...pixel, serverStart: undefined }],
				})
			).toBeUndefined();
		});

		test('when serverStart has no inline form', () => {
			expect(
				serverScriptStart({
					mode,
					prefetch: prefetchFor({ marketing: true }),
					scripts: [{ ...pixel, serverStart: () => undefined }],
				})
			).toBeUndefined();
		});
	});
});
