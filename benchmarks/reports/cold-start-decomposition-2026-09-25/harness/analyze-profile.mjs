// Attribute a `next start` CPU profile to packages.
//
// Each sample is charged to the innermost stack frame that lives in the Next.js
// server output (`.next*/server/`), mapped through that chunk's source map to
// its original file and then to a package: c15t, the site's c15t wrappers,
// next, react, other dependencies, or app code. Samples with no such frame are
// charged by their leaf: Node internals, Next's unbundled server
// (`node_modules/next/dist`), GC, or idle. Per-file load time (read + compile +
// top-level evaluation) comes from chunk-timing.cjs; a chunk's time is split
// by how much of its source content each package contributes, because
// Turbopack merges modules from several packages into one chunk.
//
// Usage: node analyze-profile.mjs <profile-dir> <chunks.json> <request-hr-us> [<end-hr-us>]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { fileURLToPath } from 'node:url';

const [dir, chunksFile, requestHrUsArg, endHrUsArg] = process.argv.slice(2);
const profileFile = readdirSync(dir).find((f) => f.endsWith('.cpuprofile'));
const profile = JSON.parse(readFileSync(`${dir}/${profileFile}`, 'utf8'));
const chunkTiming = JSON.parse(readFileSync(chunksFile, 'utf8'));
const requestHrUs = Number(requestHrUsArg);
const endHrUs = endHrUsArg ? Number(endHrUsArg) : Number.POSITIVE_INFINITY;

/** Next.js server output, including a custom distDir such as `.next-860`. */
const SERVER_OUTPUT = /\/\.next[^/]*\/server\//u;
const C15T_PACKAGE = /node_modules\/(?<pkg>@c15t\/[^/]+|c15t)\//u;
const SITE_C15T_WRAPPER = /packages\/c15t(?:-v3)?\//u;
const PACKAGE_NAME = /^(?<pkg>(?:@[^/]+\/)?[^/]+)/u;
const TURBOPACK_RUNTIME = /^turbopack:|\[turbopack\]/u;

const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const node of profile.nodes) {
	for (const child of node.children ?? []) {
		parent.set(child, node.id);
	}
}

const maps = new Map();
const sourceMapFor = (file) => {
	if (!maps.has(file)) {
		let map = null;
		if (existsSync(`${file}.map`)) {
			try {
				map = new SourceMap(JSON.parse(readFileSync(`${file}.map`, 'utf8')));
			} catch {
				map = null;
			}
		}
		maps.set(file, map);
	}
	return maps.get(file);
};

const decode = (source) => {
	try {
		return decodeURIComponent(source);
	} catch {
		return source;
	}
};

const classifySource = (source) => {
	if (!source) {
		return 'unmapped-chunk';
	}
	const s = decode(source);
	const c15t = C15T_PACKAGE.exec(s);
	if (c15t) {
		return `c15t:${c15t.groups.pkg}`;
	}
	const inNodeModules = s.includes('node_modules/');
	if (!inNodeModules && SITE_C15T_WRAPPER.test(s)) {
		return 'site-c15t-wrapper';
	}
	if (s.includes('node_modules/next/')) {
		return 'next';
	}
	if (inNodeModules) {
		const tail = s.split('node_modules/').at(-1);
		const name = PACKAGE_NAME.exec(tail)?.groups.pkg;
		return ['react', 'react-dom', 'scheduler'].includes(name)
			? 'react'
			: `dep:${name}`;
	}
	if (TURBOPACK_RUNTIME.test(s)) {
		return 'next:turbopack-runtime';
	}
	return 'app';
};

const toPath = (url) => (url.startsWith('file://') ? fileURLToPath(url) : url);

const classifyLeaf = (frame) => {
	const url = toPath(frame.url);
	const special = {
		'(garbage collector)': 'gc',
		'(idle)': 'idle',
		'(program)': 'program',
	}[frame.functionName];
	if (special) {
		return special;
	}
	if (url.includes('node_modules/next/')) {
		return 'next:unbundled';
	}
	if (url.startsWith('node:') || url === '') {
		return 'node';
	}
	return 'other';
};

