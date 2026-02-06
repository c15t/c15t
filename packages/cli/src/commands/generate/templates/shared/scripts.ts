/**
 * Script generation utilities
 * Generates import statements and configuration for selected c15t scripts
 */

/**
 * Converts a script name to camelCase for import usage
 *
 * @param scriptName - The script name (e.g., 'google-tag-manager', 'google-analytics')
 * @returns The camelCase version (e.g., 'googleTagManager', 'googleAnalytics')
 *
 * @example
 * ```ts
 * toCamelCase('google-tag-manager'); // 'googleTagManager'
 * toCamelCase('meta-pixel'); // 'metaPixel'
 * ```
 */
export function toCamelCase(scriptName: string): string {
	return scriptName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Generates the import statements for selected scripts
 * Each script uses a subpath import from @c15t/scripts
 *
 * @param selectedScripts - Array of script names to import
 * @returns The import statements string, or empty string if no scripts
 *
 * @example
 * ```ts
 * generateScriptsImport(['google-tag-manager', 'meta-pixel']);
 * // Returns:
 * // "import { googleTagManager } from '@c15t/scripts/google-tag-manager';
 * //  import { metaPixel } from '@c15t/scripts/meta-pixel';"
 * ```
 */
export function generateScriptsImport(selectedScripts: string[]): string {
	if (!selectedScripts.length) return '';

	return selectedScripts
		.map(
			(script) =>
				`import { ${toCamelCase(script)} } from '@c15t/scripts/${script}';`
		)
		.join('\n');
}

/**
 * Generates the scripts configuration array for ConsentManagerProvider options
 *
 * @param selectedScripts - Array of script names to configure
 * @returns The scripts configuration string, or empty string if no scripts
 *
 * @remarks
 * Each script is called with an empty config object that includes a placeholder
 * comment for the user to fill in their specific IDs.
 *
 * @example
 * ```ts
 * generateScriptsConfig(['google-tag-manager', 'meta-pixel']);
 * // Returns:
 * // "scripts: [
 * //   googleTagManager({ id: 'GTM-XXXXXX' }),
 * //   metaPixel({ id: 'XXXXXXXXXX' }),
 * // ],"
 * ```
 */
export function generateScriptsConfig(selectedScripts: string[]): string {
	if (!selectedScripts.length) return '';

	const scriptConfigs = selectedScripts.map((script) => {
		const funcName = toCamelCase(script);
		const idPlaceholder = getIdPlaceholder(script);
		return `${funcName}({ id: '${idPlaceholder}' })`;
	});

	return `scripts: [
					${scriptConfigs.join(',\n\t\t\t\t\t')},
				],`;
}

/**
 * Gets a placeholder ID for a given script type
 *
 * @param scriptName - The script name
 * @returns A placeholder ID appropriate for that script type
 */
function getIdPlaceholder(scriptName: string): string {
	switch (scriptName) {
		case 'google-tag-manager':
			return 'GTM-XXXXXX';
		case 'google-tag':
			return 'G-XXXXXXXXXX';
		case 'meta-pixel':
			return 'XXXXXXXXXXXXXXXXXX';
		case 'posthog':
			return 'phc_XXXXXXXXXX';
		case 'linkedin-insights':
			return 'XXXXXXX';
		case 'tiktok-pixel':
			return 'XXXXXXXXXXXXXXXXX';
		case 'x-pixel':
			return 'XXXXX';
		case 'microsoft-uet':
			return 'XXXXXXXXXX';
		case 'databuddy':
			return 'YOUR_ID_HERE';
		default:
			return 'YOUR_ID_HERE';
	}
}

/**
 * Generates a comment block showing example script configuration
 * Used when no scripts are selected but user might want to add them later
 *
 * @returns A comment block with example script usage
 */
export function generateScriptsCommentPlaceholder(): string {
	return `// Add your scripts here:
				// import { googleTagManager } from '@c15t/scripts/google-tag-manager';
				// scripts: [
				//   googleTagManager({ id: 'GTM-XXXXXX' }),
				// ],`;
}
