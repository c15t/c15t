/**
 * Kernel verbs that only core's own modules call: the runtime, persistence
 * and the records clear. They exist on every kernel `createConsentKernel()`
 * returns but are not part of {@link ConsentKernel}, the public interface.
 *
 * Callers cast with a type-only import, so a module loaded on demand gains
 * no import edge.
 *
 * @internal
 */
import type {
	ConsentKernel,
	HydrationRecords,
	HydrationResult,
	InitResponse,
	KernelEvent,
} from '../types';

/** @internal */
export interface InternalKernel extends ConsentKernel {
	/**
	 * Apply validated stored records without creating a choice. Emits
	 * `permissions:changed` when permissions changed and nothing else. Marks
	 * the lifecycle as started and installs the deadline timer. Hydration
	 * does not write storage; the mounted adapter forwards browser detection
	 * through `set.privacySignals` afterward.
	 */
	hydrate: (records: HydrationRecords) => HydrationResult;
	/**
	 * Apply an init response synchronously, in place of the attempt that
	 * would have fetched it; an attempt in flight then applies nothing. The
	 * provider runtime adopts a streamed prefetch this way, so the kernel
	 * holds the policy a server-rendered surface shows by the time it
	 * hydrates. Before the runtime started (`afterStart` false) it only
	 * commits, as construction would; after, it announces `init:applied` as
	 * a completed attempt does.
	 */
	adoptInit: (response: InitResponse, afterStart: boolean) => void;
	/**
	 * Mark the kernel live in a visitor's browser. `init()` does this on its
	 * own; a runtime that renders from a server-resolved prefetch and never
	 * calls `init()` calls it after hydration, so a visible surface is
	 * stamped as an impression (`surface:shown`, `snapshot.surfaceShownAt`)
	 * and a later choice can carry `timeToDecisionMs`. Idempotent.
	 *
	 * @param at - Impression time for a surface already visible. Defaults to now.
	 */
	markLive: (at?: number) => void;
	/**
	 * Keep save requests from leaving until `until` settles, whether it
	 * resolves or rejects. A request that already left is not held.
	 * Persistence calls this from its `choice:recorded` listener while its
	 * write code is still loading, with the promise of the write, so the
	 * first save after page load is stored before it is sent.
	 */
	holdSaves: (until: Promise<unknown>) => void;
	readonly events: ConsentKernel['events'] & {
		/** Announce an event the kernel did not produce itself. */
		emit: (event: KernelEvent) => void;
	};
}
