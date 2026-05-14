/**
 * Network blocker module for blocking requests based on consent.
 *
 * @packageDocumentation
 */

export { shouldBlockRequest } from './core';
export { createNetworkBlockerManager } from './store';
export type {
	BlockedRequestInfo,
	NetworkBlockerConfig,
	NetworkBlockerRule,
} from './types';
