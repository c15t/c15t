import type { ConsentState } from '../../types';
import type { AllConsentNames } from '../../types/gdpr';
import type { HasCondition } from '../has';

/**
 * Represents a single domain rule for the network blocker.
 *
 * @public
 */
export interface NetworkBlockerRule {
	/**
	 * Optional identifier for the rule.
	 * Useful for debugging and logging.
	 */
	id?: string;

	/**
	 * Domain that this rule applies to.
	 *
	 * @remarks
	 * The rule matches when the request hostname is equal to the domain
	 * or is a subdomain of it.
	 *
	 * @example
	 * If the domain is "google-analytics.com", then requests to:
	 * - "google-analytics.com"
	 * - "www.google-analytics.com"
	 * - "stats.google-analytics.com"
	 * will all match.
	 */
	domain: string;

	/**
	 * Optional path substring that must be present in the request path
	 * for the rule to apply.
	 *
	 * @example
	 * A rule with:
	 * - domain: "google-analytics.com"
	 * - pathIncludes: "/collect"
	 *
	 * will only match URLs like:
	 * - "https://www.google-analytics.com/collect"
	 * - "https://google-analytics.com/r/collect?v=1"
	 */
	pathIncludes?: string;

	/**
	 * Optional list of HTTP methods that this rule applies to.
	 * If omitted, the rule applies to all methods.
	 *
	 * @example
	 * methods: ["POST", "PUT"]
	 */
	methods?: string[];

	/**
	 * Consent condition that must be satisfied to allow the request.
	 * When this condition is not satisfied, matching requests will be blocked.
	 *
	 * @example
	 * Block Google Analytics if "marketing" consent is not granted:
	 * ```ts
	 * {
	 *   domain: "google-analytics.com",
	 *   category: "marketing"
	 * }
	 * ```
	 */
	category: HasCondition<AllConsentNames>;
}

/**
 * Information about a blocked network request.
 *
 * @public
 */
export interface BlockedRequestInfo {
	/** The HTTP method of the blocked request (e.g. GET, POST). */
	method: string;

	/** The URL of the blocked request. */
	url: string;

	/**
	 * The rule that caused the request to be blocked, if available.
	 * Can be undefined when the blocker configuration changed between
	 * evaluation and logging.
	 */
	rule?: NetworkBlockerRule;
}

/**
 * Configuration for the network request blocker.
 *
 * @public
 */
export interface NetworkBlockerConfig {
	/**
	 * Whether the network blocker is enabled.
	 *
	 * @remarks
	 * When omitted, the blocker is considered enabled. Set this to `false`
	 * explicitly to disable blocking while keeping the configuration.
	 */
	enabled?: boolean;

	/**
	 * The consent state snapshot that is currently used for blocking logic.
	 *
	 * @remarks
	 * This allows the blocker to use a slightly stale consent snapshot so that
	 * script teardown callbacks can finish before stricter blocking is applied.
	 */
	initialConsents?: ConsentState;

	/**
	 * Whether to automatically log blocked requests to the console.
	 *
	 * @remarks
	 * When enabled (default), each blocked request will produce a
	 * `console.warn` entry including method, URL and rule identifier.
	 */
	logBlockedRequests?: boolean;

	/**
	 * Callback invoked whenever a request is blocked.
	 *
	 * @remarks
	 * This callback is called for both `fetch` and `XMLHttpRequest` requests.
	 * It is invoked immediately after the decision to block the request.
	 */
	onRequestBlocked?: (info: BlockedRequestInfo) => void;

	/**
	 * Domain rules that determine which requests should be blocked.
	 */
	rules: NetworkBlockerRule[];
}
