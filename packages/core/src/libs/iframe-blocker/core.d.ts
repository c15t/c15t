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
import type { IframeBlocker, IframeBlockerConfig } from './types';
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
export declare function createIframeBlocker(
	config?: IframeBlockerConfig,
	initialConsents?: ConsentState
): IframeBlocker;
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
export declare function getIframeConsentCategories(): AllConsentNames[];
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
export declare function processAllIframes(consents: ConsentState): void;
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
export declare function setupIframeObserver(
	getConsents: () => ConsentState,
	onCategoriesDiscovered?: (categories: AllConsentNames[]) => void
): MutationObserver;
