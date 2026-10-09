import { createConsentClientWith } from './client-base';
import type { CreateConsentClientContext, ResolvedMode } from './client-base';
import type { ConsentClient, ConsentClientOptions } from './types';

export { ACTION_ATTRIBUTE, PREFERENCES_HASH } from './client-base';
export type { CreateConsentClientContext, PageAction } from './client-base';

/**
 * Read the transport from a factory. Mode names are a script-tag feature,
 * so this module imports no transport: a bundle keeps only the factory the
 * page passes.
 */
const resolveMode = function resolveMode(
	options: ConsentClientOptions,
	pkg: string
): ResolvedMode {
	const { mode } = options as { mode?: unknown };
	if (typeof mode !== 'function') {
		throw new Error(
			`${pkg}: \`mode\` must be a factory, such as manifest(), hosted() or offline() from ${pkg}. Mode names like ${JSON.stringify(mode ?? 'hosted')} work only in the script-tag builds.`
		);
	}
	const factory = mode as ConsentClientOptions['mode'];
	const { kind } = factory;
	return {
		factory,
		name:
			kind === 'hosted' || kind === 'offline' || kind === 'manifest'
				? kind
				: 'custom',
	};
};

/**
 * Create the page's consent client without starting it.
 *
 * @param options - Client options, with a `mode` factory.
 * @param context - Entry-point wiring.
 * @returns The client. Call `start()` to resolve the policy and mount.
 * @throws {Error} When `mode` is not a transport factory.
 */
export const createConsentClient = function createConsentClient(
	options: ConsentClientOptions,
	context: CreateConsentClientContext = {}
): ConsentClient {
	return createConsentClientWith(
		options,
		resolveMode(options, context.pkg ?? '@c15t/browser'),
		undefined,
		context
	);
};
