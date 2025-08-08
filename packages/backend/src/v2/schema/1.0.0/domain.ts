import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const domainTable = table('domain', {
	id: idColumn('id', 'varchar(255)', { default: 'auto' }),
	name: column('name', 'string', { unique: true }),
	description: column('description', 'string', { nullable: true }),
	allowedOrigins: column('allowedOrigins', 'json', { nullable: true }),
	isVerified: column('isVerified', 'bool'),
	isActive: column('isActive', 'bool'),
	createdAt: column('createdAt', 'timestamp', { default: 'now' }),
	updatedAt: column('updatedAt', 'timestamp', { default: 'now' }),
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
