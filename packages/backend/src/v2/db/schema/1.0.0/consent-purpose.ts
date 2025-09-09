import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

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

export const consentPurposeSchema = z.object({
	id: z.string(),
	code: z.string(),
	name: z.string(),
	description: z.string(),
	isEssential: z.boolean(),
	dataCategory: z.string().nullish(),
	legalBasis: z.string().nullish(),
	isActive: z.boolean().prefault(true),
	createdAt: z.date().prefault(() => new Date()),
	updatedAt: z.date().prefault(() => new Date()),
});

export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;
