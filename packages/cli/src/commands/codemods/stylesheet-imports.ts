/** How a stylesheet language writes comments and ends an `@import`. */
interface StylesheetSyntax {
	/** `//` starts a comment: Sass, SCSS and Less, but not CSS. */
	lineComments: boolean;
	/** A directive ends at the end of its line: indented Sass. */
	indented: boolean;
	/** `@import (css) '…'` options: Less. */
	importOptions: boolean;
	/**
	 * `@import 'a', 'b'` lists several targets, and `@use` and `@forward`
	 * load stylesheets too: SCSS and indented Sass.
	 */
	sassRules: boolean;
}

/** One stylesheet an `@import` names, with offsets into the text. */
export interface StylesheetTarget {
	/** The imported URL, without quotes or `url()`. */
	specifier: string;
	specifierStart: number;
	specifierEnd: number;
	/** The target's first character: its quote or `url(`. */
	start: number;
	/** After the target's closing quote or `)`. */
	end: number;
}

/**
 * One `@import` directive, or a Sass `@use` or `@forward`, with offsets into
 * the stylesheet's text.
 */
export interface StylesheetImport {
	/** The `@` of `@import`, `@use` or `@forward`. */
	start: number;
	/** After the directive's `;`, or its last character when it has none. */
	end: number;
	/** After the comments that follow the directive on its last line. */
	trailingEnd: number;
	/** The imported URL, without quotes or `url()`: the first target's. */
	specifier: string;
	specifierStart: number;
	specifierEnd: number;
	/**
	 * Every target of a Sass import that lists more than one, such as
	 * `@import 'theme', 'reset';`. In CSS and Less, a comma after the URL
	 * separates media queries instead.
	 */
	targets?: [StylesheetTarget, StylesheetTarget, ...StylesheetTarget[]];
	/**
	 * Text after the URL, such as `layer(c15t)`, a media query or
	 * `supports()`, which places the import on purpose, or a Sass `as`,
	 * `with()`, `show` or `hide` clause, which code may depend on.
	 */
	placed: boolean;
	/** Something other than a comment follows the directive on its line. */
	followed: boolean;
	/**
	 * Where the directive ends is certain: nothing but comments follows it on
	 * its line, or it ends at a `;`. Without a `;`, text after it on the same
	 * line may belong to it. In plain CSS, `//` after the `;` is not a
	 * comment, so that directive isn't bounded either.
	 */
	bounded: boolean;
}

const BLOCK_COMMENTS_ONLY: StylesheetSyntax = {
	importOptions: false,
	indented: false,
	lineComments: false,
	sassRules: false,
};

