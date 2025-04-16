import { getPathAliases } from './path-alias-utils';

/**
 * Get Jiti options for transpiling TypeScript/JSX
 */
export const jitiOptions = (cwd: string) => {
	const alias = getPathAliases(cwd) || {};
	return {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
		alias,
	};
};
