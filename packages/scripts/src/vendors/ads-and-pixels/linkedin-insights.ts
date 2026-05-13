import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

export interface LinkedInInsightsConversionEvent {
	conversion_id: string | number;
	[key: string]: unknown;
}

type LinkedInInsightsFunction = {
	(command: 'track', event: LinkedInInsightsConversionEvent): void;
	(command: string, ...args: unknown[]): void;
};

// Extended Window interface to include LinkedIn Insight Tag specific properties.
declare global {
	interface Window {
		lintrk: LinkedInInsightsFunction & { q?: unknown[][] };
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
 * LinkedIn Insight Tag vendor manifest.
 *
 * Sets up the LinkedIn partner ID globals and loads the Insight Tag script
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
	 * Your LinkedIn Insight Tag partner ID.
	 *
	 * LinkedIn shows this in Campaign Manager under Data -> Signals manager ->
	 * Insight Tag.
	 *
	 * @example `123456789012345`
	 */
	id: string;

	/** LinkedIn Insight Tag loader URL. */
	scriptSrc?: string;
}

/**
 * LinkedIn Insight Tag script.
 *
 * @param options - The options for the LinkedIn Insight Tag script.
 * @returns The LinkedIn Insight Tag script configuration.
 *
 * @example
 * ```ts
 * const linkedinInsightsScript = linkedinInsights({
 *   id: '123456789012345',
 * });
 * ```
 *
 * @see {@link https://www.linkedin.com/help/lms/answer/a418880} Add the LinkedIn Insight Tag to your website
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
