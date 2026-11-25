import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import type { Ref } from 'vue';

import { DialogContent, DialogRoot } from '../runtime/primitives';

const renderDialog = (open: Ref<boolean>) =>
	h(
		DialogRoot,
		{
			modal: false,
			'onUpdate:open': (value: boolean) => {
				open.value = value;
			},
			open: open.value,
		},
		() => (open.value ? h(DialogContent) : null)
	);

describe('DialogContent Escape', () => {
	test('closes only the dialog opened last', async () => {
		const bottom = ref(true);
		const top = ref(false);
		const wrapper = mount(
			defineComponent({
				setup: () => () => [renderDialog(bottom), renderDialog(top)],
			}),
			{ attachTo: document.body }
		);
		await nextTick();
		top.value = true;
		await nextTick();

		document.body.dispatchEvent(
			new KeyboardEvent('keydown', {
				bubbles: true,
				cancelable: true,
				key: 'Escape',
			})
		);
		await nextTick();

		expect(top.value).toBe(false);
		expect(bottom.value).toBe(true);
		wrapper.unmount();
	});
});
