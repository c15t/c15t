import { c15tInstance } from '@c15t/backend';

export const backend = c15tInstance({
	basePath: '/api/self-host',
	database: { dialect: 'sqlite', filename: 'c15t.db' },
	trustedOrigins: ['localhost'],
});
