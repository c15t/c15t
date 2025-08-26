import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const consentRecordTable = table('consentRecord', {
	id: idColumn('id', 'varchar(255)'),
	subjectId: column('subjectId', 'string'),
	consentId: column('consentId', 'string').nullable(),
	actionType: column('actionType', 'string'),
	details: column('details', 'json').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});

export const consentRecordSchema = z.object({
	id: z.string(),
	subjectId: z.string(),
	consentId: z.string().nullish(),
	actionType: z.string(),
	details: z.record(z.string(), z.unknown()).nullish(),
	createdAt: z.date().prefault(() => new Date()),
});

export type ConsentRecord = z.infer<typeof consentRecordSchema>;
