/**
 * @vitest-environment jsdom
 */
import { afterEach, expect, test } from 'vitest';

import { offline } from '../../index';
import { createConsentRuntime } from '../index';

afterEach(() => {
	for (const key of ['c15t-sid', 'custom-sid']) {
		document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	}
	localStorage.clear();
});

// A 3.2 server adapter set `c15t-sid` whatever the browser runtime did. A
// runtime that mounts no persistence still removes it.
test.each([
	['persistence: false', { persistence: false }],
	['enabled: false', { enabled: false }],
] as const)('a runtime with %s removes a c15t 3.2 copy', (_, extra) => {
	document.cookie = 'c15t-sid=sub_legacy; path=/';
	localStorage.setItem('c15t-sid', 'sub_legacy');
	const runtime = createConsentRuntime({
		...extra,
		mode: offline({ acknowledgeNoRecords: true }),
	});
	runtime.start();

	expect(document.cookie).not.toContain('c15t-sid=');
	expect(localStorage.getItem('c15t-sid')).toBeNull();
	runtime.dispose();
});

test('a runtime with a consent source removes the copy under its nested storage key', () => {
	document.cookie = 'custom-sid=sub_legacy; path=/';
	const runtime = createConsentRuntime({
		consentSource: {
			getPermissions: () => ({ measurement: false }),
			openPreferences: () => undefined,
			subscribe: () => () => undefined,
		},
		mode: offline({ acknowledgeNoRecords: true }),
		persistence: { storageConfig: { storageKey: 'custom' } },
	});
	runtime.start();

	expect(document.cookie).not.toContain('custom-sid=');
	runtime.dispose();
});
