import {
	buildConsentManifestFromConfig,
	type ConsentManifest,
} from '@c15t/schema/types';
import type { C15TEdgeOptions } from '~/edge/types';

export type InitManifestOptions = Omit<C15TEdgeOptions, 'logger'>;

/**
 * Builds the consent manifest for these options.
 *
 * Delegates to `@c15t/schema` so there is exactly one implementation. RFC 0001
 * makes that a design principle, and RFC 0004's parallel phase depends on it:
 * two backends serve the same tenants, and a manifest that differed between
 * them would invalidate the contract tests and the benchmark comparison alike.
 */
export async function buildConsentManifestFromOptions(
	options: InitManifestOptions
): Promise<ConsentManifest> {
	return buildConsentManifestFromConfig(options);
}
