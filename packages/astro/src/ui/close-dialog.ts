import type { ConsentRuntime } from '@c15t/core/runtime';
import { showConsentSurface } from '@c15t/core/surface-actions';

/**
 * `close()` for the built-in surfaces, which render from the kernel's
 * active surface. It acts only while the dialog is that surface: the
 * client closes through the kernel first, which may leave the banner up for
 * a visitor who still owes a choice, and this must not hide it again.
 *
 * @internal
 * @param runtime - The page-level runtime that owns the kernel.
 */
export const closeDialogSurface = function closeDialogSurface(
	runtime: ConsentRuntime
): void {
	if (runtime.kernel.getSnapshot().activeUI === 'dialog') {
		showConsentSurface(runtime.kernel, 'none');
	}
};
