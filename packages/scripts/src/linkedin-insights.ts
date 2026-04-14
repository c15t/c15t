import type { Script } from 'c15t';
import { resolveManifest } from './resolve';
import { type VendorManifest, vendorManifestContract } from './types';

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
 * via structured startup steps.
 */
export const linkedinInsightsManifest = {
	...vendorManifestContract,
	vendor: 'linkedin-insights',
	category: 'marketing',
	install: [
		{
			type: 'setGlobal',
			name: '_linkedin_partner_id',
			value: '{{id}}',
			ifUndefined: false,
		},
		{
			type: 'setGlobal',
			name: '_linkedin_data_partner_ids',
			value: [],
			ifUndefined: true,
		},
		{
			type: 'pushToQueue',
			queue: '_linkedin_data_partner_ids',
			value: '{{id}}',
		},
		{
			type: 'defineStubFunction',
			name: 'lintrk',
			queue: {
				property: 'q',
			},
			queueFormat: 'array',
			ifUndefined: true,
		},
		{
			type: 'loadScript',
			src: '{{scriptSrc}}',
			async: true,
		},
	],
} as const satisfies VendorManifest;

export interface LinkedInInsightsOptions {
	/**
	 * Your LinkedIn Insights ID
	 * @example `123456789012345`
	 */
	id: string;

	/** LinkedIn Insights loader URL. */
	scriptSrc?: string;
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
	scriptSrc,
}: LinkedInInsightsOptions): Script {
	const resolved = resolveManifest(linkedinInsightsManifest, {
		id,
		scriptSrc:
			scriptSrc ?? 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
	});

	return resolved;
}
