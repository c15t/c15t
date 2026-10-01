/**
 * The "Secured by" tag reads its colours, border, shadow and the edge it
 * shares with the card from `--consent-branding-tag-*` variables. Without
 * them a host that wants the tag to match its card has to out-rank four
 * descendant rules that each hardcode `--c15t-text-on-primary`.
 *
 * The variables are read with a fallback rather than declared on `:root`, so
 * the defaults still resolve on the tag itself and follow a `--c15t-primary`
 * or dark palette scoped to a banner or to `.c15t-theme-root`.
 *
 * jsdom cannot compute these properties (it rejects `@layer` and does not
 * substitute `var()`), so this substitutes the tag variables in the shipped
 * declarations by hand. These read the built artifacts, so
 * `bun run --cwd packages/ui build` (which `test` depends on) must have run.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'postcss';
import { describe, expect, test } from 'vitest';

const DIST_DIR = join(__dirname, '..', '..', '..', 'dist');

const readDist = function readDist(relativePath: string): string {
	const path = join(DIST_DIR, relativePath);

	if (!existsSync(path)) {
		throw new Error(
			`Missing ${path}. Build @c15t/ui first: bun run --cwd packages/ui build`
		);
	}

	return readFileSync(path, 'utf8');
};

/** Hashed class names from the branding class map. */
const classes = Object.fromEntries(
	[
		...readDist(join('styles', 'components', 'branding.js')).matchAll(
			/(?<key>\w+):"(?<name>c15t-ui-[\w-]+)"/gu
		),
	].map((match) => [match.groups?.key, match.groups?.name])
) as Record<string, string>;

const cls = function cls(key: string): string {
	const name = classes[key];

	if (!name) {
		throw new Error(`branding class map has no ${key}`);
	}

	return name;
};

const stylesheet = parse(readDist('styles.css'));

/** Every value `prop` takes in a rule whose selector passes `matches`. */
const declared = function declared(
	matches: (selector: string, selectors: string[]) => boolean,
	prop: string
): string[] {
	const values: string[] = [];

	stylesheet.walkRules((rule) => {
		if (!matches(rule.selector, rule.selectors)) {
			return;
		}

		rule.walkDecls(prop, (decl) => {
			values.push(decl.value);
		});
	});

	return values;
};

/**
 * Replace each `var(--consent-branding-tag-*, fallback)` with the host's value,
 * or with its fallback when the host sets none. Other `var()`s are left alone:
 * those are theme tokens the page resolves as before.
 */
const substitute = function substitute(
	value: string,
	host: Record<string, string>
): string {
	let out = '';
	let index = 0;

	while (index < value.length) {
		const start = value.indexOf('var(--consent-branding-tag-', index);

		if (start === -1) {
			out += value.slice(index);
			break;
		}

		out += value.slice(index, start);

		let depth = 1;
		let comma = -1;
		let end = start + 4;

		for (; end < value.length && depth > 0; end += 1) {
			const char = value[end];

			if (char === '(') {
				depth += 1;
			} else if (char === ')') {
				depth -= 1;
			} else if (char === ',' && depth === 1 && comma === -1) {
				comma = end;
			}
		}

		const inner = value.slice(start + 4, end - 1);
		const name = (comma === -1 ? inner : inner.slice(0, comma - start - 4))
			.trim()
			.replace(/\s+/gu, '');
		const fallback = comma === -1 ? '' : inner.slice(comma - start - 3).trim();
		const hostValue = host[name];

		out += hostValue === undefined ? substitute(fallback, host) : hostValue;
		index = end;
	}

	return out;
};

const tag = () => `.${cls('brandingTag')}:not(.headless)`;

/** Where each part of the tag gets the property under test. */
const TARGETS = {
	bannerTag: (selector: string) =>
		selector.includes(`.${cls('brandingTag')}[data-context=banner]`),
	c15tMark: (_: string, selectors: string[]) =>
		selectors.includes(`${tag()} .${cls('brandingC15TMark')}`),
	copy: (_: string, selectors: string[]) =>
		selectors.includes(`${tag()} .${cls('brandingCopy')}`),
	dialogTag: (selector: string) =>
		selector.includes(`.${cls('brandingTag')}[data-context=dialog]`),
	inthMark: (_: string, selectors: string[]) =>
		selectors.includes(`${tag()} .${cls('brandingInth')}`),
	legacyBannerTag: (_: string, selectors: string[]) =>
		selectors.includes(`.${cls('brandingTagBanner')}:not(.headless)`),
	legacyDialogTag: (_: string, selectors: string[]) =>
		selectors.includes(`.${cls('brandingTagDialog')}:not(.headless)`),
	tag: (_: string, selectors: string[]) => selectors.includes(tag()),
	wordmark: (_: string, selectors: string[]) =>
		selectors.includes(`${tag()} .${cls('brandingWordmark')}`),
} as const;

