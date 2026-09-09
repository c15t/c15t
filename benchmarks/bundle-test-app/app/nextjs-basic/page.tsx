'use client';

import {
	ConsentBanner,
	ConsentProvider,
	offline,
	useEffectivePermissions,
} from '@c15t/nextjs';

const BasicState = () => {
	const consents = useEffectivePermissions();
	return <pre>{JSON.stringify(consents, null, 2)}</pre>;
};
const NextjsBasicPage = () => (
	<ConsentProvider
		options={{
			mode: offline(),
		}}
	>
		<main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Next.js Basic Benchmark</h1>
			<BasicState />
		</main>
		<ConsentBanner />
	</ConsentProvider>
);

export default NextjsBasicPage;
