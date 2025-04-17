/**
 * List of possible config file names and locations to search.
 * Priority order:
 * 1. c15t.config.ts - Primary frontend configuration (recommended)
 * 2. c15t.backend.ts - Optional backend configuration (recommended)
 * 3. Legacy/alternative names for backward compatibility
 */
export const configFileNames = [
	// Recommended primary config files
	'c15t.config', // Frontend config (primary)
	'c15t.backend', // Backend config (optional)

	// Legacy/alternative names (for backward compatibility)
	'c15t',
	'c15t.client',
	'consent.config',
	'consent.backend',
	'consent',
	'cmp.config',
	'cmp.backend',
	'cmp',
];

export const extensions = [
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	'.cjs',
	'.cts',
	'.mjs',
	'.mts',
	'.server.cjs',
	'.server.cts',
	'.server.js',
	'.server.jsx',
	'.server.mjs',
	'.server.mts',
	'.server.ts',
	'.server.tsx',
];

// Generate all possible file combinations
export let possiblePaths = configFileNames.flatMap((name) =>
	extensions.map((ext) => `${name}${ext}`)
);

// Define all directories to search in
export const directories = [
	'',
	'lib/server/',
	'server/',
	'lib/',
	'utils/',
	'config/',
	'src/',
	'app/',
];

// Combine directories with possible paths
possiblePaths = directories.flatMap((dir) =>
	possiblePaths.map((file) => `${dir}${file}`)
);

// Also search for config files in package subdirectories (for monorepos)
export const monorepoSubdirs = ['packages/*', 'apps/*'];
