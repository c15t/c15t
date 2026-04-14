import type { IdentifyUserRequestBody } from '../client-interface';

/**
 * Helper function to introduce a delay
 * @param ms - Delay duration in milliseconds
 * @returns Promise resolving after the delay
 * @internal
 */
export const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves the subject identifier used by identify-user requests.
 * Supports the canonical `subjectId` field and the deprecated `id` alias.
 */
export function getIdentifySubjectId(
	submission?: IdentifyUserRequestBody
): string | undefined {
	return submission?.subjectId || submission?.id;
}

/**
 * Generates a UUID v4 for request identification
 *
 * @returns A randomly generated UUID string
 */
export function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
