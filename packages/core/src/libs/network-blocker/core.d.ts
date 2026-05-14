import type { ConsentState } from '../../types';
import type { NetworkBlockerConfig, NetworkBlockerRule } from './types';
interface NetworkRequestContext {
	url: string;
	method: string;
}
/**
 * Determines whether a network request should be blocked based on the
 * configured rules and the provided consent state.
 *
 * @internal
 */
export declare function shouldBlockRequest(
	request: NetworkRequestContext,
	consents: ConsentState,
	config?: NetworkBlockerConfig
): {
	shouldBlock: boolean;
	rule?: NetworkBlockerRule;
};
export {};
