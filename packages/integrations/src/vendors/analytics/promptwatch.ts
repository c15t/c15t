import type { Script } from '@c15t/core';

import { resolveManifest } from '../../resolve';
import { vendorManifestContract } from '../../types';
import type { VendorManifest } from '../../types';
import { readId, skipMissingId } from '../_shared/required-id';
import { resolveScriptUrl, trimToUndefined } from '../_shared/script-url';

/**
 * Promptwatch vendor manifest.
 *
 * Loads the Promptwatch client with your project id on the script element.
 */
export const promptwatchManifest = {
	...vendorManifestContract,
	category: 'measurement',
	install: [
		{
			async: true,
			attributes: {
				'data-project-id': '{{projectId}}',
			},

			src: '{{scriptUrl}}',
			type: 'loadScript',
		},
	],
	vendor: 'promptwatch',
	vendorDetails: {
		homepageUrl: 'https://promptwatch.com/',
		legalName: 'Promptwatch B.V.',
		name: 'Promptwatch',
		privacyPolicyUrl: 'https://promptwatch.com/privacy-policy',
	},
} as const satisfies VendorManifest;

export interface PromptwatchOptions {
	/** Your Promptwatch project id (UUID from the Promptwatch dashboard). */
	projectId: string;
	/** Promptwatch client script URL. */
	scriptUrl?: string;
}

/**
 * Promptwatch analytics script for AI traffic and usage insights.
 *
 * @param options - Promptwatch integration options.
 * @param options.projectId - Promptwatch project id from your dashboard.
 * @param options.scriptUrl - Optional custom script URL override.
 * @remarks When `projectId` is missing or blank, the helper logs
 *   `promptwatch: missing or invalid projectId` with `console.error` and
 *   returns a script that never loads.
 * @returns The Promptwatch script configuration.
 */
export const promptwatch = function promptwatch({
	projectId,
	scriptUrl,
}: PromptwatchOptions): Script {
	const normalizedProjectId = readId(projectId);
	if (normalizedProjectId === undefined) {
		return skipMissingId('promptwatch', 'projectId', {
			category: 'measurement',
			id: 'promptwatch',
		});
	}

	const defaultScriptUrl = 'https://ingest.promptwatch.com/js/client.min.js';
	const normalizedScriptUrl = resolveScriptUrl(
		trimToUndefined(scriptUrl),
		defaultScriptUrl
	);

	return resolveManifest(promptwatchManifest, {
		projectId: normalizedProjectId,
		scriptUrl: normalizedScriptUrl,
	});
};
