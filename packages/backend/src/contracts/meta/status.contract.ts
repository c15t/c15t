import { oc } from '@orpc/contract';
import { z } from 'zod';

export const statusContract = oc.input(z.undefined()).output(
	z.object({
		status: z.enum(['ok', 'error']),
		version: z.string(),
		timestamp: z.date(),
		storage: z.object({
			type: z.string(),
			available: z.boolean(),
		}),
	})
);
