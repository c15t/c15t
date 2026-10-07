/**
 * Which factories `hosted()` built. A module of its own, importing nothing
 * at runtime, so a provider can ask without loading the hosted transport:
 * an app on `offline()` or `custom()` never needs it.
 */
import type { HostedModeOptions, ProviderTransportFactory } from './mode';

/**
 * The options each factory `hosted()` returned was called with, copied at
 * that call: the same copy builds the factory's transports. Kept here
 * rather than on the factory, so a wrapper that copies the factory's
 * properties is not mistaken for it: `get()` gives `undefined` for any
 * factory but one `hosted()` returned. A provider compares the options to
 * recognize the same backend in a factory a later render rebuilt: `fetch`
 * and `initialData` by identity, the rest as JSON. A new option that is not
 * plain data needs the same identity check there.
 *
 * @internal
 */
export const hostedModes = new WeakMap<
	ProviderTransportFactory,
	HostedModeOptions
>();
