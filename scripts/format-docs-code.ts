/**
 * Formats the code fences written directly in docs/**\/*.mdx with the docs
 * formatter options. Generated snippets are formatted by
 * scripts/sync-example-docs.ts instead.
 *
 * `bun scripts/format-docs-code.ts` rewrites the files; `--check` lists the
 * files that would change and exits non-zero.
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { formatMdxFences } from './docs-code-format';
import { generatedExamplesDir } from './example-doc-sources';
import { themeTokenDestination } from './theme-token-reference';

/** Docs files whose fences come from a generator. */
const isGenerated = (file: string): boolean =>
	file.startsWith(`${generatedExamplesDir}/`) || file === themeTokenDestination;

/**
 * Lists hand-written docs files whose fences are not formatted.
 *
 * @param root - The repository root.
 * @param write - Rewrite the files instead of only reporting them.
 * @returns Repository-relative paths of the files that differ.
 */
export const formatDocsFiles = async (
	root: string,
	write: boolean
): Promise<string[]> => {
	const files = globSync('docs/**/*.mdx', { cwd: root })
		.filter((file) => !isGenerated(file))
		.sort();
	const results = await Promise.all(
		files.map(async (file) => {
			const path = resolve(root, file);
			const text = readFileSync(path, 'utf8');
			const formatted = await formatMdxFences(text);
			if (formatted === text) {
				return null;
			}
			if (write) {
				writeFileSync(path, formatted);
			}
			return file;
		})
	);
	return results.filter((file): file is string => file !== null);
};

if (import.meta.main) {
	const root = fileURLToPath(new URL('..', import.meta.url));
	const check = process.argv.includes('--check');
	const changed = await formatDocsFiles(root, !check);
	if (check && changed.length > 0) {
		throw new Error(
			`Unformatted code in:\n${changed.join('\n')}\nRun bun run fmt:docs.`
		);
	}
}
