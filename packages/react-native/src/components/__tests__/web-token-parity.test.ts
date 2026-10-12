/**
 * The web surfaces are the specification for these values, and this is the
 * guard that keeps them a specification rather than a screenshot someone
 * remembered.
 *
 * Every number is read out of the web package at test time. The palette, radii,
 * spacing and type scale come from the `defaultTheme` literal in
 * `packages/ui/src/theme/utils.ts`, and the rules that pick which token paints
 * which part come from the CSS modules that actually draw a banner, a dialog, a
 * button and a switch. The link between the two is `themeCSSVariableResolvers`,
 * the table that turns a `var(--c15t-space-md)` in a stylesheet into a theme
 * token, so this file follows the same indirection a browser does instead of
 * guessing at a naming convention.
 *
 * Nothing is copied into this file, so a token moved on the web fails here
 * instead of shipping as an app banner that quietly stopped matching the site
 * next to it. That drift has already happened once: the banner was built from
 * the dialog's type scale, which put a 14 semibold heading over 16 body copy
 * where the web banner leads with 16 medium over 14.
 *
 * `@c15t/ui` is deliberately not imported. It is not a dependency of this
 * package, runtime or otherwise, and a parity test is not a reason to give an
 * app a stylesheet it will never load. The same reason keeps `@c15t/core` out
 * of everything but `src/protocol/__tests__`.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { darkTheme, lightTheme } from '../theme/create-consent-theme';
import { CONSENT_SWITCH_GEOMETRY } from '../theme/use-consent-styles';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Repository root, five levels above `src/components/__tests__`. */
const ROOT = resolve(HERE, '../../../../..');

/** One file under `packages/ui`. */
const ui = function ui(path: string): string {
	return join(ROOT, 'packages/ui', path);
};

const THEME_SOURCE = ui('src/theme/utils.ts');
const PROMPT_CSS = ui('src/styles/components/prompt.module.css');
const PANEL_CSS = ui('src/styles/components/panel.module.css');
const BUTTON_CSS = ui('src/styles/primitives/button.module.css');
const SWITCH_CSS = ui('src/styles/primitives/switch.module.css');

type Literal = number | string | undefined | { [key: string]: Literal };

const read = function read(path: string): string {
	return readFileSync(path, 'utf8');
};

/** The first index at or after `from` that is neither space nor a comment. */
const code = function code(source: string, from: number): number {
	let index = from;
	for (;;) {
		const character = source[index];
		if (character === '/' && source[index + 1] === '*') {
			index = source.indexOf('*/', index) + 2;
		} else if (character === '/' && source[index + 1] === '/') {
			const newline = source.indexOf('\n', index);
			index = newline === -1 ? source.length : newline + 1;
		} else if (character === undefined || !/\s/u.test(character)) {
			return index;
		} else {
			index += 1;
		}
	}
};

const QUOTED_KEY = /^'(?<quoted>[^']*)'/u;
const BARE_KEY = /^(?<bare>[\w$]+)/u;
const NUMBER = /^(?<number>-?[\d.]+)/u;

/**
 * The object literal that follows some text in a source file.
 *
 * A parser rather than a regex because the theme nests, and a regex that stops
 * at the first `}` silently reads a half-token. Comments are skipped, which the
 * theme needs because its motion block annotates every easing. A value that is
 * not a literal (an imported palette, a function) comes back as `undefined`,
 * which is the honest answer: this file only ever asks for plain data.
 *
 * @param source - TypeScript source.
 * @param anchor - Text immediately before the `{` that opens the object.
 * @returns The literal's keys, in the shape the source writes them.
 */
