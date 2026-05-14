import type { PolicyConfig } from './policy-runtime';
/**
 * Preset Europe pack mode used by {@link policyPackPresets}.
 *
 * @see {@link https://c15t.com/docs/frameworks/react/policy-packs}
 */
export type EuropePolicyMode = 'opt-in' | 'iab';
export interface PolicyPackPresets {
	/**
	 * Europe opt-in preset (EEA + UK countries).
	 */
	europeOptIn: () => PolicyConfig;
	/**
	 * Europe IAB TCF 2.3 preset.
	 */
	europeIab: () => PolicyConfig;
	/**
	 * World fallback with no banner — use as the default policy.
	 */
	worldNoBanner: () => PolicyConfig;
	/**
	 * California opt-in preset (US-CA region).
	 */
	californiaOptIn: () => PolicyConfig;
	/**
	 * California opt-out preset (US-CA region).
	 */
	californiaOptOut: () => PolicyConfig;
	/**
	 * Quebec opt-in preset (CA-QC region).
	 */
	quebecOptIn: () => PolicyConfig;
}
/**
 * Built-in policy pack presets for common regional starting points.
 *
 * @remarks
 * These helpers are convenient for demos, tests, local previews, and initial
 * backend bootstrapping. Treat them as starter presets rather than a complete
 * legal policy strategy.
 *
 * @example
 * ```ts
 * import { policyPackPresets } from 'c15t';
 *
 * const packs = [
 *   policyPackPresets.europeOptIn(),
 *   policyPackPresets.californiaOptOut(),
 *   policyPackPresets.worldNoBanner(),
 * ];
 * ```
 *
 * @see {@link https://c15t.com/docs/frameworks/react/policy-packs}
 * @see {@link https://c15t.com/docs/self-host/guides/policy-packs}
 */
export declare const policyPackPresets: PolicyPackPresets;
