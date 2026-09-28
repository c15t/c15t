/**
 * @packageDocumentation
 * Implements automatic blocking of iframes until user consent is granted.
 *
 * This module processes existing iframe elements on the page and manages their loading
 * based on consent settings. It supports both lazy loading (data-src) and immediate
 * loading (src) patterns.
 *
 * The iframe blocker only checks for the `category` data attribute on iframe elements.
 * Iframes without a category attribute are always allowed to load.
 *
 * This is a headless implementation that does not render any DOM elements.
 * It only manages the src/data-src attributes of existing iframe elements.
 */

import type { AllConsentNames, ConsentState } from '../../types';
import { allConsentNames } from '../../types/consent-types';
import { has } from '../has';
import type { IframeBlocker, IframeBlockerConfig } from './types';

/**
 * Create default consent state with all consents set to their default values
 */
function createDefaultConsentState(): ConsentState {
	return {
		experience: false,
		functionality: false,
		marketing: false,
		measurement: false,
		necessary: true,
	};
}

/**
 * Determine the required consent for an iframe based on its category attribute
 *
 * @param iframe - The iframe element to check
 * @returns The required consent type, `undefined` if no consent is required,
 * or `null` if the category attribute names no known consent category
 */
function determineRequiredConsent(
	iframe: HTMLIFrameElement
): AllConsentNames | null | undefined {
	const categoryAttr = iframe.getAttribute('data-category');

	if (!categoryAttr) {
		// No category attribute means no consent required
		return undefined;
	}

	// Validate that it's a valid consent name
	if (!allConsentNames.includes(categoryAttr as AllConsentNames)) {
		return null;
	}

	return categoryAttr as AllConsentNames;
}

/**
 * Process a single iframe element based on consent settings
 *
 * An iframe whose category attribute names no known consent category stays
 * blocked and is reported with a warning. Throwing here used to stop every
 * other iframe in the pass from being blocked.
 *
 * @param iframe - The iframe element to process
 * @param consents - Current consent state
 */
function processIframeElement(
	iframe: HTMLIFrameElement,
	consents: ConsentState
): void {
	const dataSrc = iframe.getAttribute('data-src');
	const requiredConsent = determineRequiredConsent(iframe);

	// If no consent is required, allow the iframe to load normally
	if (requiredConsent === undefined) {
		return;
	}

	if (requiredConsent === null) {
		console.warn(
			`[c15t] iframe-blocker: invalid data-category "${iframe.getAttribute(
				'data-category'
			)}". Must be one of: ${allConsentNames.join(', ')}. The iframe stays blocked.`
		);
	}

	const hasConsent = requiredConsent !== null && has(requiredConsent, consents);

	// If iframe has consent, load it
	if (hasConsent) {
		// If there's a data-src attribute, move it to src
		if (dataSrc && !iframe.src) {
			iframe.src = dataSrc;
			iframe.removeAttribute('data-src');
		}
	} else {
		// If iframe doesn't have consent, block it
		if (iframe.src) {
			iframe.removeAttribute('src');
		}
	}
}

/**
 * Collect the iframes in a node added to the DOM: the node itself if it is
 * an iframe, plus any iframes inside it.
 *
 * Some browsers throw when page script reads a node it has no access to,
 * such as one inserted by an extension (Firefox raises "Permission denied to
 * access property"). Such a node is skipped rather than aborting the whole
 * mutation batch.
 *
 * @param node - A node from `MutationRecord.addedNodes`
 * @returns The iframes found, or the ones found before the node became unreadable
 */
function getAddedIframes(node: Node): HTMLIFrameElement[] {
	const iframes: HTMLIFrameElement[] = [];

	try {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return iframes;
		}

		const element = node as Element;

		if (element.tagName && element.tagName.toUpperCase() === 'IFRAME') {
			iframes.push(element as HTMLIFrameElement);
		}

		element.querySelectorAll?.('iframe').forEach((iframe) => {
			iframes.push(iframe);
		});
	} catch {
		// The node can't be read by page script, so it can't be managed either.
	}

	return iframes;
}

/**
 * Creates an iframe blocker instance that handles blocking of iframes based on consent
 *
 * @param config - Configuration options for the iframe blocker
 * @param initialConsents - Initial consent state (optional)
 * @returns Iframe blocker instance with management methods
 *
 * @example
 * ```ts
 * const blocker = createIframeBlocker({
 *   disableAutomaticBlocking: false
 * });
 *
 * // Update consents
 * blocker.updateConsents({ marketing: true });
 *
 * // Clean up
 * blocker.destroy();
 * ```
 */
