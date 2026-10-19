/**
 * The first-load functions the stored save queue calls, passed to
 * `queue.ts` rather than imported there, so the queue loads on demand as one
 * chunk that imports nothing the first load has. The kernel already uses
 * nearly every one of them, so passing them adds little code to first load.
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
import { isSaveScripts } from '../../libs/save-scripts';
import {
	isConsentSaveRejection,
	isSubjectConflict,
} from '../../transports/save-rejection';
import type { QueueTools } from './queue';
import { supersededBy, withoutSuperseded, withSubjectId } from './supersession';
import { warnInDevelopment } from './warn';

/** @internal */
export const queueTools: QueueTools = {
	generateSubjectId,
	isConsentSaveRejection,
	isPlainRecord,
	isSaveScripts,
	isSubjectConflict,
	optionalCategories: OPTIONAL_CONSENT_CATEGORIES,
	supersededBy,
	validateExplicitChoice,
	warnInDevelopment,
	withSubjectId,
	withoutSuperseded,
};
