import { fumadb } from 'fumadb';
import { v1 } from './1.0.0';

export * from './1.0.0';

export const DB = fumadb({
	namespace: 'c15t',
	schemas: [v1],
});
