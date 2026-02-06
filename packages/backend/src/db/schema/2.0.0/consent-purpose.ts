import { type ConsentPurpose, consentPurposeSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const consentPurposeTable = table('consentPurpose', {
	id: idColumn('id', 'varchar(255)'),
	code: column('code', 'string'),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
	tenantId: column('tenantId', 'string').nullable(),
});

export { consentPurposeSchema, type ConsentPurpose };
