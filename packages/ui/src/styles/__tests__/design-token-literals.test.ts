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
 * font both shipped that way. So does a literal fallback on a component
 * variable nothing declares, like `var(--accordion-focus-ring, hsl(...))`:
 * the fallback is what renders.
 *
 * The categories are the ones the theme has a scale for: colours, shadows,
 * font family, font size and weight, line height, radius, spacing and motion.
 * A value passes when it comes from `var()` or is structural (`0`, `1px`
 * borders, `inherit`, `currentColor`, `transparent`). A `color-mix()` that
 * names a variable, or a `calc()` built on a theme token, follows that token,
 * so it passes too. A component variable's default is held to the rule for
 * the property its name says it stands in for (`--legal-links-gap` is
 * spacing). A theme token's own fallback is ignored: the tokens ship with the
 * stylesheet.
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

/** The index just past the parenthesis that closes the one at `open`. */
const closingIndex = function closingIndex(
	value: string,
	open: number
): number {
	let depth = 0;
	let index = open;
	do {
		if (value[index] === '(') {
			depth += 1;
		} else if (value[index] === ')') {
			depth -= 1;
		}
		index += 1;
	} while (depth > 0 && index < value.length);
	return index;
};

/** Replace each `name(...)` call, arguments included, with a placeholder. */
const withoutCalls = function withoutCalls(
	value: string,
	name: string,
	keep: (call: string) => boolean = () => false
): string {
	let output = '';
	let index = 0;

	while (index < value.length) {
		const isCall =
			value.startsWith(`${name}(`, index) &&
			!/[\w-]/u.test(value[index - 1] ?? '');
		if (!isCall) {
			output += value[index];
			index += 1;
			continue;
		}

		const end = closingIndex(value, index + name.length);
		const call = value.slice(index, end);
		output += keep(call) ? call : ' VAR ';
		index = end;
	}

	return output;
};

/** Replace each `var(...)`, fallback included, with a placeholder. */
const withoutVariables = function withoutVariables(value: string): string {
	return withoutCalls(value, 'var');
};

/**
 * `withoutVariables`, with each `calc()` built on a theme token also
 * replaced: `calc(var(--c15t-radius-md) - 0.25rem)` follows the theme.
 * `calc(1.5rem * var(--space-y-reverse))` does not, so it stays.
 */
const withoutDerived = function withoutDerived(value: string): string {
	return withoutVariables(
		withoutCalls(value, 'calc', (call) => !call.includes('var(--c15t-'))
	);
};

/**
 * The fallbacks of component variables. A fallback renders whenever nothing
 * sets its variable, so it is a literal like any other. A theme token's
 * fallback is left out: the tokens ship with the stylesheet, so it never
 * applies.
 */
const componentFallbacks = function componentFallbacks(
	value: string
): string[] {
	const found: string[] = [];
	let index = value.indexOf('var(');

	while (index !== -1) {
		const end = closingIndex(value, index + 'var'.length);
		const inner = value.slice(index + 'var('.length, end - 1).trim();
		// The first comma outside parentheses ends the variable's name.
		let depth = 0;
		let split = -1;
		for (let at = 0; at < inner.length; at += 1) {
			if (inner[at] === '(') {
				depth += 1;
			} else if (inner[at] === ')') {
				depth -= 1;
			} else if (inner[at] === ',' && depth === 0) {
				split = at;
				break;
			}
		}
		if (split !== -1 && !inner.startsWith('--c15t-')) {
			const fallback = inner.slice(split + 1).trim();
			found.push(fallback, ...componentFallbacks(fallback));
		}
		index = value.indexOf('var(', end);
	}

	return found.filter(Boolean);
};

/** Every CSS named colour. System colours (`Canvas`, `LinkText`) are left
 * out: forced-colours rules need them. */
const NAMED_COLORS = `aliceblue antiquewhite aqua aquamarine azure beige bisque
black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse
chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan
darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen
darkorange darkorchid darkred darksalmon darkseagreen darkslateblue
darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue
dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro
ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink
indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon
lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon
mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen
mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue
mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange
orangered orchid palegoldenrod palegreen paleturquoise palevioletred
papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red
rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna
silver skyblue slateblue slategray slategrey snow springgreen steelblue tan
teal thistle tomato turquoise violet wheat white whitesmoke yellow
yellowgreen`
	.split(/\s+/u)
	.join('|');

