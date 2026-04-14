import { column, idColumn, table } from 'fumadb/schema';

export const subjectTable = table('subject', {
	id: idColumn('id', 'varchar(255)'),
	externalId: column('externalId', 'string').nullable(),
	identityProvider: column('identityProvider', 'string').nullable(),
	lastIpAddress: column('lastIpAddress', 'string').nullable(),
	subjectTimezone: column('subjectTimezone', 'string').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
});
