/**
 * Playwright-side computed-style capture.
 *
 * Captures computed CSS and the CSS custom properties each `[data-testid]`
 * element at or under `selector` declares for itself. `selector` may match
 * more than one element — the scope is one entry per surface on the page,
 * not a single wrapper — so matched roots that carry a `data-testid` are
 * captured too. The capture runs inside the page (Playwright `evaluate`)
 * because `getComputedStyle` is a browser API; the diff itself runs
 * Node-side via `diffComputedStyleMap` from `@c15t/conformance`.
 * Pass `*` as `elementSelector` to compare all descendants by DOM order.
 *
 * Values are canonicalised before they leave this module, because each
 * framework's Storybook reaches the same tokens by a different route and the
 * browser hands back whatever text that route produced. Custom properties are
 * the exposed case: `getComputedStyle` resolves a registered property but
 * returns an unregistered `--*` as the author's literal token, so a stylesheet
 * a bundler minified (`.5rem`, `.15s`) and one it did not (`0.5rem`, `150ms`)
 * disagree on spelling while meaning the same thing. See
 * {@link normalizeCssValue} for what is folded away.
 *
 * The property list is duplicated here (and in `@c15t/conformance`'s
 * `computed-style.ts`) because Playwright can't import ESM into page context.
 * Keep these in sync.
 */

import type { ComputedStyleSnapshot } from '@c15t/conformance';
import type { Page } from '@playwright/test';

const DEFAULT_PROPS = [
	// layout
	'display',
	'position',
	'flex-direction',
	'justify-content',
	'align-items',
	'gap',
	'grid-template-columns',
	'grid-template-rows',
	// box
	'width',
	'height',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-radius',
	// typography
	'font-family',
	'font-size',
	'font-weight',
	'line-height',
	'letter-spacing',
	'text-align',
	'color',
	// visual
	'background-color',
	'opacity',
	'visibility',
	'z-index',
	'box-shadow',
	// accessibility-visible direction
	'direction',
] as const;

/**
 * A CSS Modules scoped identifier, as Vite's default
 * `[local]_[hash:base64:5]_[index]` generator spells it: `_enter_t5rx4_1`.
 * The React Storybook compiles its keyframes through CSS Modules, the others
 * link the built stylesheet, so the same animation arrives under two names.
 */
const CSS_MODULES_SCOPED_NAME =
	/_(?<localName>[a-zA-Z][\w-]*?)_[a-z0-9]{4,8}_\d+\b/gu;

/**
 * A seconds literal, excluding the `s` that ends `ms`.
 *
 * The lookahead has to reject `.` and `/` as well as letters: without it
 * `2s.svg` inside a path reads as a time and comes back as `2000ms.svg`.
 */
const SECONDS_LITERAL = /(?<seconds>-?(?:\d+\.?\d*|\.\d+))s(?![\w.%/-])/gu;

/** A decimal written without its leading zero: `.5rem`, `cubic-bezier(.4`. */
const BARE_DECIMAL = /(?<before>^|[^\w.])\.(?<digit>\d)/gu;

/** Trailing zeros that carry no value: `1.50px`, `2.0s`. */
const TRAILING_ZEROS = /(?<whole>\d+)\.(?<fraction>\d*[1-9])?0+(?![\d.])/gu;

/**
 * Text a rewrite must not enter: a `url()` and a quoted string are opaque
 * payloads, not CSS values. `url(/assets/2s.svg)` is not a two-second
 * anything, and folding it would make it compare equal to a genuinely
 * different `url(/assets/2000ms.svg)`.
 */
const OPAQUE_SEGMENT = /url\((?:[^)'"]|"[^"]*"|'[^']*')*\)|"[^"]*"|'[^']*'/gu;

/**
 * Rounds to 6 decimal places, so `0.15 * 1000` reads as `150` rather than
 * `150.00000000000003`.
 */
const roundMilliseconds = function roundMilliseconds(seconds: number): number {
	return Math.round(seconds * 1e9) / 1e6;
};

/**
 * Canonicalises one computed CSS value so two spellings of the same value
 * compare equal.
 *
 * Three rewrites, each folding away a difference in how the value was
 * serialised rather than a difference in what it means:
 *
 * - **Scoped names** — `_enter_t5rx4_1` becomes `enter`, so a keyframe
 *   compiled through CSS Modules matches the same keyframe linked from a
 *   plain stylesheet.
 * - **Times** — seconds become milliseconds, so `.15s` matches `150ms`.
 * - **Numbers** — a missing leading zero is restored and trailing zeros are
 *   dropped, so `.5rem` matches `0.5rem` and `cubic-bezier(.4, 0, .2, 1)`
 *   matches `cubic-bezier(0.4, 0, 0.2, 1)`.
 *
 * `url()` payloads and quoted strings are left untouched: they carry file
 * names and content, not CSS values, and rewriting them would fold two
 * genuinely different assets onto one another.
 *
 * Anything else is left alone. Two values that still differ after this differ
 * for a reason the gate should report.
 *
 * @param value - A computed property or custom property value.
 * @returns The canonical spelling of that value.
 *
 * @example
 * ```ts
 * normalizeCssValue('_enter_t5rx4_1 80ms cubic-bezier(.4, 0, .2, 1)');
 * // 'enter 80ms cubic-bezier(0.4, 0, 0.2, 1)'
 * ```
 */
