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
import { allConsentNames } from '../../types/gdpr';
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
 * @returns The required consent type or undefined if no consent is required
 *
 * @throws {Error} When the category attribute contains an invalid consent name
 */
function determineRequiredConsent(
	iframe: HTMLIFrameElement
): AllConsentNames | undefined {
	const categoryAttr = iframe.getAttribute('data-category');

	if (!categoryAttr) {
		// No category attribute means no consent required
		return undefined;
	}

	// Validate that it's a valid consent name
	if (!allConsentNames.includes(categoryAttr as AllConsentNames)) {
		throw new Error(
			`Invalid category attribute "${categoryAttr}" on iframe. Must be one of: ${allConsentNames.join(', ')}`
		);
	}

	return categoryAttr as AllConsentNames;
}

/**
 * Process a single iframe element based on consent settings
 *
 * @param iframe - The iframe element to process
 * @param consents - Current consent state
 * @throws {Error} When the iframe has an invalid category attribute
 */
function processIframeElement(
	iframe: HTMLIFrameElement,
	consents: ConsentState
): void {
	const dataSrc = iframe.getAttribute('data-src');
	const requiredConsent = determineRequiredConsent(iframe);

	// If no consent is required, allow the iframe to load normally
	if (!requiredConsent) {
		return;
	}

	const hasConsent = has(requiredConsent, consents);

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
					if (node.nodeType === Node.ELEMENT_NODE) {
						const element = node as Element;

						// Check if the added node is an iframe
						if (element.tagName && element.tagName.toUpperCase() === 'IFRAME') {
							processIframeElement(element as HTMLIFrameElement, consents);
						}

						// Check if the added node contains iframes
						const iframes = element.querySelectorAll?.('iframe');
						if (iframes) {
							iframes.forEach((iframe) => {
								processIframeElement(iframe, consents);
							});
						}
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
