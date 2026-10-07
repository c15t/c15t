import { createRouter } from '@tanstack/react-router';

import { routeTree } from './routeTree.gen';

export const getRouter = function getRouter() {
	return createRouter({
		routeTree,
		scrollRestoration: true,
	});
};