const CHECKS = [
	['tag', 'background-color'],
	['tag', 'border'],
	['tag', 'color'],
	['tag', 'box-shadow'],
	['copy', 'color'],
	['wordmark', 'color'],
	['c15tMark', 'color'],
	['inthMark', 'color'],
	['bannerTag', 'border-bottom-width'],
	['legacyBannerTag', 'border-bottom-width'],
	['dialogTag', 'border-top-width'],
	['dialogTag', 'transform'],
	['legacyDialogTag', 'border-top-width'],
	['legacyDialogTag', 'transform'],
] as const;

/** What each check resolves to with `host` variables set on an ancestor. */
const resolve = function resolve(
	host: Record<string, string>
): Record<string, string> {
	return Object.fromEntries(
		CHECKS.map(([target, prop]) => {
			const values = declared(TARGETS[target], prop);
			expect(values, `${target} ${prop}`).toHaveLength(1);

			return [`${target} ${prop}`, substitute(values[0] ?? '', host)];
		})
	);
};

describe('the "Secured by" tag', () => {
	test('found its class names', () => {
		expect(cls('brandingTag')).toMatch(/^c15t-ui-brandingTag-/u);
	});

	test('keeps its look when no variable is set', () => {
		const onPrimary = 'var(--c15t-text-on-primary,#fff)';
		const dialogOffset = 'translateY(calc(100% + 1px - 0px))';

		expect(resolve({})).toEqual({
			'bannerTag border-bottom-width': '0px',
			'c15tMark color': onPrimary,
			'copy color': onPrimary,
			'dialogTag border-top-width': '0px',
			'dialogTag transform': dialogOffset,
			'inthMark color': onPrimary,
			'legacyBannerTag border-bottom-width': '0px',
			'legacyDialogTag border-top-width': '0px',
			'legacyDialogTag transform': dialogOffset,
			'tag background-color': 'var(--c15t-primary)',
			'tag border':
				'1px solid color-mix(in srgb, var(--c15t-primary), black 14%)',
			'tag box-shadow': 'inset 0 1px 0 #ffffff29, 0 1px 2px #0f172a1f',
			'tag color': onPrimary,
			'wordmark color': onPrimary,
		});
	});

	test('takes every colour, the shadow and the attached edge from variables', () => {
		const dialogOffset = 'translateY(calc(100% + 1px - 1px))';

		expect(
			resolve({
				'--consent-branding-tag-attached-edge-width': '1px',
				'--consent-branding-tag-background-color': 'var(--c15t-surface)',
				'--consent-branding-tag-border-color': 'var(--c15t-border)',
				'--consent-branding-tag-mark-color': 'var(--c15t-primary)',
				'--consent-branding-tag-shadow': 'none',
				'--consent-branding-tag-text-color': 'var(--c15t-text-muted)',
			})
		).toEqual({
			'bannerTag border-bottom-width': '1px',
			'c15tMark color': 'var(--c15t-primary)',
			'copy color': 'var(--c15t-text-muted)',
			'dialogTag border-top-width': '1px',
			'dialogTag transform': dialogOffset,
			'inthMark color': 'var(--c15t-primary)',
			'legacyBannerTag border-bottom-width': '1px',
			'legacyDialogTag border-top-width': '1px',
			'legacyDialogTag transform': dialogOffset,
			'tag background-color': 'var(--c15t-surface)',
			'tag border': '1px solid var(--c15t-border)',
			'tag box-shadow': 'none',
			'tag color': 'var(--c15t-text-muted)',
			'wordmark color': 'var(--c15t-text-muted)',
		});
	});

	test('colours the mark like the text unless the mark is set', () => {
		const resolved = resolve({
			'--consent-branding-tag-text-color': 'CanvasText',
		});

		expect(resolved['c15tMark color']).toBe('CanvasText');
		expect(resolved['inthMark color']).toBe('CanvasText');
	});
});
