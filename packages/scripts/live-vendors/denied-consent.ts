import type {
	DeniedConsentProbeConfig,
	LiveProbeCheckResult,
	LiveStorageSnapshot,
} from './types';

/**
 * Evaluates the denied-consent egress assertion for an `alwaysLoad` vendor.
 *
 * The vendor loaded with denied consent; every observed third-party request
 * and the page's storage snapshot are checked against the vendor's explicit
 * violation lists. A collection request is a violation even when the runner
 * blocked it — the attempt itself proves the vendor tried to send data.
 *
 * @param config - Per-vendor violation lists.
 * @param observedRequestUrls - Every third-party request URL seen during the
 * denied-consent window, blocked or allowed.
 * @param storage - Cookie names and localStorage keys snapshotted in the page.
 * @returns The consent-phase result with violation details on failure.
 */
export function evaluateDeniedConsentProbe(
	config: DeniedConsentProbeConfig,
	observedRequestUrls: string[],
	storage: LiveStorageSnapshot
): LiveProbeCheckResult {
	const collectViolations = observedRequestUrls.filter((url) =>
		config.collectUrlSubstrings.some((substring) => url.includes(substring))
	);

	const prefixes = config.storagePrefixes ?? [];
	const storageViolations = [
		...storage.cookieNames
			.filter((name) => prefixes.some((prefix) => name.startsWith(prefix)))
			.map((name) => `cookie ${name}`),
		...storage.localStorageKeys
			.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
			.map((key) => `localStorage ${key}`),
	];

	if (collectViolations.length === 0 && storageViolations.length === 0) {
		return {
			ok: true,
			detail:
				'loaded under denied consent with zero collection requests and no vendor storage',
		};
	}

	const parts: string[] = [];
	if (collectViolations.length > 0) {
		parts.push(
			`collection request(s) under denied consent: ${collectViolations
				.slice(0, 5)
				.join(', ')}`
		);
	}
	if (storageViolations.length > 0) {
		parts.push(
			`vendor storage under denied consent: ${storageViolations
				.slice(0, 5)
				.join(', ')}`
		);
	}

	return { ok: false, detail: parts.join('; ') };
}
