/**
 * Playwright-side DOM snapshot.
 *
 * We run the normalizer inside the page so we don't need a Node-side DOM
 * (jsdom/happy-dom) just to parse captured HTML. The normalizer source
 * is passed directly to Playwright so it still runs in the browser context.
 */

import type { Page } from '@playwright/test';

export const captureDomSnapshot = function captureDomSnapshot(
	page: Page,
	selector: string
): Promise<string> {
	return page.locator(selector).evaluate((target) => {
		const SVELTE = /\bsvelte-[a-z0-9]+\b/gu;
		const S_SCOPED = /\bs-[a-z0-9]{6,}\b/gu;
		const AUTO_ID = /^(?::r[0-9a-z]+:|radix-[a-z0-9-]+|ark-[a-z0-9-]+)$/u;
		const AUTO_ID_SUFFIX =
			/-(?:_r_[0-9a-z]+_|r[0-9a-z]+|c[0-9]+|v(?:-[0-9]+)+)$/u;
		const STRIP = new Set([
			'data-reactroot',
			'data-reactid',
			'data-svelte-h',
			'data-v-app',
		]);

		const isProviderArtifact = function isProviderArtifact(
			element: Element
		): boolean {
			return element.tagName === 'STYLE' && element.id === 'c15t-theme';
		};

		const stripClasses = function stripClasses(value: string): string {
			const seen = new Set<string>();
			const out: string[] = [];
			for (const token of value
				.replace(SVELTE, '')
				.replace(S_SCOPED, '')
				.split(/\s+/u)) {
				if (!token || seen.has(token)) {
					continue;
				}
				seen.add(token);
				out.push(token);
			}
			out.sort();
			return out.join(' ');
		};

		const canonicalStyle = function canonicalStyle(
			style: CSSStyleDeclaration
		): string {
			return Array.from(style)
				.sort()
				.map((name) => {
					const value = style.getPropertyValue(name).trim();
					const priority = style.getPropertyPriority(name);
					return `${name}:${value}${priority ? ` !${priority}` : ''}`;
				})
				.join(';');
		};

		const normAttr = function normAttr(
			element: Element,
			name: string,
			value: string
		): string {
			if (
				name === 'id' ||
				name === 'aria-labelledby' ||
				name === 'aria-describedby' ||
				name === 'aria-controls' ||
				name === 'for'
			) {
				if (AUTO_ID.test(value)) {
					return '__AUTO__';
				}
				return value.replace(AUTO_ID_SUFFIX, '-__AUTO__');
			}
			if (name === 'class') {
				return stripClasses(value);
			}
			if (name === 'style' && 'style' in element) {
				return canonicalStyle(
					(element as Element & { style: CSSStyleDeclaration }).style
				);
			}
			return value;
		};

		const canonicalize = function canonicalize(element: Element): string {
			const tag = element.tagName.toLowerCase();
			const attrs: string[] = [];
			for (const attribute of Array.from(element.attributes)) {
				if (STRIP.has(attribute.name)) {
					continue;
				}
				const value = normAttr(element, attribute.name, attribute.value);
				if (attribute.name === 'class' && value === '') {
					continue;
				}
				attrs.push(`${attribute.name}="${value}"`);
			}
			attrs.sort();
			const open = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
			const children: string[] = [];
			for (const node of Array.from(element.childNodes)) {
				if (node.nodeType === 1) {
					if (isProviderArtifact(node as Element)) {
						continue;
					}
					children.push(canonicalize(node as Element));
					continue;
				}
				if (node.nodeType === 3) {
					const text = (node.textContent || '').replace(/\s+/gu, ' ').trim();
					if (text) {
						children.push(text);
					}
				}
			}
			return `${open}${children.join('')}</${tag}>`;
		};

		return canonicalize(target);
	});
};
