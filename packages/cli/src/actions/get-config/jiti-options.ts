import type { CliContext } from '~/context/types';

/**
 * Get Jiti options for transpiling TypeScript/JSX
 */
export const jitiOptions = (context: CliContext, cwd: string) => {
	const alias = context.config.getPathAliases(cwd) || {};
	return {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
		alias,
	};
};
