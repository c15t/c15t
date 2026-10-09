import { execFileSync } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Style-loading contracts that changed when components began delivering CSS.
 * The head's fixtures run against both products, but an older product still
 * needs its aggregate import to render a styled banner or dialog.
 */
const EXTERNAL_STYLE_CONTRACTS = [
	{
		automaticEntry: 'packages/react/src/components/shared/surface-styles.tsx',
		imports: ['@c15t/nextjs/styles.css'],
		owners: ['benchmarks/nextjs-browser-bench/app/_bench/with-consent.css'],
	},
	{
		automaticEntry: 'packages/react/src/components/shared/surface-styles.tsx',
		imports: ['@c15t/tanstack-start/styles.css'],
		owners: [
			'benchmarks/tanstack-start-browser-bench/src/bench/with-consent.css',
		],
	},
	{
		automaticEntry:
			'packages/react/src/components/shared/iab-first-paint-sheets.ts',
		imports: [
			'@c15t/tanstack-start/styles.css',
			'@c15t/tanstack-start/iab/styles.css',
		],
		owners: [
			'benchmarks/tanstack-start-browser-bench/src/bench/with-consent-iab.css',
		],
	},
	{
		automaticEntry: 'packages/svelte/src/lib/surface-styles.ts',
		imports: ['@c15t/svelte/styles.css'],
		owners: [
			'client-manifest',
			'client',
			'repeat-visitor-scripts',
			'repeat-visitor',
			'scripts',
			'ssr-manifest',
			'ssr',
		].map(
			(route) =>
				`benchmarks/sveltekit-browser-bench/src/routes/${route}/+layout.svelte`
		),
	},
] as const;

const preserveBaseStyleImports = function preserveBaseStyleImports(
	base: string
) {
	for (const { automaticEntry, imports, owners } of EXTERNAL_STYLE_CONTRACTS) {
		if (existsSync(join(base, automaticEntry))) {
			continue;
		}
		for (const owner of owners) {
			const path = join(base, owner);
			if (!existsSync(path)) {
				continue;
			}
			const source = readFileSync(path, 'utf8');
			const missing = imports.filter(
				(specifier) => !source.includes(specifier)
			);
			if (missing.length === 0) {
				continue;
			}
			const isCss = owner.endsWith('.css');
			const statements = missing
				.map((specifier) =>
					isCss ? `@import '${specifier}';` : `\timport '${specifier}';`
				)
				.join('\n');
			if (isCss) {
				writeFileSync(path, `${statements}\n${source}`);
			} else {
				const updated = source.replace(/<script\b[^>]*>/u, `$&\n${statements}`);
				if (updated === source) {
					throw new Error(
						`Benchmark stylesheet owner ${owner} has no script block`
					);
				}
				writeFileSync(path, updated);
			}
		}
	}
};

/** Use identical fixtures, including deletions, while retaining each revision's product. */
export const replaceBenchmarkFixtures = function replaceBenchmarkFixtures(
	source: string,
	base: string
) {
	const dependencyFields = [
		'dependencies',
		'devDependencies',
		'peerDependencies',
		'optionalDependencies',
	] as const;
	const tracked = (cwd: string, includeNew: boolean) =>
		execFileSync(
			'git',
			[
				'ls-files',
				'-z',
				'--cached',
				...(includeNew ? ['--others', '--exclude-standard'] : []),
				'--',
				'benchmarks',
			],
			{ cwd, encoding: 'utf8' }
		)
			.split('\0')
			.filter(Boolean);
	const manifests = new Map<string, string>();
	// A harness the base revision does not have cannot be measured on both
	// sides, so it stays out of the base tree entirely rather than being
	// installed there against the base lockfile.
	const newPackageDirectories: string[] = [];
	const isInNewPackage = (file: string) =>
		newPackageDirectories.some((directory) => file.startsWith(directory));
	for (const file of tracked(source, true).filter((path) =>
		path.endsWith('/package.json')
	)) {
		if (!existsSync(join(source, file))) {
			continue;
		}
		if (!existsSync(join(base, file))) {
			newPackageDirectories.push(file.slice(0, -'package.json'.length));
			continue;
		}
		const headManifest = JSON.parse(readFileSync(join(source, file), 'utf8'));
		const baseManifest = JSON.parse(readFileSync(join(base, file), 'utf8'));
		const baseDependencies = Object.assign(
			{},
			...dependencyFields.map((field) => baseManifest[field])
		);
		for (const field of dependencyFields) {
			for (const name of Object.keys(headManifest[field] ?? {})) {
				if (!(name in baseDependencies)) {
					throw new Error(
						`Benchmark fixture ${file} requires ${name}, which is absent from the base manifest. Use fixtures compatible with both revisions.`
					);
				}
			}
			headManifest[field] = baseManifest[field];
		}
		for (const field of [
			'overrides',
			'resolutions',
			'peerDependenciesMeta',
			'packageManager',
			'engines',
		]) {
			headManifest[field] = baseManifest[field];
		}
		manifests.set(file, `${JSON.stringify(headManifest, null, 2)}\n`);
	}
	for (const file of tracked(base, false)) {
		if (file.endsWith('/package.json')) {
			continue;
		}
		rmSync(join(base, file), { force: true });
	}
	for (const file of tracked(source, true)) {
		if (!existsSync(join(source, file)) || isInNewPackage(file)) {
			continue;
		}
		mkdirSync(dirname(join(base, file)), { recursive: true });
		const manifest = manifests.get(file);
		if (manifest === undefined) {
			cpSync(join(source, file), join(base, file));
		} else {
			writeFileSync(join(base, file), manifest);
		}
	}
	preserveBaseStyleImports(base);
};
