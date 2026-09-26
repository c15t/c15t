import type { ConsentState } from '@c15t/core';
import { expect, test, vi } from 'vitest';

import { createConsentClient } from '../client';

test('browser client delegates preferences and loads scripts only for external grants', async () => {
	let permissions: Partial<ConsentState> | null = null;
	let notify = () => {};
	const detach = vi.fn();
	const openPreferences = vi.fn();
	const source = {
		getPermissions: () => permissions,
		openPreferences,
		subscribe: (listener: () => void) => {
			notify = listener;
			return detach;
		},
	};
	const loaded = vi.fn();
	const removed = vi.fn();
	const script = {
		callbackOnly: true as const,
		category: 'measurement' as const,
		id: 'external-tracker',
		onConsentChange: removed,
		onLoad: loaded,
	};

	const client = createConsentClient({
		consentSource: source,
		iframeBlocker: false,
		scripts: [script],
	});
	client.start();
	try {
		expect(loaded).not.toHaveBeenCalled();
		permissions = { measurement: true };
		notify();
		await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
		client.openDialog();
		expect(openPreferences).toHaveBeenCalledTimes(1);
		expect(client.getSnapshot().activeUI).toBe('none');
		permissions = null;
		notify();
		expect(client.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(removed).toHaveBeenLastCalledWith(
			expect.objectContaining({ hasConsent: false })
		);
		expect(client.getSnapshot().explicitChoice).toBeNull();
	} finally {
		client.dispose();
	}
	expect(detach).toHaveBeenCalledTimes(1);
});