const objectLiteral = function objectLiteral(
	source: string,
	anchor: string
): { [key: string]: Literal } {
	const open = source.indexOf('{', source.indexOf(anchor));
	if (open === -1) {
		throw new Error(`No object literal after ${anchor}`);
	}

	// The object and value parsers call each other, so the object parser arrives
	// as an argument rather than a name that has not been defined yet.
	const parseValue = function parseValue(
		from: number,
		entries: (from: number) => [Record<string, Literal>, number]
	): [Literal, number] {
		const character = source[from];

		if (character === '{') {
			return entries(from);
		}

		if (character === "'") {
			const close = source.indexOf("'", from + 1);
			return [source.slice(from + 1, close), close + 1];
		}

		if (character !== undefined && /[-\d.]/u.test(character)) {
			const token = NUMBER.exec(source.slice(from))?.groups?.number as string;
			return [Number(token), from + token.length];
		}

		// Anything else is an expression this file has no use for, so it is
		// walked over rather than evaluated.
		let index = from;
		let depth = 0;
		while (index < source.length) {
			const walker = source[index] as string;
			if ('([{'.includes(walker)) {
				depth += 1;
			} else if (')]}'.includes(walker)) {
				if (depth === 0) {
					break;
				}
				depth -= 1;
			} else if (walker === ',' && depth === 0) {
				break;
			}
			index += 1;
		}
		return [undefined, index];
	};

	const parseObject = function parseObject(
		from: number
	): [Record<string, Literal>, number] {
		const entries: Record<string, Literal> = {};
		let index = from + 1;

		for (;;) {
			index = code(source, index);

			// A trailing comma is legal, so a closing brace can be what comes next
			// even though the last entry ended with one.
			if (source[index] === '}') {
				return [entries, index + 1];
			}

			const rest = source.slice(index);
			const key =
				QUOTED_KEY.exec(rest)?.groups?.quoted ??
				BARE_KEY.exec(rest)?.groups?.bare;
			if (key === undefined) {
				throw new Error(`Unparsed key at offset ${index} of ${anchor}`);
			}

			index = code(
				source,
				index + key.length + (source[index] === "'" ? 2 : 0)
			);
			// Past the colon, which the source may pad.
			index = code(source, index + 1);

			const [value, end] = parseValue(index, parseObject);
			entries[key] = value;
			index = code(source, end);

			if (source[index] !== ',') {
				return [entries, index + 1];
			}
			index += 1;
		}
	};

	const [parsed] = parseObject(open);
	return parsed;
};

/**
 * Which theme token each `--c15t-*` CSS variable reads.
 *
 * Read from `themeCSSVariableResolvers`, the same table the web build
 * serialises, so a token renamed there is a name this test cannot resolve
 * rather than a name it invents. A key is quoted only when it needs to be, so
 * `border:` and `'font-size-sm':` are entries of one map.
 */
const variablePaths = function variablePaths(): Map<string, string[]> {
	const source = read(THEME_SOURCE);
	const map = new Map<string, string[]>();

	for (const groups of source
		.slice(source.indexOf('themeCSSVariableResolvers'))
		.matchAll(
			/^\t*'?(?<suffix>[a-z][\w-]*)'?\s*:\s*\([^)]*\)\s*=>\s*(?<body>[^,\n]*(?:\n\s*[^,\n]*)?),$/gmu
		)) {
		const walk = /(?<root>(?:theme|colors)\??(?:\.[\w$]+\??)+)/u.exec(
			groups.groups?.body ?? ''
		);
		const parts = walk?.groups?.root
			?.split('.')
			.filter((segment) => segment.length > 0)
			.map((segment) => segment.replace('?', ''));
		const suffix = groups.groups?.suffix;
		if (parts === undefined || suffix === undefined) {
			continue;
		}

		// `theme` is the whole object and is implied by the walk itself, while
		// `colors` names which of the two palettes to read, so that one stays.
		const [root, ...rest] = parts;
		map.set(suffix, root === 'colors' ? ['colors', ...rest] : rest);
	}

	if (map.size < 30) {
		throw new Error(
			`Resolved only ${map.size} CSS variables from the web theme map`
		);
	}

	return map;
};

const VARS = variablePaths();
const WEB_THEME = objectLiteral(
	read(THEME_SOURCE),
	'export const defaultTheme'
);
const WEB_DARK = objectLiteral(
	read(THEME_SOURCE),
	'export const defaultDarkColors'
);

