'use client';

import { ConsentBanner } from 'c15t/next';
import { usePathname, useRouter } from 'next/navigation';

export const PRIVACY_SETTINGS_PATH = '/account/privacy';

/**
 * The stock banner, assembled from its parts so one action can change:
 * Customize opens the account privacy page instead of the preference
 * dialog. Accept and Reject keep their stock behavior.
 */
export const CookieBanner = () => {
	const router = useRouter();
	const pathname = usePathname();

	// The privacy page asks the same question in full, so the banner steps
	// aside there. It comes back on other pages until the visitor chooses.
	if (pathname === PRIVACY_SETTINGS_PATH) {
		return null;
	}

	return (
		<ConsentBanner.Root>
			<ConsentBanner.Card>
				<ConsentBanner.Header>
					<ConsentBanner.Title />
					<ConsentBanner.Description />
				</ConsentBanner.Header>
				<ConsentBanner.PolicyActions
					renderAction={(action, { key, ...props }) => {
						if (action !== 'customize') {
							// Keep the stock button.
							return null;
						}
						return (
							<ConsentBanner.CustomizeButton
								key={key}
								{...props}
								onClick={(event) => {
									// Skips the default action, which opens the dialog.
									event.preventDefault();
									router.push(PRIVACY_SETTINGS_PATH);
								}}
							/>
						);
					}}
				/>
			</ConsentBanner.Card>
		</ConsentBanner.Root>
	);
};
