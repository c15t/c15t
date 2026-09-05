/**
 * Ambient `App.Locals` augmentation for apps that install `c15tHandle`.
 *
 * Reference it once from `src/app.d.ts`:
 *
 * ```ts
 * /// <reference types="@c15t/svelte/kit/locals" />
 * ```
 *
 * Prefer the explicit form if you already own an `App.Locals` block:
 *
 * ```ts
 * import type { C15tLocals } from '@c15t/svelte/kit';
 *
 * declare global {
 *   namespace App {
 *     interface Locals {
 *       c15t: C15tLocals;
 *     }
 *   }
 * }
 * ```
 */
import type { C15tLocals } from './types';

declare global {
	namespace App {
		interface Locals {
			/** Consent context resolved once per request by `c15tHandle`. */
			c15t: C15tLocals;
		}
	}
}

export {};
