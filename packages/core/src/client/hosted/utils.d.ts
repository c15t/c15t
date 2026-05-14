import type { IdentifyUserRequestBody } from '../client-interface';
/**
 * Helper function to introduce a delay
 * @param ms - Delay duration in milliseconds
 * @returns Promise resolving after the delay
 * @internal
 */
export declare const delay: (ms: number) => Promise<void>;
/**
 * Resolves the subject identifier used by identify-user requests.
 * Supports the canonical `subjectId` field and the deprecated `id` alias.
 */
export declare function getIdentifySubjectId(
	submission?: IdentifyUserRequestBody
): string | undefined;
/**
 * Generates a UUID v4 for request identification
 *
 * @returns A randomly generated UUID string
 */
export declare function generateUUID(): string;
