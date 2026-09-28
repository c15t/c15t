/**
 * Every visual value a theme can set has to reach the component through a
 * variable.
 *
 * A literal colour, font stack, shadow or radius in a component rule is a
 * value no theme and no host stylesheet can change without out-specifying
 * the rule. A component variable whose default is a literal instead of a
 * `--c15t-*` token is subtler: it can be overridden, but a `theme` never
 * reaches it, so one surface keeps c15t's defaults while the rest of the UI
 * follows the site's palette. The "Secured by" tag and the preference list's
 * font both shipped that way.
 *
 * The categories are the ones the theme has a scale for: colours, shadows,
 * font family, font size and weight, line height, radius, spacing and motion.
 * A value passes when it comes from `var()` (with or without a fallback) or is
 * structural (`0`, `1px` borders, `inherit`, `currentColor`, `transparent`).
 * A `color-mix()` that names a variable is a shade derived from a token, so it
 * passes too.
 *
 * Literals that predate this check are listed in
 * `design-token-baseline.json`. New ones fail. Fixing one fails the stale
 * baseline entry too, so the list only shrinks. After an intentional change,
 * regenerate it with `UPDATE_TOKEN_BASELINE=1` and review the diff.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from 'vitest';

const STYLES_DIR = join(__dirname, '..');
const BASELINE_PATH = join(__dirname, 'design-token-baseline.json');

/** Every `.css` file under `src/styles`, however deeply nested. */
const sourceFiles = function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);

		if (entry.isDirectory()) {
			return entry.name === '__tests__' ? [] : sourceFiles(path);
		}

		return entry.name.endsWith('.css') ? [path] : [];
	});
};

/** Replace each `var(...)`, fallback included, with a placeholder. */
const withoutVariables = function withoutVariables(value: string): string {
	let output = '';
	let index = 0;

	while (index < value.length) {
		if (!value.startsWith('var(', index)) {
			output += value[index];
			index += 1;
			continue;
		}

		// Start at the parenthesis, so the loop below ends at its match.
		index += 'var'.length;
		let depth = 0;
		do {
			if (value[index] === '(') {
				depth += 1;
			} else if (value[index] === ')') {
				depth -= 1;
			}
			index += 1;
		} while (depth > 0 && index < value.length);
		output += ' VAR ';
	}

	return output;
};

