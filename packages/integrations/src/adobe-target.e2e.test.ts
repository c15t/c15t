/**
 * @vitest-environment jsdom
 */

import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	updateScripts,
} from './e2e-test-utils';
import { adobeTarget } from './vendors/functional/adobe-target';
import type { AdobeTargetOptions } from './vendors/functional/adobe-target';

type TargetWindow = Window & {
	alloy?: ((
		command: string,
		options?: Record<string, unknown>
	) => Promise<unknown>) & {
		q: unknown[];
	};
	__alloyNS?: string[];
	targetGlobalSettings?: Record<string, unknown>;
	adobe?: {
		OptInCategories: { TARGET: string };
		optIn: {
			approve: (category: string) => void;
			deny: (category: string) => void;
		};
	};
};

const webSdkOptions = {
	datastreamId: '00000000-0000-4000-8000-000000000000',
	mode: 'websdk',
	orgId: 'C15TFAKE@AdobeOrg',
	version: '2.30.0',
} as const;
const grantedExperience = { ...deniedConsents, experience: true };
const consent = (general: 'in' | 'out') => ({
	consent: [{ standard: 'Adobe', value: { general }, version: '1.0' }],
});

// Deterministic SDK contract double. This does not prove live Adobe behavior.
const activateAlloy = (configure?: Promise<unknown>) => {
	const stub = (window as TargetWindow).alloy;
	if (!stub) {
		throw new Error('Expected Adobe base code.');
	}
	const commands: unknown[][] = [];
	stub.q.push = (...entries: unknown[]) => {
		for (const entry of entries) {
			const [resolve, reject, args] = entry as [
				(value: unknown) => void,
				(reason: unknown) => void,
				unknown[],
			];
			commands.push(args);
			if (args[0] === 'configure' && configure) {
				void configure.then(resolve, reject);
			} else {
				resolve(undefined);
			}
		}
		return 0;
	};
	return { commands, stub };
};

const getLoader = function getLoader(): HTMLScriptElement {
	const element = document.head.querySelector('script');
	if (!element) {
		throw new Error('Expected an Adobe Target loader.');
	}
	return element;
};

