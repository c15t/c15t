import type { VendorManifest } from '../../types';

/**
 * Optional tracking call inserted between the vendor init call and script load.
 */
interface QueuePixelInstallStep {
	/** Arguments passed to the vendor queue function. */
	args: unknown[];
}

/**
 * Options for building the common pixel install sequence.
 */
export interface BuildQueuePixelInstallOptions {
	/** Global queue function to call, for example `rdt` or `snaptr`. */
	global: string;
	/** Arguments for the required initialization call. */
	initArgs: unknown[];
	/** Optional tracking command queued immediately after initialization. */
	trackStep?: QueuePixelInstallStep;
	/** Manifest interpolation token used for the final loader script URL. */
	scriptPlaceholder?: string;
}

/**
 * Builds the common queue-pixel install sequence used by advertising pixels.
 *
 * @param options - Queue pixel install options.
 * @returns Manifest install steps containing the required init call, an
 * optional tracking call, and an async `loadScript` step.
 */
export function buildQueuePixelInstall({
	global,
	initArgs,
	trackStep,
	scriptPlaceholder = '{{scriptUrl}}',
}: BuildQueuePixelInstallOptions): VendorManifest['install'] {
	const install: VendorManifest['install'] = [
		{
			type: 'callGlobal',
			global,
			args: initArgs,
		},
	];

	if (trackStep !== undefined) {
		install.push({
			type: 'callGlobal',
			global,
			args: trackStep.args,
		});
	}

	install.push({
		type: 'loadScript',
		src: scriptPlaceholder,
		async: true,
	});

	return install;
}
