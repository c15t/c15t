import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { createPagesApiHandlers } from '@c15t/nextjs/pages';

/**
 * `@c15t/nextjs/pages` wraps the App Router route handlers from
 * `@c15t/nextjs/api` for a `pages/api` route.
 */
const handler = createPagesApiHandlers({
	backendURL: COMPAT_BACKEND_URL,
}).manifest;

export default handler;
