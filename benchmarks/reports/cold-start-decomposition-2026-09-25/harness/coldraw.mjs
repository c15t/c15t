/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
// Cold first request over raw HTTP: a new `next start` with `.next/cache`
// deleted, one GET of `/`, chunk arrival times read off the socket, then a
// second request in the same process. Compares the consumer (site-like S,
// documented default D, and S with resolveConsent pointed at the backend)
// against the same app with no c15t code (base), so the difference is c15t's
// whole server-side cold cost. With --profile, also writes a V8 CPU profile
// and per-file load timings for attribution. Profiling slows the process, so
// use those runs for shares, not absolute times.
//
// Usage: node coldraw.mjs --reps 9 [--variants base,S,D] [--delays 200,0]
//        [--profile] [--out <file>]
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
	backendControl,
	readHtmlStream,
	startServer,
	stopServer,
} from './run.mjs';

const ROOT = process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start';
const HARNESS = fileURLToPath(new URL('.', import.meta.url));
const { values: argv } = parseArgs({
	options: {
		delays: { default: '200,0', type: 'string' },
		out: { default: `${ROOT}/results/coldraw.json`, type: 'string' },
		profile: { default: false, type: 'boolean' },
		reps: { default: '9', type: 'string' },
		variants: { default: 'base,S,D', type: 'string' },
	},
});
const SITE_LIKE_ENV = { C15T_MANIFEST_REVALIDATE_SECONDS: '0' };
const VARIANTS = {
	D: { dir: `${ROOT}/builds/D-cold`, env: {}, port: 4743 },
	S: { dir: `${ROOT}/builds/S-cold`, env: SITE_LIKE_ENV, port: 4742 },
	// resolveConsent fetches the backend itself: no loopback to the proxy route.
	Sdirect: {
		dir: `${ROOT}/builds/S-cold`,
		env: SITE_LIKE_ENV,
		headers: { 'x-c15t-bench-manifest-source': 'direct' },
		port: 4744,
	},
	base: { dir: `${ROOT}/builds/baseline`, env: {}, port: 4741 },
};

const profileArgs = (tag) => [
	'--cpu-prof',
	`--cpu-prof-dir=${ROOT}/profiles/${tag}`,
	'--cpu-prof-interval=200',
	'--require',
	`${HARNESS}chunk-timing.cjs`,
];

const rows = [];
await mkdir(`${ROOT}/profiles`, { recursive: true });
const loadStart = os.loadavg();
const variants = argv.variants.split(',');
const delays = argv.delays.split(',').map(Number);
for (let rep = 0; rep <= Number(argv.reps); rep += 1) {
	const order = rep % 2 ? [...variants].reverse() : variants;
	for (const delay of rep % 2 ? [...delays].reverse() : delays) {
		for (const name of order) {
			const variant = VARIANTS[name];
			await backendControl({ delay, mode: 'ok' });
			await rm(`${variant.dir}/.next/cache`, { force: true, recursive: true });
			const tag = `${name}-d${delay}-r${rep}${argv.profile ? '-prof' : ''}`;
			const env = argv.profile
				? {
						...variant.env,
						CHUNK_TIMING_OUT: `${ROOT}/profiles/${tag}.chunks.json`,
					}
				: variant.env;
			await fetch('http://127.0.0.1:4790/__reset');
			const load = os.loadavg();
			const server = await startServer(
				variant.dir,
				variant.port,
				env,
				argv.profile ? profileArgs(tag) : []
			);
			const pageURL = `http://127.0.0.1:${variant.port}/`;
			let result;
			try {
				result = await readHtmlStream(pageURL, variant.headers);
				await sleep(400);
				// A second, warm request in the same process for comparison.
				result.warm = await readHtmlStream(pageURL, variant.headers);
				await sleep(300);
			} finally {
				await stopServer(server);
			}
			const metrics = await fetch('http://127.0.0.1:4790/__metrics');
			const backend = await metrics.json();
			const row = {
				...result,
				delay,
				loadavg: load,
				originManifest: backend.filter((e) => e.path === '/manifest').length,
				profiled: argv.profile,
				rep,
				spawnToReadyMs: server.readyAt - server.spawnedAt,
				tag,
				variant: name,
				warmup: rep === 0,
			};
			rows.push(row);
			await writeFile(argv.out, JSON.stringify({ loadStart, rows }, null, 1));
			console.log(
				JSON.stringify({
					banner: row.bannerMs,
					delay,
					headers: row.headersMs,
					load: load[0].toFixed(1),
					man: row.originManifest,
					name,
					rep,
					warmBanner: row.warm.bannerMs,
				})
			);
		}
	}
}
await writeFile(
	argv.out,
	JSON.stringify({ loadEnd: os.loadavg(), loadStart, rows }, null, 1)
);
