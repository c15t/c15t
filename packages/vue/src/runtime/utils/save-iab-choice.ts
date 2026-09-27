import type { ConsentKernel } from '@c15t/core';

const actions = new WeakMap<ConsentKernel, object>();

/**
 * Supersede a pending IAB save, so its completion never restores a surface.
 *
 * Explicit navigation calls this, even when it targets the same surface.
 *
 * @internal
 */
export const invalidateIABChoice = function invalidateIABChoice(
	kernel: ConsentKernel
): void {
	actions.set(kernel, {});
};

/**
 * Close an IAB surface in the task that handled the click, then save.
 *
 * An IAB choice commits once its TC string is encoded, which can wait on the
 * TCF library chunk but never on the backend. The surface comes back only
 * when that local step recorded nothing (the vendor list failed to load, or
 * the policy changed underneath) and no newer save or explicit navigation
 * came first, so the visitor can try again. A failed backend request never
 * reopens it.
 *
 * @internal
 */
export const saveIABChoice = async function saveIABChoice(
	kernel: ConsentKernel,
	save: () => Promise<void>
): Promise<void> {
	const action = {};
	actions.set(kernel, action);
	const before = kernel.getSnapshot();
	const surface = before.activeUI;
	if (surface !== 'none') {
		kernel.set.activeUI('none');
	}
	try {
		await save();
	} finally {
		const after = kernel.getSnapshot();
		if (
			surface !== 'none' &&
			actions.get(kernel) === action &&
			after.iab?.authority === before.iab?.authority &&
			after.activeUI === 'none'
		) {
			kernel.set.activeUI(surface);
		}
	}
};
