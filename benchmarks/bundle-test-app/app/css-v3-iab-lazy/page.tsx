'use client';

import { offline } from '@c15t/react/v3';
import { ConsentProvider } from '@c15t/react/v3/provider';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const LazyIABConsentDialog = dynamic(
	async () => {
		const mod = await import('@c15t/react/v3/iab');
		return mod.IABConsentDialog;
	},
	{ ssr: false }
);

const CssV3IabLazyPage = () => {
	const [open, setOpen] = useState(false);

	return (
		<ConsentProvider options={{ mode: offline() }}>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
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
};

export default CssV3IabLazyPage;
