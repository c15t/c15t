import { CookieBanner } from '@c15t/react/cookie-banner';

export default function () {
	return (
		<CookieBanner.Root>
			<CookieBanner.Card>
				<CookieBanner.Header>
					<CookieBanner.Title />
					<CookieBanner.Description
						legalLinks={['privacyPolicy', 'termsOfService']}
					/>
				</CookieBanner.Header>
				<CookieBanner.Footer>
					<CookieBanner.FooterSubGroup>
						<CookieBanner.RejectButton />
						<CookieBanner.AcceptButton />
					</CookieBanner.FooterSubGroup>
					<CookieBanner.CustomizeButton />
				</CookieBanner.Footer>
			</CookieBanner.Card>
		</CookieBanner.Root>
	);
}
