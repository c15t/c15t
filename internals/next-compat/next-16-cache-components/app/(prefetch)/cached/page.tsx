import { cacheLife } from 'next/cache';

/**
 * Cache Components replacement for `export const revalidate = 60`, which is a
 * build error under `cacheComponents`. The page body is cached with the
 * built-in `minutes` profile; `C15tPrefetch` still runs from the root layout.
 */
// oxlint-disable-next-line require-await -- `'use cache'` only applies to async functions.
const CachedPage = async () => {
	'use cache';
	cacheLife('minutes');

	return (
		<p>
			C15tPrefetch on a cached route (cacheLife minutes). Built at{' '}
			{new Date().toISOString()}.
		</p>
	);
};

export default CachedPage;
