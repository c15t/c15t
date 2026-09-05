import { handleFixtureRequest } from '@c15t/next-compat-shared/fixture';
import {
	toWebRequest,
	writeWebResponse,
} from '@c15t/next-compat-shared/fixture/node-adapter';
import type { NextApiRequest, NextApiResponse } from 'next';

/** Leave the body as a stream so the adapter reads it verbatim. */
export const config = { api: { bodyParser: false } };

const toSegments = function toSegments(
	path: string | string[] | undefined
): string[] {
	if (Array.isArray(path)) {
		return path;
	}
	return path ? [path] : [];
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {
	const segments = toSegments(req.query.path);
	const response = await handleFixtureRequest(
		await toWebRequest(req),
		segments
	);
	await writeWebResponse(response, res);
}
