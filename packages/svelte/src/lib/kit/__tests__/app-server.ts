/**
 * Stand-in for SvelteKit's `$app/server` in tests (aliased in
 * `vitest.config.ts`). `getRequestEvent()` returns the event a test sets
 * with {@link setRequestEvent}, and throws without one, as SvelteKit does
 * outside a request.
 */
import type { RequestEvent } from '@sveltejs/kit';

let current: RequestEvent | undefined;

/** Sets the event `getRequestEvent()` returns until the next call. */
export const setRequestEvent = (event: RequestEvent | undefined): void => {
	current = event;
};

export const getRequestEvent = (): RequestEvent => {
	if (!current) {
		throw new Error('Can only read the current request event during one');
	}
	return current;
};
