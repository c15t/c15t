/**
 * Tests for c15t/v3/modules/script-loader.
 *
 * Verifies feature parity with v2's script-loader:
 * - load/unload based on consent
 * - alwaysLoad bypasses consent checks
 * - callbackOnly skips DOM mount
 * - persistAfterConsentRevoked leaves DOM element in place
 * - onBeforeLoad / onLoad / onError / onConsentChange fire correctly
 * - anonymizeId generates stable random IDs
 * - nested AND/OR/NOT category conditions
 * - IAB evaluation when model === 'iab'
 * - updateScripts swaps config and unloads removed scripts
 * - dispose removes elements and disconnects subscription
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createConsentKernel } from '../../../index';
import { createScriptLoader, type Script } from '../index';

// ---------------------------------------------------------------
// Minimal DOM stubs. The v3 kernel has zero browser-globals usage;
// the script-loader needs `document.createElement` + `document.head`.
// We install a fresh stub per test so assertions don't leak.
// ---------------------------------------------------------------

interface StubScriptElement {
	id: string;
	src?: string;
	textContent?: string;
	async?: boolean;
	defer?: boolean;
	nonce?: string;
	fetchPriority?: string;
	parentNode: StubParent | null;
	listeners: Map<string, Array<(event: unknown) => void>>;
	attributes: Map<string, string>;
	setAttribute(key: string, value: string): void;
	addEventListener(event: string, handler: (event: unknown) => void): void;
	removeEventListener(event: string, handler: (event: unknown) => void): void;
	triggerEvent(event: string, payload?: unknown): void;
}

interface StubParent {
	children: StubScriptElement[];
	appendChild(el: StubScriptElement): void;
	removeChild(el: StubScriptElement): void;
}

function createStubElement(): StubScriptElement {
	const el: StubScriptElement = {
		id: '',
		parentNode: null,
		listeners: new Map(),
		attributes: new Map(),
		setAttribute(key, value) {
			this.attributes.set(key, value);
		},
		addEventListener(event, handler) {
			const bucket = this.listeners.get(event) ?? [];
			bucket.push(handler);
			this.listeners.set(event, bucket);
		},
		removeEventListener(event, handler) {
			const bucket = this.listeners.get(event);
			if (!bucket) return;
			const idx = bucket.indexOf(handler);
			if (idx >= 0) bucket.splice(idx, 1);
		},
		triggerEvent(event, payload) {
			const bucket = this.listeners.get(event);
			if (!bucket) return;
			for (const handler of bucket) handler(payload ?? {});
		},
	};
	return el;
}

function createStubParent(): StubParent {
	const parent: StubParent = {
		children: [],
		appendChild(el) {
			parent.children.push(el);
			el.parentNode = parent;
		},
		removeChild(el) {
			parent.children = parent.children.filter((c) => c !== el);
			el.parentNode = null;
		},
	};
	return parent;
}

let head: StubParent;
let body: StubParent;

beforeEach(() => {
	head = createStubParent();
	body = createStubParent();
	vi.stubGlobal('document', {
		createElement(tag: string) {
			if (tag !== 'script') throw new Error(`Unexpected tag: ${tag}`);
			return createStubElement();
		},
		head,
		body,
	});
	// Fake timers so inline-script setTimeout(...,0) → onLoad fires
	// deterministically.
	vi.useFakeTimers();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

// ---------------------------------------------------------------

describe('script-loader: basic load/unload on consent change', () => {
	test('mounts a script when category consent is granted', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
		});

		expect(head.children).toHaveLength(1);
		expect(head.children[0]?.src).toBe('https://example.com/gtm.js');
	});

	test('does NOT mount when consent is not granted', () => {
		const kernel = createConsentKernel();
		createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
		});

		expect(head.children).toHaveLength(0);
	});

	test('unmounts when consent is revoked', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		const script: Script = {
			id: 'gtm',
			src: 'https://example.com/gtm.js',
			category: 'marketing',
		};
		createScriptLoader({ kernel, scripts: [script] });

		expect(head.children).toHaveLength(1);
		kernel.set.consent({ marketing: false });
		expect(head.children).toHaveLength(0);
	});

	test('remounts when consent is re-granted', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		const script: Script = {
			id: 'gtm',
			src: 'https://example.com/gtm.js',
			category: 'marketing',
		};
		createScriptLoader({ kernel, scripts: [script] });

		kernel.set.consent({ marketing: false });
		expect(head.children).toHaveLength(0);
		kernel.set.consent({ marketing: true });
		expect(head.children).toHaveLength(1);
	});
});

describe('script-loader: alwaysLoad bypasses consent', () => {
	test('alwaysLoad scripts mount regardless of consent state', () => {
		const kernel = createConsentKernel();
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'gtm',
					src: 'https://example.com/gtm.js',
					category: 'marketing',
					alwaysLoad: true,
				},
			],
		});

		// marketing is false, but alwaysLoad = mounted anyway
		expect(head.children).toHaveLength(1);
	});
});

describe('script-loader: persistAfterConsentRevoked', () => {
	test('element stays in DOM even after consent revoke', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'gtm',
					src: 'https://example.com/gtm.js',
					category: 'marketing',
					persistAfterConsentRevoked: true,
				},
			],
		});

		expect(head.children).toHaveLength(1);
		kernel.set.consent({ marketing: false });
		// DOM element persists...
		expect(head.children).toHaveLength(1);
	});
});

describe('script-loader: callbackOnly skips DOM mount', () => {
	test('no element appended, onLoad still fires', () => {
		const onLoad = vi.fn();
		const kernel = createConsentKernel({
			initialConsents: { measurement: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'consent-mode',
					category: 'measurement',
					callbackOnly: true,
					onLoad,
				},
			],
		});

		expect(head.children).toHaveLength(0);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});
});

describe('script-loader: callbacks fire in sequence', () => {
	test('onBeforeLoad → (mount) → onLoad (for external scripts)', () => {
		const order: string[] = [];
		const kernel = createConsentKernel({
			initialConsents: { measurement: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'ga',
					src: 'https://example.com/ga.js',
					category: 'measurement',
					onBeforeLoad: () => order.push('before'),
					onLoad: () => order.push('load'),
				},
			],
		});

		expect(order).toEqual(['before']);
		// Simulate the browser firing the load event.
		head.children[0]?.triggerEvent('load');
		expect(order).toEqual(['before', 'load']);
	});

	test('inline script: onLoad fires asynchronously on next tick', () => {
		const onLoad = vi.fn();
		const kernel = createConsentKernel({
			initialConsents: { functionality: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'inline',
					textContent: 'console.log("hi");',
					category: 'functionality',
					onLoad,
				},
			],
		});

		expect(onLoad).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	test('onConsentChange fires when consent flips for an already-loaded script', () => {
		const onConsentChange = vi.fn();
		const kernel = createConsentKernel({
			initialConsents: { marketing: true, measurement: false },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'gtm',
					src: 'https://example.com/gtm.js',
					// Loads on marketing; observes any consent-relevant change.
					category: 'marketing',
					onConsentChange,
				},
			],
		});
		onConsentChange.mockClear();

		// Another consent slice flips → already-loaded script reconciles
		// and fires onConsentChange so the script can react.
		kernel.set.consent({ measurement: true });
		expect(onConsentChange).toHaveBeenCalled();
	});
});

describe('script-loader: anonymizeId', () => {
	test('default generates a random id; stable across reconciles', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
		});
		const firstId = head.children[0]?.id;
		expect(firstId).toMatch(/^c15t-/);
		expect(firstId).not.toBe('c15t-script-gtm');

		// Revoke + regrant should keep the same anonymized ID.
		kernel.set.consent({ marketing: false });
		kernel.set.consent({ marketing: true });
		expect(head.children[0]?.id).toBe(firstId);
	});

	test('opt out with anonymizeId:false → element id is c15t-script-<id>', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'gtm',
					src: 'https://example.com/gtm.js',
					category: 'marketing',
					anonymizeId: false,
				},
			],
		});
		expect(head.children[0]?.id).toBe('c15t-script-gtm');
	});
});

describe('script-loader: nested AND/OR/NOT conditions', () => {
	test('AND requires all', () => {
		const kernel = createConsentKernel({
			initialConsents: { measurement: true, marketing: false },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 's',
					src: 'https://example.com/s.js',
					category: { and: ['measurement', 'marketing'] },
				},
			],
		});
		expect(head.children).toHaveLength(0);

		kernel.set.consent({ marketing: true });
		expect(head.children).toHaveLength(1);
	});

	test('OR requires any', () => {
		const kernel = createConsentKernel();
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 's',
					src: 'https://example.com/s.js',
					category: { or: ['measurement', 'marketing'] },
				},
			],
		});
		expect(head.children).toHaveLength(0);

		kernel.set.consent({ marketing: true });
		expect(head.children).toHaveLength(1);
	});

	test('NOT negates', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: false },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 's',
					src: 'https://example.com/s.js',
					category: { not: 'marketing' },
				},
			],
		});
		// NOT marketing (marketing=false) → should load
		expect(head.children).toHaveLength(1);

		kernel.set.consent({ marketing: true });
		expect(head.children).toHaveLength(0);
	});
});

describe('script-loader: IAB evaluation when model="iab"', () => {
	test('vendorId gate: vendor consent drives load', () => {
		const kernel = createConsentKernel({
			initialJurisdiction: 'GDPR',
			initialIab: { enabled: true },
			initialConsents: { marketing: true },
		});

		createScriptLoader({
			kernel,
			scripts: [
				{
					id: 'vendor-script',
					src: 'https://example.com/v.js',
					category: 'marketing',
					vendorId: 755,
				},
			],
		});

		// No vendor consent → blocked even though category is true.
		expect(head.children).toHaveLength(0);

		kernel.set.iab({ vendorConsents: { '755': true } });
		expect(head.children).toHaveLength(1);

		kernel.set.iab({ vendorConsents: { '755': false } });
		expect(head.children).toHaveLength(0);
	});
});

describe('script-loader: updateScripts swaps config', () => {
	test('removed scripts unmount; added scripts mount', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true, measurement: true },
		});
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
		});
		expect(head.children).toHaveLength(1);

		loader.updateScripts([
			{
				id: 'ga',
				src: 'https://example.com/ga.js',
				category: 'measurement',
			},
		]);
		// gtm unmounted, ga mounted
		expect(head.children).toHaveLength(1);
		expect(head.children[0]?.src).toBe('https://example.com/ga.js');
	});
});

describe('script-loader: dispose', () => {
	test('removes mounted elements and stops reacting to consent', () => {
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
		});
		expect(head.children).toHaveLength(1);

		loader.dispose();
		expect(head.children).toHaveLength(0);

		// Post-dispose snapshot changes should not re-mount.
		kernel.set.consent({ marketing: false });
		kernel.set.consent({ marketing: true });
		expect(head.children).toHaveLength(0);
	});
});

describe('script-loader: onDebug emits lifecycle events', () => {
	test('emits loaded and unloaded actions', () => {
		const events: string[] = [];
		const kernel = createConsentKernel({
			initialConsents: { marketing: true },
		});
		createScriptLoader({
			kernel,
			scripts: [
				{ id: 'gtm', src: 'https://example.com/gtm.js', category: 'marketing' },
			],
			onDebug: (e) => events.push(`${e.action}:${e.scriptId}`),
		});

		expect(events).toContain('loaded:gtm');
		kernel.set.consent({ marketing: false });
		expect(events).toContain('unloaded:gtm');
	});
});
