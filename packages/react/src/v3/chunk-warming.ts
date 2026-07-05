/**
 * Chunk-warming registry (Vue-parity perf work, item #2).
 *
 * The aggregate `ConsentDialog` is lazy-loaded and — since the interaction
 * fix — deferred until it can actually render. That leaves one cold path:
 * the user's *first* "customize" click pays the chunk network+parse cost
 * under throttle. Surfaces register their lazy import here, and intent
 * signals (pointerenter/focus on the customize button) warm the chunk
 * before the click.
 *
 * Module-level registry keeps banner components decoupled from the
 * aggregate exports (no context change, tree-shakes with the aggregate).
 */

type Warmer = () => void;

const warmers = new Set<Warmer>();
let warmed = false;

/** Register a lazy chunk's import trigger. Returns an unregister fn. */
export function registerDialogChunkWarmer(warmer: Warmer): () => void {
	warmers.add(warmer);
	if (warmed) {
		warmer();
	}
	return () => {
		warmers.delete(warmer);
	};
}

/** Fire all registered warmers once (idempotent). */
export function warmDialogChunk(): void {
	if (warmed) {
		return;
	}
	warmed = true;
	for (const warmer of warmers) {
		warmer();
	}
}

/** Test-only reset. */
export function resetDialogChunkWarmers(): void {
	warmers.clear();
	warmed = false;
}
