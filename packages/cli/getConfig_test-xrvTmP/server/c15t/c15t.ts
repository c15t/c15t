import { c15tInstance } from '@c15t/backend';
import { prismaAdapter } from '@c15t/backend/db/adapters/prisma';
import { db } from '@server/db/db';

export const c15t = c15tInstance({
	database: prismaAdapter(db, {
		type: 'sqlite',
	}),
	appName: 'Test App',
	basePath: '/api/c15t',
	emailAndPassword: {
		enabled: true,
	},
});
