import type { ConsentManifest } from '@c15t/schema/types';

import { c15tProtocolHeaders } from '../transports/version-header';

/** Names that parse but cannot be bound with `export const`. */
const RESERVED_EXPORT_NAMES = new Set([
	'arguments',
	'await',
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'enum',
	'eval',
	'export',
	'extends',
	'false',
	'finally',
	'for',
	'function',
	'if',
	'implements',
	'import',
	'in',
	'instanceof',
	'interface',
	'let',
	'new',
	'null',
	'package',
	'private',
	'protected',
	'public',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'true',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
]);

/** Options shared by framework build-time manifest generators. */
export interface StaticManifestModuleOptions {
	manifestURL: string;
	fetch?: typeof globalThis.fetch;
	exportName?: string;
	importSource?: string;
}

/** Fetches a manifest for build-time code generation.
 * @param options - Manifest URL and optional fetch implementation.
 * @param label - Framework name used in errors.
 * @returns The backend manifest.
 * @throws {Error} When fetch is unavailable or the response is not a valid manifest.
 */
export const loadStaticManifest = async (
	options: Pick<StaticManifestModuleOptions, 'manifestURL' | 'fetch'>,
	label: string
): Promise<ConsentManifest> => {
	const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error(`${label}: no fetch available.`);
	}
	const response = await fetchImpl(options.manifestURL, {
		headers: { accept: 'application/json', ...c15tProtocolHeaders },
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`${label}: /manifest responded ${response.status} ${response.statusText}`
		);
	}
	try {
		// Build/static loading owns validation; request resolvers need no schemas.
		const { parseConsentManifest } = await import('@c15t/schema');
		return parseConsentManifest(await response.json());
	} catch (cause) {
		throw new Error(
			`${label}: /manifest returned an invalid consent manifest.`,
			{
				cause,
			}
		);
	}
};

/**
 * Validates the identifiers a generated manifest module uses.
 * @param options - Requested export name and type import source.
 * @param defaults - Framework import source and error label.
 * @returns The export name and import source to write.
 * @throws {Error} When either identifier is invalid.
 * @internal
 */
export const resolveStaticManifestModuleNames = (
	options: Pick<StaticManifestModuleOptions, 'exportName' | 'importSource'>,
	defaults: { importSource: string; label: string }
): { exportName: string; importSource: string } => {
	const exportName = options.exportName ?? 'consentManifest';
	if (
		!/^[A-Za-z_$][\w$]*$/u.test(exportName) ||
		RESERVED_EXPORT_NAMES.has(exportName)
	) {
		throw new Error(
			`${defaults.label}: exportName must be a valid identifier, received ${JSON.stringify(exportName)}.`
		);
	}
	const importSource = options.importSource ?? defaults.importSource;
	if (!/^[A-Za-z0-9@_./+~-]+$/u.test(importSource)) {
		throw new Error(
			`${defaults.label}: importSource must be a module specifier, received ${JSON.stringify(importSource)}.`
		);
	}
	return { exportName, importSource };
};

/**
 * Renders a generated manifest module. Without a manifest, the export is
 * `undefined` with the same `ConsentManifest` type, so imports still compile
 * and the server fetches the manifest at runtime.
 * @param names - Validated export name and type import source.
 * @param manifest - The snapshot, or `undefined` when the build has none.
 * @returns TypeScript source for the module.
 * @internal
 */
export const renderStaticManifestModule = (
	names: { exportName: string; importSource: string },
	manifest: ConsentManifest | undefined
): string =>
	[
		`import type { ConsentManifest } from '${names.importSource}';`,
		'',
		...(manifest
			? [
					`export const ${names.exportName} = ${JSON.stringify(manifest, null, 2)} as const satisfies ConsentManifest;`,
				]
			: [
					'// The build did not fetch the manifest, so the server fetches it at runtime.',
					`export const ${names.exportName}: ConsentManifest | undefined = undefined;`,
				]),
		'',
	].join('\n');

/** Generates a typed module with validated export and import names.
 * @param options - Manifest fetch options and generated identifiers.
 * @param defaults - Framework import source and error label.
 * @returns TypeScript source containing the manifest.
 * @throws {Error} When a generated identifier is invalid or the fetch fails.
 */
export const createStaticManifestModule = async (
	options: StaticManifestModuleOptions,
	defaults: { importSource: string; label: string }
): Promise<string> => {
	const names = resolveStaticManifestModuleNames(options, defaults);
	const manifest = await loadStaticManifest(options, defaults.label);
	return renderStaticManifestModule(names, manifest);
};
