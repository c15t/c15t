import { type Subject, subjectSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const subjectTable = table('subject', {
	id: idColumn('id', 'varchar(255)'),
	externalId: column('externalId', 'string').nullable(),
	identityProvider: column('identityProvider', 'string').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
	tenantId: column('tenantId', 'string').nullable(),
});

export { type Subject, subjectSchema };
