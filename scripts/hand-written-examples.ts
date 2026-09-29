import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import fg from 'fast-glob';

import { generatedExamplesDir } from './example-doc-sources';

/**
 * Per-file counts of hand-written docs fences that import c15t. The counts
 * may only fall: new setup code must come from a tested example region.
 */
export const handWrittenBaselinePath =
	'scripts/hand-written-examples-baseline.json';

/**
 * Place this comment on the line before a fence that is deliberately a
 * fragment, such as a one-line configuration change, rather than a file
 * a reader can copy.
 */
export const fragmentMarker = '{/* example: fragment */}';

const codeLanguages = new Set([
	'astro',
	'html',
	'js',
	'jsx',
	'svelte',
	'ts',
	'tsx',
	'vue',
]);

const c15tImport =
	/(?:from\s+|import\s*\(?\s*|require\(\s*)["'](?:c15t|@c15t\/[^"'/]+)(?:\/[^"']*)?["']|<script[^>]*src="[^"]*@c15t\/browser/u;

/** Counts hand-written fences that import c15t in one MDX document. */
export const countInDocument = (content: string): number => {
	const lines = content.split('\n');
	let count = 0;
	for (let index = 0; index < lines.length; index += 1) {
		const open = lines[index]?.match(/^\s*(?<fence>`{3,})(?<lang>[\w-]*)/u);
		if (!open?.groups?.fence) {
			continue;
		}
		const { fence, lang: language = '' } = open.groups;
		const closing = lines.findIndex(
			(line, position) => position > index && line.trim().startsWith(fence)
		);
		const end = closing === -1 ? lines.length : closing;
		const body = lines.slice(index + 1, end);
		const previous = lines
			.slice(0, index)
			.reverse()
			.find((line) => line.trim() !== '');
		if (
			codeLanguages.has(language) &&
			previous?.trim() !== fragmentMarker &&
			c15tImport.test(body.join('\n'))
		) {
			count += 1;
		}
		index = end;
	}
	return count;
};

/** Counts hand-written c15t fences in every docs page, keyed by path. */
export const countHandWrittenExamples = (
	root: string
): Record<string, number> => {
	const files = fg.sync('docs/**/*.mdx', {
		cwd: root,
		ignore: [`${generatedExamplesDir}/**`],
	});
	const counts: Record<string, number> = {};
	for (const file of files.sort()) {
		const count = countInDocument(readFileSync(resolve(root, file), 'utf8'));
		if (count > 0) {
			counts[file] = count;
		}
	}
	return counts;
};

/**
 * Lowers baseline entries to the current counts. Never raises a count or
 * adds a file, so regenerating the baseline cannot admit new hand-written code.
 */
export const lowerBaseline = (
	baseline: Record<string, number>,
	counts: Record<string, number>
): Record<string, number> => {
	const lowered: Record<string, number> = {};
	for (const [file, allowed] of Object.entries(baseline)) {
		const current = Math.min(allowed, counts[file] ?? 0);
		if (current > 0) {
			lowered[file] = current;
		}
	}
	return lowered;
};

/** Lists files whose hand-written count exceeds, or falls below, the baseline. */
export const compareToBaseline = (
	baseline: Record<string, number>,
	counts: Record<string, number>
): { added: string[]; stale: string[] } => {
	const added: string[] = [];
	const stale: string[] = [];
	for (const [file, count] of Object.entries(counts)) {
		const allowed = baseline[file] ?? 0;
		if (count > allowed) {
			added.push(`${file}: ${count} hand-written, ${allowed} allowed`);
		}
	}
	for (const [file, allowed] of Object.entries(baseline)) {
		if ((counts[file] ?? 0) < allowed) {
			stale.push(file);
		}
	}
	return { added, stale };
};
