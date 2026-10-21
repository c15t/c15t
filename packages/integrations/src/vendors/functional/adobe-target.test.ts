/**
 * @vitest-environment jsdom
 */

import type { Script } from '@c15t/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	expectSkippedScript,
} from '../../__tests__/helpers';
import { adobeTarget as createAdobeTarget } from './adobe-target';
import type { AdobeTargetOptions } from './adobe-target';

type TestAlloy = ((
	command: string,
	options?: Record<string, unknown>
) => Promise<unknown>) & { q: unknown[] };
type TargetWindow = Window & {
	alloy?: TestAlloy;
	__alloyNS?: string[];
	targetGlobalSettings?: Record<string, unknown>;
	adobe?: {
		OptInCategories?: { TARGET: string };
		optIn?: {
			approve: (category: string) => void;
			deny: (category: string) => void;
		};
	};
};

const createdScripts = new Set<Script>();
const adobeTarget = (options: AdobeTargetOptions): Script => {
	const script = createAdobeTarget(options);
	createdScripts.add(script);
	return script;
};

const webSdkOptions = {
	datastreamId: '00000000-0000-4000-8000-000000000000',
	mode: 'websdk',
	orgId: 'C15TFAKE@AdobeOrg',
	version: '2.30.0',
} as const;

const connectedScript = function connectedScript(): HTMLScriptElement {
	const element = document.createElement('script');
	document.head.appendChild(element);
	return element;
};

