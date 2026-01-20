import { z } from 'zod';

export const consentRecordSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	consentId: z.string().nullish(),
	actionType: z.string(),
	details: z.record(z.string(), z.unknown()).nullish(),
	createdAt: z.date().prefault(() => new Date()),
});

export type ConsentRecord = z.infer<typeof consentRecordSchema>;
