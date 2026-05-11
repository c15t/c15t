import type { Script } from 'c15t';
import { resolveManifest } from '../../resolve';
import { type VendorManifest, vendorManifestContract } from '../../types';

/**
 * Promptwatch vendor manifest.
 *
 * Loads the Promptwatch client with your project id on the script element.
 */
export const promptwatchManifest = {
	...vendorManifestContract,
	vendor: 'promptwatch',
	category: 'measurement',
	install: [
		{
			type: 'loadScript',
			src: '{{scriptUrl}}',
			async: true,
			attributes: {
				'data-project-id': '{{projectId}}',
			},
		},
	],
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
 * @throws {Error} When `projectId` is empty or only whitespace.
 * @returns The Promptwatch script configuration.
 */
export function promptwatch({
	projectId,
	scriptUrl,
}: PromptwatchOptions): Script {
	const normalizedProjectId = projectId.trim();
	if (normalizedProjectId.length === 0) {
		throw new Error(
			'promptwatch: invalid projectId - must be a non-empty string'
		);
	}

	const defaultScriptUrl = 'https://ingest.promptwatch.com/js/client.min.js';
	let normalizedScriptUrl = defaultScriptUrl;
	if (scriptUrl !== undefined && scriptUrl.trim().length > 0) {
		normalizedScriptUrl = scriptUrl.trim();
	}

	return resolveManifest(promptwatchManifest, {
		projectId: normalizedProjectId,
		scriptUrl: normalizedScriptUrl,
	});
}
