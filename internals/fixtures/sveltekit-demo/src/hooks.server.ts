import { c15tHandle } from '@c15t/svelte/kit';

// Reads the consent cookie, location headers and GPC once per request and
// stores them on `event.locals.c15t` for `loadConsent` to reuse.
export const handle = c15tHandle();
