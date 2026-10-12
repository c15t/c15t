import type { InternalKernel } from './internals';

/**
 * Clear a kernel's records in memory and announce it.
 *
 * The one clear sequence: `hydrate()` with every record `null` (which bumps
 * the records generation, so any read or save started before it is stale),
 * then `records:cleared`. The kernel's save outbox listens for that event
 * and drops the queued saves of the cleared subject, with or without
 * persistence. Persistence wraps this with its storage clear; the runtime
 * calls it directly when nothing is persisted.
 *
 * @param kernel - The kernel whose records to clear.
 * @param now - The clock to evaluate the cleared records at; the kernel's
 * own clock when omitted.
 * @internal
 */
export const clearKernelRecords = function clearKernelRecords(
	kernel: Pick<InternalKernel, 'events' | 'hydrate'>,
	now?: number
): void {
	kernel.hydrate({
		choice: null,
		noticeDismissal: null,
		now,
		subject: null,
		vendorChoice: null,
	});
	kernel.events.emit({ type: 'records:cleared' });
};
