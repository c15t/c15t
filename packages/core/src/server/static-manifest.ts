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
 * @throws {Error} When fetch is unavailable or the backend returns an error.
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
	return (await response.json()) as ConsentManifest;
};

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
	const manifest = await loadStaticManifest(options, defaults.label);
	return [
		`import type { ConsentManifest } from '${importSource}';`,
		'',
		`export const ${exportName} = ${JSON.stringify(manifest, null, 2)} as const satisfies ConsentManifest;`,
		'',
	].join('\n');
};
