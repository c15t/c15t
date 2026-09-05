import { mapInitOutputToInitResponse } from '@c15t/core';
import { describe, expect, it } from 'vitest';

import { createPolicyOperations } from '../../core-benchmarks/src/policy-operations';
import {
	buildBrowserBenchManifest,
	resolveBrowserBenchInit,
} from './policy-fixtures';

describe('real policy benchmark operations', () => {
	it('rejects, saves partial receipts, hydrates, dismisses and retains detected GPC', async () => {
		const init = resolveBrowserBenchInit(await buildBrowserBenchManifest());
		const operations = createPolicyOperations(
			mapInitOutputToInitResponse(init, {})
		);
		for (const operation of Object.values(operations)) {
			// oxlint-disable-next-line no-await-in-loop -- Validate each operation without overlapping lifecycle timers.
			await expect(operation()).resolves.toBeUndefined();
		}
	});
});

it('fails when init silently falls back instead of matching the intended policy', async () => {
	await expect(createPolicyOperations({}).realPolicyRejectUs()).rejects.toThrow(
		'Policy fixture did not match'
	);
});
