/**
 * List of possible config file names and locations to search
 */
export const configFileNames = ['c15t', 'consent', 'cmp'];

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
