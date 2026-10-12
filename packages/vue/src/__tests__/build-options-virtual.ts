/**
 * Stands in for the `#c15t/build-options` Nitro virtual the module
 * registers at build time.
 */
import type { BuiltOptions } from '../runtime/server/build-options';

const built: BuiltOptions = {
	mode: { type: 'manifest' },
	routePrefix: '/api/c15t',
};
export default built;
