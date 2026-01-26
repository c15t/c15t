import { type Domain, domainSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const domainTable = table('domain', {
	id: idColumn('id', 'varchar(255)'),
	name: column('name', 'string').unique(),
	description: column('description', 'string').nullable(),
	allowedOrigins: column('allowedOrigins', 'json').nullable(),
	isVerified: column('isVerified', 'bool').defaultTo$(() => true),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
});

export { domainSchema, type Domain };
