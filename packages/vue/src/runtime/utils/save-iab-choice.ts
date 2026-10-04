import type { ConsentKernel } from '@c15t/core';
import { saveIABConsentSurface } from '@c15t/core/surface-actions';

/**
 * Close an IAB surface in the task that handled the click, then save.
 *
 * The surface comes back only when nothing was recorded and no newer save
 * or explicit navigation (the `activeUI` setter) came first; see
 * `saveIABConsentSurface` in `@c15t/core`.
 *
 * @internal
 */
export const saveIABChoice = async function saveIABChoice(
	kernel: ConsentKernel,
	save: () => Promise<void>
): Promise<void> {
	await saveIABConsentSurface(kernel, save);
};
