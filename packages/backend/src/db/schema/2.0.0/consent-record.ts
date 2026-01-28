import { type ConsentRecord, consentRecordSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const consentRecordTable = table('consentRecord', {
	id: idColumn('id', 'varchar(255)'),
	subjectId: column('subjectId', 'string'),
	consentId: column('consentId', 'string').nullable(),
	actionType: column('actionType', 'string'),
	details: column('details', 'json').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});

export { consentRecordSchema, type ConsentRecord };
