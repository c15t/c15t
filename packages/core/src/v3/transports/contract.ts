/**
 * The transport contract for v3 adapter authors.
 *
 * A v3 transport is a plain object with three optional async methods:
 * `init`, `save`, and `identify`. The kernel invokes them from
 * `commands.*` when the corresponding command fires; missing methods
 * make the matching command a no-op that returns a minimal success
 * result.
 *
 * What lives here vs. `types.ts`:
 * - `types.ts` is the public type bag for adapter consumers
 *   (snapshot, kernel, config, events).
 * - This file re-exports the same names but is named after what
 *   adapter *authors* care about: a single import surface with
 *   docstrings tailored to the transport contract.
 *
 * Build a transport by writing a function that returns a
 * `KernelTransport`:
 *
 * ```ts
 * import type { KernelTransport, InitContext, InitResponse } from
 *   'c15t/v3/transports/contract';
 *
 * export function createMyTransport(opts: MyOpts): KernelTransport {
 *   return {
 *     async init(ctx: InitContext): Promise<InitResponse> { ... },
 *     async save(payload) { ... },
 *   };
 * }
 * ```
 *
 * Treat `init` as idempotent — the kernel may call it more than once
 * over the lifetime of an instance (e.g. when overrides change). Treat
 * `save` as append-only from the backend's perspective — multiple
 * saves with the same `subjectId` are valid and represent successive
 * states.
 */
export type {
	InitContext,
	InitResponse,
	InitResult,
	KernelTransport,
	SavePayload,
	SaveResult,
} from '../types';