const classifyNode = (id) => {
	let cursor = id;
	while (cursor !== undefined) {
		const frame = nodes.get(cursor).callFrame;
		const path = toPath(frame.url);
		if (SERVER_OUTPUT.test(path)) {
			if (path.includes('[turbopack]_runtime')) {
				return 'next:turbopack-runtime';
			}
			const entry = sourceMapFor(path)?.findEntry(
				frame.lineNumber,
				frame.columnNumber
			);
			return classifySource(entry?.originalSource ?? entry?.fileName);
		}
		cursor = parent.get(cursor);
	}
	return classifyLeaf(nodes.get(id).callFrame);
};

// V8 profile ticks are not on the process.hrtime clock, so align on process
// start: the profile begins during bootstrap and the preload records hrtime a
// few milliseconds later.
const toProfileUs = (hrUs) =>
	hrUs - chunkTiming.preloadHrUs + profile.startTime;
const requestProfileUs = toProfileUs(requestHrUs);
const endProfileUs = Number.isFinite(endHrUs) ? toProfileUs(endHrUs) : endHrUs;

const phaseOf = (t) => {
	if (t < requestProfileUs) {
		return 'startup';
	}
	return t <= endProfileUs ? 'request' : 'after';
};

const add = (bucket, key, value) => {
	bucket.set(key, (bucket.get(key) ?? 0) + value);
};

const cpu = { after: new Map(), request: new Map(), startup: new Map() };
let t = profile.startTime;
for (const [index, sample] of profile.samples.entries()) {
	const delta = profile.timeDeltas[index];
	t += delta;
	add(cpu[phaseOf(t)], classifyNode(sample), delta / 1000);
}

// Share of each chunk's source content per package.
const chunkShares = (file) => {
	const shares = new Map();
	if (!existsSync(`${file}.map`)) {
		return shares;
	}
	const map = JSON.parse(readFileSync(`${file}.map`, 'utf8'));
	const sections = map.sections ? map.sections.map((s) => s.map) : [map];
	let total = 0;
	for (const section of sections) {
		for (const [index, source] of (section.sources ?? []).entries()) {
			const length = section.sourcesContent?.[index]?.length ?? 0;
			total += length;
			const key = classifySource(source).startsWith('c15t:')
				? 'c15t'
				: classifySource(source);
			add(shares, key, length);
		}
	}
	for (const [key, value] of shares) {
		shares.set(key, total ? value / total : 0);
	}
	return shares;
};

const load = { request: new Map(), startup: new Map() };
for (const entry of chunkTiming.loads) {
	const bucket = load[entry.startHrUs < requestHrUs ? 'startup' : 'request'];
	const f = entry.file;
	if (SERVER_OUTPUT.test(f)) {
		const shares = chunkShares(f);
		if (shares.size === 0) {
			add(bucket, 'chunk:unmapped', entry.ms);
		}
		for (const [key, share] of shares) {
			add(bucket, `chunk:${key}`, entry.ms * share);
		}
	} else if (f.includes('node_modules/next/')) {
		add(bucket, 'next:unbundled', entry.ms);
	} else if (f.includes('node_modules/')) {
		add(bucket, 'dep', entry.ms);
	} else {
		add(bucket, 'other', entry.ms);
	}
}

const sorted = (m) =>
	Object.fromEntries(
		[...m.entries()]
			.toSorted((a, b) => b[1] - a[1])
			.map(([k, v]) => [k, Number(v.toFixed(1))])
	);
console.log(
	JSON.stringify(
		{
			cpu: {
				after: sorted(cpu.after),
				request: sorted(cpu.request),
				startup: sorted(cpu.startup),
			},
			fileLoadMs: {
				request: sorted(load.request),
				startup: sorted(load.startup),
			},
			profile: profileFile,
			profileDurationMs: (t - profile.startTime) / 1000,
			requestAfterProfileStartMs: (requestProfileUs - profile.startTime) / 1000,
		},
		null,
		1
	)
);
