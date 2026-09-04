/**
 * Consent gating for scripts already present in the HTML.
 *
 * Astro renders a lot of third-party embeds inline, and the core script
 * loader only knows about scripts declared in configuration. This scanner
 * covers the other half: mark a tag as inert and label it, and it runs the
 * moment consent allows it.
 *
 * ```html
 * <script type="text/plain" data-c15t-category="measurement">
 *   console.log('only with measurement consent');
 * </script>
 * ```
 *
 * `data-c15t-category` accepts one category name. The tag is left alone
 * until consent is granted, then replaced by a live `<script>` in the same
 * position. Revoking consent does not un-run a script that already
 * executed, so the element is marked and skipped instead.
 */

import { allConsentNames, has } from '@c15t/core';
import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

/** Attribute that marks a script for consent gating. */
export const CATEGORY_ATTRIBUTE = 'data-c15t-category';

/** Attribute stamped on a gated script once it has been activated. */
export const ACTIVATED_ATTRIBUTE = 'data-c15t-activated';

const COPIED_ATTRIBUTES = [
	'src',
	'async',
	'defer',
	'crossorigin',
	'integrity',
	'referrerpolicy',
	'nonce',
	'id',
];

const activate = function activate(element: HTMLScriptElement): void {
	const replacement = document.createElement('script');
	for (const name of COPIED_ATTRIBUTES) {
		const value = element.getAttribute(name);
		if (value !== null) {
			replacement.setAttribute(name, value);
		}
	}
	for (const attribute of Array.from(element.attributes)) {
		if (
			attribute.name.startsWith('data-') &&
			attribute.name !== ACTIVATED_ATTRIBUTE
		) {
			replacement.setAttribute(attribute.name, attribute.value);
		}
	}
	replacement.setAttribute(ACTIVATED_ATTRIBUTE, 'true');
	if (!element.hasAttribute('src')) {
		replacement.textContent = element.textContent;
	}
	element.setAttribute(ACTIVATED_ATTRIBUTE, 'true');
	element.parentNode?.insertBefore(replacement, element.nextSibling);
	element.remove();
};

/**
 * Activate every gated script the current consent state allows.
 *
 * Safe to call repeatedly — activated scripts are stamped and skipped, so
 * re-running it after a ClientRouter navigation only picks up new tags.
 *
 * @param snapshot - The current kernel snapshot.
 * @param root - Where to scan. Defaults to the whole document.
 * @returns The number of scripts activated by this pass.
 */
export const activateGatedScripts = function activateGatedScripts(
	snapshot: ConsentSnapshot,
	root: ParentNode = document
): number {
	const selector = `script[${CATEGORY_ATTRIBUTE}]:not([${ACTIVATED_ATTRIBUTE}])`;
	const elements = Array.from(
		root.querySelectorAll<HTMLScriptElement>(selector)
	);
	let activated = 0;
	for (const element of elements) {
		const category = element.getAttribute(CATEGORY_ATTRIBUTE);
		if (!category) {
			continue;
		}
		if (!allConsentNames.includes(category as AllConsentNames)) {
			// A typo here would otherwise silently keep the script inert
			// forever, which reads as "the integration is broken".
			// biome-ignore lint/suspicious/noConsole: authoring-time diagnostic.
			console.warn(
				`@c15t/astro: unknown ${CATEGORY_ATTRIBUTE} "${category}". Expected one of ${allConsentNames.join(', ')}.`
			);
			element.setAttribute(ACTIVATED_ATTRIBUTE, 'invalid');
			continue;
		}
		const allowed = has(category as AllConsentNames, snapshot.consents, {
			policyCategories: snapshot.policyCategories as string[] | null,
			policyScopeMode: snapshot.policyScopeMode,
		});
		if (!allowed) {
			continue;
		}
		activate(element);
		activated += 1;
	}
	return activated;
};
