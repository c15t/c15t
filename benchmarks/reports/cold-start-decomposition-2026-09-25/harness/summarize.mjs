// Summarise results/main.json: medians and ranges per condition, config,
// and state; server-side phase breakdown for each state; and a check that
// every cold sample came from a newly started process.
import { readFileSync } from 'node:fs';

const file =
	process.argv[2] ??
	`${process.env.COLD_BENCH_DIR ?? '/tmp/c15t-cold-start'}/results/main.json`;
const { rows, loadStart, loadEnd } = JSON.parse(readFileSync(file, 'utf8'));
const measured = rows.filter((r) => !r.warmup);

const median = (xs) => {
	const s = xs
		.filter((x) => x !== null && x !== undefined)
		.sort((a, b) => a - b);
	if (!s.length) {
		return null;
	}
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const range = (xs) => {
	const s = xs.filter((x) => x !== null && x !== undefined);
	return s.length ? [Math.min(...s), Math.max(...s)] : null;
};
const f = (x) =>
	x === null || x === undefined ? '–' : Math.round(x).toString();
const cell = (xs) => {
	const r = range(xs);
	return r ? `${f(median(xs))} (${f(r[0])}–${f(r[1])})` : '–';
};

// Cold samples must come from a new process: the process's own
// instrumentation hook fires during the measured request.
const coldRows = measured.filter((r) => ['c', 'd', 'e'].includes(r.state));
const coldProblems = coldRows.filter(
	(r) =>
		!r.serverMarks.some((m) => m.name === 'instrumentation:register') ||
		!r.readyAt
);
const warmProblems = measured.filter(
	(r) =>
		['a', 'b'].includes(r.state) &&
		r.serverMarks.some((m) => m.name === 'instrumentation:register')
);
console.log(
	`samples: ${measured.length} measured, ${rows.length - measured.length} warm-up`
);
console.log(
	`cold samples from a new process: ${coldRows.length - coldProblems.length}/${coldRows.length}; warm samples that restarted: ${warmProblems.length}`
);
console.log(
	`load average start ${loadStart.map((x) => x.toFixed(2)).join(' ')}, end ${loadEnd?.map((x) => x.toFixed(2)).join(' ')}`
);
console.log(
	`bytes mismatches: ${measured.filter((r) => r.bodyBytes !== r.receivedBytes).length}; page errors: ${measured.filter((r) => r.failures.length).length}; tracker loaded before choice: ${measured.filter((r) => r.trackerLoaded).length}; banner missing: ${measured.filter((r) => r.bannerReadyTimedOut).length}`
);

const markAt = (r, name) => {
	const m = r.serverMarks.find((x) => x.name === name);
	return m ? m.at - r.timeOrigin : null;
};
const stateOrder = ['a', 'b', 'c', 'd', 'e'];
for (const condition of ['B', 'L']) {
	console.log(`\n### Condition ${condition}\n`);
	console.log(
		'| Config | State | n | TTFB | First chunk | Banner in HTML | FCP | FCP slow mode | Banner ready | Origin /manifest | Origin /init | Load avg |'
	);
	console.log(
		'| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |'
	);
	for (const config of ['D', 'S']) {
		for (const state of stateOrder) {
			const rs = measured.filter(
				(r) =>
					r.condition === condition && r.config === config && r.state === state
			);
			if (!rs.length) {
				continue;
			}
			const threshold = condition === 'B' ? 600 : 250;
			const slow = rs.filter((r) => r.fcpMs > threshold).length;
			const load = range(rs.map((r) => r.loadavg[0]));
			console.log(
				`| ${config} | ${state} | ${rs.length} | ${cell(rs.map((r) => r.ttfbMs))} | ${cell(rs.map((r) => r.firstChunkMs))} | ${cell(rs.map((r) => r.bannerInHtmlMs))} | ${cell(rs.map((r) => r.fcpMs))} | ${slow}/${rs.length} | ${cell(rs.map((r) => r.bannerReadyMs))} | ${rs.reduce((n, r) => n + r.originManifest, 0)}/${rs.length} | ${rs.reduce((n, r) => n + r.originInit, 0)} | ${load[0].toFixed(1)}–${load[1].toFixed(1)} |`
			);
		}
	}
}

console.log(
	'\n### Server phases, condition L (ms after navigation start, medians)\n'
);
console.log(
	'| Config | State | c15t server entry eval | resolveConsent start | manifest route module eval | route start | origin /manifest sent | route end | resolveConsent end | TTFB | Banner in HTML |'
);
console.log(
	'| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
);
for (const config of ['D', 'S']) {
	for (const state of stateOrder) {
		const rs = measured.filter(
			(r) => r.condition === 'L' && r.config === config && r.state === state
		);
		const dur = (a, b) =>
			rs.map((r) => {
				const x = markAt(r, a);
				const y = markAt(r, b);
				return x !== null && y !== null ? y - x : null;
			});
		const at = (name) => rs.map((r) => markAt(r, name));
		const originSent = rs.map((r) => {
			const e = r.backendEvents.find((x) => x.path === '/manifest');
			return e ? e.at - r.timeOrigin : null;
		});
		const evalServer = dur(
			'module:c15t-next-server:start',
			'module:c15t-next-server:end'
		);
		const evalApi = dur(
			'module:c15t-next-api:start',
			'module:c15t-next-api:end'
		);
		console.log(
			`| ${config} | ${state} | ${median(evalServer) === null ? '–' : median(evalServer).toFixed(1)} | ${f(median(at('resolveConsent:start')))} | ${median(evalApi) === null ? '–' : median(evalApi).toFixed(1)} | ${f(median(at('route:manifest:start')))} | ${f(median(originSent))} | ${f(median(at('route:manifest:end')))} | ${f(median(at('resolveConsent:end')))} | ${f(median(rs.map((r) => r.ttfbMs)))} | ${f(median(rs.map((r) => r.bannerInHtmlMs)))} |`
		);
	}
}

console.log('\n### Data Cache on disk before state c (config D)');
for (const r of measured.filter((x) => x.state === 'c')) {
	if (r.config === 'D') {
		process.stdout.write(
			`${r.dataCacheBeforeStart.files} files/${Math.round(r.dataCacheBeforeStart.newestAgeS)}s old/origin ${r.originManifest}; `
		);
	}
}
console.log(
	'\nspawn to Ready (ms), cold samples:',
	cell(coldRows.map((r) => r.readyAt - r.spawnedAt))
);
console.log(
	'Ready to navigation start (ms):',
	cell(coldRows.map((r) => r.timeOrigin - r.readyAt))
);
