import { allConsentNames, evaluateConsent } from '@c15t/core';
import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

/** Attribute that names the category an inert `<script>` waits on. */
export const CATEGORY_ATTRIBUTE = 'data-c15t-category';

/** Set once a gated script has been activated (or rejected as invalid). */
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
	// A script element that has already been parsed never executes, whatever
	// its `type` is changed to; only a fresh element does.
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
 * Run every inert `<script type="text/plain" data-c15t-category="…">` whose
 * category the snapshot grants.
 *
 * The same contract `@c15t/astro` uses, so a tag written for one works in
 * the other. Each script runs at most once; withdrawing consent afterwards
 * requires vendor cleanup or a page reload.
 *
 * @param snapshot - The kernel snapshot.
 * @param root - Where to look. Defaults to the document.
 * @returns How many scripts were activated.
 */
export const activateGatedScripts = function activateGatedScripts(
	snapshot: ConsentSnapshot,
	root: ParentNode = document
): number {
	const selector = `script[type="text/plain"][${CATEGORY_ATTRIBUTE}]:not([${ACTIVATED_ATTRIBUTE}])`;
	let activated = 0;
	for (const element of root.querySelectorAll<HTMLScriptElement>(selector)) {
		const category = element.getAttribute(CATEGORY_ATTRIBUTE);
		if (!category) {
			continue;
		}
		if (!allConsentNames.includes(category as AllConsentNames)) {
			// A typo here would otherwise keep the script inert forever, which
			// reads as "the integration is broken".
			// oxlint-disable-next-line no-console -- Authoring-time diagnostic.
			console.warn(
				`@c15t/browser: unknown ${CATEGORY_ATTRIBUTE} "${category}". Expected one of ${allConsentNames.join(', ')}.`
			);
			element.setAttribute(ACTIVATED_ATTRIBUTE, 'invalid');
			continue;
		}
		const allowed = evaluateConsent(
			{ category: category as AllConsentNames },
			snapshot
		);
		if (!allowed) {
			continue;
		}
		activate(element);
		activated += 1;
	}
	return activated;
};
