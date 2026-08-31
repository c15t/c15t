/**
 * The consent dialog trigger's drag and persistence behavior is built on
 * local composables (no runtime dependency); these tests pin the pointer
 * mechanics and the localStorage round-trip they provide.
 */
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

import { useDraggable as createDraggable } from '../runtime/composables/use-draggable';
import type {
	UseDraggableOptions,
	UseDraggableReturn,
} from '../runtime/composables/use-draggable';
import { useLocalStorageRef } from '../runtime/composables/use-local-storage-ref';

function pointerEvent(
	type: string,
	init: { clientX?: number; clientY?: number; button?: number } = {}
): PointerEvent {
	// jsdom has no PointerEvent constructor; MouseEvent carries every field
	// the composable reads.
	return new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		...init,
	}) as unknown as PointerEvent;
}

function mountDraggable(options: UseDraggableOptions = {}) {
	let result!: UseDraggableReturn;
	const wrapper = mount(
		defineComponent({
			setup() {
				const target = ref<HTMLElement | null>(null);
				result = createDraggable(target, options);
				return () => h('button', { ref: target, type: 'button' });
			},
		}),
		{ attachTo: document.body }
	);
	return { wrapper, result };
}

afterEach(() => {
	window.localStorage.clear();
});

describe('useDraggable', () => {
	it('tracks the pointer while dragging and reports the final position', async () => {
		const onEnd = vi.fn();
		const { wrapper, result } = mountDraggable({
			initialValue: { x: 40, y: 30 },
			onEnd,
		});
		await nextTick();

		expect(result.position.value).toEqual({ x: 40, y: 30 });
		expect(result.isDragging.value).toBe(false);

		const button = wrapper.get('button').element;
		// jsdom rects are zero-sized at (0, 0), so the pressed delta equals
		// the pointerdown coordinates.
		button.dispatchEvent(
			pointerEvent('pointerdown', { clientX: 5, clientY: 8 })
		);
		expect(result.isDragging.value).toBe(true);

		window.dispatchEvent(
			pointerEvent('pointermove', { clientX: 105, clientY: 158 })
		);
		expect(result.position.value).toEqual({ x: 100, y: 150 });

		window.dispatchEvent(
			pointerEvent('pointerup', { clientX: 105, clientY: 158 })
		);
		expect(result.isDragging.value).toBe(false);
		expect(onEnd).toHaveBeenCalledWith(
			{ x: 100, y: 150 },
			expect.any(MouseEvent)
		);

		wrapper.unmount();
	});

	it('ignores non-primary buttons and moves without a press', async () => {
		const { wrapper, result } = mountDraggable({
			initialValue: { x: 40, y: 30 },
		});
		await nextTick();

		const button = wrapper.get('button').element;
		button.dispatchEvent(
			pointerEvent('pointerdown', { clientX: 5, clientY: 8, button: 2 })
		);
		expect(result.isDragging.value).toBe(false);

		window.dispatchEvent(
			pointerEvent('pointermove', { clientX: 105, clientY: 158 })
		);
		expect(result.position.value).toEqual({ x: 40, y: 30 });

		wrapper.unmount();
	});

	it('stops tracking after the consuming component unmounts', async () => {
		const { wrapper, result } = mountDraggable();
		await nextTick();

		const button = wrapper.get('button').element;
		button.dispatchEvent(
			pointerEvent('pointerdown', { clientX: 5, clientY: 8 })
		);
		expect(result.isDragging.value).toBe(true);

		wrapper.unmount();
		window.dispatchEvent(
			pointerEvent('pointermove', { clientX: 105, clientY: 158 })
		);
		expect(result.position.value).toEqual({ x: 0, y: 0 });
	});
});

describe('useLocalStorageRef', () => {
	it('reads the stored value, persists updates, and removes on null', async () => {
		window.localStorage.setItem('c15t:test', JSON.stringify({ x: 1, y: 2 }));

		const stored = useLocalStorageRef<{ x: number; y: number } | null>(
			'c15t:test',
			null
		);
		expect(stored.value).toEqual({ x: 1, y: 2 });

		stored.value = { x: 3, y: 4 };
		await nextTick();
		expect(window.localStorage.getItem('c15t:test')).toBe('{"x":3,"y":4}');

		stored.value = null;
		await nextTick();
		expect(window.localStorage.getItem('c15t:test')).toBeNull();
	});

	it('keeps the default when the stored value is unparseable', () => {
		window.localStorage.setItem('c15t:test', 'not-json');

		const stored = useLocalStorageRef<{ x: number; y: number } | null>(
			'c15t:test',
			null
		);
		expect(stored.value).toBeNull();
	});
});
