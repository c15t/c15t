/**
 * Stands in for your analytics client and logs each event to the console.
 * To forward the events, replace the body with your tool's call:
 *
 *   PostHog: posthog.capture(event, properties)
 *   GA4:     gtag('event', event, properties)
 *   GTM:     window.dataLayer.push({ event, ...properties })
 *
 * The banner impression fires before the visitor has consented to anything.
 * A tool that only loads after consent never sees the impressions of the
 * visitors who declined, and every arm's opt-in rate drifts towards 100%.
 * Send these events somewhere that receives them either way, such as your
 * own endpoint, or compare arms on the counts the c15t backend keeps.
 */
export const track = (
	event: string,
	properties: Record<string, unknown>
): void => {
	console.info(`[analytics] ${event}`, properties);
};
