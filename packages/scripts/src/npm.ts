import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

export type NpmProvider = 'jsdelivr' | 'cdnjs' | 'unpkg';

/**
 * Generic npm CDN vendor manifest.
 *
 * The helper builds a concrete CDN URL up front, then delegates loading to the
 * standard manifest runtime.
 */
export const npmManifest = {
	...vendorManifestContract,
	vendor: 'npm',
	category: 'necessary',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
		},
	],
} as const satisfies VendorManifest;

export interface NpmOptions {
	/**
	 * The npm package name to load.
	 */
	packageName: string;

	/**
	 * The file path within the package.
	 */
	file?: string;

	/**
	 * The package version to resolve from the CDN.
	 * @default 'latest'
	 */
	version?: string;

	/**
	 * CDN provider used to build the script URL.
	 * @default 'unpkg'
	 */
	provider?: NpmProvider;

	/**
	 * Optional script identifier override.
	 */
	key?: string;
}

function getProviderBaseUrl(
	provider: NpmProvider = 'unpkg',
	packageName: string,
	version = 'latest'
): string {
	switch (provider) {
		case 'jsdelivr':
			return `https://cdn.jsdelivr.net/npm/${packageName}@${version}/`;
		case 'cdnjs':
			return `https://cdnjs.cloudflare.com/ajax/libs/${packageName}/${version}/`;
		case 'unpkg':
		default:
			return `https://unpkg.com/${packageName}@${version}/`;
	}
}

function buildNpmScriptSrc(options: NpmOptions): string {
	const baseUrl = getProviderBaseUrl(
		options.provider,
		options.packageName,
		options.version
	);
	const file = options.file?.replace(/^\/+/, '') ?? '';

	return file.length > 0 ? `${baseUrl}${file}` : baseUrl;
}

function getDefaultVendor(packageName: string): string {
	const normalized = packageName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return `${normalized || 'package'}-npm`;
}

/**
 * Creates an npm CDN script.
 *
 * The helper resolves the final CDN URL eagerly because the manifest runtime
 * can only load a single concrete script source per helper.
 *
 * @param options - The options for the npm CDN script
 * @returns The npm CDN script configuration
 *
 * @example
 * ```ts
 * const alpineScript = npm({
 *   packageName: 'alpinejs',
 *   file: 'dist/cdn.min.js',
 * });
 * ```
 */
export function npm(options: NpmOptions): Script {
	const manifest: VendorManifest = {
		...npmManifest,
		vendor: options.key ?? getDefaultVendor(options.packageName),
	};

	const resolved = resolveManifest(manifest, {
		scriptSrc: buildNpmScriptSrc(options),
	});

	return resolved;
}
