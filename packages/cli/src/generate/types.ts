const frameworks = [
	'next-app',
	'next-pages',
	'react',
	'javascript',
	'tanstack-start',
	'vue',
	'nuxt',
	'svelte',
	'sveltekit',
	'solid',
	'astro',
	'astro-static',
	'html',
] as const;

/** Framework targets supported by the v3 integration boilerplate command. */
export type BoilerplateFramework = (typeof frameworks)[number];

/** Every boilerplate framework target, in the order help text lists them. */
export const boilerplateFrameworks: readonly BoilerplateFramework[] =
	frameworks;

/**
 * Check a user-supplied framework name.
 * @param value Framework name from a flag or host default.
 * @returns Whether the value names a boilerplate framework target.
 */
export const isBoilerplateFramework = (
	value: string
): value is BoilerplateFramework =>
	boilerplateFrameworks.some((framework) => framework === value);

/** Inputs shared by framework templates. URLs are literal configuration values. */
export interface BoilerplateOptions {
	framework: BoilerplateFramework;
	mode: 'offline' | 'hosted';
	backendURL?: string;
	scripts: string[];
}

/**
 * How a host applies a generated file when the project already has one.
 * Files without an entry replace the existing file, which hosts only do
 * when the user allows it.
 *
 * - `env`: merge `KEY=value` lines into the existing `.env`.
 * - `keep`: leave the existing file alone; the file is only for new projects.
 * - `insert`: add each snippet before the first `before` text (or at the
 *   start for `''`), unless the file already contains `marker`.
 */
export type FileMerge =
	| { type: 'env' }
	| { type: 'keep' }
	| {
			type: 'insert';
			marker: string;
			inserts: { before: string; content: string }[];
	  };

/**
 * Files are relative to the project root and hold the full contents for a
 * project without them. `merge` says how to apply a file to an existing one.
 */
export interface BoilerplateTemplate {
	files: Record<string, string>;
	merge: Record<string, FileMerge>;
	dependencies: string[];
	instructions: string[];
}
