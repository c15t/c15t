/**
 * Modes other than `hosted()` whose `init()` a provider may call during
 * its first client render. A module of its own, importing nothing at
 * runtime, like `hosted-modes.ts`: a provider asks it about any mode
 * without loading that mode's transport.
 */
import type { KernelOverrides } from '../types';
import type { ProviderTransportFactory } from './mode';

/** What a mode tells a provider about sending its `/init` early. */
export interface EarlyInitMode {
	/**
	 * Whether `init()` for these overrides would request the backend,
	 * answered without a request. `false` when it resolves locally or
	 * cannot tell before fetching something, so a provider leaves it to the
	 * mount effect.
	 */
	requestsInit: (overrides: Readonly<KernelOverrides>) => boolean;
	/**
	 * Whether a mode from another factory call reaches the same backend the
	 * same way, as when a render builds its mode inline: the provider then
	 * shares one early request between them.
	 */
	sameAs: (other: EarlyInitMode) => boolean;
}

/**
 * Factories that registered an {@link EarlyInitMode}. A factory's
 * transport must start any request synchronously within `init()`, be safe
 * to call before the page mounts, and be one of its own per factory call:
 * the provider builds a second transport to carry the early request and
 * hands it to whichever runtime commits first.
 *
 * @internal
 */
export const earlyInitModes = new WeakMap<
	ProviderTransportFactory,
	EarlyInitMode
>();
