import type { CliContext } from '~/context/types';
import { getPathAliases } from './path-alias-utils';

/**
 * Get Jiti options for transpiling TypeScript/JSX
 */
export const jitiOptions = (context: CliContext, cwd: string) => {
	const alias = getPathAliases(context, cwd) || {};
	return {
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
		alias,
	};
};
