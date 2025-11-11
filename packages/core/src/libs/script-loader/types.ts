import type { ConsentState } from '../../types/compliance';
import type { AllConsentNames } from '../../types/gdpr';
import type { HasCondition } from '../has';

/**
 * Information passed to script callbacks
 *
 * @public
 */
export interface ScriptCallbackInfo {
	/** The original script ID */
	id: string;

	/** The actual DOM element ID used (anonymized if enabled) */
	elementId: string;

	/** Has consent  */
	hasConsent: boolean;

	/** The current consent state */
	consents: ConsentState;

	/**
	 * The script element (for load/error callbacks)
	 * Will be undefined for callback-only scripts
	 */
	element?: HTMLScriptElement;

	/** Error information (for error callbacks) */
	error?: Error;
}

/**
 * Represents a script to be loaded based on consent conditions.
 *
 * Scripts can be one of three types:
 * 1. Standard scripts - These load an external JavaScript file via a script tag
 * 2. Text-based scripts - These contain inline JavaScript code that gets executed directly
 * 3. Callback-only scripts - These don't add a script tag to the DOM but still execute callbacks
 *    based on consent state changes (useful for controlling existing libraries)
 *
 * @public
 */
export interface Script {
	/** Unique identifier for the script */
	id: string;

	/** URL of the script to load */
	src?: string;

	/** Inline JavaScript code to execute */
	textContent?: string;

	/** Consent category or condition required to load this script */
	category: HasCondition<AllConsentNames>;

	/**
	 * Whether this is a callback-only script that doesn't need to load an external resource.
	 * When true, no script tag will be added to the DOM, only callbacks will be executed.
	 *
	 * This is useful for:
	 * - Managing consent for libraries already loaded on the page
	 * - Enabling/disabling tracking features based on consent changes
	 * - Running custom code when consent status changes without loading external scripts
	 *
	 * Example use cases:
	 * - Enabling/disabling Posthog tracking
	 * - Configuring Google Analytics consent mode
	 * - Managing cookie consent for embedded content
	 *
	 * @default false
	 */
	callbackOnly?: boolean;

	/**
	 * Whether the script should persist after consent is revoked.
	 * @default false
	 */
	persistAfterConsentRevoked?: boolean;

	/**
	 * Whether the script should always load regardless of consent state.
	 *
	 * This is useful for scripts like Google Tag Manager or PostHog that manage
	 * their own consent state internally. The script will load immediately and
	 * never be unloaded based on consent changes.
	 *
	 * Note: When using this option, you are responsible for ensuring the script
	 * itself respects user consent preferences through its own consent management.
	 *
	 * @default false
	 *
	 * @example
	 * ```ts
	 * const gtmScript: Script = {
	 *   id: 'google-tag-manager',
	 *   src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXX',
	 *   category: 'measurement', // Category is still required but won't gate loading
	 *   alwaysLoad: true, // GTM will always load and manage its own consent
	 * };
	 * ```
	 */
	alwaysLoad?: boolean;

	/** Priority hint for browser resource loading */
	fetchPriority?: 'high' | 'low' | 'auto';

	/** Additional attributes to add to the script element */
	attributes?: Record<string, string>;

	/** Whether to use async loading */
	async?: boolean;

	/** Whether to defer script loading */
	defer?: boolean;

	/** Content Security Policy nonce */
	nonce?: string;

	/**
	 * Whether to use an anonymized ID for the script element, this helps ensure the script is not blocked by ad blockers
	 * @default true
	 */
	anonymizeId?: boolean;

	/**
	 * Where to inject the script element in the DOM.
	 * - `'head'`: Scripts are appended to `<head>` (default)
	 * - `'body'`: Scripts are appended to `<body>`
	 *
	 * Use `'body'` for scripts that:
	 * - Need to manipulate DOM elements that don't exist until body loads
	 * - Should load after page content for performance reasons
	 * - Are required by third-party services to be in the body
	 *
	 * Use `'head'` (default) for scripts that:
	 * - Need to track early page events (analytics)
	 * - Should be available before page render
	 * - Most tracking/analytics scripts
	 *
	 * @default 'head'
	 *
	 * @example
	 * ```ts
	 * const script: Script = {
	 *   id: 'my-script',
	 *   src: 'https://example.com/script.js',
	 *   category: 'analytics',
	 *   target: 'body', // Load in body instead of head
	 * };
	 * ```
	 */
	target?: 'head' | 'body';

	/**
	 * Callback executed before the script is loaded
	 * @param info - Information about the script and current consent state
	 */
	onBeforeLoad?: (info: ScriptCallbackInfo) => void;

	/**
	 * Callback executed when the script loads successfully
	 * @param info - Information about the script and current consent state
	 */
	onLoad?: (info: ScriptCallbackInfo) => void;

	/**
	 * Callback executed when the script is being unloaded/removed
	 * @param info - Information about the script and current consent state
	 */
	onDelete?: (info: ScriptCallbackInfo) => void;

	/**
	 * Callback executed if the script fails to load
	 * @param info - Information about the script, error, and current consent state
	 */
	onError?: (info: ScriptCallbackInfo) => void;

	/**
	 * Callback executed whenever the consent store is changed.
	 * This callback only applies to scripts already loaded.
	 *
	 * @param info - Information about the script and current consent state
	 *
	 * @example
	 * ```ts
	 * const script: Script = {
	 *   id: 'analytics',
	 *   src: 'https://analytics.example.com/script.js',
	 *   category: 'analytics',
	 *   onConsentChange: ({ consents }) => {
	 *     // React to consent changes
	 *     if (consents.analytics) {
	 *       console.log('Analytics consent granted');
	 *     }
	 *   }
	 * };
	 * ```
	 */
	onConsentChange?: (info: ScriptCallbackInfo) => void;
}

/**
 * Result of updating scripts
 *
 * @public
 */
export interface ScriptUpdateResult {
	/** Array of script IDs that were loaded */
	loaded: string[];

	/** Array of script IDs that were unloaded */
	unloaded: string[];
}
