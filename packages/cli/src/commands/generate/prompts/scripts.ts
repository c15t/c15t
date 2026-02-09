/**
 * Script configuration prompts
 */

import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliContext } from '~/context/types';

/**
 * Available script options
 */
export const SCRIPT_OPTIONS = [
	{
		value: 'gtm',
		label: 'Google Tag Manager',
		hint: 'GTM with consent mode v2',
		category: 'analytics',
	},
	{
		value: 'ga4',
		label: 'Google Analytics',
		hint: 'GA4 integration',
		category: 'analytics',
	},
	{
		value: 'posthog',
		label: 'PostHog',
		hint: 'Product analytics',
		category: 'analytics',
	},
	{
		value: 'meta',
		label: 'Meta Pixel',
		hint: 'Facebook/Instagram',
		category: 'marketing',
	},
	{
		value: 'linkedin',
		label: 'LinkedIn Insights',
		hint: 'B2B tracking',
		category: 'marketing',
	},
	{
		value: 'hotjar',
		label: 'Hotjar',
		hint: 'Heatmaps & recordings',
		category: 'analytics',
	},
	{
		value: 'clarity',
		label: 'Microsoft Clarity',
		hint: 'Session replay',
		category: 'analytics',
	},
	{
		value: 'intercom',
		label: 'Intercom',
		hint: 'Customer messaging',
		category: 'functionality',
	},
] as const;

export type ScriptId = (typeof SCRIPT_OPTIONS)[number]['value'];

/**
 * Get script info by ID
 */
export function getScriptInfo(
	id: ScriptId
): (typeof SCRIPT_OPTIONS)[number] | undefined {
	return SCRIPT_OPTIONS.find((s) => s.value === id);
}

/**
 * Prompt user to select scripts to configure
 */
export async function promptForScripts(
	context: CliContext
): Promise<ScriptId[]> {
	const { logger } = context;

	logger.message('');
	logger.message(color.bold('Which tracking scripts do you use?'));
	logger.message(color.dim('These will be configured to respect user consent'));
	logger.message('');

	const result = await p.multiselect({
		message: 'Select scripts (space to toggle, enter to confirm):',
		options: SCRIPT_OPTIONS.map((option) => ({
			value: option.value,
			label: option.label,
			hint: option.hint,
		})),
		required: false,
	});

	if (p.isCancel(result)) {
		// Not cancelling the whole flow, just return empty
		return [];
	}

	return result as ScriptId[];
}

/**
 * Check if scripts include Google Consent Mode
 */
export function hasGoogleConsentMode(scripts: ScriptId[]): boolean {
	return scripts.includes('gtm') || scripts.includes('ga4');
}

/**
 * Generate script configuration code
 */
export function generateScriptConfig(scripts: ScriptId[]): string {
	if (scripts.length === 0) {
		return '';
	}

	const configs = scripts.map((script) => {
		switch (script) {
			case 'gtm':
				return `
		// Google Tag Manager
		{
			id: 'gtm',
			name: 'Google Tag Manager',
			purpose: 'analytics',
			src: 'https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX',
			consentMode: true,
		}`;
			case 'ga4':
				return `
		// Google Analytics 4
		{
			id: 'ga4',
			name: 'Google Analytics',
			purpose: 'analytics',
			src: 'https://www.googletagmanager.com/gtag/js?id=G-XXXXX',
			consentMode: true,
		}`;
			case 'posthog':
				return `
		// PostHog
		{
			id: 'posthog',
			name: 'PostHog',
			purpose: 'analytics',
			src: 'https://app.posthog.com/static/array.js',
		}`;
			case 'meta':
				return `
		// Meta Pixel
		{
			id: 'meta-pixel',
			name: 'Meta Pixel',
			purpose: 'marketing',
			src: 'https://connect.facebook.net/en_US/fbevents.js',
		}`;
			case 'linkedin':
				return `
		// LinkedIn Insights
		{
			id: 'linkedin',
			name: 'LinkedIn Insights',
			purpose: 'marketing',
			src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		}`;
			case 'hotjar':
				return `
		// Hotjar
		{
			id: 'hotjar',
			name: 'Hotjar',
			purpose: 'analytics',
			src: 'https://static.hotjar.com/c/hotjar-XXXXX.js',
		}`;
			case 'clarity':
				return `
		// Microsoft Clarity
		{
			id: 'clarity',
			name: 'Microsoft Clarity',
			purpose: 'analytics',
			src: 'https://www.clarity.ms/tag/XXXXX',
		}`;
			case 'intercom':
				return `
		// Intercom
		{
			id: 'intercom',
			name: 'Intercom',
			purpose: 'functionality',
			src: 'https://widget.intercom.io/widget/XXXXX',
		}`;
			default:
				return '';
		}
	});

	return `scripts: [${configs.join(',')}\n\t]`;
}
