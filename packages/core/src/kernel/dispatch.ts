/**
 * Ordered, isolated delivery for snapshot subscribers and kernel events.
 *
 * - Every listener call is isolated: an exception is reported and the
 *   remaining listeners still run. Delivery never throws into the command
 *   that committed the change.
 * - Every listener receives deliveries in the order they were made. When a
 *   listener commits or emits while being called, the deliveries still in
 *   progress first finish for their remaining listeners, then the new one
 *   runs. A later listener therefore never skips an intervening transition
 *   or receives an older one after a newer one.
 * - Delivery is synchronous and reentrant: a nested commit has notified
 *   every listener before it returns, so a listener mid-work (a script
 *   mount, say) learns about a revocation immediately.
 * - Listeners that keep updating consent in response to each other are
 *   cut off at `MAX_DELIVERY_DEPTH` instead of overflowing the stack.
 */
import type { Listener } from '../types';

/**
 * Nested deliveries one synchronous cascade may open. Far above any
 * legitimate cascade; reaching it means listeners are feeding back.
 */
export const MAX_DELIVERY_DEPTH = 100;

export interface Dispatcher {
	/**
	 * Call each listener in `listeners` with `value`. The listener set is
	 * read now: one added later first receives the next delivery, and one
	 * removed before its turn is skipped.
	 */
	deliver: <Value>(listeners: Set<Listener<Value>>, value: Value) => void;
	/**
	 * Hold deliveries made while `run` executes, then deliver them in order.
	 * Lets a command commit and emit its follow-up events before any
	 * listener can start another transition.
	 */
	batch: <Result>(run: () => Result) => Result;
}

interface Delivery {
	listeners: Set<Listener<unknown>>;
	targets: Listener<unknown>[];
	value: unknown;
	next: number;
}

/**
 * Report a listener exception without rethrowing into delivery. Uses the
 * platform `reportError` where available (the same path `EventTarget` uses
 * for a throwing listener) so error tracking sees it.
 */
const reportListenerError = function reportListenerError(error: unknown): void {
	try {
		if (typeof globalThis.reportError === 'function') {
			globalThis.reportError(error);
			return;
		}
		console.error('[c15t] A consent listener threw.', error);
	} catch {
		// A failing reporter must not break delivery.
	}
};

export const createDispatcher = function createDispatcher(): Dispatcher {
	const pending: Delivery[] = [];
	let held = 0;
	let depth = 0;

	// Reentrant: a nested call continues the same cursors, so older
	// deliveries finish before newer ones start.
	const drain = function drain(): void {
		if (depth >= MAX_DELIVERY_DEPTH) {
			pending.length = 0;
			reportListenerError(
				new Error(
					'[c15t] Consent listeners kept updating consent in response to each other; pending notifications were dropped.'
				)
			);
			return;
		}
		depth += 1;
		try {
			while (pending.length > 0) {
				const [delivery] = pending;
				const listener = delivery?.targets[delivery.next];
				if (!(delivery && listener)) {
					pending.shift();
					continue;
				}
				delivery.next += 1;
				if (!delivery.listeners.has(listener)) {
					continue;
				}
				try {
					listener(delivery.value);
				} catch (error) {
					reportListenerError(error);
				}
			}
		} finally {
			depth -= 1;
		}
	};

	return {
		batch(run) {
			held += 1;
			try {
				return run();
			} finally {
				held -= 1;
				if (held === 0) {
					drain();
				}
			}
		},
		deliver(listeners, value) {
			if (listeners.size === 0) {
				return;
			}
			pending.push({
				listeners: listeners as Set<Listener<unknown>>,
				next: 0,
				targets: [...listeners] as Listener<unknown>[],
				value,
			});
			if (held === 0) {
				drain();
			}
		},
	};
};
