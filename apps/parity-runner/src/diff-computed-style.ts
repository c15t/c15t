/**
 * Playwright-side computed-style capture.
 *
 * Captures computed CSS + CSS custom properties for every `[data-testid]`
 * under `selector`. The capture runs inside the page (Playwright `evaluate`)
 * because `getComputedStyle` is a browser API; the diff itself runs Node-side
 * via `diffComputedStyleMap` from `@c15t/conformance`.
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

export async function captureComputedStyleMap(
	page: Page,
	selector: string
): Promise<Record<string, ComputedStyleSnapshot>> {
	return page.evaluate(
		(args: { sel: string; props: readonly string[] }) => {
			const root = document.querySelector(args.sel);
			if (!root) throw new Error(`no element: ${args.sel}`);

			function getCustomProperties(
				style: CSSStyleDeclaration
			): Record<string, string> {
				const out: Record<string, string> = {};
				for (let i = 0; i < style.length; i++) {
					const name = style.item(i);
					if (name.startsWith('--')) {
						out[name] = style.getPropertyValue(name).trim();
					}
				}
				return out;
			}

			function captureOne(el: Element) {
				const style = getComputedStyle(el);
				const properties: Record<string, string> = {};
				for (const name of args.props) {
					properties[name] = style.getPropertyValue(name).trim();
				}
				return {
					properties,
					customProperties: getCustomProperties(style),
				};
			}

			const out: Record<
				string,
				{
					properties: Record<string, string>;
					customProperties: Record<string, string>;
				}
			> = {};
			const seen = new Set<string>();
			const elements = root.querySelectorAll('[data-testid]');
			for (const el of Array.from(elements)) {
				const id = el.getAttribute('data-testid');
				if (!id || seen.has(id)) continue;
				seen.add(id);
				out[id] = captureOne(el);
			}
			return out;
		},
		{ sel: selector, props: DEFAULT_PROPS }
	);
}
