'use client';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentManagerProvider,
} from '@c15t/react';

export default function Home() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				theme: {
					slots: {
						consentBannerTitle: 'text-red-500',
					},
				},
			}}
		>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>TW3 + c15t CSS Layer Test</h1>
				<p>
					This page verifies that c15t component styles (inside{' '}
					<code>@layer c15t</code>) render correctly alongside Tailwind CSS 3
					and that TW3 utility classes can override c15t defaults.
				</p>
			</main>
			<ConsentBanner />
			<ConsentDialog />
		</ConsentManagerProvider>
	);
}
