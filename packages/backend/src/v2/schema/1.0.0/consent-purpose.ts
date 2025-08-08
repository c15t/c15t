import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const consentPurposeTable = table('consentPurpose', {
	id: idColumn('id', 'varchar(255)', { default: 'auto' }),
	code: column('code', 'string'),
	name: column('name', 'string'),
	description: column('description', 'string'),
	isEssential: column('isEssential', 'bool'),
	dataCategory: column('dataCategory', 'string', { nullable: true }),
	legalBasis: column('legalBasis', 'string', { nullable: true }),
	isActive: column('isActive', 'bool'),
	createdAt: column('createdAt', 'timestamp', { default: 'now' }),
	updatedAt: column('updatedAt', 'timestamp', { default: 'now' }),
});

export const consentPurposeSchema = z.object({
	id: z.string(),
	code: z.string(),
	name: z.string(),
	description: z.string(),
	isEssential: z.boolean(),
	dataCategory: z.string().nullish(),
	legalBasis: z.string().nullish(),
	isActive: z.boolean(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;
