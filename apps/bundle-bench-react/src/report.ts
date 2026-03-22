import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

type BundleResult = {
	entry: string;
	gzipBytes: number;
	minifiedBytes: number;
};

async function buildEntry(entry: string): Promise<BundleResult> {
	const outdir = resolve(process.cwd(), 'dist', entry);
	const result = await Bun.build({
		entrypoints: [resolve(process.cwd(), 'src', `${entry}.tsx`)],
		minify: true,
		outdir,
		target: 'browser',
	});

	if (!result.success || result.outputs.length === 0) {
		throw new Error(`Failed to bundle ${entry}`);
	}

	const output = result.outputs.find((asset) => asset.path.endsWith('.js'));

	if (!output) {
		throw new Error(`No JavaScript output found for ${entry}`);
	}

	const bytes = await output.arrayBuffer();
	const fileBuffer = Buffer.from(bytes);

	return {
		entry,
		gzipBytes: gzipSync(fileBuffer).byteLength,
		minifiedBytes: fileBuffer.byteLength,
	};
}

async function main() {
	const reportDir = resolve(process.cwd(), 'report');
	mkdirSync(reportDir, { recursive: true });

	const baseline = await buildEntry('radix-baseline');
	const c15t = await buildEntry('c15t-primitives');
	const deltaBytes = c15t.minifiedBytes - baseline.minifiedBytes;
	const deltaGzipBytes = c15t.gzipBytes - baseline.gzipBytes;
	const report = {
		baseline,
		c15t,
		deltaBytes,
		deltaGzipBytes,
	};
	const direction =
		deltaBytes === 0
			? 'matches'
			: deltaBytes < 0
				? 'smaller than'
				: 'larger than';
	const absDeltaBytes = Math.abs(deltaBytes).toLocaleString();
	const absDeltaGzipBytes = Math.abs(deltaGzipBytes).toLocaleString();

	writeFileSync(
		resolve(reportDir, 'report.json'),
		`${JSON.stringify(report, null, 2)}\n`
	);
	writeFileSync(
		resolve(reportDir, 'README.md'),
		[
			'# React primitive bundle comparison',
			'',
			'This benchmark compares a Radix-based entry against the c15t-owned React primitives using the same representative primitive set: button, switch, accordion, and dialog.',
			'',
			'Current result:',
			`c15t is ${direction} the Radix baseline by ${absDeltaBytes} minified bytes and ${absDeltaGzipBytes} gzip bytes.`,
			'',
			'Methodology:',
			'- Both entries are bundled with `Bun.build` in browser mode with minification enabled.',
			'- The report measures the generated JavaScript bundle, not emitted CSS assets.',
			'- The Radix baseline uses real Radix dialog, switch, accordion, and slot primitives.',
			'- The c15t entry uses tree-shakeable `@c15t/react/primitives/*` subpath imports.',
			'',
			'Regenerate:',
			'Run `bun run bundle-bench` inside `apps/bundle-bench-react` to rebuild both entries and rewrite this report.',
			'',
			'```json',
			readFileSync(resolve(reportDir, 'report.json'), 'utf8').trim(),
			'```',
			'',
		].join('\n')
	);
}

await main();
