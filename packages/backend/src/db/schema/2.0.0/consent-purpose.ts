import { type ConsentPurpose, consentPurposeSchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const consentPurposeTable = table('consentPurpose', {
	id: idColumn('id', 'varchar(255)'),
	code: column('code', 'string'),
	name: column('name', 'string'),
	description: column('description', 'string'),
	isEssential: column('isEssential', 'bool'),
	dataCategory: column('dataCategory', 'string').nullable(),
	legalBasis: column('legalBasis', 'string').nullable(),
	isActive: column('isActive', 'bool').defaultTo$(() => true),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
});

export { consentPurposeSchema, type ConsentPurpose };
