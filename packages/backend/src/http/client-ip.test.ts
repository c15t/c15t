/**
 * Client IP derivation, and its agreement with `@c15t/backend`.
 *
 * The derived IP is written to every consent record, so this is a compliance
 * field rather than a diagnostic one. Two backends deriving different values
 * for the same visitor during the parallel phase would put inconsistent data
 * in the audit trail — and unlike a latency difference, that is not something
 * you can correct after the fact.
 */

import { getIpAddress, maskIpAddress } from '@c15t/schema/geo';
import { assert, describe, it } from 'vitest';

// Imported from source: @c15t/backend does not emit middleware as its own
// build entry. The shipping function now delegates to the shared one, so this
// asserts the delegation is wired correctly rather than comparing two
// implementations.

const headersWith = (values: Record<string, string>) => {
	const headers = new Headers();
	for (const [key, value] of Object.entries(values)) headers.set(key, value);
	return headers;
};

describe('client IP derivation', () => {
	it('masks the last IPv4 octet by default', () => {
		assert.strictEqual(
			getIpAddress(headersWith({ 'x-forwarded-for': '203.0.113.42' })),
			'203.0.113.0'
		);
	});

	it('masks the last 80 bits of an IPv6 address', () => {
		const masked = getIpAddress(
			headersWith({ 'x-forwarded-for': '2001:db8:85a3::8a2e:370:7334' })
		);
		// The first three groups survive; everything after is zeroed.
		assert.isString(masked);
		assert.include(masked ?? '', '2001:db8:85a3');
		assert.notInclude(masked ?? '', '7334');
	});

	it('takes the first entry of a forwarding chain', () => {
		// A proxy appends its own address, so the original client is first.
		assert.strictEqual(
			getIpAddress(
				headersWith({ 'x-forwarded-for': '203.0.113.42, 198.51.100.7' })
			),
			'203.0.113.0'
		);
	});

	it('records nothing when tracking is disabled', () => {
		// Opting out must mean no IP at all, not a placeholder that still
		// identifies the request as having had one.
		assert.isNull(
			getIpAddress(headersWith({ 'x-forwarded-for': '203.0.113.42' }), {
				tracking: false,
			})
		);
	});

	it('can be told not to mask', () => {
		assert.strictEqual(
			getIpAddress(headersWith({ 'x-forwarded-for': '203.0.113.42' }), {
				masking: false,
			}),
			'203.0.113.42'
		);
	});

	it('returns null when no known header carries an address', () => {
		assert.isNull(getIpAddress(headersWith({ 'user-agent': 'test' })));
	});

	it('leaves an unparseable value alone rather than inventing one', () => {
		assert.strictEqual(maskIpAddress('not-an-ip'), 'not-an-ip');
		assert.isNull(maskIpAddress(null));
	});
});

// The `parity with @c15t/backend` block that lived here compared this
// implementation against 2.x's source directly. It went with that package at
// cutover — there is no longer a second implementation to be in parity with.
// The behaviour it pinned is asserted directly above.
