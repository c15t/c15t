/**
 * Microtask-debounced write scheduler.
 *
 * Multiple consent flips within a single tick (e.g. accept-all then
 * adjust) coalesce into one storage write — the resolved promise's
 * `.then` callback runs at the end of the current microtask. Saves
 * one or more synchronous storage round-trips per kernel mutation
 * burst.
 *
 * Pure: takes a `write` callback, returns `{ schedule, flush }`. No
 * closure capture beyond the supplied callback.
 */
export interface WriteScheduler {
	/** Request a write at the next microtask. Idempotent within a tick. */
	schedule(): void;
	/**
	 * Run the write synchronously now. No-op when nothing is scheduled.
	 * Useful for tests and for flushing on dispose.
	 */
	flush(): void;
}

/**
 * Build a scheduler that coalesces multiple `schedule()` calls within
 * a single microtask into one `write()` call.
 *
 * `flush()` runs the pending write synchronously and invalidates the
 * queued microtask via an epoch counter, so a flushed-then-completed
 * microtask does not write a second time.
 */
export function createWriteScheduler(write: () => void): WriteScheduler {
	let pending = false;
	let epoch = 0;

	return {
		schedule() {
			if (pending) return;
			pending = true;
			const startedEpoch = ++epoch;
			Promise.resolve().then(() => {
				pending = false;
				if (startedEpoch !== epoch) return; // superseded by flush()
				write();
			});
		},
		flush() {
			if (!pending) return;
			pending = false;
			epoch++;
			write();
		},
	};
}
