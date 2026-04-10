import { type ScriptDebugEvent, subscribeToScriptDebugEvents } from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as compileEngine from './engine/compile';
import { compileManifest } from './engine/compile';
import { resolvedManifestToScript } from './engine/runtime';
import { resolveManifest } from './resolve';
import {
	VENDOR_MANIFEST_KIND,
	VENDOR_MANIFEST_SCHEMA_VERSION,
	type VendorManifest,
	vendorManifestContract,
} from './types';

type TestGlobal = typeof globalThis & Record<string, unknown>;

function setupMockBrowser() {
	const globalRef = globalThis as TestGlobal;
	const scriptAnchor = {
		parentNode: {
			insertBefore: vi.fn((node: Record<string, unknown>) => node),
		},
	};

	const document = {
		head: {
			appendChild: vi.fn((node: Record<string, unknown>) => node),
		},
		createElement: vi.fn((_tag: string) => ({
			textContent: '',
			async: false,
			defer: false,
			setAttribute: vi.fn(),
		})),
		getElementsByTagName: vi.fn(() => [scriptAnchor]),
	};

	vi.stubGlobal('window', globalRef as unknown as Window & typeof globalThis);
	vi.stubGlobal('document', document as unknown as Document);
}

function createManifest(
	manifest: Omit<VendorManifest, 'kind' | 'schemaVersion'>
): VendorManifest {
	return {
		...vendorManifestContract,
		...manifest,
	};
}

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
	});

	it('preserves typed values for exact placeholders', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'typed-values',
			category: 'measurement',
			install: [],
			afterLoad: [
				{
					type: 'callGlobal',
					global: 'recorder',
					args: [
						'{{id}}',
						'{{initOptions}}',
						{
							payload: ['{{initOptions}}', '{{enabled}}'],
						},
					],
				},
			],
		};

		const resolved = compileManifest(manifest, {
			id: 'phc_123',
			enabled: false,
			initOptions: { api_host: 'https://eu.i.posthog.com', autocapture: false },
		});

		expect(resolved.afterLoadSteps[0]).toEqual({
			type: 'callGlobal',
			global: 'recorder',
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
		});
	});

	it('stringifies embedded placeholders while recursing through values', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'embedded-placeholders',
			category: 'marketing',
			install: [
				{
					type: 'loadScript',
					src: 'https://example.com/script.js?config={{config}}',
					attributes: {
						'data-id': 'prefix-{{id}}',
					},
				},
			],
			onConsentChange: [
				{
					type: 'pushToQueue',
					queue: 'dataLayer',
					value: {
						label: 'state={{state}}',
						nested: ['{{id}}', 'config={{config}}'],
					},
				},
			],
		};

		const resolved = compileManifest(manifest, {
			id: 'abc',
			state: 'granted',
			config: { enabled: true },
		});

		expect(resolved.loadScript?.src).toBe(
			'https://example.com/script.js?config={"enabled":true}'
		);
		expect(resolved.loadScript?.attributes).toEqual({
			'data-id': 'prefix-abc',
		});
		expect(resolved.onConsentChangeSteps[0]).toEqual({
			type: 'pushToQueue',
			queue: 'dataLayer',
			value: {
				label: 'state=granted',
				nested: ['abc', 'config={"enabled":true}'],
			},
		});
	});

	it('extracts install steps into loadScript and setup phases', () => {
		const loadManifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'load-script',
			category: 'necessary',
			install: [
				{ type: 'setGlobal', name: 'before', value: true },
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/a.js',
					async: true,
				},
				{ type: 'callGlobal', global: 'boot', args: ['after-load'] },
			],
		};
		const setupOnlyManifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'setup-only',
			category: 'necessary',
			install: [
				{ type: 'setGlobal', name: 'config', value: { ready: true } },
				{ type: 'callGlobal', global: 'boot', args: ['inline-a'] },
				{ type: 'callGlobal', global: 'boot', args: ['inline-b'] },
			],
		};

		const loadResolved = compileManifest(loadManifest);
		const setupOnlyResolved = compileManifest(setupOnlyManifest);

		expect(loadResolved.loadScript).toEqual({
			type: 'loadScript',
			src: 'https://cdn.example.com/a.js',
			async: true,
		});
		expect(loadResolved.setupSteps).toEqual([
			{ type: 'setGlobal', name: 'before', value: true },
			{ type: 'callGlobal', global: 'boot', args: ['after-load'] },
		]);

		expect(setupOnlyResolved.loadScript).toBeUndefined();
		expect(setupOnlyResolved.setupSteps).toEqual([
			{ type: 'setGlobal', name: 'config', value: { ready: true } },
			{ type: 'callGlobal', global: 'boot', args: ['inline-a'] },
			{ type: 'callGlobal', global: 'boot', args: ['inline-b'] },
		]);
	});

	it('throws when install declares multiple loadScript steps', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'invalid',
			category: 'necessary',
			install: [
				{ type: 'loadScript', src: 'https://cdn.example.com/a.js' },
				{ type: 'loadScript', src: 'https://cdn.example.com/b.js' },
			],
		};

		expect(() => compileManifest(manifest)).toThrow('single loadScript step');
	});

	it('produces a serializable resolved manifest without unresolved placeholders', () => {
		const manifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'serializable',
			category: 'measurement',
			install: [
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/{{id}}.js',
				},
			],
			onConsentGranted: [
				{
					type: 'callGlobal',
					global: 'recorder',
					args: ['{{id}}', '{{config}}'],
				},
			],
		};

		const resolved = compileManifest(manifest, {
			id: 'vendor-id',
			config: { enabled: true },
		});
		const json = JSON.stringify(resolved);

		expect(json).not.toContain('{{');
		expect(JSON.parse(json)).toEqual({
			kind: 'c15t.vendor-manifest',
			schemaVersion: 1,
			vendor: 'serializable',
			category: 'measurement',
			bootstrapSteps: [],
			setupSteps: [],
			loadScript: {
				type: 'loadScript',
				src: 'https://cdn.example.com/vendor-id.js',
			},
			afterLoadSteps: [],
			onBeforeLoadGrantedSteps: [],
			onBeforeLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			onLoadDeniedSteps: [],
			onConsentChangeSteps: [],
			onConsentGrantedSteps: [
				{
					type: 'callGlobal',
					global: 'recorder',
					args: ['vendor-id', { enabled: true }],
				},
			],
			onConsentDeniedSteps: [],
		});
	});

	it('caches compiled manifests for repeated resolves with the same config', () => {
		const compileSpy = vi.spyOn(compileEngine, 'compileManifest');
		const manifest: VendorManifest = {
			...vendorManifestContract,
			vendor: 'cached-resolve',
			category: 'measurement',
			install: [
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/{{id}}.js',
				},
			],
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
			kind: VENDOR_MANIFEST_KIND,
			schemaVersion: VENDOR_MANIFEST_SCHEMA_VERSION,
			vendor: 'external',
			category: 'measurement',
			bootstrapSteps: [],
			setupSteps: [],
			loadScript: {
				type: 'loadScript',
				src: 'https://cdn.example.com/external.js',
				async: true,
				defer: true,
				attributes: { 'data-test': 'ok' },
			},
			afterLoadSteps: [],
			onBeforeLoadGrantedSteps: [],
			onBeforeLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			onLoadDeniedSteps: [],
			onConsentChangeSteps: [],
			onConsentGrantedSteps: [],
			onConsentDeniedSteps: [],
		});
		const callbackOnly = resolvedManifestToScript({
			kind: VENDOR_MANIFEST_KIND,
			schemaVersion: VENDOR_MANIFEST_SCHEMA_VERSION,
			vendor: 'callback-only',
			category: 'marketing',
			bootstrapSteps: [],
			setupSteps: [],
			afterLoadSteps: [],
			onBeforeLoadGrantedSteps: [],
			onBeforeLoadDeniedSteps: [],
			onLoadGrantedSteps: [],
			onLoadDeniedSteps: [],
			onConsentChangeSteps: [],
			onConsentGrantedSteps: [],
			onConsentDeniedSteps: [],
		});

		expect(external).toMatchObject({
			id: 'external',
			category: 'measurement',
			src: 'https://cdn.example.com/external.js',
			async: true,
			defer: true,
			attributes: { 'data-test': 'ok' },
		});
		expect(callbackOnly).toMatchObject({
			id: 'callback-only',
			category: 'marketing',
			callbackOnly: true,
		});
	});

	it('executes structured startup steps directly during onBeforeLoad', () => {
		const manifest = createManifest({
			vendor: 'structured-startup',
			category: 'measurement',
			bootstrap: [
				{ type: 'setGlobal', name: 'dataLayer', value: [] },
				{
					type: 'defineQueueFunction',
					name: 'gtag',
					queue: 'dataLayer',
				},
			],
			install: [
				{
					type: 'callGlobal',
					global: 'gtag',
					args: ['js', '{{loadTime}}'],
				},
				{
					type: 'callGlobal',
					global: 'gtag',
					args: ['config', 'G-ORDER'],
				},
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/vendor.js',
				},
			],
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
		});

		const resolved = resolvedManifestToScript(
			compileManifest(manifest, {
				loadTime: new Date('2026-01-01T00:00:00.000Z'),
			})
		);
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		resolved.onBeforeLoad?.({
			id: resolved.id,
			elementId: resolved.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

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

	it('runs bootstrap before default consent signaling and setup', () => {
		const manifest = createManifest({
			vendor: 'ordered-google',
			category: 'necessary',
			alwaysLoad: true,
			bootstrap: [
				{
					type: 'setGlobal',
					name: 'dataLayer',
					value: [],
					ifUndefined: true,
				},
				{
					type: 'defineQueueFunction',
					name: 'gtag',
					queue: 'dataLayer',
					pushStyle: 'array',
				},
			],
			install: [
				{
					type: 'callGlobal',
					global: 'gtag',
					args: ['event', 'boot'],
				},
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/google.js',
				},
			],
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		expect(globalRef.dataLayer as unknown[]).toEqual([
			['consent', 'default', { ad_storage: 'denied' }],
			['event', 'boot'],
		]);
		expect(document.head.appendChild).not.toHaveBeenCalled();
	});

	it('interpolates manifest category conditions and booleans from config', () => {
		const resolved = compileManifest(
			createManifest({
				vendor: 'variable-top-level',
				category: '{{category}}',
				alwaysLoad: '{{alwaysLoad}}',
				persistAfterConsentRevoked: '{{persistAfterConsentRevoked}}',
				install: [],
			}),
			{
				category: {
					and: ['measurement', { not: 'marketing' }],
				},
				alwaysLoad: true,
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
				vendor: 'conditional-lifecycle',
				category: 'measurement',
				install: [
					{
						type: 'loadScript',
						src: 'https://cdn.example.com/vendor.js',
					},
				],
				onBeforeLoadDenied: [
					{
						type: 'setGlobal',
						name: 'databuddyConfig',
						value: {
							disabled: true,
						},
					},
				],
				onLoadGranted: [
					{
						type: 'setGlobalPath',
						path: ['databuddy', 'options', 'disabled'],
						value: false,
					},
				],
				onConsentDenied: [
					{
						type: 'setGlobalPath',
						path: ['databuddy', 'options', 'disabled'],
						value: true,
					},
				],
			})
		);
		const globalRef = globalThis as TestGlobal;
		globalRef.databuddy = {
			options: {
				disabled: true,
			},
		};

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

		expect(globalRef.databuddyConfig).toEqual({
			disabled: true,
		});

		script.onLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		expect(
			(globalRef.databuddy as { options: { disabled: boolean } }).options
				.disabled
		).toBe(false);

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: false,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		});

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
			vendor: 'consent-order',
			category: 'marketing',
			install: [],
			onConsentChange: [
				{ type: 'callGlobal', global: 'recorder', args: ['change'] },
			],
			onConsentGranted: [
				{ type: 'callGlobal', global: 'recorder', args: ['granted'] },
			],
			onConsentDenied: [
				{ type: 'callGlobal', global: 'recorder', args: ['denied'] },
			],
			consentMapping: {
				marketing: ['ad_storage'],
			},
			consentSignal: 'gtag',
		});

		const script = resolvedManifestToScript(compileManifest(manifest));

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: true,
				experience: false,
			},
		});

		expect(calls).toEqual([
			['consent', 'update', { ad_storage: 'granted' }],
			['change'],
			['granted'],
		]);
	});

	it('emits phase and step debug events for manifest execution', () => {
		const events: ScriptDebugEvent[] = [];
		const unsubscribe = subscribeToScriptDebugEvents((event) => {
			events.push(event);
		});
		const manifest = createManifest({
			vendor: 'debuggable-manifest',
			category: 'measurement',
			bootstrap: [{ type: 'setGlobal', name: 'dataLayer', value: [] }],
			install: [
				{
					type: 'pushToQueue',
					queue: 'dataLayer',
					value: { event: 'boot' },
				},
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/vendor.js',
				},
			],
			onConsentChange: [
				{
					type: 'pushToQueue',
					queue: 'dataLayer',
					value: { event: 'consent-update' },
				},
			],
		});

		const script = resolvedManifestToScript(compileManifest(manifest));
		const globalRef = globalThis as TestGlobal;
		globalRef.dataLayer = [];

		script.onBeforeLoad?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		script.onConsentChange?.({
			id: script.id,
			elementId: script.id,
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: true,
				marketing: false,
				experience: false,
			},
		});

		unsubscribe();

		expect(events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'manifest-runtime',
					scope: 'phase',
					action: 'phase_start',
					scriptId: 'debuggable-manifest',
					callback: 'onBeforeLoad',
					phase: 'bootstrap',
				}),
				expect.objectContaining({
					source: 'manifest-runtime',
					scope: 'step',
					action: 'step_executed',
					scriptId: 'debuggable-manifest',
					callback: 'onBeforeLoad',
					phase: 'setup',
					stepType: 'pushToQueue',
				}),
				expect.objectContaining({
					source: 'manifest-runtime',
					scope: 'phase',
					action: 'phase_complete',
					scriptId: 'debuggable-manifest',
					callback: 'onConsentChange',
					phase: 'onConsentChange',
				}),
			])
		);
	});

	it('rejects manifests with an unsupported contract', () => {
		expect(() =>
			compileManifest({
				...vendorManifestContract,
				schemaVersion: 999 as typeof VENDOR_MANIFEST_SCHEMA_VERSION,
				vendor: 'unsupported-version',
				category: 'necessary',
				install: [],
			})
		).toThrow('Unsupported manifest schema version');

		expect(() =>
			compileManifest({
				...vendorManifestContract,
				kind: 'legacy-manifest' as typeof VENDOR_MANIFEST_KIND,
				vendor: 'unsupported-kind',
				category: 'necessary',
				install: [],
			})
		).toThrow('Unsupported manifest kind');
	});
});
