import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const subjectTable = table('subject', {
	id: idColumn('id', 'varchar(255)', { default: 'auto' }),
	isIdentified: column('isIdentified', 'bool'),
	externalId: column('externalId', 'string', { nullable: true }),
	identityProvider: column('identityProvider', 'string', { nullable: true }),
	lastIpAddress: column('lastIpAddress', 'string', { nullable: true }),
	createdAt: column('createdAt', 'timestamp', { default: 'now' }),
	updatedAt: column('updatedAt', 'timestamp', { default: 'now' }),
});

export const subjectSchema = z.object({
	id: z.string(),
	isIdentified: z.boolean().default(false),
	externalId: z.string().nullable().optional(),
	identityProvider: z.string().optional(),
	lastIpAddress: z.string().optional(),
	createdAt: z.date().default(() => new Date()),
	updatedAt: z.date().default(() => new Date()),
});

export type Subject = z.infer<typeof subjectSchema>;
