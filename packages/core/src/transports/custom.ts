/**
 * `custom()` lives apart from `hosted()` so an app that brings its own
 * transport does not bundle the hosted transport through the module that
 * defines both.
 */
import type { KernelTransport } from '../types';
import type { ProviderTransportFactory } from './mode';

/**
 * Selects a caller-supplied transport for a consent provider.
 *
 * @param transport - Canonical kernel transport.
 * @returns A custom provider transport factory.
 * @example
 * ```ts
 * import { custom } from '@c15t/core';
 *
 * const mode = custom({
 *   async init() {
 *     return await loadInitResponse();
 *   },
 *   async save(payload) {
 *     await persist(payload);
 *     return { ok: true, subjectId: payload.subjectId };
 *   },
 * });
 * ```
 */
export const custom = function custom(
	transport: KernelTransport
): ProviderTransportFactory {
	if ('setConsent' in transport) {
		throw new TypeError(
			'c15t: custom() requires a KernelTransport with save(), not endpoint handlers'
		);
	}
	return Object.assign(() => transport, { kind: 'custom' as const });
};
