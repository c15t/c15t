#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
/**
 * Rich init comparison — v2 full `/init` response application vs v3.
 *
 * Feeds both paths the SAME full /init payload (translations, policy,
 * policyDecision, branding, GVL, etc.) and measures the cost of folding
 * it onto the store/snapshot. Isolates framework overhead from network.
 */
import { join } from 'node:path';

import { configureConsentManager, createConsentManagerStore } from '@c15t/core';
import { createConsentKernel } from '@c15t/core/v3';
import type { InitResponse, KernelTransport } from '@c15t/core/v3';

import { ensureBenchmarkDom } from './runtime-setup';

ensureBenchmarkDom();

const FULL_INIT_PAYLOAD: InitResponse = {
	branding: 'c15t',
	jurisdiction: 'GDPR',
	location: { countryCode: 'DE', regionCode: 'BE' },
	policy: {
		consent: {
			categories: ['necessary', 'functionality', 'marketing', 'measurement'],
			model: 'opt-in',
			preselectedCategories: ['necessary'],
			scopeMode: 'permissive',
		},
		id: 'gdpr-default',
		model: 'opt-in',
		ui: {
			banner: {
				allowedActions: ['accept', 'reject', 'customize'],
				direction: 'row',
				primaryActions: ['accept', 'reject'],
				scrollLock: false,
				uiProfile: 'balanced',
			},
			dialog: {
				allowedActions: ['accept', 'reject', 'customize'],
				direction: 'column',
				primaryActions: ['accept'],
				scrollLock: true,
				uiProfile: 'balanced',
			},
			mode: 'banner',
		},
	} as InitResponse['policy'],
	policyDecision: {
		fingerprint: 'abc123',
		matchedBy: 'region',
	} as InitResponse['policyDecision'],
	policySnapshotToken: 'sig-abc123',
	showConsentBanner: true,
	translations: {
		language: 'de',
		translations: {
			common: {
				acceptAll: 'Alle akzeptieren',
				customize: 'Anpassen',
				rejectAll: 'Alle ablehnen',
				save: 'Speichern',
			},
			cookieBanner: {
				description: 'Diese Website verwendet Cookies...',
				title: 'Wir verwenden Cookies',
			},
		} as InitResponse['translations']['translations'],
	},
};

const V2_API_PAYLOAD = {
	branding: 'c15t',
	jurisdiction: { code: 'GDPR' },
	location: { countryCode: 'DE', regionCode: 'BE' },
	policy: FULL_INIT_PAYLOAD.policy,
	policyDecision: FULL_INIT_PAYLOAD.policyDecision,
	policySnapshotToken: FULL_INIT_PAYLOAD.policySnapshotToken,
	showConsentBanner: true,
	translations: FULL_INIT_PAYLOAD.translations,
};

// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
const mockFetchV2 = async () =>
	new Response(JSON.stringify(V2_API_PAYLOAD), {
		headers: { 'content-type': 'application/json' },
		status: 200,
	});
// oxlint-disable-next-line require-await -- Preserve sequential execution and callback compatibility.
const mockFetchV3 = async () => new Response('ok');

const _measureSync = function _measureSync(
	iterations: number,
	fn: () => void
): number[] {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
};

const measureAsync = async function measureAsync(
	iterations: number,
	fn: () => Promise<void>
): Promise<number[]> {
	const samples: number[] = [];
	for (let i = 0; i < iterations; i += 1) {
		const start = performance.now();
		// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
		await fn();
		samples.push((performance.now() - start) * 1000);
	}
	return samples;
};

interface Stats {
	avg: number;
	median: number;
	p95: number;
}
const summarize = function summarize(samples: number[]): Stats {
	const sorted = [...samples].sort((a, b) => a - b);
	return {
		avg: samples.reduce((a, b) => a + b, 0) / samples.length,
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
	};
};

const pct = function pct(a: number, b: number): string {
	const d = ((b - a) / a) * 100;
	return `${(d >= 0 ? '+' : '') + d.toFixed(1)}%`;
};

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? '50');

// v2: createStore (which fires init automatically with mocked fetch) and
//     explicit re-init.
globalThis.fetch = mockFetchV2 as unknown as typeof globalThis.fetch;
const v2Manager = configureConsentManager({ mode: 'hosted' });

const v2Samples = await measureAsync(ITERATIONS, async () => {
	const store = createConsentManagerStore(v2Manager, {
		initialConsentCategories: ['necessary', 'marketing', 'measurement'],
	});
	await store.getState().initConsentManager();
});

// v3: hosted transport with rich payload
globalThis.fetch = mockFetchV3 as unknown as typeof globalThis.fetch;

const richTransport: KernelTransport = {
	// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
	async init() {
		return FULL_INIT_PAYLOAD;
	},
};

const v3Samples = await measureAsync(ITERATIONS, async () => {
	const kernel = createConsentKernel({ transport: richTransport });
	await kernel.commands.init();
});

const v2 = summarize(v2Samples);
const v3 = summarize(v3Samples);

console.log('# Rich init — v2 vs v3 (µs, framework overhead only)\n');
console.log(`Iterations: ${ITERATIONS}\n`);
console.log('| Path | median | p95 |');
console.log('|---|---:|---:|');
console.log(
	`| v2 createStore + initConsentManager | ${v2.median.toFixed(2)} | ${v2.p95.toFixed(2)} |`
);
console.log(
	`| v3 createKernel + commands.init | ${v3.median.toFixed(2)} | ${v3.p95.toFixed(2)} |`
);
console.log(
	`| **Δ** | **${pct(v2.median, v3.median)}** | **${pct(v2.p95, v3.p95)}** |`
);

const outputDir =
	process.env.BENCH_OUTPUT_DIR ?? '../../.benchmarks/current/core-v3-runtime';
mkdirSync(outputDir, { recursive: true });
writeFileSync(
	join(outputDir, 'rich-init-compare.json'),
	`${JSON.stringify({ generatedAt: new Date().toISOString(), iterations: ITERATIONS, suite: 'rich-init-compare', v2, v3 }, null, 2)}\n`
);
