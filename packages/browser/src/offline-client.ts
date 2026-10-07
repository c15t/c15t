import { createConsentClientWith } from './client-base';
import type { CreateConsentClientContext } from './client-base';
import { resolveRules } from './policy-rules';
import { offline } from './transports/offline';
import type { ConsentClient, ConsentClientOptions } from './types';

/**
 * Create an offline client with no hosted or manifest mode selection.
 *
 * @param options - Local consent and policy options.
 * @param context - Entry-point wiring.
 * @returns The client, not started.
 * @throws {Error} For another mode, backend URLs, or manifest inputs.
 * @internal
 */
export const createOfflineConsentClient = function createOfflineConsentClient(
	options: ConsentClientOptions = {},
	context: CreateConsentClientContext = {}
): ConsentClient {
	if (
		options.backendURL !== undefined ||
		options.manifest !== undefined ||
		options.manifestURL !== undefined
	) {
		throw new Error(
			'@c15t/browser/offline: backend and manifest inputs require the hosted or generic entry.'
		);
	}
	const { mode } = options;
	if (
		mode !== undefined &&
		mode !== 'offline' &&
		!(typeof mode === 'function' && mode.kind === 'offline')
	) {
		throw new Error('@c15t/browser/offline: only offline mode is supported.');
	}
	const policyRules = resolveRules(options.policyRules);
	return createConsentClientWith(
		options,
		{
			factory: typeof mode === 'function' ? mode : offline({ policyRules }),
			name: 'offline',
		},
		policyRules,
		context
	);
};
