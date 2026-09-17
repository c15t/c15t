/**
 * Geographic, language, and GPC overrides the app pins for policy evaluation.
 *
 * Overrides never create a choice. They change which rule matches and which
 * translations are served, and the backend recomputes them before it accepts
 * a save, which is why they travel with every commit.
 *
 * `gpc` is the app's GPC override, not a detection. It is load bearing rather
 * than decorative: `decisionInputsMatchOverrides` in `@c15t/core` compares it
 * against the decision inputs remembered from the last init, and a save whose
 * inputs no longer match is rejected as stale. A native save body that drops
 * it cannot pass that check. Publisher test mode is a client option, not an
 * override, and never reaches a save body.
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
 *
 * Mirrors `KernelOverrides` in `@c15t/core`, with the kernel's optional
 * properties normalised to explicit `null` so the native cores serialize every
 * key rather than leaving a JavaScript reader to branch on presence.
 */
export interface NativeOverrides {
	/** ISO 3166-1 alpha-2 country code, or `null` to let the backend detect. */
	readonly country: string | null;
	/** Region or state code within the country, or `null`. */
	readonly region: string | null;
	/** BCP 47 language tag in effect. Never empty. */
	readonly language: string;
	/**
	 * GPC override, or `null` when the app has none.
	 *
	 * An override wins over the detected signal, which is what makes it an
	 * override. Detection lives on
	 * {@link NativePrivacySignals.gpc.detected}, not here.
	 */
	readonly gpc: boolean | null;
}

/**
 * Overrides accepted by `setOverrides`. Omitted fields keep their current
 * value; an explicit `null` clears one.
 */
export interface NativeOverridesInput {
	readonly country?: string | null;
	readonly region?: string | null;
	readonly language?: string;
	readonly gpc?: boolean | null;
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
	return { country: null, gpc: null, language, region: null };
};