describe('adobeTarget', () => {
	afterEach(() => {
		for (const script of createdScripts) {
			script.onDispose?.(createCallbackInfo({ id: script.id }));
		}
		createdScripts.clear();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		const win = window as TargetWindow;
		delete win.alloy;
		delete win.__alloyNS;
		delete win.adobe;
		delete win.targetGlobalSettings;
		document.head.innerHTML = '';
	});

	it.each([
		{ mode: 'atjs', scriptUrl: '/scripts/at.js' },
		webSdkOptions,
	] satisfies AdobeTargetOptions[])(
		'constructs %s without browser side effects',
		(options) => {
			const script = adobeTarget(options);
			const win = window as TargetWindow;
			expect(script.category).toBe('experience');
			expect(script.id).toBe('adobe-target');
			expect(script.vendor).toBe('adobe-target');
			expect(script.alwaysLoad).toBeUndefined();
			expect(script.serverStart).toBeUndefined();
			expect(script.vendorDetails).toMatchObject({
				legalName: 'Adobe Inc.',
				name: 'Adobe Target',
				privacyPolicyUrl: 'https://www.adobe.com/privacy/policy.html',
			});
			expect(win.targetGlobalSettings).toBeUndefined();
			expect(win.alloy).toBeUndefined();
			expect(win.__alloyNS).toBeUndefined();
		}
	);

	it.each(['', '   ', undefined, null])(
		'skips missing at.js URLs %s',
		(scriptUrl) => {
			expectSkippedScript(
				() => adobeTarget({ mode: 'atjs', scriptUrl: scriptUrl as string }),
				{ category: 'experience', id: 'adobe-target' },
				'adobeTarget: missing or invalid scriptUrl'
			);
		}
	);

	it.each(['datastreamId', 'orgId', 'version'] as const)(
		'skips missing or blank Web SDK %s',
		(option) => {
			for (const value of ['', '   ', undefined, null]) {
				expectSkippedScript(
					() =>
						adobeTarget({
							...webSdkOptions,
							[option]: value,
						} as unknown as AdobeTargetOptions),
					{ category: 'experience', id: 'adobe-target' },
					`adobeTarget: missing or invalid ${option}`
				);
			}
		}
	);

	it('normalises required Web SDK values and supports a different consent condition', () => {
		const script = adobeTarget({
			...webSdkOptions,
			category: { and: ['experience', 'marketing'] },
			datastreamId: ` ${webSdkOptions.datastreamId} `,
			nonce: ' nonce ',
			orgId: ' C15TFAKE@AdobeOrg ',
			version: ' 2.30.0 ',
		});
		expect(script.category).toEqual({ and: ['experience', 'marketing'] });
		expect(script.src).toBe(
			'https://cdn1.adoberesources.net/alloy/2.30.0/alloy.min.js'
		);
		expect(script.nonce).toBe('nonce');
		expect(script.persistAfterConsentRevoked).toBe(true);
	});

	it('sets at.js options and approves only Target before the loader runs', () => {
		const win = window as TargetWindow;
		win.adobe = {
			OptInCategories: { TARGET: 'target' },
			optIn: { approve: vi.fn(), deny: vi.fn() },
		};
		const script = adobeTarget({
			mode: 'atjs',
			scriptUrl: ' /scripts/at.js ',
			targetGlobalSettings: { cookieDomain: 'example.com', secureOnly: true },
		});
		expect(script.src).toBe('/scripts/at.js');
		expect(script.persistAfterConsentRevoked).toBe(true);
		const info = createCallbackInfo({ hasConsent: true, id: script.id });
		script.onBeforeLoad?.(info);
		expect(win.targetGlobalSettings).toEqual({
			cookieDomain: 'example.com',
			optinEnabled: true,
			secureOnly: true,
		});
		expect(win.adobe.optIn?.approve).toHaveBeenCalledExactlyOnceWith('target');
		script.onConsentChange?.(info);
		expect(win.adobe.optIn?.approve).toHaveBeenCalledOnce();
		script.onConsentChange?.({ ...info, hasConsent: false });
		expect(win.adobe.optIn?.deny).toHaveBeenCalledExactlyOnceWith('target');
	});

	it('does not create the Adobe Opt-in service when it is absent', () => {
		const script = adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' });
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		script.onConsentChange?.(createCallbackInfo({ id: script.id }));
		expect((window as TargetWindow).adobe).toBeUndefined();
	});

	it('denies only Target when the final at.js registration is disposed', () => {
		const win = window as TargetWindow;
		win.adobe = {
			OptInCategories: { TARGET: 'target' },
			optIn: { approve: vi.fn(), deny: vi.fn() },
		};
		const script = adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' });
		const info = createCallbackInfo({ hasConsent: true, id: script.id });
		script.onBeforeLoad?.(info);
		script.onDispose?.(info);
		expect(win.adobe.optIn?.deny).toHaveBeenCalledExactlyOnceWith('target');
	});

	it('uses Adobe base-code promises and resolve/reject/argument queue entries', async () => {
		vi.useFakeTimers();
		const win = window as TargetWindow;
		const script = adobeTarget(webSdkOptions);
		script.onBeforeLoad?.(
			createCallbackInfo({ hasConsent: true, id: script.id })
		);
		expect(win.__alloyNS).toEqual(['alloy']);
		const pending = win.alloy?.('getLibraryInfo');
		expect(pending).toBeInstanceOf(Promise);
		expect(win.alloy?.q).toHaveLength(0);
		vi.runOnlyPendingTimers();
		const entry = win.alloy?.q[0] as [
			(value: unknown) => void,
			(reason: unknown) => void,
			unknown[],
		];
		expect(entry[0]).toBeTypeOf('function');
		expect(entry[1]).toBeTypeOf('function');
		expect(entry[2]).toEqual(['getLibraryInfo']);
		entry[0]({ version: '2.30.0' });
		await expect(pending).resolves.toEqual({ version: '2.30.0' });
	});

	it('ignores detached loads and does not configure a revoked download', async () => {
		const win = window as TargetWindow;
		win.alloy = Object.assign(vi.fn().mockResolvedValue(undefined), { q: [] });
		const script = adobeTarget(webSdkOptions);
		const element = document.createElement('script');
		const info = createCallbackInfo({
			element,
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onLoad?.(info);
		expect(win.alloy).not.toHaveBeenCalled();
		document.head.appendChild(element);
		script.onConsentChange?.({ ...info, hasConsent: false });
		script.onLoad?.({ ...info, hasConsent: false });
		expect(win.alloy).not.toHaveBeenCalled();
		script.onConsentChange?.(info);
		await Promise.resolve();
		expect(win.alloy).toHaveBeenNthCalledWith(1, 'configure', {
			datastreamId: webSdkOptions.datastreamId,
			defaultConsent: 'pending',
			orgId: webSdkOptions.orgId,
		});
		expect(win.alloy).toHaveBeenNthCalledWith(2, 'setConsent', {
			consent: [
				{ standard: 'Adobe', value: { general: 'in' }, version: '1.0' },
			],
		});
	});

	it('can be constructed during SSR', () => {
		vi.stubGlobal('window', undefined);
		expect(() => adobeTarget(webSdkOptions)).not.toThrow();
		expect(() =>
			adobeTarget({ mode: 'atjs', scriptUrl: '/scripts/at.js' })
		).not.toThrow();
	});

	it('does not hand Adobe a stale grant while configuration is pending', async () => {
		let resolveConfigure: (value: unknown) => void = () => undefined;
		const configure = new Promise((resolve) => {
			resolveConfigure = resolve;
		});
		const runtime = Object.assign(
			vi.fn((command: string) =>
				command === 'configure' ? configure : Promise.resolve()
			),
			{ q: [] }
		);
		(window as TargetWindow).alloy = runtime;
		const script = adobeTarget(webSdkOptions);
		const info = createCallbackInfo({
			element: connectedScript(),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onLoad?.(info);
		script.onConsentChange?.({ ...info, hasConsent: false });
		expect(runtime.mock.calls.map(([command]) => command)).toEqual([
			'configure',
		]);
		resolveConfigure(undefined);
		await configure;
		await Promise.resolve();
		expect(runtime).toHaveBeenLastCalledWith('setConsent', {
			consent: [
				{ standard: 'Adobe', value: { general: 'out' }, version: '1.0' },
			],
		});
		expect(runtime).not.toHaveBeenCalledWith('setConsent', {
			consent: [
				{ standard: 'Adobe', value: { general: 'in' }, version: '1.0' },
			],
		});
	});

	it('denies an active Web SDK when its last registration is disposed', async () => {
		const runtime = Object.assign(vi.fn().mockResolvedValue(undefined), {
			q: [],
		});
		(window as TargetWindow).alloy = runtime;
		const script = adobeTarget(webSdkOptions);
		const info = createCallbackInfo({
			element: connectedScript(),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onLoad?.(info);
		await Promise.resolve();
		await Promise.resolve();
		script.onDispose?.(info);
		expect(runtime).toHaveBeenLastCalledWith('setConsent', {
			consent: [
				{ standard: 'Adobe', value: { general: 'out' }, version: '1.0' },
			],
		});
	});

	it('keeps the SDK function captured at bootstrap when another installation overwrites alloy', async () => {
		const runtime = Object.assign(vi.fn().mockResolvedValue(undefined), {
			q: [],
		});
		const win = window as TargetWindow;
		win.alloy = runtime;
		const script = adobeTarget(webSdkOptions);
		const info = createCallbackInfo({
			element: connectedScript(),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onLoad?.(info);
		await Promise.resolve();
		const unrelated = Object.assign(vi.fn().mockResolvedValue(undefined), {
			q: [],
		});
		win.alloy = unrelated;
		script.onConsentChange?.({ ...info, hasConsent: false });
		await Promise.resolve();
		expect(unrelated).not.toHaveBeenCalled();
		expect(runtime).toHaveBeenLastCalledWith('setConsent', {
			consent: [
				{ standard: 'Adobe', value: { general: 'out' }, version: '1.0' },
			],
		});
	});

	it('reports a configure rejection without claiming configuration succeeded', async () => {
		const failure = new Error('Adobe configuration failed');
		const report = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		const runtime = Object.assign(vi.fn().mockRejectedValue(failure), {
			q: [],
		});
		(window as TargetWindow).alloy = runtime;
		const script = adobeTarget(webSdkOptions);
		const info = createCallbackInfo({
			element: connectedScript(),
			hasConsent: true,
			id: script.id,
		});
		script.onBeforeLoad?.(info);
		script.onLoad?.(info);
		await Promise.resolve();
		script.onConsentChange?.({ ...info, hasConsent: false });
		script.onConsentChange?.(info);
		expect(runtime).toHaveBeenCalledExactlyOnceWith(
			'configure',
			expect.any(Object)
		);
		expect(report).toHaveBeenCalledExactlyOnceWith(
			'adobeTarget: Web SDK configure failed',
			failure
		);
	});
});
