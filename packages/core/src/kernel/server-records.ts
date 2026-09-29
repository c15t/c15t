import type { ConsentSnapshot } from '../types';
import type { SnapshotPatch } from './patch';
import { mergeNewestVendorChoice } from './records';
import type { ValidatedRecords } from './records';

/**
 * Server records never remove local standing state: a notice dismissal
 * keeps the newest, and subject fields fill in without dropping local
 * identifiers.
 */
export const mergeServerPatch = function mergeServerPatch(
	current: ConsentSnapshot,
	records: Omit<ValidatedRecords, 'choice'>,
	now: number
): SnapshotPatch {
	const patch: SnapshotPatch = { now };
	if (records.noticeDismissal !== undefined) {
		const local = current.noticeDismissal;
		const incoming = records.noticeDismissal;
		patch.noticeDismissal =
			incoming && (!local || incoming.dismissedAt > local.dismissedAt)
				? incoming
				: local;
	}
	if (records.subject !== undefined) {
		patch.subject = records.subject
			? { ...current.subject, ...records.subject }
			: current.subject;
	}
	if (records.vendorChoice !== undefined) {
		patch.vendorChoice = mergeNewestVendorChoice(
			current.vendorChoice,
			records.vendorChoice
		);
	}
	return patch;
};
