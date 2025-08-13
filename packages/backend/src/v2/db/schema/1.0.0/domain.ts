import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

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

export const domainSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	allowedOrigins: z.array(z.string()).nullable().optional(),
	isVerified: z.boolean().default(true),
	isActive: z.boolean().default(true),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Domain = z.infer<typeof domainSchema>;
