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
