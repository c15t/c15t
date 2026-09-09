import { createConsentKernel } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { policyRulePresets, resolvePolicyRules } from '@c15t/schema/types';
/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => {
	localStorage.clear();
	vi.useRealTimers();
});

it('measures all three real cookie projections and hydrates without writes', async () => {
	vi.useFakeTimers();
	const resolution = resolvePolicyRules({
		countryCode: 'US',
		regionCode: 'CA',
		rules: [{ ...policyRulePresets.californiaOptOut(), prompt: 'notice' }],
	});
	const kernel = createConsentKernel({ initialPolicyResolution: resolution });
	const persistence = createPersistence({ kernel });
	await kernel.commands.init();
	kernel.set.privacySignals({ gpc: true });
	await kernel.commands.save({ functionality: true });
	expect(kernel.getSnapshot().promptRequirement.kind).toBe('notice');
	await kernel.commands.dismissNotice();
	vi.advanceTimersByTime(0);
	const cookies = document.cookie.split('; ').sort();
	expect(cookies.map((cookie) => cookie.split('=')[0]).sort()).toEqual([
		'c15t',
		'c15t-notice',
		'c15t-privacy',
	]);
	const bytes = Object.fromEntries(
		cookies.map((cookie) => {
			const [name, ...value] = cookie.split('=');
			return [name, new TextEncoder().encode(value.join('=')).length];
		})
	);
	console.log(
		JSON.stringify({
			aggregateCookieHeaderBytes: new TextEncoder().encode(cookies.join('; '))
				.length,
			cookieValueBytes: bytes,
		})
	);
	const repeated = createConsentKernel({ initialPolicyResolution: resolution });
	const repeatedPersistence = createPersistence({
		kernel: repeated,
		skipHydration: true,
	});
	const writes = vi.spyOn(Storage.prototype, 'setItem');
	expect(repeatedPersistence.hydrate()).toBe(true);
	vi.advanceTimersByTime(0);
	expect(writes).not.toHaveBeenCalled();
	expect(repeated.getSnapshot().promptRequirement.kind).toBe('none');
	expect(repeated.getSnapshot().effectivePermissions.marketing).toBe(false);
	expect(document.cookie.split('; ').sort()).toEqual(cookies);
	writes.mockRestore();
	repeatedPersistence.dispose();
	repeated.dispose();
	persistence.clear();
	persistence.dispose();
	kernel.dispose();
});
