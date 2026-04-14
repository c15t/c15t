/**
 * File system utilities for the c15t CLI
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Check if a file or directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Read a file as text
 */
export async function readFile(filePath: string): Promise<string> {
	return fs.readFile(filePath, 'utf-8');
}

/**
 * Read a file as JSON
 */
export async function readJson<T = unknown>(filePath: string): Promise<T> {
	const content = await fs.readFile(filePath, 'utf-8');
	return JSON.parse(content) as T;
}

/**
 * Write content to a file
 */
export async function writeFile(
	filePath: string,
	content: string
): Promise<void> {
	// Ensure the directory exists
	const dir = path.dirname(filePath);
	await fs.mkdir(dir, { recursive: true });

	await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Write JSON to a file
 */
export async function writeJson(
	filePath: string,
	data: unknown,
	options?: { indent?: number }
): Promise<void> {
	const content = JSON.stringify(data, null, options?.indent ?? 2);
	await writeFile(filePath, content + '\n');
}

/**
 * Create a directory recursively
 */
export async function mkdir(dirPath: string): Promise<void> {
	await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Remove a file or directory
 */
export async function remove(filePath: string): Promise<void> {
	try {
		const stat = await fs.stat(filePath);
		if (stat.isDirectory()) {
			await fs.rm(filePath, { recursive: true });
		} else {
			await fs.unlink(filePath);
		}
	} catch {
		// Ignore if doesn't exist
	}
}

/**
 * Copy a file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
	const dir = path.dirname(dest);
	await fs.mkdir(dir, { recursive: true });
	await fs.copyFile(src, dest);
}

/**
 * List files in a directory
 */
export async function readDir(dirPath: string): Promise<string[]> {
	try {
		return await fs.readdir(dirPath);
	} catch {
		return [];
	}
}

/**
 * Check if a path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(filePath);
		return stat.isDirectory();
	} catch {
		return false;
	}
}

/**
 * Check if a path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
	try {
		const stat = await fs.stat(filePath);
		return stat.isFile();
	} catch {
		return false;
	}
}

/**
 * Find files matching a pattern in a directory
 */
export async function findFiles(
	dir: string,
	pattern: RegExp,
	options?: { maxDepth?: number }
): Promise<string[]> {
	const results: string[] = [];
	const maxDepth = options?.maxDepth ?? 10;

	async function walk(currentDir: string, depth: number): Promise<void> {
		if (depth > maxDepth) return;

		const entries = await fs.readdir(currentDir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and hidden directories
				if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
					await walk(fullPath, depth + 1);
				}
			} else if (entry.isFile() && pattern.test(entry.name)) {
				results.push(fullPath);
			}
		}
	}

	await walk(dir, 0);
	return results;
}

/**
 * Get the relative path from a base directory
 */
export function relativePath(from: string, to: string): string {
	return path.relative(from, to);
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
	return path.join(...segments);
}

/**
 * Get the directory name from a path
 */
export function dirname(filePath: string): string {
	return path.dirname(filePath);
}

/**
 * Get the base name from a path
 */
export function basename(filePath: string, ext?: string): string {
	return path.basename(filePath, ext);
}

/**
 * Get the extension from a path
 */
export function extname(filePath: string): string {
	return path.extname(filePath);
}

/**
 * Resolve a path to an absolute path
 */
export function resolvePath(...segments: string[]): string {
	return path.resolve(...segments);
}
