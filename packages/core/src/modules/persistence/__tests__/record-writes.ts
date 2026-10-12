/**
 * Test helper: the record writes, bound to the first-load tools the way
 * persistence binds them, the encoders, and the first-load clear.
 */
import { persistenceTools } from '../tools';
import { createRecordStore } from '../writer/store';

export * from '../writer/encode';

export {
	clearStoredConsentRecords,
	encodeClearEpoch,
	writeStoredClearEpoch,
} from '../clear';

export const {
	clearStoredVendorChoice,
	writeStoredConsentEnvelope,
	writeStoredNoticeDismissal,
	writeStoredVendorChoice,
} = createRecordStore(persistenceTools);
