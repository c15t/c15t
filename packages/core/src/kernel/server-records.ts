import type { ConsentSnapshot } from '../types';
import type { SnapshotPatch } from './patch';
import type { ValidatedRecords } from './records';

/**
 * Server records never remove local standing state: directives union with
 * the local list, a notice dismissal keeps the newest, and subject fields
 * fill in without dropping local identifiers.
 */
export const mergeServerPatch = function mergeServerPatch(
	current: ConsentSnapshot,
	records: Omit<ValidatedRecords, 'choice'>,
	now: number
): SnapshotPatch {
	const patch: SnapshotPatch = { now };
	if (records.optOutDirectives !== undefined) {
		const merged = [...current.optOutDirectives];
		for (const directive of records.optOutDirectives) {
			const duplicate = merged.some(
				(existing) =>
					existing.source === directive.source &&
					existing.recordedAt === directive.recordedAt &&
					existing.categories.join(',') === directive.categories.join(',')
			);
			if (!duplicate) {
				merged.push(directive);
			}
		}
		patch.optOutDirectives = merged;
	}
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
	return patch;
};
