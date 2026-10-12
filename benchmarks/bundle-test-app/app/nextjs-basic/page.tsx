'use client';

import {
	ConsentBanner,
	ConsentProvider,
	useEffectivePermissions,
} from '@c15t/nextjs';
// The provider takes a transport; `offline` from `@c15t/nextjs` is data.
import { offline } from '@c15t/react';

const BasicState = () => {
	const consents = useEffectivePermissions();
	return <pre>{JSON.stringify(consents, null, 2)}</pre>;
};
const NextjsBasicPage = () => (
	<ConsentProvider
		options={{
			mode: offline({
				policyRules: [
					{
						id: 'bench-opt-in',
						match: { fallback: true, isDefault: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
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
