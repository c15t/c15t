import type { ConsentSubject } from '../consent-record/types';
import type { InternalKernel } from './internals';

/**
 * What a clear leaves of a subject: its ID alone, so the visitor can still
 * be reached while withdrawing. The external identity linked to it goes.
 *
 * @internal
 */
export const subjectAfterClear = function subjectAfterClear(
	subject: ConsentSubject | null | undefined
): ConsentSubject | null {
	return subject?.subjectId ? { subjectId: subject.subjectId } : null;
};

/**
 * Clear a kernel's records in memory and announce it.
 *
 * The one clear sequence: `hydrate()` with every record `null` and the
 * subject cut to its ID (which bumps the records generation, so any read or
 * save started before it is stale), then `records:cleared`. The kernel's save outbox listens for that event
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
	kernel: Pick<InternalKernel, 'events' | 'getSnapshot' | 'hydrate'>,
	now?: number
): void {
	kernel.hydrate({
		choice: null,
		noticeDismissal: null,
		now,
		subject: subjectAfterClear(kernel.getSnapshot().subject),
		vendorChoice: null,
	});
	kernel.events.emit({ type: 'records:cleared' });
};
