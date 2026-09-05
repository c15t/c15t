import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import {
	toWebRequest,
	writeWebResponse,
} from '@c15t/next-compat-shared/fixture/node-adapter';
import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * `@c15t/nextjs/api` ships App Router route handlers (Web Request in,
 * Response out). The Pages Router has no first-party adapter, so the fixture
 * bridges Node's req/res itself.
 */
const handlers = createNextConsentRouteHandlers({
	backendURL: COMPAT_BACKEND_URL,
});

export const config = { api: { bodyParser: false } };

const handler = async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const response = await handlers.manifestGET(await toWebRequest(req));
	await writeWebResponse(response, res);
};

export default handler;
