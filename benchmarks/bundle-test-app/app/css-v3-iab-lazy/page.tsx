'use client';

import { ConsentProvider } from '@c15t/react/v3/provider';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const LazyIABConsentDialog = dynamic(
	() => import('@c15t/react/v3/iab').then((mod) => mod.IABConsentDialog),
	{ ssr: false }
);

export default function CssV3IabLazyPage() {
	const [open, setOpen] = useState(false);

	return (
		<ConsentProvider options={{ mode: 'offline' }}>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>React v3 Lazy IAB CSS Modules Benchmark</h1>
				<button
					data-testid="open-iab-dialog"
					onClick={() => setOpen(true)}
					type="button"
				>
					Open IAB dialog
				</button>
			</main>
			{open ? <LazyIABConsentDialog /> : null}
		</ConsentProvider>
	);
}