/** One file's `--name: value` declarations, first definition winning. */
const declarationsCache = new Map<string, Map<string, string>>();
const declarationsIn = function declarationsIn(
	source: string
): Map<string, string> {
	const cached = declarationsCache.get(source);
	if (cached !== undefined) {
		return cached;
	}

	const out = new Map<string, string>();
	for (const groups of source.matchAll(
		/(?<name>--[\w-]+):\s*(?<value>[^;]+);/gu
	)) {
		const name = groups.groups?.name;
		const value = groups.groups?.value;
		if (name !== undefined && value !== undefined && !out.has(name)) {
			out.set(name, value.trim());
		}
	}
	declarationsCache.set(source, out);
	return out;
};

/** The web palette for one scheme, as the theme literal declares it. */
const palette = function palette(dark: boolean): Literal {
	return dark ? WEB_DARK : (WEB_THEME.colors as Literal);
};

/**
 * One entry of the web theme, walked by the path the variable map names.
 *
 * A colour path reads the dark palette when asked for the dark scheme, which is
 * how the web itself swaps them: one map, two palettes.
 */
const themeValue = function themeValue(
	path: readonly string[],
	dark: boolean
): string {
	const isColor = path[0] === 'colors';
	let walked: Literal = isColor ? palette(dark) : WEB_THEME;

	for (const segment of isColor ? path.slice(1) : path) {
		if (typeof walked !== 'object' || walked === null) {
			throw new Error(`${path.join('.')} walks off a non-object at ${segment}`);
		}
		walked = walked[segment];
	}

	if (typeof walked !== 'string' && typeof walked !== 'number') {
		throw new Error(`${path.join('.')} resolves to nothing in the web theme`);
	}

	return String(walked);
};

/**
 * What a suffix of `--c15t-*` is worth, straight out of the web theme.
 *
 * @param suffix - The variable name with the `--c15t-` prefix removed.
 * @param dark - Read the dark palette for a colour token.
 */
const tokenBySuffix = function tokenBySuffix(
	suffix: string,
	dark = false
): string {
	const path = VARS.get(suffix);
	if (path === undefined) {
		throw new Error(`No web theme token behind --c15t-${suffix}`);
	}
	return themeValue(path, dark);
};

const VAR_REFERENCE = /^var\((?<reference>--[\w-]+)\)$/u;

/**
 * What a CSS variable is worth, following `var()` hops the way a browser does.
 *
 * A `--c15t-*` variable is the theme itself. Anything else, such as
 * `--button-font-size`, is a local alias declared in the same stylesheet, which
 * is followed first and then resolved the same way.
 *
 * @param source - The stylesheet the variable is used in.
 * @param name - The variable, with or without the `--c15t-` prefix.
 * @param dark - Read the dark palette for a colour token.
 */
const webToken = function webToken(
	source: string,
	name: string,
	dark = false
): string {
	const variable = name.startsWith('--') ? name : `--c15t-${name}`;
	if (variable.startsWith('--c15t-')) {
		return tokenBySuffix(variable.slice('--c15t-'.length), dark);
	}

	const declared = declarationsIn(source).get(variable);
	if (declared === undefined) {
		throw new Error(`${variable} is never declared`);
	}

	const reference = VAR_REFERENCE.exec(declared)?.groups?.reference;
	return reference === undefined ? declared : webToken(source, reference, dark);
};

const clamp = function clamp(value: number, max: number): number {
	return Math.min(Math.max(value, 0), max);
};

/**
 * Which of `chroma`, the intermediate channel, and zero each of red, green and
 * blue carries, indexed by hue sector.
 */
const HUE_SECTORS: readonly (readonly [number, number, number])[] = [
	[0, 1, 2],
	[1, 0, 2],
	[2, 0, 1],
	[2, 1, 0],
	[1, 2, 0],
	[0, 2, 1],
];

const HSL =
	/^hsla?\((?<h>[\d.]+),\s*(?<s>[\d.]+)%,\s*(?<l>[\d.]+)%(?:,\s*(?<a>[\d.]+))?\)$/u;

/**
 * A CSS colour in the shape `packages/ui` writes it, as the shape this package
 * writes it: hex for an opaque colour, `rgba()` when there is an alpha.
 *
 * @param value - An `hsl()` or `hsla()` literal.
 * @returns The same colour as React Native can apply it.
 */
