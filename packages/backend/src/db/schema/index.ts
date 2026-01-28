import { fumadb } from 'fumadb';
import { v1 } from './1.0.0';
import { v2 } from './2.0.0';

export * from './2.0.0';

export const DB = fumadb({
	namespace: 'c15t',
	schemas: [v1, v2],
});

export const LatestDB = fumadb({
	namespace: 'c15t',
	schemas: [v2],
});
