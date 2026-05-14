/**
 * Typed event bus for kernel observability.
 *
 * Subscribers register against a specific event-name and receive only
 * events of that type. Internal storage is `Map<type, Set<listener>>`
 * so registration and unsubscription are O(1) and dispatch is O(n) in
 * the listener count for that event.
 *
 * The bus does not retain state — late subscribers do not receive
 * historical events. For state-shaped observability use snapshot
 * subscriptions instead.
 */
import type { KernelEvent, Listener, Unsubscribe } from '../types';

export interface EventBus {
	/**
	 * Register a listener for a specific event type. Listeners are called
	 * in registration order and may not unsubscribe themselves during
	 * dispatch (the change applies after the current dispatch completes).
	 */
	on<E extends KernelEvent['type']>(
		type: E,
		listener: Listener<Extract<KernelEvent, { type: E }>>
	): Unsubscribe;

	/**
	 * Dispatch an event to all listeners registered for its type.
	 * No-op if no listeners are registered.
	 */
	emit(event: KernelEvent): void;
}

/**
 * Create a fresh event bus. Each kernel instance owns its own bus.
 */
export function createEventBus(): EventBus {
	const listeners = new Map<KernelEvent['type'], Set<Listener<KernelEvent>>>();

	return {
		on(type, listener) {
			let bucket = listeners.get(type);
			if (!bucket) {
				bucket = new Set();
				listeners.set(type, bucket);
			}
			const cast = listener as Listener<KernelEvent>;
			bucket.add(cast);
			return () => {
				bucket?.delete(cast);
			};
		},

		emit(event) {
			const bucket = listeners.get(event.type);
			if (!bucket) return;
			for (const listener of bucket) {
				listener(event);
			}
		},
	};
}
