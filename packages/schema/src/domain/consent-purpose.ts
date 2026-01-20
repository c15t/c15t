import { z } from 'zod';

export const consentPurposeSchema = z.object({
	id: z.string(),
	code: z.string(),
	name: z.string(),
	description: z.string(),
	isEssential: z.boolean(),
	dataCategory: z.string().nullish(),
	legalBasis: z.string().nullish(),
	isActive: z.boolean().prefault(true),
	createdAt: z.date().prefault(() => new Date()),
	updatedAt: z.date().prefault(() => new Date()),
});

export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;
