import { createConsentKernel, has } from '@c15t/core';
import type { Script } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';

import { bench, runMicroBenchmarkSuite } from './wrapper';

// Mock DOM for Node.js environment
if (typeof globalThis.document === 'undefined') {
	const mockElement = {
		addEventListener: () => {
			// Intentionally empty.
		},
		appendChild: () => {
			// Intentionally empty.
		},
		getAttribute: () => null,
		removeChild: () => {
			// Intentionally empty.
		},
		removeEventListener: () => {
			// Intentionally empty.
		},
		setAttribute: () => {
			// Intentionally empty.
		},
	};

	globalThis.document = {
		body: {
			...mockElement,
			appendChild: () => {
				// Intentionally empty.
			},
		},
		cookie: '',
		createElement: () => ({ ...mockElement }),
		getElementById: () => null,
		head: {
			...mockElement,
			appendChild: () => {
				// Intentionally empty.
			},
		},
		querySelector: () => null,
		querySelectorAll: () => [],
	} as unknown as Document;
}

// Mock MutationObserver for Node.js environment
if (typeof globalThis.MutationObserver === 'undefined') {
	globalThis.MutationObserver = class MutationObserver {
		observe(_target: Node, _options?: MutationObserverInit) {
			void this;
		}
		disconnect() {
			void this;
		}
		takeRecords(): MutationRecord[] {
			void this;
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
		clear: () => {
			for (const key in store) {
				if (Object.hasOwn(store, key)) {
					Reflect.deleteProperty(store, key);
				}
			}
		},
		getItem: (key: string) => store[key] || null,
		key: (index: number) => Object.keys(store)[index] || null,
		length: Object.keys(store).length,
		removeItem: (key: string) => {
			Reflect.deleteProperty(store, key);
		},
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
	} as Storage;
}

// Sample script configurations (typical setup)
const simpleScripts: Script[] = [
	{
		category: 'measurement',
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
	},
	{
		category: 'marketing',
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
	},
	{
		category: 'measurement',
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
	},
];

const mediumScripts: Script[] = [
	{
		category: 'measurement',
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
	},
	{
		category: 'marketing',
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
	},
	{
		category: 'measurement',
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
	},
	{
		category: 'functionality',
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
	},
	{
		category: 'measurement',
		id: 'analytics',
		src: 'https://www.google-analytics.com/analytics.js',
	},
];

const complexScripts: Script[] = [
	{
		category: 'measurement',
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js',
	},
	{
		category: 'marketing',
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/sdk.js',
	},
	{
		category: 'measurement',
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
	},
	{
		category: 'functionality',
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
	},
	// Complex conditions
	{
		category: { and: ['measurement', 'marketing'] },
		id: 'analytics-marketing',
		src: 'https://example.com/combined.js',
	},
	{
		category: { or: ['measurement', 'functionality'] },
		id: 'optional-tracking',
		src: 'https://example.com/optional.js',
	},
	{
		category: { not: 'marketing' },
		id: 'non-marketing',
		src: 'https://example.com/non-marketing.js',
	},
];

const manyScripts: Script[] = [
	...complexScripts,
	{
		category: 'marketing',
		id: 'linkedin',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
	},
	{
		category: 'marketing',
		id: 'twitter',
		src: 'https://static.ads-twitter.com/uwt.js',
	},
	{
		category: 'marketing',
		id: 'tiktok',
		src: 'https://analytics.tiktok.com/i18n/pixel/events.js',
	},
	{
		category: 'marketing',
		id: 'pinterest',
		src: 'https://ct.pinterest.com/ct.js',
	},
	{
		category: 'marketing',
		id: 'reddit',
		src: 'https://www.redditstatic.com/ads/pixel.js',
	},
	{
		category: 'measurement',
		id: 'segment',
		src: 'https://cdn.segment.com/analytics.js',
	},
	{
		category: 'measurement',
		id: 'mixpanel',
		src: 'https://cdn.mxpnl.com/libs/mixpanel.js',
	},
	{
		category: 'measurement',
		id: 'amplitude',
		src: 'https://cdn.amplitude.com/libs/amplitude.js',
	},
];

const conditionKernel = createConsentKernel();
const benchmarkConsents = {
	...conditionKernel.getSnapshot().effectivePermissions,
};

const runWithLoader = function runWithLoader(
	scripts: Script[],
	update?: Script[]
): void {
	const kernel = createConsentKernel();
	const loader = createScriptLoader({
		emitToV2DebugListeners: false,
		kernel,
		scripts,
	});
	if (update) {
		loader.updateScripts(update);
	}
	loader.dispose();
	kernel.dispose();
};

// Loader creation with scripts
bench('createScriptLoader - no scripts', () => {
	runWithLoader([]);
});

bench('createScriptLoader - 3 simple scripts', () => {
	runWithLoader(simpleScripts);
});

bench('createScriptLoader - 5 scripts (mixed)', () => {
	runWithLoader(mediumScripts);
});

bench('createScriptLoader - 7 scripts (complex conditions)', () => {
	runWithLoader(complexScripts);
});

bench('createScriptLoader - 15 scripts (many)', () => {
	runWithLoader(manyScripts);
});

// Script update operations
bench('updateScripts - 3 simple scripts', () => {
	runWithLoader(mediumScripts, simpleScripts);
});

bench('updateScripts - 7 scripts (complex conditions)', () => {
	runWithLoader(mediumScripts, complexScripts);
});

bench('updateScripts - 15 scripts (many)', () => {
	runWithLoader(mediumScripts, manyScripts);
});

// Dynamic script addition
bench('setScripts - add 3 scripts', () => {
	runWithLoader([], simpleScripts);
});

bench('setScripts - add 7 scripts (complex)', () => {
	runWithLoader([], complexScripts);
});

bench('setScripts - add 15 scripts', () => {
	runWithLoader([], manyScripts);
});

// Per-script category evaluation
bench('has() for each script - 3 simple', () => {
	for (const script of simpleScripts) {
		has(script.category, benchmarkConsents);
	}
});

bench('has() for each script - 7 complex', () => {
	for (const script of complexScripts) {
		has(script.category, benchmarkConsents);
	}
});

bench('has() for each script - 15 mixed', () => {
	for (const script of manyScripts) {
		has(script.category, benchmarkConsents);
	}
});

await runMicroBenchmarkSuite('script-loader');

conditionKernel.dispose();
