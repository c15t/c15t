/**
 * The snapshot this package serves when native hands it nothing readable.
 *
 * Contract rule 5: unknown wire values fail closed. A JavaScript layer that
 * cannot parse a snapshot must not guess permissions, so it serves the same
 * shape an un-hydrated cold start gets: not ready, policy pending, every
 * optional category denied, and an `error` that says why.
 */

import { CONSENT_CATEGORIES } from '@c15t/core';
import type { ConsentState } from '@c15t/core';

import type { ConsentSnapshot } from '../protocol';
import {
	DEFAULT_NATIVE_LANGUAGE,
	defaultNativeOverrides,
} from '../protocol/overrides';

/**
 * Error code carried by a fail-closed snapshot built in JavaScript.
 *
 * The native cores never send it, which keeps it distinguishable from a native
 * `unsupported-contract` or transport failure in app logs.
 */
export const INVALID_NATIVE_SNAPSHOT_CODE = 'invalid-native-snapshot';

/**
 * Build a deny-all snapshot.
 *
 * @param message - Why the native payload was unusable, for logs and support.
 * @param revision - Revision of the last snapshot that was usable, or `0`.
 * @returns A snapshot every optional category reads `false` on.
 */
export const denyAllSnapshot = function denyAllSnapshot(
	message: string,
	revision = 0
): ConsentSnapshot {
	const effectivePermissions = {} as ConsentState;

	for (const category of CONSENT_CATEGORIES) {
		effectivePermissions[category] = category === 'necessary';
	}

	return {
		activeUI: 'none',
		consentCategories: null,
		effectivePermissions,
		error: { code: INVALID_NATIVE_SNAPSHOT_CODE, message },
		evaluatedAt: 0,
		explicitChoice: null,
		iab: null,
		location: null,
		model: 'none',
		nextDeadline: null,
		optOutDirectives: [],
		overrides: defaultNativeOverrides(DEFAULT_NATIVE_LANGUAGE),
		policyPending: true,
		policySnapshotToken: null,
		privacySignals: { gpc: false, msa: false },
		promptRequirement: { kind: 'none' },
		ready: false,
		resolution: { fingerprint: null, policyId: null, status: 'failed' },
		restrictions: {},
		revision,
		subject: null,
		translations: null,
	};
};
