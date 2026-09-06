/**
 * `c15tHandle()` resolves the consent cookie and the geo/language/GPC
 * headers once per request onto `event.locals.c15t`, so every arm's
 * `+layout.server.ts` reuses that work instead of re-parsing headers.
 */
import { c15tHandle } from '@c15t/svelte/kit';

export const handle = c15tHandle();
