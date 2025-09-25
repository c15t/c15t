import type { Script } from '../libs/script-loader/index';

// Extended Window interface to include Meta Pixel-specific properties
declare global {
	interface Window {
		lintrk: ((...args: unknown[]) => void) & { q?: unknown[][] };
		_linkedin_partner_id?: string;
		_linkedin_data_partner_ids?: string[];
		ORIBILI?: {
			_DEBUG?: {
				disableScript?: () => void;
				enableScript?: () => void;
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
	 * - `category`: 'marketing'
	 */
	script?: Partial<Script>;
}

/**
 * Creates a LinkedIn Insights script with inline JavaScript code.
 *
 * This script uses textContent to inject the LinkedIn Insights tracking code directly
 * into the page, which is the recommended approach for LinkedIn Insights implementation.
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
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
		`.trim(),
		// This is a persistent script because it has an API to manage the consent state
		// persistAfterConsentRevoked: true,
		// onConsentChange: ({ consents, ...rest }) => {
		// 	if (has(category, consents)) {
		// 		window.fbq('consent', 'grant');
		// 	} else {
		// 		window.fbq('consent', 'revoke');
		// 	}

		// 	if (script?.onConsentChange) {
		// 		script.onConsentChange({ consents, ...rest });
		// 	}
		// },
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
		onLoad(rest) {
			// Load if disabled
			if (
				window.ORIBILI &&
				typeof window.ORIBILI._DEBUG?.enableScript === 'function'
			) {
				window.ORIBILI._DEBUG.enableScript();
			}

			if (script?.onLoad) {
				script.onLoad(rest);
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

			const setupScript = document.getElementById(
				`${elementId}-init`
			) as HTMLScriptElement;

			const linkedinScript = Array.from(
				document.getElementsByTagName('script')
			).find(
				(s) =>
					s.src === 'https://snap.licdn.com/li.lms-analytics/insight.min.js'
			);

			if (setupScript) {
				setupScript.remove();
			}

			if (linkedinScript) {
				linkedinScript.remove();
			}

			if (script?.onDelete) {
				script.onDelete({ elementId, ...rest });
			}
		},
	};
}
