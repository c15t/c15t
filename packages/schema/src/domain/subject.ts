import { z } from 'zod';

export const subjectSchema = z.object({
	id: z.string(),
	isIdentified: z.boolean().prefault(false),
	externalId: z.string().nullish(),
	identityProvider: z.string().nullish(),
	lastIpAddress: z.string().optional(),
	subjectTimezone: z.string().nullish(),
	createdAt: z.date().prefault(() => new Date()),
	updatedAt: z.date().prefault(() => new Date()),
});

export type Subject = z.infer<typeof subjectSchema>;
