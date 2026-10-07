'use client';

import { useConsent } from 'c15t/next';
import { useHeadlessConsentUI } from 'c15t/next/headless';

import styles from './site-chrome.module.css';

/**
 * Reopens the consent dialog with the saved choices, and shows whether
 * analytics (and with it PostHog) may run right now.
 */
export const PrivacySettingsLink = () => {
	const { openDialog } = useHeadlessConsentUI();
	const analytics = useConsent('measurement');

	return (
		<span className={styles.privacy}>
			<button
				type="button"
				className={styles.privacyButton}
				onClick={openDialog}
			>
				Privacy settings
			</button>
			<span
				className={styles.status}
				data-on={analytics || undefined}
			>
				Analytics {analytics ? 'on' : 'off'}
			</span>
		</span>
	);
};