const LITERAL_COLOR = new RegExp(
	`#[0-9a-f]{3,8}\\b|(?<![\\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(|(?<![\\w-])(?:${NAMED_COLORS})(?![\\w-])`,
	'iu'
);

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

/**
 * A number outside `var()` and token arithmetic that is design rather than
 * structure. Structure is 0, hairlines, 1 and the full-round values.
 */
const hasDesignNumber = function hasDesignNumber(value: string): boolean {
	return withoutDerived(value)
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

/** Keywords that pick a size or weight the theme's scale does not set. */
const FONT_KEYWORDS: Record<string, RegExp> = {
	'font-size':
		/(?<![\w-])(?:(?:xx?x?-)?(?:small|large)|medium|smaller|larger)(?![\w-])/u,
	'font-weight': /(?<![\w-])(?:bold|bolder|lighter)(?![\w-])/u,
};

/** Why a typography declaration bypasses the theme, or `undefined`. */
const fontViolation = function fontViolation(
	property: string,
	value: string
): string | undefined {
	const bare = withoutVariables(value).trim();
	// `font` sets family, size, weight and line height at once.
	if (property === 'font-family' || property === 'font') {
		return bare === 'VAR' || bare === 'inherit' ? undefined : property;
	}
	if (FONT_KEYWORDS[property]?.test(bare) || hasDesignNumber(value)) {
		return property;
	}
	return undefined;
};

const FONT_PROPERTIES = new Set([
	'font',
	'font-family',
	'font-size',
	'font-weight',
	'line-height',
]);

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
	if (FONT_PROPERTIES.has(property)) {
		return fontViolation(property, value);
	}
	if (/^border(?:-[a-z]+)*-radius$/u.test(property) && hasDesignNumber(value)) {
		return 'radius';
	}
	if (SPACING_PROPERTY.test(property) && hasDesignNumber(value)) {
		return 'spacing';
	}
	// The theme has an easing token for each of these keywords but `ease-in`;
	// `linear` and `steps()` are left alone, since no token stands for them.
	if (
		/^(?:transition|animation)(?:-duration|-timing-function)?$/u.test(
			property
		) &&
		/\d+m?s\b|cubic-bezier\(|(?<![\w-])ease(?:-in|-out|-in-out)?(?![\w-])/u.test(
			withoutDerived(value)
		)
	) {
		return 'motion';
	}
	return undefined;
};

/**
 * The property a component variable stands in for, read from its name:
 * `--legal-links-gap` is spacing, `--iab-cd-title-font-size` a font size.
 */
const VARIABLE_PROPERTIES: readonly (readonly [RegExp, string])[] = [
	[/font-family/u, 'font-family'],
	[/font-size/u, 'font-size'],
	[/font-weight/u, 'font-weight'],
	[/line-height/u, 'line-height'],
	[/radius/u, 'border-radius'],
	[/-(?:gap|padding|margin)(?:-|$)/u, 'padding'],
	[
		/-(?:transition|animation|duration|timing|easing|ease)(?:-|$)/u,
		'transition',
	],
];

/**
 * Why a component variable's default bypasses the theme, or `undefined`.
 * A literal colour is caught whatever the variable is for; anything else is
 * held to the rule for the property its name says it stands in for.
 */
const variableViolation = function variableViolation(
	name: string,
	value: string
): string | undefined {
	if (hasLiteralColor(value)) {
		return 'color';
	}
	const property = VARIABLE_PROPERTIES.find(([pattern]) =>
		pattern.test(name)
	)?.[1];
	return property ? ruleViolation(property, value) : undefined;
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

/**
 * Every reason one declaration bypasses the theme: the value itself, then
 * each component-variable fallback inside it.
 */
const declarationViolations = function declarationViolations(
	property: string,
	value: string
): string[] {
	const isVariable = property.startsWith('--');
	const check = isVariable ? variableViolation : ruleViolation;
	const reasons: string[] = [];

	const own = check(property, value);
	if (own) {
		reasons.push(isVariable ? `${own} default` : own);
	}
	for (const fallback of componentFallbacks(value)) {
		const reason = check(property, fallback);
		if (reason) {
			reasons.push(`${reason} fallback`);
		}
	}

	return [...new Set(reasons)];
};

const findViolations = function findViolations(): string[] {
	const violations = new Set<string>();

	for (const path of sourceFiles(STYLES_DIR)) {
		for (const { file, selector, property, value } of declarations(path)) {
			for (const reason of declarationViolations(property, value)) {
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
		['animation', 'fade-out var(--x) ease-in', 'motion'],
		['box-shadow', '0 1px 2px rgb(0 0 0 / 0.06)', 'shadow'],
		['color', 'rebeccapurple', 'color'],
		['font', '600 1rem/1.5 system-ui', 'font'],
		['font-weight', 'bold', 'font-weight'],
		['font-size', 'x-large', 'font-size'],
	])('flags %s: %s', (property, value, reason) => {
		expect(ruleViolation(property, value)).toBe(reason);
	});

	test.each([
		['color', 'var(--consent-banner-text-color)'],
		['color', 'color-mix(in srgb, var(--button-primary) 85%, black)'],
		['border', '1px solid var(--c15t-border)'],
		['box-shadow', '0 0 0 2px var(--focus-color)'],
		['padding', '0'],
		['margin-block-end', '-1px'],
		['border-radius', '50%'],
		['border-radius', 'calc(var(--c15t-radius-md) - 0.25rem)'],
		['color', 'currentColor'],
		['font-family', 'inherit'],
		['font', 'inherit'],
		['animation', 'spin var(--x) linear infinite'],
		['transition', 'opacity calc(var(--c15t-duration-normal) * 0.35) linear'],
		['animation', 'consent-dialog-fade-out var(--x) var(--c15t-easing)'],
	])('accepts %s: %s', (property, value) => {
		expect(ruleViolation(property, value)).toBeUndefined();
	});

	test('flags a variable whose default skips the theme', () => {
		expect(
			declarationViolations('--legal-links-color', 'hsl(228, 100%, 64%)')
		).toEqual(['color default']);
		expect(
			declarationViolations(
				'--consent-gate-font-family',
				'system-ui, sans-serif'
			)
		).toEqual(['font-family default']);
		expect(
			declarationViolations(
				'--consent-gate-placeholder-border-radius',
				'1.25rem'
			)
		).toEqual(['radius default']);
		expect(declarationViolations('--legal-links-gap', '0.75rem')).toEqual([
			'spacing default',
		]);
		expect(
			declarationViolations('--iab-cd-title-font-size', '1.125rem')
		).toEqual(['font-size default']);
		expect(
			declarationViolations('--consent-manager-line-height', '1.15')
		).toEqual(['line-height default']);
		expect(
			declarationViolations('--legal-links-transition', 'color 0.2s ease')
		).toEqual(['motion default']);
	});

	test('accepts a variable whose default follows the theme', () => {
		expect(
			declarationViolations('--legal-links-color', 'var(--c15t-primary)')
		).toEqual([]);
		expect(
			declarationViolations(
				'--consent-gate-placeholder-border-radius',
				'calc(var(--c15t-radius-lg) * 5 / 3)'
			)
		).toEqual([]);
		// Named for a property the theme has no scale for.
		expect(declarationViolations('--switch-width', '2rem')).toEqual([]);
	});

	test("flags a component variable's literal fallback", () => {
		// Nothing declares `--accordion-focus-ring`, so the fallback renders.
		expect(
			declarationViolations(
				'outline',
				'2px solid var(--accordion-focus-ring, hsl(227.93, 100%, 63.92%))'
			)
		).toEqual(['color fallback']);
		expect(
			declarationViolations(
				'padding',
				'0 var(--row-padding-x, var(--inner, 1rem))'
			)
		).toEqual(['spacing fallback']);
		expect(declarationViolations('--toolbar-gap', 'var(--x, 0.75rem)')).toEqual(
			['spacing fallback']
		);
	});

	test("accepts a theme token's fallback and a fallback to a token", () => {
		// The tokens ship with the stylesheet, so their fallback never renders.
		expect(declarationViolations('color', 'var(--c15t-text, #171717)')).toEqual(
			[]
		);
		expect(
			declarationViolations(
				'color',
				'var(--accordion-arrow-color, var(--c15t-text-muted))'
			)
		).toEqual([]);
	});
});
