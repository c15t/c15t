/**
 * Which factories `hosted()` built. A module of its own, importing nothing
 * at runtime, so a provider can ask without loading the hosted transport:
 * an app on `offline()` or `custom()` never needs it.
 */
import type {
	HostedModeFactory,
	HostedModeOptions,
	ProviderTransportFactory,
} from './mode';

/**
 * Every factory `hosted()` returned. Membership, not the factory's own
 * `type`, decides what {@link readHostedMode} recognizes: a wrapper that
 * copies a factory's properties carries the same data but may build a
 * different transport, so it is not mistaken for the original.
 *
 * @internal
 */
export const hostedFactories = new WeakSet<ProviderTransportFactory>();

/**
 * The options a `hosted()` factory was called with, read from the factory
 * itself, or `undefined` for any other factory. A provider compares them to
 * recognize the same backend in a factory a later render rebuilt: `fetch`
 * and `initialData` by identity, the rest as JSON. A new option that is not
 * plain data needs the same identity check there.
 *
 * @param mode - A provider's `mode`.
 * @returns The factory's hosted options, without `kind` and `type`.
 * @internal
 */
export const readHostedMode = function readHostedMode(
	mode: ProviderTransportFactory
): HostedModeOptions | undefined {
	if (!hostedFactories.has(mode)) {
		return undefined;
	}
	const { kind: _kind, type: _type, ...options } = mode as HostedModeFactory;
	return options;
};
