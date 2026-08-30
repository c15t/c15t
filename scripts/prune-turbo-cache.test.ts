import {
	access,
	mkdtemp,
	readdir,
	rm,
	utimes,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_MAX_CACHE_BYTES, pruneTurboCache } from './prune-turbo-cache';

const temporaryDirectories: string[] = [];

async function createCacheDirectory() {
	const directory = await mkdtemp(join(tmpdir(), 'c15t-turbo-cache-'));
	temporaryDirectories.push(directory);
	return directory;
}

async function createFile(
	directory: string,
	name: string,
	size: number,
	mtimeMs: number
) {
	const path = join(directory, name);
	await writeFile(path, Buffer.alloc(size));
	const mtime = new Date(mtimeMs);
	await utimes(path, mtime, mtime);
	return path;
}

async function fileExists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

afterEach(async () => {
	await Promise.all(
		temporaryDirectories.splice(0).map((directory) =>
			rm(directory, {
				force: true,
				recursive: true,
			})
		)
	);
});

describe('pruneTurboCache', () => {
	it('uses a 1 GiB default limit', () => {
		expect(DEFAULT_MAX_CACHE_BYTES).toBe(1024 * 1024 * 1024);
	});

	it('returns an empty result when the cache directory does not exist', async () => {
		const parent = await createCacheDirectory();

		await expect(
			pruneTurboCache({ cacheDirectory: join(parent, 'missing') })
		).resolves.toEqual({
			afterBytes: 0,
			beforeBytes: 0,
			removedEntries: 0,
			removedFiles: 0,
		});
	});

	it('leaves a cache at the limit unchanged', async () => {
		const directory = await createCacheDirectory();
		await createFile(directory, 'current.tar.zst', 6, 2);
		await createFile(directory, 'current-meta.json', 2, 2);

		const result = await pruneTurboCache({
			cacheDirectory: directory,
			maxBytes: 8,
		});

		expect(result).toEqual({
			afterBytes: 8,
			beforeBytes: 8,
			removedEntries: 0,
			removedFiles: 0,
		});
		expect(await readdir(directory)).toHaveLength(2);
	});

	it('removes all files in the oldest logical entry', async () => {
		const directory = await createCacheDirectory();
		const oldFiles = await Promise.all([
			createFile(directory, 'old.tar.zst', 4, 1),
			createFile(directory, 'old-manifest.json', 2, 1),
			createFile(directory, 'old-meta.json', 2, 1),
		]);
		const newFiles = await Promise.all([
			createFile(directory, 'new.tar.zst', 4, 2),
			createFile(directory, 'new-manifest.json', 2, 2),
			createFile(directory, 'new-meta.json', 2, 2),
		]);

		const result = await pruneTurboCache({
			cacheDirectory: directory,
			maxBytes: 8,
		});

		expect(result).toEqual({
			afterBytes: 8,
			beforeBytes: 16,
			removedEntries: 1,
			removedFiles: 3,
		});
		await Promise.all(
			oldFiles.map(async (path) => expect(await fileExists(path)).toBe(false))
		);
		await Promise.all(
			newFiles.map(async (path) => expect(await fileExists(path)).toBe(true))
		);
	});

	it('counts orphan and unknown files toward the limit', async () => {
		const directory = await createCacheDirectory();
		const oldOrphan = await createFile(directory, 'orphan-meta.json', 4, 1);
		const unknown = await createFile(directory, 'future-cache.bin', 4, 2);

		const result = await pruneTurboCache({
			cacheDirectory: directory,
			maxBytes: 4,
		});

		expect(result.afterBytes).toBe(4);
		expect(result.beforeBytes).toBe(8);
		expect(await fileExists(oldOrphan)).toBe(false);
		expect(await fileExists(unknown)).toBe(true);
	});

	it('removes every older entry after the newest prefix exceeds the limit', async () => {
		const directory = await createCacheDirectory();
		await createFile(directory, 'new.tar.zst', 6, 3);
		await createFile(directory, 'middle.tar.zst', 6, 2);
		await createFile(directory, 'old.tar.zst', 2, 1);

		const result = await pruneTurboCache({
			cacheDirectory: directory,
			maxBytes: 8,
		});

		expect(result).toEqual({
			afterBytes: 6,
			beforeBytes: 14,
			removedEntries: 2,
			removedFiles: 2,
		});
		expect(await readdir(directory)).toEqual(['new.tar.zst']);
	});

	it('uses the entry name as a deterministic mtime tie-breaker', async () => {
		const directory = await createCacheDirectory();
		await createFile(directory, 'alpha.tar.zst', 4, 1);
		await createFile(directory, 'beta.tar.zst', 4, 1);

		await pruneTurboCache({
			cacheDirectory: directory,
			maxBytes: 4,
		});

		expect(await readdir(directory)).toEqual(['alpha.tar.zst']);
	});
});
