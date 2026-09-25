#!/usr/bin/env node
/**
 * Client-payload attribution: builds one Next.js App Router consumer in
 * several arms that differ only in their consent setup, loads each route in
 * Chromium, and attributes every initial and first-dialog-open JS/CSS byte to
 * a package and module through the chunks' source maps.
 *
 * Arms (see fixture/arms):
 * - baseline: no consent library.
 * - v2: `@c15t/nextjs` 2.x, the v2 Next.js quickstart (client provider).
 * - v3: `c15t/next`, the v3 App Router guide (server `resolveConsent` in
 *   Suspense, `ConsentRoot`, aggregate `c15t/next/styles.css`).
 * - v3-react: `c15t/react` umbrella `ConsentProvider`, as the c15t docs
 *   site uses it.
 * - v3-split: the same tree as v3-react through split `c15t/react/*` entries.
 *
 * Every arm installs from npm or packed tarballs into its own directory
 * outside the workspace, so the `exports` maps and `dist/` are what a user
 * gets. Builds run one at a time.
 *
 * Usage (from the repo root):
 *   bunx tsx benchmarks/bundle-test-app/client-payload/run.ts \
 *     --v3 workspace|tarballs:<dir>|npm:<version> [--v2 2.2.1] \
 *     [--arms baseline,v2,v3,v3-react,v3-split] [--work-dir <dir>] \
 *     [--output-dir <dir>] [--port-base 4330] [--skip-build]
 *   bunx tsx benchmarks/bundle-test-app/client-payload/run.ts \
 *     --render <client-payload.json>   # print the Markdown for a saved run
 *
 * `--v3 workspace` packs the current checkout; build it first with
 * `bun turbo run build --filter=c15t...`.
 */
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { chromium } from 'playwright';

import {
	attributeChunk,
	moduleOf,
	packageOf,
	sourceMappingURLOf,
	stripSourceMappingComment,
} from './attribute';
import type { SourceMapInput } from './attribute';
import { renderReport } from './report';
import type {
	ArmResult,
	AssetResult,
	PayloadResult,
	RouteResult,
} from './report';

const HOST = '127.0.0.1';
const ROUTES = ['/', '/docs'];
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const fixtureDir = join(scriptDir, 'fixture');

/** Versions shared by every arm, pinned to the c15t docs site's stack. */
const CONSUMER_DEPENDENCIES = {
	next: '16.3.4',
	react: '19.2.8',
	'react-dom': '19.2.8',
};
const CONSUMER_DEV_DEPENDENCIES = {
	'@tailwindcss/postcss': '4.3.3',
	'@types/node': '22.14.1',
	'@types/react': '19.2.17',
	tailwindcss: '4.3.3',
	typescript: '5.9.3',
};

/** Workspace packages packed for `--v3 workspace`. */
const PACKED_PACKAGES = [
	'c15t',
	'core',
	'react',
	'nextjs',
	'ui',
	'vue',
	'tanstack-start',
	'schema',
	'translations',
	'iab',
	'dev-tools',
];

type Library = 'none' | 'v2' | 'v3';

interface ArmDefinition {
	layers: string[];
	library: Library;
}

const ARM_DEFINITIONS: Record<string, ArmDefinition> = {
	baseline: { layers: ['baseline'], library: 'none' },
	v2: { layers: ['v2'], library: 'v2' },
	v3: { layers: ['v3'], library: 'v3' },
	'v3-react': { layers: ['v3', 'v3-react'], library: 'v3' },
	'v3-split': { layers: ['v3', 'v3-split'], library: 'v3' },
};

const readFlag = function readFlag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	if (index !== -1) {
		return process.argv[index + 1];
	}
	return process.argv
		.find((arg) => arg.startsWith(`${name}=`))
		?.slice(name.length + 1);
};

const armNames = (readFlag('--arms') ?? Object.keys(ARM_DEFINITIONS).join(','))
	.split(',')
	.map((name) => name.trim())
	.filter(Boolean);
for (const name of armNames) {
	if (!ARM_DEFINITIONS[name]) {
		throw new Error(`Unknown arm "${name}"`);
	}
}
const v3Spec = readFlag('--v3') ?? 'workspace';
const v2Version = readFlag('--v2') ?? '2.2.1';
const workDir = resolve(
	readFlag('--work-dir') ?? join(tmpdir(), 'c15t-client-payload')
);
const outputDir = resolve(
	readFlag('--output-dir') ??
		join(repoRoot, '.benchmarks/current/client-payload')
);
const portBase = Number(readFlag('--port-base') ?? '4330');
const skipBuild = process.argv.includes('--skip-build');

