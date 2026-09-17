/**
 * Build-time configuration for the fixture.
 *
 * Each `process.env.C15T_*` read below has to stay a literal property access:
 * the plugin in `babel.config.js` rewrites exactly that shape, and a computed
 * `process.env[name]` would survive into the bundle and read an empty object on
 * device. `.env` is loaded by the same plugin before Metro transforms anything.
 *
 * None of this reaches the native core. On a real device the core reads its own
 * keys from `Info.plist` and the Android manifest, and this file only drives what
 * the screens report and which core the app attaches to.
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
	backendURL: text(process.env.C15T_BACKEND_URL, LOCAL_BACKEND),
	forceFakeNative: readFlag(process.env.C15T_FAKE_NATIVE) ?? false,
	publicKey: text(process.env.C15T_PUBLIC_KEY, '(not configured)'),
	sampleIntervalMs: asNumber(process.env.C15T_SAMPLE_INTERVAL_MS, 1000),
};
