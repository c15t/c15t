/**
 * Legal-document snapshot tokens.
 *
 * This is signed evidence of what a subject actually agreed to, so the tests
 * are about the ways it could be trusted when it should not be:
 *
 * - a token minted for one tenant must not verify against another;
 * - a tampered claim must not verify;
 * - no signing key must mean no token, not an unsigned one;
 * - a failure must not say *why* it failed.
 */

import { assert, describe, it } from '@effect/vitest';

import {
	createLegalDocumentSnapshotToken,
	verifyLegalDocumentSnapshotToken,
} from './legal-document-snapshot';

const options = { signingKey: 'a-signing-key-of-reasonable-length' };

const claims = {
	effectiveDate: '2026-04-13T00:00:00.000Z',
	hash: 'sha256-of-the-terms',
	type: 'terms_and_conditions',
	version: '2026-04-13',
};

describe('legal document snapshot', () => {
	it('round-trips the document identity', async () => {
		const minted = await createLegalDocumentSnapshotToken(claims, options);
		assert.isDefined(minted);

		const verified = await verifyLegalDocumentSnapshotToken(
			minted?.token,
			options,
			undefined
		);

		assert.isTrue(verified.valid);
		if (verified.valid) {
			// The hash is what makes this attest to the text rather than a label:
			// a version number can be reused, content cannot.
			assert.strictEqual(verified.payload.hash, 'sha256-of-the-terms');
			assert.strictEqual(verified.payload.version, '2026-04-13');
			assert.strictEqual(verified.payload.type, 'terms_and_conditions');
		}
	});

	it('mints nothing without a signing key', async () => {
		// Absent evidence beats unverifiable evidence, which a caller may read
		// as meaningful simply because it is present.
		assert.isUndefined(await createLegalDocumentSnapshotToken(claims, {}));
		assert.isUndefined(
			await createLegalDocumentSnapshotToken(claims, undefined)
		);
	});

	it('does not verify across tenants', async () => {
		const minted = await createLegalDocumentSnapshotToken(
			{ ...claims, tenantId: 'tenant_a' },
			options
		);

		const wrongTenant = await verifyLegalDocumentSnapshotToken(
			minted?.token,
			options,
			'tenant_b'
		);
		const rightTenant = await verifyLegalDocumentSnapshotToken(
			minted?.token,
			options,
			'tenant_a'
		);

		// The audience is tenant-scoped for this reason: a portable token would
		// let one tenant present another's evidence as its own.
		assert.isFalse(wrongTenant.valid);
		assert.isTrue(rightTenant.valid);
	});

	it('rejects a token signed with a different key', async () => {
		const minted = await createLegalDocumentSnapshotToken(claims, {
			signingKey: 'some-other-key-entirely',
		});

		const verified = await verifyLegalDocumentSnapshotToken(
			minted?.token,
			options,
			undefined
		);
		assert.isFalse(verified.valid);
	});

	it('rejects a tampered payload', async () => {
		const minted = await createLegalDocumentSnapshotToken(claims, options);
		const [header, payload, signature] = (minted?.token ?? '').split('.');

		// Swap the hash for a different document, keeping the signature.
		const forged = Buffer.from(
			JSON.stringify({
				...JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()),
				hash: 'sha256-of-something-else',
			})
		).toString('base64url');

		const verified = await verifyLegalDocumentSnapshotToken(
			`${header}.${forged}.${signature}`,
			options,
			undefined
		);
		assert.isFalse(verified.valid);
	});

	it('reports a missing token differently from an invalid one', async () => {
		const absent = await verifyLegalDocumentSnapshotToken(
			undefined,
			options,
			undefined
		);
		const rubbish = await verifyLegalDocumentSnapshotToken(
			'not-a-jwt',
			options,
			undefined
		);

		// "missing" is a normal state — the client simply did not send one.
		// Everything else collapses to "invalid" without saying which check
		// failed, so a forged token gets no feedback to iterate against.
		assert.deepStrictEqual(absent, { reason: 'missing', valid: false });
		assert.deepStrictEqual(rubbish, { reason: 'invalid', valid: false });
	});
});
