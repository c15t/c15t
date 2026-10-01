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
 *
 * Delivery goes through the kernel's dispatcher, shared with snapshot
 * subscribers: a throwing listener is reported and skipped, and deliveries
 * reach every listener in the order they were made.
 */
import type { KernelEvent, Listener, Unsubscribe } from '../types';
import { createDispatcher, createListenerSet } from './dispatch';
import type { Dispatcher, ListenerSet } from './dispatch';

export interface EventBus {
	/**
	 * Register a listener for a specific event type. Listeners are called
	 * in registration order. A listener removed during dispatch is not
	 * called again; one added during dispatch first receives the next event.
	 */
	on: <E extends KernelEvent['type']>(
		type: E,
		listener: Listener<Extract<KernelEvent, { type: E }>>
	) => Unsubscribe;

	/**
	 * Dispatch an event to all listeners registered for its type.
	 * No-op if no listeners are registered. Never throws a listener's error.
	 */
	emit: (event: KernelEvent) => void;
}

/**
 * Create a fresh event bus. Each kernel instance owns its own bus and
 * passes the dispatcher its snapshot subscribers share.
 */
export const createEventBus = function createEventBus(
	dispatcher: Dispatcher = createDispatcher()
): EventBus {
	let listeners: Map<KernelEvent['type'], ListenerSet<KernelEvent>> | undefined;

	return {
		emit(event) {
			const bucket = listeners?.get(event.type);
			if (bucket) {
				dispatcher.deliver(bucket, event);
			}
		},

		on(type, listener) {
			listeners ??= new Map();
			let bucket = listeners.get(type);
			if (!bucket) {
				bucket = createListenerSet();
				listeners.set(type, bucket);
			}
			return bucket.add(listener as Listener<KernelEvent>);
		},
	};
};
