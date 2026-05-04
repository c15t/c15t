/**
 * Synchronous setters exposed at `kernel.set.*`.
 *
 * Each setter computes a `SnapshotPatch` (or `null` for a no-op) using
 * a pure helper, then hands the patch to `advance` and emits the
 * corresponding event. The pure helpers are exported separately so
 * tests can verify change-detection without standing up a full kernel.
 *
 * No-op short-circuits matter: subscribers commonly use `===` on
 * snapshots to skip work, and emitting a new snapshot for a no-op
 * mutation would defeat that.
 */

import { allConsentNames } from '../../types/consent-types';
import { deriveActiveUI, deriveModel } from '../policy';
import type {
	ConsentSnapshot,
	ConsentState,
	KernelActiveUI,
	KernelEvent,
	KernelIABState,
	KernelOverrides,
} from '../types';
import type { SnapshotPatch } from './patch';
import { DEFAULT_IAB } from './snapshot';

/**
 * Merge a `Partial<ConsentState>` over the current consents, accepting
 * only boolean values for known category names. Returns the next
 * consents object only when at least one category actually changed;
 * returns `null` to signal a no-op.
 */
export function mergeConsent(
	current: ConsentState,
	input: Partial<ConsentState>
): ConsentState | null {
	const next: ConsentState = { ...current };
	let changed = false;
	for (const name of allConsentNames) {
		if (
			name in input &&
			typeof input[name] === 'boolean' &&
			next[name] !== input[name]
		) {
			next[name] = input[name] as boolean;
			changed = true;
		}
	}
	return changed ? next : null;
}

/**
 * Merge an IAB patch onto the current IAB slice, returning the next
 * slice plus a `changed` flag. The flag is `true` when at least one
 * scalar field differs from the baseline, or when the slice was
 * previously `null` and any patch was supplied.
 *
 * Object fields (e.g. `vendorConsents`) always allocate a new
 * reference; callers are responsible for avoiding churn there.
 */
export function mergeIab(
	current: KernelIABState | null,
	input: Partial<KernelIABState>
): { next: KernelIABState; changed: boolean } {
	const baseline = current ?? DEFAULT_IAB;
	const next: KernelIABState = { ...baseline, ...input };
	let changed = false;
	for (const key of Object.keys(next) as (keyof KernelIABState)[]) {
		if (next[key] !== baseline[key]) {
			changed = true;
			break;
		}
	}
	if (!current && input) changed = true;
	return { next, changed };
}

/**
 * Dependencies required by `buildSetters`. The kernel index supplies
 * a getter for the live snapshot, the `advance` function (which swaps
 * snapshots and notifies subscribers), and the event emitter.
 */
export interface SetterDeps {
	getSnapshot: () => ConsentSnapshot;
	advance: (patch: SnapshotPatch) => void;
	emit: (event: KernelEvent) => void;
}

/**
 * Build the `kernel.set.*` object given the kernel's runtime deps.
 *
 * Each setter is a thin wrapper that computes a patch from the current
 * snapshot, short-circuits on no-op, then advances + emits.
 */
export function buildSetters(deps: SetterDeps) {
	const { getSnapshot, advance, emit } = deps;

	return {
		consent(input: Partial<ConsentState>): void {
			const next = mergeConsent(getSnapshot().consents, input);
			if (!next) return;
			advance({ consents: next });
			emit({ type: 'consent:set', snapshot: getSnapshot() });
		},

		overrides(input: KernelOverrides): void {
			const snapshot = getSnapshot();
			advance({ overrides: { ...snapshot.overrides, ...input } });
			emit({ type: 'overrides:set', snapshot: getSnapshot() });
		},

		language(code: string): void {
			const snapshot = getSnapshot();
			if (snapshot.overrides.language === code) return;
			advance({ overrides: { ...snapshot.overrides, language: code } });
			emit({ type: 'overrides:set', snapshot: getSnapshot() });
		},

		subjectId(id: string | null): void {
			if (getSnapshot().subjectId === id) return;
			advance({ subjectId: id });
		},

		hasConsented(value: boolean): void {
			if (getSnapshot().hasConsented === value) return;
			advance({ hasConsented: value });
		},

		activeUI(ui: KernelActiveUI): void {
			if (getSnapshot().activeUI === ui) return;
			advance({ activeUI: ui });
		},

		iab(input: Partial<KernelIABState>): void {
			const snapshot = getSnapshot();
			const { next, changed } = mergeIab(snapshot.iab, input);
			if (!changed) return;

			const patch: SnapshotPatch = { iab: next };
			// If enable/disable flipped, re-derive model + activeUI so the
			// rest of the snapshot stays internally consistent.
			if (next.enabled !== (snapshot.iab?.enabled ?? false)) {
				const nextModel = deriveModel(snapshot.policy, next.enabled);
				patch.model = nextModel;
				patch.activeUI = deriveActiveUI(nextModel, snapshot.policy);
			}
			advance(patch);
			emit({ type: 'iab:set', snapshot: getSnapshot() });
		},
	};
}
