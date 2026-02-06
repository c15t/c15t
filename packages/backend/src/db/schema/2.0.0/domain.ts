import { type Domain, domainSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const domainTable = table('domain', {
	id: idColumn('id', 'varchar(255)'),
	name: column('name', 'string'),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
	tenantId: column('tenantId', 'string').nullable(),
});

export { domainSchema, type Domain };
