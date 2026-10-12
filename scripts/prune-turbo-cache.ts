#!/usr/bin/env bun

import type { Dirent } from 'node:fs';
import { mkdtemp, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_MAX_CACHE_BYTES = 1024 * 1024 * 1024;

const DEFAULT_CACHE_DIRECTORY = fileURLToPath(
	new URL('../.turbo/cache', import.meta.url)
);
const CACHE_FILE_PATTERN =
	/^(?<capture1>.*?)(?<capture2>\.tar\.zst|-meta\.json|-manifest\.json)$/u;

interface CacheFile {
	name: string;
	path: string;
	size: number;
	mtimeMs: number;
	type: 'archive' | 'manifest' | 'metadata' | 'unknown';
}

interface CacheEntry {
	id: string;
	files: CacheFile[];
	size: number;
	mtimeMs: number;
}

export interface PruneTurboCacheOptions {
	cacheDirectory?: string;
	maxBytes?: number;
}

export interface PruneTurboCacheResult {
	afterBytes: number;
	beforeBytes: number;
	removedEntries: number;
	removedFiles: number;
}

const cacheFileIdentity = function cacheFileIdentity(name: string) {
	const match = name.match(CACHE_FILE_PATTERN);
	if (!match?.[1] || !match[2]) {
		return { id: `unknown:${name}`, type: 'unknown' as const };
	}

	// oxlint-disable-next-line no-nested-ternary -- Preserve established branch order and control flow.
	const type = match[2].endsWith('.tar.zst')
		? 'archive'
		: match[2] === '-meta.json'
			? 'metadata'
			: 'manifest';

	return { id: `turbo:${match[1]}`, type } as const;
};

const collectCacheEntries = async function collectCacheEntries(
	cacheDirectory: string
): Promise<CacheEntry[]> {
	let directoryEntries: Dirent[];
	try {
		directoryEntries = await readdir(cacheDirectory, {
			withFileTypes: true,
		});
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return [];
		}
		throw error;
	}

	const groups = new Map<string, CacheFile[]>();
	for (const directoryEntry of directoryEntries) {
		if (!directoryEntry.isFile()) {
			continue;
		}

		const path = join(cacheDirectory, directoryEntry.name);
		// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
		const fileStats = await stat(path);
		const identity = cacheFileIdentity(directoryEntry.name);
		const files = groups.get(identity.id) ?? [];
		files.push({
			mtimeMs: fileStats.mtimeMs,
			name: directoryEntry.name,
			path,
			size: fileStats.size,
			type: identity.type,
		});
		groups.set(identity.id, files);
	}

	return [...groups].map(([id, files]) => ({
		files,
		id,
		mtimeMs: Math.max(...files.map((file) => file.mtimeMs)),
		size: files.reduce((total, file) => total + file.size, 0),
	}));
};

const removalOrder = function removalOrder(files: CacheFile[]) {
	const priority = {
		archive: 0,
		manifest: 1,
		metadata: 1,
		unknown: 0,
	} as const;

	return [...files].sort(
		(left, right) =>
			priority[left.type] - priority[right.type] ||
			left.name.localeCompare(right.name)
	);
};

export const pruneTurboCache = async function pruneTurboCache({
	cacheDirectory = DEFAULT_CACHE_DIRECTORY,
	maxBytes = DEFAULT_MAX_CACHE_BYTES,
}: PruneTurboCacheOptions = {}): Promise<PruneTurboCacheResult> {
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
		throw new Error('maxBytes must be a non-negative safe integer');
	}

	const entries = await collectCacheEntries(cacheDirectory);
	const beforeBytes = entries.reduce((total, entry) => total + entry.size, 0);
	const newestFirst = entries.sort(
		(left, right) =>
			right.mtimeMs - left.mtimeMs || left.id.localeCompare(right.id)
	);

	let retainedBytes = 0;
	let exceededLimit = false;
	const entriesToRemove: CacheEntry[] = [];
	for (const entry of newestFirst) {
		if (!exceededLimit && retainedBytes + entry.size <= maxBytes) {
			retainedBytes += entry.size;
			continue;
		}

		exceededLimit = true;
		entriesToRemove.push(entry);
	}

	if (entriesToRemove.length === 0) {
		return {
			afterBytes: beforeBytes,
			beforeBytes,
			removedEntries: 0,
			removedFiles: 0,
		};
	}

	const stagingDirectory = await mkdtemp(
		join(dirname(cacheDirectory), '.turbo-cache-prune-')
	);
	let movedFiles = 0;
	try {
		await Array.from(entriesToRemove.entries()).reduce(
			async (previousIteration, [entryIndex, entry]) => {
				await previousIteration;
				for (const file of removalOrder(entry.files)) {
					// oxlint-disable-next-line no-await-in-loop -- Preserve sequential execution and callback compatibility.
					await rename(
						file.path,
						join(
							stagingDirectory,
							`${entryIndex}-${movedFiles}-${basename(file.path)}`
						)
					);
					movedFiles += 1;
				}
			},
			Promise.resolve()
		);
	} finally {
		await rm(stagingDirectory, { force: true, recursive: true });
	}

	const removedBytes = entriesToRemove.reduce(
		(total, entry) => total + entry.size,
		0
	);
	return {
		afterBytes: beforeBytes - removedBytes,
		beforeBytes,
		removedEntries: entriesToRemove.length,
		removedFiles: movedFiles,
	};
};

if (import.meta.main) {
	const result = await pruneTurboCache();
	console.log(
		`turbo cache: ${result.beforeBytes} -> ${result.afterBytes} bytes ` +
			`(${result.removedEntries} entries, ${result.removedFiles} files removed)`
	);
}
