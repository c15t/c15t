/**
 * What persistence's write code calls but does not import, passed to
 * `writer/writer.ts` so it can load on demand as one chunk that imports
 * nothing the first load has. Every function here is one the read path or
 * the kernel already has in the first load.
 *
 * @internal
 */
import { mergeNewestChoice } from '../../kernel/record-validation';
import {
	deleteCookie,
	getRawCookieValue,
	writeCookie,
} from '../../libs/cookie';
import { clearStoredRecords } from './clear';
import {
	choiceSinceEpoch,
	noticeSinceEpoch,
	vendorChoiceSinceEpoch,
} from './epoch';
import { readStoredRecordsForReconcile } from './hydrate';
import {
	decodeNoticeDismissal,
	decodeVendorChoice,
	validateStoredConsentEnvelope,
} from './record-codec';
import { resolveStorageKeys } from './record-storage';
import type { PersistenceTools } from './writer/types';

/** @internal */
export const persistenceTools: PersistenceTools = {
	choiceSince: choiceSinceEpoch,
	clear: clearStoredRecords,
	decodeNotice: decodeNoticeDismissal,
	decodeVendors: decodeVendorChoice,
	deleteCookie,
	keys: resolveStorageKeys,
	merge: mergeNewestChoice,
	noticeSince: noticeSinceEpoch,
	rawCookie: getRawCookieValue,
	read: readStoredRecordsForReconcile,
	validateEnvelope: validateStoredConsentEnvelope,
	vendorsSince: vendorChoiceSinceEpoch,
	writeCookie,
};