const run = function run(command: string, args: string[], cwd: string) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}\n${result.stderr}`
		);
	}
	return result.stdout;
};

/** HEAD of this checkout, suffixed `-dirty` when packages/ has local edits. */
const gitSha = function gitSha(): string | null {
	const head = spawnSync('git', ['rev-parse', 'HEAD'], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	if (head.status !== 0) {
		return null;
	}
	const status = spawnSync('git', ['status', '--porcelain', 'packages'], {
		cwd: repoRoot,
		encoding: 'utf8',
	});
	return `${head.stdout.trim()}${status.stdout.trim() ? '-dirty' : ''}`;
};

/** Pack the checkout's packages into stable file names (`c15t-react.tgz`). */
const packWorkspace = function packWorkspace(destination: string): string {
	rmSync(destination, { force: true, recursive: true });
	mkdirSync(destination, { recursive: true });
	for (const pkg of PACKED_PACKAGES) {
		run(
			'bun',
			['pm', 'pack', '--ignore-scripts', '--destination', destination],
			join(repoRoot, 'packages', pkg)
		);
	}
	for (const file of readdirSync(destination)) {
		const stable = file.replace(
			/-\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?\.tgz$/u,
			'.tgz'
		);
		if (stable !== file) {
			renameSync(join(destination, file), join(destination, stable));
		}
	}
	return destination;
};

/** Dependencies and npm overrides that install one c15t v3 build. */
const v3Dependencies = function v3Dependencies(): {
	dependencies: Record<string, string>;
	overrides: Record<string, string>;
	source: string;
} {
	if (v3Spec.startsWith('npm:')) {
		const version = v3Spec.slice('npm:'.length);
		return { dependencies: { c15t: version }, overrides: {}, source: v3Spec };
	}
	const tarballDir = v3Spec.startsWith('tarballs:')
		? resolve(v3Spec.slice('tarballs:'.length))
		: packWorkspace(join(workDir, 'tarballs'));
	const overrides: Record<string, string> = {};
	for (const file of readdirSync(tarballDir)) {
		if (!file.endsWith('.tgz')) {
			continue;
		}
		const base = file.slice(0, -'.tgz'.length);
		const name =
			base === 'c15t' ? 'c15t' : `@c15t/${base.replace(/^c15t-/u, '')}`;
		overrides[name] = `file:${join(tarballDir, file)}`;
	}
	const umbrella = overrides.c15t;
	if (!umbrella) {
		throw new Error(`No c15t.tgz in ${tarballDir}`);
	}
	const shaFile = join(tarballDir, 'SOURCE_SHA');
	let sha: string | null = null;
	if (existsSync(shaFile)) {
		sha = readFileSync(shaFile, 'utf8').trim();
	} else if (v3Spec === 'workspace') {
		sha = gitSha();
	}
	return {
		dependencies: { c15t: umbrella },
		overrides,
		source: `${v3Spec}${sha ? ` @ ${sha}` : ''}`,
	};
};

const prepareArm = function prepareArm(
	name: string,
	definition: ArmDefinition,
	v3: ReturnType<typeof v3Dependencies> | null
): string {
	const armDir = join(workDir, name);
	rmSync(armDir, { force: true, recursive: true });
	mkdirSync(armDir, { recursive: true });
	cpSync(join(fixtureDir, 'shared'), armDir, { recursive: true });
	for (const layer of definition.layers) {
		cpSync(join(fixtureDir, 'arms', layer), armDir, { recursive: true });
	}
	let libraryDependencies: Record<string, string> = {};
	if (definition.library === 'v2') {
		libraryDependencies = { '@c15t/nextjs': v2Version };
	} else if (definition.library === 'v3' && v3) {
		libraryDependencies = v3.dependencies;
	}
	writeFileSync(
		join(armDir, 'package.json'),
		`${JSON.stringify(
			{
				dependencies: { ...CONSUMER_DEPENDENCIES, ...libraryDependencies },
				devDependencies: CONSUMER_DEV_DEPENDENCIES,
				name: `c15t-client-payload-${name}`,
				overrides: definition.library === 'v3' && v3 ? v3.overrides : {},
				private: true,
				type: 'module',
			},
			null,
			'\t'
		)}\n`
	);
	run(
		'npm',
		['install', '--no-audit', '--no-fund', '--loglevel=error'],
		armDir
	);
	console.log(`[${name}] installed; building`);
	run(join(armDir, 'node_modules/.bin/next'), ['build'], armDir);
	console.log(`[${name}] built`);
	return armDir;
};

const installedVersion = function installedVersion(
	armDir: string,
	pkg: string
): string | null {
	const path = join(armDir, 'node_modules', pkg, 'package.json');
	return existsSync(path)
		? (JSON.parse(readFileSync(path, 'utf8')) as { version: string }).version
		: null;
};

const startServer = async function startServer(
	armDir: string,
	port: number
): Promise<ChildProcess> {
	const child = spawn(
		join(armDir, 'node_modules/.bin/next'),
		['start', '-H', HOST, '-p', String(port)],
		{
			cwd: armDir,
			env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
			stdio: 'ignore',
		}
	);
	for (let attempt = 0; attempt < 100; attempt += 1) {
		try {
			// oxlint-disable-next-line no-await-in-loop -- Polling: each attempt waits for the previous one.
			const response = await fetch(`http://${HOST}:${port}/`);
			if (response.ok) {
				return child;
			}
		} catch {
			// Not listening yet.
		}
		// oxlint-disable-next-line no-await-in-loop -- Polling interval.
		await sleep(200);
	}
	child.kill();
	throw new Error(`next start on ${port} did not become ready`);
};

