import { buildPrefetchScript } from '@c15t/core';
// `next/script.js`, not `next/script`: Next ships no `exports` map, so the
// bare specifier only resolves through a bundler. The Pages Router loads this
// package with Node at runtime, where the extension is required.
import Script from 'next/script.js';

import type { C15tPrefetchProps } from '~/types';

const DEFAULT_SCRIPT_ID = 'c15t-initial-data-prefetch';

/**
 * Next.js script component that starts `/init` prefetching before hydration.
 *
 * @remarks
 * Use in `app/layout.tsx` for static routes. Matching prefetched data is
 * consumed automatically by the runtime during first store initialization.
 */
export const C15tPrefetch = ({
	id = DEFAULT_SCRIPT_ID,
	...options
}: C15tPrefetchProps) => (
	<Script
		id={id}
		strategy="beforeInteractive"
	>
		{buildPrefetchScript(options)}
	</Script>
);
