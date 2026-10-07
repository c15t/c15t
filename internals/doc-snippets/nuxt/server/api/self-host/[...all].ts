import { c15tInstance } from '@c15t/backend';
import { toWebRequest } from 'h3';

let backend: ReturnType<typeof c15tInstance> | undefined;

// One instance per server process, created on the first request.
const getInstance = () => {
	backend ??= c15tInstance({
		basePath: '/api/self-host',
		database: { dialect: 'postgres', url: process.env.DATABASE_URL ?? '' },
		trustedOrigins: ['localhost'],
	});
	return Promise.resolve(backend);
};

// #region docs:self-host-route
export default defineEventHandler(async (event) => {
	const instance = await getInstance();
	return instance.handler(toWebRequest(event));
});
// #endregion docs:self-host-route
