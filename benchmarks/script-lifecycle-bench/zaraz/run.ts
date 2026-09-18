/* oxlint-disable no-await-in-loop -- Benchmark samples must run sequentially to avoid CPU contention. */
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { build } from 'esbuild';
import type { PluginBuild } from 'esbuild';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../../..');
const out = resolve(
	root,
	process.env.BENCH_OUTPUT_DIR ?? '.benchmarks/current/zaraz'
);
const requestedBase = process.env.BENCH_BASE_REF;
if (!requestedBase) {
	throw new Error('Set BENCH_BASE_REF to the revision to compare against.');
}
const revision = (ref: string): string =>
	execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
		cwd: root,
		encoding: 'utf8',
	}).trim();
const baseRef = revision(requestedBase);
if (baseRef === revision('HEAD')) {
	throw new Error('BENCH_BASE_REF must differ from HEAD.');
}
const baseline = new Map(
	execFileSync(
		'git',
		[
			'ls-tree',
			'-r',
			'--name-only',
			baseRef,
			'--',
			'packages/core/src/modules/script-loader',
		],
		{
			cwd: root,
			encoding: 'utf8',
		}
	)
		.trim()
		.split('\n')
		.filter((path) => path.endsWith('.ts') && !path.includes('/__tests__/'))
		.map((path) => [
			resolve(root, path),
			execFileSync('git', ['show', `${baseRef}:${path}`], {
				cwd: root,
				encoding: 'utf8',
			}),
		])
);
const baselinePlugin = {
	name: 'baseline-script-loader',
	setup(plugin: PluginBuild) {
		plugin.onLoad(
			{
				filter:
					// oxlint-disable-next-line require-unicode-regexp -- esbuild uses Go regular expressions.
					/packages\/core\/src\/modules\/script-loader\/.*\.ts$/,
			},
			(args) => {
				const contents = baseline.get(args.path);
				if (contents === undefined) {
					throw new Error(
						`Lifecycle module missing from baseline: ${args.path}`
					);
				}
				return {
					contents,
					loader: 'ts',
					resolveDir: dirname(args.path),
				};
			}
		);
	},
};

await mkdir(out, { recursive: true });
const bundles = await Promise.all(
	['base', 'head'].map(async (version) => {
		const result = await build({
			bundle: true,
			entryPoints: [resolve(import.meta.dirname, 'browser.ts')],
			format: 'iife',
			minify: true,
			platform: 'browser',
			plugins: version === 'base' ? [baselinePlugin] : [],
			write: false,
		});
		return result.outputFiles[0]?.text ?? '';
	})
);
const required = <Value>(value: Value | undefined): Value => {
	if (value === undefined) {
		throw new Error('Missing benchmark output');
	}
	return value;
};
const sizes: Record<string, { bytes: number; gzipBytes: number }> = {};
for (const name of ['loader-base', 'loader-head', 'bridge']) {
	const result = await build({
		bundle: true,
		entryPoints: [
			resolve(
				root,
				name === 'bridge'
					? 'packages/scripts/src/vendors/tag-managers/cloudflare-zaraz.ts'
					: 'packages/core/src/modules/script-loader/index.ts'
			),
		],
		format: 'esm',
		minify: true,
		platform: 'browser',
		plugins: name === 'loader-base' ? [baselinePlugin] : [],
		write: false,
	});
	const bytes = required(result.outputFiles[0]).contents;
	sizes[name] = { bytes: bytes.length, gzipBytes: gzipSync(bytes).length };
}
await writeFile(resolve(out, 'bridge-test.js'), required(bundles[1]));
await writeFile(
	resolve(out, 'index.html'),
	`<!doctype html><html lang="en"><meta charset="utf-8"><title>c15t Zaraz bridge verification</title><main><h1>Zaraz bridge verification</h1><p>This page uses a local Zaraz API fixture. It does not load Cloudflare Zaraz or send analytics.</p><pre id="result">Running browser checks…</pre></main><script src="/bridge-test.js"></script><script>window.verifyZarazBridge().then(checks => { document.querySelector('#result').textContent = checks.map(check => 'PASS: ' + check).join('\\n'); window.bridgeTestResult = { passed: true, checks }; }).catch(error => { document.querySelector('#result').textContent = error.message; window.bridgeTestResult = { passed: false, error: error.message }; });</script></html>`
);
const browser = await chromium.launch();
try {
	const pages = await Promise.all(
		bundles.map(async (bundle) => {
			const page = await browser.newPage();
			await page.addScriptTag({ content: bundle });
			return page;
		})
	);
	const checks = await required(pages[1]).evaluate(() =>
		window.verifyZarazBridge()
	);
	const samples: Record<string, number[]> = {};
	const cases = [
		{ name: 'empty-base', page: 0, scenario: 'empty' },
		{ name: 'empty-head', page: 1, scenario: 'empty' },
		{ name: 'callbacks-base', page: 0, scenario: 'callbacks' },
		{ name: 'callbacks-head', page: 1, scenario: 'callbacks' },
		{ name: 'bridge-head', page: 1, scenario: 'zaraz' },
	] as const;
	for (let sample = -5; sample < 31; sample += 1) {
		const ordered = sample % 2 === 0 ? cases : [...cases].reverse();
		for (const entry of ordered) {
			const time = await required(pages[entry.page]).evaluate(
				({ scenario }) => window.runZarazBenchmark(scenario, 500),
				entry
			);
			if (sample >= 0) {
				(samples[entry.name] ??= []).push(time * 1000);
			}
		}
	}
	const summary = Object.fromEntries(
		Object.entries(samples).map(([name, values]) => {
			const sorted = [...values].sort((a, b) => a - b);
			return [
				name,
				{
					medianMicroseconds: sorted[Math.floor(sorted.length / 2)],
					p95Microseconds: sorted[Math.ceil(sorted.length * 0.95) - 1],
				},
			];
		})
	);
	const report = {
		baseRef: execFileSync('git', ['rev-parse', baseRef], {
			cwd: root,
			encoding: 'utf8',
		}).trim(),
		browser: browser.version(),
		checks,
		date: new Date().toISOString(),
		machine: { arch: arch(), cpu: cpus()[0]?.model, platform: platform() },
		method: [
			'31 alternating samples per case, 5 warmups, 500 kernel consent',
			'updates per sample. Timing includes loader creation and',
			'disposal, excludes kernel creation. Baseline substitutes every',
			'script-loader module from the base ref; dependencies outside',
			'that directory are identical. Zaraz API is a local fixture; no',
			'vendor network or edge execution is measured.',
		].join(' '),
		samples,
		sizes,
		summary,
	};
	await writeFile(
		resolve(out, 'results.json'),
		JSON.stringify(report, null, 2)
	);
	console.log(JSON.stringify({ checks, output: out, sizes, summary }, null, 2));
} finally {
	await browser.close();
}
