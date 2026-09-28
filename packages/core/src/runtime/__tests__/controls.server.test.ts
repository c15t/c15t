/** @vitest-environment node */
import { expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import { reloadOnConsentRevocation } from '../controls';

test('external revocation is safe without a browser window', async () => {
	vi.stubGlobal('window', undefined);
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const stop = reloadOnConsentRevocation(kernel);
	try {
		kernel.set.externalPermissions({});
		await Promise.resolve();
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
	} finally {
		stop();
		kernel.dispose();
		vi.unstubAllGlobals();
	}
});