const rewriteCssText = function rewriteCssText(text: string): string {
	return text
		.replace(CSS_MODULES_SCOPED_NAME, '$<localName>')
		.replace(
			SECONDS_LITERAL,
			(_match, seconds: string) => `${roundMilliseconds(Number(seconds))}ms`
		)
		.replace(BARE_DECIMAL, '$<before>0.$<digit>')
		.replace(TRAILING_ZEROS, (_match, whole: string, fraction?: string) =>
			fraction ? `${whole}.${fraction}` : whole
		);
};

export const normalizeCssValue = function normalizeCssValue(
	value: string
): string {
	let out = '';
	let cursor = 0;
	for (const match of value.matchAll(OPAQUE_SEGMENT)) {
		const start = match.index;
		out += rewriteCssText(value.slice(cursor, start)) + match[0];
		cursor = start + match[0].length;
	}
	return out + rewriteCssText(value.slice(cursor));
};

/**
 * Applies {@link normalizeCssValue} to every value in a captured snapshot map,
 * leaving the element ids and property names untouched.
 *
 * @param snapshots - The map `captureComputedStyleMap` collected in the page.
 * @returns The same map with canonical values.
 */
export const normalizeComputedStyleMap = function normalizeComputedStyleMap<
	MapType extends Record<string, ComputedStyleSnapshot>,
>(snapshots: MapType): Record<string, ComputedStyleSnapshot> {
	const normalizeEntries = function normalizeEntries(
		values: Record<string, string>
	): Record<string, string> {
		return Object.fromEntries(
			Object.entries(values).map(([name, value]) => [
				name,
				normalizeCssValue(value),
			])
		);
	};

	return Object.fromEntries(
		Object.entries(snapshots).map(([id, snapshot]) => [
			id,
			{
				customProperties: normalizeEntries(snapshot.customProperties),
				properties: normalizeEntries(snapshot.properties),
			},
		])
	);
};

export const captureComputedStyleMap = async function captureComputedStyleMap(
	page: Page,
	selector: string,
	elementSelector = '[data-testid]'
): Promise<Record<string, ComputedStyleSnapshot>> {
	const captured = await page.evaluate(
		(args: { sel: string; props: readonly string[]; elements: string }) => {
			const roots = Array.from(document.querySelectorAll(args.sel));
			if (roots.length === 0) {
				throw new Error(`no element: ${args.sel}`);
			}

			/**
			 * Collapse the whitespace a serialised value carries.
			 *
			 * A minified stylesheet writes `calc(1rem - 2px)` where the
			 * source writes `calc( 1rem - 2px )`. Same value, same layout;
			 * only the bundler differs.
			 */
			const normalizeValue = function normalizeValue(value: string): string {
				return value
					.replace(/\s+/gu, ' ')
					.replace(/\(\s+/gu, '(')
					.replace(/\s+\)/gu, ')')
					.trim();
			};

			/**
			 * Custom properties this element declares, rather than the whole
			 * theme it inherits.
			 *
			 * Every element inherits the full `:root` token set, so a single
			 * ambient difference — one Storybook loading a token sheet in a
			 * different order from another — would otherwise report itself
			 * once per element and bury the component drift underneath. A
			 * property whose value matches the parent's was inherited, not
			 * declared, so it belongs to the page and not the component.
			 */
			const getDeclaredCustomProperties = function getDeclaredCustomProperties(
				style: CSSStyleDeclaration,
				parentStyle: CSSStyleDeclaration | null
			): Record<string, string> {
				const out: Record<string, string> = {};
				for (let i = 0; i < style.length; i += 1) {
					const name = style.item(i);
					if (!name.startsWith('--')) {
						continue;
					}
					const value = normalizeValue(style.getPropertyValue(name));
					if (
						parentStyle &&
						normalizeValue(parentStyle.getPropertyValue(name)) === value
					) {
						continue;
					}
					out[name] = value;
				}
				return out;
			};

			const captureOne = function captureOne(el: Element) {
				const style = getComputedStyle(el);
				const parentStyle = el.parentElement
					? getComputedStyle(el.parentElement)
					: null;
				const properties: Record<string, string> = {};
				for (const name of args.props) {
					properties[name] = normalizeValue(style.getPropertyValue(name));
				}
				return {
					customProperties: getDeclaredCustomProperties(style, parentStyle),
					properties,
				};
			};

			const out: Record<
				string,
				{
					properties: Record<string, string>;
					customProperties: Record<string, string>;
				}
			> = {};
			const seen = new Set<string>();
			const elements: Element[] = [];
			for (const root of roots) {
				elements.push(
					root,
					...Array.from(root.querySelectorAll(args.elements))
				);
			}
			for (const [index, el] of elements.entries()) {
				const id =
					el.getAttribute('data-testid') ??
					(args.elements === '*'
						? `${el.tagName.toLowerCase()}:${index}`
						: null);
				if (!id || seen.has(id)) {
					continue;
				}
				seen.add(id);
				out[id] = captureOne(el);
			}
			return out;
		},
		{ elements: elementSelector, props: DEFAULT_PROPS, sel: selector }
	);

	return normalizeComputedStyleMap(captured);
};
