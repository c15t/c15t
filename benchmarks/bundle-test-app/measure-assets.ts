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

type MetafileOutputs = NonNullable<BuildResult['metafile']>['outputs'];

/**
 * Split an entry's output chunks by how they can reach the page.
 *
 * `initial` is the entry chunk plus everything it imports statically: the
 * first load. `reachable` adds every chunk the entry can request later by
 * following `import()` edges from loaded code, plus the static imports of
 * those chunks, transitively. esbuild emits a chunk for each `import()` in
 * any file it scans, including calls that tree shaking later removes from the
 * output, so `outputs` can hold chunks no reachable code requests. Those stay
 * out of both sets.
 *
 * @param outputs - esbuild metafile outputs; paths as esbuild reports them
 * @param entry - The entry chunk's key in `outputs`
 * @returns The first-load chunk keys and every chunk key the entry can load
 */
export const classifyEntryChunks = function classifyEntryChunks(
	outputs: MetafileOutputs,
	entry: string
) {
	const walk = (followDynamic: boolean) => {
		const seen = new Set<string>();
		const pending = [entry];
		for (let path = pending.pop(); path !== undefined; path = pending.pop()) {
			if (seen.has(path)) {
				continue;
			}
			seen.add(path);
			for (const imported of outputs[path]?.imports ?? []) {
				if (
					!imported.external &&
					(followDynamic || imported.kind !== 'dynamic-import')
				) {
					pending.push(imported.path);
				}
			}
		}
		return seen;
	};
	return { initial: walk(false), reachable: walk(true) };
};

/**
 * Count the entry's static dependency closure separately from deferred
 * JavaScript. `lazy*` counts every other emitted chunk; `reachableLazy*`
 * counts only the deferred chunks the entry can actually load.
 */
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
	const chunks = classifyEntryChunks(outputs, entry);
	const initial = new Set([...chunks.initial].map((path) => resolve(path)));
	const reachable = new Set([...chunks.reachable].map((path) => resolve(path)));
	const sizes = {
		initialBrotli: 0,
		initialGzip: 0,
		lazyBrotli: 0,
		lazyGzip: 0,
		reachableLazyBrotli: 0,
		reachableLazyGzip: 0,
	};
	for (const file of result.outputFiles) {
		if (!file.path.endsWith('.js')) {
			continue;
		}
		const size = compressedSize(file.contents);
		const path = resolve(file.path);
		if (initial.has(path)) {
			sizes.initialGzip += size.gzip;
			sizes.initialBrotli += size.brotli;
			continue;
		}
		sizes.lazyGzip += size.gzip;
		sizes.lazyBrotli += size.brotli;
		if (reachable.has(path)) {
			sizes.reachableLazyGzip += size.gzip;
			sizes.reachableLazyBrotli += size.brotli;
		}
	}
	if (!sizes.initialGzip) {
		throw new Error('No initial JavaScript measured.');
	}
	return sizes;
};
