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

/** Files are relative to the output directory; instructions use {{output}}. */
export interface BoilerplateTemplate {
	files: Record<string, string>;
	dependencies: string[];
	instructions: string[];
}
