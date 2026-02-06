import * as v from 'valibot';

export const consentPurposeSchema = v.object({
	id: v.string(),
	code: v.string(),
	createdAt: v.optional(v.date(), () => new Date()),
	updatedAt: v.optional(v.date(), () => new Date()),
	tenantId: v.nullish(v.string()),
});

export type ConsentPurpose = v.InferOutput<typeof consentPurposeSchema>;
