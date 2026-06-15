import { buildPrefetchScript } from 'c15t';
import Script from 'next/script';
import type { C15tPrefetchProps } from '~/types';

const DEFAULT_SCRIPT_ID = 'c15t-initial-data-prefetch';

/**
 * Next.js script component that starts `/init` prefetching before hydration.
 *
 * @remarks
 * Use in `app/layout.tsx` for static routes. Matching prefetched data is
 * consumed automatically by the runtime during first store initialization.
 */
export function C15tPrefetch({
	id = DEFAULT_SCRIPT_ID,
	...options
}: C15tPrefetchProps) {
	return (
		<Script id={id} strategy="beforeInteractive">
			{buildPrefetchScript(options)}
		</Script>
	);
}
