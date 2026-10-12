/**
 * SvelteKit 2 exports `Handle` from `@sveltejs/kit`. `c15tHandle()` must be
 * usable wherever Kit 2 expects one. Checked by `check-types`.
 */
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { c15tHandle } from '../src/lib/kit/handle';

export const handle: Handle = c15tHandle();
export const composed: Handle = sequence(c15tHandle(), handle);
