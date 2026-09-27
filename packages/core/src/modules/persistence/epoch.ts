/**
 * The clear epoch: the time of the last `clear()`, in epoch milliseconds.
 *
 * `clear()` removes every record and then stores the epoch under its own
 * key, which no clear removes. Every envelope written afterwards records
 * the epoch too. A decision confirmed before the epoch was made before the
 * clear, so it is void wherever it turns up: in a record another runtime
 * that missed the clear writes back, in the memory of such a runtime, or
 * in a record an older version of c15t stored. Epoch `0` means no clear
 * was ever recorded, which is how every legacy, v2 and pre-epoch record
 * reads.
 *
 * Voiding only removes decisions; it never adds one. A corrupt or
 * unreadable epoch reads as `0`, which voids nothing, so a failed read
 * cannot turn a stored denial into a grant.
 *
 * Pure.
 */
import type {
	ExplicitChoice,
	NoticeDismissal,
	PrivacyOptOut,
} from '../../consent-record/types';
import type { VendorChoice } from '../../types';

/**
 * The choice without decisions confirmed before `epoch`, or `null` when
 * none remain.
 */
export const choiceSinceEpoch = function choiceSinceEpoch(
	choice: ExplicitChoice | null,
	epoch: number
): ExplicitChoice | null {
	if (!choice || epoch <= 0) {
		return choice;
	}
	const entries = Object.entries(choice.categories).filter(
		([, decision]) => decision && decision.confirmedAt >= epoch
	);
	if (entries.length === Object.keys(choice.categories).length) {
		return choice;
	}
	return entries.length > 0
		? { categories: Object.fromEntries(entries), version: 3 }
		: null;
};

/** The vendor record, or `null` when it was confirmed before `epoch`. */
export const vendorChoiceSinceEpoch = function vendorChoiceSinceEpoch<
	RecordType extends VendorChoice,
>(record: RecordType | null, epoch: number): RecordType | null {
	return record && record.confirmedAt >= epoch ? record : null;
};

/** The notice dismissal, or `null` when it was made before `epoch`. */
export const noticeSinceEpoch = function noticeSinceEpoch(
	record: NoticeDismissal | null,
	epoch: number
): NoticeDismissal | null {
	return record && record.dismissedAt >= epoch ? record : null;
};

/** The directives recorded at or after `epoch`. */
export const directivesSinceEpoch = function directivesSinceEpoch(
	directives: readonly PrivacyOptOut[],
	epoch: number
): readonly PrivacyOptOut[] {
	if (epoch <= 0 || directives.every((entry) => entry.recordedAt >= epoch)) {
		return directives;
	}
	return directives.filter((entry) => entry.recordedAt >= epoch);
};
