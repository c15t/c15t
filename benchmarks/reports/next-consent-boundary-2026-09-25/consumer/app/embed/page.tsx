import { Suspense } from 'react';

import { ConsentGate } from '../../components/consent-manager';

// Consent-enforcement route: a marketing-gated iframe via ConsentGate. The
// measurement-gated tracker script comes from the provider's `scripts`
// option on every route.
//
// ConsentGate needs its own Suspense boundary under cacheComponents when the
// page itself is in the static shell (arms a and c): it reads Date.now()
// while rendering, which fails the prerender. In arm b it is already inside
// the page-wide boundary, so the extra boundary is inert there.
const Embed = () => (
	<main
		className="mx-auto max-w-3xl p-8"
		data-bench-content=""
	>
		<h1 className="mb-4 text-3xl font-semibold">Embedded video</h1>
		<p className="mb-4">This embed needs marketing consent.</p>
		<Suspense fallback={<div style={{ height: 315, width: 560 }} />}>
			<ConsentGate category="marketing">
				<iframe
					src="/embed-frame.html"
					sandbox=""
					title="Gated embed"
					width="560"
					height="315"
				/>
			</ConsentGate>
		</Suspense>
	</main>
);

export default Embed;
