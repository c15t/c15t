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
 * cannot turn a stored denial into a grant. A clear always moves the epoch
 * forward, even when the clock went back, so a later clear never lets
 * earlier decisions back in.
 *
 * Ties: a category decision in the clearing millisecond counts only when
 * its writer had seen the clear (see {@link choiceSinceEpoch}). The notice
 * dismissal and vendor denials keep a tie: after a clear neither exists,
 * so one surviving a tie can only restrict or hide the notice, never
 * grant.
 *
 * Pure.
 */
import type {
	ExplicitChoice,
	NoticeDismissal,
} from '../../consent-record/types';
import type { VendorChoice } from '../../types';

/**
 * The choice without decisions made before the clear, or `null` when none
 * remain. A choice with no decisions at all never survives a clear either,
 * so a cleared record cannot bring back its subject.
 *
 * A decision confirmed in the very millisecond of the clear is ambiguous by
 * time alone. It counts only when `knowsClear` says the choice comes from a
 * runtime that had already seen this clear: that runtime's own memory, or
 * an envelope written under this epoch. Such a runtime recorded it after the
 * clear. Anywhere else (a runtime that missed the clear, a record from an
 * older writer) it may predate the clear, so it is void.
 *
 * @param choice - The choice to filter.
 * @param epoch - The clear epoch in force; `0` voids nothing.
 * @param knowsClear - Whether the choice's writer had seen this clear.
 * @returns The surviving choice, or `null`.
 */
export const choiceSinceEpoch = function choiceSinceEpoch(
	choice: ExplicitChoice | null,
	epoch: number,
	knowsClear: boolean
): ExplicitChoice | null {
	if (!choice || epoch <= 0) {
		return choice;
	}
	const entries = Object.entries(choice.categories).filter(
		([, decision]) =>
			decision &&
			(decision.confirmedAt > epoch ||
				(knowsClear && decision.confirmedAt === epoch))
	);
	if (entries.length === 0) {
		return null;
	}
	return entries.length === Object.keys(choice.categories).length
		? choice
		: { categories: Object.fromEntries(entries), version: 3 };
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
