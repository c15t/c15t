// biome-ignore lint/style/useFilenamingConvention: This file is generated this way by segment
// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
	/**
	 * Company Name
	 */
	company_name: string;
	/**
	 * Posthog unique ID for a user
	 */
	distinct_id: string;
	/**
	 * The group id
	 */
	groupId: string;
	/**
	 * Traits to associate with the group
	 */
	properties?: {
		[k: string]: unknown;
	};
	/**
	 * The timestamp of the event
	 */
	timestamp: string;
}
