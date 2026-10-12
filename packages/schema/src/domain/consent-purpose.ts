import * as v from 'valibot';

export const consentPurposeSchema = v.object({
	code: v.string(),
	createdAt: v.optional(v.date(), () => new Date()),
	id: v.string(),
	tenantId: v.nullish(v.string()),
	updatedAt: v.optional(v.date(), () => new Date()),
});

export type ConsentPurpose = v.InferOutput<typeof consentPurposeSchema>;
