/**
 * Test helper: the record writes, bound to the first-load tools the way
 * persistence binds them, and the encoders.
 */
import { persistenceTools } from '../tools';
import { createRecordStore } from '../writer/store';

export * from '../writer/encode';

export const {
	clearStoredConsentRecords,
	clearStoredNoticeDismissal,
	clearStoredVendorChoice,
	writeStoredClearEpoch,
	writeStoredConsentEnvelope,
	writeStoredNoticeDismissal,
	writeStoredVendorChoice,
} = createRecordStore(persistenceTools);
