import type { ConsentState } from '@c15t/core';
import { render, fireEvent } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import type { ConsentContextValue } from '../lib/context.svelte';
import { offline } from '../lib/transports/offline';
import Fixture from './fixtures/policy-state-fixture.svelte';

test('Svelte provider options share external gates and preference controls', async () => {
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

	let context!: ConsentContextValue;
	const view = render(Fixture, {
		capture: (value) => {
			context = value;
		},
		options: {
			consentSource: source,
			iframeBlocker: false,
			mode: offline(),
			scripts: [script],
		},
	});
	try {
		expect(loaded).not.toHaveBeenCalled();
		permissions = { measurement: true };
		notify();
		await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
		await fireEvent.click(view.getByText('Privacy settings'));
		expect(openPreferences).toHaveBeenCalledTimes(1);
		expect(context.state.activeUI).toBe('none');
		permissions = null;
		notify();
		expect(removed).toHaveBeenLastCalledWith(
			expect.objectContaining({ hasConsent: false })
		);
	} finally {
		view.unmount();
	}
	expect(detach).toHaveBeenCalledTimes(1);
});
