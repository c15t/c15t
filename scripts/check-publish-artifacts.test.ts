import { describe, expect, it } from 'vitest';

import { getBlockedReason } from './check-publish-artifacts';

describe('getBlockedReason', () => {
	it('rejects CommonJS artifacts outside dist', () => {
		// The ESM-only guard must cover the whole tarball: a stale shim or a
		// root-level .cjs entry is just as much a CommonJS leak as dist output.
		expect(getBlockedReason('c15t', 'shims/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
		expect(getBlockedReason('@c15t/core', 'index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('rejects CommonJS artifacts under dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.cjs')).toBe(
			'CommonJS artifact in ESM-only package'
		);
	});

	it('allows ESM runtime output and shims', () => {
		expect(getBlockedReason('@c15t/core', 'dist/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.js')).toBeNull();
		expect(getBlockedReason('c15t', 'shims/index.d.ts')).toBeNull();
	});

	it('still rejects test artifacts in dist', () => {
		expect(getBlockedReason('@c15t/core', 'dist/foo.test.js')).toBe(
			'test file'
		);
	});
});
