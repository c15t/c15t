import { column, idColumn, table } from 'fumadb/schema';

export const consentPolicyTable = table('consentPolicy', {
	id: idColumn('id', 'varchar(255)'),
	version: column('version', 'string'),
	type: column('type', 'string'),
	name: column('name', 'string'),
	effectiveDate: column('effectiveDate', 'timestamp'),
	expirationDate: column('expirationDate', 'timestamp').nullable(),
	content: column('content', 'string'),
	contentHash: column('contentHash', 'string'),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});