/** Measure one emitted asset and attribute its bytes through its map. */
const measureAsset = function measureAsset(
	armDir: string,
	urlPath: string,
	phase: AssetResult['phase']
): AssetResult {
	const file = join(armDir, '.next', urlPath.replace(/^\/_next\//u, ''));
	const type = urlPath.endsWith('.css') ? 'css' : 'js';
	const emitted = readFileSync(file, 'utf8');
	const mapURL = sourceMappingURLOf(emitted);
	const code = stripSourceMappingComment(emitted);
	const bytes = Buffer.from(code, 'utf8');
	const gzip = gzipSync(bytes).byteLength;
	const asset: AssetResult = {
		brotli: brotliCompressSync(bytes).byteLength,
		gzip,
		mapped: false,
		modules: {},
		packages: {},
		path: urlPath,
		phase,
		raw: bytes.byteLength,
		type,
		unmappedBytes: bytes.byteLength,
	};
	const mapFile = mapURL ? join(dirname(file), mapURL) : null;
	if (!(mapFile && existsSync(mapFile))) {
		return asset;
	}
	const map = JSON.parse(readFileSync(mapFile, 'utf8')) as SourceMapInput;
	const attribution = attributeChunk(code, map);
	asset.mapped = true;
	asset.unmappedBytes = attribution.unmappedBytes;
	for (const [source, sourceBytes] of attribution.bySource) {
		const pkg = packageOf(source);
		const mod = moduleOf(source);
		asset.packages[pkg] = (asset.packages[pkg] ?? 0) + sourceBytes;
		asset.modules[mod] = (asset.modules[mod] ?? 0) + sourceBytes;
	}
	return asset;
};

const collectRoute = async function collectRoute(
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	armDir: string,
	baseURL: string,
	route: string,
	hasConsent: boolean
): Promise<RouteResult> {
	// Each phase lists what it loaded beyond that visit's earlier phases; one
	// asset can belong to both interaction phases.
	const seen = new Set<string>();
	const record = (path: string, phase: AssetResult['phase']) => {
		seen.add(`${phase} ${path}`);
	};
	// A fresh visitor per interaction: open the dialog in one context, and
	// accept from the banner in another.
	const visit = async (interaction: 'accept' | 'dialog' | null) => {
		const context = await browser.newContext({
			viewport: { height: 720, width: 1280 },
		});
		const page = await context.newPage();
		const loaded = new Set<string>();
		let phase: AssetResult['phase'] = 'initial';
		page.on('response', (response) => {
			const url = new URL(response.url());
			const type = response.request().resourceType();
			if (
				url.pathname.startsWith('/_next/static/') &&
				(type === 'script' || type === 'stylesheet') &&
				!loaded.has(url.pathname)
			) {
				loaded.add(url.pathname);
				record(url.pathname, phase);
			}
		});
		await page.goto(`${baseURL}${route}`, { waitUntil: 'load' });
		await page.waitForLoadState('networkidle');
		const bannerVisible = await page
			.getByTestId('consent-banner-root')
			.first()
			.isVisible();
		if (interaction === 'dialog') {
			phase = 'dialog';
			await page.getByTestId('consent-banner-customize-button').first().click();
			await page
				.getByTestId('consent-dialog-card')
				.first()
				.waitFor({ state: 'visible', timeout: 15_000 });
		}
		if (interaction === 'accept') {
			phase = 'accept';
			// The save may start after the banner hides; wait for its POST so
			// every chunk the save path loads has arrived.
			const saved = page.waitForResponse(
				(response) =>
					response.request().method() === 'POST' &&
					new URL(response.url()).pathname.endsWith('/subjects'),
				{ timeout: 15_000 }
			);
			await page.getByTestId('consent-banner-accept-button').first().click();
			await page
				.getByTestId('consent-banner-root')
				.first()
				.waitFor({ state: 'hidden', timeout: 15_000 });
			await saved;
		}
		await page.waitForLoadState('networkidle');
		await context.close();
		return bannerVisible;
	};
	const bannerVisible = await visit(hasConsent ? 'dialog' : null);
	if (hasConsent) {
		await visit('accept');
	}
	return {
		assets: [...seen].map((entry) => {
			const [assetPhase, path] = entry.split(' ') as [
				AssetResult['phase'],
				string,
			];
			return measureAsset(armDir, path, assetPhase);
		}),
		bannerVisible,
		dialogVisible: hasConsent,
		route,
	};
};

const main = async function main() {
	mkdirSync(workDir, { recursive: true });
	mkdirSync(outputDir, { recursive: true });
	const needsV3 = armNames.some(
		(name) => ARM_DEFINITIONS[name]?.library === 'v3'
	);
	const v3 = needsV3 && !skipBuild ? v3Dependencies() : null;
	// Remember which build the arms were installed from, for --skip-build.
	const sourceFile = join(workDir, 'v3-source.txt');
	if (v3) {
		writeFileSync(sourceFile, v3.source);
	}
	const v3SourceLabel =
		v3?.source ??
		(existsSync(sourceFile) ? readFileSync(sourceFile, 'utf8') : v3Spec);
	const armDirs = new Map<string, string>();
	for (const name of armNames) {
		const definition = ARM_DEFINITIONS[name] as ArmDefinition;
		armDirs.set(
			name,
			skipBuild ? join(workDir, name) : prepareArm(name, definition, v3)
		);
	}
	const browser = await chromium.launch();
	const arms: ArmResult[] = [];
	try {
		for (const [index, name] of armNames.entries()) {
			const armDir = armDirs.get(name) as string;
			const definition = ARM_DEFINITIONS[name] as ArmDefinition;
			const port = portBase + index;
			// oxlint-disable-next-line no-await-in-loop -- One server at a time keeps arms from competing for the machine.
			const server = await startServer(armDir, port);
			try {
				const routes: RouteResult[] = [];
				for (const route of ROUTES) {
					routes.push(
						// oxlint-disable-next-line no-await-in-loop -- Routes load one at a time on the same server.
						await collectRoute(
							browser,
							armDir,
							`http://${HOST}:${port}`,
							route,
							definition.library !== 'none'
						)
					);
				}
				arms.push({
					library: definition.library,
					name,
					routes,
					versions: {
						'@c15t/core': installedVersion(armDir, '@c15t/core'),
						'@c15t/nextjs': installedVersion(armDir, '@c15t/nextjs'),
						'@c15t/react': installedVersion(armDir, '@c15t/react'),
						c15t: installedVersion(armDir, 'c15t'),
						next: installedVersion(armDir, 'next'),
					},
				});
				console.log(`[${name}] measured`);
			} finally {
				server.kill();
			}
		}
	} finally {
		await browser.close();
	}
	const result: PayloadResult = {
		arms,
		generatedAt: new Date().toISOString(),
		method:
			'Assets are the /_next/static scripts and stylesheets Chromium fetched for the route, each phase in a fresh browser context (initial: until network idle after load; dialog: after clicking Customize on the banner, until network idle; accept: after clicking Accept on the banner, until the banner hides and the network is idle). Sizes are the emitted files with the sourceMappingURL comment removed; gzip and brotli use Node zlib defaults on each file. Bytes are attributed per source module from productionBrowserSourceMaps: each mapping segment owns the generated text up to the next segment. Package gzip is the package share of raw bytes times the chunk gzip size.',
		repoSha: gitSha(),
		v2Version,
		v3Source: v3SourceLabel,
	};
	writeFileSync(
		join(outputDir, 'client-payload.json'),
		`${JSON.stringify(result, null, '\t')}\n`
	);
	writeFileSync(join(outputDir, 'client-payload.md'), renderReport(result));
	console.log(renderReport(result));
};

const renderOnly = readFlag('--render');
if (renderOnly) {
	const result = JSON.parse(readFileSync(renderOnly, 'utf8')) as PayloadResult;
	process.stdout.write(renderReport(result));
} else {
	await main();
}
