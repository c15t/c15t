/** @vitest-environment node */
import { expect, test, vi } from 'vitest';

import { createConsentKernel } from '../../kernel';
import { watchRevocationReload } from '../revocation-reload';

test('external revocation is safe without a browser window', async () => {
	vi.stubGlobal('window', undefined);
	const kernel = createConsentKernel({
		initialExternalPermissions: { measurement: true },
	});
	const reload = vi.fn();
	const stop = watchRevocationReload({ kernel, reload });
	try {
		kernel.set.externalPermissions({});
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	} finally {
		stop();
		kernel.dispose();
		vi.unstubAllGlobals();
	}
});