const LOAD_RULE = /@(?<rule>import|use|forward)(?![\w-])/iuy;
const UNQUOTED_URL = /url\(\s*(?!['"\s])[^)]*\)/iuy;
const URL_FUNCTION = /url\(/iuy;

const syntaxOf = function syntaxOf(extension: string): StylesheetSyntax {
	return {
		importOptions: extension === '.less',
		indented: extension === '.sass',
		lineComments: extension !== '.css',
		sassRules: extension === '.scss' || extension === '.sass',
	};
};

const matchesAt = function matchesAt(
	pattern: RegExp,
	text: string,
	index: number
): RegExpExecArray | null {
	pattern.lastIndex = index;
	return pattern.exec(text);
};

/** The index after the comment at `index`, or `index` when none starts there. */
const skipComment = function skipComment(
	text: string,
	index: number,
	syntax: StylesheetSyntax
): number {
	if (text.startsWith('/*', index)) {
		const close = text.indexOf('*/', index + 2);
		return close === -1 ? text.length : close + 2;
	}
	if (syntax.lineComments && text.startsWith('//', index)) {
		const newline = text.indexOf('\n', index);
		return newline === -1 ? text.length : newline;
	}
	return index;
};

/**
 * The index after the quoted string at `index`. An unclosed string ends at
 * the end of its line, as it does in CSS.
 */
const skipString = function skipString(text: string, index: number): number {
	const quote = text[index];
	let cursor = index + 1;
	while (cursor < text.length && text[cursor] !== quote) {
		if (text[cursor] === '\n') {
			return cursor;
		}
		cursor += text[cursor] === '\\' ? 2 : 1;
	}
	return Math.min(cursor + 1, text.length);
};

/** The index after the whitespace and comments at `index`. */
const skipTrivia = function skipTrivia(
	text: string,
	index: number,
	syntax: StylesheetSyntax,
	acrossLines = true
): number {
	let cursor = index;
	while (cursor < text.length) {
		const char = text[cursor] ?? '';
		if (
			char === ' ' ||
			char === '\t' ||
			char === '\r' ||
			(acrossLines && (char === '\n' || char === '\f'))
		) {
			cursor += 1;
			continue;
		}
		const after = skipComment(text, cursor, syntax);
		if (after === cursor) {
			return cursor;
		}
		cursor = after;
	}
	return cursor;
};

/**
 * Where the directive whose prelude starts at `index` ends: after its `;`,
 * or at the end of its line in indented Sass. Without a `;`, a line break
 * ends it when the next line starts another at-rule or closes a block, and
 * the first line break does when a block follows.
 */
const directiveEnd = function directiveEnd(
	text: string,
	index: number,
	syntax: StylesheetSyntax
): number {
	let depth = 0;
	let firstBreak: number | undefined;
	let cursor = index;
	while (cursor < text.length) {
		const char = text[cursor];
		if (char === '"' || char === "'") {
			cursor = skipString(text, cursor);
			continue;
		}
		// `//` inside parentheses is part of a URL, not a comment.
		const after = skipComment(
			text,
			cursor,
			depth === 0 ? syntax : BLOCK_COMMENTS_ONLY
		);
		if (after !== cursor) {
			cursor = after;
			continue;
		}
		if (char === '(') {
			depth += 1;
		} else if (char === ')') {
			depth = Math.max(0, depth - 1);
		} else if (depth === 0) {
			if (char === ';') {
				return cursor + 1;
			}
			if (char === '{' || char === '}') {
				return firstBreak ?? cursor;
			}
			if (char === '\n') {
				if (syntax.indented) {
					return cursor;
				}
				firstBreak ??= cursor;
				const next = skipTrivia(text, cursor, syntax);
				if (next >= text.length || text[next] === '@' || text[next] === '}') {
					return cursor;
				}
			}
		}
		cursor += 1;
	}
	return text.length;
};

/** The URL a directive imports, from the prelude between `index` and `end`. */
const urlOf = function urlOf(
	text: string,
	index: number,
	end: number,
	syntax: StylesheetSyntax
): { start: number; end: number; after: number } | undefined {
	let cursor = skipTrivia(text, index, syntax);
	if (syntax.importOptions && text[cursor] === '(') {
		const close = text.indexOf(')', cursor);
		if (close === -1 || close >= end) {
			return undefined;
		}
		cursor = skipTrivia(text, close + 1, syntax);
	}
	const isUrl = matchesAt(URL_FUNCTION, text, cursor) !== null;
	if (isUrl) {
		cursor = skipTrivia(text, cursor + 4, syntax);
	}
	let url: { start: number; end: number; after: number };
	const quote = text[cursor];
	if (quote === '"' || quote === "'") {
		const after = skipString(text, cursor);
		if (text[after - 1] !== quote || after - 1 === cursor) {
			return undefined;
		}
		url = { after, end: after - 1, start: cursor + 1 };
	} else if (isUrl) {
		const value = /[^\s)]*/uy;
		value.lastIndex = cursor;
		const length = value.exec(text)?.[0].length ?? 0;
		url = { after: cursor + length, end: cursor + length, start: cursor };
	} else {
		return undefined;
	}
	if (isUrl) {
		const close = skipTrivia(text, url.after, syntax);
		if (text[close] !== ')') {
			return undefined;
		}
		url.after = close + 1;
	}
	return url.after <= end ? url : undefined;
};

/**
 * The load rule at `index`: `@import` anywhere, and `@use` or `@forward` in
 * Sass. `lists` says whether it can list several targets, as a Sass
 * `@import` can.
 */
const loadRuleAt = function loadRuleAt(
	text: string,
	index: number,
	syntax: StylesheetSyntax
): { length: number; lists: boolean } | undefined {
	const match = matchesAt(LOAD_RULE, text, index);
	const rule = match?.groups?.rule?.toLowerCase();
	if (!(match && rule) || (rule !== 'import' && !syntax.sassRules)) {
		return undefined;
	}
	return {
		length: match[0].length,
		lists: rule === 'import' && syntax.sassRules,
	};
};

/**
 * The targets of a Sass import that lists several, or `undefined` when it
 * names one or anything but a URL follows a comma. Each target is read whole,
 * so a comma inside quotes or `url()` doesn't split it.
 */
const targetsOf = function targetsOf(
	text: string,
	prelude: number,
	end: number,
	syntax: StylesheetSyntax
): StylesheetImport['targets'] {
	const targets: StylesheetTarget[] = [];
	let cursor = prelude;
	for (;;) {
		const start = skipTrivia(text, cursor, syntax);
		const url = urlOf(text, start, end, syntax);
		if (!url) {
			return undefined;
		}
		targets.push({
			end: url.after,
			specifier: text.slice(url.start, url.end),
			specifierEnd: url.end,
			specifierStart: url.start,
			start,
		});
		cursor = skipTrivia(text, url.after, syntax);
		if (text[cursor] !== ',') {
			break;
		}
		cursor += 1;
	}
	// Anything after the last target, such as a media query, makes this a
	// plain CSS import that the codemod treats as placed.
	const ended = cursor >= end || (text[cursor] === ';' && cursor + 1 === end);
	const [first, second, ...rest] = targets;
	return ended && first && second ? [first, second, ...rest] : undefined;
};

/**
 * Finds the `@import` directives in a stylesheet, and the `@use` and
 * `@forward` rules in Sass, skipping strings and comments. A directive can span lines, take Less options, and name its URL
 * as a string or with `url()`.
 *
 * @param text - The stylesheet's text.
 * @param extension - The file extension, which picks the syntax: `.css`,
 * `.scss`, `.sass` or `.less`.
 * @returns The directives in source order.
 */
export const findStylesheetImports = function findStylesheetImports(
	text: string,
	extension: string
): StylesheetImport[] {
	const syntax = syntaxOf(extension.toLowerCase());
	const imports: StylesheetImport[] = [];
	let cursor = 0;
	while (cursor < text.length) {
		const char = text[cursor];
		if (char === '"' || char === "'") {
			cursor = skipString(text, cursor);
			continue;
		}
		const afterComment = skipComment(text, cursor, syntax);
		if (afterComment !== cursor) {
			cursor = afterComment;
			continue;
		}
		const unquotedUrl = matchesAt(UNQUOTED_URL, text, cursor);
		if (unquotedUrl) {
			cursor += unquotedUrl[0].length;
			continue;
		}
		const rule = char === '@' ? loadRuleAt(text, cursor, syntax) : undefined;
		if (!rule) {
			cursor += 1;
			continue;
		}
		const start = cursor;
		const prelude = start + rule.length;
		let end = directiveEnd(text, prelude, syntax);
		if (text[end - 1] !== ';') {
			while (end > prelude && /\s/u.test(text[end - 1] ?? '')) {
				end -= 1;
			}
		}
		cursor = Math.max(end, prelude);
		const url = urlOf(text, prelude, end, syntax);
		if (!url) {
			continue;
		}
		const conditions = skipTrivia(text, url.after, syntax);
		const targets = rule.lists
			? targetsOf(text, prelude, end, syntax)
			: undefined;
		const trailingEnd = skipTrivia(text, end, syntax, false);
		const lineEnd = text.indexOf('\n', trailingEnd);
		const rest = text.slice(
			trailingEnd,
			lineEnd === -1 ? text.length : lineEnd
		);
		const followedBy = rest.trim();
		imports.push({
			bounded:
				followedBy === '' ||
				(text[end - 1] === ';' &&
					(syntax.lineComments || !followedBy.startsWith('//'))),
			end,
			followed: followedBy !== '',
			placed:
				targets === undefined && conditions < end && text[conditions] !== ';',
			specifier: text.slice(url.start, url.end),
			specifierEnd: url.end,
			specifierStart: url.start,
			start,
			targets,
			trailingEnd,
		});
	}
	return imports;
};
