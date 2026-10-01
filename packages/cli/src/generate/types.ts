/** Framework targets supported by the v3 integration boilerplate command. */
export type BoilerplateFramework =
	| 'next-app'
	| 'next-pages'
	| 'react'
	| 'javascript'
	| 'tanstack-start'
	| 'vue'
	| 'nuxt'
	| 'svelte'
	| 'sveltekit'
	| 'solid'
	| 'astro';

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
