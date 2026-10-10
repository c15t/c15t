import { format } from 'oxfmt';
import type { FormatConfig } from 'oxfmt';

import repoConfig from '../oxfmt.config';

const { ignorePatterns: _ignorePatterns, ...repoOptions } = repoConfig;

/**
 * The repo's formatter options, loosened for reading. Source files put every
 * JSX attribute on its own line and keep objects multi-line once written that
 * way; in the docs that turns a three-attribute tag into five lines and leaves
 * `hosted({ backendURL })` split after hidden test lines are removed. Snippets wrap
 * only when a line is too long.
 */
export const docsFormatOptions: FormatConfig = {
	...repoOptions,
	objectWrap: 'collapse',
	singleAttributePerLine: false,
};

/** Fence languages the formatter handles, mapped to a file extension. */
const extensions: Record<string, string> = {
	js: 'js',
	jsx: 'jsx',
	svelte: 'svelte',
	ts: 'ts',
	tsx: 'tsx',
	vue: 'vue',
};

/**
 * Formats a code fence body for the docs.
 *
 * @param language - The fence language, such as `tsx`.
 * @param code - The fence body, without the fence lines.
 * @returns The formatted body, or `null` when the language is not handled or
 * the code does not parse on its own, as with a JSX fragment or an object
 * literal excerpt.
 */
export const formatDocsCode = async (
	language: string,
	code: string
): Promise<string | null> => {
	const extension = extensions[language];
	if (!extension) {
		return null;
	}
	try {
		const result = await format(
			`snippet.${extension}`,
			code.endsWith('\n') ? code : `${code}\n`,
			docsFormatOptions
		);
		return result.errors.length > 0 ? null : result.code.trimEnd();
	} catch {
		// Svelte formatting needs the svelte compiler at the repo root; treat
		// a missing plugin like code that does not parse.
		return null;
	}
};

/**
 * A top-level fence: the opening line starts at column 0, so fences nested
 * in JSX components or list items are left alone.
 */
const fencePattern =
	/^(?<fence>`{3,})(?<language>\w+)(?<meta>[^\n]*)\n(?<body>[\s\S]*?)\n\k<fence>[ \t]*$/gmu;

/**
 * Formats every top-level code fence in an MDX document.
 *
 * @param text - The MDX source.
 * @returns The document with formatted fences.
 */
export const formatMdxFences = async (text: string): Promise<string> => {
	const matches = [...text.matchAll(fencePattern)];
	const formatted = await Promise.all(
		matches.map(({ groups }) =>
			groups?.language && groups.body !== undefined
				? formatDocsCode(groups.language, groups.body)
				: null
		)
	);
	let result = text;
	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const match = matches[index];
		const code = formatted[index];
		const groups = match?.groups;
		if (!(match && groups && code !== null && code !== undefined)) {
			continue;
		}
		if (code === groups.body) {
			continue;
		}
		const replacement = `${groups.fence}${groups.language}${groups.meta}\n${code}\n${groups.fence}`;
		result =
			result.slice(0, match.index) +
			replacement +
			result.slice(match.index + match[0].length);
	}
	return result;
};
