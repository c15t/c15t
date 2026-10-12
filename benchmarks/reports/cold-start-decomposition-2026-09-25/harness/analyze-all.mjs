/* oxlint-disable no-await-in-loop -- Sequential samples avoid CPU and network contention. */
// Run analyze-profile.mjs over every profiled cold request and report the
// median of each category per variant, measured from request start to the
// response's first byte (`ttfb`) and to the end of the response (`done`).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start';
const HARNESS = fileURLToPath(new URL('.', import.meta.url));
const { rows } = JSON.parse(
	readFileSync(`${ROOT}/results/coldraw-prof.json`, 'utf8')
);
const median = (xs) => {
	const s = [...xs].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const out = {};
for (const window of ['ttfb', 'done']) {
	for (const row of rows.filter((r) => !r.warmup)) {
		const end =
			row.hrStartUs + (window === 'ttfb' ? row.headersMs : row.doneMs) * 1000;
		const result = JSON.parse(
			execFileSync(process.execPath, [
				`${HARNESS}analyze-profile.mjs`,
				`${ROOT}/profiles/${row.tag}`,
				`${ROOT}/profiles/${row.tag}.chunks.json`,
				String(row.hrStartUs),
				String(Math.round(end)),
			]).toString()
		);
		const key = `${row.variant}:${window}`;
		out[key] ??= { cpu: {}, load: {}, n: 0, wallMs: [] };
		out[key].n += 1;
		out[key].wallMs.push(window === 'ttfb' ? row.headersMs : row.doneMs);
		for (const [k, v] of Object.entries(result.cpu.request)) {
			(out[key].cpu[k] ??= []).push(v);
		}
		for (const [k, v] of Object.entries(result.fileLoadMs.request)) {
			(out[key].load[k] ??= []).push(v);
		}
	}
}
for (const [key, value] of Object.entries(out)) {
	const fill = (obj) =>
		Object.fromEntries(
			Object.entries(obj)
				.map(([k, v]) => [
					k,
					Number(
						median([...v, ...Array(value.n - v.length).fill(0)]).toFixed(1)
					),
				])
				.sort((a, b) => b[1] - a[1])
		);
	console.log(
		key,
		JSON.stringify(
			{
				cpuSamplesMs: fill(value.cpu),
				fileLoadMs: fill(value.load),
				n: value.n,
				wallMs: median(value.wallMs),
			},
			null,
			1
		)
	);
}
