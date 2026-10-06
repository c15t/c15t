import { createStart } from '@tanstack/react-start';
import { consentRequestMiddleware } from 'c15t/tanstack-start/middleware';

export const startInstance = createStart(() => ({
	requestMiddleware: [consentRequestMiddleware()],
}));
