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
 *   cut off at `MAX_DELIVERY_DEPTH` instead of overflowing the stack. The
 *   deliveries already queued still finish, so a listener outside the loop
 *   (a network blocker, say) ends on the current snapshot rather than an
 *   older one. During that last pass a listener that updates consent is not
 *   called again, and every other listener only receives the newest value
 *   queued for it.
 */
import type { Listener, Unsubscribe } from '../types';

/**
 * Nested deliveries one synchronous cascade may open. Far above any
 * legitimate cascade; reaching it means listeners are feeding back.
 */
export const MAX_DELIVERY_DEPTH = 100;

/**
 * Listener calls the final pass after a cutoff may make. A listener that
 * re-subscribes, or subscribes a new function, on every notification can
 * keep queueing deliveries; this bounds the pass whatever listeners do.
 */
export const MAX_FINAL_PASS_CALLS = 1000;

/** One `add()` call. A function removed and added again is a new one. */
interface Registration<Value> {
	listener: Listener<Value>;
}

/**
 * Listener registrations. Delivery checks the registration, not just the
 * function, so a function unsubscribed and subscribed again during a
 * delivery counts as added during it and waits for the next one.
 */
export interface ListenerSet<Value> {
	/**
	 * Register `listener`. Adding a registered function again keeps its
	 * registration. The returned call removes this registration only, never
	 * a later one for the same function.
	 */
	add: (listener: Listener<Value>) => Unsubscribe;
	readonly registrations: ReadonlyMap<Listener<Value>, Registration<Value>>;
}

export const createListenerSet = function createListenerSet<
	Value,
>(): ListenerSet<Value> {
	const registrations = new Map<Listener<Value>, Registration<Value>>();
	return {
		add(listener) {
			const registration = registrations.get(listener) ?? { listener };
			registrations.set(listener, registration);
			return () => {
				if (registrations.get(listener) === registration) {
					registrations.delete(listener);
				}
			};
		},
		registrations,
	};
};

export interface Dispatcher {
	/**
	 * Call each registration in `listeners` with `value`. Registrations are
	 * read now: one added later first receives the next delivery, and one
	 * removed before its turn is skipped.
	 */
	deliver: <Value>(listeners: ListenerSet<Value>, value: Value) => void;
	/**
	 * Hold deliveries made while `run` executes, then deliver them in order.
	 * Lets a command commit and emit its follow-up events before any
	 * listener can start another transition.
	 */
	batch: <Result>(run: () => Result) => Result;
}

interface Delivery {
	listeners: ListenerSet<unknown>;
	targets: Registration<unknown>[];
	value: unknown;
	next: number;
}

/**
 * The page's `reportError`, when there is a page. Bun and Deno define a
 * global `reportError` as well, but there it ends the process like an
 * uncaught exception, so outside a document the error is only logged.
 */
const pageReportError = function pageReportError():
	| ((error: unknown) => void)
	| undefined {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return undefined;
	}
	const report = (window as { reportError?: unknown }).reportError;
	return typeof report === 'function'
		? (error) => {
				report.call(window, error);
			}
		: undefined;
};

/**
 * Report a listener exception without rethrowing into delivery. In a page
 * this uses `reportError` (the same path `EventTarget` uses for a throwing
 * listener) so error tracking sees it; elsewhere it logs.
 */
const reportListenerError = function reportListenerError(error: unknown): void {
	try {
		const report = pageReportError();
		if (report) {
			report(error);
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
	// Counts deliveries queued, so a call can tell whether it queued any.
	let queued = 0;
	// Set once the depth limit is hit, until the queue is empty again.
	// Listeners that queued a delivery during the final pass (the ones
	// feeding the loop) are not called again. Keyed by function, so a
	// listener that re-subscribes itself stays cut off.
	let cutOff: Set<Listener<unknown>> | null = null;
	let finalPassCalls = 0;

	// A later queued delivery to the same registration carries a newer
	// value, so the final pass skips this one.
	const supersededLater = function supersededLater(
		from: number,
		listeners: ListenerSet<unknown>,
		target: Registration<unknown>
	): boolean {
		for (let index = from + 1; index < pending.length; index += 1) {
			const later = pending[index];
			if (later?.listeners === listeners && later.targets.includes(target)) {
				return true;
			}
		}
		return false;
	};

	const call = function call(
		delivery: Delivery,
		target: Registration<unknown>
	): void {
		if (cutOff) {
			if (
				cutOff.has(target.listener) ||
				supersededLater(0, delivery.listeners, target)
			) {
				return;
			}
			finalPassCalls += 1;
			if (finalPassCalls > MAX_FINAL_PASS_CALLS) {
				pending.length = 0;
				return;
			}
		}
		const before = queued;
		try {
			target.listener(delivery.value);
		} catch (error) {
			reportListenerError(error);
		}
		if (cutOff && queued !== before) {
			cutOff.add(target.listener);
		}
	};

	// Reentrant: a nested call continues the same cursors, so older
	// deliveries finish before newer ones start.
	const drain = function drain(): void {
		if (cutOff) {
			// The outermost drain runs the final pass.
			return;
		}
		if (depth >= MAX_DELIVERY_DEPTH) {
			cutOff = new Set();
			reportListenerError(
				new Error(
					'[c15t] Consent listeners kept updating consent in response to each other; further notifications from them were dropped.'
				)
			);
			return;
		}
		depth += 1;
		try {
			while (pending.length > 0) {
				const [delivery] = pending;
				const target = delivery?.targets[delivery.next];
				if (!(delivery && target)) {
					pending.shift();
					continue;
				}
				delivery.next += 1;
				if (delivery.listeners.registrations.get(target.listener) === target) {
					call(delivery, target);
				}
			}
		} finally {
			depth -= 1;
			if (depth === 0) {
				cutOff = null;
				finalPassCalls = 0;
			}
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
			const { registrations } = listeners;
			if (registrations.size === 0) {
				return;
			}
			pending.push({
				listeners: listeners as ListenerSet<unknown>,
				next: 0,
				targets: [...registrations.values()] as Registration<unknown>[],
				value,
			});
			queued += 1;
			if (held === 0) {
				drain();
			}
		},
	};
};
