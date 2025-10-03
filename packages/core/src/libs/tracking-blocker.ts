/**
 * @packageDocumentation
 * Implements automatic blocking of tracking scripts and network requests until user consent is granted.
 *
 * IMPORTANT: This module overrides global `fetch` and `XMLHttpRequest` APIs to enforce consent requirements.
 * While this approach is necessary for proper consent management, it may conflict with other libraries that
 * also modify these APIs. This implementation takes precedence to ensure compliance.
 */

import type { AllConsentNames, ConsentState } from '../types';
import DEFAULT_DOMAIN_CONSENT_MAP from './tracking-domains';

/**
 * Configuration options for the tracking blocker
 * @deprecated This is deprecated and will be removed in the next major version. Use the new [ScriptLoader](https://c15t.com/docs/react/script-loader) instead.
 */
export interface TrackingBlockerConfig {
	/** Whether to disable automatic blocking (defaults to false) */
	disableAutomaticBlocking?: boolean;

	/** Override the default domain consent map */
	overrideDomainConsentMap?: boolean;

	/** Map of domains to their required consent types */
	domainConsentMap?: Record<string, AllConsentNames>;
}

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

interface TrackingBlocker {
	/**
	 * Updates the consents
	 * @deprecated This method is deprecated and will be removed in the next major version. Use [ScriptLoader](https://c15t.com/docs/react/script-loader) instead.
	 */
	updateConsents: (newConsents: Partial<ConsentState>) => void;
	destroy: () => void;
}

/**
 * Regex pattern to remove 'www.' prefix from domain
 */
const WWW_PREFIX_REGEX = /^www\./;

/**
 * Regex pattern to remove port numbers from domain
 */
const PORT_NUMBER_REGEX = /:\d+$/;

/**
 * Creates a tracking blocker instance that handles blocking of tracking scripts and network requests
 * @deprecated This function is deprecated and will be removed in the next major version. Use [ScriptLoader](https://c15t.com/docs/react/script-loader) instead.
 */
export function createTrackingBlocker(
	config: TrackingBlockerConfig = {},
	initialConsents?: ConsentState
): TrackingBlocker {
	const blockerConfig = {
		disableAutomaticBlocking: false,
		...config,
		domainConsentMap: config.overrideDomainConsentMap
			? config.domainConsentMap
			: { ...DEFAULT_DOMAIN_CONSENT_MAP, ...config.domainConsentMap },
	};

	let consents = initialConsents || createDefaultConsentState();
	const originalFetch = window.fetch;
	const originalXHR = window.XMLHttpRequest;

	/**
	 * Normalize a domain by removing 'www.' prefix and ensuring consistent format
	 */
	function normalizeDomain(domain: string): string {
		return domain
			.toLowerCase()
			.replace(WWW_PREFIX_REGEX, '')
			.replace(PORT_NUMBER_REGEX, '') // Remove port numbers
			.trim();
	}

	/**
	 * Check if a domain matches any entry in the domain map, including subdomains
	 */
	function findMatchingDomain(
		domain: string,
		domainMap: Record<string, AllConsentNames>
	): AllConsentNames | undefined {
		const normalizedDomain = normalizeDomain(domain);

		// First try exact match
		const directMatch = domainMap[normalizedDomain];
		if (directMatch) {
			return directMatch;
		}

		// Then try matching as a subdomain
		for (const [mapDomain, consent] of Object.entries(domainMap)) {
			const normalizedMapDomain = normalizeDomain(mapDomain);
			if (
				normalizedDomain.endsWith(`.${normalizedMapDomain}`) ||
				normalizedDomain === normalizedMapDomain
			) {
				return consent;
			}
		}

		return undefined;
	}

	/**
	 * Check if a URL requires consent and if that consent has been granted
	 */
	function isRequestAllowed(url: string): boolean {
		try {
			const domain = new URL(url).hostname;
			const requiredConsent = findMatchingDomain(
				domain,
				blockerConfig.domainConsentMap || {}
			);

			if (!requiredConsent) {
				return true;
			}

			const isAllowed = consents[requiredConsent] === true;
			return isAllowed;
		} catch {
			return true;
		}
	}

	/**
	 * Dispatch an event when a request is blocked due to missing consent
	 */
	function dispatchConsentBlockedEvent(url: string): void {
		document.dispatchEvent(
			new CustomEvent('ConsentBlockedRequest', { detail: { url } })
		);
	}

	/**
	 * Intercept and potentially block network requests
	 */
	function interceptNetworkRequests(): void {
		// Override fetch only if it hasn't been modified by another script
		if (window.fetch === originalFetch) {
			window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = input instanceof Request ? input.url : input.toString();
				if (!isRequestAllowed(url)) {
					dispatchConsentBlockedEvent(url);
					return Promise.reject(
						new Error(`Request to ${url} blocked due to missing consent`)
					);
				}

				return await originalFetch.call(window, input, init);
			};
		}

		// Override XMLHttpRequest only if it hasn't been modified
		if (window.XMLHttpRequest === originalXHR) {
			window.XMLHttpRequest = class extends originalXHR {
				override open(
					method: string,
					url: string | URL,
					async = true,
					username?: string,
					password?: string
				) {
					if (!isRequestAllowed(url.toString())) {
						dispatchConsentBlockedEvent(url.toString());
						throw new Error(`Request to ${url} blocked due to missing consent`);
					}

					super.open(method, url, async, username, password);
				}
			};
		}
	}

	/**
	 * Safe restoration of fetch and XHR
	 */
	function restoreOriginalRequests(): void {
		// Restore fetch if it has been overridden
		if (window.fetch !== originalFetch) {
			window.fetch = originalFetch;
		}

		if (window.XMLHttpRequest !== originalXHR) {
			window.XMLHttpRequest = originalXHR;
		}
	}

	// Initialize if automatic blocking is enabled
	if (!blockerConfig.disableAutomaticBlocking) {
		interceptNetworkRequests();
	}

	return {
		updateConsents: (newConsents: Partial<ConsentState>) => {
			consents = { ...consents, ...newConsents };
		},
		destroy: () => {
			restoreOriginalRequests();
		},
	};
}
