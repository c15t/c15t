/** Measure production IAB pages against a pinned local GVL, with cold/warm caches. */
/* oxlint-disable no-await-in-loop -- Samples and cache states must run serially. */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve as resolvePath } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { gzipSync, gunzipSync } from 'node:zlib';

import {
	resolvePolicyRules,
	writePolicyResolutionWire,
	c15tProtocolHeaders,
} from '@c15t/core';
import type { GlobalVendorList } from '@c15t/core';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import { chromium } from 'playwright';

const [appRoot, label, output] = process.argv.slice(2);
if (!appRoot || !label || !output) {
	throw new Error(
		'Pass repository root, revision label and output JSON. Build both apps first with C15T_BENCH_IAB=1.'
	);
}
const gvl = JSON.parse(
	gunzipSync(
		readFileSync(
			new URL(
				'../../reports/iab-payload-2026-09-14/gvl-176.json.gz',
				import.meta.url
			)
		)
	).toString()
) as GlobalVendorList;
const policy = resolvePolicyRules({
	countryCode: 'DE',
	regionCode: null,
	rules: [
		{ id: 'iab', match: { isDefault: true }, model: 'iab', prompt: 'choice' },
	],
});
if (policy.status !== 'matched') {
	throw new Error('Expected IAB policy');
}
const manifest = {
	branding: 'c15t' as const,
	cmpId: 28,
	iab: { enabled: true, gvl: { url: 'http://127.0.0.1:4325/gvl' } },
	policyPacks: [
		{
			fingerprints: policy.fingerprints,
			match: { isDefault: true },
			rule: policy.policy,
		},
	],
	revision: 'iab-page-benchmark',
	schemaVersion: 2 as const,
};
const init = await createManifestTransport({
	fetchGvl: () => Promise.resolve(gvl),
	inputs: { country: 'DE', language: 'en' },
	manifest,
}).init({ overrides: {}, user: null });
// Both revisions receive the same full upstream response.
const inline = {
	...init,
	gvl,
	gvlReference: undefined,
	policyResolution: writePolicyResolutionWire(policy),
};
const fixture = createServer((req, res) => {
	res.setHeader('access-control-allow-origin', '*');
	res.setHeader('access-control-allow-headers', '*');
	if (req.method === 'OPTIONS') {
		res.end();
		return;
	}
	for (const [key, value] of Object.entries(c15tProtocolHeaders)) {
		res.setHeader(key, value);
	}
	res.setHeader('content-type', 'application/json');
	const path = new URL(req.url ?? '/', 'http://localhost').pathname;
	const payloads: Record<string, unknown> = {
		'/gvl': gvl,
		'/manifest': manifest,
	};
	const body = JSON.stringify(payloads[path] ?? inline);
	res.setHeader(
		'cache-control',
		path === '/gvl' ? 'public, max-age=86400' : 'private, no-store'
	);
	res.setHeader('content-encoding', 'gzip');
	res.end(gzipSync(body));
});
await new Promise<void>((resolve) => {
	fixture.listen(4325, '127.0.0.1', resolve);
});
const browser = await chromium.launch();
const results = [];
try {
	for (const framework of ['tanstack-start', 'nuxt'] as const) {
		const cwd = resolvePath(appRoot, `benchmarks/${framework}-browser-bench`);
		const port = framework === 'nuxt' ? 4313 : 4314;
		const server = spawn(
			'node',
			[framework === 'nuxt' ? '.output/server/index.mjs' : 'scripts/serve.mjs'],
			{
				cwd,
				env: {
					...process.env,
					C15T_BENCH_MANIFEST_URL: 'http://127.0.0.1:4325/manifest',
					HOST: '127.0.0.1',
					NUXT_PUBLIC_C15T_BACKEND_URL: 'http://127.0.0.1:4325',
					PORT: String(port),
				},
				stdio: ['ignore', 'ignore', 'inherit'],
			}
		);
		try {
			const url = `http://127.0.0.1:${port}/${framework === 'nuxt' ? 'ssr' : 'manifest-ssr'}`;
			for (let attempt = 0; attempt < 100; attempt += 1) {
				try {
					const response = await fetch(url);
					if (response.ok) {
						break;
					}
				} catch {
					// The listener may not be ready yet.
				}
				await sleep(100);
			}
			const html = await (await fetch(url)).text();
			if (!html.includes('iab-consent-banner')) {
				throw new Error(`${framework}: missing SSR IAB banner`);
			}
			const samples = [];
			let bannerText = '';
			for (let iteration = 0; iteration < 9; iteration += 1) {
				const context = await browser.newContext();
				const page = await context.newPage();
				const errors: string[] = [];
				page.on('pageerror', (e) => errors.push(e.message));
				await page.addInitScript(() => {
					const state = { bannerMs: 0, cls: 0, cmpMs: 0, longTaskMs: 0 };
					Object.assign(window, { __iabPageBench: state });
					new PerformanceObserver((list) => {
						for (const entry of list.getEntries()) {
							const shift = entry as PerformanceEntry & {
								hadRecentInput: boolean;
								value: number;
							};
							if (!shift.hadRecentInput) {
								state.cls += shift.value;
							}
						}
					}).observe({ buffered: true, type: 'layout-shift' });
					new PerformanceObserver((list) => {
						for (const entry of list.getEntries()) {
							state.longTaskMs += entry.duration;
						}
					}).observe({ buffered: true, type: 'longtask' });
					const poll = () => {
						if (
							!state.bannerMs &&
							document.querySelector(
								'[data-testid="iab-consent-banner-accept-button"]'
							)
						) {
							state.bannerMs = performance.now();
						}
						const api = (
							window as unknown as {
								__tcfapi?: (
									command: string,
									version: number,
									callback: (data: { cmpStatus?: string }) => void
								) => void;
							}
						).__tcfapi;
						api?.('ping', 2, (data) => {
							if (data.cmpStatus === 'loaded' && !state.cmpMs) {
								state.cmpMs = performance.now();
							}
						});
						requestAnimationFrame(poll);
					};
					requestAnimationFrame(poll);
				});
				for (const cache of ['cold', 'warm']) {
					await page.goto(url, { waitUntil: 'networkidle' });
					await page.getByTestId('iab-consent-banner-accept-button').waitFor();
					bannerText =
						(await page.getByTestId('iab-consent-banner-root').textContent()) ??
						'';
					if (!bannerText) {
						throw new Error('Expected banner copy');
					}
					const sample = await page.evaluate(() => {
						const nav = performance.getEntriesByType(
							'navigation'
						)[0] as PerformanceNavigationTiming;
						return {
							...(window as unknown as { __iabPageBench: object })
								.__iabPageBench,
							htmlCompleteMs: nav.responseEnd,
							resources: performance.getEntriesByType('resource').map((e) => {
								const r = e as PerformanceResourceTiming;
								return {
									bytes: r.transferSize,
									duration: r.duration,
									encodedBytes: r.encodedBodySize,
									url: r.name,
								};
							}),
							ttfbMs: nav.responseStart,
						};
					});
					if (errors.length) {
						throw new Error(errors.join('\n'));
					}
					if (label === 'after' && !(sample as { cmpMs?: number }).cmpMs) {
						throw new Error(`${framework}: CMP did not become ready`);
					}
					if (iteration >= 2) {
						samples.push({
							cache,
							...sample,
							resources: sample.resources.filter(
								(r) => r.url.includes('c15t-gvl') || r.url.endsWith('/init')
							),
						});
					}
				}
				await context.close();
			}
			results.push({
				bannerText,
				framework,
				htmlBytes: Buffer.byteLength(html),
				htmlGzipBytes: gzipSync(html).length,
				samples,
				scenario: framework === 'nuxt' ? 'ssr-hosted' : 'manifest-ssr',
			});
		} finally {
			if (server.exitCode === null && server.signalCode === null) {
				await new Promise<void>((resolve) => {
					server.once('exit', () => resolve());
					server.kill('SIGTERM');
				});
			}
		}
	}
	writeFileSync(
		output,
		JSON.stringify(
			{ browser: await browser.version(), label, results },
			null,
			2
		)
	);
} finally {
	await browser.close();
	fixture.close();
}
