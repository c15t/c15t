/**
 * The stored shape of an experiment assignment, shared by every reader
 * that parses one back: the sticky assignment record and the pending-saves
 * queue. Kept apart from the engine so the kernel validates a queued save
 * without importing assignment or arm validation.
 */
import type { ExperimentAssignment } from './experiment';

/**
 * Whether `value` is a well-formed {@link ExperimentAssignment}, as read
 * back from storage or a queued save.
 *
 * @param value - A parsed storage value.
 * @returns `true` for an object with a string `id` and `variant`, an
 * `assignedBy` of `host` or `c15t`, and a boolean `acknowledgedDiagnostics`.
 */
export const isExperimentAssignment = function isExperimentAssignment(
	value: unknown
): value is ExperimentAssignment {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.id === 'string' &&
		typeof record.variant === 'string' &&
		(record.assignedBy === 'host' || record.assignedBy === 'c15t') &&
		typeof record.acknowledgedDiagnostics === 'boolean'
	);
};
