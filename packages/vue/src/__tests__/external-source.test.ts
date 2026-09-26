import type { ConsentKernel, ConsentState } from '@c15t/core';
import { mount } from '@vue/test-utils';
import { expect, test, vi } from 'vitest';
import { defineComponent, h, inject } from 'vue';

import { c15tVue } from '../index';
import { symbolKernel, symbolActiveUI } from '../runtime/utils/symbols';

test('Vue plugin options own one external authority and share script lifecycle', async () => {
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

	let kernel!: ConsentKernel;
	const fetch = vi.fn();
	vi.stubGlobal('fetch', fetch);
	const view = mount(
		defineComponent({
			setup() {
				const value = inject(symbolKernel);
				const activeUI = inject(symbolActiveUI);
				if (!value || !activeUI) {
					throw new Error('Missing consent context');
				}
				kernel = value;
				return () =>
					h(
						'button',
						{
							onClick: () => {
								activeUI.value = 'manager';
							},
						},
						'Preferences'
					);
			},
		}),
		{
			global: {
				plugins: [
					[
						c15tVue,
						{ consentSource: source, iframeBlocker: false, scripts: [script] },
					],
				],
			},
		}
	);
	try {
		expect(fetch).not.toHaveBeenCalled();
		expect(loaded).not.toHaveBeenCalled();
		permissions = { measurement: true };
		notify();
		await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(1));
		await view.get('button').trigger('click');
		expect(openPreferences).toHaveBeenCalledTimes(1);
		expect(kernel.getSnapshot().activeUI).toBe('none');
		await expect(kernel.commands.save('all')).rejects.toThrow('external CMP');
		permissions = null;
		notify();
		expect(kernel.getSnapshot().effectivePermissions.measurement).toBe(false);
		expect(removed).toHaveBeenLastCalledWith(
			expect.objectContaining({ hasConsent: false })
		);
		expect(kernel.getSnapshot().explicitChoice).toBeNull();
	} finally {
		view.unmount();
		vi.unstubAllGlobals();
	}
	expect(detach).toHaveBeenCalledTimes(1);
});