export function createIframeBlocker(
	config: IframeBlockerConfig = {},
	initialConsents?: ConsentState
): IframeBlocker {
	const blockerConfig: Required<IframeBlockerConfig> = {
		disableAutomaticBlocking: false,
		...config,
	};

	let consents = initialConsents || createDefaultConsentState();

	/**
	 * Process all iframes on the page
	 */
	function processIframes(): void {
		const iframes = document.querySelectorAll('iframe');

		iframes.forEach((iframe) => {
			processIframeElement(iframe, consents);
		});
	}

	/**
	 * Set up mutation observer to handle dynamically added iframes
	 */
	function setupMutationObserver(): MutationObserver {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					for (const iframe of getAddedIframes(node)) {
						processIframeElement(iframe, consents);
					}
				});
			});
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		return observer;
	}

	let mutationObserver: MutationObserver | null = null;

	// Initialize if automatic blocking is enabled
	if (!blockerConfig.disableAutomaticBlocking) {
		// Process existing iframes
		processIframes();

		// Set up observer for dynamically added iframes
		mutationObserver = setupMutationObserver();
	}

	return {
		updateConsents: (newConsents: Partial<ConsentState>) => {
			consents = { ...consents, ...newConsents };

			// Process all iframes with updated consent state
			processIframes();
		},
		processIframes,
		destroy: () => {
			if (mutationObserver) {
				mutationObserver.disconnect();
				mutationObserver = null;
			}
		},
	};
}

/**
 * Extracts consent categories from all iframes with data-category attributes on the page.
 * Returns an array of unique category names found in iframes.
 *
 * @returns Array of consent category names found in iframes
 *
 * @example
 * ```typescript
 * // <iframe data-category="marketing" />
 * // <iframe data-category="measurement" />
 * const categories = getIframeConsentCategories();
 * // Returns: ['marketing', 'measurement']
 * ```
 */
export function getIframeConsentCategories(): AllConsentNames[] {
	if (typeof document === 'undefined') {
		return [];
	}

	const iframes = document.querySelectorAll('iframe[data-category]');
	const categories = new Set<AllConsentNames>();

	// Guard against null/undefined querySelectorAll result
	if (!iframes) {
		return [];
	}

	iframes.forEach((iframe) => {
		const categoryAttr = iframe.getAttribute('data-category');

		if (!categoryAttr) {
			return;
		}

		// Parse category - handle both single categories and complex conditions
		// For now, extract simple category names (like script loader does)
		const category = categoryAttr.trim();

		// Check if it's a valid consent name
		if (allConsentNames.includes(category as AllConsentNames)) {
			categories.add(category as AllConsentNames);
		}
	});

	return Array.from(categories);
}

/**
 * Processes all iframes on the page based on current consent state.
 * This is a pure function following the script loader pattern.
 *
 * @param consents - Current consent state
 *
 * @example
 * ```typescript
 * // Process all iframes with current consents
 * processAllIframes({ marketing: true, necessary: true });
 *
 * // After consent changes, process again
 * processAllIframes({ marketing: false, necessary: true });
 * ```
 */
export function processAllIframes(consents: ConsentState): void {
	if (typeof document === 'undefined') {
		return;
	}

	const iframes = document.querySelectorAll('iframe');

	// Guard against null/undefined querySelectorAll result
	if (!iframes) {
		return;
	}

	iframes.forEach((iframe) => {
		processIframeElement(iframe, consents);
	});
}

/**
 * Creates and starts a MutationObserver to watch for dynamically added iframes.
 * The observer will automatically process new iframes based on the provided consent getter.
 * It also triggers category discovery when new iframes with data-category are added.
 *
 * @param getConsents - Function to get current consent state
 * @param onCategoriesDiscovered - Optional callback when new categories are discovered
 * @returns The active MutationObserver instance
 *
 * @example
 * ```typescript
 * const observer = setupIframeObserver(
 *   () => store.getState().consents,
 *   (categories) => store.getState().updateConsentCategories(categories)
 * );
 *
 * // Later, clean up
 * observer.disconnect();
 * ```
 */
export function setupIframeObserver(
	getConsents: () => ConsentState,
	onCategoriesDiscovered?: (categories: AllConsentNames[]) => void
): MutationObserver {
	const observer = new MutationObserver((mutations) => {
		const currentConsents = getConsents();
		let hasNewCategories = false;

		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				for (const iframe of getAddedIframes(node)) {
					processIframeElement(iframe, currentConsents);
					// Check if iframe has a data-category attribute
					if (iframe.hasAttribute('data-category')) {
						hasNewCategories = true;
					}
				}
			});
		});

		// If new iframes with categories were added, trigger category discovery
		if (hasNewCategories && onCategoriesDiscovered) {
			const categories = getIframeConsentCategories();
			if (categories.length > 0) {
				onCategoriesDiscovered(categories);
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});

	return observer;
}
