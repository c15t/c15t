/**
 * `defineConfig` is an identity function, and worth one test anyway: it is a
 * public export that a config file's type-checking hangs on, and it was at
 * zero coverage — so nothing would have noticed it being deleted.
 */

import { assert, describe, it } from '@effect/vitest';
import { defineConfig } from './define-config';

describe('defineConfig', () => {
	it('returns the config unchanged', () => {
		const config = {
			database: { dialect: 'postgres', url: 'postgres://h/db' },
			trustedOrigins: ['https://example.com'],
		} as const;

		// Identity, deliberately: its whole job is to attach a type so an editor
		// completes the object and a typo is a compile error.
		assert.deepStrictEqual(defineConfig(config), config);
	});
});
