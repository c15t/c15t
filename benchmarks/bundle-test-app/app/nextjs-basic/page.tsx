'use client';

import {
	ConsentManagerProvider,
	useConsentManager,
} from '@c15t/nextjs/headless';
import { ConsentBanner } from '@c15t/react/components/consent-banner';

const BasicState = () => {
	const { consents } = useConsentManager();
	return <pre>{JSON.stringify(consents, null, 2)}</pre>;
};
const NextjsBasicPage = () => (
	<ConsentManagerProvider
		options={{
			mode: 'offline',
		}}
	>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Next.js Basic Benchmark</h1>
			<BasicState />
		</main>
		<ConsentBanner />
	</ConsentManagerProvider>
);

export default NextjsBasicPage;
