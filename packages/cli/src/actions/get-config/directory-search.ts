import fs from 'node:fs';
import path from 'node:path';

/**
 * Find all directories that match the glob pattern(s) relative to the CWD.
 * Only supports simple prefix* patterns (e.g., 'packages/*').
 */
export function findDirectories(cwd: string, patterns: string[]): string[] {
	const results: string[] = [];

	for (const pattern of patterns) {
		// Handle glob patterns by expanding the star
		if (pattern.includes('*')) {
			const [prefix] = pattern.split('*');
			if (prefix) {
				const basePath = path.join(cwd, prefix);

				try {
					if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
						const entries = fs.readdirSync(basePath, { withFileTypes: true });
						for (const entry of entries) {
							if (entry.isDirectory()) {
								// Return path relative to cwd, including the prefix
								results.push(path.join(prefix, entry.name));
							}
						}
					}
				} catch {
					// Ignore errors (e.g., permission issues) and continue
				}
			}
		} else {
			// Handle non-glob paths
			const fullPath = path.join(cwd, pattern);
			try {
				if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
					// Return the pattern itself as it's a valid directory relative to cwd
					results.push(pattern);
				}
			} catch {
				// Ignore errors
			}
		}
	}

	return results;
}
