import type { Script } from 'c15t';
import { applyScriptOverrides, resolveManifest } from './resolve';
import type { VendorManifest } from './types';

// Extended Window interface to include linkedin insights specific properties
declare global {
	interface Window {
		lintrk: ((...args: unknown[]) => void) & { q?: unknown[][] };
		_linkedin_partner_id?: string;
		_linkedin_data_partner_ids?: string[];
		ORIBILI?: {
			_DEBUG?: {
				disableScript?: () => void;
			};
		};
	}
}

/**
 * LinkedIn Insights vendor manifest.
 *
 * Sets up the LinkedIn partner ID globals and loads the insights script
 * via an inline bootstrap snippet.
 */
export const linkedinInsightsManifest = {
	vendor: 'linkedin-insights',
	category: 'marketing',
	install: [
		{
			type: 'inlineScript',
			code: `
_linkedin_partner_id = "{{id}}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
			`.trim(),
		},
		{
			type: 'inlineScript',
			code: `
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "{{scriptSrc}}";
s.parentNode.insertBefore(b, s);})(window.lintrk);
			`.trim(),
		},
	],
} as const satisfies VendorManifest;

export interface LinkedInInsightsOptions {
	/**
	 * Your LinkedIn Insights ID
	 * @example `123456789012345`
	 */
	id: string;

	/**
	 * Override or extend the default script values.
	 *
	 * Default values:
	 * - `id`: 'linkedin-insights'
	 * - `src`: `https://snap.licdn.com/li.lms-analytics/insight.min.js`
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * LinkedIn Insights Script
 *
 * @param options - The options for the LinkedIn Insights script
 * @returns The LinkedIn Insights script configuration
 *
 * @example
 * ```ts
 * const linkedinInsightsScript = linkedinInsights({
 *   id: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://business.linkedin.com/marketing-solutions/ad-libraries/insights} LinkedIn Insights documentation
 */
export function linkedinInsights({
	id,
	script,
}: LinkedInInsightsOptions): Script {
	const resolved = resolveManifest(linkedinInsightsManifest, {
		id,
		scriptSrc:
			script?.src ?? 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
	});

	return script ? applyScriptOverrides(resolved, script) : resolved;
}
