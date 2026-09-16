/**
 * Synchronous setters exposed at `kernel.set.*`.
 *
 * Each setter computes a `SnapshotPatch` and hands it to the runtime,
 * which re-derives dependent fields and skips no-ops. `set.draft` stages draft values for a no-input `save()` and never grants
 * anything.
 */
import type { AllConsentNames } from '../consent/consent-types';
import type { PresentedSelection } from '../policy';
import type {
	ConsentState,
	KernelActiveUI,
	KernelConfig,
	KernelIABState,
	KernelOverrides,
} from '../types';
import type { KernelRuntime } from './runtime';
import { buildDraft, copyIABAuthority, DEFAULT_IAB } from './snapshot';

/**
 * Merge an IAB patch onto the current IAB slice, returning the next
 * slice plus a `changed` flag.
 */
export const mergeIab = function mergeIab(
	current: KernelIABState | null,
	input: Partial<KernelIABState>
): { next: KernelIABState; changed: boolean } {
	const baseline = current ?? DEFAULT_IAB;
	const next: KernelIABState = { ...baseline, ...input };
	if (input.authority !== undefined && input.authority !== baseline.authority) {
		next.authority = copyIABAuthority(input.authority);
	}
	let changed = false;
	for (const key of Object.keys(next) as (keyof KernelIABState)[]) {
		if (next[key] !== baseline[key]) {
			changed = true;
			break;
		}
	}
	if (!current && input) {
		changed = true;
	}
	return { changed, next };
};

/** Merge staged draft values. `null` input clears the draft. */
export const mergeDraft = function mergeDraft(
	current: PresentedSelection | null,
	input: Partial<ConsentState>
): PresentedSelection | null {
	const patch = buildDraft(input);
	if (!patch) {
		return current;
	}
	return { ...current, ...patch };
};

/**
 * Build the `kernel.set.*` object given the kernel runtime.
 */
export const buildSetters = function buildSetters(
	runtime: KernelRuntime,
	config: KernelConfig
) {
	const { getSnapshot, commit, emit } = runtime;

	let configured = config.consentCategories
		? [...config.consentCategories]
		: [];
	let inferred = config.inferredConsentCategories?.length
		? new Set(config.inferredConsentCategories)
		: null;
	const updateCategories = () => {
		const categories = [
			...new Set([...configured, ...(inferred ?? [])]),
		].sort();
		const next = categories.length ? categories : null;
		const current = getSnapshot().consentCategories;
		if (
			next === current ||
			(next?.length === current?.length &&
				next?.every((category, index) => category === current?.[index]))
		) {
			return;
		}
		commit({
			activeUI: getSnapshot().activeUI === 'dialog' ? 'dialog' : undefined,
			consentCategories: next,
			now: runtime.now(),
		});
		runtime.armDeadlineTimer();
	};

	return {
		activeUI(ui: KernelActiveUI): void {
			commit({ activeUI: ui });
		},

		consentCategories(
			categories: readonly AllConsentNames[] | undefined
		): void {
			configured = categories ? [...categories] : [];
			updateCategories();
		},

		draft(input: Partial<ConsentState>): void {
			runtime.setDraft(mergeDraft(runtime.getDraft(), input));
		},

		iab(input: Partial<KernelIABState>): void {
			const { next, changed } = mergeIab(getSnapshot().iab, input);
			if (!changed) {
				return;
			}
			if (commit({ iab: next })) {
				emit({ snapshot: getSnapshot(), type: 'iab:set' });
			}
		},

		language(code: string): void {
			const snapshot = getSnapshot();
			if (snapshot.overrides.language === code) {
				return;
			}
			commit({ overrides: { ...snapshot.overrides, language: code } });
			emit({ snapshot: getSnapshot(), type: 'overrides:set' });
		},

		overrides(input: KernelOverrides): void {
			const snapshot = getSnapshot();
			const at = runtime.now();
			commit({ now: at, overrides: { ...snapshot.overrides, ...input } });
			emit({ snapshot: getSnapshot(), type: 'overrides:set' });
			runtime.reconcilePrivacy(at);
			runtime.armDeadlineTimer();
		},

		privacySignals(input: { gpc?: boolean }): void {
			if (input.gpc === undefined) {
				return;
			}
			const at = runtime.now();
			commit({ now: at, privacyDetected: input.gpc === true });
			runtime.reconcilePrivacy(at);
			runtime.armDeadlineTimer();
		},

		registerConsentCategories(categories: readonly AllConsentNames[]): void {
			if (!categories.length) {
				return;
			}
			inferred ??= new Set();
			const previousSize = inferred.size;
			for (const category of categories) {
				inferred.add(category);
			}
			if (inferred.size !== previousSize) {
				updateCategories();
			}
		},

		subjectId(id: string | null): void {
			const { subject, iab } = getSnapshot();
			const iabPatch = iab
				? { iab: { ...iab, authority: null, tcString: null } }
				: {};
			if ((subject?.subjectId ?? null) === id) {
				return;
			}
			runtime.invalidateRecords();
			if (id === null) {
				const { subjectId: _dropped, ...rest } = subject ?? {};
				commit({
					subject: Object.keys(rest).length > 0 ? rest : null,
					...iabPatch,
				});
				return;
			}
			commit({ subject: { ...subject, subjectId: id }, ...iabPatch });
		},
	};
};
