'use client';

import { ConsentBanner, ConsentManagerProvider } from '@c15t/react';

export default function Home() {
	return (
		<ConsentManagerProvider
			options={{
				mode: 'offline',
				theme: {
					slots: {
						consentBannerTitle: 'custom-title-override',
					},
				},
			}}
		>
			<main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
				<h1>No-TW + c15t CSS Layer Test</h1>
				<p>
					This page verifies that c15t component styles (inside{' '}
					<code>@layer c15t</code>) render correctly without any CSS framework.
					Buttons should have padding, border-radius, and proper background
					colors. The banner title should have custom blue color and underline
					from <code>.custom-title-override</code>.
				</p>
			</main>
			<ConsentBanner />
		</ConsentManagerProvider>
	);
}
