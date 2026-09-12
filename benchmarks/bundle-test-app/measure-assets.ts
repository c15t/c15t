import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import type { BuildResult } from 'esbuild';

export const compressedSize = function compressedSize(bytes: Uint8Array) {
	if (!bytes.byteLength) {
		throw new Error('Cannot measure an empty asset.');
	}
	return {
		brotli: brotliCompressSync(bytes).byteLength,
		gzip: gzipSync(bytes).byteLength,
		raw: bytes.byteLength,
	};
};

export const measureAsset = async function measureAsset(path: string) {
	return compressedSize(await readFile(path));
};

/** Count the entry's static dependency closure separately from deferred JavaScript. */
export const measureEntryOutputs = function measureEntryOutputs(
	result: BuildResult,
	entryPath: string
) {
	if (!result.metafile || !result.outputFiles?.length) {
		throw new Error('esbuild produced no measurements.');
	}
	const { outputs } = result.metafile;
	const entry = Object.keys(outputs).find(
		(path) =>
			outputs[path]?.entryPoint &&
			realpathSync(resolve(outputs[path]?.entryPoint ?? '')) ===
				realpathSync(entryPath)
	);
	if (!entry) {
		throw new Error(`No entry output for ${entryPath}`);
	}
	const initial = new Set<string>();
	const visit = (path: string) => {
		if (initial.has(path)) {
			return;
		}
		initial.add(path);
		for (const imported of outputs[path]?.imports ?? []) {
			if (!imported.external && imported.kind !== 'dynamic-import') {
				visit(imported.path);
			}
		}
	};
	visit(entry);
	const sizes = {
		initialBrotli: 0,
		initialGzip: 0,
		lazyBrotli: 0,
		lazyGzip: 0,
	};
	for (const file of result.outputFiles) {
		if (!file.path.endsWith('.js')) {
			continue;
		}
		const size = compressedSize(file.contents);
		if ([...initial].some((path) => resolve(path) === resolve(file.path))) {
			sizes.initialGzip += size.gzip;
			sizes.initialBrotli += size.brotli;
		} else {
			sizes.lazyGzip += size.gzip;
			sizes.lazyBrotli += size.brotli;
		}
	}
	if (!sizes.initialGzip) {
		throw new Error('No initial JavaScript measured.');
	}
	return sizes;
};
