import type { ConsentKernel, SaveResult } from '@c15t/core';

const actions = new WeakMap<ConsentKernel, object>();

/** Explicit navigation supersedes a pending UI action, even to the same dialog. */
export const invalidateConsentUIAction = (kernel: ConsentKernel) => {
	actions.set(kernel, {});
};

/** Keep an open preferences dialog available until its own save succeeds. */
export const saveConsentUI = async (
	kernel: ConsentKernel,
	save: () => Promise<SaveResult>,
	canClose: () => boolean
): Promise<SaveResult> => {
	const action = {};
	actions.set(kernel, action);
	const preserveDialog = kernel.getSnapshot().activeUI === 'dialog';
	const pending = save();
	// The receipt commits synchronously before the transport settles.
	if (preserveDialog && actions.get(kernel) === action) {
		kernel.set.activeUI('dialog');
	}
	const unsubscribe = kernel.subscribe((snapshot) => {
		if (
			preserveDialog &&
			snapshot.activeUI !== 'dialog' &&
			actions.get(kernel) === action
		) {
			invalidateConsentUIAction(kernel);
		}
	});
	try {
		const result = await pending;
		if (
			result.ok &&
			canClose() &&
			preserveDialog &&
			actions.get(kernel) === action
		) {
			const snapshot = kernel.getSnapshot();
			kernel.set.activeUI(
				snapshot.policyPending ||
					snapshot.resolution.status === 'failed' ||
					snapshot.promptRequirement.kind === 'none'
					? 'none'
					: 'banner'
			);
		}
		return result;
	} finally {
		unsubscribe();
	}
};
