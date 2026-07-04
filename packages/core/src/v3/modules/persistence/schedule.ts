/**
 * Macrotask-debounced write scheduler.
 *
 * Multiple consent flips within a single tick (e.g. accept-all then
 * adjust) coalesce into one storage write. The write runs in a later
 * macrotask so synchronous cookie/localStorage work does not sit on the
 * user interaction path that just updated the kernel and UI.
 *
 * Pure: takes a `write` callback, returns `{ schedule, flush }`. No
 * closure capture beyond the supplied callback.
 */
export interface WriteScheduler {
	/** Request a write in a later macrotask. Idempotent within a tick. */
	schedule(): void;
	/**
	 * Run the write synchronously now. No-op when nothing is scheduled.
	 * Useful for tests and for flushing on dispose.
	 */
	flush(): void;
}

/**
 * Build a scheduler that coalesces multiple `schedule()` calls into one
 * deferred `write()` call.
 *
 * `flush()` runs the pending write synchronously and clears the queued
 * timer, so a flushed-then-completed task does not write a second time.
 */
export function createWriteScheduler(write: () => void): WriteScheduler {
	let pending = false;
	let timer: ReturnType<typeof setTimeout> | null = null;

	return {
		schedule() {
			if (pending) return;
			pending = true;
			timer = setTimeout(() => {
				timer = null;
				pending = false;
				write();
			}, 0);
		},
		flush() {
			if (!pending) return;
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
			pending = false;
			write();
		},
	};
}
