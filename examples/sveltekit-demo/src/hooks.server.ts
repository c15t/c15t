import { c15tHandle } from '@c15t/svelte/kit';
import { sequence } from '@sveltejs/kit/hooks';

/**
 * Resolves consent context — geo, GPC, language, and the stored consent
 * cookie — once per request onto `event.locals.c15t`. `+layout.server.ts`
 * reads it through `loadConsent` instead of re-parsing headers.
 *
 * The geo pin matches the provider's `overrides` in `+layout.svelte`, so the
 * server and the client resolve the same policy. Drop both to use the real
 * geo headers from your CDN.
 *
 * `sequence` is here to show the composition; add your own handles alongside.
 */
export const handle = sequence(c15tHandle({ country: 'CA', region: 'QC' }));
