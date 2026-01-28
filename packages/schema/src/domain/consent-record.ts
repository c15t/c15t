import * as v from 'valibot';

export const consentRecordSchema = v.object({
	id: v.string(),
	subjectId: v.string(),
	consentId: v.nullish(v.string()),
	actionType: v.string(),
	details: v.nullish(v.record(v.string(), v.unknown())),
	createdAt: v.optional(v.date(), () => new Date()),
});

export type ConsentRecord = v.InferOutput<typeof consentRecordSchema>;
