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
// Imported from source rather than through the package: @c15t/backend's build
// does not emit middleware as its own entry point, and reshaping the shipping
// package's build config to enable one test is the wrong trade. The file is
// self-contained pure functions with no imports of its own.
import { validateRequestAuth as shipped } from '../../../backend/src/middleware/auth/validate-api-key';
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

describe('parity with @c15t/backend', () => {
	it('agrees on every combination of header and configured keys', () => {
		const headers = [
			undefined,
			null,
			'Bearer sk_live_correct',
			'Bearer sk_live_second',
			'Bearer sk_live_wrong',
			'Bearer sk_live_correc',
			'Bearer sk_live_correctx',
			'Bearer ',
			'Bearer',
			'Basic sk_live_correct',
			'sk_live_correct',
			'',
		];
		const keySets = [undefined, [], KEYS, ['sk_live_correct']];

		for (const header of headers) {
			for (const keys of keySets) {
				const h = new Headers();
				if (typeof header === 'string') h.set('Authorization', header);
				const subject = header === undefined ? undefined : h;

				assert.strictEqual(
					validateRequestAuth(subject, keys),
					shipped(subject, keys as string[] | undefined),
					`header=${String(header)} keys=${JSON.stringify(keys)}`
				);
			}
		}
	});
});
