'use client';

import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/nextjs/headless';
import { ConsentBanner } from '@c15t/react/components/consent-banner';

export default function NextjsBasicPage() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
			}}
		>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>Next.js Basic Benchmark</h1>
				<BasicState />
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
}

function BasicState() {
	const { consents } = useConsentManager();
	return <pre>{JSON.stringify(consents, null, 2)}</pre>;
}
