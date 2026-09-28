/**
 * Detect class selectors that more than one stylesheet defines.
 *
 * A route that loads an aggregate stylesheet and per-component stylesheets
 * with the same rules pays for them twice. Byte totals alone hide that, so
 * the production-consumer bench reports how many class names appear in more
 * than one loaded CSS asset.
 */

export interface StylesheetText {
	url: string;
	text: string;
}

export interface StylesheetOverlapAsset {
	url: string;
	classCount: number;
	/** Classes this asset defines that another loaded asset also defines. */
	sharedClassCount: number;
}

export interface StylesheetOverlap {
	assets: StylesheetOverlapAsset[];
	/** Distinct class names defined by two or more assets. */
	sharedClassCount: number;
	/** Up to `sampleLimit` shared class names, sorted. */
	sharedClassSample: string[];
}

const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu;
const STRING_PATTERN = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/gu;
const URL_PATTERN = /url\([^)]*\)/giu;
// No capture groups: the harness apps compile these files for ES2017.
const PRELUDE_PATTERN = /[^{}]+(?=\{)/gu;
const CLASS_PATTERN = /\.-?[_a-zA-Z][\w-]*/gu;

/**
 * Class names used in selectors of a stylesheet. Comments, strings, and
 * `url()` values are removed first; at-rule preludes are skipped.
 *
 * @param cssText - Stylesheet source.
 * @returns The distinct class names.
 */
export const extractClassSelectors = function extractClassSelectors(
	cssText: string
): Set<string> {
	const cleaned = cssText
		.replace(COMMENT_PATTERN, '')
		.replace(STRING_PATTERN, '""')
		.replace(URL_PATTERN, 'url()');
	const classes = new Set<string>();
	for (const [match] of cleaned.matchAll(PRELUDE_PATTERN)) {
		// Nested rules follow declarations: keep only the text after the
		// last declaration terminator.
		const prelude = match.split(';').at(-1)?.trim() ?? '';
		if (prelude.length === 0 || prelude.startsWith('@')) {
			continue;
		}
		for (const [selector] of prelude.matchAll(CLASS_PATTERN)) {
			classes.add(selector.slice(1));
		}
	}
	return classes;
};

/**
 * Compare the class selectors of every loaded stylesheet.
 *
 * @param stylesheets - Loaded CSS assets with their text.
 * @param sampleLimit - Maximum shared class names to list.
 * @returns Per-asset counts and the distinct shared class names.
 */
export const findStylesheetOverlap = function findStylesheetOverlap(
	stylesheets: readonly StylesheetText[],
	sampleLimit = 20
): StylesheetOverlap {
	const perAsset = stylesheets.map((sheet) => ({
		classes: extractClassSelectors(sheet.text),
		url: sheet.url,
	}));
	const owners = new Map<string, number>();
	for (const asset of perAsset) {
		for (const name of asset.classes) {
			owners.set(name, (owners.get(name) ?? 0) + 1);
		}
	}
	const shared = [...owners.entries()]
		.filter(([, count]) => count > 1)
		.map(([name]) => name)
		.toSorted();
	const sharedSet = new Set(shared);

	return {
		assets: perAsset.map((asset) => ({
			classCount: asset.classes.size,
			sharedClassCount: [...asset.classes].filter((name) => sharedSet.has(name))
				.length,
			url: asset.url,
		})),
		sharedClassCount: shared.length,
		sharedClassSample: shared.slice(0, sampleLimit),
	};
};
