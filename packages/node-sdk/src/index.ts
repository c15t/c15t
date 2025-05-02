import type { router } from '@c15t/orpc-router/router';
import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
const link = new RPCLink({
	url: 'http://127.0.0.1:3000',
	headers: { Authorization: 'Bearer token' },
});

export const orpc: RouterClient<typeof router> = createORPCClient(link);
