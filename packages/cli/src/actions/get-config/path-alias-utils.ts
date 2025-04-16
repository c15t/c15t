import fs from 'node:fs';
import path from 'node:path';
import type { CliContext } from '~/context/types';
import { addSvelteKitEnvModules } from './add-svelte-kit-env-modules'; // Path within the same dir

/**
 * Strip JSON comments from a string for safe parsing
 */
function stripJsonComments(jsonString: string): string {
	return jsonString
		.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) =>
			g ? '' : m
		)
		.replace(/,(?=\s*[}\]])/g, '');
}

/**
 * Extract path aliases from a TypeScript or JavaScript config file
 */
function extractAliasesFromConfigFile(
	context: CliContext,
	configPath: string,
	cwd: string
): Record<string, string> | null {
	try {
		const configContent = fs.readFileSync(configPath, 'utf8');
		const strippedConfigContent = stripJsonComments(configContent);
		const config = JSON.parse(strippedConfigContent);
		const { paths = {}, baseUrl = '.' } = config.compilerOptions || {};

		const result: Record<string, string> = {};
		const obj = Object.entries(paths) as [string, string[]][];
		for (const [alias, aliasPaths] of obj) {
			for (const aliasedPath of aliasPaths) {
				const resolvedBaseUrl = path.join(cwd, baseUrl);
				const finalAlias = alias.slice(-1) === '*' ? alias.slice(0, -1) : alias;
				const finalAliasedPath =
					aliasedPath.slice(-1) === '*'
						? aliasedPath.slice(0, -1)
						: aliasedPath;

				result[finalAlias || ''] = path.join(resolvedBaseUrl, finalAliasedPath);
			}
		}
		addSvelteKitEnvModules(result);
		return result;
	} catch (error) {
		context.logger.warn(`Error parsing config file ${configPath}`, error);
		return null;
	}
}

/**
 * Extract path aliases from tsconfig.json or jsconfig.json
 */
export function getPathAliases(
	context: CliContext,
	cwd: string
): Record<string, string> | null {
	const tsConfigPath = path.join(cwd, 'tsconfig.json');
	if (!fs.existsSync(tsConfigPath)) {
		// Also try searching for jsconfig.json
		const jsConfigPath = path.join(cwd, 'jsconfig.json');
		if (!fs.existsSync(jsConfigPath)) {
			return null;
		}
		// Use jsconfig.json instead
		return extractAliasesFromConfigFile(context, jsConfigPath, cwd);
	}
	return extractAliasesFromConfigFile(context, tsConfigPath, cwd);
}
