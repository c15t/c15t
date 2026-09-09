/**
 * Macrotask-debounced write scheduler.
 *
 * Multiple writes requested within a single tick coalesce into one
 * storage write. The write runs in a later macrotask so synchronous
 * cookie/localStorage work does not sit on the user interaction path
 * that just updated the kernel and UI.
 *
 * Pure: takes a `write` callback, returns `{ schedule, flush, cancel }`.
 */
export interface WriteScheduler {
	/** Request a write in a later macrotask. Idempotent within a tick. */
	schedule: () => void;
	/**
	 * Run the write synchronously now. No-op when nothing is scheduled.
	 * Useful for tests and for flushing on dispose.
	 */
	flush: () => void;
	/** Drop a queued write without running it. */
	cancel: () => void;
}

/**
 * Build a scheduler that coalesces multiple `schedule()` calls into one
 * deferred `write()` call.
 */
export const createWriteScheduler = function createWriteScheduler(
	write: () => void
): WriteScheduler {
	let pending = false;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const cancel = function cancel(): void {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		pending = false;
	};

	return {
		cancel,
		flush() {
			if (!pending) {
				return;
			}
			cancel();
			write();
		},
		schedule() {
			if (pending) {
				return;
			}
			pending = true;
			timer = setTimeout(() => {
				timer = null;
				pending = false;
				write();
			}, 0);
		},
	};
};
