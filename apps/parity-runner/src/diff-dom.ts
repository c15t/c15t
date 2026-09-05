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
				const references = value.split(/\s+/u).map((id) => {
					const referenceTarget =
						name === 'id' ? element : document.getElementById(id);
					const testId = referenceTarget?.getAttribute('data-testid');
					return testId ? `__ID_${testId}` : id;
				});
				if (references.join(' ') !== value) {
					return references.join(' ');
				}
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

		const effectiveDirection = (element: Element): boolean => {
			const id = element.getAttribute('data-testid') ?? '';
			return (
				['consent-banner-root', 'consent-widget-root'].includes(id) ||
				id.endsWith('-branding')
			);
		};
		const isSurfaceMetadata = (element: Element, attribute: Attr): boolean => {
			const id = element.getAttribute('data-testid') ?? '';
			if (
				id === 'consent-dialog-card' &&
				attribute.name === 'tabindex' &&
				attribute.value === '-1' &&
				element.closest('[data-testid="consent-dialog-root"]')
			) {
				return true;
			}
			if (attribute.name === 'dir' && effectiveDirection(element)) {
				return true;
			}
			if (attribute.name === 'data-context') {
				return ['banner', 'dialog'].some(
					(context) =>
						id.startsWith(`consent-${context}-`) && attribute.value === context
				);
			}
			if (id === 'consent-dialog-overlay') {
				return (
					(attribute.name === 'data-slot' &&
						attribute.value === 'dialog-backdrop') ||
					(attribute.name === 'data-state' && attribute.value === 'open')
				);
			}
			return false;
		};
		const switchClass = (element: Element, classes: string): string => {
			const control = element.closest('[role="switch"]');
			if (!control) {
				return classes;
			}
			const small =
				control.getAttribute('data-size') === 'small' ||
				stripClasses(control.className).split(' ').includes('root-small');
			const disabled = control.hasAttribute('disabled');
			return classes
				.split(' ')
				.filter(
					(name) =>
						!(
							small &&
							['root-small', 'track-small', 'thumb-small'].includes(name)
						) &&
						!(disabled && ['track-disabled', 'thumb-disabled'].includes(name))
				)
				.join(' ');
		};
		const surfaceClass = (element: Element, classes: string): string => {
			const id = element.getAttribute('data-testid');
			const ignored = (
				{
					'consent-banner-root': 'bannerVisible',
					'consent-dialog-overlay': 'overlayVisible',
				} as Record<string, string>
			)[id ?? ''];
			return switchClass(
				element,
				classes
					.split(' ')
					.filter((name) => name !== ignored)
					.join(' ')
			);
		};
		const brandingChildren = (element: Element): ChildNode[] => {
			const child = element.firstElementChild;
			if (
				element.children.length === 1 &&
				Array.from(element.childNodes).every(
					(node) =>
						node === child ||
						node.nodeType === 8 ||
						(node.nodeType === 3 && !node.textContent?.trim())
				) &&
				child?.tagName === 'SPAN' &&
				stripClasses(child.className) === 'brandingContent' &&
				child.getAttribute('data-slot') === 'tag-content' &&
				child.attributes.length === 2
			) {
				return Array.from(child.childNodes);
			}
			return Array.from(element.childNodes);
		};
		const comparisonChildren = (
			element: Element,
			dialog: boolean
		): ChildNode[] => {
			if (dialog) {
				return dialogChildren(element);
			}
			if (element.getAttribute('data-testid')?.endsWith('-branding')) {
				return brandingChildren(element);
			}
			return Array.from(element.childNodes);
		};
		const hiddenSvgMetadata = (element: Element, attribute: Attr): boolean =>
			element.tagName.toLowerCase() === 'svg' &&
			Boolean(element.closest('[aria-hidden="true"]')) &&
			(attribute.name === 'aria-labelledby' ||
				(attribute.name === 'class' && attribute.value === 'c15t-icon'));

		const needsSwitchSize = (element: Element): boolean =>
			element.getAttribute('role') === 'switch' &&
			!element.hasAttribute('data-size') &&
			stripClasses(element.className).split(' ').includes('root-small');

		const triggerClasses = (element: Element, value: string): string => {
			if (element.getAttribute('data-testid') !== 'consent-dialog-trigger') {
				return value;
			}
			return value
				.split(' ')
				.filter(
					(name) =>
						![
							'sm',
							'md',
							'lg',
							'topLeft',
							'topRight',
							'bottomLeft',
							'bottomRight',
						].includes(name)
				)
				.join(' ');
		};
		const triggerStyle = (element: Element, value: string): string => {
			if (element.getAttribute('data-testid') !== 'consent-dialog-trigger') {
				return value;
			}
			return value
				.split(';')
				.filter(
					(declaration) =>
						declaration !== 'transform:none' &&
						!/^(?:left|top|position|z-index):/u.test(declaration)
				)
				.join(';');
		};
		const triggerEvidence = (element: Element): string[] => {
			if (element.getAttribute('data-testid') !== 'consent-dialog-trigger') {
				return [];
			}
			const bounds = element.getBoundingClientRect();
			const size =
				element.getAttribute('data-size') ??
				stripClasses(element.className)
					.split(' ')
					.find((name) => ['sm', 'md', 'lg'].includes(name));
			return [
				`data-parity-trigger-bounds="${bounds.x},${bounds.y},${bounds.width},${bounds.height}"`,
				...(size ? [`data-size="${size}"`] : []),
			];
		};

		const ignoreAttribute = (
			element: Element,
			tag: string,
			attribute: Attr
		): boolean =>
			STRIP.has(attribute.name) ||
			(element.getAttribute('data-testid') === 'consent-dialog-trigger' &&
				attribute.name === 'data-size') ||
			isSurfaceMetadata(element, attribute) ||
			hiddenSvgMetadata(element, attribute) ||
			(tag === 'svg' &&
				[
					'xmlns',
					'width',
					'height',
					...(element.closest('[aria-hidden="true"]') ? ['aria-hidden'] : []),
				].includes(attribute.name));

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
				if (element.closest('[aria-hidden="true"]')) {
					attrs.push('aria-hidden="true"');
				}
				attrs.push(
					`data-parity-width="${bounds.width}"`,
					`data-parity-height="${bounds.height}"`,
					`data-parity-x="${bounds.x}"`,
					`data-parity-y="${bounds.y}"`
				);
			}
			if (effectiveDirection(element)) {
				attrs.push(`dir="${getComputedStyle(element).direction}"`);
			}
			if (needsSwitchSize(element)) {
				attrs.push('data-size="small"');
			}
			attrs.push(...triggerEvidence(element));
			if (element instanceof SVGElement) {
				const paint = getComputedStyle(element);
				attrs.push(
					`data-parity-paint="${paint.color};${paint.fill};${paint.stroke};${paint.strokeWidth};${paint.opacity};${paint.transform}"`
				);
			}
			for (const attribute of Array.from(element.attributes)) {
				if (ignoreAttribute(element, tag, attribute)) {
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
				if (attribute.name === 'class') {
					value = triggerClasses(element, surfaceClass(element, value));
				}
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
				if (attribute.name === 'style') {
					value = triggerStyle(element, value);
				}
				if (['class', 'style'].includes(attribute.name) && value === '') {
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
			const childNodes = comparisonChildren(element, dialog);
			for (const node of childNodes) {
				if (node.nodeType === 1) {
					if (
						isProviderArtifact(node as Element) ||
						(element.tagName.toLowerCase() === 'svg' &&
							Boolean(element.closest('[aria-hidden="true"]')) &&
							(node as Element).tagName.toLowerCase() === 'title')
					) {
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
