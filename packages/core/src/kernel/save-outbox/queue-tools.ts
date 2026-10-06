/**
 * The first-load functions the stored save queue calls, passed to
 * `queue.ts` rather than imported there, so the queue loads on demand as one
 * chunk that imports nothing the first load has. The kernel already uses
 * every one of them, so passing them adds no code to first load.
 *
 * Imported by the outbox, never by the queue itself.
 *
 * @internal
 */
import { OPTIONAL_CONSENT_CATEGORIES } from '../../consent-record/types';
import {
	isPlainRecord,
	validateExplicitChoice,
} from '../../consent-record/validation';
import { generateSubjectId } from '../../libs/generate-subject-id';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../../transports/save-rejection';
import type { QueueTools } from './queue';
import { supersededBy, withoutSuperseded, withSubjectId } from './supersession';

/** @internal */
export const queueTools: QueueTools = {
	generateSubjectId,
	isConsentSaveRejection,
	isPlainRecord,
	isSubjectConflict,
	optionalCategories: OPTIONAL_CONSENT_CATEGORIES,
	supersededBy,
	validateExplicitChoice,
	withSubjectId,
	withoutSuperseded,
};
