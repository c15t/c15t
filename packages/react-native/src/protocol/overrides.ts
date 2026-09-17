/**
 * Geographic, language and test overrides the app pins for policy
 * evaluation.
 *
 * Overrides never create a choice. They change which rule matches and which
 * translations are served, and the backend recomputes them before it accepts
 * a save, which is why they travel with every commit.
 */

/**
 * Language used when neither the app nor the backend resolved one.
 *
 * The native core normally passes the device locale. This exists so the
 * projection from a kernel snapshot always yields a concrete language.
 */
export const DEFAULT_NATIVE_LANGUAGE = 'en';

/**
 * Overrides held by the native core.
 *
 * Every field is nullable except {@link NativeOverrides.language}: the
 * native core always resolves a language, falling back to the device locale,
 * because translations must resolve to one bundle.
 */
export interface NativeOverrides {
	/** ISO 3166-1 alpha-2 country code, or `null` to let the backend detect. */
	readonly country: string | null;
	/** Region or state code within the country, or `null`. */
	readonly region: string | null;
	/** BCP 47 language tag in effect. Never empty. */
	readonly language: string;
	/**
	 * Publisher test mode, or `null` when unset.
	 *
	 * A test run evaluates the draft policy configuration instead of the
	 * published one, and its choices are never treated as audit evidence.
	 */
	readonly test: string | null;
}

/**
 * Overrides accepted by `setOverrides`. Omitted fields keep their current
 * value; an explicit `null` clears one.
 */
export interface NativeOverridesInput {
	readonly country?: string | null;
	readonly region?: string | null;
	readonly language?: string;
	readonly test?: string | null;
}

/**
 * Complete override set for a device with no app-supplied context.
 *
 * @param language - Language to fall back to, normally the device locale.
 * @returns The override record the native core starts from.
 */
export const defaultNativeOverrides = function defaultNativeOverrides(
	language: string
): NativeOverrides {
	return { country: null, language, region: null, test: null };
};
