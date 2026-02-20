import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

type BundleStats = {
	name: 'react' | 'preact';
	file: string;
	raw: number;
	gzip: number;
	brotli: number;
};

const runtimeEntry = 'packages/embed/dist/runtime.js';
const outDir = 'artifacts/embed-runtime-bench';

const reactOut = join(outDir, 'runtime.react.iife.js');
const preactOut = join(outDir, 'runtime.preact.iife.js');

function run(command: string, args: string[]): void {
	const result = spawnSync(command, args, {
		stdio: 'inherit',
		shell: false,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function getBundleStats(name: BundleStats['name'], file: string): BundleStats {
	const buffer = readFileSync(file);
	return {
		name,
		file,
		raw: buffer.length,
		gzip: gzipSync(buffer, { level: 9 }).length,
		brotli: brotliCompressSync(buffer, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: 11,
			},
		}).length,
	};
}

function percentSmaller(baseline: number, candidate: number): number {
	if (baseline === 0) {
		return 0;
	}
	return Number((((baseline - candidate) / baseline) * 100).toFixed(2));
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024).toFixed(1)} KiB`;
}

mkdirSync(dirname(reactOut), { recursive: true });

console.log('\n[embed-bench] Building React runtime bundle...');
run('bun', [
	'x',
	'esbuild',
	runtimeEntry,
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedBundle',
	'--alias:c15t=./packages/core/src',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${reactOut}`,
	'--log-level=error',
]);

console.log('\n[embed-bench] Building Preact compat runtime bundle...');
run('bun', [
	'x',
	'esbuild',
	runtimeEntry,
	'--bundle',
	'--platform=browser',
	'--format=iife',
	'--target=es2020',
	'--global-name=c15tEmbedBundle',
	'--alias:c15t=./packages/core/src',
	'--alias:react=preact/compat',
	'--alias:react-dom=preact/compat',
	'--alias:react-dom/client=preact/compat/client',
	'--alias:react/jsx-runtime=preact/jsx-runtime',
	'--alias:react/jsx-dev-runtime=preact/jsx-dev-runtime',
	'--define:process.env.NODE_ENV="production"',
	'--minify',
	`--outfile=${preactOut}`,
	'--log-level=error',
]);

const react = getBundleStats('react', reactOut);
const preact = getBundleStats('preact', preactOut);

console.log('\n[embed-bench] Results');
console.table([
	{
		bundle: react.name,
		raw: formatBytes(react.raw),
		gzip: formatBytes(react.gzip),
		brotli: formatBytes(react.brotli),
	},
	{
		bundle: preact.name,
		raw: formatBytes(preact.raw),
		gzip: formatBytes(preact.gzip),
		brotli: formatBytes(preact.brotli),
	},
]);

console.log(
	`[embed-bench] Preact savings vs React: raw ${percentSmaller(react.raw, preact.raw)}%, gzip ${percentSmaller(react.gzip, preact.gzip)}%, brotli ${percentSmaller(react.brotli, preact.brotli)}%`
);
console.log(
	`[embed-bench] Output files:\n  - ${react.file}\n  - ${preact.file}`
);
