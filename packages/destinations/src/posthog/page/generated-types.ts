// biome-ignore lint/style/useFilenamingConvention: This file is generated this way by segment auto type generator
// Generated file. DO NOT MODIFY IT BY HAND.

export interface Payload {
	/**
	 * The browser
	 */
	$browser?: string;

	/**
	 * The browser language
	 */
	$browser_language?: string;
	/**
	 * The browser version
	 */
	$browser_version?: number;
	/**
	 * The current URL
	 */
	$current_url?: string;

	/**
	 * The device type
	 */
	$device_type?: string;

	/**
	 * The host
	 */
	$host?: string;

	/**
	 * Unique insert ID for the event
	 */
	$insert_id?: string;

	/**
	 * The IP address
	 */
	$ip?: string;

	/**
	 * The library that sent the event
	 */
	$lib?: string;

	/**
	 * The library version
	 */
	$lib_version?: string;

	/**
	 * The operating system
	 */
	$os?: string;

	/**
	 * The OS Version
	 */
	$os_version?: string;

	/**
	 * The pathname
	 */
	$pathname?: string;

	/**
	 * The raw user agent
	 */
	$raw_user_agent?: string;

	/**
	 * The referrer
	 */
	$referrer?: string;

	/**
	 * The referring domain
	 */
	$referring_domain?: string;

	/**
	 * The screen dpr
	 */
	$screen_dpr?: number;

	/**
	 * The screen height
	 */
	$screen_height?: number;

	/**
	 * The screen width
	 */
	$screen_width?: number;

	/**
	 * The session ID
	 */
	$session_id?: string;

	/**
	 * The time in epoch format
	 */
	$time?: number;

	/**
	 * The viewport height
	 */
	$viewport_height?: string;

	/**
	 * The viewport width
	 */
	$viewport_width?: string;

	/**
	 * The window ID
	 */
	$window_id?: string;

	/**
	 * An anonymous identifier
	 */
	anonymousId: string;

	/**
	 * Posthog unique ID for a user
	 */
	distinct_id?: string;

	/**
	 * The timestamp of the event
	 */
	timestamp: string;

	/**
	 * The ID associated with the user
	 */
	title?: string;

	/**
	 * The ID associated with the user
	 */
	userId?: string;

	/**
	 * UTM campaign tag (last-touch).
	 */
	utm_campaign?: string;

	/**
	 * UTM content tag (last-touch).
	 */
	utm_content?: string;

	/**
	 * UTM medium tag (last-touch).
	 */
	utm_medium?: string;

	/**
	 * UTM source tag (last-touch).
	 */
	utm_source?: string;
	/**
	 * UTM term tag (last-touch).
	 */
	utm_term?: string;
}
