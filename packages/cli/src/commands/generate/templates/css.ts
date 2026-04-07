import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Patterns for common CSS files that might contain Tailwind directives
 */
const CSS_PATTERNS = [
	'app/globals.css',
	'src/app/globals.css',
	'app/global.css',
	'src/app/global.css',
	'styles/globals.css',
	'src/styles/globals.css',
	'styles/global.css',
	'src/styles/global.css',
	'src/index.css',
	'src/App.css',
];

/**
 * Updates the project's CSS file for Tailwind v3 compatibility if needed
 *
 * @param projectRoot - The root directory of the project
 * @param tailwindVersion - The detected Tailwind version
 * @returns Object indicating if the update was successful and the file path
 */
export async function updateTailwindCss(
	projectRoot: string,
	tailwindVersion: string | null
): Promise<{ updated: boolean; filePath: string | null }> {
	// Tailwind v3 no longer needs a CSS rewrite. Styled installs use the
	// dedicated styles.tw3.css entrypoint, and standard Tailwind directives can
	// remain unchanged in the app stylesheet.
	if (!tailwindVersion || !tailwindVersion.match(/^(?:\^|~)?3/)) {
		return { updated: false, filePath: null };
	}

	for (const pattern of CSS_PATTERNS) {
		const filePath = path.join(projectRoot, pattern);
		try {
			await fs.access(filePath);
			return { updated: false, filePath };
		} catch {
			// File doesn't exist, try next pattern
		}
	}

	return { updated: false, filePath: null };
}
