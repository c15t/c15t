/**
 * Helper function to introduce a delay
 * @param ms - Delay duration in milliseconds
 * @returns Promise resolving after the delay
 * @internal
 */
export const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

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
