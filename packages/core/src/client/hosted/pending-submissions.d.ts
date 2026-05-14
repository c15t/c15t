/**
 * Pending submissions management for offline fallback.
 *
 * @packageDocumentation
 */
import type {
	IdentifyUserRequestBody,
	SetConsentRequestBody,
} from '../client-interface';
import type { FetcherContext } from './fetcher';
/**
 * Check for pending consent submissions on initialization
 * @internal
 */
export declare function checkPendingConsentSubmissions(
	_context: FetcherContext,
	processPendingSubmissions: (
		submissions: SetConsentRequestBody[]
	) => Promise<void>
): void;
/**
 * Process pending consent submissions
 * @internal
 */
export declare function processPendingConsentSubmissions(
	context: FetcherContext,
	submissions: SetConsentRequestBody[]
): Promise<void>;
/**
 * Check for pending identify user submissions on initialization
 * @internal
 */
export declare function checkPendingIdentifySubmissions(
	_context: FetcherContext,
	processPendingSubmissions: (
		submissions: IdentifyUserRequestBody[]
	) => Promise<void>
): void;
/**
 * Process pending identify user submissions
 * @internal
 */
export declare function processPendingIdentifySubmissions(
	context: FetcherContext,
	submissions: IdentifyUserRequestBody[]
): Promise<void>;
