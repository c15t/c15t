/**
 * Auth behaviour, and its agreement with `@c15t/backend`.
 *
 * The parity matrix matters more than the individual cases: during the
 * parallel phase both backends serve the same tenants with the same configured
 * keys, so a request must not authenticate against one and fail against the
 * other. A divergence in the permissive direction is a security hole; in the
 * restrictive direction it is an outage.
 */

import { assert, describe, it } from 'vitest';
import {
	extractBearerToken,
	validateApiKey,
	validateRequestAuth,
} from './auth';

const KEYS = ['sk_live_correct', 'sk_live_second'];

describe('extractBearerToken', () => {
	it('accepts only the Bearer scheme', () => {
		assert.strictEqual(extractBearerToken('Bearer abc'), 'abc');
		assert.isNull(extractBearerToken('Basic abc'));
		assert.isNull(extractBearerToken('bearer abc'), 'scheme is case-sensitive');
		assert.isNull(extractBearerToken('abc'));
		assert.isNull(extractBearerToken(null));
	});

	it('rejects a malformed header rather than salvaging it', () => {
		assert.isNull(extractBearerToken('Bearer'));
		assert.isNull(extractBearerToken('Bearer '));
		assert.isNull(extractBearerToken('Bearer a b'));
	});
});

describe('validateApiKey', () => {
	it('authenticates nobody when no keys are configured', () => {
		// The important direction: an unconfigured deployment must expose
		// nothing rather than everything.
		assert.isFalse(validateApiKey('anything', undefined));
		assert.isFalse(validateApiKey('anything', []));
	});

	it('accepts any configured key', () => {
		assert.isTrue(validateApiKey('sk_live_correct', KEYS));
		assert.isTrue(validateApiKey('sk_live_second', KEYS));
	});

	it('rejects near-misses', () => {
		for (const token of [
			'sk_live_correc',
			'sk_live_correctx',
			'sk_live_CORRECT',
			'',
		]) {
			assert.isFalse(validateApiKey(token, KEYS), token);
		}
	});
});

// The `parity with @c15t/backend` block that lived here compared this
// implementation against 2.x's source directly. It went with that package at
// cutover — there is no longer a second implementation to be in parity with.
// The behaviour it pinned is asserted directly above.
