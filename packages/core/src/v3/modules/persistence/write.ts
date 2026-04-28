/**
 * Write kernel state to stored consent.
 *
 * Synchronous: serializes the snapshot and persists it via the v2
 * cookie layer. Skips the write when the user has not yet decided
 * (`hasConsented === false`) so we don't poison storage with the
 * defaults.
 *
 * Has one side effect beyond the storage write: when the snapshot's
 * `subjectId` is missing or invalid, generates a fresh ID and pushes
 * it back through `kernel.set.subjectId`. This keeps the storage
 * payload and the kernel in sync without forcing the caller to
 * coordinate them. Pure-extracting that side effect is a separate
 * refactor (would change the kernel-write order during the same tick).
 */
import { saveConsentToStorage } from '../../../libs/cookie';
import {
	generateSubjectId,
	isValidSubjectId,
} from '../../../libs/generate-subject-id';
import type { ConsentState as V2ConsentState } from '../../../types/compliance';
import type { ConsentKernel, ConsentSnapshot } from '../../types';
import type { StorageConfig } from './types';

/**
 * Write the snapshot to storage. No-op outside the browser, or when
 * the user has not consented yet.
 *
 * Regenerates `subjectId` and pushes it back to the kernel via
 * `kernel.set.subjectId` when the snapshot's ID is missing or invalid.
 */
export function writeToStorage(
	snapshot: ConsentSnapshot,
	kernel: ConsentKernel,
	storageConfig: StorageConfig | undefined
): void {
	if (typeof document === 'undefined' || typeof localStorage === 'undefined') {
		return;
	}
	if (!snapshot.hasConsented) return;

	let subjectId = snapshot.subjectId;
	if (!subjectId || !isValidSubjectId(subjectId)) {
		subjectId = generateSubjectId();
		kernel.set.subjectId(subjectId);
	}

	saveConsentToStorage(
		{
			consents: snapshot.consents as V2ConsentState,
			consentInfo: {
				time: Date.now(),
				subjectId,
			},
		},
		storageConfig
	);
}
