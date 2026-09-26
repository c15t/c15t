import type {
	ConsentKernel,
	ConsentSnapshot,
	KernelActiveUI,
	SaveResult,
} from '@c15t/core';

const actions = new WeakMap<ConsentKernel, object>();

/** Explicit navigation supersedes a pending UI action, even to the same dialog. */
export const invalidateConsentUIAction = (kernel: ConsentKernel) => {
	actions.set(kernel, {});
};

/** The surface left once a choice is recorded: the banner only if still owed. */
const settledUI = (snapshot: ConsentSnapshot): KernelActiveUI =>
	snapshot.policyPending ||
	snapshot.resolution.status === 'failed' ||
	snapshot.promptRequirement.kind === 'none'
		? 'none'
		: 'banner';

/**
 * Close the preferences dialog as soon as its choice is recorded locally.
 *
 * The kernel commits the receipt and updates permissions synchronously, so
 * the dialog closes in the task that handled the click. Storage is written
 * one task later, still ahead of the request, and the request runs after:
 * its outcome never reopens the dialog, and a failed request stays queued
 * for replay by the kernel. A save that recorded nothing (an unchanged
 * selection) closes when it resolves successfully, unless explicit
 * navigation or a newer action came first.
 */
export const saveConsentUI = (
	kernel: ConsentKernel,
	save: () => Promise<SaveResult>,
	canClose: () => boolean
): Promise<SaveResult> => {
	const action = {};
	actions.set(kernel, action);
	const before = kernel.getSnapshot();
	const fromDialog = before.activeUI === 'dialog';
	const pending = save();
	if (!fromDialog) {
		return pending;
	}
	const after = kernel.getSnapshot();
	if (
		after.explicitChoice !== before.explicitChoice ||
		after.vendorChoice !== before.vendorChoice
	) {
		if (actions.get(kernel) === action) {
			kernel.set.activeUI(settledUI(after));
		}
		return pending;
	}
	return pending.then((result) => {
		if (
			result.ok &&
			canClose() &&
			actions.get(kernel) === action &&
			kernel.getSnapshot().activeUI === 'dialog'
		) {
			kernel.set.activeUI(settledUI(kernel.getSnapshot()));
		}
		return result;
	});
};

/**
 * Close an IAB surface in the task that handled the click.
 *
 * An IAB choice commits once its TC string is encoded, which can wait on the
 * TCF library chunk but never on the backend. The surface closes first and
 * comes back only when that local step recorded nothing (the vendor list
 * failed to load, or the policy changed underneath), so the visitor can try
 * again. A failed backend request never reopens it.
 */
export const saveIABConsentUI = async (
	kernel: ConsentKernel,
	save: () => Promise<void> | void
): Promise<void> => {
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
			after.iab?.authority === before.iab?.authority &&
			after.activeUI === 'none' &&
			actions.get(kernel) === action
		) {
			kernel.set.activeUI(surface);
		}
	}
};
