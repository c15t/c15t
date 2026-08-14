/**
 * Clear-on-revocation module for removing first-party cookies and Web
 * Storage keys based on consent.
 *
 * @packageDocumentation
 */

export { runClearOnRevocation } from './core';
export { createClearOnRevocationManager } from './store';
export type {
	ClearOnRevocationConfig,
	ClearOnRevocationCookieTarget,
	ClearOnRevocationTargets,
} from './types';
