import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as compileEngine from './engine/compile';
import { compileManifest } from './engine/compile';
import { resolvedManifestToScript } from './engine/runtime';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

type TestGlobal = typeof globalThis & Record<string, unknown>;

function setupMockBrowser() {
	const globalRef = globalThis as TestGlobal;
	const appendedNodes: Array<Record<string, unknown>> = [];
	const scriptAnchor = {
		parentNode: {
			insertBefore: vi.fn((node: Record<string, unknown>) => {
				appendedNodes.push(node);
				return node;
			}),
		},
	};

	const document = {
		head: {
			appendChild: vi.fn((node: Record<string, unknown>) => {
				appendedNodes.push(node);
				if (
					typeof node.textContent === 'string' &&
					node.textContent.length > 0
				) {
					new Function('window', 'document', node.textContent)(
						globalRef.window,
						globalRef.document
					);
				}
				return node;
			}),
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

	return { appendedNodes };
}

describe('scripts engine', () => {
	beforeEach(() => {
		setupMockBrowser();
	});

	afterEach(() => {
		const globalRef = globalThis as TestGlobal;
		vi.unstubAllGlobals();
		delete globalRef.gtag;
		delete globalRef.dataLayer;
		delete globalRef.recorder;
		delete globalRef.__calls;
	});

	it('preserves typed values for exact placeholders', () => {
		const manifest: VendorManifest = {
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
					type: 'pushToDataLayer',
					data: {
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
			type: 'pushToDataLayer',
			data: {
				label: 'state=granted',
				nested: ['abc', 'config={"enabled":true}'],
			},
		});
	});

	it('extracts install steps into loadScript, textContent, and setup phases', () => {
		const loadManifest: VendorManifest = {
			vendor: 'load-script',
			category: 'necessary',
			install: [
				{ type: 'setGlobal', name: 'before', value: true },
				{
					type: 'loadScript',
					src: 'https://cdn.example.com/a.js',
					async: true,
				},
				{ type: 'inlineScript', code: 'window.afterLoad = true;' },
			],
		};
		const textManifest: VendorManifest = {
			vendor: 'inline-only',
			category: 'necessary',
			install: [
				{ type: 'setGlobal', name: 'config', value: { ready: true } },
				{ type: 'inlineScript', code: 'window.inlineA = true;' },
				{ type: 'inlineScript', code: 'window.inlineB = true;' },
			],
		};

		const loadResolved = compileManifest(loadManifest);
		const textResolved = compileManifest(textManifest);

		expect(loadResolved.loadScript).toEqual({
			type: 'loadScript',
			src: 'https://cdn.example.com/a.js',
			async: true,
		});
		expect(loadResolved.textContent).toBeUndefined();
		expect(loadResolved.setupSteps).toEqual([
			{ type: 'setGlobal', name: 'before', value: true },
			{ type: 'inlineScript', code: 'window.afterLoad = true;' },
		]);

		expect(textResolved.loadScript).toBeUndefined();
		expect(textResolved.textContent).toBe(
			'window.inlineA = true;\nwindow.inlineB = true;'
		);
		expect(textResolved.setupSteps).toEqual([
			{ type: 'setGlobal', name: 'config', value: { ready: true } },
		]);
	});

	it('throws when install declares multiple loadScript steps', () => {
		const manifest: VendorManifest = {
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
			vendor: 'serializable',
			category: 'measurement',
			bootstrapSteps: [],
			setupSteps: [],
			loadScript: {
				type: 'loadScript',
				src: 'https://cdn.example.com/vendor-id.js',
			},
			afterLoadSteps: [],
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

	it('converts resolved manifests into Script objects for external and inline flows', () => {
		const external = resolvedManifestToScript({
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
			textContent: undefined,
			afterLoadSteps: [],
			onConsentChangeSteps: [],
			onConsentGrantedSteps: [],
			onConsentDeniedSteps: [],
		});
		const inline = resolvedManifestToScript({
			vendor: 'inline',
			category: 'marketing',
			bootstrapSteps: [],
			setupSteps: [],
			textContent: 'window.inlineExecuted = true;',
			afterLoadSteps: [],
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
		expect(inline).toMatchObject({
			id: 'inline',
			category: 'marketing',
			textContent: 'window.inlineExecuted = true;',
		});
	});

	it('runs bootstrap before default consent signaling and setup', () => {
		const manifest: VendorManifest = {
			vendor: 'ordered-google',
			category: 'necessary',
			alwaysLoad: true,
			bootstrap: [
				{
					type: 'inlineScript',
					code: `
window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(Array.from(arguments)); };
					`.trim(),
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
		};

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

		const manifest: VendorManifest = {
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
		};

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

	it('chains script overrides after engine callbacks', () => {
		const calls: string[] = [];
		const merged = applyScriptOverrides(
			{
				id: 'override-test',
				category: 'necessary',
				callbackOnly: true,
				onBeforeLoad: () => {
					calls.push('engine-before');
				},
				onLoad: () => {
					calls.push('engine-load');
				},
				onError: () => {
					calls.push('engine-error');
				},
				onConsentChange: () => {
					calls.push('engine-change');
				},
			},
			{
				onBeforeLoad: () => {
					calls.push('user-before');
				},
				onLoad: () => {
					calls.push('user-load');
				},
				onError: () => {
					calls.push('user-error');
				},
				onConsentChange: () => {
					calls.push('user-change');
				},
			}
		);

		const info = {
			id: 'override-test',
			elementId: 'override-test',
			hasConsent: true,
			consents: {
				necessary: true,
				functionality: false,
				measurement: false,
				marketing: false,
				experience: false,
			},
		};

		merged.onBeforeLoad?.(info);
		merged.onLoad?.(info);
		merged.onError?.({ ...info, error: new Error('boom') });
		merged.onConsentChange?.(info);

		expect(calls).toEqual([
			'engine-before',
			'user-before',
			'engine-load',
			'user-load',
			'engine-error',
			'user-error',
			'engine-change',
			'user-change',
		]);
	});
});
