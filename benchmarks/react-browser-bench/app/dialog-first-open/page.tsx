'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	hosted,
	useActiveUI,
	useSetActiveUI,
} from '@c15t/react';
import type { ConsentProviderOptions } from '@c15t/react';
import { useEffect, useRef } from 'react';

const Controls = () => {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const activeUI = useActiveUI();
	const setActiveUI = useSetActiveUI();
	useEffect(() => {
		buttonRef.current?.setAttribute('data-hydrated', 'true');
	}, []);
	return (
		<button
			ref={buttonRef}
			data-active-ui={activeUI}
			id="reopen-dialog"
			onClick={() => setActiveUI('dialog')}
			type="button"
		>
			Reopen preferences
		</button>
	);
};

const options: ConsentProviderOptions = {
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode: hosted({ url: '/api/bench-consent' }),
};

const DialogFirstOpenPage = () => (
	<ConsentProvider options={options}>
		<ConsentBanner />
		<ConsentDialog />
		<Controls />
	</ConsentProvider>
);

export default DialogFirstOpenPage;
