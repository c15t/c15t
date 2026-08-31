/**
 * The plain-Vue `useState` stub shares keyed refs across consumers and
 * resets once the last consumer unmounts, so a fresh app (or test) never
 * observes state from a previous one.
 */
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { Ref } from 'vue';

import { useState as createVueState } from '../runtime/composables/stubs/state';

const mountConsumer = function mountConsumer(onSetup: () => void) {
	return mount(
		defineComponent({
			setup() {
				onSetup();
				return () => h('div');
			},
		})
	);
};

describe('useState stub', () => {
	it('shares state between consumers under the same key', () => {
		let first!: Ref<number>;
		let second!: Ref<number>;

		const a = mountConsumer(() => {
			first = createVueState('c15t:count', () => 1);
		});
		const b = mountConsumer(() => {
			second = createVueState('c15t:count', () => 99);
		});

		expect(second.value).toBe(1);
		first.value = 5;
		expect(second.value).toBe(5);

		a.unmount();
		b.unmount();
	});

	it('resets state after the last consumer unmounts', () => {
		let initial!: Ref<number>;
		const a = mountConsumer(() => {
			initial = createVueState('c15t:count', () => 1);
		});
		initial.value = 42;
		a.unmount();

		let fresh!: Ref<number>;
		const b = mountConsumer(() => {
			fresh = createVueState('c15t:count', () => 1);
		});
		expect(fresh.value).toBe(1);
		b.unmount();
	});

	it('keeps state while any consumer is still mounted', () => {
		let first!: Ref<number>;
		const a = mountConsumer(() => {
			first = createVueState('c15t:count', () => 1);
		});
		const b = mountConsumer(() => {
			createVueState('c15t:count', () => 1);
		});

		first.value = 7;
		a.unmount();

		let stillShared!: Ref<number>;
		const c = mountConsumer(() => {
			stillShared = createVueState('c15t:count', () => 1);
		});
		expect(stillShared.value).toBe(7);

		b.unmount();
		c.unmount();
	});
});
