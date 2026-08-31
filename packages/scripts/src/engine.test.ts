import { subscribeToScriptDebugEvents } from '@c15t/core';
import type { ScriptDebugEvent } from '@c15t/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createCallbackInfo,
	deniedConsentState,
	grantedMeasurementConsentState,
} from './__tests__/helpers';
import * as compileEngine from './engine/compile';
import { compileManifest } from './engine/compile';
import { resolvedManifestToScript } from './engine/runtime';
import { resolveManifest } from './resolve';
import {
	VENDOR_MANIFEST_KIND,
	VENDOR_MANIFEST_SCHEMA_VERSION,
	vendorManifestContract,
} from './types';
import type { VendorManifest } from './types';

type TestGlobal = typeof globalThis & Record<string, unknown>;

const setupMockBrowser = function setupMockBrowser() {
	const globalRef = globalThis as TestGlobal;
	const scriptAnchor = {
		parentNode: {
			insertBefore: vi.fn((node: Record<string, unknown>) => node),
		},
	};

	const document = {
		createElement: vi.fn((_tag: string) => ({
			async: false,
			defer: false,
			setAttribute: vi.fn(),

			textContent: '',
		})),
		getElementsByTagName: vi.fn(() => [scriptAnchor]),
		head: {
			appendChild: vi.fn((node: Record<string, unknown>) => node),
		},
	};

	vi.stubGlobal('window', globalRef as unknown as Window & typeof globalThis);
	vi.stubGlobal('document', document as unknown as Document);
};

const createManifest = function createManifest(
	manifest: Omit<VendorManifest, 'kind' | 'schemaVersion'>
): VendorManifest {
	return {
		...vendorManifestContract,
		...manifest,
	};
};

