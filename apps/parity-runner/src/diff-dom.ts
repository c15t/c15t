/**
 * Playwright-side DOM snapshot.
 *
 * We run the normalizer inside the page so we don't need a Node-side DOM
 * (jsdom/happy-dom) just to parse captured HTML. The normalizer source
 * is passed directly to Playwright so it still runs in the browser context.
 *
 * `selector` may match more than one element — a story showing a dialog
 * behind an overlay has two surfaces, and a story with a trigger and the
 * dialog it opens has two more. Each match is canonicalized and the
 * results are joined in document order.
 */

import type { Page } from '@playwright/test';

export const captureDomSnapshot = function captureDomSnapshot(
	page: Page,
	selector: string
): Promise<string> {
	return page.evaluate((scope: string) => {
		const SVELTE = /\bsvelte-[a-z0-9]+\b/gu;
		const S_SCOPED = /\bs-[a-z0-9]{6,}\b/gu;
		// oxlint-disable-next-line prefer-named-capture-group -- This code supports pre-ES2018 declaration targets.
		const CSS_MODULE = /^_([^_]+)_[^_]+_\d+$/u;
		// oxlint-disable-next-line prefer-named-capture-group -- This code supports pre-ES2018 declaration targets.
		const SVELTE_CSS_MODULE = /^c15t-ui-(.+)-[A-Za-z0-9]+$/u;
		const AUTO_ID = /^(?::r[0-9a-z]+:|radix-[a-z0-9-]+|ark-[a-z0-9-]+)$/u;
		// The branding link attributes the referral to the page's host,
		// which is whatever port a Storybook happens to be served on.
		const REFERRAL_HOST = /(?<prefix>[?&]ref=)[^&]*/u;
		const AUTO_ID_SUFFIX =
			/-(?:_r_[0-9a-z]+_|r[0-9a-z]+|c[0-9]+|v(?:-[0-9]+)+)$/u;
		// The same generated token, but in the middle of a composed id —
		// `c15t-tabs-{id}-content-purposes`. React's `useId`, Svelte's
		// `$props.id()` and Vue's `useId()` will never agree on the token,
		// and the surrounding structure is the part worth comparing.
		const AUTO_ID_SEGMENT =
			/-(?:_r_[0-9a-z]+_|r[0-9a-z]+|c[0-9]+|v(?:-[0-9]+)+)-/gu;
		const STRIP = new Set([
			'data-reactroot',
			'data-reactid',
			'data-parity-surface',
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
				const normalized =
					token.match(CSS_MODULE)?.[1] ??
					token.match(SVELTE_CSS_MODULE)?.[1] ??
					token;
				if (seen.has(normalized)) {
					continue;
				}
				seen.add(normalized);
				out.push(normalized);
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
				return value
					.replace(AUTO_ID_SEGMENT, '-__AUTO__-')
					.replace(AUTO_ID_SUFFIX, '-__AUTO__');
			}
			if (name === 'href') {
				return value.replace(REFERRAL_HOST, '$<prefix>__HOST__');
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

		const VALUE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

		const canonicalize = function canonicalize(element: Element): string {
			const tag = element.tagName.toLowerCase();
			const attrs: string[] = [];
			// React mirrors a controlled input's value into an attribute on
			// first render; Svelte and Vue only ever set the property. Read
			// the property on both sides so the comparison is of what the
			// control actually holds.
			if (VALUE_TAGS.has(element.tagName)) {
				attrs.push(
					`value="${(element as Element & { value?: string }).value ?? ''}"`
				);
			}
			for (const attribute of Array.from(element.attributes)) {
				if (STRIP.has(attribute.name)) {
					continue;
				}
				if (attribute.name === 'value' && VALUE_TAGS.has(element.tagName)) {
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
			// Adjacent text nodes are joined before normalising: JSX splits
			// `{label} ({count})` into four children where a Svelte or Vue
			// template compiles one, and "Examples(1)" against
			// "Examples (1)" is a rendering artefact, not drift.
			let pendingText = '';
			const flushText = function flushText() {
				const text = pendingText.replace(/\s+/gu, ' ').trim();
				if (text) {
					children.push(text);
				}
				pendingText = '';
			};
			for (const node of Array.from(element.childNodes)) {
				if (node.nodeType === 1) {
					if (isProviderArtifact(node as Element)) {
						continue;
					}
					flushText();
					children.push(canonicalize(node as Element));
					continue;
				}
				if (node.nodeType === 3) {
					pendingText += node.textContent || '';
				}
			}
			flushText();
			return `${open}${children.join('')}</${tag}>`;
		};

		return Array.from(document.querySelectorAll(scope))
			.map((target) => canonicalize(target))
			.join('');
	}, selector);
};
