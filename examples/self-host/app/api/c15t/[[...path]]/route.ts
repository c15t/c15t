// #region docs:nextjs-route
import { c15tInstance } from '@c15t/backend';

import config from '../../../../c15t-backend.config';

export const runtime = 'nodejs';
const backend = c15tInstance({ ...config, basePath: '/api/c15t' });

export const GET = (request: Request) => backend.handler(request);
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const OPTIONS = GET;
// #endregion docs:nextjs-route
