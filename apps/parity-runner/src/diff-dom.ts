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
		// oxlint-disable-next-line prefer-named-capture-group -- This code supports pre-ES2018 declaration targets.
		const CSS_MODULE = /^_([^_]+)_[^_]+_\d+$/u;
		// oxlint-disable-next-line prefer-named-capture-group -- This code supports pre-ES2018 declaration targets.
		const SVELTE_CSS_MODULE = /^c15t-ui-(.+)-[A-Za-z0-9_]+$/u;
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

		const isDialogMetadata = (attribute: Attr): boolean => {
			switch (attribute.name) {
				case 'role':
				case 'dir':
				case 'open':
					return true;
				case 'data-slot':
					return attribute.value === 'dialog-content';
				case 'data-state':
					return ['open', 'closed'].includes(attribute.value);
				case 'data-mode':
					return attribute.value === 'dialog';
				case 'id':
					return attribute.value.startsWith('c15t-dialog-content-');
				default:
					return false;
			}
		};
		const dialogChildren = (element: Element): ChildNode[] => {
			let childNodes = Array.from(element.childNodes);
			const container = element.firstElementChild;
			if (
				container &&
				element.children.length === 1 &&
				Array.from(element.childNodes).every(
					(node) =>
						node === container ||
						node.nodeType === 8 ||
						(node.nodeType === 3 && !node.textContent?.trim())
				) &&
				container.tagName === 'DIV' &&
				container.attributes.length === 1 &&
				container.hasAttribute('class') &&
				stripClasses(container.className)
					.split(' ')
					.every((name) => ['container', 'contentVisible'].includes(name)) &&
				stripClasses(container.className).split(' ').includes('container')
			) {
				childNodes = Array.from(container.childNodes);
			}
			return childNodes;
		};

		const captureAttributes = (
			element: Element,
			originalTag: string,
			tag: string,
			heading: boolean,
			dialog: boolean
		): string[] => {
			const attrs: string[] = heading
				? [`role="heading"`, `aria-level="${originalTag.slice(1)}"`]
				: [];
			// SVG intrinsic size and CSS size are equivalent only when their rendered
			// bounds agree. Keep path/viewBox/stroke and every other attribute intact.
			if (dialog) {
				attrs.push(
					'role="dialog"',
					`dir="${getComputedStyle(element).direction}"`
				);
			}
			if (tag === 'svg') {
				const bounds = element.getBoundingClientRect();
				attrs.push(
					`data-parity-width="${bounds.width}"`,
					`data-parity-height="${bounds.height}"`
				);
			}
			for (const attribute of Array.from(element.attributes)) {
				if (
					STRIP.has(attribute.name) ||
					(tag === 'svg' &&
						['xmlns', 'width', 'height'].includes(attribute.name))
				) {
					continue;
				}
				// Native dialog and framework Content/Positioner split have distinct
				// plumbing. Actual modal/name/description/focus/visibility and shell/card
				// geometry are independently compared by dialog-evidence. Unknown
				// attributes/classes and substantive wrappers remain in this snapshot.
				if (dialog && isDialogMetadata(attribute)) {
					continue;
				}
				let value = normAttr(element, attribute.name, attribute.value);
				if (dialog && attribute.name === 'class') {
					value = [
						'root',
						...value
							.split(' ')
							.filter(
								(name) =>
									![
										'root',
										'container',
										'dialogVisible',
										'contentVisible',
									].includes(name)
							),
					]
						.sort()
						.join(' ');
				}
				if (attribute.name === 'class' && value === '') {
					continue;
				}
				attrs.push(`${attribute.name}="${value}"`);
			}
			attrs.sort();
			return attrs;
		};

		const canonicalize = function canonicalize(element: Element): string {
			const originalTag = element.tagName.toLowerCase();
			const testId = element.getAttribute('data-testid');
			const dialog =
				testId === 'consent-dialog-root' &&
				(originalTag === 'dialog' || element.getAttribute('role') === 'dialog');
			const heading =
				/^h[1-6]$/u.test(originalTag) && !element.hasAttribute('role');
			const tag = heading || dialog ? 'div' : originalTag;
			const attrs = captureAttributes(
				element,
				originalTag,
				tag,
				heading,
				dialog
			);
			const open = `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
			const children: string[] = [];
			const childNodes = dialog
				? dialogChildren(element)
				: Array.from(element.childNodes);
			for (const node of childNodes) {
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

		// Portal location is framework-specific; compare every tagged UI root,
		// including its complete descendant tree, in stable root order.
		const roots = Array.from(target.querySelectorAll('[data-testid]'))
			.filter((element) => !element.parentElement?.closest('[data-testid]'))
			.sort((left, right) =>
				(left.getAttribute('data-testid') ?? '').localeCompare(
					right.getAttribute('data-testid') ?? ''
				)
			);
		return roots.map(canonicalize).join('');
	});
};
