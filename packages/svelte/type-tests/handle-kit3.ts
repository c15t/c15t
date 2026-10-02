/**
 * SvelteKit 3 exports `Handle` only from `@sveltejs/kit/hooks`. `c15tHandle()`
 * must be usable wherever Kit 3 expects one. Checked by `check-types` through
 * `tsconfig.kit3.json`.
 */
import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';

import { c15tHandle } from '../src/lib/kit/handle';

export const handle: Handle = c15tHandle();
export const composed: Handle = sequence(c15tHandle(), handle);