describe('Adobe Target core-loader contracts', () => {
	registerVendorContractCleanup();
	afterEach(() => {
		vi.useRealTimers();
		const win = window as TargetWindow;
		delete win.alloy;
		delete win.__alloyNS;
		delete win.adobe;
		delete win.targetGlobalSettings;
	});

	it.each([
		{ mode: 'atjs', scriptUrl: '/scripts/at.js' },
		webSdkOptions,
	] satisfies AdobeTargetOptions[])(
		'creates no vendor globals, elements or storage before experience consent for %s',
		(options) => {
			const appended: string[] = [];
			installHeadProbe((node) => {
				appended.push(node.src);
			});
			const beforeCookies = document.cookie;
			const beforeLocalStorage = { ...localStorage };
			const beforeSessionStorage = { ...sessionStorage };
			const storageAccess = (
				['getItem', 'setItem', 'removeItem', 'clear'] as const
			).map((method) => vi.spyOn(Storage.prototype, method));
			const cookieWrite = vi.spyOn(document, 'cookie', 'set');
			const scripts = [adobeTarget(options)];
			loadScripts(scripts, deniedConsents);
			updateScripts(scripts, {
				...deniedConsents,
				marketing: true,
				measurement: true,
			});
			const win = window as TargetWindow;
			expect(appended).toEqual([]);
			expect(win.alloy).toBeUndefined();
			expect(win.__alloyNS).toBeUndefined();
			expect(win.adobe).toBeUndefined();
			expect(win.targetGlobalSettings).toBeUndefined();
			for (const access of storageAccess) {
				expect(access).not.toHaveBeenCalled();
			}
			expect(cookieWrite).not.toHaveBeenCalled();
			expect(document.cookie).toBe(beforeCookies);
			expect({ ...localStorage }).toEqual(beforeLocalStorage);
			expect({ ...sessionStorage }).toEqual(beforeSessionStorage);
		}
	);

	it('writes at.js settings before append and sends approve/deny/approve without reinstalling', () => {
		const win = window as TargetWindow;
		win.adobe = {
			OptInCategories: { TARGET: 'target' },
			optIn: { approve: vi.fn(), deny: vi.fn() },
		};
		installHeadProbe((node) => {
			expect(win.targetGlobalSettings).toEqual({
				optinEnabled: true,
				secureOnly: true,
			});
			expect(win.adobe?.optIn.approve).toHaveBeenCalledExactlyOnceWith(
				'target'
			);
			node.dispatchEvent(new Event('load'));
		});
		const scripts = [
			adobeTarget({
				mode: 'atjs',
				scriptUrl: '/scripts/at.js',
				targetGlobalSettings: { secureOnly: true },
			}),
		];
		loadScripts(scripts, grantedExperience);
		const loader = getLoader();
		expect(loader.src).toBe(new URL('/scripts/at.js', document.baseURI).href);
		updateScripts(scripts, { ...grantedExperience, measurement: true });
		expect(win.adobe.optIn.approve).toHaveBeenCalledOnce();
		updateScripts(scripts, deniedConsents);
		expect(loader.isConnected).toBe(true);
		expect(win.adobe.optIn.deny).toHaveBeenCalledExactlyOnceWith('target');
		loader.dispatchEvent(new Event('load'));
		expect(win.adobe.optIn.approve).toHaveBeenCalledOnce();
		updateScripts(
			[
				adobeTarget({
					mode: 'atjs',
					scriptUrl: '/scripts/at.js',
					targetGlobalSettings: { secureOnly: true },
				}),
			],
			grantedExperience
		);
		expect(getLoader()).toBe(loader);
		expect(document.head.querySelectorAll('script')).toHaveLength(1);
		expect(win.adobe.optIn.approve).toHaveBeenCalledTimes(2);
	});

	it('does not send a late at.js approval if its download completes while denied', () => {
		const win = window as TargetWindow;
		win.adobe = {
			OptInCategories: { TARGET: 'target' },
			optIn: { approve: vi.fn(), deny: vi.fn() },
		};
		const scripts = [
			adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' }),
		];
		loadScripts(scripts, grantedExperience);
		const element = getLoader();
		updateScripts(scripts, deniedConsents);
		element.dispatchEvent(new Event('load'));
		expect(win.adobe.optIn.approve).toHaveBeenCalledOnce();
		expect(win.adobe.optIn.deny).toHaveBeenCalledExactlyOnceWith('target');
		updateScripts(scripts, grantedExperience);
		expect(getLoader()).toBe(element);
		expect(win.adobe.optIn.approve).toHaveBeenCalledTimes(2);
	});

	it('honours a custom category and preserves a provider nonce', () => {
		const scripts = [adobeTarget({ ...webSdkOptions, category: 'marketing' })];
		loadScripts(scripts, grantedExperience, { nonce: 'provider-nonce' });
		expect(document.head.querySelector('script')).toBeNull();
		updateScripts(scripts, { ...deniedConsents, marketing: true });
		expect(getLoader().nonce).toBe('provider-nonce');
		expect((window as TargetWindow).__alloyNS).toEqual(['alloy']);
	});

	it('waits for SDK load, configures pending once and sends in/out/in without reinstalling', async () => {
		vi.useFakeTimers();
		const scripts = [adobeTarget(webSdkOptions)];
		loadScripts(scripts, grantedExperience);
		const win = window as TargetWindow;
		const { commands, stub } = activateAlloy();
		const loader = getLoader();
		expect(loader.src).toBe(
			'https://cdn1.adoberesources.net/alloy/2.30.0/alloy.min.js'
		);
		expect(stub.q).toHaveLength(0);
		loader.dispatchEvent(new Event('load'));
		await vi.runOnlyPendingTimersAsync();
		await vi.runOnlyPendingTimersAsync();
		expect(commands).toEqual([
			[
				'configure',
				{
					datastreamId: webSdkOptions.datastreamId,
					defaultConsent: 'pending',
					orgId: webSdkOptions.orgId,
				},
			],
			['setConsent', consent('in')],
		]);
		updateScripts(scripts, { ...grantedExperience, functionality: true });
		await vi.runOnlyPendingTimersAsync();
		expect(commands).toHaveLength(2);
		updateScripts(scripts, deniedConsents);
		await vi.runOnlyPendingTimersAsync();
		expect(commands.at(-1)).toEqual(['setConsent', consent('out')]);
		expect(loader.isConnected).toBe(true);
		updateScripts([adobeTarget({ ...webSdkOptions })], grantedExperience);
		await vi.runOnlyPendingTimersAsync();
		expect(getLoader()).toBe(loader);
		expect(win.alloy).toBe(stub);
		expect(commands).toEqual([
			[
				'configure',
				{
					datastreamId: webSdkOptions.datastreamId,
					defaultConsent: 'pending',
					orgId: webSdkOptions.orgId,
				},
			],
			['setConsent', consent('in')],
			['setConsent', consent('out')],
			['setConsent', consent('in')],
		]);
	});

	it('never configures or grants a Web SDK download that finishes after revocation', async () => {
		vi.useFakeTimers();
		const scripts = [adobeTarget(webSdkOptions)];
		loadScripts(scripts, grantedExperience);
		const loader = getLoader();
		const { commands } = activateAlloy();
		updateScripts(scripts, deniedConsents);
		loader.dispatchEvent(new Event('load'));
		await vi.runOnlyPendingTimersAsync();
		expect(commands).toEqual([]);
		updateScripts(scripts, grantedExperience);
		await vi.runOnlyPendingTimersAsync();
		await vi.runOnlyPendingTimersAsync();
		expect(commands).toEqual([
			[
				'configure',
				{
					datastreamId: webSdkOptions.datastreamId,
					defaultConsent: 'pending',
					orgId: webSdkOptions.orgId,
				},
			],
			['setConsent', consent('in')],
		]);
	});

	it('honours the vendor switch inside an allowed category and sends out on vendor revocation', async () => {
		vi.useFakeTimers();
		const kernel = createConsentKernel();
		const loader = createScriptLoader({
			kernel,
			scripts: [adobeTarget(webSdkOptions)],
		});
		try {
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'adobe-target': false } }
			);
			expect(document.head.querySelector('script')).toBeNull();
			expect((window as TargetWindow).alloy).toBeUndefined();
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'adobe-target': true } }
			);
			const { commands } = activateAlloy();
			getLoader().dispatchEvent(new Event('load'));
			await vi.runOnlyPendingTimersAsync();
			await vi.runOnlyPendingTimersAsync();
			expect(commands.at(-1)).toEqual(['setConsent', consent('in')]);
			await kernel.commands.save(
				{ experience: true },
				{ vendors: { 'adobe-target': false } }
			);
			await vi.runOnlyPendingTimersAsync();
			expect(commands.at(-1)).toEqual(['setConsent', consent('out')]);
		} finally {
			loader.dispose();
			kernel.dispose();
		}
	});

	it('uses the latest kernel choice when configuration finishes after revocation', async () => {
		vi.useFakeTimers();
		let finishConfigure: (value: unknown) => void = () => undefined;
		const configuring = new Promise((resolve) => {
			finishConfigure = resolve;
		});
		const scripts = [adobeTarget(webSdkOptions)];
		loadScripts(scripts, grantedExperience);
		const { commands } = activateAlloy(configuring);
		getLoader().dispatchEvent(new Event('load'));
		await vi.runOnlyPendingTimersAsync();
		updateScripts(scripts, deniedConsents);
		finishConfigure(undefined);
		await configuring;
		await vi.runOnlyPendingTimersAsync();
		expect(commands.map(([command]) => command)).toEqual([
			'configure',
			'setConsent',
		]);
		expect(commands.at(-1)).toEqual(['setConsent', consent('out')]);
		updateScripts(scripts, grantedExperience);
		await vi.runOnlyPendingTimersAsync();
		expect(commands.at(-1)).toEqual(['setConsent', consent('in')]);
	});

	it('shares one SDK across equal registrations and denies only when the last one is disposed', async () => {
		vi.useFakeTimers();
		const firstKernel = createConsentKernel();
		const secondKernel = createConsentKernel();
		const firstScript = adobeTarget(webSdkOptions);
		const secondScript = adobeTarget({ ...webSdkOptions });
		expect(firstScript).toBe(secondScript);
		const first = createScriptLoader({
			kernel: firstKernel,
			scripts: [firstScript],
		});
		const second = createScriptLoader({
			kernel: secondKernel,
			scripts: [secondScript],
		});
		try {
			await firstKernel.commands.save({ experience: true });
			const { commands, stub } = activateAlloy();
			const element = getLoader();
			element.dispatchEvent(new Event('load'));
			await vi.runOnlyPendingTimersAsync();
			await vi.runOnlyPendingTimersAsync();
			await secondKernel.commands.save({ experience: true });
			await vi.runOnlyPendingTimersAsync();
			expect(document.head.querySelectorAll('script')).toHaveLength(1);
			expect((window as TargetWindow).alloy).toBe(stub);
			expect(commands).toHaveLength(2);
			first.dispose();
			await vi.runOnlyPendingTimersAsync();
			expect(element.isConnected).toBe(true);
			expect(commands).toHaveLength(2);
			second.dispose();
			await vi.runOnlyPendingTimersAsync();
			expect(commands.at(-1)).toEqual(['setConsent', consent('out')]);
		} finally {
			first.dispose();
			second.dispose();
			firstKernel.dispose();
			secondKernel.dispose();
		}
	});
});
