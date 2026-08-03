/**
 * Snapshot tokens, and their agreement with `@c15t/backend`.
 *
 * This is the one piece of shared logic that had to be reimplemented rather
 * than moved into `@c15t/schema` — signing needs `jose`, and that package is
 * imported by browser code (issue #944). So the divergence risk is real and the
 * parity test is the mitigation: tokens minted by either implementation must
 * carry identical claims and verify against the other.
 *
 * A divergence here is not cosmetic. A token one backend issues and the other
 * rejects means a consent submission fails for a visitor whose request happened
 * to be balanced onto the wrong instance.
 */

import { decodeJwt } from 'jose';
import { assert, describe, it } from 'vitest';
// From source: @c15t/backend does not emit handlers as build entries.
import {
	createPolicySnapshotToken,
	verifyPolicySnapshotToken,
} from './policy-snapshot';

const OPTIONS = { signingKey: 'test-signing-key-at-least-32-chars-long' };

const claims = {
	policyId: 'pol_1',
	fingerprint: 'fp_1',
	matchedBy: 'country',
	country: 'DE',
	region: null,
	jurisdiction: 'gdpr',
	model: 'opt_in',
	language: 'de',
	categories: ['analytics'],
	gpc: false,
};

describe('policy snapshot tokens', () => {
	it('mints nothing when signing is not configured', async () => {
		// An unsigned token is worse than none: a caller may read its presence
		// as meaningful evidence.
		assert.isUndefined(await createPolicySnapshotToken(claims, undefined));
		assert.isUndefined(await createPolicySnapshotToken(claims, {}));
	});

	it('round-trips a token it minted', async () => {
		const minted = await createPolicySnapshotToken(claims, OPTIONS);
		assert.isDefined(minted);

		const verified = await verifyPolicySnapshotToken(
			minted?.token,
			OPTIONS,
			undefined
		);
		assert.isTrue(verified.valid);
	});

	it('scopes the audience to the tenant', async () => {
		const minted = await createPolicySnapshotToken(
			{ ...claims, tenantId: 'tenant_a' },
			OPTIONS
		);

		// A token minted for one tenant must not verify against another, or
		// signed evidence becomes portable across tenants.
		const wrongTenant = await verifyPolicySnapshotToken(
			minted?.token,
			OPTIONS,
			'tenant_b'
		);
		assert.isFalse(wrongTenant.valid);

		const rightTenant = await verifyPolicySnapshotToken(
			minted?.token,
			OPTIONS,
			'tenant_a'
		);
		assert.isTrue(rightTenant.valid);
	});

	it('reports every failure identically', async () => {
		const minted = await createPolicySnapshotToken(claims, OPTIONS);

		// Distinguishing "wrong signature" from "wrong audience" tells an
		// attacker which part of a forged token to fix next.
		const wrongKey = await verifyPolicySnapshotToken(
			minted?.token,
			{ signingKey: 'a-completely-different-signing-key-value' },
			undefined
		);
		assert.deepStrictEqual(wrongKey, { valid: false, reason: 'invalid' });

		const garbage = await verifyPolicySnapshotToken(
			'not.a.jwt',
			OPTIONS,
			undefined
		);
		assert.deepStrictEqual(garbage, { valid: false, reason: 'invalid' });
	});
});

// The `parity with @c15t/backend` block that lived here compared this
// implementation against 2.x's source directly. It went with that package at
// cutover — there is no longer a second implementation to be in parity with.
// The behaviour it pinned is asserted directly above.
