import type { Script } from 'c15t';

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
	const category = script?.category ?? 'marketing';

	return {
		id: script?.id ?? 'linkedin-insights',
		category,
		textContent: `
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "${script?.src ?? 'https://snap.licdn.com/li.lms-analytics/insight.min.js'}";
s.parentNode.insertBefore(b, s);})(window.lintrk);
		`.trim(),
		onBeforeLoad({ elementId, ...rest }) {
			const setupScript = document.createElement('script');

			setupScript.id = `${elementId}-init`;

			setupScript.textContent = `
      _linkedin_partner_id = "${id}";
      window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
      window._linkedin_data_partner_ids.push(_linkedin_partner_id);
     `;

			if (!document.head) {
				throw new Error('Document head is not available for script injection');
			}

			document.head.appendChild(setupScript);

			if (script?.onBeforeLoad) {
				script.onBeforeLoad({ elementId, ...rest });
			}
		},
		onDelete({ elementId, ...rest }) {
			// Try to call the script's own disable function
			if (
				window.ORIBILI &&
				typeof window.ORIBILI._DEBUG?.disableScript === 'function'
			) {
				window.ORIBILI._DEBUG.disableScript();
			}

			if (script?.onDelete) {
				script.onDelete({ elementId, ...rest });
			}
		},
	};
}
