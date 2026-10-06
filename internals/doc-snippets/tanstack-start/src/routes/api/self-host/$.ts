import { c15tInstance } from '@c15t/backend';
import { createFileRoute } from '@tanstack/react-router';

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
const handle = async function handle({ request }: { request: Request }) {
	const instance = await getInstance();
	return instance.handler(request);
};

export const Route = createFileRoute('/api/self-host/$')({
	server: {
		handlers: {
			DELETE: handle,
			GET: handle,
			OPTIONS: handle,
			PATCH: handle,
			POST: handle,
			PUT: handle,
		},
	},
});
// #endregion docs:self-host-route
