import { column, idColumn, table } from 'fumadb/schema';
import { z } from 'zod';

export const subjectTable = table('subject', {
	id: idColumn('id', 'varchar(255)'),
	isIdentified: column('isIdentified', 'bool').defaultTo$(() => false),
	externalId: column('externalId', 'string').nullable(),
	identityProvider: column('identityProvider', 'string').nullable(),
	lastIpAddress: column('lastIpAddress', 'string').nullable(),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
	updatedAt: column('updatedAt', 'timestamp').defaultTo$('now'),
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
