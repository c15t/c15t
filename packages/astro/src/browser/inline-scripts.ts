/**
 * Consent gating for scripts already present in the HTML.
 *
 * Astro renders a lot of third-party embeds inline, and the core script
 * loader only knows about scripts declared in configuration. This scanner
 * covers the other half: mark a tag as inert and label it, and it runs the
 * moment consent allows it.
 *
 * ```astro
 * <script data-c15t-category="measurement" is:inline type="text/plain">
 *   console.log('only with measurement consent');
 * </script>
 * ```
 *
 * `is:inline` matters: without it Astro hoists the tag into a bundled
 * module and runs it regardless of consent.
 *
 * `data-c15t-category` accepts one category name. The tag is left alone
 * until consent is granted, then replaced by a live `<script>` in the same
 * position. Add `data-c15t-vendor` with a vendor id to also wait until the
 * visitor has not turned that vendor off. Revoking consent does not un-run a script that already
 * executed, so the element is marked and skipped instead.
 *
 * Under a nonce-based Content Security Policy, put the page's nonce on the
 * tag (`nonce={Astro.locals.c15t.nonce}`). Activation creates a new
 * script, which a policy with `'strict-dynamic'` runs without checking a
 * nonce, so a tag injected into the page would otherwise run once its
 * category is granted. With a page nonce, tags without it are skipped.
 */

import { allConsentNames, has, isVendorDenied } from '@c15t/core';
import type { AllConsentNames, ConsentSnapshot } from '@c15t/core';

/** Attribute that marks a script for consent gating. */
export const CATEGORY_ATTRIBUTE = 'data-c15t-category';

/**
 * Attribute naming the vendor a gated script belongs to. The script runs
 * once its category is allowed and the visitor has not turned the vendor
 * off. Only read alongside {@link CATEGORY_ATTRIBUTE}.
 */
export const VENDOR_ATTRIBUTE = 'data-c15t-vendor';

/**
 * Set once a gated script has been activated (`true`), rejected for an
 * unknown category (`invalid`), or refused for lacking the page nonce
 * (`untrusted`).
 */
export const ACTIVATED_ATTRIBUTE = 'data-c15t-activated';

/**
 * Whether an inert tag is the page's own under its nonce.
 *
 * Without a page nonce every tag qualifies, as before. With one, only tags
 * carrying it do. The property is compared because browsers hide a
 * connected element's nonce attribute. A refused tag is marked, so it is
 * reported once and never retried.
 *
 * @param element - The inert tag.
 * @param nonce - The page's CSP nonce.
 * @returns Whether the tag may be activated.
 */
const isTrusted = function isTrusted(
	element: HTMLScriptElement,
	nonce: string | undefined
): boolean {
	if (!nonce || element.nonce === nonce) {
		return true;
	}
	// biome-ignore lint/suspicious/noConsole: security diagnostic for the page author.
	console.warn(
		`@c15t/astro: skipped a ${CATEGORY_ATTRIBUTE} script without the page's CSP nonce. Add nonce={Astro.locals.c15t.nonce} to your own gated tags.`,
		element
	);
	element.setAttribute(ACTIVATED_ATTRIBUTE, 'untrusted');
	return false;
};

const COPIED_ATTRIBUTES = [
	'src',
	'async',
	'defer',
	'crossorigin',
	'integrity',
	'referrerpolicy',
	'id',
];

const activate = function activate(
	element: HTMLScriptElement,
	pageNonce: string | undefined
): void {
	const replacement = document.createElement('script');
	for (const name of COPIED_ATTRIBUTES) {
		const value = element.getAttribute(name);
		if (value !== null) {
			replacement.setAttribute(name, value);
		}
	}
	// Through the property: browsers hide a checked nonce attribute's value,
	// so copying the attribute would hand the replacement an empty nonce.
	// Under a page nonce the tag already carries that same nonce.
	const nonce = pageNonce ?? (element.nonce || element.getAttribute('nonce'));
	if (nonce) {
		replacement.nonce = nonce;
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
 * @param nonce - The page's CSP nonce. When set, only tags carrying it are
 * activated; the others are marked `untrusted` and skipped.
 * @returns The number of scripts activated by this pass.
 */
export const activateGatedScripts = function activateGatedScripts(
	snapshot: ConsentSnapshot,
	root: ParentNode = document,
	nonce?: string
): number {
	const selector = `script[${CATEGORY_ATTRIBUTE}]:not([${ACTIVATED_ATTRIBUTE}])`;
	const elements = Array.from(
		root.querySelectorAll<HTMLScriptElement>(selector)
	);
	let activated = 0;
	for (const element of elements) {
		if (!isTrusted(element, nonce)) {
			continue;
		}
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
		const vendor = element.getAttribute(VENDOR_ATTRIBUTE);
		// Vendor denials are inert under an IAB policy, as at every other gate.
		const vendorOff =
			Boolean(vendor) &&
			snapshot.model !== 'iab' &&
			isVendorDenied(snapshot, vendor as string);
		const allowed =
			!vendorOff &&
			has(category as AllConsentNames, snapshot.effectivePermissions);
		if (!allowed) {
			continue;
		}
		activate(element, nonce);
		activated += 1;
	}
	return activated;
};
