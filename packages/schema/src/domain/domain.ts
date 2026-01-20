import { z } from 'zod';

export const domainSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string().nullish(),
	allowedOrigins: z.array(z.string()).nullish(),
	isVerified: z.boolean().prefault(true),
	isActive: z.boolean().prefault(true),
	createdAt: z.date().prefault(() => new Date()),
	updatedAt: z.date().prefault(() => new Date()),
});

export type Domain = z.infer<typeof domainSchema>;
