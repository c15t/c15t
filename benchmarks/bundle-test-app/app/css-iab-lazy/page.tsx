'use client';

import { offline } from '@c15t/react';
import { ConsentProvider } from '@c15t/react/provider';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const LazyIABConsentDialog = dynamic(
	async () => {
		const mod = await import('@c15t/react/iab');
		return mod.IABConsentDialog;
	},
	{ ssr: false }
);

const CssIabLazyPage = () => {
	const [open, setOpen] = useState(false);

	return (
		<ConsentProvider options={{ mode: offline() }}>
			<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
				<h1>React Lazy IAB CSS Modules Benchmark</h1>
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

export default CssIabLazyPage;
