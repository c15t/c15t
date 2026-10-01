/**
 * Pure helpers for the production-consumer bench: which c15t build an arm
 * installs, how its packed tarballs map to package names, the consumer
 * `package.json`, and the scenario definitions with their cold states.
 *
 * The consumer installs packed tarballs (or a published version) into a
 * directory outside the workspace, so the `exports` map, `dist/` output and
 * CSS entrypoints are exactly what a user installs. Workspace-linked
 * fixtures resolve source and hid the stylesheet contract problem.
 */
import type { BenchColdState, BenchVisitKind } from './visit-definitions';
import { describeColdState } from './visit-definitions';

/** Where an arm's c15t packages come from. */
export type ConsumerArmSource =
	| { kind: 'workspace' }
	| { kind: 'root'; path: string }
	| { kind: 'tarballs'; dir: string }
	| { kind: 'npm'; version: string };

export interface ConsumerArm {
	label: string;
	source: ConsumerArmSource;
}

const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]*$/u;

/**
 * Parse `--arm <label>=<source>`. Sources: `workspace`, `root:<path>` (pack
 * a built c15t checkout), `tarballs:<dir>` (pre-packed `.tgz` files), and
 * `npm:<version>` (install the published version).
 *
 * @param spec - The flag value.
 * @returns The arm.
 * @throws {Error} When the label or source is malformed.
 */
export const parseConsumerArm = function parseConsumerArm(
	spec: string
): ConsumerArm {
	const separator = spec.indexOf('=');
	if (separator <= 0) {
		throw new Error(
			`Invalid --arm "${spec}". Expected <label>=<workspace|root:<path>|tarballs:<dir>|npm:<version>>.`
		);
	}
	const label = spec.slice(0, separator);
	const value = spec.slice(separator + 1);
	if (!LABEL_PATTERN.test(label)) {
		throw new Error(
			`Invalid arm label "${label}". Use lowercase letters, digits, and dashes.`
		);
	}
	if (value === 'workspace') {
		return { label, source: { kind: 'workspace' } };
	}
	const colon = value.indexOf(':');
	const kind = colon > 0 ? value.slice(0, colon) : '';
	const argument = colon > 0 ? value.slice(colon + 1) : '';
	if (argument.length > 0) {
		if (kind === 'root') {
			return { label, source: { kind: 'root', path: argument } };
		}
		if (kind === 'tarballs') {
			return { label, source: { dir: argument, kind: 'tarballs' } };
		}
		if (kind === 'npm') {
			return { label, source: { kind: 'npm', version: argument } };
		}
	}
	throw new Error(
		`Invalid arm source "${value}". Expected workspace, root:<path>, tarballs:<dir>, or npm:<version>.`
	);
};

export interface WorkspacePackageInfo {
	name: string;
	version: string;
	dir: string;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
}

/**
 * Workspace packages reachable from `root` through `workspace:` specifiers,
 * including `root` itself, in discovery order.
 *
 * @param packages - Every workspace package, keyed by name.
 * @param root - Entry package name, normally `c15t`.
 * @returns The packages to pack.
 * @throws {Error} When `root` is not a workspace package.
 */
export const workspaceDependencyClosure = function workspaceDependencyClosure(
	packages: ReadonlyMap<string, WorkspacePackageInfo>,
	root: string
): WorkspacePackageInfo[] {
	if (!packages.has(root)) {
		throw new Error(`Workspace package "${root}" not found.`);
	}
	const seen = new Set<string>();
	const ordered: WorkspacePackageInfo[] = [];
	const queue = [root];
	while (queue.length > 0) {
		const name = queue.shift() as string;
		const info = packages.get(name);
		if (!info || seen.has(name)) {
			continue;
		}
		seen.add(name);
		ordered.push(info);
		for (const field of [
			info.dependencies,
			info.peerDependencies,
			info.optionalDependencies,
		]) {
			for (const [dependency, specifier] of Object.entries(field ?? {})) {
				if (specifier.startsWith('workspace:') && packages.has(dependency)) {
					queue.push(dependency);
				}
			}
		}
	}
	return ordered;
};

/** File name `bun pm pack` and `npm pack` give a package's tarball. */
export const packedTarballName = function packedTarballName(
	name: string,
	version: string
): string {
	return `${name.replace(/^@/u, '').replace('/', '-')}-${version}.tgz`;
};

export interface ConsumerPackageJsonInput {
	/** Package name to `file:` tarball path, for tarball arms. */
	tarballs?: ReadonlyMap<string, string>;
	/** Published `c15t` version, for npm arms. */
	c15tVersion?: string;
	nextVersion: string;
	reactVersion: string;
	typescriptVersion: string;
	typesReactVersion: string;
	typesReactDomVersion: string;
	typesNodeVersion: string;
}

