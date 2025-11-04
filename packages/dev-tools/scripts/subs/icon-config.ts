/**
 * Icon Configuration
 *
 * This file contains configuration for the icon scanning and sprite generation process.
 */

/**
 * Icons that should ALWAYS be included in the sprite sheet,
 * even if they are not detected in the codebase.
 *
 * This is useful for:
 * - Icons that are dynamically referenced at runtime
 * - Icons that are used in external content (e.g., CMS, markdown files)
 * - Icons that must be available for future use
 *
 * Simply add icon names to this array to ensure they're included.
 */
export const SAFE_LIST_ICONS = [
	// Add more icon names here as needed
	// Example: 'my-custom-icon',
] as const;

/**
 * Directories to skip during file scanning.
 * These are common build/cache directories that don't need to be scanned.
 */
export const SKIP_DIRECTORIES = new Set([
	'node_modules',
	'.git',
	'.hg',
	'.svn',
	'dist',
	'build',
	'out',
	'.next',
	'target',
	'.parcel-cache',
	'coverage',
	'.cache',
	'.turbo',
	'.vercel',
	'.output',
	'.nuxt',
	'.astro',
	'.svelte-kit',
	'.vuepress',
	'.docusaurus',
	'.vitepress',
]);

/**
 * Import paths to recognize as icon components.
 * Files importing from these paths will be scanned for icon usage.
 */
export const IMPORT_NAMES = [
	'@react-zero-ui/icon-sprite',
	'~/pkgs/optin/components/icon',
	'@/pkgs/optin/components/icon',
	'../../pkgs/optin/components/icon',
	'../pkgs/optin/components/icon',
	'./pkgs/optin/components/icon',
];
