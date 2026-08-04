import { type ConsentPurpose, consentPurposeSchema } from '@c15t/schema';
import { consentPurposeTable as previousConsentPurposeTable } from '../2.0.0/consent-purpose';

export const consentPurposeTable = previousConsentPurposeTable.clone();

export { type ConsentPurpose, consentPurposeSchema };
