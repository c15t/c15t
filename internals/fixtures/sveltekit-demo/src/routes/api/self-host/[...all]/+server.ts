import type { RequestHandler } from './$types';

// Load the backend on first request, in its own chunk. SvelteKit 3 builds
// with Rolldown, which can otherwise move modules the backend shares with
// lazily loaded chunks into this route's chunk and export them from it, and
// SvelteKit rejects a route that exports anything besides its handlers.
const loadBackend = () => import('#lib/server/c15t-backend.js');

const handleRequest: RequestHandler = async ({ request }) => {
	const { backend } = await loadBackend();
	return backend.handler(request);
};

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const OPTIONS = handleRequest;
