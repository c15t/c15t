/**
 * Hydrate kernel state from stored consent.
 *
 * Synchronous: reads cookie + localStorage and folds the result into
 * the kernel via `kernel.set.*` calls. Returns `true` when at least
 * one stored value was applied.
 *
 * No I/O beyond the storage read — the v2 cookie layer is the single
 * source of read truth so v2 + v3 consumers see the same persistence
 * format.
 */
import { getConsentFromStorage } from '../../../libs/cookie';
import { isValidSubjectId } from '../../../libs/generate-subject-id';
import type { ConsentKernel } from '../../types';
import type { StorageConfig, StoredPayload } from './types';

/**
 * Read stored consent and apply it to the kernel. Returns `true` when
 * a non-null payload was found in storage; `false` otherwise (no-op).
 *
 * No-op (returns `false`) when storage APIs are unavailable.
 */
export function hydrateFromStorage(
	kernel: ConsentKernel,
	storageConfig: StorageConfig | undefined
): boolean {
	if (typeof document === 'undefined' || typeof localStorage === 'undefined') {
		return false;
	}

	const stored = getConsentFromStorage<StoredPayload>(storageConfig) as
		| StoredPayload
		| null
		| undefined;
	if (!stored) return false;

	if (stored.consents) {
		kernel.set.consent(stored.consents);
	}
	if (stored.consentInfo) {
		const storedId = stored.consentInfo.subjectId;
		if (storedId && isValidSubjectId(storedId)) {
			kernel.set.subjectId(storedId);
		}
		kernel.set.hasConsented(true);
	}
	return true;
}
