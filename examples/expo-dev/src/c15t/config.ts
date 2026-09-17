/**
 * Build-time configuration for the fixture.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` into the bundle at build time and leaves
 * every other `process.env` read empty on device, which is why the names below carry
 * that prefix and each read stays a literal property access. `.env` is loaded by the
 * Expo CLI before `app.config.ts` runs, so one file feeds both the config plugin and
 * this module.
 *
 * The native core reads none of it. The plugin writes the core's own keys into
 * `ios/Info.plist` and `android/app/src/main/AndroidManifest.xml` at prebuild time,
 * and this file only drives what the screens report and which core the app attaches
 * to. That split is worth noticing: the bundle and the binary each carry a copy of
 * the backend URL, and a stale binary is a real way to get them to disagree.
 */

/** Interpret the usual truthy spellings, absent meaning "no opinion". */
const readFlag = (value: string | undefined): boolean | undefined => {
	if (value === undefined || value.length === 0) {
		return undefined;
	}

	return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
};

/** Fall back when the app was built without a usable number. */
const asNumber = (value: string | undefined, fallback: number): number => {
	const parsed = Number(value);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Fall back when the app was built without a value. */
const text = (value: string | undefined, fallback: string): string =>
	value === undefined || value.length === 0 ? fallback : value;

export interface FixtureConfig {
	/** Backend the screens report, mirroring the native keys the build embeds. */
	readonly backendURL: string;
	/**
	 * Force the in-JavaScript fake core even when the real module is in the
	 * binary. Off by default so the example exercises the real bridge first.
	 */
	readonly forceFakeNative: boolean;
	/** Publishable key the screens report. Publishable only, never a secret. */
	readonly publicKey: string;
	/** Period of the fake core's `isAllowed` sampler, in milliseconds. */
	readonly sampleIntervalMs: number;
}

const LOCAL_BACKEND = 'http://localhost:3000/api/self-host';

export const config: FixtureConfig = {
	backendURL: text(process.env.EXPO_PUBLIC_C15T_BACKEND_URL, LOCAL_BACKEND),
	forceFakeNative: readFlag(process.env.EXPO_PUBLIC_C15T_FAKE_NATIVE) ?? false,
	publicKey: text(process.env.EXPO_PUBLIC_C15T_PUBLIC_KEY, '(not configured)'),
	sampleIntervalMs: asNumber(
		process.env.EXPO_PUBLIC_C15T_SAMPLE_INTERVAL_MS,
		1000
	),
};
