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
	// Only proceed if Tailwind v3 is detected
	if (!tailwindVersion || !tailwindVersion.match(/^(?:\^|~)?3/)) {
		return { updated: false, filePath: null };
	}

	for (const pattern of CSS_PATTERNS) {
		const filePath = path.join(projectRoot, pattern);
		try {
			await fs.access(filePath);
			const content = await fs.readFile(filePath, 'utf-8');

			// Check if it already has the v3 pattern or at least the @layer base, components
			if (content.includes('@layer base, components;')) {
				return { updated: false, filePath };
			}

			// Check if it contains @tailwind directives
			if (
				content.includes('@tailwind base') ||
				content.includes('@tailwind components') ||
				content.includes('@tailwind utilities')
			) {
				// Replace standard tailwind directives with v3 pattern
				let newContent = content;

				if (newContent.includes('@tailwind base')) {
					newContent = newContent.replace(
						'@tailwind base;',
						'@layer base {\n  @tailwind base;\n}'
					);
					// If it didn't have the semicolon
					newContent = newContent.replace(
						'@tailwind base\n',
						'@layer base {\n  @tailwind base;\n}\n'
					);
				}

				if (!newContent.includes('@layer base, components;')) {
					newContent = `@layer base, components;\n\n${newContent}`;
				}

				await fs.writeFile(filePath, newContent, 'utf-8');
				return { updated: true, filePath };
			}
		} catch {
			// File doesn't exist, try next pattern
		}
	}

	return { updated: false, filePath: null };
}
