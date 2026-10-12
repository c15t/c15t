/**
 * `offline()` from the plugin entry resolves the policy in the browser with
 * no backend. Its init names the location it resolved for, as `/init` does,
 * so the dialog, which waits for the init's display data, has its copy.
 */
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, expect, test, vi } from 'vitest';

import { c15tVue, offline } from '../index';
import ConsentManager from '../runtime/components/manager.vue';
import { useConsentKernelContext } from '../runtime/composables';

afterEach(() => {
	document.body.replaceChildren();
	vi.unstubAllGlobals();
});

test('offline() gives the dialog its English title without a request', async () => {
	const fetch = vi.fn<typeof globalThis.fetch>();
	vi.stubGlobal('fetch', fetch);
	let context!: ReturnType<typeof useConsentKernelContext>;
	const wrapper = mount(
		{
			components: { ConsentManager },
			setup() {
				context = useConsentKernelContext();
			},
			template: '<ConsentManager />',
		},
		{
			attachTo: document.body,
			global: {
				plugins: [[c15tVue, { disableAnimation: true, mode: offline() }]],
			},
		}
	);
	try {
		await context.kernel.commands.init();
		await flushPromises();
		context.activeUI.value = 'manager';
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-title"]')
					?.textContent
			).toBe('Privacy Settings');
		});
		expect(fetch).not.toHaveBeenCalled();
	} finally {
		wrapper.unmount();
	}
});
