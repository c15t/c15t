/**
 * The preference-item primitives drop every built-in class under `noStyle`
 * on the root, content included. The content classes carry the collapsing
 * grid, so a headless consumer that kept them would get an unstyled header
 * over a still-animating body.
 */
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { defineComponent, h } from 'vue';

import {
	PreferenceItemContent,
	PreferenceItemRoot,
	PreferenceItemTrigger,
} from '../runtime/primitives';

const Item = defineComponent({
	props: { noStyle: { default: false, type: Boolean } },
	setup(props) {
		return () =>
			h(PreferenceItemRoot, { noStyle: props.noStyle, open: true }, () => [
				h(PreferenceItemTrigger, null, () => 'Marketing'),
				h(
					PreferenceItemContent,
					{ class: 'own-content', innerClass: 'own-inner' },
					() => 'Body'
				),
			]);
	},
});

const classesOf = (wrapper: ReturnType<typeof mount>) => ({
	content: wrapper.get('[data-slot="preference-item-content"]').classes(),
	inner: wrapper.get('[data-slot="preference-item-content-inner"]').classes(),
	viewport: wrapper
		.get('[data-slot="preference-item-content-viewport"]')
		.classes(),
});

test('content keeps the built-in classes by default and drops them under noStyle', () => {
	const styled = classesOf(mount(Item));
	expect(styled.content.length).toBeGreaterThan(1);
	expect(styled.viewport.length).toBe(1);
	expect(styled.inner.length).toBeGreaterThan(1);

	const headless = classesOf(mount(Item, { props: { noStyle: true } }));
	expect(headless.content).toEqual(['own-content']);
	expect(headless.viewport).toEqual([]);
	expect(headless.inner).toEqual(['own-inner']);
});
