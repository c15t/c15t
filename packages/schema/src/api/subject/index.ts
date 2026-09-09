/**
 * Subject API schemas exports.
 *
 * @packageDocumentation
 */

export {
	type ConsentItem,
	consentItemSchema,
	type GetSubjectInput,
	type GetSubjectOutput,
	type GetSubjectParams,
	type GetSubjectQuery,
	getSubjectErrorSchemas,
	getSubjectInputSchema,
	getSubjectOutputSchema,
	getSubjectParamsSchema,
	getSubjectQuerySchema,
} from './get';

export {
	type ListSubjectsOutput,
	type ListSubjectsQuery,
	listSubjectsErrorSchemas,
	listSubjectsOutputSchema,
	listSubjectsQuerySchema,
	type SubjectItem,
	subjectItemSchema,
} from './list';

export {
	type PatchSubjectFullInput,
	type PatchSubjectInput,
	type PatchSubjectOutput,
	type PatchSubjectParams,
	patchSubjectErrorSchemas,
	patchSubjectFullInputSchema,
	patchSubjectInputSchema,
	patchSubjectOutputSchema,
	patchSubjectParamsSchema,
} from './patch';

export {
	type SubjectCategoryReceiptWire,
	type SubjectChoiceBasisWire,
	type SubjectChoiceWire,
	subjectCategoryReceiptWireSchema,
	subjectChoiceBasisWireSchema,
	subjectChoiceWireSchema,
	wireTimestampSchema,
} from './choice-wire';

export {
	type IdentityPrivacyDirectiveInput,
	identityPrivacyDirectiveInputSchema,
	type ListPrivacyDirectivesOutput,
	listPrivacyDirectivesOutputSchema,
	type PrivacyDirectiveWire,
	privacyDirectiveAuthoritySchema,
	privacyDirectiveSourceSchema,
	privacyDirectiveWireSchema,
	type RecordPrivacyDirectiveOutput,
	recordPrivacyDirectiveOutputSchema,
	type SubjectPrivacyDirectiveInput,
	subjectPrivacyDirectiveInputSchema,
} from './privacy-directive';

export {
	type PostSubjectInput,
	type PostSubjectOutput,
	postSubjectErrorSchemas,
	postSubjectInputSchema,
	postSubjectOutputSchema,
	subjectCookieBannerInputSchema,
	subjectIdSchema,
	subjectOtherConsentInputSchema,
	subjectPolicyBasedInputSchema,
} from './post';
