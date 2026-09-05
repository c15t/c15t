/**
 * Playwright-side computed-style capture.
 *
 * Captures computed CSS and the CSS custom properties each `[data-testid]`
 * element at or under `selector` declares for itself. `selector` may match more than one element — the
 * scope is one entry per surface on the page, not a single wrapper — so
 * matched roots that carry a `data-testid` are captured too. The capture
 * runs inside the page (Playwright `evaluate`) because `getComputedStyle`
 * is a browser API; the diff itself runs Node-side via
 * `diffComputedStyleMap` from `@c15t/conformance`.
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

export const captureComputedStyleMap = function captureComputedStyleMap(
	page: Page,
	selector: string
): Promise<Record<string, ComputedStyleSnapshot>> {
	return page.evaluate(
		(args: { sel: string; props: readonly string[] }) => {
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
					...Array.from(root.querySelectorAll('[data-testid]'))
				);
			}
			for (const el of elements) {
				const id = el.getAttribute('data-testid');
				if (!id || seen.has(id)) {
					continue;
				}
				seen.add(id);
				out[id] = captureOne(el);
			}
			return out;
		},
		{ props: DEFAULT_PROPS, sel: selector }
	);
};
