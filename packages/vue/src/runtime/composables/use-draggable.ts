import {
	type ComputedRef,
	computed,
	getCurrentScope,
	onScopeDispose,
	type Ref,
	ref,
	watch,
} from 'vue';

export interface DraggablePosition {
	x: number;
	y: number;
}

export interface UseDraggableOptions {
	/** Position of the element before the first drag. */
	initialValue?: DraggablePosition;
	/** Called when a drag ends, with the final position. */
	onEnd?: (position: DraggablePosition, event: PointerEvent) => void;
	/** Call `preventDefault()` on the handled pointer events. */
	preventDefault?: boolean;
	/** Call `stopPropagation()` on the handled pointer events. */
	stopPropagation?: boolean;
}

export interface UseDraggableReturn {
	/** Current top-left position of the element. Writable. */
	position: Ref<DraggablePosition>;
	/** Whether a drag is in progress. */
	isDragging: ComputedRef<boolean>;
}

/**
 * Make an element draggable with pointer events.
 *
 * A primary-button `pointerdown` on the target starts the drag, recording
 * the pointer's offset within the element so the element tracks the pointer
 * without jumping. `pointermove` on the window updates `position`
 * (viewport-relative top-left coordinates, suitable for `position: fixed`),
 * and `pointerup` ends the drag and reports the final position via `onEnd`.
 *
 * SSR-safe: no listeners are attached without a `window`. Listeners are
 * removed when the consuming scope is disposed.
 *
 * @param target - Ref to the element that starts drags
 * @param options - Drag behavior configuration
 * @returns The reactive position and drag state
 */
export function useDraggable(
	target: Ref<HTMLElement | null>,
	options: UseDraggableOptions = {}
): UseDraggableReturn {
	const position = ref<DraggablePosition>(
		options.initialValue ?? { x: 0, y: 0 }
	);
	const pressedDelta = ref<DraggablePosition | null>(null);
	const isDragging = computed(() => pressedDelta.value !== null);

	function handleEvent(event: PointerEvent) {
		if (options.preventDefault) {
			event.preventDefault();
		}
		if (options.stopPropagation) {
			event.stopPropagation();
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) {
			return;
		}

		const rect = target.value?.getBoundingClientRect();
		if (!rect) {
			return;
		}

		pressedDelta.value = {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
		};
		handleEvent(event);
	}

	function onPointerMove(event: PointerEvent) {
		if (!pressedDelta.value) {
			return;
		}

		position.value = {
			x: event.clientX - pressedDelta.value.x,
			y: event.clientY - pressedDelta.value.y,
		};
		handleEvent(event);
	}

	function onPointerUp(event: PointerEvent) {
		if (!pressedDelta.value) {
			return;
		}

		pressedDelta.value = null;
		options.onEnd?.({ ...position.value }, event);
		handleEvent(event);
	}

	if (typeof window !== 'undefined') {
		watch(
			target,
			(element, previousElement) => {
				previousElement?.removeEventListener('pointerdown', onPointerDown);
				element?.addEventListener('pointerdown', onPointerDown);
			},
			{ immediate: true, flush: 'post' }
		);

		window.addEventListener('pointermove', onPointerMove, true);
		window.addEventListener('pointerup', onPointerUp, true);

		if (getCurrentScope()) {
			onScopeDispose(() => {
				target.value?.removeEventListener('pointerdown', onPointerDown);
				window.removeEventListener('pointermove', onPointerMove, true);
				window.removeEventListener('pointerup', onPointerUp, true);
			});
		}
	}

	return { position, isDragging };
}
