import type { ConsentSnapshot } from '@c15t/core';
import { computed, inject } from 'vue';

import {
	symbolKernel,
	symbolKernelContext,
	symbolSnapshot,
} from '../utils/symbols';

export const useConsentKernel = function useConsentKernel() {
	const kernel = inject(symbolKernel);
	if (!kernel) {
		throw new Error('[c15t] Kernel not found');
	}
	return kernel;
};

export const useConsentSnapshot = function useConsentSnapshot() {
	const snapshot = inject(symbolSnapshot);
	if (!snapshot) {
		throw new Error('[c15t] Kernel snapshot not found');
	}
	return snapshot;
};

export const useConsentKernelContext = function useConsentKernelContext() {
	const context = inject(symbolKernelContext);
	if (!context) {
		throw new Error('[c15t] Kernel context not found');
	}
	return context;
};

/** Read one canonical kernel field as a reactive value. */
const useSnapshotField = <Key extends keyof ConsentSnapshot>(key: Key) => {
	const snapshot = useConsentSnapshot();
	return computed(() => snapshot.value[key]);
};
/** Read the explicit receipt without applying permission restrictions. */
export const useExplicitChoice = () => useSnapshotField('explicitChoice');
/** Read the permissions currently available to consent gates. */
export const useEffectivePermissions = () =>
	useSnapshotField('effectivePermissions');
/** Read whether the policy currently requires choice, notice or no prompt. */
export const usePromptRequirement = () => useSnapshotField('promptRequirement');
/** Read the stored notice acknowledgement independently of choices. */
export const useNoticeDismissal = () => useSnapshotField('noticeDismissal');
/** Read detected and active user-agent privacy signals. */
export const usePrivacySignals = () => useSnapshotField('privacySignals');
/** Read standing privacy opt-outs that survive later visits. */
export const useOptOutDirectives = () => useSnapshotField('optOutDirectives');
/** Read the canonical policy rule used by the evaluator. */
export const usePolicyRule = () => useSnapshotField('policyRule');
/** Read the authoritative policy resolution and its status. */
export const usePolicyResolution = () => useSnapshotField('resolution');
/**
 * Whether a policy rule is resolved for this visitor. Every c15t consent
 * surface renders nothing until one is: an unconfigured, failed, or
 * unmatched resolution leaves nothing to consent to, and the surfaces
 * appear on their own once a later init supplies a rule.
 */
export const useHasConsentPolicy = () => {
	const resolution = usePolicyResolution();
	return computed(() => resolution.value.status === 'matched');
};
/**
 * Whether the resolved rule owes any consent UI. A prompt owes a banner and
 * a preference center; rights owe a way back to preferences. A `none` rule
 * with no rights owes neither, so every surface stays hidden while the
 * permissions it grants apply. `false` until a rule is resolved.
 */
export const useHasConsentUi = () => {
	const resolution = usePolicyResolution();
	const rule = usePolicyRule();
	return computed(
		() =>
			resolution.value.status === 'matched' &&
			(rule.value.prompt !== 'none' || rule.value.rights.length > 0)
	);
};
/** Read the reasons that currently restrict permissions. */
export const useConsentRestrictions = () => useSnapshotField('restrictions');
/** Return the explicit notice dismissal command. */
export const useDismissNotice = () => useConsentKernel().commands.dismissNotice;