const asNativeColor = function asNativeColor(value: string): string {
	const channels = HSL.exec(value)?.groups;
	if (
		channels?.h === undefined ||
		channels.s === undefined ||
		channels.l === undefined
	) {
		throw new Error(`Unreadable web colour: ${value}`);
	}

	const saturation = Number(channels.s) / 100;
	const lightness = Number(channels.l) / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const hue = Number(channels.h) / 60;
	const intermediate = chroma * (1 - Math.abs((hue % 2) - 1));
	const base = [chroma, intermediate, 0];
	const offset = lightness - chroma / 2;
	const channel = function channel(index: number): number {
		return Math.round(clamp((base[index] as number) + offset, 1) * 255);
	};

	const sector = HUE_SECTORS[
		clamp(Math.floor(hue), HUE_SECTORS.length - 1)
	] as readonly [number, number, number];
	const [red, green, blue] = [
		channel(sector[0]),
		channel(sector[1]),
		channel(sector[2]),
	];

	if (channels.a !== undefined) {
		return `rgba(${red}, ${green}, ${blue}, ${channels.a})`;
	}

	return `#${[red, green, blue]
		.map((one) => one.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase()}`;
};

const RATIO = /^[\d.]+$/u;

/**
 * A CSS length or ratio in the points React Native sizes in.
 *
 * A bare number is a line-height ratio and only becomes a length next to a font
 * size, which is exactly how the web treats it.
 */
const measure = function measure(value: string, againstFont?: number): number {
	if (RATIO.test(value)) {
		if (againstFont === undefined) {
			throw new Error(`${value} is a ratio and needs a font size`);
		}
		return Number(value) * againstFont;
	}
	return Number.parseFloat(value) * 16;
};

const DECLARATION = /(?<property>[\w-]+):\s*(?<value>[^;]+);/gu;

/** The declaration block for one selector, as key/value pairs. */
const cssBlock = function cssBlock(
	source: string,
	selector: string
): Record<string, string> {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	const block = new RegExp(`(?<rule>${escaped}\\s*\\{[^}]*\\})`, 'u').exec(
		source
	)?.groups?.rule;
	if (block === undefined) {
		throw new Error(`No CSS rule for ${selector}`);
	}

	const declarations: Record<string, string> = {};
	for (const groups of block.matchAll(DECLARATION)) {
		const property = groups.groups?.property;
		const value = groups.groups?.value;
		if (property !== undefined && value !== undefined) {
			declarations[property] = value.trim();
		}
	}
	return declarations;
};

/**
 * The text style one rule asks for, with a second rule to fall back on.
 *
 * A size variant sets the font size and line-height while the base rule carries
 * the weight, so both are read rather than guessed at.
 */
const webType = function webType(
	source: string,
	selector: string,
	fallback?: string
): { fontSize: number; fontWeight: number; lineHeight: number } {
	const blocks = [cssBlock(source, selector)];
	if (fallback !== undefined) {
		blocks.push(cssBlock(source, fallback));
	}

	const declared = function declared(property: string): string {
		const raw = blocks
			.map((block) => block[property])
			.find((value) => value !== undefined);
		if (raw === undefined) {
			throw new Error(`${selector} declares no ${property}`);
		}

		const reference = VAR_REFERENCE.exec(raw)?.groups?.reference;
		return reference === undefined ? raw : webToken(source, reference);
	};

	const fontSize = measure(declared('font-size'));
	return {
		fontSize,
		fontWeight: Number(declared('font-weight')),
		lineHeight: measure(declared('line-height'), fontSize),
	};
};

/** Maps a web colour token onto the part of a consent surface it paints. */
const COLOR_PARITY: readonly (readonly [
	web: string,
	mobile: keyof typeof lightTheme.colors,
])[] = [
	['border', 'border'],
	['overlay', 'overlay'],
	['primary', 'primary'],
	['surface', 'surface'],
	['surface-hover', 'surfaceRaised'],
	['switch-thumb', 'switchThumb'],
	['switch-track', 'switchTrack'],
	['switch-track-active', 'switchTrackOn'],
	['text', 'text'],
	['text-muted', 'textMuted'],
	['text-on-primary', 'onPrimary'],
];

