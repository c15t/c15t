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
		category: 'analytics',
		hint: 'GTM with consent mode v2',
		label: 'Google Tag Manager',
		value: 'gtm',
	},
	{
		category: 'analytics',
		hint: 'GA4 integration',
		label: 'Google Analytics',
		value: 'ga4',
	},
	{
		category: 'analytics',
		hint: 'Product analytics',
		label: 'PostHog',
		value: 'posthog',
	},
	{
		category: 'marketing',
		hint: 'Facebook/Instagram',
		label: 'Meta Pixel',
		value: 'meta',
	},
	{
		category: 'marketing',
		hint: 'B2B tracking',
		label: 'LinkedIn Insights',
		value: 'linkedin',
	},
	{
		category: 'analytics',
		hint: 'Heatmaps & recordings',
		label: 'Hotjar',
		value: 'hotjar',
	},
	{
		category: 'analytics',
		hint: 'Session replay',
		label: 'Microsoft Clarity',
		value: 'microsoft-clarity',
	},
	{
		category: 'functionality',
		hint: 'Customer messaging',
		label: 'Intercom',
		value: 'intercom',
	},
] as const;

export type ScriptId = (typeof SCRIPT_OPTIONS)[number]['value'];

/**
 * Get script info by ID
 */
export const getScriptInfo = function getScriptInfo(
	id: ScriptId
): (typeof SCRIPT_OPTIONS)[number] | undefined {
	return SCRIPT_OPTIONS.find((s) => s.value === id);
};

/**
 * Prompt user to select scripts to configure
 */
export const promptForScripts = async function promptForScripts(
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
			hint: option.hint,
			label: option.label,
			value: option.value,
		})),
		required: false,
	});

	if (p.isCancel(result)) {
		// Not cancelling the whole flow, just return empty
		return [];
	}

	return result as ScriptId[];
};

/**
 * Check if scripts include Google Consent Mode
 */
export const hasGoogleConsentMode = function hasGoogleConsentMode(
	scripts: ScriptId[]
): boolean {
	return scripts.includes('gtm') || scripts.includes('ga4');
};

/**
 * Generate script configuration code
 */
export const generateScriptConfig = function generateScriptConfig(
	scripts: ScriptId[]
): string {
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
			case 'microsoft-clarity':
				return `
		// Microsoft Clarity
		{
			id: 'microsoft-clarity',
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
};
