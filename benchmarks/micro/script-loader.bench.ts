import {
	configureConsentManager,
	createConsentManagerStore,
	type Script,
} from 'c15t';
import { bench, run } from 'mitata';

// Mock DOM for Node.js environment
if (typeof globalThis.document === 'undefined') {
	const mockElement = {
		setAttribute: () => {},
		getAttribute: () => null,
		appendChild: () => {},
		removeChild: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
	};

	globalThis.document = {
		createElement: () => ({ ...mockElement }),
		head: { ...mockElement, appendChild: () => {} },
		body: { ...mockElement, appendChild: () => {} },
		getElementById: () => null,
		querySelector: () => null,
		querySelectorAll: () => [],
		cookie: '',
	} as unknown as Document;
}

// Mock MutationObserver for Node.js environment
if (typeof globalThis.MutationObserver === 'undefined') {
	globalThis.MutationObserver = class MutationObserver {
		constructor(_callback: MutationCallback) {}
		observe(_target: Node, _options?: MutationObserverInit) {}
		disconnect() {}
		takeRecords(): MutationRecord[] {
			return [];
		}
	} as unknown as typeof MutationObserver;
}

// Mock window for Node.js environment
if (typeof globalThis.window === 'undefined') {
	globalThis.window = globalThis as unknown as Window & typeof globalThis;
}

if (typeof globalThis.localStorage === 'undefined') {
	const store: Record<string, string> = {};
	globalThis.localStorage = {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			for (const key in store) {
				delete store[key];
			}
		},
		key: (index: number) => Object.keys(store)[index] || null,
		length: Object.keys(store).length,
	} as Storage;
}

// Sample script configurations (typical setup)
const simpleScripts: Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
		category: 'measurement',
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
		category: 'marketing',
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
	},
];

const mediumScripts: Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
		category: 'measurement',
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
		category: 'marketing',
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
	},
	{
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
		category: 'functionality',
	},
	{
		id: 'analytics',
		src: 'https://www.google-analytics.com/analytics.js',
		category: 'measurement',
	},
];

const complexScripts: Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
		category: 'measurement',
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
		category: 'marketing',
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
	},
	{
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
		category: 'functionality',
	},
	// Complex conditions
	{
		id: 'analytics-marketing',
		src: 'https://example.com/combined.js',
		category: { and: ['measurement', 'marketing'] },
	},
	{
		id: 'optional-tracking',
		src: 'https://example.com/optional.js',
		category: { or: ['measurement', 'functionality'] },
	},
	{
		id: 'non-marketing',
		src: 'https://example.com/non-marketing.js',
		category: { not: 'marketing' },
	},
];

const manyScripts: Script[] = [
	...complexScripts,
	{
		id: 'linkedin',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		category: 'marketing',
	},
	{
		id: 'twitter',
		src: 'https://static.ads-twitter.com/uwt.js',
		category: 'marketing',
	},
	{
		id: 'tiktok',
		src: 'https://analytics.tiktok.com/i18n/pixel/events.js',
		category: 'marketing',
	},
	{
		id: 'pinterest',
		src: 'https://ct.pinterest.com/ct.js',
		category: 'marketing',
	},
	{
		id: 'reddit',
		src: 'https://www.redditstatic.com/ads/pixel.js',
		category: 'marketing',
	},
	{
		id: 'segment',
		src: 'https://cdn.segment.com/analytics.js',
		category: 'measurement',
	},
	{
		id: 'mixpanel',
		src: 'https://cdn.mxpnl.com/libs/mixpanel.js',
		category: 'measurement',
	},
	{
		id: 'amplitude',
		src: 'https://cdn.amplitude.com/libs/amplitude.js',
		category: 'measurement',
	},
];

const manager = configureConsentManager({ mode: 'offline' });

// Store creation with scripts
bench('createStore - no scripts', () => {
	createConsentManagerStore(manager);
});

bench('createStore - 3 simple scripts', () => {
	createConsentManagerStore(manager, { scripts: simpleScripts });
});

bench('createStore - 5 scripts (mixed)', () => {
	createConsentManagerStore(manager, { scripts: mediumScripts });
});

bench('createStore - 7 scripts (complex conditions)', () => {
	createConsentManagerStore(manager, { scripts: complexScripts });
});

bench('createStore - 15 scripts (many)', () => {
	createConsentManagerStore(manager, { scripts: manyScripts });
});

// Script update operations
bench('updateScripts - 3 simple scripts', () => {
	const store = createConsentManagerStore(manager, { scripts: simpleScripts });
	store.getState().updateScripts();
});

bench('updateScripts - 7 scripts (complex conditions)', () => {
	const store = createConsentManagerStore(manager, { scripts: complexScripts });
	store.getState().updateScripts();
});

bench('updateScripts - 15 scripts (many)', () => {
	const store = createConsentManagerStore(manager, { scripts: manyScripts });
	store.getState().updateScripts();
});

// Dynamic script addition
bench('setScripts - add 3 scripts', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setScripts(simpleScripts);
});

bench('setScripts - add 7 scripts (complex)', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setScripts(complexScripts);
});

bench('setScripts - add 15 scripts', () => {
	const store = createConsentManagerStore(manager);
	store.getState().setScripts(manyScripts);
});

// Per-script category evaluation
bench('has() for each script - 3 simple', () => {
	const store = createConsentManagerStore(manager);
	const state = store.getState();
	for (const script of simpleScripts) {
		state.has(script.category);
	}
});

bench('has() for each script - 7 complex', () => {
	const store = createConsentManagerStore(manager);
	const state = store.getState();
	for (const script of complexScripts) {
		state.has(script.category);
	}
});

bench('has() for each script - 15 mixed', () => {
	const store = createConsentManagerStore(manager);
	const state = store.getState();
	for (const script of manyScripts) {
		state.has(script.category);
	}
});

await run();
