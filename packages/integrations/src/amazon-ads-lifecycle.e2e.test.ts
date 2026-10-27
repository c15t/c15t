/** @vitest-environment jsdom */
import { createConsentKernel } from '@c15t/core';
import type { Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { deniedConsents, grantedMarketingConsents } from './e2e-test-utils';
import { amazonAdsTag } from './vendors/ads-and-pixels/amazon-ads';
import type {
	AmazonAdsConsent,
	AmazonAdsTagOptions,
} from './vendors/ads-and-pixels/amazon-ads';

const mainUrl = 'https://c.amazon-adsystem.com/aat/amzn.js';
const helperUrl = 'https://c.amazon-adsystem.com/aat/amzn-consent.js';
const tagId = '00000000-0000-0000-0000-000000000000';
const disposers: (() => void)[] = [];

afterEach(() => {
	for (const dispose of disposers.splice(0).reverse()) {
		dispose();
	}
	vi.restoreAllMocks();
	document.head.replaceChildren();
	document.body.replaceChildren();
	delete window.amzn;
	delete window.amznConsent;
	for (const cookie of document.cookie.split(';')) {
		document.cookie = `${cookie.split('=')[0]?.trim()}=; Max-Age=0; Path=/`;
	}
});

const mount = (script: Script, nonce?: string) => {
	const kernel = createConsentKernel();
	const loader = createScriptLoader({ kernel, nonce, scripts: [script] });
	disposers.push(kernel.dispose, loader.dispose);
	return { kernel, loader };
};

const findScript = (src: string): HTMLScriptElement => {
	const element = Array.from(document.scripts).find((node) => node.src === src);
	if (!element) {
		throw new Error(`Missing script: ${src}`);
	}
	return element;
};

const commands = () => window.amzn?.q?.map(([args]) => Array.from(args)) ?? [];

const expectedCommands = (options: Partial<AmazonAdsTagOptions> = {}) => [
	['setRegion', options.region ?? 'NA'],
	['addTag', tagId],
	...(options.trackPageView === false
		? []
		: [['trackEvent', 'PageView', options.pageViewAttributes ?? {}]]),
];

describe('amazonAdsTag production loader', () => {
	it.each([undefined, '   '])(
		'denies ACS when replacement removes countryCode with %j',
		async (countryCode) => {
			const consent = vi.fn();
			window.amznConsent = consent;
			const { kernel, loader } = mount(
				amazonAdsTag({ countryCode: 'DE', tagId })
			);
			await kernel.commands.save(grantedMarketingConsents);
			findScript(mainUrl).dispatchEvent(new Event('load'));
			consent.mockClear();
			loader.updateScripts([amazonAdsTag({ countryCode, tagId })]);
			expect(consent).toHaveBeenCalledExactlyOnceWith({
				countryCode: 'DE',
				enableAdStorage: false,
				enableUserData: false,
			});
		}
	);
	it.each(['before', 'after'])(
		'keeps ACS granted when a distinct owner disposes and ACS loads %s registration',
		async (timing) => {
			const consent = vi.fn();
			if (timing === 'before') {
				window.amznConsent = consent;
			}
			const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
			await first.kernel.commands.save(grantedMarketingConsents);
			const second = mount(
				amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId })
			);
			await second.kernel.commands.save(grantedMarketingConsents);
			if (timing === 'after') {
				window.amznConsent = consent;
				findScript(helperUrl).dispatchEvent(new Event('load'));
			}
			expect(consent).toHaveBeenLastCalledWith({
				countryCode: 'DE',
				enableAdStorage: true,
				enableUserData: true,
			});
			consent.mockClear();
			first.loader.dispose();
			expect(consent).not.toHaveBeenCalled();
			second.loader.dispose();
			expect(consent).toHaveBeenCalledExactlyOnceWith({
				countryCode: 'DE',
				enableAdStorage: false,
				enableUserData: false,
			});
		}
	);
	it('aggregates distinct owner withdrawal and regrant without retaining stale consent', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await first.kernel.commands.save(grantedMarketingConsents);
		const second = mount(
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId })
		);
		await second.kernel.commands.save(grantedMarketingConsents);
		consent.mockClear();
		await first.kernel.commands.save(deniedConsents);
		expect(consent).not.toHaveBeenCalled();
		await second.kernel.commands.save(deniedConsents);
		await first.kernel.commands.save(grantedMarketingConsents);
		expect(consent.mock.calls.map(([value]) => value.enableAdStorage)).toEqual([
			false,
			true,
		]);
	});
	it('drops ACS ownership on replacement while preserving a permitted distinct owner', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await first.kernel.commands.save(grantedMarketingConsents);
		const second = mount(
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId })
		);
		await second.kernel.commands.save(grantedMarketingConsents);
		consent.mockClear();
		first.loader.updateScripts([amazonAdsTag({ tagId })]);
		expect(consent).not.toHaveBeenCalled();
		second.loader.dispose();
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
	});
	it('does not let a denied distinct owner preserve the departing grant', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await first.kernel.commands.save(grantedMarketingConsents);
		const second = mount(
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId })
		);
		await second.kernel.commands.save(deniedConsents);
		consent.mockClear();
		first.loader.dispose();
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
	});
	it('preserves the replacement grant when another owner disposes during cleanup', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const script = amazonAdsTag({ countryCode: 'DE', tagId });
		const first = mount(script);
		await first.kernel.commands.save(grantedMarketingConsents);
		const second = mount(
			amazonAdsTag({ countryCode: 'DE', tagId, trackPageView: false })
		);
		await second.kernel.commands.save(grantedMarketingConsents);
		const original = script.onDispose;
		script.onDispose = (info) => {
			original?.(info);
			second.loader.dispose();
		};
		consent.mockClear();
		first.loader.updateScripts([
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId }),
		]);
		expect(consent).not.toHaveBeenCalled();
		first.loader.dispose();
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
	});
	it('creates no vendor globals, scripts or storage before marketing consent', async () => {
		const script = amazonAdsTag({ countryCode: 'DE', tagId });
		const append = vi.spyOn(document.head, 'appendChild');
		const writeStorage = vi.spyOn(Storage.prototype, 'setItem');
		const beforeCookies = document.cookie;
		const { kernel, loader } = mount(script);

		await kernel.commands.save(deniedConsents);
		await kernel.commands.save({ ...deniedConsents, measurement: true });

		expect(script.alwaysLoad).not.toBe(true);
		expect(script.src).toBe(mainUrl);
		expect(window.amzn).toBeUndefined();
		expect(window.amznConsent).toBeUndefined();
		expect(append).not.toHaveBeenCalled();
		expect(writeStorage).not.toHaveBeenCalled();
		expect(document.cookie).toBe(beforeCookies);
		expect(document.querySelectorAll('script, iframe, img, link')).toHaveLength(
			0
		);
		expect(loader.getLoadedScriptIds()).toEqual([]);
	});

	it('queues nested arguments and timestamps before the real main resource is appended', async () => {
		const pageViewAttributes = { currencyCode: 'EUR', value: 12 };
		const script = amazonAdsTag({
			pageViewAttributes,
			region: 'EU',
			tagId: ` ${tagId} `,
		});
		let atAppend: unknown;
		const append = document.head.appendChild.bind(document.head);
		vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
			if (node instanceof HTMLScriptElement && node.src === mainUrl) {
				atAppend = window.amzn?.q?.map(([args, timestamp]) => [
					Object.prototype.toString.call(args),
					Array.from(args),
					timestamp,
				]);
			}
			return append(node);
		});
		const { kernel } = mount(script);
		await kernel.commands.save(grantedMarketingConsents);

		expect(atAppend).toEqual(
			expectedCommands({ pageViewAttributes, region: 'EU' }).map((args) => [
				'[object Arguments]',
				args,
				expect.any(Number),
			])
		);
		expect(window.amzn?.version).toBe('0.0');
		expect(findScript(mainUrl).async).toBe(true);
		expect(document.scripts).toHaveLength(1);
		expect(window.amznConsent).toBeUndefined();
	});

	it('forwards ACS with the real country before initializing and preserves main load semantics', async () => {
		const calls: string[] = [];
		const commandsAtAppend: unknown[] = [];
		const consent = vi.fn((value: AmazonAdsConsent) => {
			calls.push(value.enableAdStorage ? 'grant' : 'deny');
		});
		const append = document.head.appendChild.bind(document.head);
		vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
			const appended = append(node);
			if (node instanceof HTMLScriptElement && node.src === helperUrl) {
				calls.push('helper');
				commandsAtAppend.push(commands());
				window.amznConsent = consent;
				node.dispatchEvent(new Event('load'));
			}
			if (node instanceof HTMLScriptElement && node.src === mainUrl) {
				calls.push('main');
				commandsAtAppend.push(commands());
			}
			return appended;
		});
		const loaded = vi.fn();
		const script = {
			...amazonAdsTag({
				countryCode: ' de ',
				gpp: 'existing-cmp-gpp-string',
				ipAddress: '192.0.2.1',
				tagId,
			}),
			onLoad: loaded,
		};
		const { kernel } = mount(script, 'amazon-test-nonce');
		await kernel.commands.save(grantedMarketingConsents);

		expect(calls).toEqual(['helper', 'grant', 'main']);
		expect(commandsAtAppend).toEqual([[], expectedCommands()]);
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: true,
			enableUserData: true,
			gpp: 'existing-cmp-gpp-string',
			ipAddress: '192.0.2.1',
		});
		expect(findScript(helperUrl).nonce).toBe('amazon-test-nonce');
		expect(findScript(helperUrl).async).toBe(false);
		expect(findScript(mainUrl).async).toBe(false);
		expect(loaded).not.toHaveBeenCalled();
		findScript(mainUrl).dispatchEvent(new Event('load'));
		expect(loaded).toHaveBeenCalledOnce();
		expect(loaded.mock.calls[0]?.[0]).toMatchObject({
			element: findScript(mainUrl),
			hasConsent: true,
		});
	});

	it('forwards denial when the in-flight helper finishes after withdrawal', async () => {
		const { kernel } = mount(amazonAdsTag({ countryCode: 'GB', tagId }));
		await kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		const main = findScript(mainUrl);
		const queue = window.amzn;
		expect(commands()).toEqual([]);

		await kernel.commands.save(deniedConsents);
		const consent = vi.fn();
		window.amznConsent = consent;
		helper.dispatchEvent(new Event('load'));
		main.dispatchEvent(new Event('load'));
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'GB',
			enableAdStorage: false,
			enableUserData: false,
		});
		expect(commands()).toEqual([]);

		await kernel.commands.save(grantedMarketingConsents);
		expect(consent).toHaveBeenLastCalledWith({
			countryCode: 'GB',
			enableAdStorage: true,
			enableUserData: true,
		});
		expect(window.amzn).toBe(queue);
		expect(commands()).toEqual(expectedCommands());
		expect(findScript(helperUrl)).toBe(helper);
		expect(findScript(mainUrl)).toBe(main);
		expect(document.scripts).toHaveLength(2);
	});

	it('uses the latest grant when permission changes twice during the same helper load', async () => {
		const { kernel } = mount(amazonAdsTag({ countryCode: 'JP', tagId }));
		await kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMarketingConsents);
		const consent = vi.fn();
		window.amznConsent = consent;
		helper.dispatchEvent(new Event('load'));

		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'JP',
			enableAdStorage: true,
			enableUserData: true,
		});
		expect(commands()).toEqual(expectedCommands());
		expect(document.scripts).toHaveLength(2);
	});

	it('cancels its pending commands even after the main load event, then restores the same queue on regrant', async () => {
		const script = amazonAdsTag({ tagId });
		const { kernel, loader } = mount(script);
		await kernel.commands.save(grantedMarketingConsents);
		const main = findScript(mainUrl);
		const queue = window.amzn;
		// amzn.js awaits country lookup before consuming the bootstrap queue.
		main.dispatchEvent(new Event('load'));
		expect(commands()).toEqual(expectedCommands());
		window.amzn?.('trackEvent', 'ApplicationQueuedEvent', {});
		await kernel.commands.save(deniedConsents);
		expect(commands()).toEqual([['trackEvent', 'ApplicationQueuedEvent', {}]]);

		await kernel.commands.save(grantedMarketingConsents);
		expect(window.amzn).toBe(queue);
		expect(commands()).toEqual([
			['trackEvent', 'ApplicationQueuedEvent', {}],
			...expectedCommands(),
		]);
		await kernel.commands.save({
			...grantedMarketingConsents,
			measurement: true,
		});
		loader.updateScripts([amazonAdsTag({ tagId })]);
		expect(commands()).toHaveLength(4);
		expect(findScript(mainUrl)).toBe(main);
		expect(document.scripts).toHaveLength(1);
	});

	it('updates ACS on revoke and regrant without repeating completed initialization or unrelated updates', async () => {
		const consent = vi.fn();
		const { kernel } = mount(amazonAdsTag({ countryCode: 'CA', tagId }));
		await kernel.commands.save(grantedMarketingConsents);
		window.amznConsent = consent;
		findScript(helperUrl).dispatchEvent(new Event('load'));
		const initialized = commands();
		const runtime = vi.fn();
		// The vendor consumes q and replaces the snippet function after startup.
		window.amzn = runtime;
		findScript(mainUrl).dispatchEvent(new Event('load'));
		await kernel.commands.save({
			...grantedMarketingConsents,
			measurement: true,
		});
		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMarketingConsents);

		expect(initialized).toEqual(expectedCommands());
		expect(consent.mock.calls.map(([value]) => value)).toEqual([
			{ countryCode: 'CA', enableAdStorage: true, enableUserData: true },
			{ countryCode: 'CA', enableAdStorage: false, enableUserData: false },
			{ countryCode: 'CA', enableAdStorage: true, enableUserData: true },
		]);
		expect(window.amzn).toBe(runtime);
		expect(runtime).not.toHaveBeenCalled();
		expect(document.scripts).toHaveLength(2);
	});

	it('withholds initialization if configured ACS fails, while main errors remain real load errors', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const failed = vi.fn();
		const script = {
			...amazonAdsTag({ countryCode: 'DE', tagId }),
			onError: failed,
		};
		const { kernel } = mount(script);
		await kernel.commands.save(grantedMarketingConsents);
		findScript(helperUrl).dispatchEvent(new Event('error'));
		expect(error).toHaveBeenCalledWith(
			expect.stringContaining('consent helper failed')
		);
		expect(commands()).toEqual([]);
		expect(failed).not.toHaveBeenCalled();
		findScript(mainUrl).dispatchEvent(new Event('error'));
		expect(failed).toHaveBeenCalledOnce();
		expect(failed.mock.calls[0]?.[0].error).toBeInstanceOf(Error);
		await kernel.commands.save(deniedConsents);
		await kernel.commands.save(grantedMarketingConsents);
		expect(commands()).toEqual([]);
		expect(document.scripts).toHaveLength(2);
	});

	it.each(['pending', 'loaded'] as const)(
		'removes its %s helper and listeners when the final owner disposes',
		async (state) => {
			const { kernel, loader } = mount(
				amazonAdsTag({ countryCode: 'DE', tagId })
			);
			await kernel.commands.save(grantedMarketingConsents);
			const helper = findScript(helperUrl);
			const main = findScript(mainUrl);
			const consent = vi.fn();
			if (state === 'loaded') {
				window.amznConsent = consent;
				helper.dispatchEvent(new Event('load'));
			}
			window.amzn?.('trackEvent', 'ApplicationQueuedEvent', {});
			loader.dispose();

			expect(helper.isConnected).toBe(false);
			expect(main.isConnected).toBe(false);
			expect(commands()).toEqual([
				['trackEvent', 'ApplicationQueuedEvent', {}],
			]);
			consent.mockClear();
			window.amznConsent = consent;
			const error = vi.spyOn(console, 'error').mockImplementation(() => {});
			helper.dispatchEvent(new Event('load'));
			helper.dispatchEvent(new Event('error'));
			expect(consent).not.toHaveBeenCalled();
			expect(error).not.toHaveBeenCalled();
		}
	);

	it('releases the helper even if the vendor throws during disposal', async () => {
		const { kernel, loader } = mount(
			amazonAdsTag({ countryCode: 'DE', tagId })
		);
		await kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		const consent = vi.fn();
		window.amznConsent = consent;
		helper.dispatchEvent(new Event('load'));
		consent.mockImplementation(() => {
			throw new Error('Vendor consent update failed');
		});
		loader.dispose();

		expect(helper.isConnected).toBe(false);
	});

	it.each(['pending', 'loaded'] as const)(
		'keeps a %s helper for a surviving equivalent owner',
		async (state) => {
			const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
			await first.kernel.commands.save(grantedMarketingConsents);
			const second = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
			await second.kernel.commands.save(grantedMarketingConsents);
			const helper = findScript(helperUrl);
			const consent = vi.fn();
			if (state === 'loaded') {
				window.amznConsent = consent;
				helper.dispatchEvent(new Event('load'));
			}
			consent.mockClear();
			first.loader.dispose();

			expect(findScript(helperUrl)).toBe(helper);
			expect(consent).not.toHaveBeenCalled();
			if (state === 'pending') {
				window.amznConsent = consent;
				helper.dispatchEvent(new Event('load'));
			}
			expect(consent.mock.calls).toEqual(
				state === 'pending'
					? [
							[
								{
									countryCode: 'DE',
									enableAdStorage: true,
									enableUserData: true,
								},
							],
						]
					: []
			);
			expect(commands()).toEqual(expectedCommands());
			second.loader.dispose();
			expect(helper.isConnected).toBe(false);
			expect(consent).toHaveBeenLastCalledWith({
				countryCode: 'DE',
				enableAdStorage: false,
				enableUserData: false,
			});
		}
	);

	describe.each<[string, Partial<AmazonAdsTagOptions>]>([
		['explicit default region', { region: 'NA' }],
		['another region', { region: 'EU' }],
		['disabled PageView', { trackPageView: false }],
		['another country and GPP', { countryCode: 'GB', gpp: 'existing-gpp' }],
		[
			'another helper URL',
			{ consentScriptUrl: 'https://tags.example.com/acs.js' },
		],
		['another main URL', { scriptUrl: 'https://tags.example.com/amazon.js' }],
	])('shared helper with %s', (_difference, options) => {
		it.each(['pending', 'loaded'] as const)(
			'keeps the %s element until its distinct borrower disposes',
			async (state) => {
				const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
				await first.kernel.commands.save(grantedMarketingConsents);
				const second = mount(
					amazonAdsTag({ countryCode: 'DE', tagId, ...options })
				);
				await second.kernel.commands.save(grantedMarketingConsents);
				const helper = findScript(helperUrl);
				expect(
					Array.from(document.scripts).filter((node) => node.id === helper.id)
				).toEqual([helper]);
				const consent = vi.fn();
				if (state === 'loaded') {
					window.amznConsent = consent;
					helper.dispatchEvent(new Event('load'));
				}
				first.loader.dispose();
				expect(helper.isConnected).toBe(true);
				expect(document.getElementById(helper.id)).toBe(helper);
				consent.mockClear();
				if (state === 'pending') {
					window.amznConsent = consent;
					helper.dispatchEvent(new Event('load'));
				}
				const expectedConsent: AmazonAdsConsent = {
					countryCode: options.countryCode ?? 'DE',
					enableAdStorage: true,
					enableUserData: true,
				};
				if (options.gpp !== undefined) {
					expectedConsent.gpp = options.gpp;
				}
				expect(consent.mock.calls).toEqual(
					state === 'pending' ? [[expectedConsent]] : []
				);
				expect(commands()).toEqual(expectedCommands(options));
				second.loader.dispose();
				expect(helper.isConnected).toBe(false);
				consent.mockClear();
				helper.dispatchEvent(new Event('load'));
				expect(consent).not.toHaveBeenCalled();
			}
		);
	});

	it('keeps ownership across equivalent registrations and distinct borrowers', async () => {
		const first = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await first.kernel.commands.save(grantedMarketingConsents);
		const equivalent = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await equivalent.kernel.commands.save(grantedMarketingConsents);
		const borrower = mount(
			amazonAdsTag({ countryCode: 'DE', region: 'NA', tagId })
		);
		await borrower.kernel.commands.save(grantedMarketingConsents);
		const last = mount(
			amazonAdsTag({ countryCode: 'DE', tagId, trackPageView: false })
		);
		await last.kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		borrower.loader.dispose();
		expect(helper.isConnected).toBe(true);
		first.loader.dispose();
		expect(helper.isConnected).toBe(true);
		equivalent.loader.dispose();
		expect(helper.isConnected).toBe(true);
		await last.kernel.commands.save(deniedConsents);
		const consent = vi.fn();
		window.amznConsent = consent;
		helper.dispatchEvent(new Event('load'));
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
		expect(commands()).toEqual([]);
		await last.kernel.commands.save(grantedMarketingConsents);
		expect(commands()).toEqual(expectedCommands({ trackPageView: false }));
		consent.mockImplementation(() => {
			throw new Error('Vendor denial failed');
		});
		last.loader.dispose();
		expect(helper.isConnected).toBe(false);
	});

	it('preserves ACS grants when replacing an already-loaded configuration', async () => {
		let permission: boolean | undefined;
		const consent = vi.fn((value: AmazonAdsConsent) => {
			permission = value.enableAdStorage;
		});
		window.amznConsent = consent;
		const { kernel, loader } = mount(
			amazonAdsTag({ countryCode: 'DE', tagId })
		);
		await kernel.commands.save(grantedMarketingConsents);
		findScript(mainUrl).dispatchEvent(new Event('load'));
		consent.mockClear();
		loader.updateScripts([
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId }),
		]);
		expect(consent).not.toHaveBeenCalled();
		expect(permission).toBe(true);
		await kernel.commands.save(deniedConsents);
		expect(consent).toHaveBeenLastCalledWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
		await kernel.commands.save(grantedMarketingConsents);
		loader.updateScripts([]);
		expect(consent).toHaveBeenLastCalledWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
	});
	it('forwards a queued real withdrawal during configuration replacement', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const script = amazonAdsTag({ countryCode: 'DE', tagId });
		const { kernel, loader } = mount(script);
		await kernel.commands.save(grantedMarketingConsents);
		const original = script.onConsentChange;
		let armed = true;
		script.onConsentChange = (info) => {
			original?.(info);
			if (armed && info.hasConsent) {
				armed = false;
				void kernel.commands.save(deniedConsents);
				loader.updateScripts([
					amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId }),
				]);
			}
		};
		consent.mockClear();
		await kernel.commands.save({
			...grantedMarketingConsents,
			measurement: true,
		});
		expect(armed).toBe(false);
		expect(consent).toHaveBeenCalledWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
		expect(
			consent.mock.calls.map(([value]) => value.enableAdStorage)
		).not.toContain(true);
	});
	it.each([false, true])(
		'uses the overridden category during replacement, measurement=%s',
		async (measurement) => {
			let permission: boolean | undefined;
			const consent = vi.fn((value: AmazonAdsConsent) => {
				permission = value.enableAdStorage;
			});
			window.amznConsent = consent;
			const script = {
				...amazonAdsTag({ countryCode: 'DE', tagId }),
				category: 'measurement',
			} satisfies Script;
			const { kernel, loader } = mount(script);
			await kernel.commands.save({ ...deniedConsents, measurement: true });
			findScript(mainUrl).dispatchEvent(new Event('load'));
			await kernel.commands.save({
				...deniedConsents,
				marketing: !measurement,
				measurement,
			});
			consent.mockClear();
			loader.updateScripts([
				{
					...amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId }),
					category: 'measurement',
				},
			]);
			expect(consent).not.toHaveBeenCalled();
			expect(permission).toBe(measurement);
		}
	);
	it('forwards denial when replacement selects a denied category', async () => {
		const consent = vi.fn();
		window.amznConsent = consent;
		const { kernel, loader } = mount({
			...amazonAdsTag({ countryCode: 'DE', tagId }),
			category: 'measurement',
		});
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		findScript(mainUrl).dispatchEvent(new Event('load'));
		consent.mockClear();
		loader.updateScripts([
			amazonAdsTag({ countryCode: 'DE', region: 'EU', tagId }),
		]);
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: false,
			enableUserData: false,
		});
	});
	it('replaces the helper with its same-ID configuration and ignores stale completion', async () => {
		const { kernel, loader } = mount(
			amazonAdsTag({ countryCode: 'DE', tagId })
		);
		await kernel.commands.save(grantedMarketingConsents);
		const oldHelper = findScript(helperUrl);
		const oldMain = findScript(mainUrl);
		const customHelper = 'https://tags.example.com/replacement-consent.js';
		loader.updateScripts([
			amazonAdsTag({
				consentScriptUrl: customHelper,
				countryCode: 'GB',
				region: 'EU',
				tagId,
			}),
		]);

		expect(oldHelper.isConnected).toBe(false);
		expect(oldMain.isConnected).toBe(false);
		const helper = findScript(customHelper);
		expect(helper.id).toBe(oldHelper.id);
		const consent = vi.fn();
		window.amznConsent = consent;
		oldHelper.dispatchEvent(new Event('load'));
		expect(consent).not.toHaveBeenCalled();
		expect(commands()).toEqual([]);
		helper.dispatchEvent(new Event('load'));
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'GB',
			enableAdStorage: true,
			enableUserData: true,
		});
		expect(commands()).toEqual(expectedCommands({ region: 'EU' }));
		oldHelper.dispatchEvent(new Event('error'));
		expect(consent).toHaveBeenCalledOnce();
	});

	it('ignores a pending helper from a disposed lifecycle after remount', async () => {
		const script = amazonAdsTag({ countryCode: 'DE', tagId });
		const first = mount(script);
		await first.kernel.commands.save(grantedMarketingConsents);
		const oldHelper = findScript(helperUrl);
		first.loader.dispose();
		const second = mount(script);
		await second.kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		const consent = vi.fn();
		window.amznConsent = consent;
		oldHelper.dispatchEvent(new Event('load'));

		expect(consent).not.toHaveBeenCalled();
		expect(commands()).toEqual([]);
		expect(helper).not.toBe(oldHelper);
		helper.dispatchEvent(new Event('load'));
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'DE',
			enableAdStorage: true,
			enableUserData: true,
		});
		expect(commands()).toEqual(expectedCommands());
	});

	it('preserves an external helper and removes only its own listeners', async () => {
		const external = document.createElement('script');
		external.id = 'c15t-script-external-amazon-consent';
		external.src = helperUrl;
		const externalLoaded = vi.fn();
		external.addEventListener('load', externalLoaded);
		document.head.appendChild(external);
		const { kernel, loader } = mount({
			...amazonAdsTag({ countryCode: 'DE', tagId }),
			anonymizeId: false,
			id: 'external-amazon',
		});
		await kernel.commands.save(grantedMarketingConsents);
		expect(document.scripts).toHaveLength(2);
		const borrower = mount({
			...amazonAdsTag({ countryCode: 'DE', region: 'NA', tagId }),
			anonymizeId: false,
			id: 'external-amazon',
		});
		await borrower.kernel.commands.save(grantedMarketingConsents);
		loader.dispose();
		expect(external.isConnected).toBe(true);
		borrower.loader.dispose();

		expect(external.isConnected).toBe(true);
		const consent = vi.fn();
		window.amznConsent = consent;
		external.dispatchEvent(new Event('load'));
		expect(externalLoaded).toHaveBeenCalledOnce();
		expect(consent).not.toHaveBeenCalled();
		expect(commands()).toEqual([]);
	});

	it('does not remove an unrelated element replacing its helper ID', async () => {
		const { kernel, loader } = mount(
			amazonAdsTag({ countryCode: 'DE', tagId })
		);
		await kernel.commands.save(grantedMarketingConsents);
		const helper = findScript(helperUrl);
		const unrelated = document.createElement('script');
		unrelated.id = helper.id;
		unrelated.src = 'https://tags.example.com/unrelated.js';
		helper.replaceWith(unrelated);
		const borrower = mount(
			amazonAdsTag({ countryCode: 'DE', region: 'NA', tagId })
		);
		await borrower.kernel.commands.save(grantedMarketingConsents);
		const loaded = vi.fn();
		unrelated.addEventListener('load', loaded);
		loader.dispose();
		expect(unrelated.isConnected).toBe(true);
		borrower.loader.dispose();

		expect(unrelated.isConnected).toBe(true);
		const consent = vi.fn();
		window.amznConsent = consent;
		unrelated.dispatchEvent(new Event('load'));
		expect(loaded).toHaveBeenCalledOnce();
		expect(consent).not.toHaveBeenCalled();
	});

	it('uses explicit URLs and skips ACS when country is absent instead of assuming US', async () => {
		const customMain = 'https://tags.example.com/amazon.js';
		const { kernel } = mount(
			amazonAdsTag({
				consentScriptUrl: 'https://tags.example.com/consent.js',
				countryCode: '   ',
				scriptUrl: ` ${customMain} `,
				tagId,
				trackPageView: false,
			})
		);
		await kernel.commands.save(grantedMarketingConsents);
		expect(findScript(customMain).src).toBe(customMain);
		expect(document.scripts).toHaveLength(1);
		expect(window.amznConsent).toBeUndefined();
		expect(commands()).toEqual(expectedCommands({ trackPageView: false }));
	});

	it('supports a consent category override without granting ACS from another category', async () => {
		const customHelper = 'https://tags.example.com/consent.js';
		const script = {
			...amazonAdsTag({
				consentScriptUrl: ` ${customHelper} `,
				countryCode: 'FR',
				tagId,
			}),
			category: 'measurement',
		} satisfies Script;
		const { kernel } = mount(script);
		await kernel.commands.save(grantedMarketingConsents);
		expect(document.scripts).toHaveLength(0);
		await kernel.commands.save({ ...deniedConsents, measurement: true });
		const consent = vi.fn();
		window.amznConsent = consent;
		findScript(customHelper).dispatchEvent(new Event('load'));
		expect(consent).toHaveBeenCalledExactlyOnceWith({
			countryCode: 'FR',
			enableAdStorage: true,
			enableUserData: true,
		});
	});

	it('keeps both loaders behind the Amazon vendor switch inside granted marketing', async () => {
		const { kernel } = mount(amazonAdsTag({ countryCode: 'DE', tagId }));
		await kernel.commands.save(grantedMarketingConsents, {
			vendors: { 'amazon-ads': false },
		});
		expect(document.scripts).toHaveLength(0);
		expect(window.amzn).toBeUndefined();
		await kernel.commands.save(grantedMarketingConsents, {
			vendors: { 'amazon-ads': true },
		});
		expect(findScript(helperUrl)).toBeDefined();
		expect(findScript(mainUrl)).toBeDefined();
	});

	it.each(['', ' \n '])(
		'skips a blank tag ID %j with a configuration error',
		async (value) => {
			const error = vi
				.spyOn(console, 'error')
				.mockImplementation(() => undefined);
			const { kernel } = mount(
				amazonAdsTag({ countryCode: 'DE', tagId: value })
			);
			await kernel.commands.save(grantedMarketingConsents);
			expect(error).toHaveBeenCalledExactlyOnceWith(
				'amazonAdsTag: missing or invalid tagId. The script will not load.'
			);
			expect(document.scripts).toHaveLength(0);
			expect(window.amzn).toBeUndefined();
			expect(window.amznConsent).toBeUndefined();
		}
	);
});