const LITERAL_COLOR =
	/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(|\b(?:white|black|red|green|blue|gray|grey|silver)\b/iu;

/** A literal colour that is not a shade derived from a variable. */
const hasLiteralColor = function hasLiteralColor(value: string): boolean {
	const stripped = withoutVariables(value);
	if (!LITERAL_COLOR.test(stripped)) {
		return false;
	}
	// `color-mix(in srgb, var(--x) 85%, black)` follows the token it mixes.
	return !(/color-mix\(/iu.test(value) && stripped.includes('VAR'));
};

const COLOR_PROPERTIES = new Set([
	'accent-color',
	'background',
	'background-color',
	'border',
	'border-block-end',
	'border-block-start',
	'border-bottom',
	'border-bottom-color',
	'border-color',
	'border-inline-end',
	'border-inline-start',
	'border-left',
	'border-left-color',
	'border-right',
	'border-right-color',
	'border-top',
	'border-top-color',
	'caret-color',
	'color',
	'fill',
	'outline',
	'outline-color',
	'stroke',
	'text-decoration-color',
]);

const SPACING_PROPERTY =
	/^(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|inline|block|inline-start|inline-end|block-start|block-end))?$/u;

/** Numbers that are structure rather than design: 0, hairlines, 1. */
const hasDesignNumber = function hasDesignNumber(value: string): boolean {
	return withoutVariables(value)
		.split(/[\s,/()]+/u)
		.some(
			(part) =>
				/\d/u.test(part) &&
				!/^-?0(?:\.0+)?[a-z%]*$/u.test(part) &&
				!/^-?1px$/u.test(part) &&
				part !== '1' &&
				part !== '100%' &&
				part !== '50%' &&
				part !== '9999px'
		);
};

/**
 * Why a declaration in a component rule is a literal the theme cannot reach,
 * or `undefined` when it is fine.
 */
const ruleViolation = function ruleViolation(
	property: string,
	value: string
): string | undefined {
	if (COLOR_PROPERTIES.has(property) && hasLiteralColor(value)) {
		return 'color';
	}
	if (property === 'box-shadow' || property === 'text-shadow') {
		if (hasLiteralColor(value)) {
			return 'shadow';
		}
		return undefined;
	}
	const bare = withoutVariables(value).trim();
	if (property === 'font-family') {
		return bare === 'VAR' || bare === 'inherit' ? undefined : 'font-family';
	}
	if (
		(property === 'font-size' ||
			property === 'line-height' ||
			property === 'font-weight') &&
		hasDesignNumber(value)
	) {
		return property;
	}
	if (/^border(?:-[a-z]+)*-radius$/u.test(property) && hasDesignNumber(value)) {
		return 'radius';
	}
	if (SPACING_PROPERTY.test(property) && hasDesignNumber(value)) {
		return 'spacing';
	}
	if (
		/^(?:transition|animation)(?:-duration|-timing-function)?$/u.test(
			property
		) &&
		/\d+m?s\b|cubic-bezier\(/u.test(withoutVariables(value))
	) {
		return 'motion';
	}
	return undefined;
};

/**
 * Why a component variable's default bypasses the theme, or `undefined`.
 * Only the categories where a literal default hides a theme token are
 * checked: colours (shadows carry them too), font stacks and radii.
 */
const variableViolation = function variableViolation(
	name: string,
	value: string
): string | undefined {
	if (hasLiteralColor(value)) {
		return 'color default';
	}
	const bare = withoutVariables(value);
	if (name.endsWith('font-family') && !bare.includes('VAR')) {
		return 'font-family default';
	}
	// A default derived from a token, such as `calc(var(--c15t-radius-lg) * 2)`,
	// still follows the theme.
	if (/radius/u.test(name) && hasDesignNumber(value) && !bare.includes('VAR')) {
		return 'radius default';
	}
	return undefined;
};

interface Declaration {
	file: string;
	selector: string;
	property: string;
	value: string;
}

/** Declarations outside `@keyframes`, with the innermost selector. */
const declarations = function declarations(path: string): Declaration[] {
	const file = relative(STYLES_DIR, path);
	const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');
	const found: Declaration[] = [];
	const stack: string[] = [];
	let buffer = '';

	const flush = () => {
		const colon = buffer.indexOf(':');
		const inKeyframes = stack.some((entry) => entry.startsWith('@keyframes'));
		const selector = stack.at(-1);
		if (colon > 0 && selector && !selector.startsWith('@') && !inKeyframes) {
			found.push({
				file,
				property: buffer.slice(0, colon).trim(),
				selector: selector.replace(/\s+/gu, ' '),
				value: buffer
					.slice(colon + 1)
					.replace(/\s+/gu, ' ')
					.trim(),
			});
		}
		buffer = '';
	};

	for (const char of source) {
		if (char === '{') {
			stack.push(buffer.trim());
			buffer = '';
		} else if (char === '}') {
			flush();
			stack.pop();
		} else if (char === ';') {
			if (stack.length > 0) {
				flush();
			} else {
				buffer = '';
			}
		} else {
			buffer += char;
		}
	}

	return found;
};

const findViolations = function findViolations(): string[] {
	const violations = new Set<string>();

	for (const path of sourceFiles(STYLES_DIR)) {
		for (const { file, selector, property, value } of declarations(path)) {
			const reason = property.startsWith('--')
				? variableViolation(property, value)
				: ruleViolation(property, value);
			if (reason) {
				violations.add(
					`${file} | ${selector} | ${property}: ${value} (${reason})`
				);
			}
		}
	}

	return [...violations].sort();
};

describe('design token literals', () => {
	const violations = findViolations();

	if (process.env.UPDATE_TOKEN_BASELINE === '1') {
		writeFileSync(BASELINE_PATH, `${JSON.stringify(violations, null, '\t')}\n`);
	}

	const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as string[];

	test('adds no literal the theme cannot reach', () => {
		const added = violations.filter((entry) => !baseline.includes(entry));
		expect(
			added,
			'Use a --c15t-* token, or a component variable that defaults to one.'
		).toEqual([]);
	});

	test('keeps the baseline to literals that still exist', () => {
		const fixed = baseline.filter((entry) => !violations.includes(entry));
		expect(
			fixed,
			'Remove fixed entries from design-token-baseline.json.'
		).toEqual([]);
	});
});

describe('the literal detector', () => {
	test.each([
		['color', 'rgb(59 130 246 / 0.3)', 'color'],
		['background-color', '#fff', 'color'],
		['font-family', "system-ui, 'Segoe UI'", 'font-family'],
		['font-size', '0.875rem', 'font-size'],
		['padding', '0.5rem 0.625rem', 'spacing'],
		['border-radius', '0.75rem 0.75rem 0 0', 'radius'],
		['transition', 'opacity 150ms ease', 'motion'],
		['box-shadow', '0 1px 2px rgb(0 0 0 / 0.06)', 'shadow'],
	])('flags %s: %s', (property, value, reason) => {
		expect(ruleViolation(property, value)).toBe(reason);
	});

	test.each([
		['color', 'var(--consent-banner-text-color)'],
		['background-color', 'var(--x, rgb(0 0 0))'],
		['color', 'color-mix(in srgb, var(--button-primary) 85%, black)'],
		['border', '1px solid var(--c15t-border)'],
		['box-shadow', '0 0 0 2px var(--focus-color)'],
		['padding', '0'],
		['margin-block-end', '-1px'],
		['border-radius', '50%'],
		['color', 'currentColor'],
		['font-family', 'inherit'],
	])('accepts %s: %s', (property, value) => {
		expect(ruleViolation(property, value)).toBeUndefined();
	});

	test('flags a variable whose default skips the theme', () => {
		expect(
			variableViolation('--legal-links-color', 'hsl(228, 100%, 64%)')
		).toBe('color default');
		expect(
			variableViolation('--frame-font-family', 'system-ui, sans-serif')
		).toBe('font-family default');
		expect(
			variableViolation('--legal-links-color', 'var(--c15t-primary)')
		).toBeUndefined();
		expect(
			variableViolation(
				'--frame-placeholder-border-radius',
				'calc(var(--c15t-radius-lg) * 5 / 3)'
			)
		).toBeUndefined();
		expect(
			variableViolation('--frame-placeholder-border-radius', '1.25rem')
		).toBe('radius default');
	});
});
