// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { C15tLocals } from '@c15t/svelte/kit';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Consent context resolved once per request by `c15tHandle`. */
			c15t: C15tLocals;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
