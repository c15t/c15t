import { handleFixtureRequest } from '@c15t/next-compat-shared/fixture';

interface RouteContext {
	params: Promise<{ path?: string[] }>;
}

const handle = async function handle(request: Request, context: RouteContext) {
	const { path = [] } = await context.params;
	return handleFixtureRequest(request, path);
};

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