describe('web token parity', () => {
	test('every light colour is the web colour', () => {
		for (const [web, mobile] of COLOR_PARITY) {
			expect({ [web]: asNativeColor(tokenBySuffix(web)) }, web).toEqual({
				[web]: lightTheme.colors[mobile],
			});
		}
	});

	test('every dark colour is the web dark colour', () => {
		for (const [web, mobile] of COLOR_PARITY) {
			expect({ [web]: asNativeColor(tokenBySuffix(web, true)) }, web).toEqual({
				[web]: darkTheme.colors[mobile],
			});
		}
	});

	test('corners follow the web radii', () => {
		// The card is `radius.lg` and a control is `radius.md`, which is what
		// `--consent-banner-border-radius` and `--button-border-radius` ask for.
		expect(lightTheme.radius.surface).toBe(measure(tokenBySuffix('radius-lg')));
		expect(lightTheme.radius.control).toBe(measure(tokenBySuffix('radius-md')));
	});

	test('the spacing scale is the web scale', () => {
		expect(lightTheme.spacing).toEqual({
			l: measure(tokenBySuffix('space-lg')),
			m: measure(tokenBySuffix('space-md')),
			s: measure(tokenBySuffix('space-sm')),
			xl: measure(tokenBySuffix('space-xl')),
			xs: measure(tokenBySuffix('space-xs')),
		});
	});

	test('the banner leads with its own heading pair', () => {
		// `prompt.module.css` is the banner, and it is not the dialog: the
		// heading is larger than the copy underneath it. Getting this pair the
		// wrong way round is the exact drift this test exists to catch.
		const prompt = read(PROMPT_CSS);
		const title = webType(prompt, '.title:not(:global(.headless))');
		const body = webType(
			prompt,
			".description[data-context='banner']:not(:global(.headless))"
		);

		expect(lightTheme.typography.bannerTitle).toEqual({
			fontSize: title.fontSize,
			lineHeight: title.lineHeight,
			weight: String(title.fontWeight) as '500',
		});
		expect(lightTheme.typography.bannerBody).toEqual({
			fontSize: body.fontSize,
			lineHeight: body.lineHeight,
			weight: String(body.fontWeight) as '400',
		});
		expect(lightTheme.typography.bannerTitle.fontSize).toBeGreaterThan(
			lightTheme.typography.bannerBody.fontSize
		);
	});

	test('the dialog follows its own heading pair', () => {
		const panel = read(PANEL_CSS);
		const title = cssBlock(panel, '.title:not(:global(.headless))');
		const description = webType(
			panel,
			".description[data-context='dialog']:not(:global(.headless))"
		);

		// The dialog heading is smaller than its body, the opposite of a banner,
		// which is why the theme carries a pair per surface. Its line-height is a
		// hard `1`, so the heading sits tight against the copy below it.
		const titleSize = measure(
			webToken(panel, '--consent-dialog-title-font-size')
		);
		expect(lightTheme.typography.title).toEqual({
			fontSize: titleSize,
			lineHeight: measure(title['line-height'] as string, titleSize),
			weight: String(
				webToken(panel, '--consent-dialog-title-font-weight')
			) as '600',
		});
		expect(lightTheme.typography.body).toEqual({
			fontSize: description.fontSize,
			lineHeight: description.lineHeight,
			weight: String(description.fontWeight) as '400',
		});
		expect(lightTheme.typography.title.fontSize).toBeLessThan(
			lightTheme.typography.body.fontSize
		);
	});

	test('a button label is the web small button label', () => {
		const label = webType(read(BUTTON_CSS), '.button-small', '.button');

		expect(lightTheme.typography.label).toEqual({
			fontSize: label.fontSize,
			lineHeight: label.lineHeight,
			weight: String(label.fontWeight) as '500',
		});
	});

	test('the switch is the web small switch', () => {
		const small = cssBlock(read(SWITCH_CSS), '.root-small');
		const size = function size(property: string): number {
			return measure(small[`--switch-${property}`] as string);
		};

		expect(CONSENT_SWITCH_GEOMETRY).toEqual({
			height: size('height'),
			padding: size('padding'),
			thumb: size('thumb-size'),
			width: size('width'),
		});
	});
});
