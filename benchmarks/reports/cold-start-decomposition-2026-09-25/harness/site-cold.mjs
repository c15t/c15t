/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
// Cold first request against the docs-site build that produced the original
// numbers (distDir .next-860), run the same way as the original `cold.mjs`: a
// new `next start` per sample, `.next-860/cache` kept, backend +200 ms through
// site-proxy.mjs. Reads `/` over raw HTTP, then a second request in the same
// process. The profiled arm also records a CPU profile and per-file load
// times, for attribution only. Needs the site build and the seeded gateway
// from the originating machine.
//
// Usage: node site-cold.mjs --reps 7 --profiled 3 [--out <file>]
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { readHtmlStream, startServer, stopServer } from './run.mjs';

const ROOT = process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start';
const HARNESS = fileURLToPath(new URL('.', import.meta.url));
const SITE =
	process.env.COLD_BENCH_SITE ?? '/tmp/c15t-vitals-head/apps/c15t-docs';
const PROXY = 'http://127.0.0.1:4318';
const PORT = 4760;
const { values: argv } = parseArgs({
	options: {
		out: { default: `${ROOT}/results/site-cold.json`, type: 'string' },
		profiled: { default: '3', type: 'string' },
		reps: { default: '7', type: 'string' },
	},
});
const SITE_ENV = {
	NEXT_PUBLIC_SENTRY_DISABLED: 'true',
	NEXT_PUBLIC_VERCEL_ENV: 'development',
};
const BROWSER_UA = { 'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/149 bench' };

/** Plain first, profiled second on odd reps; the reverse on even reps. */
const armsFor = (rep, profiled) => {
	if (rep < 1 || rep > profiled) {
		return ['plain'];
	}
	return rep % 2 ? ['plain', 'profile'] : ['profile', 'plain'];
};

const profileSetup = (arm, tag) => {
	if (arm !== 'profile') {
		return { env: SITE_ENV, nodeArgs: [] };
	}
	return {
		env: {
			...SITE_ENV,
			CHUNK_TIMING_OUT: `${ROOT}/profiles-site/${tag}.chunks.json`,
		},
		nodeArgs: [
			'--cpu-prof',
			`--cpu-prof-dir=${ROOT}/profiles-site/${tag}`,
			'--cpu-prof-interval=200',
			'--require',
			`${HARNESS}chunk-timing.cjs`,
		],
	};
};

await mkdir(`${ROOT}/profiles-site`, { recursive: true });
await fetch(`${PROXY}/__control?delay=200`);
const rows = [];
const loadStart = os.loadavg();
const reps = Number(argv.reps);
const profiled = Number(argv.profiled);
const pageURL = `http://127.0.0.1:${PORT}/`;
for (let rep = 0; rep <= reps; rep += 1) {
	for (const arm of armsFor(rep, profiled)) {
		const tag = `site-${arm}-r${rep}`;
		const setup = profileSetup(arm, tag);
		await fetch(`${PROXY}/__reset`);
		const load = os.loadavg();
		const server = await startServer(SITE, PORT, setup.env, setup.nodeArgs);
		let cold;
		let warm;
		try {
			cold = await readHtmlStream(pageURL, BROWSER_UA);
			await sleep(500);
			warm = await readHtmlStream(pageURL, BROWSER_UA);
			await sleep(500);
		} finally {
			await stopServer(server);
		}
		const metrics = await fetch(`${PROXY}/__metrics`);
		const backend = await metrics.json();
		const manifest = backend.filter((e) => e.path === '/manifest');
		const row = {
			arm,
			backend: backend.map((e) => ({
				afterRequestMs: e.at - cold.startedAt,
				path: e.path,
				status: e.status,
			})),
			cold,
			loadavg: load,
			manifestProxyMs: manifest.map((e) => Math.round(e.ms)),
			manifestSentAfterRequestMs: manifest.map((e) => e.at - cold.startedAt),
			originManifest: manifest.length,
			readyToRequestMs: cold.startedAt - server.readyAt,
			rep,
			spawnToReadyMs: server.readyAt - server.spawnedAt,
			tag,
			warm,
			warmup: rep === 0,
		};
		rows.push(row);
		await writeFile(argv.out, JSON.stringify({ loadStart, rows }, null, 1));
		console.log(
			JSON.stringify({
				coldBanner: cold.bannerMs,
				coldHeaders: cold.headersMs,
				load: load[0].toFixed(1),
				man: manifest.length,
				manifestAt: row.manifestSentAfterRequestMs,
				tag,
				warmBanner: warm.bannerMs,
				warmHeaders: warm.headersMs,
			})
		);
	}
}
await writeFile(
	argv.out,
	JSON.stringify({ loadEnd: os.loadavg(), loadStart, rows }, null, 1)
);