describe('scripts engine', () => {
	beforeEach(() => {
		setupMockBrowser();
	});

	afterEach(() => {
		const globalRef = globalThis as TestGlobal;
		vi.unstubAllGlobals();
		delete globalRef.databuddy;
		delete globalRef.databuddyConfig;
		delete globalRef.gtag;
		delete globalRef.dataLayer;
		delete globalRef.recorder;
		delete globalRef.__calls;
		delete globalRef.posthog;
		delete globalRef.twq;
		delete globalRef.ttq;
		delete globalRef.fbq;
		delete globalRef._fbq;
		delete globalRef.uetq;
		delete globalRef.UET;
		delete globalRef._linkedin_partner_id;
		delete globalRef._linkedin_data_partner_ids;
	});

	it('preserves typed values for exact placeholders', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			afterLoad: [
				{
					args: [
						'{{id}}',
						'{{initOptions}}',
						{
							payload: ['{{initOptions}}', '{{enabled}}'],
						},
					],

					global: 'recorder',
					type: 'callGlobal',
				},
			],
			category: 'measurement',
			install: [],
			vendor: 'typed-values',
		};

		const resolved = compileManifest(manifest, {
			enabled: false,
			id: 'phc_123',
			initOptions: { api_host: 'https://eu.i.posthog.com', autocapture: false },
		});

		expect(resolved.afterLoadSteps[0]).toEqual({
			args: [
				'phc_123',
				{ api_host: 'https://eu.i.posthog.com', autocapture: false },
				{
					payload: [
						{ api_host: 'https://eu.i.posthog.com', autocapture: false },
						false,
					],
				},
			],
			global: 'recorder',
			type: 'callGlobal',
		});
	});

	it('stringifies embedded placeholders while recursing through values', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			category: 'marketing',
			install: [
				{
					attributes: {
						'data-id': 'prefix-{{id}}',
					},

					src: 'https://example.com/script.js?config={{config}}',
					type: 'loadScript',
				},
			],
			onConsentChange: [
				{
					queue: 'dataLayer',
					type: 'pushToQueue',
					value: {
						label: 'state={{state}}',
						nested: ['{{id}}', 'config={{config}}'],
					},
				},
			],
			vendor: 'embedded-placeholders',
		};

		const resolved = compileManifest(manifest, {
			config: { enabled: true },
			id: 'abc',
			state: 'granted',
		});

		expect(resolved.loadScript?.src).toBe(
			'https://example.com/script.js?config={"enabled":true}'
		);
		expect(resolved.loadScript?.attributes).toEqual({
			'data-id': 'prefix-abc',
		});
		expect(resolved.onConsentChangeSteps[0]).toEqual({
			queue: 'dataLayer',
			type: 'pushToQueue',
			value: {
				label: 'state=granted',
				nested: ['abc', 'config={"enabled":true}'],
			},
		});
	});

	it('extracts install steps into loadScript and setup phases', () => {
		const loadManifest: VendorManifest = {
			...vendorManifestContract,
			category: 'necessary',
			install: [
				{ name: 'before', type: 'setGlobal', value: true },
				{
					async: true,

					src: 'https://cdn.example.com/a.js',
					type: 'loadScript',
				},
				{ args: ['after-load'], global: 'boot', type: 'callGlobal' },
			],
			vendor: 'load-script',
		};
		const setupOnlyManifest: VendorManifest = {
			...vendorManifestContract,
			category: 'necessary',
			install: [
				{ name: 'config', type: 'setGlobal', value: { ready: true } },
				{ args: ['inline-a'], global: 'boot', type: 'callGlobal' },
				{ args: ['inline-b'], global: 'boot', type: 'callGlobal' },
			],
			vendor: 'setup-only',
		};

		const loadResolved = compileManifest(loadManifest);
		const setupOnlyResolved = compileManifest(setupOnlyManifest);

		expect(loadResolved.loadScript).toEqual({
			async: true,
			src: 'https://cdn.example.com/a.js',
			type: 'loadScript',
		});
		expect(loadResolved.setupSteps).toEqual([
			{ name: 'before', type: 'setGlobal', value: true },
			{ args: ['after-load'], global: 'boot', type: 'callGlobal' },
		]);

		expect(setupOnlyResolved.loadScript).toBeUndefined();
		expect(setupOnlyResolved.setupSteps).toEqual([
			{ name: 'config', type: 'setGlobal', value: { ready: true } },
			{ args: ['inline-a'], global: 'boot', type: 'callGlobal' },
			{ args: ['inline-b'], global: 'boot', type: 'callGlobal' },
		]);
	});

	it('throws when install declares multiple loadScript steps', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			category: 'necessary',
			install: [
				{ src: 'https://cdn.example.com/a.js', type: 'loadScript' },
				{ src: 'https://cdn.example.com/b.js', type: 'loadScript' },
			],
			vendor: 'invalid',
		};

		expect(() => compileManifest(manifest)).toThrow('single loadScript step');
	});

	it('throws when loadScript src becomes empty after interpolation', () => {
		const manifest = createManifest({
			category: 'measurement',
			install: [
				{
					src: '{{scriptSrc}}',

					type: 'loadScript',
				},
			],
			vendor: 'invalid-load-script',
		});

		expect(() =>
			compileManifest(manifest, {
				scriptSrc: '',
			})
		).toThrow('non-empty src');
	});

	it('produces a serializable resolved manifest without unresolved placeholders', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			category: 'measurement',
			install: [
				{
					src: 'https://cdn.example.com/{{id}}.js',

					type: 'loadScript',
				},
			],
			onConsentGranted: [
				{
					args: ['{{id}}', '{{config}}'],

					global: 'recorder',
					type: 'callGlobal',
				},
			],
			vendor: 'serializable',
		};

		const resolved = compileManifest(manifest, {
			config: { enabled: true },
			id: 'vendor-id',
		});
		const json = JSON.stringify(resolved);

		expect(json).not.toContain('{{');
		expect(JSON.parse(json)).toEqual({
			afterLoadSteps: [],
			bootstrapSteps: [],
			category: 'measurement',
			kind: 'c15t.vendor-manifest',
			loadScript: {
				src: 'https://cdn.example.com/vendor-id.js',
				type: 'loadScript',
			},
			onBeforeLoadDeniedSteps: [],
			onBeforeLoadGrantedSteps: [],
			onConsentChangeSteps: [],
			onConsentDeniedSteps: [],
			onConsentGrantedSteps: [
				{
					args: ['vendor-id', { enabled: true }],

					global: 'recorder',
					type: 'callGlobal',
				},
			],
			onLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			schemaVersion: 1,
			setupSteps: [],
			vendor: 'serializable',
		});
	});

	it('caches compiled manifests for repeated resolves with the same config', () => {
		const compileSpy = vi.spyOn(compileEngine, 'compileManifest');
		const manifest: VendorManifest = {
			...vendorManifestContract,
			category: 'measurement',
			install: [
				{
					src: 'https://cdn.example.com/{{id}}.js',

					type: 'loadScript',
				},
			],
			vendor: 'cached-resolve',
		};

		const first = resolveManifest(manifest, { id: 'vendor-id' });
		const second = resolveManifest(manifest, { id: 'vendor-id' });

		expect(compileSpy).toHaveBeenCalledTimes(1);
		expect(first).not.toBe(second);
		expect(first.src).toBe('https://cdn.example.com/vendor-id.js');
		expect(second.src).toBe('https://cdn.example.com/vendor-id.js');

		compileSpy.mockRestore();
	});

	it('converts resolved manifests into Script objects for external and callback-only flows', () => {
		const external = resolvedManifestToScript({
			afterLoadSteps: [],
			bootstrapSteps: [],
			category: 'measurement',
			kind: VENDOR_MANIFEST_KIND,
			loadScript: {
				async: true,
				attributes: { 'data-test': 'ok' },
				defer: true,
				src: 'https://cdn.example.com/external.js',
				type: 'loadScript',
			},
			onBeforeLoadDeniedSteps: [],
			onBeforeLoadGrantedSteps: [],
			onConsentChangeSteps: [],
			onConsentDeniedSteps: [],
			onConsentGrantedSteps: [],
			onLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			schemaVersion: VENDOR_MANIFEST_SCHEMA_VERSION,
			setupSteps: [],
			vendor: 'external',
		});
		const callbackOnly = resolvedManifestToScript({
			afterLoadSteps: [],
			bootstrapSteps: [],
			category: 'marketing',
			kind: VENDOR_MANIFEST_KIND,
			onBeforeLoadDeniedSteps: [],
			onBeforeLoadGrantedSteps: [],
			onConsentChangeSteps: [],
			onConsentDeniedSteps: [],
			onConsentGrantedSteps: [],
			onLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			schemaVersion: VENDOR_MANIFEST_SCHEMA_VERSION,
			setupSteps: [],
			vendor: 'callback-only',
		});

		expect(external).toMatchObject({
			async: true,
			attributes: { 'data-test': 'ok' },
			category: 'measurement',
			defer: true,
			id: 'external',
			src: 'https://cdn.example.com/external.js',
		});
		expect(callbackOnly).toMatchObject({
			callbackOnly: true,
			category: 'marketing',
			id: 'callback-only',
		});
	});

	it('executes structured startup steps directly during onBeforeLoad', () => {
		const manifest = createManifest({
			bootstrap: [
				{ name: 'dataLayer', type: 'setGlobal', value: [] },
				{
					name: 'gtag',
					queue: 'dataLayer',

					type: 'defineQueueFunction',
				},
			],
			category: 'measurement',
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
			install: [
				{
					args: ['js', '{{loadTime}}'],

					global: 'gtag',
					type: 'callGlobal',
				},
				{
					args: ['config', 'G-ORDER'],

					global: 'gtag',
					type: 'callGlobal',
				},
				{
					src: 'https://cdn.example.com/vendor.js',

					type: 'loadScript',
				},
			],
			vendor: 'structured-startup',
		});

		const resolved = resolvedManifestToScript(
			compileManifest(manifest, {
				loadTime: new Date('2026-01-01T00:00:00.000Z'),
			})
		);
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		resolved.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: resolved.id,
			})
		);

		const dataLayer = globalRef.dataLayer as unknown[];
		expect(Array.from(dataLayer[0] as IArguments)).toEqual([
			'consent',
			'default',
			{ ad_storage: 'denied' },
		]);
		expect(Array.from(dataLayer[1] as IArguments)[0]).toBe('js');
		expect(Array.from(dataLayer[1] as IArguments)[1]).toBeInstanceOf(Date);
		expect(Array.from(dataLayer[2] as IArguments)).toEqual([
			'config',
			'G-ORDER',
		]);
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('supports methodCall queue formats and queued helper classes', async () => {
		const manifest = createManifest({
			bootstrap: [
				{
					ifUndefined: true,

					name: 'vendorSdk',
					type: 'setGlobal',
					value: { _q: [] },
				},
				{
					methods: ['track'],
					queue: { property: '_q' },
					queueFormat: 'methodCall',

					target: 'vendorSdk',
					type: 'defineQueueMethods',
				},
				{
					methods: ['set'],

					name: 'Identify',
					target: 'vendorSdk',
					type: 'defineQueueClass',
				},
			],
			category: 'measurement',
			install: [
				{
					src: 'https://cdn.example.com/vendor.js',

					type: 'loadScript',
				},
			],
			vendor: 'method-call-queue',
		});

		const resolved = resolvedManifestToScript(compileManifest(manifest, {}));
		const globalRef = globalThis as TestGlobal;

		resolved.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: resolved.id,
			})
		);

		const sdk = globalRef.vendorSdk as {
			_q: {
				name: string;
				args: unknown[];
				resolve: (value: unknown) => void;
			}[];
			track: (event: string) => Promise<unknown>;
			Identify: new () => {
				set: (key: string, value: unknown) => unknown;
				_q: { name: string; args: unknown[] }[];
			};
		};

		const pending = sdk.track('Signup');
		expect(sdk._q).toHaveLength(1);
		expect(sdk._q[0]?.name).toBe('track');
		expect(sdk._q[0]?.args).toEqual(['Signup']);

		sdk._q[0]?.resolve('replayed');
		await expect(pending).resolves.toBe('replayed');

		const identify = new sdk.Identify();
		expect(identify.set('plan', 'pro')).toBe(identify);
		expect(identify._q).toEqual([{ args: ['plan', 'pro'], name: 'set' }]);

		delete globalRef.vendorSdk;
	});

	it('supports callback queue formats that replay against the current global', () => {
		const manifest = createManifest({
			bootstrap: [
				{
					ifUndefined: true,

					name: 'vendorReadyCb',
					type: 'setGlobal',
					value: [],
				},
				{
					ifUndefined: true,

					name: 'vendorSdk',
					type: 'setGlobal',
					value: [],
				},
				{
					methods: ['track'],
					queue: { global: 'vendorReadyCb' },
					queueFormat: 'callback',

					target: 'vendorSdk',
					type: 'defineQueueMethods',
				},
			],
			category: 'measurement',
			install: [
				{
					src: 'https://cdn.example.com/vendor.js',

					type: 'loadScript',
				},
			],
			vendor: 'callback-queue',
		});
		const resolved = resolvedManifestToScript(compileManifest(manifest));
		const globalRef = globalThis as TestGlobal;
		const calls: unknown[][] = [];

		resolved.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: resolved.id,
			})
		);

		const sdkStub = globalRef.vendorSdk as {
			track: (event: string, properties?: Record<string, unknown>) => void;
		};
		sdkStub.track('Signup', { plan: 'pro' });

		const readyQueue = globalRef.vendorReadyCb as {
			name: string;
			fn: () => void;
		}[];
		globalRef.vendorSdk = {
			track: (...args: unknown[]) => {
				calls.push(args);
			},
		};

		expect(readyQueue).toHaveLength(1);
		expect(readyQueue[0]?.name).toBe('track');
		readyQueue[0]?.fn();
		expect(calls).toEqual([['Signup', { plan: 'pro' }]]);

		delete globalRef.vendorReadyCb;
		delete globalRef.vendorSdk;
	});

	it('runs bootstrap before default consent signaling and setup', () => {
		const manifest = createManifest({
			alwaysLoad: true,
			bootstrap: [
				{
					ifUndefined: true,

					name: 'dataLayer',
					type: 'setGlobal',
					value: [],
				},
				{
					name: 'gtag',
					pushStyle: 'array',

					queue: 'dataLayer',
					type: 'defineQueueFunction',
				},
			],
			category: 'necessary',
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
			install: [
				{
					args: ['event', 'boot'],

					global: 'gtag',
					type: 'callGlobal',
				},
				{
					src: 'https://cdn.example.com/google.js',

					type: 'loadScript',
				},
			],
			vendor: 'ordered-google',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(globalRef.dataLayer as unknown[]).toEqual([
			['consent', 'default', { ad_storage: 'denied' }],
			['event', 'boot'],
		]);
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('interpolates manifest category conditions and booleans from config', () => {
		const resolved = compileManifest(
			createManifest({
				alwaysLoad: '{{alwaysLoad}}',
				category: '{{category}}',
				install: [],
				persistAfterConsentRevoked: '{{persistAfterConsentRevoked}}',
				vendor: 'variable-top-level',
			}),
			{
				alwaysLoad: true,
				category: {
					and: ['measurement', { not: 'marketing' }],
				},
				persistAfterConsentRevoked: false,
			}
		);

		expect(resolved.category).toEqual({
			and: ['measurement', { not: 'marketing' }],
		});
		expect(resolved.alwaysLoad).toBe(true);
		expect(resolved.persistAfterConsentRevoked).toBe(false);
	});

	it('runs conditional before-load and on-load manifest steps', () => {
		const script = resolvedManifestToScript(
			compileManifest({
				...vendorManifestContract,
				category: 'measurement',
				install: [
					{
						src: 'https://cdn.example.com/vendor.js',

						type: 'loadScript',
					},
				],
				onBeforeLoadDenied: [
					{
						name: 'databuddyConfig',
						type: 'setGlobal',
						value: {
							disabled: true,
						},
					},
				],
				onConsentDenied: [
					{
						path: ['databuddy', 'options', 'disabled'],
						type: 'setGlobalPath',
						value: true,
					},
				],
				onLoadGranted: [
					{
						path: ['databuddy', 'options', 'disabled'],
						type: 'setGlobalPath',
						value: false,
					},
				],
				vendor: 'conditional-lifecycle',
			})
		);
		const globalRef = globalThis as TestGlobal;
		globalRef.databuddy = {
			options: {
				disabled: true,
			},
		};

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(globalRef.databuddyConfig).toEqual({
			disabled: true,
		});

		script.onLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(false);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: deniedConsentState,
				id: script.id,
			})
		);

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(true);
	});

	it('signals consent updates before generic and branch-specific lifecycle steps', () => {
		const globalRef = globalThis as TestGlobal;
		const calls: unknown[] = [];
		globalRef.gtag = (...args: unknown[]) => {
			calls.push(args);
		};
		globalRef.recorder = (...args: unknown[]) => {
			calls.push(args);
		};

		const manifest = createManifest({
			category: 'marketing',
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
			install: [],
			onConsentChange: [
				{ args: ['change'], global: 'recorder', type: 'callGlobal' },
			],
			onConsentDenied: [
				{ args: ['denied'], global: 'recorder', type: 'callGlobal' },
			],
			onConsentGranted: [
				{ args: ['granted'], global: 'recorder', type: 'callGlobal' },
			],
			vendor: 'consent-order',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));

		script.onConsentChange?.(
			createCallbackInfo({
				consents: {
					experience: false,
					functionality: false,
					marketing: true,
					measurement: false,
					necessary: true,
				},
				hasConsent: true,
				id: script.id,
			})
		);

		expect(calls).toEqual([
			['consent', 'update', { ad_storage: 'granted' }],
			['change'],
			['granted'],
		]);
	});

	it('does not overwrite an initialized SDK object with queue stubs', () => {
		const globalRef = globalThis as TestGlobal;
		const liveTrack = vi.fn();
		// Simulates a grant → revoke → grant cycle without a page reload: the
		// SDK already replaced the snippet queue array with a runtime object.
		globalRef.vendorQueue = { track: liveTrack };

		const manifest = createManifest({
			bootstrap: [
				{
					ifUndefined: true,
					name: 'vendorQueue',
					type: 'setGlobal',
					value: [],
				},
				{
					methods: ['track'],
					target: 'vendorQueue',
					type: 'defineQueueMethods',
				},
			],
			category: 'measurement',
			install: [
				{
					src: 'https://cdn.example.com/vendor.js',
					type: 'loadScript',
				},
			],
			vendor: 'queue-regrant',
		});

		const script = resolvedManifestToScript(compileManifest(manifest, {}));
		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				id: script.id,
			})
		);

		const sdk = globalRef.vendorQueue as { track: (event: string) => void };
		sdk.track('Signup');

		expect(liveTrack).toHaveBeenCalledWith('Signup');

		delete globalRef.vendorQueue;
	});

	it('partitions consent IDs for the rudderstack consent signal', () => {
		const globalRef = globalThis as TestGlobal;
		const consentCalls: unknown[][] = [];
		globalRef.rudderanalytics = {
			consent: (...args: unknown[]) => {
				consentCalls.push(args);
			},
		};

		const manifest = createManifest({
			alwaysLoad: true,
			category: 'measurement',
			consentMapping: {
				marketing: ['ad-destinations', 'retargeting'],
				measurement: ['product-analytics'],
			},
			consentSignal: 'rudderstack',
			consentSignalTarget: 'rudderanalytics',
			install: [],
			vendor: 'rudderstack-signal',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));

		script.onConsentChange?.(
			createCallbackInfo({
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
				hasConsent: true,
				id: script.id,
			})
		);

		expect(consentCalls).toEqual([
			[
				{
					consentManagement: {
						allowedConsentIds: ['product-analytics'],
						deniedConsentIds: ['ad-destinations', 'retargeting'],
						enabled: true,
						provider: 'custom',
					},
				},
			],
		]);

		delete globalRef.rudderanalytics;
	});

	it('emits phase and step debug events for manifest execution', () => {
		const events: ScriptDebugEvent[] = [];
		const unsubscribe = subscribeToScriptDebugEvents((event) => {
			events.push(event);
		});
		const manifest = createManifest({
			bootstrap: [{ name: 'dataLayer', type: 'setGlobal', value: [] }],
			category: 'measurement',
			install: [
				{
					queue: 'dataLayer',
					type: 'pushToQueue',
					value: { event: 'boot' },
				},
				{
					src: 'https://cdn.example.com/vendor.js',
					type: 'loadScript',
				},
			],
			onConsentChange: [
				{
					queue: 'dataLayer',
					type: 'pushToQueue',
					value: { event: 'consent-update' },
				},
			],
			vendor: 'debuggable-manifest',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		script.onBeforeLoad?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		script.onConsentChange?.(
			createCallbackInfo({
				consents: grantedMeasurementConsentState,
				hasConsent: true,
				id: script.id,
			})
		);

		unsubscribe();

		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					action: 'phase_start',
					callback: 'onBeforeLoad',
					phase: 'bootstrap',
					scope: 'phase',
					scriptId: 'debuggable-manifest',
					source: 'manifest-runtime',
				}),
				expect.objectContaining({
					action: 'step_executed',
					callback: 'onBeforeLoad',
					phase: 'setup',
					scope: 'step',
					scriptId: 'debuggable-manifest',
					source: 'manifest-runtime',
					stepType: 'pushToQueue',
				}),
				expect.objectContaining({
					action: 'phase_complete',
					callback: 'onConsentChange',
					phase: 'onConsentChange',
					scope: 'phase',
					scriptId: 'debuggable-manifest',
					source: 'manifest-runtime',
				}),
			])
		);
	});

	it('rejects manifests with an unsupported contract', () => {
		expect(() =>
			compileManifest({
				...vendorManifestContract,
				category: 'necessary',
				install: [],
				schemaVersion: 999 as typeof VENDOR_MANIFEST_SCHEMA_VERSION,
				vendor: 'unsupported-version',
			})
		).toThrow('Unsupported manifest schema version');

		expect(() =>
			compileManifest({
				...vendorManifestContract,
				category: 'necessary',
				install: [],
				kind: 'legacy-manifest' as typeof VENDOR_MANIFEST_KIND,
				vendor: 'unsupported-kind',
			})
		).toThrow('Unsupported manifest kind');
	});
});
