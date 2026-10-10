import { mergeEnvFile } from './source.ts';
import type { FileMerge } from './types.ts';

/** The file's own indentation step: its first indented line's, else a tab. */
const indentUnit = (content: string): string =>
	content.match(/^(?:\t| +)(?=\S)/mu)?.[0] ?? '\t';

/**
 * Apply a generated file to the file a project already has.
 * @param existing Current contents of the project's file.
 * @param generated Contents generated for a project without the file.
 * @param merge How to combine them. Without one, the generated file
 * replaces the existing one.
 * @returns The contents to write. Equal to `existing` when nothing changes.
 * @throws {Error} When an `insert` cannot find where its snippet belongs.
 * @example
 * mergeFile('<body>\n</body>\n', '', {
 *   type: 'insert',
 *   marker: '#c15t-preferences',
 *   inserts: [{ before: '</body>', content: '<a href="#c15t-preferences">Privacy settings</a>' }],
 * });
 */
export const mergeFile = (
	existing: string,
	generated: string,
	merge: FileMerge | undefined
): string => {
	if (!merge) {
		return generated;
	}
	if (merge.type === 'keep') {
		return existing;
	}
	if (merge.type === 'env') {
		return mergeEnvFile(existing, generated);
	}
	if (existing.includes(merge.marker)) {
		return existing;
	}
	let merged = existing;
	for (const { before, content } of merge.inserts) {
		if (before === '') {
			merged = `${content}\n${merged}`;
			continue;
		}
		const index = merged.indexOf(before);
		if (index === -1) {
			throw new Error(
				`Could not find ${before} to add the c15t snippet before. Add it by hand:\n${content}`
			);
		}
		const lineStart = merged.lastIndexOf('\n', index - 1) + 1;
		const leading = merged.slice(lineStart, index);
		if (leading.trim() !== '') {
			// The anchor shares its line with other markup: insert inline.
			merged = `${merged.slice(0, index)}${content}${merged.slice(index)}`;
			continue;
		}
		// A closing tag's children sit one level deeper than the tag.
		const indentation = before.startsWith('</')
			? `${leading}${indentUnit(merged)}`
			: leading;
		const snippet = content
			.split('\n')
			.map((line) => (line ? `${indentation}${line}` : line))
			.join('\n');
		merged = `${merged.slice(0, lineStart)}${snippet}\n${merged.slice(lineStart)}`;
	}
	return merged;
};
