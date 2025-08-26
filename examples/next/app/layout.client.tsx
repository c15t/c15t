'use client';

import { ConsentManagerCallbacks, CookieBanner } from '@c15t/nextjs/client';
export function ClientLayout() {
	return (
		<>
			<CookieBanner.Root>
				<CookieBanner.Card>
					<CookieBanner.Header>
						<CookieBanner.Title>Custom Title</CookieBanner.Title>
						<CookieBanner.Description>
							Your detailed description here
						</CookieBanner.Description>
					</CookieBanner.Header>
					<CookieBanner.Footer>
						<CookieBanner.FooterSubGroup>
							<CookieBanner.RejectButton themeKey="banner.footer.customize-button">
								Decline All
							</CookieBanner.RejectButton>
							<CookieBanner.AcceptButton themeKey="banner.footer.customize-button">
								Accept All
							</CookieBanner.AcceptButton>
						</CookieBanner.FooterSubGroup>
						<CookieBanner.CustomizeButton themeKey="banner.footer.customize-button">
							Preferences
						</CookieBanner.CustomizeButton>
					</CookieBanner.Footer>
				</CookieBanner.Card>
			</CookieBanner.Root>

			<ConsentManagerCallbacks
				callbacks={{
					onBannerFetched(response) {
						console.log('Consent banner fetched', response);
					},
					onConsentSet(response) {
						console.log('onConsentSet', response);

						// This simulates a heavy operation that could block the click INP
						const start = performance.now();
						const end = start + 500;
						// biome-ignore lint/suspicious/noEmptyBlockStatements: <explanation>
						while (performance.now() < end) {}
						console.log('heavy onConsentSet callback finished');
					},
					onError(response) {
						console.log('Error', response);
					},
				}}
			/>
		</>
	);
}
