/**
 * Measure the IAB data boundary with a captured public GVL.
 * Run from the repository root:
 * bunx tsx benchmarks/tanstack-start-browser-bench/scripts/measure-iab-payload.ts <gvl.json> <output.json>
 * Framework browser benches separately cover application startup and interaction.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { gzipSync, gunzipSync } from 'node:zlib';

import {
	deferInitGvl,
	resolveIABBannerSummary,
	resolvePolicyRules,
} from '@c15t/core';
import type { GlobalVendorList } from '@c15t/core';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import { chromium } from 'playwright';

const [source, output] = process.argv.slice(2);
if (!source || !output) {
	throw new Error('Pass the captured GVL and output JSON paths.');
}
const captured = readFileSync(source);
const gvl = JSON.parse(
	(source.endsWith('.gz') ? gunzipSync(captured) : captured).toString('utf8')
) as GlobalVendorList;
const resolution = resolvePolicyRules({
	countryCode: 'DE',
	regionCode: null,
	rules: [
		{ id: 'iab', match: { isDefault: true }, model: 'iab', prompt: 'choice' },
	],
});
if (resolution.status !== 'matched') {
	throw new Error('Expected IAB policy');
}
const transport = createManifestTransport({
	fetchGvl: () => Promise.resolve(gvl),
	inputs: { country: 'DE', language: 'en' },
	manifest: {
		branding: 'c15t',
		cmpId: 28,
		iab: { enabled: true, gvl: { url: 'https://gvl.test/list' } },
		policyPacks: [
			{
				fingerprints: resolution.fingerprints,
				match: { isDefault: true },
				rule: resolution.policy,
			},
		],
		revision: 'iab-payload-benchmark',
		schemaVersion: 2,
	},
});
const response = await transport.init({ overrides: {}, user: null });
// Recreate the parent PR's inline response using the exact same policy and copy.
const { gvlReference: _reference, ...common } = response;
const before = { ...common, gvl };
const after = deferInitGvl(
	before,
	`/api/c15t/init?c15t-gvl=${gvl.vendorListVersion}&language=en`
);
if (
	JSON.stringify(resolveIABBannerSummary({ gvl })) !==
	JSON.stringify(
		resolveIABBannerSummary({ gvl: null, gvlReference: after.gvlReference })
	)
) {
	throw new Error('Banner summaries differ.');
}
const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	const results = [];
	for (const [label, payload] of [
		['before', before],
		['after', after],
	] as const) {
		const text = JSON.stringify(payload);
		const stringifyMs: number[] = [];
		const prepareMs: number[] = [];
		for (let i = 0; i < 220; i += 1) {
			const start = performance.now();
			const prepared =
				label === 'after'
					? deferInitGvl(before, after.gvlReference?.url ?? '/api/c15t/init')
					: before;
			const preparedAt = performance.now();
			JSON.stringify(prepared);
			if (i >= 20) {
				prepareMs.push(preparedAt - start);
				stringifyMs.push(performance.now() - preparedAt);
			}
		}
		// oxlint-disable-next-line no-await-in-loop -- Measure each arm without competing browser work.
		const parseMs = await page.evaluate((json) => {
			const timings = [];
			for (let i = 0; i < 220; i += 1) {
				const start = performance.now();
				for (let sample = 0; sample < 20; sample += 1) {
					JSON.parse(json);
				}
				if (i >= 20) {
					timings.push((performance.now() - start) / 20);
				}
			}
			return timings;
		}, text);
		results.push({
			browserParseMedianMs: median(parseMs),
			gzipBytes: gzipSync(text).length,
			jsonBytes: Buffer.byteLength(text),
			label,
			parseMs,
			prepareMedianMs: median(prepareMs),
			prepareMs,
			stringifyMedianMs: median(stringifyMs),
			stringifyMs,
		});
	}
	writeFileSync(
		output,
		JSON.stringify(
			{
				browser: await browser.version(),
				node: process.version,
				repetitions: 200,
				results,
				vendorCount: Object.keys(gvl.vendors).length,
				vendorListVersion: gvl.vendorListVersion,
				warmup: 20,
			},
			null,
			2
		)
	);
} finally {
	await browser.close();
}
