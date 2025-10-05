// biome-ignore lint/style/useFilenamingConvention: This file is generated this way by segment
// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
	/**
	 * An anonymous identifier
	 */
	anonymousId: string;
	/**
	 * Posthog unique ID for a user
	 */
	distinct_id?: string;
	/**
	 * Traits to associate with the user
	 */
	properties?: {
		[k: string]: unknown;
	};
	/**
	 * The timestamp of the event
	 */
	timestamp: string;
	/**
	 * The ID associated with the user
	 */
	userId?: string;
}
