import { ConsentBanner } from '@c15t/react';

export default function () {
	return (
		<ConsentBanner.Root models={['opt-in']}>
			<ConsentBanner.Card>
				<ConsentBanner.Header>
					<ConsentBanner.Title />
					<ConsentBanner.Description
						legalLinks={['privacyPolicy', 'termsOfService']}
					/>
				</ConsentBanner.Header>
				<ConsentBanner.Footer>
					<ConsentBanner.FooterSubGroup>
						<ConsentBanner.RejectButton />
						<ConsentBanner.AcceptButton />
					</ConsentBanner.FooterSubGroup>
					<ConsentBanner.CustomizeButton />
				</ConsentBanner.Footer>
			</ConsentBanner.Card>
		</ConsentBanner.Root>
	);
}