/**
 * The consumer's `package.json`. Tarball arms depend on the `c15t` tarball
 * and override every other `@c15t/*` package to its tarball, so no
 * transitive dependency resolves from the registry or the workspace.
 *
 * @param input - Versions and tarball locations.
 * @returns A JSON-serializable package manifest.
 * @throws {Error} When neither tarballs nor a version is supplied, or `c15t` is missing.
 */
export const consumerPackageJson = function consumerPackageJson(
	input: ConsumerPackageJsonInput
): Record<string, unknown> {
	let c15tSpecifier: string;
	const overrides: Record<string, string> = {};
	if (input.tarballs) {
		const umbrella = input.tarballs.get('c15t');
		if (!umbrella) {
			throw new Error('The tarball set has no c15t package.');
		}
		c15tSpecifier = `file:${umbrella}`;
		for (const [name, path] of input.tarballs) {
			if (name !== 'c15t') {
				overrides[name] = `file:${path}`;
			}
		}
	} else if (input.c15tVersion) {
		c15tSpecifier = input.c15tVersion;
	} else {
		throw new Error('A consumer needs tarballs or a published c15t version.');
	}

	return {
		dependencies: {
			c15t: c15tSpecifier,
			next: input.nextVersion,
			react: input.reactVersion,
			'react-dom': input.reactVersion,
		},
		devDependencies: {
			'@types/node': input.typesNodeVersion,
			'@types/react': input.typesReactVersion,
			'@types/react-dom': input.typesReactDomVersion,
			typescript: input.typescriptVersion,
		},
		name: 'c15t-production-consumer',
		overrides,
		private: true,
		scripts: { build: 'next build', start: 'next start' },
		type: 'module',
	};
};

/** Scenario names the production-consumer bench measures. */
export type ConsumerScenarioName =
	| 'fresh'
	| 'fresh-warm-browser-cache'
	| 'fresh-cold-sdk-manifest'
	| 'fresh-cold-process'
	| 'saved-consent-accept'
	| 'saved-consent-reject';

export interface ConsumerScenarioDefinition {
	name: ConsumerScenarioName;
	visit: BenchVisitKind;
	coldState: BenchColdState;
	/** Open the deferred preference dialog after the load. */
	opensDialog: boolean;
	/** Read the raw server HTML stream for this scenario. */
	readsServerHtml: boolean;
}

/**
 * The production-consumer scenarios. Each cold state is its own scenario so
 * no label mixes a browser-cache miss with an SDK or process restart. The
 * CDN edge is never in the path locally and is reported as not measured.
 */
export const consumerScenarios: readonly ConsumerScenarioDefinition[] = [
	{
		coldState: describeColdState({
			freshBrowserContext: true,
			usesManifestCache: true,
		}),
		name: 'fresh',
		opensDialog: true,
		readsServerHtml: true,
		visit: 'fresh',
	},
	{
		coldState: describeColdState({
			freshBrowserContext: false,
			note: 'cookies and localStorage cleared after a first visit in the same context, so only the HTTP cache carries over',
			usesManifestCache: true,
		}),
		name: 'fresh-warm-browser-cache',
		opensDialog: false,
		readsServerHtml: false,
		visit: 'fresh',
	},
	{
		coldState: describeColdState({
			freshBrowserContext: true,
			manifestCacheKeyIsNew: true,
			note: 'each sample sends a new manifest token, so the SDK fetches the manifest from the origin',
			usesManifestCache: true,
		}),
		name: 'fresh-cold-sdk-manifest',
		opensDialog: false,
		readsServerHtml: true,
		visit: 'fresh',
	},
	{
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'readiness is polled on the fixture API route, so the page route and the SDK are first used by the measured request; the Next Data Cache on disk survives the restart, so serverManifestFetches shows whether the manifest origin was reached',
			processStartedForSample: true,
			usesManifestCache: true,
		}),
		name: 'fresh-cold-process',
		opensDialog: false,
		readsServerHtml: false,
		visit: 'fresh',
	},
	{
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'cookies and localStorage carried over from a visit that accepted',
			usesManifestCache: true,
		}),
		name: 'saved-consent-accept',
		opensDialog: true,
		readsServerHtml: true,
		visit: 'saved-accept',
	},
	{
		coldState: describeColdState({
			freshBrowserContext: true,
			note: 'cookies and localStorage carried over from a visit that rejected',
			usesManifestCache: true,
		}),
		name: 'saved-consent-reject',
		opensDialog: true,
		readsServerHtml: true,
		visit: 'saved-reject',
	},
] as const;

/**
 * Order arms for one iteration: forward on even iterations and reversed on
 * odd ones (ABBA...), so neither arm always runs first.
 */
export const interleaveArms = function interleaveArms<ArmType>(
	arms: readonly ArmType[],
	iteration: number
): ArmType[] {
	return iteration % 2 === 0 ? [...arms] : [...arms].reverse();
};
